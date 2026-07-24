import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("C4jFcBypYefdgw2goHbKREMjZSyRo4LknBVDP5cegYLN");
const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const walletPath = process.env.SOLANA_WALLET;
if (!walletPath) throw new Error("Set SOLANA_WALLET to an authority keypair JSON file.");

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

function pubkeyVector(values) {
  const length = Buffer.alloc(4);
  length.writeUInt32LE(values.length);
  return Buffer.concat([length, ...values.map((value) => value.toBuffer())]);
}

async function send(connection, transaction, signers) {
  const latest = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = latest.blockhash;
  transaction.feePayer = signers[0].publicKey;
  transaction.sign(...signers);
  const signature = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false, maxRetries: 8 });
  await connection.confirmTransaction({ signature, ...latest }, "confirmed");
  return signature;
}

const authority = loadKeypair(walletPath);
const agentPath = resolve(process.env.VEYLOCK_AGENT_KEYPAIR ?? "onchain/target/deploy/demo-agent.json");
if (!existsSync(agentPath)) {
  mkdirSync(dirname(agentPath), { recursive: true });
  writeFileSync(agentPath, JSON.stringify(Array.from(Keypair.generate().secretKey)));
}
const agent = loadKeypair(agentPath);
const connection = new Connection(rpcUrl, "confirmed");
const [policy] = PublicKey.findProgramAddressSync(
  [Buffer.from("policy"), authority.publicKey.toBuffer(), agent.publicKey.toBuffer()],
  PROGRAM_ID,
);

const signatures = {};
if (!(await connection.getAccountInfo(policy, "confirmed"))) {
  const initializeData = Buffer.concat([
    discriminator("initialize_policy"),
    agent.publicKey.toBuffer(),
    u64(50_000_000),
    u64(200_000_000),
    u16(800),
    pubkeyVector([SystemProgram.programId]),
  ]);
  const initialize = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: policy, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: initializeData,
  });
  signatures.initialize = await send(connection, new Transaction().add(initialize), [authority]);
}

const deposit = new TransactionInstruction({
  programId: PROGRAM_ID,
  keys: [
    { pubkey: authority.publicKey, isSigner: true, isWritable: true },
    { pubkey: policy, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
  data: Buffer.concat([discriminator("deposit"), u64(10_000_000)]),
});
signatures.deposit = await send(connection, new Transaction().add(deposit), [authority]);

const intentHash = createHash("sha256").update(`veylock-paper-intent-${Date.now()}`).digest();
const authorize = new TransactionInstruction({
  programId: PROGRAM_ID,
  keys: [
    { pubkey: agent.publicKey, isSigner: true, isWritable: false },
    { pubkey: policy, isSigner: false, isWritable: true },
    { pubkey: authority.publicKey, isSigner: false, isWritable: true },
  ],
  data: Buffer.concat([discriminator("authorize_intent"), SystemProgram.programId.toBuffer(), u64(20_000_000), intentHash]),
});
signatures.paperIntent = await send(connection, new Transaction().add(authorize), [authority, agent]);

const account = await connection.getAccountInfo(policy, "confirmed");
console.log(JSON.stringify({
  cluster: "devnet",
  programId: PROGRAM_ID.toBase58(),
  authority: authority.publicKey.toBase58(),
  agent: agent.publicKey.toBase58(),
  policy: policy.toBase58(),
  policyOwner: account?.owner.toBase58(),
  policyLamports: account?.lamports,
  policyDataBytes: account?.data.length,
  signatures,
}, null, 2));
