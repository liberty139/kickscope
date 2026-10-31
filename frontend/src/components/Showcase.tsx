import clsx from "clsx";
import { Camera, LineChart, ScanLine, Users } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { HeroKick, kick } from "./KickScene";
import { LogoMark } from "./Logo";
import { useInView } from "./Motion";

const PRO = kick.pro;
const N = PRO.frames.length;

export const phaseOf = (i: number) => (i < PRO.backswing ? "Разбег" : i < PRO.contact ? "Замах" : i <= PRO.contact + 1 ? "Контакт" : "Сопровождение");

const PHASES = [
  { label: "Разбег", from: 0, to: PRO.plant },
  { label: "Опора", from: PRO.plant, to: PRO.backswing },
  { label: "Замах", from: PRO.backswing, to: PRO.contact },
  { label: "Сопровождение", from: PRO.contact, to: N - 1 },
];

const fmt = (v: number, d = 0) => v.toFixed(d).replace(".", ",");

/** Path through a series, x across [x0, x1], y mapped from [lo, hi] onto [y1, y0]. */
function pathOf(values: number[], x0: number, x1: number, y0: number, y1: number, lo: number, hi: number) {
  return values
    .map((v, i) => {
      const x = x0 + (i / (values.length - 1)) * (x1 - x0);
      const y = y1 - ((v - lo) / (hi - lo)) * (y1 - y0);
      return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

const SIDE = [
  { icon: ScanLine, label: "Разбор удара", active: true },
  { icon: Camera, label: "Зеркало" },
  { icon: LineChart, label: "Прогресс" },
  { icon: Users, label: "Команда U15" },
];

const PANEL = [
  { label: "Колено в момент удара", value: `${fmt(PRO.metrics.knee_contact)}°`, fill: 0.82 },
  { label: "Наклон корпуса", value: `+${fmt(PRO.metrics.trunk_lean, 1)}°`, fill: 0.64 },
  { label: "Опорная нога у мяча", value: `${fmt(Math.abs(PRO.metrics.plant_offset))} см`, fill: 0.9 },
  { label: "Скорость голени", value: `${fmt(PRO.metrics.shank_speed)}°/с`, fill: 0.94 },
  { label: "Бедро → голень", value: `${fmt(PRO.metrics.chain_lag)} мс`, fill: 0.74 },
];

/** The hero's product window: the reference kick playing inside a mock of the analysis screen. */
export function AppWindow() {
  const knee = useRef<HTMLSpanElement>(null);
  const shank = useRef<HTMLSpanElement>(null);
  const phase = useRef<HTMLSpanElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const frameNo = useRef<HTMLSpanElement>(null);
  const onFrame = useCallback((i: number, d: typeof PRO) => {
    if (knee.current) knee.current.textContent = `${d.knee[i]}°`;
    if (shank.current) shank.current.textContent = `${Math.max(0, d.shank_speed[i])}`;
    if (phase.current) {
      phase.current.textContent = phaseOf(i);
      phase.current.dataset.hit = String(Math.abs(i - d.contact) <= 1);
    }
    if (head.current) head.current.style.left = `${(i / (N - 1)) * 100}%`;
    if (frameNo.current) frameNo.current.textContent = String(i + 1).padStart(3, "0");
  }, []);
  const kneePath = useMemo(() => pathOf(PRO.knee, 0, 1000, 6, 54, 90, 185), []);
  return (
    <div className="frame overflow-hidden rounded-2xl text-left">
      <div className="flex h-10 items-center gap-3 border-b border-white/6 bg-white/[0.015] px-4">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        </span>
        <span className="hidden text-xs text-fog sm:block">
          Разборы <span className="text-dim">/</span> <span className="text-chalk/90">Эталонный удар подъёмом</span>
        </span>
        <span className="ml-auto flex items-center gap-2">
          <span className="hud hidden rounded-md border border-white/8 px-1.5 py-0.5 text-[10px] text-fog sm:inline">120 к/с</span>
          <span className="hud rounded-md border border-white/8 px-1.5 py-0.5 text-[10px] text-fog">
            кадр <span ref={frameNo}>001</span>
          </span>
        </span>
      </div>
      <div className="grid md:grid-cols-[188px_1fr] lg:grid-cols-[188px_1fr_248px]">
        <aside className="hidden border-r border-white/6 p-3 md:block">
          <div className="mb-4 flex items-center gap-2 px-1.5">
            <LogoMark size={20} />
            <span className="text-[13px] font-semibold">Академия U15</span>
          </div>
          {SIDE.map(({ icon: Icon, label, active }) => (
            <span key={label} className={clsx("flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px]", active ? "bg-white/[0.06] text-chalk" : "text-fog")}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </span>
          ))}
          <p className="mb-1.5 mt-5 px-2 text-[11px] font-medium text-dim">Последние попытки</p>
          {[
            ["Эталон", "96", "bg-mint"],
            ["Тимур · #5", "78", "bg-lime"],
            ["Тимур · #4", "71", "bg-amber"],
            ["Даня · #2", "64", "bg-amber"],
          ].map(([name, score, dot], k) => (
            <span key={name} className={clsx("flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px]", k === 0 ? "text-chalk" : "text-fog")}>
              <span className={clsx("h-1.5 w-1.5 rounded-full", dot)} />
              <span className="flex-1 truncate">{name}</span>
              <span className="hud text-[11px] text-dim">{score}</span>
            </span>
          ))}
        </aside>

        <div className="min-w-0 p-3">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-white/6 bg-[radial-gradient(90%_90%_at_55%_15%,#17191c,#0a0b0c)]">
            <div className="grid-bg absolute inset-0 opacity-60 [mask-image:none]" />
            <div className="absolute inset-x-0 bottom-0 h-[18%] bg-gradient-to-b from-transparent to-turf/70" />
            <HeroKick onFrame={onFrame} className="absolute inset-0 h-full w-full" />
            <div className="scan-line pointer-events-none absolute inset-x-0 h-12 bg-gradient-to-b from-transparent via-lime/10 to-transparent" />
            <div className="absolute left-2.5 top-2.5 flex gap-1.5">
              <span className="hud flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[10px] text-fog backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-coral" /> REC
              </span>
              <span ref={phase} className="hud rounded-md bg-black/60 px-2 py-1 text-[10px] text-chalk backdrop-blur transition-colors data-[hit=true]:bg-lime data-[hit=true]:text-night">
                Разбег
              </span>
            </div>
            <div className="absolute right-2.5 top-2.5 rounded-lg border border-white/8 bg-black/60 px-2.5 py-1.5 text-right backdrop-blur">
              <p className="text-[9px] uppercase tracking-wider text-fog">колено</p>
              <span ref={knee} className="hud text-base font-semibold text-lime">
                146°
              </span>
            </div>
            <div className="absolute bottom-2.5 left-2.5 hidden rounded-lg border sm:block border-white/8 bg-black/60 px-2.5 py-1.5 backdrop-blur">
              <p className="text-[9px] uppercase tracking-wider text-fog">ω голени, °/с</p>
              <span ref={shank} className="hud text-base font-semibold text-cyan">
                0
              </span>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-white/6 bg-white/[0.015] p-2.5">
            <div className="relative">
              <svg viewBox="0 0 1000 60" preserveAspectRatio="none" className="h-10 w-full" aria-hidden>
                <path d={kneePath} fill="none" stroke="rgba(175,80,255,0.75)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
              <div ref={head} className="absolute -bottom-1 top-0 w-px bg-chalk shadow-[0_0_8px_rgba(255,255,255,0.8)]" style={{ left: 0 }}>
                <span className="absolute -left-[3px] -top-1 h-[7px] w-[7px] rounded-full bg-chalk" />
              </div>
            </div>
            <div className="mt-2 flex gap-1">
              {PHASES.map((p) => (
                <span key={p.label} className="truncate rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-fog" style={{ flex: Math.max(4, p.to - p.from) }}>
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <aside className="hidden border-l border-white/6 p-4 lg:block">
          <p className="text-[11px] font-medium text-dim">Оценка похожести</p>
          <div className="mt-1 flex items-end gap-2">
            <span className="font-display text-4xl font-semibold tracking-tight">96</span>
            <span className="mb-1.5 text-xs text-mint">эталон</span>
          </div>
          <div className="mt-4 space-y-3">
            {PANEL.map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-[11px]">
                  <span className="text-fog">{m.label}</span>
                  <span className="hud text-chalk/90">{m.value}</span>
                </div>
                <div className="mt-1.5 h-1 rounded-full bg-white/6">
                  <div className="h-full rounded-full bg-gradient-to-r from-mint/60 to-mint" style={{ width: `${m.fill * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg border border-lime/20 bg-lime/[0.05] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-lime">Совет</p>
            <p className="mt-1 text-[12px] leading-relaxed text-chalk/80">Опорная нога рядом с мячом, корпус над мячом. Держи эту технику.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Knee angle and shank angular velocity over the whole kick, with phases and a crosshair on hover. */
export function KinematicsChart() {
  const [ref, seen] = useInView<HTMLDivElement>(0.25);
  const [hover, setHover] = useState<number | null>(null);
  const W = 1000;
  const H = 300;
  const top = 24;
  const bottom = 260;
  const knee = useMemo(() => pathOf(PRO.knee, 0, W, top, bottom, 90, 185), []);
  const lo = Math.min(...PRO.shank_speed);
  const hi = Math.max(...PRO.shank_speed);
  const shank = useMemo(() => pathOf(PRO.shank_speed, 0, W, top, bottom, lo - 200, hi + 100), [lo, hi]);
  const i = hover ?? PRO.contact;
  const x = (i / (N - 1)) * W;
  const ky = bottom - ((PRO.knee[i] - 90) / 95) * (bottom - top);
  const sy = bottom - ((PRO.shank_speed[i] - (lo - 200)) / (hi + 100 - (lo - 200))) * (bottom - top);
  return (
    <div ref={ref} className={clsx("relative", seen && "is-in")}>
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
        <span className="flex items-center gap-2 text-chalk/80">
          <span className="h-0.5 w-5 rounded bg-lime" /> Угол колена θ, °
        </span>
        <span className="flex items-center gap-2 text-chalk/80">
          <span className="h-0.5 w-5 rounded bg-cyan" /> Угловая скорость голени ω = dθ/dt
        </span>
        <span className="hud ml-auto text-fog">
          кадр {i + 1} · {phaseOf(i).toLowerCase()} · θ {PRO.knee[i]}° · ω {PRO.shank_speed[i]}°/с
        </span>
      </div>
      <div
        className="relative cursor-crosshair touch-none"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * (N - 1)));
        }}
        onPointerLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[260px] w-full md:h-[320px]" aria-label="Угол колена и скорость голени по кадрам">
          <defs>
            <linearGradient id="knee-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#AF50FF" stopOpacity="0.18" />
              <stop offset="1" stopColor="#AF50FF" stopOpacity="0" />
            </linearGradient>
          </defs>
          {PHASES.map((p, k) => (
            <g key={p.label}>
              <rect x={(p.from / (N - 1)) * W} width={((p.to - p.from) / (N - 1)) * W} y={0} height={H} fill={k % 2 ? "rgba(255,255,255,0.018)" : "transparent"} />
              <line x1={(p.from / (N - 1)) * W} x2={(p.from / (N - 1)) * W} y1={0} y2={H} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
            </g>
          ))}
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={0} x2={W} y1={top + f * (bottom - top)} y2={top + f * (bottom - top)} stroke="rgba(255,255,255,0.05)" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={`${knee} L${W},${H} L0,${H} Z`} fill="url(#knee-fill)" className="transition-opacity delay-700 duration-1000" opacity={seen ? 1 : 0} />
          <path d={knee} fill="none" stroke="#AF50FF" strokeWidth="2.5" pathLength={1} className="draw-line" style={{ strokeDasharray: 1, strokeDashoffset: seen ? 0 : 1 }} />
          <path d={shank} fill="none" stroke="#E1BDFF" strokeWidth="2" strokeOpacity="0.85" pathLength={1} className="draw-line" style={{ strokeDasharray: 1, strokeDashoffset: seen ? 0 : 1, animationDelay: "0.3s" }} />
          <line x1={x} x2={x} y1={0} y2={H} stroke={hover === null ? "rgba(255,90,79,0.7)" : "rgba(255,255,255,0.5)"} vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-night bg-lime shadow-[0_0_12px_#AF50FF]" style={{ left: `${(x / W) * 100}%`, top: `${(ky / H) * 100}%` }} />
        <span className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-night bg-cyan shadow-[0_0_12px_#E1BDFF]" style={{ left: `${(x / W) * 100}%`, top: `${(sy / H) * 100}%` }} />
        {hover === null && (
          <span className="hud pointer-events-none absolute top-1 -translate-x-1/2 rounded-md bg-coral px-1.5 py-0.5 text-[10px] font-semibold text-night" style={{ left: `${(x / W) * 100}%` }}>
            контакт
          </span>
        )}
      </div>
      <div className="mt-2 flex text-[11px] text-fog">
        {PHASES.map((p) => (
          <span key={p.label} className="truncate border-l border-white/8 pl-2" style={{ flex: Math.max(5, p.to - p.from) }}>
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Small line drawings for the metric cards: each shows what the number measures. */
export function MetricArt({ kind }: { kind: "knee" | "trunk" | "plant" | "shank" | "chain" | "backswing" }) {
  const stroke = "rgba(247,248,248,0.55)";
  const common = { fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 200 110" className="h-28 w-full" aria-hidden>
      {kind === "knee" && (
        <g {...common}>
          <path d="M60 20 L100 62 L150 80" stroke={stroke} strokeWidth="5" />
          <circle cx="100" cy="62" r="6" fill="#AF50FF" />
          <path d="M84 45 A 24 24 0 0 0 122 70" stroke="#AF50FF" strokeWidth="2" strokeDasharray="3 4" />
          <circle cx="164" cy="84" r="9" fill="rgba(247,248,248,0.9)" />
        </g>
      )}
      {kind === "trunk" && (
        <g {...common}>
          <line x1="100" y1="10" x2="100" y2="100" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="4 5" />
          <path d="M100 96 L112 22" stroke={stroke} strokeWidth="5" />
          <circle cx="114" cy="14" r="8" stroke={stroke} strokeWidth="4" />
          <path d="M100 52 A 44 44 0 0 1 108 51" stroke="#AF50FF" strokeWidth="2.5" />
          <path d="M100 40 A 56 56 0 0 1 110 39" stroke="#AF50FF" strokeWidth="2" strokeOpacity="0.5" />
        </g>
      )}
      {kind === "plant" && (
        <g {...common}>
          <line x1="20" y1="88" x2="180" y2="88" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
          <path d="M70 30 L74 82 L94 84" stroke={stroke} strokeWidth="5" />
          <circle cx="132" cy="76" r="12" fill="rgba(247,248,248,0.9)" />
          <path d="M80 100 L132 100 M80 95 V105 M132 95 V105" stroke="#FF5A4F" strokeWidth="2" />
        </g>
      )}
      {kind === "shank" && (
        <g {...common}>
          <path d="M30 92 A 70 70 0 0 1 170 92" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <path d="M30 92 A 70 70 0 0 1 150 44" stroke="url(#metric-g)" strokeWidth="8" />
          <defs>
            <linearGradient id="metric-g" x1="0" x2="1">
              <stop offset="0" stopColor="#E1BDFF" stopOpacity="0.2" />
              <stop offset="1" stopColor="#E1BDFF" />
            </linearGradient>
          </defs>
          <line x1="100" y1="92" x2="146" y2="50" stroke="rgba(247,248,248,0.9)" strokeWidth="3" />
          <circle cx="100" cy="92" r="5" fill="rgba(247,248,248,0.9)" />
        </g>
      )}
      {kind === "chain" && (
        <g {...common}>
          <line x1="14" y1="92" x2="186" y2="92" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
          <path d="M14 92 C 50 92 56 26 76 26 C 96 26 102 92 140 92" stroke="rgba(247,248,248,0.55)" strokeWidth="3" />
          <path d="M44 92 C 80 92 88 14 108 14 C 128 14 134 92 186 92" stroke="#E1BDFF" strokeWidth="3" />
          <path d="M76 8 H108 M76 4 V12 M108 4 V12" stroke="#AF50FF" strokeWidth="2" />
        </g>
      )}
      {kind === "backswing" && (
        <g {...common}>
          <path d="M70 14 L96 58 L62 86" stroke={stroke} strokeWidth="5" />
          <path d="M84 40 A 22 22 0 0 0 80 72" stroke="#AF50FF" strokeWidth="2" strokeDasharray="3 4" />
          <circle cx="96" cy="58" r="6" fill="#AF50FF" />
          <path d="M120 60 C 140 50 150 50 170 60" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeDasharray="2 6" />
        </g>
      )}
    </svg>
  );
}
