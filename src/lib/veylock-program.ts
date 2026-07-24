import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";

export const VEYLOCK_PROGRAM_ID = new PublicKey("C4jFcBypYefdgw2goHbKREMjZSyRo4LknBVDP5cegYLN");

const DISCRIMINATORS = {
  initializePolicy: Buffer.from([9, 186, 86, 225, 129, 162, 231, 56]),
  deposit: Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]),
  authorizeIntent: Buffer.from([123, 207, 109, 239, 111, 69, 200, 72]),
  updateLimits: Buffer.from([89, 37, 137, 60, 75, 70, 48, 194]),
  setPaperMode: Buffer.from([114, 231, 15, 217, 139, 135, 59, 122]),
  setHalt: Buffer.from([212, 192, 179, 66, 23, 73, 197, 15]),
  updateDrawdown: Buffer.from([210, 165, 163, 77, 246, 231, 39, 69]),
};

function u64(value: number | bigint) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value));
  return buffer;
}

function u16(value: number) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

export function usdToLamports(usd: number, solPriceUsd: number) {
  if (!Number.isFinite(usd) || !Number.isFinite(solPriceUsd) || usd <= 0 || solPriceUsd <= 0) {
    throw new Error("A positive USD value and SOL price are required.");
  }
  return Math.max(1, Math.floor((usd / solPriceUsd) * 1_000_000_000));
}

export function derivePolicyAddress(authority: PublicKey, agent = authority) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("policy"), authority.toBuffer(), agent.toBuffer()],
    VEYLOCK_PROGRAM_ID,
  )[0];
}

export function buildInitializePolicyInstruction(params: {
  authority: PublicKey;
  agent?: PublicKey;
  maxActionLamports: number;
  dailyBudgetLamports: number;
  maxDrawdownBps: number;
}) {
  const agent = params.agent ?? params.authority;
  const policy = derivePolicyAddress(params.authority, agent);
  const allowedAssets = Buffer.concat([Buffer.from([1, 0, 0, 0]), SystemProgram.programId.toBuffer()]);
  return new TransactionInstruction({
    programId: VEYLOCK_PROGRAM_ID,
    keys: [
      { pubkey: params.authority, isSigner: true, isWritable: true },
      { pubkey: policy, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      DISCRIMINATORS.initializePolicy,
      agent.toBuffer(),
      u64(params.maxActionLamports),
      u64(params.dailyBudgetLamports),
      u16(params.maxDrawdownBps),
      allowedAssets,
    ]),
  });
}

export function buildDepositInstruction(authority: PublicKey, policy: PublicKey, lamports: number) {
  return new TransactionInstruction({
    programId: VEYLOCK_PROGRAM_ID,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: policy, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([DISCRIMINATORS.deposit, u64(lamports)]),
  });
}

export function buildUpdateLimitsInstruction(authority: PublicKey, policy: PublicKey, maxActionLamports: number, dailyBudgetLamports: number, maxDrawdownBps: number) {
  return manageInstruction(authority, policy, Buffer.concat([DISCRIMINATORS.updateLimits, u64(maxActionLamports), u64(dailyBudgetLamports), u16(maxDrawdownBps)]));
}

export function buildSetPaperModeInstruction(authority: PublicKey, policy: PublicKey, paperMode: boolean) {
  return manageInstruction(authority, policy, Buffer.concat([DISCRIMINATORS.setPaperMode, Buffer.from([paperMode ? 1 : 0])]));
}

export function buildSetHaltInstruction(authority: PublicKey, policy: PublicKey, halted: boolean) {
  return manageInstruction(authority, policy, Buffer.concat([DISCRIMINATORS.setHalt, Buffer.from([halted ? 1 : 0])]));
}

export function buildUpdateDrawdownInstruction(authority: PublicKey, policy: PublicKey, drawdownBps: number) {
  return manageInstruction(authority, policy, Buffer.concat([DISCRIMINATORS.updateDrawdown, u16(drawdownBps)]));
}

function manageInstruction(authority: PublicKey, policy: PublicKey, data: Buffer) {
  return new TransactionInstruction({
    programId: VEYLOCK_PROGRAM_ID,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: policy, isSigner: false, isWritable: true },
    ],
    data,
  });
}

export function buildAuthorizeIntentInstruction(params: {
  agent: PublicKey;
  policy: PublicKey;
  recipient: PublicKey;
  amountLamports: number;
  intentHash: Uint8Array;
}) {
  if (params.intentHash.length !== 32) throw new Error("Intent hash must be 32 bytes.");
  return new TransactionInstruction({
    programId: VEYLOCK_PROGRAM_ID,
    keys: [
      { pubkey: params.agent, isSigner: true, isWritable: false },
      { pubkey: params.policy, isSigner: false, isWritable: true },
      { pubkey: params.recipient, isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([DISCRIMINATORS.authorizeIntent, SystemProgram.programId.toBuffer(), u64(params.amountLamports), Buffer.from(params.intentHash)]),
  });
}

export type OnchainPolicy = {
  authority: PublicKey;
  agent: PublicKey;
  maxActionLamports: bigint;
  dailyBudgetLamports: bigint;
  dailySpentLamports: bigint;
  maxDrawdownBps: number;
  currentDrawdownBps: number;
  paperMode: boolean;
  halted: boolean;
  nonce: bigint;
};

export function decodePolicyAccount(data: Uint8Array): OnchainPolicy {
  const buffer = Buffer.from(data);
  if (buffer.length < 155) throw new Error("Policy account data is too short.");
  const assetCount = buffer.readUInt32LE(110);
  const nonceOffset = 114 + assetCount * 32;
  return {
    authority: new PublicKey(buffer.subarray(8, 40)),
    agent: new PublicKey(buffer.subarray(40, 72)),
    maxActionLamports: buffer.readBigUInt64LE(72),
    dailyBudgetLamports: buffer.readBigUInt64LE(80),
    dailySpentLamports: buffer.readBigUInt64LE(88),
    maxDrawdownBps: buffer.readUInt16LE(104),
    currentDrawdownBps: buffer.readUInt16LE(106),
    paperMode: buffer[108] === 1,
    halted: buffer[109] === 1,
    nonce: buffer.readBigUInt64LE(nonceOffset),
  };
}
