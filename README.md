# Veylock

> Execution firewall for autonomous capital.

Veylock separates an agent's intelligence from its authority. Any model can propose an action, but settlement must pass a deterministic policy covering asset scope, per-action size, rolling budget, drawdown, operating mode, and emergency halt.

## MVP

- Interactive landing page and policy control room
- Groq-backed intent generation with a strict JSON contract
- Independent deterministic policy evaluation in TypeScript
- Phantom wallet connection and verifiable Solana devnet Memo receipts
- Anchor 1.1 program with policy PDA, funded vault, paper mode, daily budget, asset allowlist, drawdown breaker, and emergency halt
- Brand system, product audit, pitch deck, demo script, and submission copy

## Architecture

1. **Reasoning layer** — Groq proposes an intent. It never approves itself.
2. **Policy layer** — Veylock evaluates deterministic rules and displays each result.
3. **Settlement layer** — Solana records a receipt or the Anchor vault program executes an authorized transfer.

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` and use `/app` for the control room.

Required environment variables:

```bash
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

## Validation

```bash
npm run typecheck
npm run lint
npm run build
cd onchain
anchor build
```

Program ID: `C4jFcBypYefdgw2goHbKREMjZSyRo4LknBVDP5cegYLN`

The program compiles successfully. Devnet upload was attempted on July 23, 2026, but the public RPC exhausted transaction retries while writing the program buffer. Do not describe the program as deployed until `solana program show C4jFc... --url devnet` succeeds.

## Security Model

- Policy authority and agent signer are separate.
- Funds intended for enforced execution live inside the program-owned policy account.
- Live settlement is impossible while paper mode is enabled.
- The agent cannot change paper mode, halt state, or drawdown state.
- Every authorized intent includes a nonce and caller-supplied 32-byte intent hash.

This is hackathon-grade devnet software, not audited mainnet financial infrastructure.

## Documents

- `docs/PRODUCT-AUDIT.md`
- `docs/PITCH-DECK.md`
- `docs/DEMO-SCRIPT.md`
- `docs/SUBMISSION.md`
- `docs/MEGAPROMPT-V2.md`

## License

MIT
