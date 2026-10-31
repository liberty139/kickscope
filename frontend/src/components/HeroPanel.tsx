import clsx from "clsx";
import { Ghost, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { angleAt, drawSkeleton, mid, type Pt } from "../lib/skeleton";
import { ball, expand, kick } from "./KickScene";

const PL = kick.player;
const PRO = kick.pro;
const N = PL.frames.length;
const FPS = 60;
const VIOLET = "#AF50FF";
const LAVENDER = "#E1BDFF";

type Key = "knee" | "hip" | "trunk" | "shank";
type Kick = typeof PL;

/** Angles in true proportions: x is stretched back by the clip's aspect ratio. */
const real = (d: Kick, i: number) => expand(d.frames[i], kick.aspect, 1);
const trunkLean = (p: Pt[]) => {
  const sh = mid(p[11], p[12]);
  const hp = mid(p[23], p[24]);
  return (Math.atan2(sh[0] - hp[0], hp[1] - sh[1]) * 180) / Math.PI;
};
const series = (d: Kick): Record<Key, number[]> => ({
  knee: d.knee,
  hip: d.frames.map((_, i) => {
    const p = real(d, i);
    return angleAt(p[12], p[24], p[26]);
  }),
  trunk: d.frames.map((_, i) => trunkLean(real(d, i))),
  shank: d.shank_speed.map((v) => Math.max(0, v)),
});
const S_PL = series(PL);
const S_PRO = series(PRO);

const TABS: { key: Key; label: string; unit: string }[] = [
  { key: "knee", label: "Колено", unit: "°" },
  { key: "hip", label: "Бедро", unit: "°" },
  { key: "trunk", label: "Наклон корпуса", unit: "°" },
  { key: "shank", label: "ω голени", unit: "°/с" },
];

const fmt = (key: Key, v: number) => (key === "trunk" ? `${v > 0 ? "+" : ""}${v.toFixed(0)}` : Math.round(v).toString());

function phaseOf(i: number) {
  if (Math.abs(i - PL.contact) <= 1) return "контакт";
  if (i < PL.plant) return "разбег";
  if (i < PL.backswing) return "опора";
  if (i < PL.contact) return "замах";
  return "сопровождение";
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, s: number, opts: { size?: number; color?: string; bg?: string; align?: CanvasTextAlign } = {}) {
  const size = (opts.size ?? 11) * s;
  ctx.save();
  ctx.font = `500 ${size}px "JetBrains Mono", monospace`;
  ctx.textAlign = opts.align ?? "left";
  ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width;
  if (opts.bg) {
    const pad = 6 * s;
    const x0 = opts.align === "center" ? x - w / 2 - pad : opts.align === "right" ? x - w - pad : x - pad;
    ctx.fillStyle = opts.bg;
    ctx.beginPath();
    ctx.roundRect(x0, y - size * 0.85, w + pad * 2, size * 1.7, 4 * s);
    ctx.fill();
  }
  ctx.fillStyle = opts.color ?? "#F7F9FA";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function arc(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, c: Pt, r: number, s: number) {
  const t1 = Math.atan2(a[1] - b[1], a[0] - b[0]);
  const t2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
  let d = t2 - t1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  ctx.save();
  ctx.strokeStyle = VIOLET;
  ctx.shadowColor = VIOLET;
  ctx.shadowBlur = 10;
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.arc(b[0], b[1], r, t1, t1 + d, d < 0);
  ctx.stroke();
  ctx.restore();
}

/** Vertical extent of both kicks, for a zoom that never changes. */
const BODY_Y = (() => {
  let y0 = 1;
  let y1 = 0;
  for (const d of [PL, PRO]) for (const fr of d.frames) for (const [, y] of fr) (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y));
  return { y0, y1 };
})();

/** Hip position per frame, smoothed, so the camera glides with the player instead of shaking. */
const HIP_X = (() => {
  const raw = PL.frames.map((fr) => {
    const p = expand(fr, 1, 1);
    return (p[23][0] + p[24][0]) / 2;
  });
  return raw.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let k = Math.max(0, i - 6); k <= Math.min(raw.length - 1, i + 6); k++) (sum += raw[k]), n++;
    return sum / n;
  });
})();

