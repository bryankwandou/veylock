"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, BadgeCheck, Blocks, BrainCircuit, Check, CircleStop, Fingerprint, Gauge, LockKeyhole, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import { BrandMark, Wordmark } from "@/components/brand-mark";

const policies = [
  ["Position ceiling", "$500 / action", "Enforced"],
  ["Daily budget", "$2,000 / 24h", "Enforced"],
  ["Asset scope", "SOL · USDC · JUP", "Enforced"],
  ["Drawdown breaker", "8% hard stop", "Armed"],
];

const workflow = [
  [BrainCircuit, "01", "Agent proposes", "Any model can submit an intent with its thesis, size, and invalidation point."],
  [ScanSearch, "02", "Veylock preflights", "The transaction is simulated against policy, budget, asset scope, and drawdown state."],
  [Blocks, "03", "Solana decides", "The on-chain program authorizes, records, or rejects the action. The agent cannot bypass it."],
] as const;

export function LandingPage() {
  return (
    <main className="overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-black/10 bg-[rgba(244,241,232,0.92)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" aria-label="Veylock home" className="focus-ring rounded-sm text-lg"><Wordmark /></Link>
          <nav className="hidden items-center gap-7 text-sm font-medium md:flex" aria-label="Main navigation">
            <a href="#product" className="hover:opacity-60">Product</a>
            <a href="#architecture" className="hover:opacity-60">Architecture</a>
            <a href="#why" className="hover:opacity-60">Why Veylock</a>
          </nav>
          <Link href="/app" className="focus-ring inline-flex min-h-10 items-center gap-2 bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5">
            Open control room <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </header>

      <section className="paper-grid noise relative min-h-screen border-b border-black/15 pt-16">
        <div className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-14 px-5 py-20 lg:grid-cols-[1.04fr_0.96fr] lg:px-8">
          <div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 inline-flex items-center gap-2 border border-black/20 bg-[var(--paper-strong)] px-3 py-2 mono-label">
              <span className="h-2 w-2 bg-[var(--success)]" /> Solana devnet · policy engine online
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }} className="balance-text max-w-4xl text-[clamp(3.7rem,8.4vw,8rem)] font-semibold leading-[0.86] tracking-[-0.075em]">
              Free the agent.<span className="block text-[var(--blue)]">Lock the capital.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="mt-8 max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
              Veylock is an execution firewall for autonomous capital. Agents can reason without limits; every transaction still answers to rules humans put on-chain.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/app" className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 bg-[var(--acid)] px-6 py-3 font-semibold transition-transform hover:-translate-y-0.5">Run a policy check <ArrowRight aria-hidden="true" size={18} /></Link>
              <a href="#architecture" className="focus-ring inline-flex min-h-12 items-center justify-center border border-black/25 bg-[var(--paper-strong)] px-6 py-3 font-semibold hover:bg-white">Inspect the system</a>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.96, rotate: 1 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="relative">
            <div className="absolute -left-5 -top-5 h-28 w-28 bg-[var(--coral)]" />
            <div className="absolute -bottom-5 -right-5 h-36 w-36 bg-[var(--blue)]" />
            <div className="relative border border-black/20 bg-[var(--ink)] p-3 shadow-[16px_18px_0_rgba(16,22,18,0.15)]">
              <div className="border border-white/15 bg-[#151d18] p-5 text-white sm:p-7">
                <div className="flex items-start justify-between border-b border-white/15 pb-5">
                  <div><p className="mono-label text-white/50">Live policy / VL-204</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Treasury agent mandate</h2></div>
                  <div className="flex h-12 w-12 items-center justify-center bg-[var(--acid)] text-[var(--ink)]"><LockKeyhole aria-hidden="true" /></div>
                </div>
                <div className="divide-y divide-white/10">
                  {policies.map(([label, value, state], index) => (
                    <motion.div key={label} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + index * 0.08 }} className="grid grid-cols-[1fr_auto] gap-4 py-5">
                      <div><p className="text-sm text-white/55">{label}</p><p className="mt-1 font-mono text-sm">{value}</p></div>
                      <span className="self-center border border-[var(--acid)]/50 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[var(--acid)]">{state}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between bg-white/5 p-4">
                  <div className="flex items-center gap-3"><ShieldCheck className="text-[var(--acid)]" aria-hidden="true" /><div><p className="text-sm font-semibold">Authority separated</p><p className="text-xs text-white/50">Agent cannot edit its own limits</p></div></div>
                  <span className="h-3 w-3 bg-[var(--acid)] shadow-[0_0_0_6px_rgba(199,244,61,0.12)]" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="product" className="border-b border-black/15 bg-[var(--ink)] py-24 text-white">
        <div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
          <div><p className="mono-label text-[var(--acid)]">The missing control plane</p><h2 className="balance-text mt-5 text-4xl font-semibold leading-none tracking-[-0.055em] sm:text-6xl">Intelligence is not authority.</h2></div>
          <div className="grid gap-px bg-white/15 sm:grid-cols-2">
            {[
              [Fingerprint, "Non-bypassable identity", "Each agent acts through a fixed signer and policy account."],
              [Gauge, "Budgets with memory", "Per-action and rolling limits update after every approved execution."],
              [CircleStop, "Circuit breakers", "Drawdown, velocity, or human emergency controls halt settlement."],
              [BadgeCheck, "Verifiable receipts", "Every decision leaves a compact, auditable trail on Solana."],
            ].map(([Icon, title, copy]) => { const FeatureIcon = Icon as typeof Fingerprint; return (
              <article key={title as string} className="bg-[var(--ink)] p-7 sm:p-8"><FeatureIcon className="text-[var(--acid)]" aria-hidden="true" size={28} /><h3 className="mt-10 text-xl font-semibold">{title as string}</h3><p className="mt-3 leading-7 text-white/58">{copy as string}</p></article>
            ); })}
          </div>
        </div></div>
      </section>

      <section id="architecture" className="border-b border-black/15 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="max-w-3xl"><p className="mono-label text-[var(--blue)]">Three layers, one hard boundary</p><h2 className="balance-text mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">Built so a persuasive model still cannot talk its way around policy.</h2></div>
          <div className="mt-14 grid border border-black/20 lg:grid-cols-3">
            {workflow.map(([Icon, number, title, copy], index) => (
              <article key={title} className={`relative min-h-80 p-7 sm:p-9 ${index < 2 ? "border-b border-black/20 lg:border-b-0 lg:border-r" : ""}`}>
                <div className="flex items-start justify-between"><Icon size={34} strokeWidth={1.6} aria-hidden="true" /><span className="font-mono text-xs text-[var(--muted)]">{number}</span></div>
                <div className="mt-28"><h3 className="text-2xl font-semibold tracking-[-0.04em]">{title}</h3><p className="mt-4 max-w-sm leading-7 text-[var(--muted)]">{copy}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="bg-[var(--blue)] py-24 text-white sm:py-32">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 lg:grid-cols-2 lg:px-8">
          <div><p className="mono-label text-white/65">Why this wins</p><h2 className="balance-text mt-5 text-5xl font-semibold leading-[0.95] tracking-[-0.06em] sm:text-7xl">Not another dashboard watching risk after the fact.</h2></div>
          <div className="self-end"><ul className="space-y-5">
            {["Works with any agent framework or model provider.", "Policy authority stays outside the agent runtime.", "Paper mode is the default, not an afterthought.", "Trading is the first vertical; treasury, payroll, and procurement follow."].map((item) => (
              <li key={item} className="flex gap-4 border-t border-white/25 pt-5 text-lg leading-7"><Check className="mt-1 shrink-0 text-[var(--acid)]" aria-hidden="true" />{item}</li>
            ))}
          </ul><Link href="/app" className="focus-ring mt-10 inline-flex min-h-12 items-center gap-2 bg-white px-6 py-3 font-semibold text-[var(--ink)] transition-transform hover:-translate-y-0.5">Test the control room <Sparkles aria-hidden="true" size={18} /></Link></div>
        </div>
      </section>

      <footer className="bg-[var(--ink)] py-10 text-white"><div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 sm:flex-row sm:items-end sm:justify-between lg:px-8">
        <div><BrandMark className="h-14 w-14" /><p className="mt-5 max-w-md text-sm leading-6 text-white/55">Execution infrastructure for teams ready to give software real economic agency without surrendering control.</p></div>
        <div className="text-left sm:text-right"><p className="mono-label text-white/45">Built on Solana devnet</p><p className="mt-2 text-sm text-white/70">Veylock · 2026</p></div>
      </div></footer>
    </main>
  );
}
