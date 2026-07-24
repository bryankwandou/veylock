# Veylock Product Audit

## Brutal verdict on TradeAgent

TradeAgent was a weak company idea disguised as a feature-heavy demo. The name was generic, the market category was overcrowded, and the product invited judges to compare it with every trading bot they had already rejected. Groq inference plus a Solana transaction was not differentiation. A risk dashboard was not enforcement. A prompt saying “stay inside limits” was not security.

The fatal flaw was category choice: **AI trading bot** is a commodity. The valuable component was buried inside it: a neutral execution boundary that stops any agent from moving capital outside a human mandate.

## Fixed direction

Veylock is an execution firewall for autonomous capital. Trading is the first reference workflow, not the company boundary. The same policy primitive can govern treasury rebalancing, payroll, procurement, grants, market making, and machine-to-machine payments.

## Why this is stronger

- The buyer is an agent platform, treasury operator, wallet provider, or protocol—not a retail trader chasing signals.
- The product remains useful when models, agent frameworks, and trading strategies change.
- The core value is prevention before settlement, not monitoring after loss.
- The on-chain vault creates a credible enforcement story instead of trusting agent middleware.

## Business Model Canvas

| Area | Decision |
| --- | --- |
| Customer segments | Agent platforms, crypto treasuries, protocols, wallet infrastructure, enterprise automation teams |
| Value proposition | Give software economic agency without giving it unrestricted spending authority |
| Channels | SDK integrations, wallet partners, Solana ecosystem, security teams, hackathon-to-design-partner funnel |
| Relationships | Developer-led onboarding, policy templates, integration support, incident review |
| Revenue | Usage-based authorization fees, policy seats, enterprise control plane, managed compliance exports |
| Key resources | Policy program, simulation engine, SDKs, risk templates, audit trail, integrations |
| Key activities | Policy enforcement, transaction simulation, integrations, security review, developer education |
| Partners | Wallets, custody providers, RPC providers, agent frameworks, auditors, Solana protocols |
| Cost structure | Security audits, RPC and simulation infrastructure, engineering, compliance, support |

## SWOT

### Strengths

- Clear separation between reasoning and authority
- Model-agnostic and framework-agnostic
- On-chain enforcement for funds held by the policy vault
- Easy visual demo: allowed versus blocked intent

### Weaknesses

- Agents can bypass policy if teams leave funds in an unrestricted wallet
- Token and DEX CPI support is not in the first MVP
- Reliable program deployment requires better RPC infrastructure
- Enterprise compliance claims would be premature

### Opportunities

- Autonomous treasury operations
- Agent wallets with configurable mandates
- Stablecoin payroll and procurement controls
- Policy marketplaces and reusable risk templates
- Cross-chain policy attestations

### Threats

- Wallet providers can bundle similar policies
- Smart-account standards may commoditize simple limits
- A single exploit destroys trust
- Overclaiming “AI safety” would attract scrutiny the MVP cannot satisfy

## Validation score

No honest reviewer can guarantee 99.5/100 or a hackathon win. Current score: **82/100 as an MVP**, with a path above 90 after deployed program proof, token-vault settlement, third-party integrations, tests, and an external security review.

## Kill criteria

Stop or reposition if three design partners say wallet-native policy controls are already sufficient, if teams refuse to custody funds in a policy vault, or if integration takes more than one engineer-day for the common agent stacks.
