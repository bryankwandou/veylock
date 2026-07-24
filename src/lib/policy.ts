export type Policy = {
  maxTradeUsd: number;
  dailyBudgetUsd: number;
  dailySpentUsd: number;
  maxDrawdownPercent: number;
  currentDrawdownPercent: number;
  allowedAssets: string[];
  paperMode: boolean;
  halted: boolean;
};

export type TradeProposal = {
  side: "BUY" | "SELL";
  asset: string;
  amountUsd: number;
  confidence: number;
  thesis: string;
  invalidation: string;
};

export type PolicyDecision = {
  allowed: boolean;
  mode: "paper" | "live" | "blocked";
  checks: Array<{ label: string; passed: boolean; detail: string }>;
};

export const defaultPolicy: Policy = {
  maxTradeUsd: 500,
  dailyBudgetUsd: 2_000,
  dailySpentUsd: 620,
  maxDrawdownPercent: 8,
  currentDrawdownPercent: 2.4,
  allowedAssets: ["SOL", "USDC", "JUP"],
  paperMode: true,
  halted: false,
};

export function evaluateProposal(proposal: TradeProposal, policy: Policy): PolicyDecision {
  const checks = [
    {
      label: "Asset allowlist",
      passed: policy.allowedAssets.includes(proposal.asset.toUpperCase()),
      detail: `${proposal.asset.toUpperCase()} must be explicitly approved`,
    },
    {
      label: "Per-trade ceiling",
      passed: proposal.amountUsd <= policy.maxTradeUsd,
      detail: `$${proposal.amountUsd.toLocaleString()} of $${policy.maxTradeUsd.toLocaleString()} allowed`,
    },
    {
      label: "Daily budget",
      passed: policy.dailySpentUsd + proposal.amountUsd <= policy.dailyBudgetUsd,
      detail: `$${(policy.dailySpentUsd + proposal.amountUsd).toLocaleString()} projected spend`,
    },
    {
      label: "Drawdown breaker",
      passed: !policy.halted && policy.currentDrawdownPercent < policy.maxDrawdownPercent,
      detail: `${policy.currentDrawdownPercent}% of ${policy.maxDrawdownPercent}% limit`,
    },
  ];

  const allowed = checks.every((check) => check.passed);
  return { allowed, mode: allowed ? (policy.paperMode ? "paper" : "live") : "blocked", checks };
}
