use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("C4jFcBypYefdgw2goHbKREMjZSyRo4LknBVDP5cegYLN");

const DAY_SECONDS: i64 = 86_400;
const MAX_ASSETS: usize = 8;

#[program]
pub mod onchain {
    use super::*;

    pub fn initialize_policy(
        ctx: Context<InitializePolicy>,
        agent: Pubkey,
        max_action_lamports: u64,
        daily_budget_lamports: u64,
        max_drawdown_bps: u16,
        allowed_assets: Vec<Pubkey>,
    ) -> Result<()> {
        require!(max_action_lamports > 0, VeylockError::InvalidLimit);
        require!(daily_budget_lamports >= max_action_lamports, VeylockError::InvalidLimit);
        require!(max_drawdown_bps > 0 && max_drawdown_bps <= 10_000, VeylockError::InvalidLimit);
        require!(!allowed_assets.is_empty() && allowed_assets.len() <= MAX_ASSETS, VeylockError::InvalidAssetList);

        let policy = &mut ctx.accounts.policy;
        policy.authority = ctx.accounts.authority.key();
        policy.agent = agent;
        policy.max_action_lamports = max_action_lamports;
        policy.daily_budget_lamports = daily_budget_lamports;
        policy.daily_spent_lamports = 0;
        policy.window_started_at = Clock::get()?.unix_timestamp;
        policy.max_drawdown_bps = max_drawdown_bps;
        policy.current_drawdown_bps = 0;
        policy.paper_mode = true;
        policy.halted = false;
        policy.allowed_assets = allowed_assets;
        policy.nonce = 0;
        policy.bump = ctx.bumps.policy;

        emit!(PolicyCreated { policy: policy.key(), authority: policy.authority, agent });
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, lamports: u64) -> Result<()> {
        require!(lamports > 0, VeylockError::InvalidLimit);
        system_program::transfer(
            CpiContext::new(
                system_program::ID,
                system_program::Transfer {
                    from: ctx.accounts.authority.to_account_info(),
                    to: ctx.accounts.policy.to_account_info(),
                },
            ),
            lamports,
        )?;
        emit!(VaultFunded { policy: ctx.accounts.policy.key(), lamports });
        Ok(())
    }

    pub fn authorize_intent(
        ctx: Context<AuthorizeIntent>,
        asset: Pubkey,
        amount_lamports: u64,
        intent_hash: [u8; 32],
    ) -> Result<()> {
        let policy = &mut ctx.accounts.policy;
        let now = Clock::get()?.unix_timestamp;

        if now.saturating_sub(policy.window_started_at) >= DAY_SECONDS {
            policy.window_started_at = now;
            policy.daily_spent_lamports = 0;
        }
        let projected = validate_intent(policy, &asset, amount_lamports)?;

        policy.nonce = policy.nonce.checked_add(1).ok_or(VeylockError::MathOverflow)?;
        if !policy.paper_mode {
            let rent_floor = Rent::get()?.minimum_balance(Policy::SPACE);
            let available = policy.to_account_info().lamports().saturating_sub(rent_floor);
            require!(available >= amount_lamports, VeylockError::InsufficientVaultBalance);
            policy.sub_lamports(amount_lamports)?;
            ctx.accounts.recipient.add_lamports(amount_lamports)?;
            policy.daily_spent_lamports = projected;
        }

        emit!(IntentDecision {
            policy: policy.key(),
            agent: ctx.accounts.agent.key(),
            recipient: ctx.accounts.recipient.key(),
            asset,
            amount_lamports,
            intent_hash,
            nonce: policy.nonce,
            paper_mode: policy.paper_mode,
        });
        Ok(())
    }

    pub fn set_paper_mode(ctx: Context<ManagePolicy>, paper_mode: bool) -> Result<()> {
        ctx.accounts.policy.paper_mode = paper_mode;
        emit!(PolicyModeChanged { policy: ctx.accounts.policy.key(), paper_mode });
        Ok(())
    }

    pub fn set_halt(ctx: Context<ManagePolicy>, halted: bool) -> Result<()> {
        ctx.accounts.policy.halted = halted;
        emit!(PolicyHaltChanged { policy: ctx.accounts.policy.key(), halted });
        Ok(())
    }

    pub fn update_drawdown(ctx: Context<ManagePolicy>, current_drawdown_bps: u16) -> Result<()> {
        require!(current_drawdown_bps <= 10_000, VeylockError::InvalidLimit);
        ctx.accounts.policy.current_drawdown_bps = current_drawdown_bps;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(agent: Pubkey)]
pub struct InitializePolicy<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(init, payer = authority, space = Policy::SPACE, seeds = [b"policy", authority.key().as_ref(), agent.as_ref()], bump)]
    pub policy: Account<'info, Policy>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority)]
    pub policy: Account<'info, Policy>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AuthorizeIntent<'info> {
    pub agent: Signer<'info>,
    #[account(mut, has_one = agent)]
    pub policy: Account<'info, Policy>,
    #[account(mut)]
    /// CHECK: Any recipient is permitted after policy checks; its key is recorded in the event.
    pub recipient: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct ManagePolicy<'info> {
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority)]
    pub policy: Account<'info, Policy>,
}

