"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Connection, LAMPORTS_PER_SOL, PublicKey, Transaction, type TransactionInstruction } from "@solana/web3.js";
import { motion } from "motion/react";
import { Activity, ArrowLeft, Bot, Check, CircleAlert, CircleStop, Database, ExternalLink, LoaderCircle, LockKeyhole, Radio, RefreshCw, Send, ShieldAlert, ShieldCheck, UploadCloud, Wallet, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { compactAddress } from "@/lib/utils";
import { defaultPolicy, evaluateProposal, type Policy, type TradeProposal } from "@/lib/policy";
import {
  buildAuthorizeIntentInstruction,
  buildDepositInstruction,
  buildInitializePolicyInstruction,
  buildSetHaltInstruction,
  buildSetPaperModeInstruction,
  buildUpdateDrawdownInstruction,
  buildUpdateLimitsInstruction,
  decodePolicyAccount,
  derivePolicyAddress,
  usdToLamports,
  VEYLOCK_PROGRAM_ID,
  type OnchainPolicy,
} from "@/lib/veylock-program";

type PhantomProvider = {
  publicKey?: PublicKey;
  connect: () => Promise<{ publicKey: PublicKey }>;
  signTransaction?: (transaction: Transaction) => Promise<Transaction>;
  signAndSendTransaction: (transaction: Transaction) => Promise<{ signature: string }>;
};

declare global { interface Window { solana?: PhantomProvider } }

const initialProposal: TradeProposal = {
  side: "BUY",
  asset: "SOL",
  amountUsd: 320,
  confidence: 78,
  thesis: "Momentum remains constructive while liquidity is concentrated near the current range.",
  invalidation: "Cancel if price closes below session support or spread widens above 45 bps.",
};

type MarketSnapshot = {
  symbol: string;
  price: number;
  confidenceUsd: number;
  emaPrice: number;
  publishTime: number;
  source: string;
  stale: boolean;
};

export function ControlRoom() {
  const [policy, setPolicy] = useState<Policy>(defaultPolicy);
  const [proposal, setProposal] = useState<TradeProposal>(initialProposal);
  const [prompt, setPrompt] = useState("Review SOL momentum and propose one bounded action for a cautious treasury mandate.");
  const [status, setStatus] = useState<"idle" | "thinking" | "submitting" | "confirmed" | "error">("idle");
  const [message, setMessage] = useState("Ready for a new intent.");
  const [walletAddress, setWalletAddress] = useState("");
  const [signature, setSignature] = useState("");
  const [market, setMarket] = useState<MarketSnapshot | null>(null);
  const [marketError, setMarketError] = useState("");
  const [marketLoading, setMarketLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [programVerified, setProgramVerified] = useState(false);
  const [policyAddress, setPolicyAddress] = useState("");
  const [onchainPolicy, setOnchainPolicy] = useState<OnchainPolicy | null>(null);
  const [policyLamports, setPolicyLamports] = useState(0);
  const [chainBusy, setChainBusy] = useState("");
  const decision = useMemo(() => evaluateProposal(proposal, policy), [proposal, policy]);
  const connection = useMemo(() => new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com", "confirmed"), []);

  const loadMarket = useCallback(async () => {
    setMarketLoading(true);
    setMarketError("");
    try {
      const response = await fetch("/api/market", { cache: "no-store" });
      const body = (await response.json()) as MarketSnapshot & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Market feed unavailable");
      setMarket(body);
    } catch (error) {
      setMarketError(error instanceof Error ? error.message : "Market feed unavailable");
    } finally {
      setMarketLoading(false);
    }
  }, []);

  useEffect(() => { void loadMarket(); }, [loadMarket]);
  useEffect(() => {
    void connection.getAccountInfo(VEYLOCK_PROGRAM_ID, "confirmed").then((account) => setProgramVerified(Boolean(account?.executable))).catch(() => setProgramVerified(false));
  }, [connection]);

  const refreshChain = useCallback(async (wallet: PublicKey) => {
    const [programInfo, balance] = await Promise.all([
      connection.getAccountInfo(VEYLOCK_PROGRAM_ID, "confirmed"),
      connection.getBalance(wallet, "confirmed"),
    ]);
    setProgramVerified(Boolean(programInfo?.executable));
    setWalletBalance(balance / LAMPORTS_PER_SOL);
    const address = derivePolicyAddress(wallet);
    setPolicyAddress(address.toBase58());
    const account = await connection.getAccountInfo(address, "confirmed");
    if (account && account.owner.equals(VEYLOCK_PROGRAM_ID)) {
      setOnchainPolicy(decodePolicyAccount(account.data));
      setPolicyLamports(account.lamports);
    } else {
      setOnchainPolicy(null);
      setPolicyLamports(0);
    }
  }, [connection]);

  async function generateProposal() {
    setStatus("thinking");
    setMessage("Groq is drafting an intent. Veylock will judge it separately.");
    try {
      const response = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, policy, market }) });
      const body = (await response.json()) as { proposal?: TradeProposal; error?: string };
      if (!response.ok || !body.proposal) throw new Error(body.error ?? "No proposal returned");
      setProposal(body.proposal);
      setStatus("idle");
      setMessage("Intent generated. Policy checks updated without trusting the model verdict.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Proposal generation failed");
    }
  }

  async function connectWallet() {
    if (!window.solana) {
      setStatus("error");
      setMessage("No Solana wallet detected. Install Phantom to submit a devnet receipt.");
      return;
    }
    try {
      const result = await window.solana.connect();
      setWalletAddress(result.publicKey.toBase58());
      await refreshChain(result.publicKey);
      setStatus("idle");
      setMessage("Wallet connected and devnet program state verified.");
    } catch {
      setStatus("error");
      setMessage("Wallet connection was cancelled.");
    }
  }

  async function sendProgramTransaction(label: string, instructions: TransactionInstruction[]) {
    if (!window.solana?.publicKey) { await connectWallet(); return null; }
    setChainBusy(label);
    setStatus("submitting");
    setMessage(`${label} is waiting for wallet approval.`);
    try {
      const latest = await connection.getLatestBlockhash("confirmed");
      const transaction = new Transaction().add(...instructions);
      transaction.feePayer = window.solana.publicKey;
      transaction.recentBlockhash = latest.blockhash;
      let transactionSignature: string;
      if (window.solana.signTransaction) {
        const signed = await window.solana.signTransaction(transaction);
        transactionSignature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 8 });
      } else {
        transactionSignature = (await window.solana.signAndSendTransaction(transaction)).signature;
      }
      await connection.confirmTransaction({ signature: transactionSignature, ...latest }, "confirmed");
      setSignature(transactionSignature);
      await refreshChain(window.solana.publicKey);
      setStatus("confirmed");
      setMessage(`${label} finalized on Solana devnet.`);
      return transactionSignature;
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : `${label} failed`);
      return null;
    } finally {
      setChainBusy("");
    }
  }

  function requireWalletAndMarket() {
    if (!window.solana?.publicKey) throw new Error("Connect a Solana wallet first.");
    if (!market || market.stale) throw new Error("Refresh the verified SOL/USD price first.");
    return { wallet: window.solana.publicKey, market };
  }

  async function createOnchainPolicy() {
    try {
      const { wallet, market: snapshot } = requireWalletAndMarket();
      const instruction = buildInitializePolicyInstruction({
        authority: wallet,
        maxActionLamports: usdToLamports(policy.maxTradeUsd, snapshot.price),
        dailyBudgetLamports: usdToLamports(policy.dailyBudgetUsd, snapshot.price),
        maxDrawdownBps: Math.round(policy.maxDrawdownPercent * 100),
      });
      await sendProgramTransaction("Create policy", [instruction]);
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Policy creation failed"); }
  }

  async function fundOnchainPolicy() {
    if (!window.solana?.publicKey || !policyAddress) { await connectWallet(); return; }
    await sendProgramTransaction("Fund vault", [buildDepositInstruction(window.solana.publicKey, new PublicKey(policyAddress), 20_000_000)]);
  }

  async function syncOnchainPolicy() {
    try {
      const { wallet, market: snapshot } = requireWalletAndMarket();
      if (!policyAddress) throw new Error("Create the policy account first.");
      const address = new PublicKey(policyAddress);
      await sendProgramTransaction("Sync mandate", [
        buildUpdateLimitsInstruction(wallet, address, usdToLamports(policy.maxTradeUsd, snapshot.price), usdToLamports(policy.dailyBudgetUsd, snapshot.price), Math.round(policy.maxDrawdownPercent * 100)),
        buildSetPaperModeInstruction(wallet, address, policy.paperMode),
        buildUpdateDrawdownInstruction(wallet, address, Math.round(policy.currentDrawdownPercent * 100)),
      ]);
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Mandate sync failed"); }
  }

  async function toggleOnchainHalt() {
    if (!window.solana?.publicKey || !policyAddress || !onchainPolicy) return;
    const halted = !onchainPolicy.halted;
    const result = await sendProgramTransaction(halted ? "Emergency halt" : "Resume policy", [buildSetHaltInstruction(window.solana.publicKey, new PublicKey(policyAddress), halted)]);
    if (result) setPolicy({ ...policy, halted });
  }

  async function authorizeOnchainIntent() {
    try {
      if (!decision.allowed) throw new Error("The local preflight blocks this intent.");
      const { wallet, market: snapshot } = requireWalletAndMarket();
      if (!policyAddress || !onchainPolicy) throw new Error("Create and sync an on-chain policy first.");
      const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify({ proposal, policyAddress, timestamp: Date.now() }))));
      await sendProgramTransaction("Authorize intent", [buildAuthorizeIntentInstruction({ agent: wallet, policy: new PublicKey(policyAddress), recipient: wallet, amountLamports: usdToLamports(proposal.amountUsd, snapshot.price), intentHash: hash })]);
    } catch (error) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Intent authorization failed"); }
  }

  return (
    <main className="min-h-screen bg-[#111713] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex min-h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="Back to Veylock home" className="focus-ring flex h-10 w-10 items-center justify-center border border-white/15 hover:bg-white/5"><ArrowLeft size={18} aria-hidden="true" /></Link>
            <BrandMark className="h-9 w-9" />
            <div><p className="font-semibold tracking-[-0.03em]">Veylock control room</p><p className="font-mono text-[10px] uppercase tracking-widest text-white/45">Devnet · deployed policy program</p></div>
          </div>
          <button onClick={connectWallet} className="focus-ring inline-flex min-h-10 items-center gap-2 border border-white/15 px-4 text-sm font-semibold hover:bg-white/5"><Wallet size={16} aria-hidden="true" />{walletAddress ? `${compactAddress(walletAddress)}${walletBalance === null ? "" : ` · ${walletBalance.toFixed(2)} SOL`}` : "Connect wallet"}</button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-px bg-white/10 lg:grid-cols-[310px_1fr_360px]">
        <motion.aside initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }} className="bg-[#111713] p-5 sm:p-6">
          <div className="flex items-center justify-between"><p className="mono-label text-white/45">Active mandate</p><Radio size={16} className="text-[var(--acid)]" aria-hidden="true" /></div>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">Treasury / Cautious</h1>
          <p className="mt-2 text-sm leading-6 text-white/50">Quickstart uses the connected wallet as authority and agent so the full devnet flow is testable. Production deployments should separate both signers.</p>
          <div className="mt-8 space-y-6">
            <PolicyRange label="Max action" value={policy.maxTradeUsd} min={100} max={1500} prefix="$" onChange={(value) => setPolicy({ ...policy, maxTradeUsd: value, dailyBudgetUsd: Math.max(policy.dailyBudgetUsd, value) })} />
            <PolicyRange label="Daily budget" value={policy.dailyBudgetUsd} min={500} max={5000} step={100} prefix="$" onChange={(value) => setPolicy({ ...policy, dailyBudgetUsd: value, maxTradeUsd: Math.min(policy.maxTradeUsd, value) })} />
            <PolicyRange label="Drawdown stop" value={policy.maxDrawdownPercent} min={2} max={20} suffix="%" onChange={(value) => setPolicy({ ...policy, maxDrawdownPercent: value })} />
          </div>
          <div className="mt-8 border-t border-white/10 pt-6"><div className="flex items-center justify-between gap-4">
            <div><p className="text-sm font-semibold">Paper mode</p><p className="mt-1 text-xs text-white/45">Require explicit authority to go live.</p></div>
            <button type="button" role="switch" aria-checked={policy.paperMode} onClick={() => setPolicy({ ...policy, paperMode: !policy.paperMode })} className={`focus-ring relative h-7 w-12 border ${policy.paperMode ? "border-[var(--acid)] bg-[var(--acid)]" : "border-white/25 bg-white/10"}`}><span className={`absolute top-1 h-4 w-4 bg-[#111713] transition-transform ${policy.paperMode ? "translate-x-6" : "translate-x-1"}`} /><span className="sr-only">Toggle paper mode</span></button>
          </div></div>
          <div className="mt-8 bg-white/5 p-4"><p className="mono-label text-white/40">Allowed assets</p><div className="mt-3 flex flex-wrap gap-2">{policy.allowedAssets.map((asset) => <span key={asset} className="border border-white/15 px-2 py-1 font-mono text-xs">{asset}</span>)}</div></div>
          <div className="mt-4 border border-white/10 p-4">
            <div className="flex items-center justify-between gap-3"><p className="mono-label text-white/40">Verified market</p><button type="button" onClick={loadMarket} aria-label="Refresh market price" className="focus-ring flex h-10 w-10 items-center justify-center border border-white/10 hover:bg-white/5"><RefreshCw size={15} className={marketLoading ? "animate-spin" : ""} aria-hidden="true" /></button></div>
            {marketLoading && !market ? <div className="mt-4 h-14 animate-pulse bg-white/5" /> : marketError ? <div className="mt-4"><p className="text-sm text-[var(--coral)]">{marketError}</p><button onClick={loadMarket} className="mt-3 text-xs font-semibold underline">Retry feed</button></div> : market ? <div className="mt-4"><div className="flex items-center justify-between gap-2"><p className="font-mono text-2xl">${market.price.toFixed(2)}</p>{market.stale && <span className="border border-[var(--coral)] px-2 py-1 font-mono text-[9px] uppercase text-[var(--coral)]">cached</span>}</div><p className="mt-1 text-xs text-white/40">SOL/USD · ±${market.confidenceUsd.toFixed(3)} · {market.source}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-white/30">Published {new Date(market.publishTime * 1000).toLocaleTimeString()}</p></div> : null}
          </div>
        </motion.aside>

        <section className="min-w-0 bg-[#151d18] p-5 sm:p-8">
          <div className="flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="mono-label text-[var(--acid)]">Agent intent composer</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em]">Reason freely. Settle conditionally.</h2></div>
            <span className="inline-flex items-center gap-2 font-mono text-xs text-white/45"><Activity size={14} aria-hidden="true" /> Groq inference enabled</span>
          </div>
          <div className="mt-7">
            <label htmlFor="agent-prompt" className="text-sm font-semibold">Instruction</label>
            <textarea id="agent-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} className="focus-ring mt-3 w-full resize-none border border-white/15 bg-[#111713] p-4 leading-7 text-white placeholder:text-white/25" />
            <button onClick={generateProposal} disabled={status === "thinking"} className="focus-ring mt-3 inline-flex min-h-11 items-center gap-2 bg-[var(--acid)] px-5 font-semibold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-55">
              {status === "thinking" ? <LoaderCircle className="animate-spin" size={17} aria-hidden="true" /> : <Bot size={17} aria-hidden="true" />}{status === "thinking" ? "Drafting intent" : "Generate with Groq"}
            </button>
          </div>
          <article className="mt-8 border border-white/15 bg-[#111713]">
            <div className="flex items-center justify-between border-b border-white/10 p-5"><div><p className="mono-label text-white/40">Proposed action</p><p className="mt-2 text-2xl font-semibold"><span className={proposal.side === "BUY" ? "text-[var(--acid)]" : "text-[var(--coral)]"}>{proposal.side}</span> {proposal.asset}</p></div><div className="text-right"><p className="font-mono text-2xl">${proposal.amountUsd.toLocaleString()}</p><p className="mt-1 text-xs text-white/40">{proposal.confidence}% model confidence</p></div></div>
            <div className="grid gap-px bg-white/10 sm:grid-cols-2"><div className="bg-[#111713] p-5"><p className="mono-label text-white/40">Thesis</p><p className="mt-3 text-sm leading-6 text-white/70">{proposal.thesis}</p></div><div className="bg-[#111713] p-5"><p className="mono-label text-white/40">Invalidation</p><p className="mt-3 text-sm leading-6 text-white/70">{proposal.invalidation}</p></div></div>
          </article>
          <div className={`mt-5 flex items-start gap-3 border p-4 text-sm ${status === "error" ? "border-[var(--danger)]/50 bg-[var(--danger)]/10" : status === "confirmed" ? "border-[var(--success)]/50 bg-[var(--success)]/10" : "border-white/10 bg-white/5"}`}>
            {status === "error" ? <CircleAlert className="shrink-0 text-[var(--coral)]" size={18} aria-hidden="true" /> : status === "confirmed" ? <Check className="shrink-0 text-[var(--acid)]" size={18} aria-hidden="true" /> : <RefreshCw className="shrink-0 text-white/45" size={18} aria-hidden="true" />}
            <div><p>{message}</p>{signature && <a className="mt-2 block break-all font-mono text-xs text-[var(--acid)] underline" href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`} target="_blank" rel="noreferrer">View transaction {compactAddress(signature)}</a>}</div>
          </div>
        </section>

        <motion.aside initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }} className="bg-[#111713] p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><p className="mono-label text-white/45">Policy verdict</p><h2 className="mt-3 text-2xl font-semibold">{decision.allowed ? "Authorized" : "Blocked"}</h2></div><div className={`flex h-12 w-12 items-center justify-center ${decision.allowed ? "bg-[var(--acid)] text-[var(--ink)]" : "bg-[var(--coral)] text-[var(--ink)]"}`}>{decision.allowed ? <ShieldCheck aria-hidden="true" /> : <CircleStop aria-hidden="true" />}</div></div>
          <div className="mt-7 divide-y divide-white/10 border-y border-white/10">{decision.checks.map((check) => (
            <div key={check.label} className="flex gap-3 py-4"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center ${check.passed ? "bg-[var(--acid)] text-[var(--ink)]" : "bg-[var(--coral)] text-[var(--ink)]"}`}>{check.passed ? <Check size={13} aria-hidden="true" /> : <X size={13} aria-hidden="true" />}</span><div><p className="text-sm font-semibold">{check.label}</p><p className="mt-1 text-xs leading-5 text-white/42">{check.detail}</p></div></div>
          ))}</div>
          <div className="mt-6 border border-white/10 bg-white/5 p-4"><div className="flex items-center gap-3"><LockKeyhole size={18} className="text-[var(--acid)]" aria-hidden="true" /><div><p className="text-sm font-semibold">Settlement mode</p><p className="mt-1 font-mono text-xs uppercase tracking-wider text-white/45">{decision.mode}</p></div></div></div>
          <div className="mt-5 border border-white/10 p-4">
            <div className="flex items-center justify-between gap-3"><p className="mono-label text-white/40">Devnet verification</p><span className={`h-2.5 w-2.5 ${programVerified ? "bg-[var(--acid)]" : "bg-[var(--coral)]"}`} /></div>
            <div className="mt-4 space-y-3 text-xs">
              <ChainRow label="Program" value={programVerified ? "Executable" : walletAddress ? "Not verified" : "Connect wallet"} icon={Database} />
              <ChainRow label="Policy PDA" value={policyAddress ? compactAddress(policyAddress) : "Not derived"} icon={LockKeyhole} />
              <ChainRow label="Vault" value={onchainPolicy ? `${(policyLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL` : "Not created"} icon={UploadCloud} />
              <ChainRow label="Nonce" value={onchainPolicy ? onchainPolicy.nonce.toString() : "—"} icon={Activity} />
              <ChainRow label="On-chain mode" value={onchainPolicy ? onchainPolicy.paperMode ? "Paper" : "Live" : "—"} icon={ShieldCheck} />
              <ChainRow label="Circuit" value={onchainPolicy ? onchainPolicy.halted ? "Halted" : "Armed" : "—"} icon={ShieldAlert} />
            </div>
            {policyAddress && <a href={`https://explorer.solana.com/address/${policyAddress}?cluster=devnet`} target="_blank" rel="noreferrer" className="focus-ring mt-4 inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-[var(--acid)] underline"><ExternalLink size={14} aria-hidden="true" />Inspect policy account</a>}
          </div>

          <div className="mt-4 grid gap-2">
            {!walletAddress && <ChainButton onClick={connectWallet} busy={chainBusy} label="Connect Phantom" icon={Wallet} />}
            {walletAddress && !onchainPolicy && <ChainButton onClick={createOnchainPolicy} busy={chainBusy} label="1. Create devnet policy" icon={LockKeyhole} />}
            {onchainPolicy && <>
              <ChainButton onClick={fundOnchainPolicy} busy={chainBusy} label="2. Fund vault · 0.02 SOL" icon={UploadCloud} secondary />
              <ChainButton onClick={syncOnchainPolicy} busy={chainBusy} label="3. Sync mandate on-chain" icon={RefreshCw} secondary />
              <ChainButton onClick={authorizeOnchainIntent} busy={chainBusy} disabled={!decision.allowed} label="4. Authorize intent on-chain" icon={Send} />
              <ChainButton onClick={toggleOnchainHalt} busy={chainBusy} label={onchainPolicy.halted ? "Resume policy" : "Emergency halt"} icon={ShieldAlert} danger={!onchainPolicy.halted} secondary={onchainPolicy.halted} />
            </>}
          </div>
          <p className="mt-3 text-center text-xs leading-5 text-white/35">Every action above calls program C4jFc…gYLN on Solana devnet and returns an explorer-verifiable signature.</p>
        </motion.aside>
      </div>
    </main>
  );
}

