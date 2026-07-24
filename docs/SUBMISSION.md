# Hackathon Submission

## One-line description

Veylock is an on-chain execution firewall that lets autonomous agents reason freely while a separate Solana policy vault controls what capital can actually do.

## What it does

Teams define a mandate covering assets, action size, rolling budget, drawdown, paper mode, and emergency halt. Groq generates an intent, Veylock evaluates it with deterministic code, and Solana records or executes the authorized result.

## Why it matters

Most agent guardrails live in the same application the agent can influence or the attacker can compromise. Veylock moves final authority into a separate account and program boundary.

## Built with

Next.js 16, React 19, TypeScript, Groq, Solana Web3.js, Anchor 1.1, and Solana devnet.

## Current proof

- Web production build passes
- TypeScript check passes
- Anchor build and Rust tests pass
- Solana devnet Memo receipt flow is implemented
- Program ID is fixed at `C4jFcBypYefdgw2goHbKREMjZSyRo4LknBVDP5cegYLN`
- Public devnet RPC deployment remains pending after repeated buffer-write retry exhaustion

## What comes next

SPL token vaults, Jupiter-constrained settlement, SDK packages, policy templates, multi-agent budgets, external audit, and a mainnet design-partner pilot.
