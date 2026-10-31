import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import clsx from "clsx";
import { Camera, CameraOff, Loader2, RefreshCw, ScanLine, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Burst } from "../components/Motion";
import { Button, Card, Chip, Eyebrow, PageTitle } from "../components/ui";
import { api } from "../lib/api";
import { useLocal } from "../lib/me";
import { landmarker, toFrame, type Frame } from "../lib/pose";
import { angleAt, drawAngle, drawSkeleton, L, mid, R, toPx, type Pt } from "../lib/skeleton";

type Sample = { t: number; frame: Frame };
type Kick = { id: number; knee: number; speed: number; foot: "left" | "right"; samples: Sample[] };

const KICK_SPEED = 13; // torso lengths per second — walking stays well below, a kick goes far above
const BEFORE = 1.3;
const AFTER = 0.6;

/** Webcam mirror: live skeleton and knee angles; a fast foot swing is caught as a kick and can be analysed. */
export default function Live() {
  const navigate = useNavigate();
  const { me } = useLocal();
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const buffer = useRef<Sample[]>([]);
  const pending = useRef<{ at: number; knee: number; speed: number; foot: "left" | "right" } | null>(null);
  const cooldown = useRef(0);
  const [status, setStatus] = useState<"idle" | "starting" | "on" | "denied" | "error">("idle");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [knees, setKnees] = useState<{ left: number; right: number } | null>(null);
  const [kicks, setKicks] = useState<Kick[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  useEffect(() => stop, []);

  const start = async (face = facing) => {
    setStatus("starting");
    setError(null);
    stop();
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: face, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } }, audio: false });
      stream.current = s;
      const v = video.current!;
      v.srcObject = s;
      await v.play();
      const model = await landmarker("lite");
      setStatus("on");
      loop(model);
    } catch (e) {
      const name = (e as Error).name;
      setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
      setError((e as Error).message);
    }
  };

  const loop = (model: PoseLandmarker) => {
    const v = video.current;
    const c = canvas.current;
    if (!v || !c) return;
    let lastVideoTime = -1;
    let lastTs = 0;
    let lastUi = 0;
    const tick = () => {
      if (!stream.current) return;
      if (v.currentTime !== lastVideoTime && v.videoWidth) {
        lastVideoTime = v.currentTime;
        const now = performance.now();
        const ts = Math.max(lastTs + 1, Math.round(now));
        lastTs = ts;
        const frame = toFrame(model.detectForVideo(v, ts).landmarks[0]);
        const W = v.videoWidth;
        const H = v.videoHeight;
        if (c.width !== W) {
          c.width = W;
          c.height = H;
        }
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, W, H);
        if (frame) {
          buffer.current.push({ t: now / 1000, frame });
          while (buffer.current.length && buffer.current[0].t < now / 1000 - 4) buffer.current.shift();
          const p = toPx(frame, W, H);
          const s = W / 900;
          drawSkeleton(ctx, p, null, { color: "#E1BDFF", width: 5 * s, glow: 16 });
          const kl = drawAngle(ctx, p[L.hip], p[L.knee], p[L.ankle], "#AF50FF", s);
          const kr = drawAngle(ctx, p[R.hip], p[R.knee], p[R.ankle], "#AF50FF", s);
          if (now - lastUi > 120) {
            lastUi = now;
            setKnees({ left: kl, right: kr });
          }
          detect(now / 1000, W, H);
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /** Foot speed in torso lengths per second over the last few samples; a spike starts a kick capture. */
  const detect = (t: number, W: number, H: number) => {
    const b = buffer.current;
    if (b.length < 4) return;
    const a = b[b.length - 4];
    const z = b[b.length - 1];
    const dt = z.t - a.t;
    if (dt <= 0) return;
    const pz = toPx(z.frame, W, H);
    const pa = toPx(a.frame, W, H);
    const torso = Math.hypot(...(sub(mid(pz[11], pz[12]), mid(pz[23], pz[24])) as [number, number])) || 1;
    const speedOf = (i: number) => Math.hypot(pz[i][0] - pa[i][0], pz[i][1] - pa[i][1]) / torso / dt;
    const sl = speedOf(L.foot);
    const sr = speedOf(R.foot);
    const foot = sr >= sl ? "right" : "left";
    const sp = Math.max(sl, sr);
    const K = foot === "left" ? L : R;
    const knee = angleAt(pz[K.hip], pz[K.knee], pz[K.ankle]);
    const p = pending.current;
    if (p) {
      if (sp > p.speed && t - p.at < 0.25) pending.current = { at: t, knee, speed: sp, foot };
      if (t - p.at >= AFTER) {
        const samples = b.filter((s) => s.t >= p.at - BEFORE && s.t <= p.at + AFTER);
        setKicks((k) => [{ id: Date.now(), knee: p.knee, speed: p.speed, foot: p.foot, samples }, ...k].slice(0, 6));
        pending.current = null;
        cooldown.current = t + 1.2;
      }
    } else if (sp > KICK_SPEED && t > cooldown.current) {
      pending.current = { at: t, knee, speed: sp, foot };
    }
  };

  const analyse = async (k: Kick) => {
    setSending(true);
    setError(null);
    try {
      const { frames, fps } = resample(k.samples);
      const v = video.current!;
      const a = await api.createAttempt({ landmarks: frames, fps, width: v.videoWidth, height: v.videoHeight, foot: k.foot, player_id: me?.id ?? null, source: "live" });
      stop();
      navigate(`/result/${a.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const last = kicks[0];
  const mirror = facing === "user";

  return (
    <div>
      <PageTitle eyebrow="Зеркало" title="Скелет в реальном времени" lead="Встань в полный рост перед камерой и сделай удар по воздуху. Kickscope поймает момент, покажет угол колена и разберёт удар.">
        {status === "on" && (
          <Button
            variant="glass"
            onClick={() => {
              const f = facing === "user" ? "environment" : "user";
              setFacing(f);
              start(f);
            }}
          >
            <RefreshCw className="h-4 w-4" /> Сменить камеру
          </Button>
        )}
      </PageTitle>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card className="relative overflow-hidden p-0">
          <div className="relative aspect-video w-full bg-[radial-gradient(80%_70%_at_50%_10%,#17191c,#0a0b0c)]">
            <video ref={video} muted playsInline className={clsx("absolute inset-0 h-full w-full object-cover opacity-70", mirror && "-scale-x-100")} />
            <canvas ref={canvas} className={clsx("absolute inset-0 h-full w-full object-cover", mirror && "-scale-x-100")} />
            {status !== "on" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                {status === "starting" ? (
                  <>
                    <Loader2 className="h-10 w-10 animate-spin text-lime" />
                    <p className="mt-4 font-bold">Включаю камеру и модель…</p>
                  </>
                ) : status === "denied" ? (
                  <>
                    <CameraOff className="h-10 w-10 text-coral" />
                    <p className="mt-4 font-bold">Нет доступа к камере</p>
                    <p className="mt-1 max-w-sm text-sm text-fog">Разреши камеру для этого сайта в настройках браузера и попробуй ещё раз.</p>
                    <Button className="mt-5" onClick={() => start()}>
                      Попробовать снова
                    </Button>
                  </>
                ) : (
                  <>
                    <Camera className="h-10 w-10 text-lime" />
                    <p className="mt-4 font-display text-xl font-semibold">Камера выключена</p>
                    <p className="mt-1 max-w-sm text-sm text-fog">Видео никуда не отправляется: скелет считается прямо в браузере.</p>
                    <Button className="mt-5" size="lg" arrow onClick={() => start()}>
                      Включить зеркало
                    </Button>
                    {error && <p className="mt-3 text-sm text-coral">{error}</p>}
                  </>
                )}
              </div>
            )}
            {last && status === "on" && (
              <div key={last.id} className="pointer-events-none absolute inset-0 flex items-start justify-center pt-6">
                <div className="relative animate-pop rounded-2xl bg-lime px-5 py-3 text-night shadow-[0_0_40px_rgba(175,80,255,0.5)]">
                  <Burst />
                  <p className="font-display text-lg font-semibold">Удар! Колено {Math.round(last.knee)}°</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <Eyebrow>Колени сейчас</Eyebrow>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(["left", "right"] as const).map((s) => (
                <div key={s} className="rounded-2xl bg-night/50 p-4">
                  <p className="text-xs font-bold text-fog">{s === "left" ? "левое" : "правое"}</p>
                  <p className="hud mt-1 text-4xl font-bold text-lime">{knees ? Math.round(knees[s]) : "—"}°</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <Eyebrow>Пойманные удары</Eyebrow>
              <Chip>{kicks.length}</Chip>
            </div>
            {kicks.length === 0 ? (
              <p className="mt-3 text-sm text-fog">Сделай резкий удар по воздуху: замах назад и хлёст голенью вперёд.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {kicks.map((k, i) => (
                  <div key={k.id} className="flex items-center gap-3 rounded-2xl bg-night/50 p-3">
                    <Zap className={clsx("h-5 w-5", i === 0 ? "text-lime" : "text-fog")} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">
                        Колено {Math.round(k.knee)}° · {k.foot === "left" ? "левой" : "правой"}
                      </p>
                      <p className="text-xs text-fog">{k.samples.length} кадров</p>
                    </div>
                    <Button size="sm" busy={sending} onClick={() => analyse(k)}>
                      <ScanLine className="h-3.5 w-3.5" /> Разобрать
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {error && status === "on" && <p className="mt-3 text-sm text-coral">{error}</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}

const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];

/** Webcam samples arrive unevenly; resample to a steady rate for the analysis. */
function resample(samples: Sample[]): { frames: Frame[]; fps: number } {
  const dts = samples.slice(1).map((s, i) => s.t - samples[i].t).sort((a, b) => a - b);
  const median = dts[Math.floor(dts.length / 2)] || 1 / 30;
  const fps = Math.max(15, Math.min(60, Math.round(1 / median)));
  const t0 = samples[0].t;
  const t1 = samples[samples.length - 1].t;
  const frames: Frame[] = [];
  let j = 0;
  for (let t = t0; t <= t1; t += 1 / fps) {
    while (j < samples.length - 2 && samples[j + 1].t < t) j++;
    const a = samples[j];
    const b = samples[j + 1] ?? a;
    const w = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0;
    frames.push(a.frame.map((p, k) => p.map((v, d) => (d === 3 ? Math.min(v, b.frame[k][d]) : v + (b.frame[k][d] - v) * w))));
  }
  return { frames, fps };
}
