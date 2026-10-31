/** MediaPipe pose indices, bones and drawing for skeletons and the reference ghost. */

export const L = { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27, heel: 29, foot: 31 } as const;
export const R = { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28, heel: 30, foot: 32 } as const;

const PAIRS: [number, number][] = [
  [1, 4], [2, 5], [3, 6], [7, 8], [9, 10], [11, 12], [13, 14], [15, 16], [17, 18], [19, 20], [21, 22], [23, 24], [25, 26], [27, 28], [29, 30], [31, 32],
];

const BODY: [number, number][] = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [12, 14], [14, 16],
];
const LEG = (s: typeof L | typeof R): [number, number][] => [
  [s.hip, s.knee], [s.knee, s.ankle], [s.ankle, s.heel], [s.heel, s.foot], [s.ankle, s.foot],
];

export type Pt = [number, number];

export function swapSides<T>(points: T[]): T[] {
  const out = points.slice();
  for (const [a, b] of PAIRS) [out[a], out[b]] = [points[b], points[a]];
  return out;
}

export const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

export function angleAt(a: Pt, b: Pt, c: Pt): number {
  const u = [a[0] - b[0], a[1] - b[1]];
  const v = [c[0] - b[0], c[1] - b[1]];
  const cos = (u[0] * v[0] + u[1] * v[1]) / Math.max(Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]), 1e-9);
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

/** Image-normalised landmarks → pixel points in a canvas of size w × h. */
export const toPx = (frame: number[][], w: number, h: number): Pt[] => frame.map((p) => [p[0] * w, p[1] * h]);

export function torsoLength(frames: Pt[][]): number {
  const lens = frames.map((p) => Math.hypot(...(sub(mid(p[11], p[12]), mid(p[23], p[24])) as [number, number]))).sort((a, b) => a - b);
  return lens[Math.floor(lens.length / 2)] || 1;
}

const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];

/** A reference frame (pelvis-centred, torso units, facing +x, right-footed) placed onto the kicker. */
export function placeGhost(ref: number[][], kickerFrame: Pt[], torso: number, opts: { mirrored: boolean; swap: boolean }): Pt[] {
  const pts = opts.swap ? swapSides(ref) : ref;
  const hip = mid(kickerFrame[23], kickerFrame[24]);
  const sx = opts.mirrored ? -1 : 1;
  return pts.map((p) => [hip[0] + sx * p[0] * torso, hip[1] + p[1] * torso]);
}

export type DrawStyle = { color: string; kick?: string; width: number; glow?: number; alpha?: number; joints?: boolean };

export function drawSkeleton(ctx: CanvasRenderingContext2D, p: Pt[], kickSide: "left" | "right" | null, s: DrawStyle) {
  ctx.save();
  ctx.globalAlpha = s.alpha ?? 1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowBlur = s.glow ?? 0;
  const kickLeg = kickSide === "left" ? LEG(L) : kickSide === "right" ? LEG(R) : [];
  const other = kickSide === "left" ? LEG(R) : kickSide === "right" ? LEG(L) : [...LEG(L), ...LEG(R)];
  const stroke = (bones: [number, number][], color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (const [a, b] of bones) {
      ctx.moveTo(p[a][0], p[a][1]);
      ctx.lineTo(p[b][0], p[b][1]);
    }
    ctx.stroke();
  };
  stroke(BODY, s.color, s.width);
  stroke(other, s.color, s.width);
  if (kickLeg.length) stroke(kickLeg, s.kick ?? s.color, s.width * 1.15);
  // Neck and head.
  const sh = mid(p[11], p[12]);
  ctx.strokeStyle = s.color;
  ctx.shadowColor = s.color;
  ctx.lineWidth = s.width;
  ctx.beginPath();
  ctx.moveTo(sh[0], sh[1]);
  ctx.lineTo(p[0][0], p[0][1]);
  ctx.stroke();
  const head = Math.max(6, Math.hypot(p[11][0] - p[23][0], p[11][1] - p[23][1]) * 0.17);
  ctx.beginPath();
  ctx.arc(p[0][0], p[0][1], head, 0, Math.PI * 2);
  ctx.stroke();
  if (s.joints !== false) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#08090A";
    for (const i of [11, 12, 13, 14, 23, 24, 25, 26, 27, 28]) {
      ctx.beginPath();
      ctx.arc(p[i][0], p[i][1], s.width * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = s.width * 0.55;
      ctx.strokeStyle = (kickSide === "left" && [25, 27, 23].includes(i)) || (kickSide === "right" && [26, 28, 24].includes(i)) ? (s.kick ?? s.color) : s.color;
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Arc and label for the knee angle at joint b. */
export function drawAngle(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, c: Pt, color: string, scale = 1) {
  const deg = angleAt(a, b, c);
  const r = 26 * scale;
  const t1 = Math.atan2(a[1] - b[1], a[0] - b[0]);
  const t2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
  let d = t2 - t1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5 * scale;
  ctx.beginPath();
  ctx.arc(b[0], b[1], r, t1, t1 + d, d < 0);
  ctx.stroke();
  const tm = t1 + d / 2;
  const lx = b[0] - Math.cos(tm) * (r + 30 * scale);
  const ly = b[1] - Math.sin(tm) * (r + 18 * scale);
  ctx.font = `700 ${14 * scale}px "JetBrains Mono", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const text = `${Math.round(deg)}°`;
  const w = ctx.measureText(text).width + 12 * scale;
  ctx.fillStyle = "rgba(10,15,28,0.85)";
  ctx.beginPath();
  ctx.roundRect(lx - w / 2, ly - 11 * scale, w, 22 * scale, 8 * scale);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(text, lx, ly + 1);
  ctx.restore();
  return deg;
}