#[account]
pub struct Policy {
    pub authority: Pubkey,
    pub agent: Pubkey,
    pub max_action_lamports: u64,
    pub daily_budget_lamports: u64,
    pub daily_spent_lamports: u64,
    pub window_started_at: i64,
    pub max_drawdown_bps: u16,
    pub current_drawdown_bps: u16,
    pub paper_mode: bool,
    pub halted: bool,
    pub allowed_assets: Vec<Pubkey>,
    pub nonce: u64,
    pub bump: u8,
}

impl Policy {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 2 + 2 + 1 + 1 + 4 + (32 * MAX_ASSETS) + 8 + 1;
}

fn validate_intent(policy: &Policy, asset: &Pubkey, amount_lamports: u64) -> Result<u64> {
    require!(!policy.halted, VeylockError::PolicyHalted);
    require!(policy.current_drawdown_bps < policy.max_drawdown_bps, VeylockError::DrawdownTripped);
    require!(policy.allowed_assets.contains(asset), VeylockError::AssetNotAllowed);
    require!(amount_lamports > 0 && amount_lamports <= policy.max_action_lamports, VeylockError::ActionLimitExceeded);
    let projected = policy.daily_spent_lamports.checked_add(amount_lamports).ok_or(VeylockError::MathOverflow)?;
    require!(projected <= policy.daily_budget_lamports, VeylockError::DailyBudgetExceeded);
    Ok(projected)
}

#[event]
pub struct PolicyCreated { pub policy: Pubkey, pub authority: Pubkey, pub agent: Pubkey }
#[event]
pub struct VaultFunded { pub policy: Pubkey, pub lamports: u64 }
#[event]
pub struct PolicyModeChanged { pub policy: Pubkey, pub paper_mode: bool }
#[event]
pub struct PolicyHaltChanged { pub policy: Pubkey, pub halted: bool }
#[event]
pub struct IntentDecision {
    pub policy: Pubkey,
    pub agent: Pubkey,
    pub recipient: Pubkey,
    pub asset: Pubkey,
    pub amount_lamports: u64,
    pub intent_hash: [u8; 32],
    pub nonce: u64,
    pub paper_mode: bool,
}

#[error_code]
pub enum VeylockError {
    #[msg("Policy limits are invalid.")] InvalidLimit,
    #[msg("Asset list must contain one to eight entries.")] InvalidAssetList,
    #[msg("The policy is halted.")] PolicyHalted,
    #[msg("The drawdown circuit breaker has tripped.")] DrawdownTripped,
    #[msg("The asset is not allowed by this policy.")] AssetNotAllowed,
    #[msg("The action exceeds the per-action limit.")] ActionLimitExceeded,
    #[msg("The action exceeds the daily budget.")] DailyBudgetExceeded,
    #[msg("The policy vault has insufficient available funds.")] InsufficientVaultBalance,
    #[msg("Arithmetic overflow.")] MathOverflow,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn policy() -> Policy {
        Policy {
            authority: Pubkey::new_unique(), agent: Pubkey::new_unique(),
            max_action_lamports: 500, daily_budget_lamports: 2_000,
            daily_spent_lamports: 600, window_started_at: 0,
            max_drawdown_bps: 800, current_drawdown_bps: 240,
            paper_mode: true, halted: false,
            allowed_assets: vec![system_program::ID], nonce: 0, bump: 255,
        }
    }

    #[test]
    fn allows_bounded_intent() { assert_eq!(validate_intent(&policy(), &system_program::ID, 300).unwrap(), 900); }

    #[test]
    fn rejects_unlisted_asset() { assert!(validate_intent(&policy(), &Pubkey::new_unique(), 300).is_err()); }

    #[test]
    fn rejects_action_over_cap() { assert!(validate_intent(&policy(), &system_program::ID, 501).is_err()); }

    #[test]
    fn rejects_daily_budget_overflow() { let mut value = policy(); value.daily_spent_lamports = 1_900; assert!(validate_intent(&value, &system_program::ID, 300).is_err()); }

    #[test]
    fn rejects_halted_or_drawdown_tripped_policy() { let mut value = policy(); value.halted = true; assert!(validate_intent(&value, &system_program::ID, 300).is_err()); value.halted = false; value.current_drawdown_bps = 800; assert!(validate_intent(&value, &system_program::ID, 300).is_err()); }
}
