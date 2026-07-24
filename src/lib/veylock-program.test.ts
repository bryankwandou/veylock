import { describe, expect, it } from "vitest";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { buildAuthorizeIntentInstruction, buildInitializePolicyInstruction, derivePolicyAddress, usdToLamports, VEYLOCK_PROGRAM_ID } from "./veylock-program";

const wallet = new PublicKey("35z7X59rtyts557Up1RAwpyYN7x2cFqcDc7RjPuNxFzr");

describe("Veylock program SDK", () => {
  it("derives a stable policy PDA", () => {
    expect(derivePolicyAddress(wallet).toBase58()).toBe("FWnnRiYghf658bAzx9MSGTTsfkAteJJoDFPynHhezN84");
  });

  it("encodes initialize_policy for native SOL", () => {
    const instruction = buildInitializePolicyInstruction({ authority: wallet, maxActionLamports: 50_000_000, dailyBudgetLamports: 200_000_000, maxDrawdownBps: 800 });
    expect(instruction.programId.equals(VEYLOCK_PROGRAM_ID)).toBe(true);
    expect(Array.from(instruction.data.subarray(0, 8))).toEqual([9, 186, 86, 225, 129, 162, 231, 56]);
    expect(instruction.data.subarray(-32).equals(SystemProgram.programId.toBuffer())).toBe(true);
  });

  it("converts USD policy limits to SOL lamports", () => {
    expect(usdToLamports(75, 75)).toBe(1_000_000_000);
  });

  it("rejects malformed intent hashes", () => {
    expect(() => buildAuthorizeIntentInstruction({ agent: wallet, policy: derivePolicyAddress(wallet), recipient: wallet, amountLamports: 1, intentHash: new Uint8Array(12) })).toThrow("32 bytes");
  });
});
