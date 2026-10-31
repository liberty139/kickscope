import clsx from "clsx";

export function LogoMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id="logo-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f2022" />
          <stop offset="1" stopColor="#0d0e0f" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="63" height="63" rx="16" fill="url(#logo-face)" stroke="rgba(255,255,255,0.14)" />
      <circle cx="32" cy="32" r="17" fill="none" stroke="#C6FF3D" strokeWidth="3.5" />
      <g stroke="#C6FF3D" strokeWidth="3.5" strokeLinecap="round">
        <line x1="32" y1="7" x2="32" y2="13" />
        <line x1="32" y1="51" x2="32" y2="57" />
        <line x1="7" y1="32" x2="13" y2="32" />
        <line x1="51" y1="32" x2="57" y2="32" />
      </g>
      <circle cx="32" cy="32" r="8" fill="#F7F8F8" />
      <path d="M32 26.5l4.2 3-1.6 5h-5.2l-1.6-5z" fill="#08090A" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-[17px] font-semibold tracking-[-0.03em]">
        kick<span className="text-lime">scope</span>
      </span>
    </span>
  );
}
