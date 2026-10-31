// Copies the MediaPipe wasm runtime into public/ and downloads the pose models,
// so the app never depends on a CDN on stage. `--wasm-only` skips the downloads.
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wasmSrc = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const wasmDst = join(root, "public", "mediapipe", "wasm");

if (existsSync(wasmSrc)) {
  mkdirSync(wasmDst, { recursive: true });
  for (const f of readdirSync(wasmSrc)) copyFileSync(join(wasmSrc, f), join(wasmDst, f));
  console.log(`mediapipe wasm → public/mediapipe/wasm (${readdirSync(wasmDst).length} files)`);
}

if (process.argv.includes("--wasm-only")) process.exit(0);

const BASE = "https://storage.googleapis.com/mediapipe-models/pose_landmarker";
const models = ["pose_landmarker_lite", "pose_landmarker_full"];
const dst = join(root, "public", "models");
mkdirSync(dst, { recursive: true });
for (const name of models) {
  const file = join(dst, `${name}.task`);
  if (existsSync(file) && statSync(file).size > 1_000_000) {
    console.log(`${name}.task already here`);
    continue;
  }
  const res = await fetch(`${BASE}/${name}/float16/latest/${name}.task`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  console.log(`${name}.task ${(statSync(file).size / 1e6).toFixed(1)} MB`);
}
