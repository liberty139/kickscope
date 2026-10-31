import { useEffect, useRef } from "react";
import kick from "../data/kick.json";
import { drawAngle, drawSkeleton, R, type Pt } from "../lib/skeleton";

type KickData = typeof kick.pro;

/** kick.json stores 17 of the 33 points; put them back at their MediaPipe indices. */
function expand(frame: number[][], W: number, H: number): Pt[] {
  const out: Pt[] = Array.from({ length: 33 }, () => [0, 0]);
  kick.points.forEach((idx, k) => (out[idx] = [frame[k][0] * W, frame[k][1] * H]));
  return out;
}

/** Bounding box of both kicks (normalised), so the camera frames the player instead of the whole field. */
const BOX = (() => {
  let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
  for (const d of [kick.pro, kick.player])
    for (const f of d.frames)
      for (const [x, y] of f) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  return { x0, x1, y0, y1 };
})();

function prepare(c: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = c.clientWidth;
  const H = c.clientHeight;
  if (c.width !== Math.round(W * dpr)) {
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
  }
  const ctx = c.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  // Zoom so the action fills the frame, a little higher than centre to leave room for the ground.
  const bw = (BOX.x1 - BOX.x0) * W;
  const bh = (BOX.y1 - BOX.y0) * H;
  const z = Math.min((W * 0.9) / bw, (H * 0.8) / bh);
  const cx = ((BOX.x0 + BOX.x1) / 2) * W;
  const cy = ((BOX.y0 + BOX.y1) / 2) * H;
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (W / 2 - cx * z), dpr * (H * 0.47 - cy * z));
  return { ctx, W, H, z };
}

function ball(ctx: CanvasRenderingContext2D, d: KickData, i: number, W: number, H: number, trail = true, z = 1) {
  const r = Math.max(5 / z, d.ball_r * W);
  if (trail && i > d.contact) {
    for (let k = 1; k <= 6; k++) {
      const j = i - k * 2;
      if (j <= d.contact) break;
      const [x, y] = d.ball[j];
      ctx.fillStyle = `rgba(198,255,61,${0.28 - k * 0.04})`;
      ctx.beginPath();
      ctx.arc(x * W, y * H, r * (1 - k * 0.09), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const [x, y] = d.ball[i];
  ctx.save();
  ctx.shadowColor = "rgba(244,247,242,0.7)";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#F4F7F2";
  ctx.beginPath();
  ctx.arc(x * W, y * H, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#08090A";
  ctx.beginPath();
  ctx.arc(x * W - r * 0.15, y * H - r * 0.1, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Hero loop: the clean synthetic kick in slow motion with live readouts.
 * `onFrame` lets the page update its HUD without re-rendering React every frame.
 */
export function HeroKick({ onFrame, className }: { onFrame?: (i: number, d: KickData) => void; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const d = kick.pro;
    const n = d.frames.length;
    let raf = 0;
    let visible = true;
    let t = 0;
    let last = performance.now();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(c);
    const render = (i: number) => {
      const { ctx, W, H, z } = prepare(c);
      const s = Math.max(0.55, W / 1000) / z;
      const p = expand(d.frames[i], W, H);
      drawSkeleton(ctx, p, "right", { color: "#3DF2FF", kick: "#C6FF3D", width: 5 * s, glow: 18 });
      drawAngle(ctx, p[R.hip], p[R.knee], p[R.ankle], "#C6FF3D", s * 1.1);
      ball(ctx, d, i, W, H, true, z);
      if (Math.abs(i - d.contact) <= 3) {
        const toe = p[R.foot];
        ctx.strokeStyle = `rgba(198,255,61,${1 - Math.abs(i - d.contact) / 4})`;
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.arc(toe[0], toe[1], (14 + Math.abs(i - d.contact) * 12) * s, 0, Math.PI * 2);
        ctx.stroke();
      }
      onFrame?.(i, d);
    };
    if (reduce) {
      render(d.contact);
      return () => io.disconnect();
    }
    // Slow motion with a short hold at contact and at the end, then loop.
    const timeline = (x: number) => {
      const play = n / 30; // seconds at half speed
      const hold = 0.45;
      if (x < (d.contact / n) * play) return Math.floor((x / play) * n);
      if (x < (d.contact / n) * play + hold) return d.contact;
      const y = x - hold;
      if (y < play) return Math.min(n - 1, Math.floor((y / play) * n));
      return y < play + 0.8 ? n - 1 : -1;
    };
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (visible) {
        t += dt;
        let i = timeline(t);
        if (i < 0) {
          t = 0;
          i = 0;
        }
        render(i);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [onFrame]);
  return <canvas ref={ref} className={className} />;
}

/** The player's kick over the reference ghost at a chosen frame (both are aligned at contact). */
export function GhostCompare({ frame, ghost, className }: { frame: number; ghost: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = () => {
      const c = ref.current;
      if (!c) return;
      const { ctx, W, H, z } = prepare(c);
      const s = Math.max(0.55, W / 900) / z;
      const pro = kick.pro;
      const pl = kick.player;
      const i = Math.min(frame, pl.frames.length - 1);
      const pp = expand(pl.frames[i], W, H);
      if (ghost) {
        const gp = expand(pro.frames[Math.min(frame, pro.frames.length - 1)], W, H);
        drawSkeleton(ctx, gp, "right", { color: "rgba(244,247,242,0.95)", width: 5 * s, alpha: 0.5, joints: false });
      }
      drawSkeleton(ctx, pp, "right", { color: "#3DF2FF", kick: "#C6FF3D", width: 5 * s, glow: 16 });
      ball(ctx, pl, i, W, H, false, z);
      // At contact, mark where each support foot stands.
      if (ghost && Math.abs(i - pl.contact) <= 6) {
        const gp = expand(pro.frames[pl.contact], W, H);
        const a = expand(pl.frames[pl.contact], W, H)[27];
        const b = gp[27];
        const y = Math.max(a[1], b[1]) + 18 * s;
        ctx.strokeStyle = "#FF5A4F";
        ctx.fillStyle = "#FF5A4F";
        ctx.lineWidth = 2.5 * s;
        ctx.beginPath();
        ctx.moveTo(a[0], y);
        ctx.lineTo(b[0], y);
        ctx.stroke();
        for (const x of [a[0], b[0]]) {
          ctx.beginPath();
          ctx.moveTo(x, y - 6 * s);
          ctx.lineTo(x, y + 6 * s);
          ctx.stroke();
        }
        ctx.font = `700 ${13 * s}px "JetBrains Mono", monospace`;
        ctx.textAlign = "center";
        ctx.fillText(`${Math.round(Math.abs(pl.metrics.plant_offset - pro.metrics.plant_offset))} см`, (a[0] + b[0]) / 2, y + 20 * s);
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [frame, ghost]);
  return <canvas ref={ref} className={className} />;
}

export { kick };
