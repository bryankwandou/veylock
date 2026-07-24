import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("C4jFcBypYefdgw2goHbKREMjZSyRo4LknBVDP5cegYLN");
const baseUrl = (process.env.VEYLOCK_BASE_URL ?? "https://veylock.vercel.app").replace(/\/$/, "");
const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const walletPath = process.env.SOLANA_WALLET;

if (!walletPath) throw new Error("Set SOLANA_WALLET to a funded devnet keypair JSON file.");

const mandate = {
  maxTradeUsd: 500,
  dailyBudgetUsd: 2_000,
  dailySpentUsd: 620,
  maxDrawdownPercent: 8,
  currentDrawdownPercent: 2.4,
  allowedAssets: ["SOL", "USDC", "JUP"],
  paperMode: true,
  halted: false,
};

function loadKeypair(path) {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(resolve(path), "utf8"))));
}

function discriminator(name) {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

function u64(value) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value));
  return buffer;
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function bool(value) {
  return Buffer.from([value ? 1 : 0]);
}

function pubkeyVector(values) {
  const length = Buffer.alloc(4);
  length.writeUInt32LE(values.length);
  return Buffer.concat([length, ...values.map((value) => value.toBuffer())]);
}

function usdToLamports(usd, solPriceUsd) {
  return Math.max(1, Math.floor((usd / solPriceUsd) * 1_000_000_000));
}

function evaluateProposal(proposal) {
  const checks = [
    { label: "asset allowlist", passed: mandate.allowedAssets.includes(proposal.asset.toUpperCase()) },
    { label: "per-action ceiling", passed: proposal.amountUsd <= mandate.maxTradeUsd },
    { label: "daily budget", passed: mandate.dailySpentUsd + proposal.amountUsd <= mandate.dailyBudgetUsd },
    { label: "drawdown breaker", passed: !mandate.halted && mandate.currentDrawdownPercent < mandate.maxDrawdownPercent },
  ];
  return { allowed: checks.every((check) => check.passed), checks };
}

function manageInstruction(authority, policy, name, data) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: policy, isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([discriminator(name), data]),
  });
}

async function send(connection, feePayer, instructions, additionalSigners = []) {
  const latest = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction().add(...instructions);
  transaction.recentBlockhash = latest.blockhash;
  transaction.feePayer = feePayer.publicKey;
  transaction.sign(feePayer, ...additionalSigners);
  const signature = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false, maxRetries: 8 });
  await connection.confirmTransaction({ signature, ...latest }, "finalized");
  return signature;
}

