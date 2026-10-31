import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { toFrame, type Frame } from "./pose";

const COMMON_FPS = [24, 25, 30, 48, 50, 60, 90, 100, 120, 240];
export const MAX_FRAMES = 360;

type FrameMeta = { mediaTime: number };
type RVFC = (cb: (now: number, meta: FrameMeta) => void) => number;

const rvfc = (v: HTMLVideoElement): RVFC | null => {
  const f = (v as unknown as { requestVideoFrameCallback?: RVFC }).requestVideoFrameCallback;
  return f ? f.bind(v) : null;
};

/**
 * Frame rate from the gaps between decoded frames while the clip plays muted for a moment.
 * Returns null where the browser cannot tell (then the user picks it).
 */
export async function detectFps(video: HTMLVideoElement): Promise<number | null> {
  const req = rvfc(video);
  if (!req) return null;
  const times: number[] = [];
  const start = video.currentTime;
  video.muted = true;
  await new Promise<void>((resolve) => {
    const stop = setTimeout(resolve, 900);
    const tick = (_: number, meta: FrameMeta) => {
      times.push(meta.mediaTime);
      if (times.length >= 24) {
        clearTimeout(stop);
        resolve();
      } else req(tick);
    };
    req(tick);
    video.play().catch(() => resolve());
  });
  video.pause();
  video.currentTime = start;
  const gaps = times
    .slice(1)
    .map((t, i) => t - times[i])
    .filter((g) => g > 0.0005 && g < 0.2)
    .sort((a, b) => a - b);
  if (gaps.length < 3) return null;
  // The smallest steady gap is one frame; dropped frames only make some gaps longer.
  const one = gaps[Math.floor(gaps.length * 0.2)];
  const fps = 1 / one;
  return COMMON_FPS.reduce((best, f) => (Math.abs(f - fps) < Math.abs(best - fps) ? f : best), 30);
}

export function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const req = rvfc(video);
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    const timer = setTimeout(finish, 1500);
    video.addEventListener(
      "seeked",
      () => {
        // Wait until the new frame is actually presented, where the browser lets us know.
        if (req) req(() => (clearTimeout(timer), finish()));
        else (clearTimeout(timer), finish());
      },
      { once: true },
    );
    video.currentTime = time;
  });
}

export type Extracted = { frames: Frame[]; fps: number; stride: number; start: number; found: number };

/** Runs the pose model over [start, end] frame by frame. Frames without a person become invisible copies of the last one. */
export async function extractPoses(
  video: HTMLVideoElement,
  model: PoseLandmarker,
  opts: { start: number; end: number; fps: number; onProgress?: (done: number, total: number) => void; signal?: AbortSignal },
): Promise<Extracted> {
  const total = Math.max(1, Math.floor((opts.end - opts.start) * opts.fps));
  const stride = Math.max(1, Math.ceil(total / MAX_FRAMES));
  const frames: (Frame | null)[] = [];
  let ts = 0;
  for (let i = 0; i < total; i += stride) {
    if (opts.signal?.aborted) throw new DOMException("Отменено", "AbortError");
    await seek(video, opts.start + (i + 0.5) / opts.fps);
    ts += 1000 / (opts.fps / stride);
    const res = model.detectForVideo(video, Math.round(ts));
    frames.push(toFrame(res.landmarks[0]));
    opts.onProgress?.(Math.min(i + stride, total), total);
  }
  const found = frames.filter(Boolean).length;
  let last = frames.find(Boolean) ?? null;
  const filled = frames.map((f) => {
    if (f) {
      last = f;
      return f;
    }
    return last ? last.map(([x, y, z]) => [x, y, z, 0]) : null;
  });
  if (!last || found < frames.length * 0.6) {
    throw new Error("Не нашёл игрока на большей части кадров. Снимите сбоку, чтобы игрок и мяч были целиком в кадре, при хорошем свете.");
  }
  return { frames: filled as Frame[], fps: opts.fps / stride, stride, start: opts.start, found };
}
