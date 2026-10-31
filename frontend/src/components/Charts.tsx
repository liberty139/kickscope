import clsx from "clsx";
import { useInView } from "./Motion";

/** Score ring 0–100; the arc draws itself on first view. */
export function ScoreRing({ score, size = 132, label = "из 100" }: { score: number; size?: number; label?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.3);
  const r = 44;
  const len = 2 * Math.PI * r;
  const color = score >= 85 ? "#2BD67B" : score >= 65 ? "#C6FF3D" : score >= 45 ? "#FFC145" : "#FF5A4F";
  return (
    <div ref={ref} className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={seen ? len * (1 - score / 100) : len}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.2,.8,.2,1)", filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold leading-none" style={{ fontSize: size * 0.3, color }}>
          {Math.round(score)}
        </span>
        <span className="mt-1 text-[11px] font-semibold text-fog">{label}</span>
      </div>
    </div>
  );
}

/** Minimal line chart with an optional reference band. Values in data units. */
export function LineChart({
  values,
  band,
  height = 120,
  color = "#C6FF3D",
  marker,
  className,
  labels,
}: {
  values: number[];
  band?: [number, number];
  height?: number;
  color?: string;
  marker?: number;
  className?: string;
  labels?: string[];
}) {
  const [ref, seen] = useInView<HTMLDivElement>(0.3);
  const w = 320;
  const h = height;
  const pad = 10;
  const all = [...values, ...(band ?? [])];
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (hi - lo < 1e-6) {
    lo -= 1;
    hi += 1;
  }
  const span = hi - lo;
  lo -= span * 0.12;
  hi += span * 0.12;
  const x = (i: number) => pad + (values.length > 1 ? (i / (values.length - 1)) * (w - pad * 2) : (w - pad * 2) / 2);
  const y = (v: number) => h - pad - ((v - lo) / (hi - lo)) * (h - pad * 2);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <div ref={ref} className={clsx(seen && "is-in", className)}>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full overflow-visible" preserveAspectRatio="none">
        {band && <rect x={pad} width={w - pad * 2} y={y(band[1])} height={Math.max(2, y(band[0]) - y(band[1]))} rx="6" fill="rgba(43,214,123,0.12)" stroke="rgba(43,214,123,0.35)" strokeDasharray="4 4" />}
        {marker !== undefined && <line x1={x(marker)} x2={x(marker)} y1={pad} y2={h - pad} stroke="rgba(255,255,255,0.35)" strokeDasharray="3 4" />}
        <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="draw-line" style={{ strokeDasharray: 1, strokeDashoffset: seen ? 0 : 1, ["--len" as string]: 1 }} />
        {values.length <= 20 &&
          values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === values.length - 1 ? 4.5 : 3} fill={i === values.length - 1 ? color : "#08090A"} stroke={color} strokeWidth="2" />)}
      </svg>
      {labels && (
        <div className="mt-1 flex justify-between text-[10px] font-semibold text-fog">
          {labels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}