async function fetchJson(path, init) {
  const response = await fetch(`${baseUrl}${path}`, { ...init, signal: AbortSignal.timeout(30_000) });
  const body = await response.json();
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${body.error ?? "unknown error"}`);
  return body;
}

const authority = loadKeypair(walletPath);
const agent = process.env.VEYLOCK_AGENT_KEYPAIR ? loadKeypair(process.env.VEYLOCK_AGENT_KEYPAIR) : authority;
const connection = new Connection(rpcUrl, "confirmed");
const programInfo = await connection.getAccountInfo(PROGRAM_ID, "confirmed");
if (!programInfo?.executable) throw new Error("The configured Veylock program is not executable on devnet.");

const market = await fetchJson("/api/market", { cache: "no-store" });
if (!market.price || market.stale || Date.now() / 1000 - market.publishTime > 120) {
  throw new Error("Production did not return a fresh Pyth market snapshot.");
}

const agentResponse = await fetchJson("/api/agent", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "Review SOL momentum and propose exactly one SOL action below $400 that respects every supplied cautious treasury limit. This remains a proposal, not an approval.",
    policy: mandate,
    market,
  }),
});
const proposal = agentResponse.proposal;
const decision = evaluateProposal(proposal);
if (!decision.allowed) throw new Error(`Deterministic preflight blocked the Groq proposal: ${JSON.stringify(decision.checks)}`);

const [policy] = PublicKey.findProgramAddressSync(
  [Buffer.from("policy"), authority.publicKey.toBuffer(), agent.publicKey.toBuffer()],
  PROGRAM_ID,
);
const signatures = {};
let policyInfo = await connection.getAccountInfo(policy, "confirmed");
const maxActionLamports = usdToLamports(mandate.maxTradeUsd, market.price);
const dailyBudgetLamports = usdToLamports(mandate.dailyBudgetUsd, market.price);

if (!policyInfo) {
  const initialize = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: policy, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      discriminator("initialize_policy"),
      agent.publicKey.toBuffer(),
      u64(maxActionLamports),
      u64(dailyBudgetLamports),
      u16(Math.round(mandate.maxDrawdownPercent * 100)),
      pubkeyVector([SystemProgram.programId]),
    ]),
  });
  signatures.initialize = await send(connection, authority, [initialize]);
  policyInfo = await connection.getAccountInfo(policy, "confirmed");
}

if (!policyInfo) throw new Error("Policy account was not available after initialization.");
const rentFloor = await connection.getMinimumBalanceForRentExemption(policyInfo.data.length, "confirmed");
const targetVaultLamports = rentFloor + 10_000_000;
if (policyInfo.lamports < targetVaultLamports) {
  const deposit = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: policy, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([discriminator("deposit"), u64(targetVaultLamports - policyInfo.lamports)]),
  });
  signatures.deposit = await send(connection, authority, [deposit]);
}

signatures.sync = await send(connection, authority, [
  manageInstruction(authority.publicKey, policy, "update_limits", Buffer.concat([u64(maxActionLamports), u64(dailyBudgetLamports), u16(Math.round(mandate.maxDrawdownPercent * 100))])),
  manageInstruction(authority.publicKey, policy, "set_paper_mode", bool(true)),
  manageInstruction(authority.publicKey, policy, "update_drawdown", u16(Math.round(mandate.currentDrawdownPercent * 100))),
  manageInstruction(authority.publicKey, policy, "set_halt", bool(false)),
]);

const amountLamports = usdToLamports(proposal.amountUsd, market.price);
const proofPayload = JSON.stringify({ proposal, market, policy: policy.toBase58(), mandate, version: 1 });
const intentHash = createHash("sha256").update(proofPayload).digest();
const authorize = new TransactionInstruction({
  programId: PROGRAM_ID,
  keys: [
    { pubkey: agent.publicKey, isSigner: true, isWritable: false },
    { pubkey: policy, isSigner: false, isWritable: true },
    { pubkey: authority.publicKey, isSigner: false, isWritable: true },
  ],
  data: Buffer.concat([discriminator("authorize_intent"), SystemProgram.programId.toBuffer(), u64(amountLamports), intentHash]),
});
signatures.authorize = await send(connection, authority, [authorize], agent === authority ? [] : [agent]);

const finalized = await connection.getSignatureStatuses(Object.values(signatures), { searchTransactionHistory: true });
if (finalized.value.some((status) => !status || status.err || status.confirmationStatus !== "finalized")) {
  throw new Error("At least one devnet transaction did not finalize successfully.");
}

console.log(JSON.stringify({
  verifiedAt: new Date().toISOString(),
  productionBaseUrl: baseUrl,
  cluster: "devnet",
  rpcUrl,
  programId: PROGRAM_ID.toBase58(),
  programExecutable: true,
  authority: authority.publicKey.toBase58(),
  agent: agent.publicKey.toBase58(),
  signerTopology: agent === authority ? "single-wallet-quickstart" : "separated-authority-and-agent",
  policy: policy.toBase58(),
  market: { symbol: market.symbol, price: market.price, publishTime: market.publishTime, source: market.source },
  model: agentResponse.model,
  proposal,
  deterministicDecision: decision,
  amountLamports,
  intentHash: intentHash.toString("hex"),
  signatures,
  confirmations: finalized.value.map((status) => status?.confirmationStatus ?? "unknown"),
}, null, 2));
