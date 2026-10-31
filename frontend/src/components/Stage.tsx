import clsx from "clsx";
import { ChevronLeft, ChevronRight, Crosshair, Ghost, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Analysis, Reference } from "../lib/api";
import type { LocalClip } from "../lib/session";
import { drawAngle, drawSkeleton, L, placeGhost, R, toPx, torsoLength, type Pt } from "../lib/skeleton";

const SPEEDS = [0.25, 0.5, 1];

type Props = {
  analysis: Analysis;
  landmarks: number[][][];
  reference?: Reference | null;
  ghostFrames?: number[];
  ghostSwap?: boolean;
  clip?: LocalClip | null;
  onSetContact?: (frame: number) => void;
  busy?: boolean;
};

const PHASE_MARKS = [
  { key: "backswing", label: "Замах" },
  { key: "plant", label: "Опора" },
  { key: "contact", label: "Удар" },
  { key: "follow", label: "Сопровождение" },
] as const;

/** Plays a kick: the skeleton over the original clip (when this tab still has it) or over a night pitch, with the reference ghost. */
export function Stage({ analysis, landmarks, reference, ghostFrames, ghostSwap, clip, onSetContact, busy }: Props) {
  const n = landmarks.length;
  const ph = analysis.phases;
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [frame, setFrame] = useState(Math.max(0, ph.contact - Math.round(analysis.fps * 0.35)));
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(analysis.fps >= 100 ? 1 : 0.5);
  const [ghost, setGhost] = useState(true);
  const [size, setSize] = useState({ w: 640, h: 360 });
  const frameRef = useRef(frame);
  frameRef.current = frame;

  const aspect = analysis.width / analysis.height;
  const kick = analysis.kick_foot;
  const K = kick === "left" ? L : R;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const torso = useMemo(() => torsoLength(landmarks.map((f) => toPx(f, size.w, size.h))), [landmarks, size]);
  const groundY = useMemo(() => {
    let y = 0;
    for (const f of landmarks) for (const i of [29, 30, 31, 32]) y = Math.max(y, f[i][1]);
    return y;
  }, [landmarks]);
  // Without the video, frame the player instead of the whole picture.
  const bounds = useMemo(() => {
    let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
    for (const f of landmarks)
      for (const i of [0, 11, 12, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]) {
        x0 = Math.min(x0, f[i][0]);
        x1 = Math.max(x1, f[i][0]);
        y0 = Math.min(y0, f[i][1]);
        y1 = Math.max(y1, f[i][1]);
      }
    return { x0, x1, y0, y1 };
  }, [landmarks]);

  const draw = useCallback(
    (i: number) => {
      const c = canvas.current;
      if (!c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = size.w;
      const H = size.h;
      if (c.width !== Math.round(W * dpr)) {
        c.width = Math.round(W * dpr);
        c.height = Math.round(H * dpr);
      }
      const ctx = c.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      let z = 1;
      if (!clip) {
        const bw = Math.max(0.05, bounds.x1 - bounds.x0) * W;
        const bh = Math.max(0.05, bounds.y1 - bounds.y0) * H;
        z = Math.max(1, Math.min((W * 0.86) / bw, (H * 0.8) / bh, 3));
        const cx = ((bounds.x0 + bounds.x1) / 2) * W;
        const cy = ((bounds.y0 + bounds.y1) / 2) * H;
        ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (W / 2 - cx * z), dpr * (H * 0.48 - cy * z));
      }
      const s = Math.max(0.6, W / 900) / z;
      if (!clip) {
        // Night pitch: ground line, faint perspective stripes.
        const g = ctx.createLinearGradient(0, groundY * H, 0, H);
        g.addColorStop(0, "rgba(15,59,46,0.55)");
        g.addColorStop(1, "rgba(15,59,46,0.05)");
        ctx.fillStyle = g;
        ctx.fillRect(-W, groundY * H, W * 3, H);
        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.lineWidth = 1.5 / z;
        ctx.beginPath();
        ctx.moveTo(-W, groundY * H + 2 / z);
        ctx.lineTo(W * 2, groundY * H + 2 / z);
        ctx.stroke();
      }
      const p: Pt[] = toPx(landmarks[i], W, H);
      if (ghost && reference && ghostFrames) {
        const j = ghostFrames[Math.min(i, ghostFrames.length - 1)];
        const gp = placeGhost(reference.frames[j], p, torso, { mirrored: analysis.mirrored, swap: !!ghostSwap });
        drawSkeleton(ctx, gp, kick, { color: "rgba(244,247,242,0.9)", width: 4 * s, alpha: 0.5, joints: false });
      }
      const b = analysis.ball;
      if (b && i <= ph.contact + 1) {
        ctx.save();
        ctx.fillStyle = "rgba(244,247,242,0.18)";
        ctx.strokeStyle = "rgba(244,247,242,0.9)";
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.arc(b.x * W, b.y * H, Math.max(4 / z, (b.r ?? 0.012) * W), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      drawSkeleton(ctx, p, kick, { color: "#3DF2FF", kick: "#C6FF3D", width: 4 * s, glow: 14 });
      drawAngle(ctx, p[K.hip], p[K.knee], p[K.ankle], "#C6FF3D", s);
      if (Math.abs(i - ph.contact) <= 2) {
        const t = p[K.foot];
        ctx.save();
        ctx.strokeStyle = "rgba(198,255,61,0.9)";
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.arc(t[0], t[1], (16 + Math.abs(i - ph.contact) * 10) * s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    },
    [size, clip, groundY, bounds, landmarks, ghost, reference, ghostFrames, torso, analysis, ghostSwap, kick, K, ph.contact],
  );

  // Playback clock: the video when we have it, otherwise frames per second × speed.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = frameRef.current;
    const v = video.current;
    if (clip && v) {
      v.playbackRate = speed;
      if (playing) v.play().catch(() => setPlaying(false));
      else v.pause();
    }
    const tick = (now: number) => {
      if (playing) {
        if (clip && v) {
          let i = Math.round((v.currentTime - clip.start) / clip.frameTime);
          if (i >= n - 1 || i < 0) {
            v.currentTime = clip.start;
            i = 0;
          }
          if (i !== frameRef.current) setFrame(i);
        } else {
          acc += ((now - last) / 1000) * analysis.fps * speed;
          if (acc >= n) acc = 0;
          const i = Math.floor(acc);
          if (i !== frameRef.current) setFrame(i);
        }
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, clip, n, analysis.fps]);

  useEffect(() => draw(frame), [draw, frame]);

  const goto = (i: number) => {
    const k = Math.max(0, Math.min(n - 1, i));
    setPlaying(false);
    setFrame(k);
    if (clip && video.current) video.current.currentTime = clip.start + k * clip.frameTime + 1e-3;
  };

  const ms = Math.round(((frame - ph.contact) / analysis.fps) * 1000);
  const phase = frame < ph.backswing ? "Разбег" : frame < ph.contact ? "Замах и удар" : frame <= ph.follow ? "Сопровождение" : "После удара";

  return (
    <div>
      <div className="relative overflow-hidden rounded-[22px] border border-line bg-[radial-gradient(80%_70%_at_50%_10%,#17191c,#0a0b0c)]">
        <div ref={box} className="relative w-full" style={{ aspectRatio: String(aspect) }}>
          {clip && <video ref={video} src={clip.url} muted playsInline className="absolute inset-0 h-full w-full object-fill opacity-80" />}
          <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
        </div>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="hud rounded-lg bg-night/80 px-2.5 py-1 text-xs font-bold text-chalk">{phase}</span>
          <span className={clsx("hud rounded-lg px-2.5 py-1 text-xs font-bold", Math.abs(ms) < 20 ? "bg-lime text-night" : "bg-night/80 text-fog")}>
            {ms === 0 ? "контакт" : `${ms > 0 ? "+" : "−"}${Math.abs(ms)} мс`}
          </span>
        </div>
        {reference && (
          <div className="pointer-events-none absolute right-3 top-3 hidden items-center gap-3 rounded-lg bg-night/80 px-2.5 py-1 text-[11px] font-bold sm:flex">
            <span className="flex items-center gap-1.5 text-cyan">
              <span className="h-0.5 w-4 rounded bg-cyan" /> ты
            </span>
            <span className="flex items-center gap-1.5 text-chalk/70">
              <span className="h-0.5 w-4 rounded bg-chalk/70" /> эталон
            </span>
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="relative h-8">
          <input
            type="range"
            min={0}
            max={n - 1}
            value={frame}
            onChange={(e) => goto(Number(e.target.value))}
            className="range-thin absolute inset-x-0 top-3 w-full"
            aria-label="Кадр"
          />
          {PHASE_MARKS.map((m) => (
            <button
              key={m.key}
              onClick={() => goto(ph[m.key])}
              className="group absolute top-0 -translate-x-1/2"
              style={{ left: `${(ph[m.key] / Math.max(1, n - 1)) * 100}%` }}
              title={m.label}
            >
              <span className={clsx("block h-2.5 w-0.5 rounded", m.key === "contact" ? "bg-lime" : "bg-chalk/40")} />
            </button>
          ))}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <button onClick={() => setPlaying(!playing)} className="flex h-11 w-11 items-center justify-center rounded-full bg-lime text-night" aria-label={playing ? "Пауза" : "Играть"}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button onClick={() => goto(frame - 1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 hover:bg-white/10" aria-label="Кадр назад">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => goto(frame + 1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 hover:bg-white/10" aria-label="Кадр вперёд">
            <ChevronRight className="h-5 w-5" />
          </button>
          <button onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])} className="hud h-11 rounded-full bg-white/5 px-4 text-sm font-bold hover:bg-white/10">
            {speed}×
          </button>
          <button onClick={() => goto(ph.contact)} className="h-11 rounded-full bg-white/5 px-4 text-sm font-bold hover:bg-white/10">
            Удар
          </button>
          {reference && (
            <button
              onClick={() => setGhost(!ghost)}
              className={clsx("flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition", ghost ? "bg-chalk text-night" : "bg-white/5 text-chalk hover:bg-white/10")}
            >
              <Ghost className="h-4 w-4" /> Призрак
            </button>
          )}
          {onSetContact && frame !== ph.contact && (
            <button onClick={() => onSetContact(frame)} disabled={busy} className="ml-auto flex h-11 items-center gap-2 rounded-full bg-white/5 px-4 text-sm font-bold text-amber hover:bg-white/10 disabled:opacity-50">
              <Crosshair className="h-4 w-4" /> Удар здесь
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
