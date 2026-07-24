import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={cn("h-10 w-10", className)} viewBox="0 0 48 48" role="img" aria-label="Veylock mark">
      <path d="M7 7h34v34H7z" fill="#101612" />
      <path d="M14 14h8v8h-8z" fill="#c7f43d" />
      <path d="M26 14h8v8h-8z" fill="#3157f5" />
      <path d="M18 26h12v8H18z" fill="#ff735d" />
      <path d="M14 22h8l2 4 2-4h8L24 36 14 22Z" fill="#fffdf7" />
    </svg>
  );
}

export function Wordmark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3 font-semibold tracking-[-0.04em]">
      <BrandMark className="h-9 w-9" />
      <span className={inverse ? "text-[var(--paper-strong)]" : "text-[var(--ink)]"}>veylock</span>
    </span>
  );
}
