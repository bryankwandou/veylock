# Solana Devnet Proof

Verified on July 24, 2026.

## Program

- Program ID: `C4jFcBypYefdgw2goHbKREMjZSyRo4LknBVDP5cegYLN`
- Upgrade authority: `35z7X59rtyts557Up1RAwpyYN7x2cFqcDc7RjPuNxFzr`
- Deploy signature: `5Fx2yX56XfMZQ2Ad7krLQdZ5KXvFnC2StBsQfs1MnGEeRVPFmdrvM82sZ8upWD1PDpdgLJ9V7sE2YEWGXupAxoqc`
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
