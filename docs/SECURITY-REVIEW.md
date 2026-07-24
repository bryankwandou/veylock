# Security Review

## Threat boundary

Veylock assumes the model, agent runtime, prompts, and strategy code can all be wrong or compromised. It trusts only the authority signer, deterministic policy code, Solana account ownership, and cluster consensus.

## Controls implemented

- Separate authority and agent signers
- PDA policy account tied to authority and agent
- Funds deposited into a program-owned vault
- Asset allowlist capped at eight entries
- Per-action and daily spending ceilings
- Drawdown circuit breaker and authority-controlled halt
- Paper mode enabled at initialization
- Monotonic nonce and 32-byte intent hash in events
- Rent floor retained before lamport settlement
- Checked arithmetic for counters

## Known gaps

1. The web Memo receipt proves user submission, not policy-program enforcement.
2. The program currently handles native lamports; SPL and Token-2022 vaults are not implemented.
3. Drawdown is authority-reported and needs an oracle or attested accounting service.
4. Allowed asset and recipient policy are separate concerns; recipient allowlists are not yet implemented.
5. There is no timelock on changing paper mode.
6. The program has not received an external audit or fuzzing campaign.
7. Public RPC reliability blocked devnet deployment proof during this build session.

## Required before mainnet

- External audit and invariant-based fuzzing
- Recipient and program allowlists
- Timelocked high-risk policy changes
- SPL / Token-2022 vault adapters
- Oracle freshness and confidence checks
- Withdrawal and recovery path with explicit authority rules
- Upgrade authority governance and incident runbook
- Rate-limited relayer and independent transaction simulation

## Severity verdict

Suitable for a transparent devnet MVP. Not suitable for unattended mainnet funds.