function PolicyRange({ label, value, min, max, step = 10, prefix = "", suffix = "", onChange }: { label: string; value: number; min: number; max: number; step?: number; prefix?: string; suffix?: string; onChange: (value: number) => void }) {
  const id = `policy-${label.replaceAll(" ", "-")}`;
  return <div><div className="flex items-center justify-between gap-3"><label className="text-sm text-white/60" htmlFor={id}>{label}</label><span className="font-mono text-sm">{prefix}{value.toLocaleString()}{suffix}</span></div><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 h-1 w-full cursor-pointer accent-[var(--acid)]" /></div>;
}

function ChainRow({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Activity }) {
  return <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-white/45"><Icon size={14} aria-hidden="true" />{label}</span><span className="font-mono text-white/75">{value}</span></div>;
}

function ChainButton({ onClick, busy, label, icon: Icon, disabled = false, secondary = false, danger = false }: { onClick: () => void | Promise<void>; busy: string; label: string; icon: typeof Activity; disabled?: boolean; secondary?: boolean; danger?: boolean }) {
  const isBusy = Boolean(busy) && label.toLowerCase().includes(busy.split(" ")[0].toLowerCase());
  return <button onClick={onClick} disabled={Boolean(busy) || disabled} className={`focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-35 ${danger ? "border-[var(--coral)] bg-[var(--coral)] text-[var(--ink)]" : secondary ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : "border-white bg-white text-[var(--ink)]"}`}>{isBusy ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <Icon size={16} aria-hidden="true" />}{label}</button>;
}
