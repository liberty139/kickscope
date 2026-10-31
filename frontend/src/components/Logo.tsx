import clsx from "clsx";

/** The mark: a sight on the ball, white on the void with a violet centre. */
export function LogoMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <rect x="0.5" y="0.5" width="63" height="63" rx="16" fill="#0E0E10" stroke="rgba(247,249,250,0.22)" />
      <circle cx="32" cy="32" r="17" fill="none" stroke="#F7F9FA" strokeWidth="3" />
      <g stroke="#F7F9FA" strokeWidth="3" strokeLinecap="round">
        <line x1="32" y1="7" x2="32" y2="13" />
        <line x1="32" y1="51" x2="32" y2="57" />
        <line x1="7" y1="32" x2="13" y2="32" />
        <line x1="51" y1="32" x2="57" y2="32" />
      </g>
      <circle cx="32" cy="32" r="7.5" fill="#AF50FF" />
    </svg>
  );
}

/** Wordmark: KICK set heavy, SCOPE set light, the way a boarding pass prints a carrier name. */
export function Logo({ className, mark = true }: { className?: string; mark?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      {mark && <LogoMark size={26} />}
      <span className="text-[17px] uppercase tracking-[0.04em] text-chalk">
        <span className="font-bold">Kick</span>
        <span className="font-light">scope</span>
      </span>
    </span>
  );
}
