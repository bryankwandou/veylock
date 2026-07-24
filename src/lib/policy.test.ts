import { describe, expect, it } from "vitest";
import { defaultPolicy, evaluateProposal, type TradeProposal } from "./policy";

const proposal: TradeProposal = {
  side: "BUY",
  asset: "SOL",
  amountUsd: 300,
  confidence: 75,
  thesis: "A sufficiently detailed test thesis for deterministic policy evaluation.",
  invalidation: "Cancel when the explicit invalidation threshold is crossed.",
};

describe("evaluateProposal", () => {
  it("authorizes an in-policy proposal in paper mode", () => {
    expect(evaluateProposal(proposal, defaultPolicy)).toMatchObject({ allowed: true, mode: "paper" });
  });

  it("switches an allowed proposal to live mode", () => {
    expect(evaluateProposal(proposal, { ...defaultPolicy, paperMode: false })).toMatchObject({ allowed: true, mode: "live" });
  });

  it("blocks assets outside the allowlist", () => {
    const result = evaluateProposal({ ...proposal, asset: "BONK" }, defaultPolicy);
    expect(result.allowed).toBe(false);
    expect(result.checks.find((check) => check.label === "Asset allowlist")?.passed).toBe(false);
  });

  it("blocks actions above the per-trade ceiling", () => {
    expect(evaluateProposal({ ...proposal, amountUsd: 501 }, defaultPolicy).allowed).toBe(false);
  });

  it("blocks actions that exceed the rolling daily budget", () => {
    const policy = { ...defaultPolicy, dailySpentUsd: 1_900 };
    expect(evaluateProposal(proposal, policy).allowed).toBe(false);
  });

  it("blocks when the drawdown threshold is reached", () => {
    const policy = { ...defaultPolicy, currentDrawdownPercent: 8 };
    expect(evaluateProposal(proposal, policy).allowed).toBe(false);
  });

  it("blocks immediately when authority halts the mandate", () => {
    expect(evaluateProposal(proposal, { ...defaultPolicy, halted: true }).mode).toBe("blocked");
  });
});
