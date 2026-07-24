# Veylock Build Specification v2

## Locked identity

- Name: Veylock
- Category: Execution firewall for autonomous capital
- Tagline: Free the agent. Lock the capital.
- Primary demo: Risk-bounded treasury trading
- Expansion: Payroll, procurement, grants, market making, machine payments

## Non-negotiable architecture

1. Agent reasoning never has policy authority.
2. Model output is parsed through a strict schema.
3. Policy evaluation is deterministic and independently reproducible.
4. Enforced funds live in a program-controlled vault.
5. Paper mode is default and authority-controlled.
6. Every decision carries a nonce and intent hash.
7. No production or audit claim without public verification.

## MVP acceptance criteria

- Landing page communicates the trust boundary within ten seconds.
- Control room generates a real Groq intent.
- Users can force an allowed and blocked verdict by changing policy.
- Phantom can write a devnet receipt.
- Anchor program compiles and tests.
- Program deployment is proven with `solana program show` before being marked complete.
- GitHub repo is public and Vercel production URL loads without errors.

## Design direction

Editorial infrastructure aesthetic. Warm paper for narrative, near-black for control surfaces, acid green for authorization, cobalt for system identity, coral for blocked state. Square geometry, strict grids, visible borders, no decorative 3D clutter, no emoji, and motion only where it explains state.

## Honesty rules

- Never promise a hackathon win or fabricated score.
- Never call a Memo receipt program-enforced settlement.
- Never describe an undeployed program as live.
- Never expose wallet files, mnemonic phrases, API keys, or Vercel tokens.
