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
- Eleven policy and instruction tests pass
- ESLint and TypeScript checks pass
- Anchor build and Rust tests pass
- Production demo is live at `https://veylock.vercel.app`
- Program ID `C4jFcBypYefdgw2goHbKREMjZSyRo4LknBVDP5cegYLN` is deployed on devnet
- Policy PDA creation, vault deposit, and paper-mode authorization are finalized on-chain
- The production control room now calls the deployed program directly from Phantom for policy creation, funding, synchronization, authorization, halt, and resume
- A reproducible script fetched production Pyth data, generated a live Groq proposal, passed deterministic policy checks, and finalized exact-intent signature `55EqFrgVeHu1CWdaWpcxwTZkgzMFpHVRkPpmRZQy62perdCtJqeBB75AXK8aKnEUQWivdFWniNb6mXrf17n2RPRE`

## What comes next

SPL token vaults, Jupiter-constrained settlement, SDK packages, policy templates, multi-agent budgets, external audit, and a mainnet design-partner pilot.
