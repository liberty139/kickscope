import type { PoseLandmarker } from "@mediapipe/tasks-vision";

export type Model = "lite" | "full";

const cache = new Map<string, Promise<PoseLandmarker>>();

/**
 * MediaPipe PoseLandmarker from files served by our own origin (no CDN on stage).
 * The library is imported lazily so the landing never downloads it.
 */
export function landmarker(model: Model, mode: "VIDEO" | "IMAGE" = "VIDEO"): Promise<PoseLandmarker> {
  const key = `${model}:${mode}`;
  let p = cache.get(key);
  if (!p) {
    p = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const files = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      const options = (delegate: "GPU" | "CPU") => ({
        baseOptions: { modelAssetPath: `/models/pose_landmarker_${model}.task`, delegate },
        runningMode: mode,
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      try {
        return await PoseLandmarker.createFromOptions(files, options("GPU"));
      } catch {
        // Some phones and headless browsers have no usable WebGL.
        return await PoseLandmarker.createFromOptions(files, options("CPU"));
      }
    })();
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

export type Frame = number[][]; // 33 × [x, y, z, visibility], normalised to the image

export function toFrame(points: { x: number; y: number; z: number; visibility?: number }[] | undefined): Frame | null {
  if (!points || points.length < 33) return null;
  return points.slice(0, 33).map((p) => [round(p.x), round(p.y), round(p.z), round(p.visibility ?? 1)]);
}

const round = (v: number) => Math.round(v * 1e4) / 1e4;