/** Sets up the canvas: true proportions (virtual width from the clip aspect) and a camera that follows the hips. */
function camera(c: HTMLCanvasElement, f: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = c.clientWidth;
  const ch = c.clientHeight;
  if (c.width !== Math.round(cw * dpr) || c.height !== Math.round(ch * dpr)) {
    c.width = Math.round(cw * dpr);
    c.height = Math.round(ch * dpr);
  }
  const ctx = c.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  const H = ch;
  const W = H * kick.aspect;
  const z = (ch * 0.7) / ((BODY_Y.y1 - BODY_Y.y0) * H);
  const i0 = Math.max(0, Math.min(N - 1, Math.floor(f)));
  const i1 = Math.min(N - 1, i0 + 1);
  const hx = (HIP_X[i0] + (HIP_X[i1] - HIP_X[i0]) * (f - i0)) * W;
  const cy = ((BODY_Y.y0 + BODY_Y.y1) / 2) * H;
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (cw * 0.4 - hx * z), dpr * (ch * 0.5 - cy * z));
  return { ctx, W, H, z };
}

/** One frame of the analysis: ghost, ball flight, player, the chosen measurement and the contact moment. */
function draw(c: HTMLCanvasElement, f: number, key: Key, ghost: boolean) {
  const { ctx, W, H, z } = camera(c, f);
  const i = Math.max(0, Math.min(N - 1, Math.round(f)));
  const s = Math.max(0.65, c.clientWidth / 720) / z;
  const p = expand(PL.frames[i], W, H);
  const ballAt = (k: number): Pt => [PL.ball[k][0] * W, PL.ball[k][1] * H];

  // Ground line under the support foot.
  const gy = Math.max(p[29][1], p[31][1], p[30][1], p[32][1]) + 4 * s;
  ctx.save();
  ctx.strokeStyle = "rgba(247,249,250,0.12)";
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  ctx.moveTo(-W, gy);
  ctx.lineTo(W * 2, gy);
  ctx.stroke();
  ctx.restore();

  if (ghost) drawSkeleton(ctx, expand(PRO.frames[i], W, H), "right", { color: "rgba(247,249,250,1)", width: 4 * s, alpha: 0.22, joints: false });

  // Ball flight: the whole path dotted once the ball is struck, the travelled part brighter.
  if (i >= PL.contact - 1) {
    ctx.save();
    ctx.setLineDash([2 * s, 7 * s]);
    ctx.lineCap = "round";
    ctx.lineWidth = 2.2 * s;
    ctx.strokeStyle = "rgba(225,189,255,0.28)";
    ctx.beginPath();
    for (let k = PL.contact; k < N; k++) (k === PL.contact ? ctx.moveTo : ctx.lineTo).apply(ctx, ballAt(k));
    ctx.stroke();
    ctx.strokeStyle = "rgba(225,189,255,0.85)";
    ctx.beginPath();
    for (let k = PL.contact; k <= i; k++) (k === PL.contact ? ctx.moveTo : ctx.lineTo).apply(ctx, ballAt(k));
    ctx.stroke();
    ctx.restore();
  }

  drawSkeleton(ctx, p, "right", { color: "#C9C3D6", kick: VIOLET, width: 5 * s, glow: 14 });

  // Support foot: where it stands relative to the ball, from plant until just after contact.
  if (i >= PL.plant && i <= PL.contact + 10) {
    const foot = p[27];
    const bx = ballAt(PL.contact)[0];
    const y = gy + 16 * s;
    ctx.save();
    ctx.strokeStyle = "rgba(255,107,107,0.9)";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(foot[0], y);
    ctx.lineTo(bx, y);
    ctx.moveTo(foot[0], y - 5 * s);
    ctx.lineTo(foot[0], y + 5 * s);
    ctx.moveTo(bx, y - 5 * s);
    ctx.lineTo(bx, y + 5 * s);
    ctx.stroke();
    ctx.restore();
    label(ctx, `опора · ${Math.round(Math.abs(PL.metrics.plant_offset))} см до мяча`, (foot[0] + bx) / 2, y + 14 * s, s, { size: 10, color: "#FF8A8A", align: "center" });
  }

  // The chosen measurement.
  const value = S_PL[key][i];
  const big = (x: number, y: number) => label(ctx, `${fmt(key, value)}${key === "shank" ? "" : "°"}`, x, y, s, { size: 26, color: LAVENDER });
  if (key === "knee") {
    arc(ctx, p[24], p[26], p[28], 26 * s, s);
    big(p[26][0] + 34 * s, p[26][1] - 6 * s);
  } else if (key === "hip") {
    arc(ctx, p[12], p[24], p[26], 30 * s, s);
    big(p[24][0] + 36 * s, p[24][1] - 10 * s);
  } else if (key === "trunk") {
    const hp = mid(p[23], p[24]);
    const sh = mid(p[11], p[12]);
    const len = Math.hypot(sh[0] - hp[0], sh[1] - hp[1]);
    ctx.save();
    ctx.setLineDash([4 * s, 5 * s]);
    ctx.strokeStyle = "rgba(247,249,250,0.45)";
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(hp[0], hp[1]);
    ctx.lineTo(hp[0], hp[1] - len * 1.1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = VIOLET;
    ctx.shadowColor = VIOLET;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(hp[0], hp[1]);
    ctx.lineTo(sh[0], sh[1]);
    ctx.stroke();
    ctx.restore();
    arc(ctx, [hp[0], hp[1] - len], hp, sh, len * 0.45, s);
    big(Math.max(sh[0], hp[0]) + 30 * s, (hp[1] + sh[1]) / 2);
  } else {
    ctx.save();
    ctx.strokeStyle = VIOLET;
    ctx.shadowColor = VIOLET;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 8 * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p[26][0], p[26][1]);
    ctx.lineTo(p[28][0], p[28][1]);
    ctx.stroke();
    ctx.restore();
    label(ctx, `${fmt(key, value)}°/с`, p[28][0] + 30 * s, p[28][1] - 26 * s, s, { size: 22, color: LAVENDER });
  }

  ball(ctx, PL, i, W, H, true, z);

  // Contact: the point of impact pulses, a sight locks on it and the frame is stamped.
  const dc = f - PL.contact;
  if (dc > -2 && dc < 7) {
    const b = ballAt(PL.contact);
    const toe = p[32];
    const cp: Pt = [b[0] - (PL.ball_r * W) * 0.85, (toe[1] + b[1]) / 2];
    const k = Math.max(0, dc + 2) / 9;
    ctx.save();
    ctx.strokeStyle = `rgba(175,80,255,${0.35 * (1 - k)})`;
    ctx.lineWidth = 1 * s;
    ctx.setLineDash([3 * s, 4 * s]);
    ctx.beginPath();
    ctx.moveTo(cp[0] - 140 * s, cp[1]);
    ctx.lineTo(cp[0] + 140 * s, cp[1]);
    ctx.moveTo(cp[0], cp[1] - 140 * s);
    ctx.lineTo(cp[0], cp[1] + 60 * s);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const off of [0, 0.33, 0.66]) {
      const t = (k + off) % 1;
      ctx.strokeStyle = `rgba(175,80,255,${0.9 * (1 - t)})`;
      ctx.lineWidth = 2.5 * s;
      ctx.beginPath();
      ctx.arc(cp[0], cp[1], (8 + t * 46) * s, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = VIOLET;
    ctx.shadowColor = VIOLET;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(cp[0], cp[1], 4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const lx = cp[0] + 58 * s;
    const ly = cp[1] + 46 * s;
    ctx.save();
    ctx.strokeStyle = "rgba(175,80,255,0.8)";
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(cp[0] + 4 * s, cp[1] + 4 * s);
    ctx.lineTo(lx - 10 * s, ly);
    ctx.lineTo(lx - 4 * s, ly);
    ctx.stroke();
    ctx.restore();
    label(ctx, "ТОЧКА КОНТАКТА", lx, ly, s, { size: 11, color: "#090909", bg: VIOLET });
    label(ctx, `кадр ${PL.contact} · ${(PL.contact / FPS).toFixed(3).replace(".", ",")} с`, lx, ly + 22 * s, s, { size: 10, color: "rgba(247,249,250,0.75)" });
  }
}

/** The hero's live analysis: a real (synthetic) kick played in slow motion with its measurements. */
export function HeroPanel() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const f = useRef(0);
  const [frameNo, setIdx] = useState(0);
  const idx = Number.isFinite(frameNo) ? Math.max(0, Math.min(N - 1, frameNo)) : 0;
  const [playing, setPlaying] = useState(true);
  const [key, setKey] = useState<Key>("knee");
  const [ghost, setGhost] = useState(true);
  const keyRef = useRef(key);
  const ghostRef = useRef(ghost);
  keyRef.current = key;
  ghostRef.current = ghost;

  const seek = useCallback((v: number) => {
    f.current = Number.isFinite(v) ? Math.max(0, Math.min(N - 1, v)) : 0;
    setIdx(Math.round(f.current));
    if (canvas.current) draw(canvas.current, f.current, keyRef.current, ghostRef.current);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPlaying(false);
      seek(PL.contact);
    }
  }, [seek]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    let raf = 0;
    let last = performance.now();
    let hold = 0;
    let wrap = false;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(c);
    const tick = (now: number) => {
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
      last = now;
      if (visible && playing) {
        if (hold > 0) {
          hold -= dt;
          if (hold <= 0 && wrap) {
            f.current = 0;
            wrap = false;
          }
        } else {
          // Half speed overall, a deep slow-motion around contact, a beat of stillness on it.
          const near = Math.abs(f.current - PL.contact) < 5;
          const before = f.current < PL.contact;
          f.current += dt * (near ? 7 : 30);
          if (before && f.current >= PL.contact) {
            f.current = PL.contact;
            hold = 0.9;
          }
          if (f.current >= N - 1) {
            f.current = N - 1;
            hold = 1.1;
            wrap = true;
          }
        }
        f.current = Math.max(0, Math.min(N - 1, f.current));
        const r = Math.round(f.current);
        setIdx((old) => (old === r ? old : r));
      }
      if (visible) draw(c, f.current, keyRef.current, ghostRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const ro = new ResizeObserver(() => draw(c, f.current, keyRef.current, ghostRef.current));
    ro.observe(c);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [playing]);

  const scrub = (e: PointerEvent<HTMLDivElement>) => {
    const r = track.current!.getBoundingClientRect();
    setPlaying(false);
    seek(((e.clientX - r.left) / r.width) * (N - 1));
  };

  const pct = (k: number) => `${(k / (N - 1)) * 100}%`;
  const at = (s: Record<Key, number[]>, k: Key) => s[k][PL.contact];
  const tab = TABS.find((t) => t.key === key)!;
  const diff = at(S_PL, key) - at(S_PRO, key);
  const phase = phaseOf(idx);

  return (
    <div className="frame overflow-hidden rounded-[19.2px] bg-[#0b0b0d]/90 backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-chalk/10 px-4 py-3">
        <span className="hud truncate text-[10px] uppercase tracking-[0.14em] text-chalk/60">KS_0230.MOV · данные позы · 60 к/с</span>
        <span className={clsx("hud shrink-0 rounded-[4px] px-2 py-1 text-[10px] uppercase tracking-[0.14em] transition-colors", phase === "контакт" ? "bg-violet text-night" : "bg-chalk/10 text-chalk/80")}>{phase}</span>
      </div>
      <div className="relative aspect-[4/3] bg-[radial-gradient(80%_80%_at_55%_30%,#17112a,#0b0b0d)] sm:aspect-[16/11]">
        <div className="grid-bg absolute inset-0 opacity-70 [mask-image:none]" />
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
        <button
          onClick={() => setGhost(!ghost)}
          className={clsx("hud absolute right-3 top-3 flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] uppercase tracking-[0.12em] transition", ghost ? "bg-chalk/15 text-chalk" : "bg-black/40 text-chalk/50")}
          aria-pressed={ghost}
        >
          <Ghost className="h-3 w-3" /> эталон
        </button>
      </div>
      <div className="hud flex items-center justify-between border-t border-chalk/10 px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-chalk/55">
        <span>
          F{String(idx).padStart(2, "0")} · 0:00.{String(Math.round((idx / FPS) * 1000)).padStart(3, "0")}
        </span>
        <span>{Math.round(S_PL.knee[idx])}° колено · {Math.round(S_PL.shank[idx])}°/с голень</span>
      </div>
      <div className="flex items-center gap-3 border-t border-chalk/10 px-3 py-2.5">
        <button onClick={() => setPlaying(!playing)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-chalk/25 text-chalk transition hover:bg-chalk hover:text-night" aria-label={playing ? "Пауза" : "Воспроизвести"}>
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <div
          ref={track}
          className="relative h-9 flex-1 cursor-pointer touch-none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            scrub(e);
          }}
          onPointerMove={(e) => e.buttons && scrub(e)}
          role="slider"
          aria-label="Кадр"
          aria-valuemin={0}
          aria-valuemax={N - 1}
          aria-valuenow={idx}
        >
          <span className="absolute inset-x-0 top-1/2 h-px bg-chalk/20" />
          <span className="absolute left-0 top-1/2 h-px bg-violet" style={{ width: pct(idx) }} />
          {[
            [PL.plant, "опора"],
            [PL.backswing, "замах"],
            [PL.contact, "контакт"],
          ].map(([k, l]) => (
            <span key={l} className="absolute top-1/2 -translate-x-1/2" style={{ left: pct(k as number) }}>
              <span className={clsx("block h-2.5 w-px -translate-y-1/2", l === "контакт" ? "bg-violet" : "bg-chalk/40")} />
            </span>
          ))}
          <span className="absolute top-1/2 h-4 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-violet shadow-[0_0_10px_rgba(175,80,255,0.8)]" style={{ left: pct(idx) }} />
        </div>
        <button
          onClick={() => {
            setPlaying(false);
            seek(PL.contact);
          }}
          className="hud h-9 shrink-0 rounded-md border border-chalk/25 px-3 text-[10px] uppercase tracking-[0.14em] text-chalk transition hover:border-violet hover:text-lavender"
        >
          контакт
        </button>
      </div>
      <div className="grid grid-cols-2 border-t border-chalk/10 sm:grid-cols-4">
        {TABS.map((t, k) => (
          <button
            key={t.key}
            onClick={() => setKey(t.key)}
            className={clsx(
              "relative border-chalk/10 px-4 py-3 text-left transition",
              k % 2 === 1 && "border-l",
              k >= 2 && "border-t sm:border-t-0",
              k === 2 && "sm:border-l",
              key === t.key ? "bg-violet/[0.12]" : "hover:bg-chalk/[0.04]",
            )}
          >
            {key === t.key && <span className="absolute inset-x-0 top-0 h-[2px] bg-violet" />}
            <span className={clsx("hud block text-[10px] uppercase tracking-[0.14em]", key === t.key ? "text-lavender" : "text-chalk/55")}>{t.label}</span>
            <span className="hud mt-1 block text-[20px] text-chalk">
              {fmt(t.key, S_PL[t.key][idx])}
              <span className="text-[13px] text-chalk/60">{t.unit}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="hud border-t border-chalk/10 px-4 py-3 text-[11px] text-chalk/60">
        в момент удара: <span className="text-chalk">{fmt(key, at(S_PL, key))}{tab.unit}</span> · эталон {fmt(key, at(S_PRO, key))}
        {tab.unit} · разница <span className={Math.abs(diff) > (key === "shank" ? 120 : 4) ? "text-coral" : "text-mint"}>{diff > 0 ? "+" : ""}{Math.round(diff)}{tab.unit}</span>
      </p>
    </div>
  );
}
