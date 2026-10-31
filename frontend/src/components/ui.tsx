import clsx from "clsx";
import { ArrowRight, Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

type Variant = "lime" | "light" | "glass" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  lime: "bg-lime text-night hover:bg-lime-dark shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_24px_-10px_rgba(198,255,61,0.55)]",
  light: "bg-chalk text-night hover:bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_24px_-12px_rgba(255,255,255,0.35)]",
  glass: "border border-white/10 bg-white/[0.04] text-chalk shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-white/[0.08] hover:border-white/15",
  ghost: "text-chalk/75 hover:text-chalk hover:bg-white/5",
  danger: "bg-coral/12 text-coral hover:bg-coral/20",
};
const SIZES = { sm: "h-8 px-3 text-xs rounded-lg", md: "h-10 px-4 text-sm rounded-[10px]", lg: "h-12 px-6 text-[15px] rounded-xl" };

export function buttonClass(variant: Variant = "lime", size: keyof typeof SIZES = "md") {
  return clsx(
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold tracking-[-0.01em] transition duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
    VARIANTS[variant],
    SIZES[size],
  );
}

export function Button({
  variant = "lime",
  size = "md",
  arrow,
  busy,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof SIZES; arrow?: boolean; busy?: boolean }) {
  return (
    <button className={clsx(buttonClass(variant, size), className)} disabled={busy || rest.disabled} {...rest}>
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
      {arrow && !busy && <ArrowRight className="h-4 w-4" />}
    </button>
  );
}

export function LinkButton({ to, variant = "lime", size = "md", arrow, className, children }: { to: string; variant?: Variant; size?: keyof typeof SIZES; arrow?: boolean; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={clsx(buttonClass(variant, size), "group", className)}>
      {children}
      {arrow && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />}
    </Link>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("card", className)}>{children}</div>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx("hud flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-lime", className)}>{children}</p>;
}

export function Chip({ children, tone = "glass", className }: { children: ReactNode; tone?: "glass" | "lime" | "coral" | "amber" | "mint"; className?: string }) {
  const tones = {
    glass: "border border-white/8 bg-white/[0.04] text-chalk/80",
    lime: "bg-lime/12 text-lime",
    coral: "bg-coral/12 text-coral",
    amber: "bg-amber/12 text-amber",
    mint: "bg-mint/12 text-mint",
  };
  return <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone], className)}>{children}</span>;
}

export const STATUS = {
  good: { text: "text-mint", bg: "bg-mint", soft: "bg-mint/15", label: "в норме" },
  warn: { text: "text-amber", bg: "bg-amber", soft: "bg-amber/15", label: "заметно" },
  bad: { text: "text-coral", bg: "bg-coral", soft: "bg-coral/15", label: "исправить" },
  info: { text: "text-fog", bg: "bg-fog", soft: "bg-white/5", label: "" },
} as const;

export function PageTitle({ eyebrow, title, lead, children }: { eyebrow?: string; title: ReactNode; lead?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
        <h1 className="text-grad font-display text-3xl font-semibold leading-[1.1] md:text-[44px]">{title}</h1>
        {lead && <p className="mt-3 max-w-2xl text-fog">{lead}</p>}
      </div>
      {children}
    </div>
  );
}

export function Empty({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03]">
        <Reticle className="h-8 w-8 text-lime/80" />
      </span>
      <p className="mt-5 font-display text-xl font-semibold">{title}</p>
      {text && <p className="mt-2 max-w-md text-fog">{text}</p>}
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </Card>
  );
}

export function Reticle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" aria-hidden>
      <circle cx="32" cy="32" r="17" />
      <path d="M32 6v7M32 51v7M6 32h7M51 32h7" />
      <circle cx="32" cy="32" r="7.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
