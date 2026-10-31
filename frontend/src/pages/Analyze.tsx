import clsx from "clsx";
import { Camera, CircleDot, Film, Loader2, RotateCcw, ShieldCheck, Upload, X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Chip, Eyebrow, PageTitle } from "../components/ui";
import { api, type Ball } from "../lib/api";
import { local, useLocal } from "../lib/me";
import { landmarker } from "../lib/pose";
import { session } from "../lib/session";
import { detectFps, extractPoses, MAX_FRAMES, seek } from "../lib/video";

type Meta = { duration: number; w: number; h: number };
type Stage = "idle" | "model" | "frames" | "server";

const FPS_OPTIONS = [30, 60, 120, 240];
const STAGE_TEXT: Record<Stage, string> = {
  idle: "",
  model: "Загружаю модель скелета…",
  frames: "Ищу скелет кадр за кадром…",
  server: "Считаю углы и сравниваю с эталоном…",
};

export default function Analyze() {
  const { me } = useLocal();
  const navigate = useNavigate();
  const video = useRef<HTMLVideoElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [fps, setFps] = useState<number>(60);
  const [fpsAuto, setFpsAuto] = useState<boolean | null>(null);
  const [range, setRange] = useState<[number, number]>([0, 0]);
  const [foot, setFoot] = useState<"auto" | "left" | "right">("auto");
  const [ball, setBall] = useState<Ball | null>(null);
  const [height, setHeight] = useState("");
  const [nick, setNick] = useState(me?.nickname ?? "");
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const pick = (f: File | undefined) => {
    if (!f) return;
    setUrl(URL.createObjectURL(f));
    setName(f.name);
    setMeta(null);
    setBall(null);
    setError(null);
    setFpsAuto(null);
  };

  const onMeta = async () => {
    const v = video.current;
    if (!v) return;
    const m = { duration: v.duration, w: v.videoWidth, h: v.videoHeight };
    setMeta(m);
    setRange([0, Math.min(m.duration, 3)]);
    const detected = await detectFps(v);
    if (detected) setFps(detected);
    setFpsAuto(!!detected);
    await seek(v, 0.02);
  };

  const frames = Math.floor((range[1] - range[0]) * fps);
  const used = Math.min(frames, MAX_FRAMES);

  const run = async () => {
    const v = video.current;
    if (!v || !meta || !url) return;
    setError(null);
    const ac = new AbortController();
    abort.current = ac;
    try {
      setStage("model");
      const model = await landmarker("full");
      setStage("frames");
      setProgress(0);
      const ex = await extractPoses(v, model, { start: range[0], end: range[1], fps, onProgress: (d, t) => setProgress(d / t), signal: ac.signal });
      setStage("server");
      let playerId = me?.id ?? null;
      if (!playerId && nick.trim()) {
        const p = await api.createPlayer(nick.trim());
        local.setMe({ id: p.id, nickname: p.nickname, team_code: p.team_code });
        playerId = p.id;
      }
      const a = await api.createAttempt({
        landmarks: ex.frames,
        fps: ex.fps,
        width: meta.w,
        height: meta.h,
        ball,
        foot,
        height_cm: height ? Number(height) : null,
        player_id: playerId,
        source: "upload",
      });
      session.put(a.id, { url, start: range[0] + 0.5 / fps, frameTime: ex.stride / fps });
      navigate(`/result/${a.id}`);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setStage("idle");
    }
  };

  return (
    <div>
      <PageTitle
        eyebrow="Разбор удара"
        title="Загрузи видео удара"
        lead="Скелет ищется прямо в браузере: видео не покидает твоё устройство, на сервер уходят только координаты точек."
      />

      {!url ? (
        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <Card className="p-6 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-lime/40 bg-lime/5 px-6 py-10 text-center transition hover:border-lime hover:bg-lime/10">
                <Upload className="h-9 w-9 text-lime" />
                <span className="mt-3 font-display text-lg font-semibold">Выбрать видео</span>
                <span className="mt-1 text-sm text-fog">MP4, MOV, WebM</span>
                <input type="file" accept="video/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
              </label>
              <label className="group flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-line bg-white/3 px-6 py-10 text-center transition hover:bg-white/6">
                <Camera className="h-9 w-9 text-cyan" />
                <span className="mt-3 font-display text-lg font-semibold">Снять сейчас</span>
                <span className="mt-1 text-sm text-fog">на телефоне откроется камера</span>
                <input type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-fog">
              <span>Нет видео под рукой?</span>
              <Link to="/demo" className="font-bold text-lime hover:underline">
                Открыть демо-разбор
              </Link>
              <span>·</span>
              <Link to="/live" className="font-bold text-cyan hover:underline">
                Зеркало с веб-камерой
              </Link>
            </div>
          </Card>
          <HowToFilm />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <Card className="p-3 sm:p-4">
            <div className="relative overflow-hidden rounded-[18px] bg-black">
              <video ref={video} src={url} muted playsInline preload="auto" onLoadedMetadata={onMeta} className="block max-h-[62vh] w-full object-contain" />
              {meta && <BallMarker meta={meta} ball={ball} onBall={setBall} disabled={stage !== "idle"} />}
              {stage !== "idle" && <Processing stage={stage} progress={progress} onCancel={() => abort.current?.abort()} />}
            </div>
            {meta && (
              <div className="mt-4 px-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold">Отрезок с ударом</span>
                  <span className="hud text-fog">
                    {range[0].toFixed(2).replace(".", ",")}–{range[1].toFixed(2).replace(".", ",")} с · {frames} кадров
                  </span>
                </div>
                <RangePicker
                  duration={meta.duration}
                  value={range}
                  onChange={(r, moved) => {
                    setRange(r);
                    if (video.current) video.current.currentTime = r[moved];
                  }}
                  onRelease={() => video.current && seek(video.current, range[0] + 0.02)}
                />
                <p className="mt-2 text-xs text-fog">
                  Возьми 1,5–3 секунды: от последних шагов разбега до конца удара. Начало — когда мяч ещё лежит: на этом кадре его удобно отметить.
                </p>
              </div>
            )}
          </Card>

          <div className="space-y-5">
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="flex min-w-0 items-center gap-2 font-bold">
                  <Film className="h-4 w-4 shrink-0 text-lime" /> <span className="truncate">{name}</span>
                </p>
                <button onClick={() => setUrl(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 hover:bg-white/10" aria-label="Другое видео">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <Field label="Мяч">
                {ball ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone="lime">
                      <CircleDot className="h-3.5 w-3.5" /> отмечен {ball.r ? "· с размером" : "· без размера"}
                    </Chip>
                    <button onClick={() => setBall(null)} className="text-xs font-bold text-fog hover:text-chalk">
                      <RotateCcw className="mr-1 inline h-3.5 w-3.5" />
                      сбросить
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-fog">Нажми на центр мяча на кадре и протяни до края. Так точнее момент удара и сантиметры.</p>
                )}
              </Field>

              <Field label="Бьющая нога">
                <Segmented value={foot} onChange={setFoot} options={[["auto", "Сам найду"], ["right", "Правая"], ["left", "Левая"]]} />
              </Field>

              <Field label={`Кадров в секунду${fpsAuto === true ? " · определено" : fpsAuto === false ? " · укажи сам" : ""}`}>
                <Segmented value={fps} onChange={setFps} options={FPS_OPTIONS.map((f) => [f, String(f)] as [number, string])} />
                {fpsAuto === true && !FPS_OPTIONS.includes(fps) && <p className="mt-2 text-xs text-fog">Определено: {fps} к/с</p>}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                {!me && (
                  <Field label="Ник (для прогресса)">
                    <input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="например, Арсен" className="h-11 w-full rounded-xl border border-line bg-night/60 px-3 text-base outline-none focus:border-lime" />
                  </Field>
                )}
                <Field label="Рост, см (если без мяча)">
                  <input value={height} onChange={(e) => setHeight(e.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" placeholder="170" className="h-11 w-full rounded-xl border border-line bg-night/60 px-3 text-base outline-none focus:border-lime" />
                </Field>
              </div>

              {error && <p className="mt-4 rounded-xl bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}

              <Button className="mt-5 w-full" size="lg" arrow busy={stage !== "idle"} disabled={!meta || frames < 20} onClick={run}>
                Разобрать удар
              </Button>
              <p className="mt-3 text-center text-xs text-fog">
                Обработаем {used} кадров{frames > MAX_FRAMES ? ` (каждый ${Math.ceil(frames / MAX_FRAMES)}-й)` : ""} · обычно 10–30 секунд
              </p>
            </Card>
            <p className="flex items-start gap-2 px-2 text-xs text-fog">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint" /> Видео не загружается на сервер. Мы не ставим диагнозов: показываем технику и считаем только то, что можно измерить.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-fog">{label}</p>
      {children}
    </div>
  );
}

function Segmented<T extends string | number>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex gap-1 rounded-full bg-night/60 p-1">
      {options.map(([v, label]) => (
        <button key={String(v)} onClick={() => onChange(v)} className={clsx("h-9 flex-1 rounded-full text-sm font-bold transition", value === v ? "bg-lime text-night" : "text-chalk/70 hover:text-chalk")}>
          {label}
        </button>
      ))}
    </div>
  );
}

function RangePicker({ duration, value, onChange, onRelease }: { duration: number; value: [number, number]; onChange: (v: [number, number], moved: 0 | 1) => void; onRelease: () => void }) {
  const [a, b] = value;
  const pct = (t: number) => (t / duration) * 100;
  return (
    <div className="relative mt-3 h-10">
      <div className="absolute inset-x-0 top-[18px] h-1 rounded-full bg-white/10" />
      <div className="absolute top-[16px] h-2 rounded-full bg-lime/70" style={{ left: `${pct(a)}%`, width: `${pct(b - a)}%` }} />
      {([0, 1] as const).map((k) => (
        <input
          key={k}
          type="range"
          min={0}
          max={duration}
          step={0.01}
          value={value[k]}
          onPointerUp={onRelease}
          onChange={(e) => {
            const t = Number(e.target.value);
            const next: [number, number] = k === 0 ? [Math.min(t, b - 0.4), b] : [a, Math.max(t, a + 0.4)];
            onChange([Math.max(0, next[0]), Math.min(duration, next[1])], k);
          }}
          className="range-thin pointer-events-none absolute inset-x-0 top-2 w-full [&::-moz-range-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:pointer-events-auto"
          aria-label={k === 0 ? "Начало отрезка" : "Конец отрезка"}
        />
      ))}
    </div>
  );
}

/** Tap the ball centre, drag to its edge. Coordinates are normalised to the video frame (r to its width). */
function BallMarker({ meta, ball, onBall, disabled }: { meta: Meta; ball: Ball | null; onBall: (b: Ball | null) => void; disabled: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  // The video is object-contain inside its box; find the drawn frame rectangle.
  const rect = () => {
    const el = box.current!.getBoundingClientRect();
    const scale = Math.min(el.width / meta.w, el.height / meta.h);
    const w = meta.w * scale;
    const h = meta.h * scale;
    return { left: el.left + (el.width - w) / 2, top: el.top + (el.height - h) / 2, w, h, ox: (el.width - w) / 2, oy: (el.height - h) / 2 };
  };
  const at = (e: RPointerEvent) => {
    const r = rect();
    return { x: (e.clientX - r.left) / r.w, y: (e.clientY - r.top) / r.h };
  };
  const [frame, setFrame] = useState({ ox: 0, oy: 0, w: 0, h: 0 });
  useEffect(() => {
    const update = () => box.current && setFrame(rect());
    update();
    const ro = new ResizeObserver(update);
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta]);
  return (
    <div
      ref={box}
      className={clsx("absolute inset-0 touch-none", disabled ? "pointer-events-none" : "cursor-crosshair")}
      onPointerDown={(e) => {
        const p = at(e);
        if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return;
        drag.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        onBall({ x: p.x, y: p.y, r: null });
      }}
      onPointerMove={(e) => {
        if (!drag.current || !ball) return;
        const p = at(e);
        const r = Math.hypot((p.x - ball.x) * meta.w, (p.y - ball.y) * meta.h) / meta.w;
        onBall({ ...ball, r: r > 0.004 ? r : null });
      }}
      onPointerUp={() => (drag.current = false)}
    >
      {ball && (
        <div
          className="pointer-events-none absolute rounded-full border-2 border-lime bg-lime/15 shadow-[0_0_18px_rgba(175,80,255,0.6)]"
          style={{
            left: frame.ox + ball.x * frame.w,
            top: frame.oy + ball.y * frame.h,
            width: Math.max(14, 2 * (ball.r ?? 0) * frame.w),
            height: Math.max(14, 2 * (ball.r ?? 0) * frame.w),
            transform: "translate(-50%, -50%)",
          }}
        />
      )}
      {!ball && !disabled && (
        <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-night/80 px-3 py-1.5 text-xs font-bold text-lime">
          Отметь мяч: нажми на центр и протяни до края
        </span>
      )}
    </div>
  );
}

function Processing({ stage, progress, onCancel }: { stage: Stage; progress: number; onCancel: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-night/75 p-6 text-center backdrop-blur-sm">
      <div className="scan-line absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-lime/20 to-transparent" />
      <Loader2 className="h-10 w-10 animate-spin text-lime" />
      <p className="mt-4 font-display text-lg font-semibold">{STAGE_TEXT[stage]}</p>
      {stage === "frames" && (
        <div className="mt-4 h-2 w-64 max-w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-lime transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      <button onClick={onCancel} className="mt-5 text-sm font-bold text-fog hover:text-chalk">
        Отменить
      </button>
    </div>
  );
}

function HowToFilm() {
  return (
    <Card className="p-6">
      <Eyebrow>Как снимать</Eyebrow>
      <svg viewBox="0 0 320 150" className="mt-4 w-full" aria-hidden>
        <line x1="10" y1="120" x2="310" y2="120" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
        <g stroke="#E1BDFF" strokeWidth="4" strokeLinecap="round" fill="none">
          <circle cx="205" cy="36" r="8" />
          <path d="M205 44v34M205 52l-14 12M205 52l16 6M205 78l-10 22-4 20M205 78l20 14 12 18" />
        </g>
        <circle cx="248" cy="112" r="8" fill="#F4F7F2" />
        <g transform="translate(40 70)">
          <rect x="0" y="0" width="34" height="22" rx="5" fill="#AF50FF" />
          <circle cx="17" cy="11" r="6" fill="#08090A" />
          <path d="M17 22v28M7 50h20" stroke="#AF50FF" strokeWidth="3" />
        </g>
        <path d="M80 72 L190 60" stroke="#AF50FF" strokeDasharray="4 6" strokeWidth="2" />
        <text x="118" y="58" fill="#AF50FF" fontSize="12" fontFamily="JetBrains Mono" fontWeight="700">4–6 м</text>
      </svg>
      <ul className="mt-4 space-y-2 text-sm text-chalk/85">
        {[
          "Сбоку от линии удара, камера на уровне пояса, телефон горизонтально",
          "Игрок и мяч целиком в кадре, один человек в кадре",
          "Замедленная съёмка 120–240 к/с — точнее всего (подойдёт и 60)",
          "Телефон неподвижен: штатив, рюкзак или друг",
        ].map((t) => (
          <li key={t} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
            {t}
          </li>
        ))}
      </ul>
    </Card>
  );
}
