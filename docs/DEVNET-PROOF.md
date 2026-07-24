# Solana Devnet Proof

Verified on July 24, 2026.

## Program

- Program ID: `C4jFcBypYefdgw2goHbKREMjZSyRo4LknBVDP5cegYLN`
- Upgrade authority: `35z7X59rtyts557Up1RAwpyYN7x2cFqcDc7RjPuNxFzr`
- Deploy signature: `5Fx2yX56XfMZQ2Ad7krLQdZ5KXvFnC2StBsQfs1MnGEeRVPFmdrvM82sZ8upWD1PDpdgLJ9V7sE2YEWGXupAxoqc`
- `update_limits` upgrade signature: `3t2BCB3BK4Yq7ximBL1NYTEBAtSvXeLXmabB3fKNR1BhDkCd9usb94dnUDC1PevnidGYvGeDMLcfhqNWFAY121nD`
- Program data length: 180,832 bytes

## Policy lifecycle

- Agent: `F8tSkFXRAmyeLNMsvdXnm82pn4tWBUrRAowtmxw5748m`
- Policy PDA: `AdP6UCcPXsDF5Z19WFTPHuBaQ7HSZvLKPywNB457tVG7`
- Policy owner: `C4jFcBypYefdgw2goHbKREMjZSyRo4LknBVDP5cegYLN`
- Policy account size: 379 bytes
- Policy account lamports after deposit: 13,528,720

Finalized signatures:

- Initialize policy: `4sZEx17ZmnnnevWc9sxsJdQGSLLfmSQn4sSpbaSaALjZVZVTYnS1U7rT6x9oh7PPqKgZcTWUEaRLnS4RwzExSpWY`
- Deposit vault: `3dHtm3FB6JfQCL3STpdVtLKcNxqCwoDMLfoEEtJxRUs8mdL8GwENhZXKts1CWXNbhgr8sgVBDiMwxvKn4aASsxVn`
- Authorize paper intent: `2KT4XqvF8cE9HbwEcgyfHrP82o8XfeTfQxbvkYCM2PUKjLeLd7aaR59QVR6F117rx9mvw5GeMhW5bo85axkXhzHd`

## Reproduce

```bash
cd onchain
anchor build
cd ..
SOLANA_WALLET=/path/to/devnet-authority.json npm run onchain:demo
```

The demo script creates or reuses a separate ignored agent keypair, derives the policy PDA, initializes the mandate when absent, deposits 0.01 SOL, sends a bounded paper-mode intent, and prints only public addresses and signatures.

## Browser quickstart proof

This mirrors the production `/app` flow by using one connected wallet as authority and agent. It was finalized on devnet before the browser release.

- Policy PDA: `FWnnRiYghf658bAzx9MSGTTsfkAteJJoDFPynHhezN84`
- Initialize: `Zb52BWGuSv6yeB8pWEGhDSYh6Kw6DXgjPwayaH3QoW8adnkbyY6i9N6KYBsBz3FdVgm3DMrRJ2w3oLyqyxfr188`
- Deposit: `5MkxXHLAVaHxuHk7EVjaeVkyQwMVR5y5P6u4DS7Ujc91q7LovKEyVrv4CDVNvdU4kttbF9rqCdzfEY5sAEK2jE7q`
- Sync limits: `288UoU7MB3yvALshfBmtE6KufJ3bzGaT7PAeXNjNBsV15UkwxDm2xQduUWmDTUSAGjpomoaqXEkJ5DteHwgDiHyC`
- Authorize intent: `2GMHW6xRbv7eSc9dXQje6poyfcKpXES9hCRvCxP1neQGk1QHZDwbpp8HykLQA6U4oDtR7V5773fnozmTBevUBHU8`

Reproduce the same signer topology:

```bash
VEYLOCK_QUICKSTART=true SOLANA_WALLET=/path/to/devnet-wallet.json npm run onchain:demo
```

## Production AI-to-chain proof

Verified on July 24, 2026 against `https://veylock.vercel.app` and Solana devnet with separate authority and agent signers.

- Market source: Pyth Hermes SOL/USD
- Model: `llama-3.3-70b-versatile` through the production Groq route
- Proposal: BUY SOL for $380
- Deterministic checks: asset allowlist, per-action ceiling, daily budget, and drawdown breaker all passed
- Intent hash: `2c9391b1e809075c69b950ceba22130e5bdca530869f645ca5d8350f55b8500e`
- Policy sync: `4qphY17yEQwxoSYis881FwvhNJBbeprd6eUG9D5t12ZJse93nVRCs82nTJeXf8AYyVhM7SFTS1t3bmDfeRdrmo3j`
- Exact proposal authorization: `55EqFrgVeHu1CWdaWpcxwTZkgzMFpHVRkPpmRZQy62perdCtJqeBB75AXK8aKnEUQWivdFWniNb6mXrf17n2RPRE`

Reproduce without exposing key material:

```bash
SOLANA_WALLET=/path/to/authority.json \
VEYLOCK_AGENT_KEYPAIR=/path/to/agent.json \
npm run proof:full-cycle
```

The script verifies the deployed program is executable, requests a fresh production Pyth snapshot, requests a real structured Groq proposal, applies the same deterministic preflight used by the browser, synchronizes the on-chain mandate, hashes the exact proposal payload, submits it with the agent signer, and checks every returned signature for transaction errors.
