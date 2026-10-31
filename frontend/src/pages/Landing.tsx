import clsx from "clsx";
import { ArrowRight, BrainCircuit, Camera, Check, ChevronRight, Cpu, Ghost, Lock, Menu, Plus, ScanLine, ShieldCheck, Sigma, Smartphone, Sparkles, Users, Waypoints, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { LineChart } from "../components/Charts";
import { GhostCompare, kick } from "../components/KickScene";
import { Logo, LogoMark } from "../components/Logo";
import { CountUp, Reveal, ScrollText, Spot, Typewriter, Words } from "../components/Motion";
import { AppWindow, KinematicsChart, MetricArt } from "../components/Showcase";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(scrollY > 12);
    on();
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);
  const links = [
    ["#product", "Продукт"],
    ["#method", "Метод"],
    ["#coach", "Тренерам"],
    ["#roadmap", "Дорожная карта"],
    ["#faq", "Вопросы"],
  ];
  return (
    <header className={clsx("fixed inset-x-0 top-0 z-40 border-b transition-colors duration-300", scrolled || open ? "border-white/8 bg-night/75 backdrop-blur-xl" : "border-transparent")}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" aria-label="Kickscope">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map(([h, l]) => (
            <a key={h} href={h} className="rounded-md px-3 py-1.5 text-[13px] text-fog transition hover:text-chalk">
              {l}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/live" className="hidden h-8 items-center rounded-lg px-3 text-[13px] text-fog transition hover:text-chalk sm:inline-flex">
            Зеркало
          </Link>
          <Link to="/analyze" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-chalk px-3 text-[13px] font-semibold text-night shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition hover:bg-white">
            Разобрать удар
          </Link>
          <button className="flex h-9 w-9 items-center justify-center rounded-lg text-fog md:hidden" onClick={() => setOpen(!open)} aria-label="Меню">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="animate-rise border-t border-white/6 px-5 pb-5 pt-2 md:hidden">
          {[...links, ["/live", "Зеркало"]].map(([h, l]) => (
            <a key={h} href={h} onClick={() => setOpen(false)} className="block border-b border-white/6 py-3 text-[15px] text-chalk/85">
              {l}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}

/** The product window lies tilted back on the page and stands up as you scroll. */
function useTilt() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced()) {
      el.style.transform = "none";
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const p = Math.min(1, Math.max(0, scrollY / (innerHeight * 0.6)));
      const e = 1 - Math.pow(1 - p, 2);
      el.style.transform = `perspective(2200px) rotateX(${22 * (1 - e)}deg) scale(${0.94 + 0.06 * e})`;
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", on, { passive: true });
    return () => {
      removeEventListener("scroll", on);
      cancelAnimationFrame(raf);
    };
  }, []);
  return ref;
}

function Hero() {
  const tilt = useTilt();
  return (
    <section className="relative overflow-hidden px-5 pb-10 pt-32 md:pt-40">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="grid-bg absolute inset-0" />
        <div className="aurora absolute left-1/2 top-[-280px] h-[620px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(198,255,61,0.13),transparent)] blur-2xl" />
        <div className="aurora absolute left-[20%] top-[120px] h-[400px] w-[500px] rounded-full bg-[radial-gradient(closest-side,rgba(61,242,255,0.08),transparent)] blur-2xl [animation-delay:-6s]" />
      </div>
      <div className="relative mx-auto max-w-6xl text-center">
        <Link
          to="/live"
          className="word-in group mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3 text-[13px] text-fog shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-white/20 hover:text-chalk"
        >
          <span className="rounded-full bg-lime/12 px-2 py-0.5 text-[11px] font-semibold text-lime">Новое</span>
          Зеркало<span className="hidden sm:inline">: разбор удара по веб-камере</span>
          <span className="sm:hidden">по веб-камере</span>
          <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </Link>
        <h1 className="mx-auto mt-8 max-w-5xl font-display text-[clamp(44px,8vw,96px)] font-semibold leading-[0.98] tracking-[-0.045em]">
          <span className="block">
            <Words text="Рентген удара" className="text-grad pb-[0.08em]" step={90} />
          </span>
          <span className="block">
            <Words text="в твоём телефоне" delay={220} className="text-grad pb-[0.08em]" step={90} />
          </span>
        </h1>
        <p className="word-in mx-auto mt-7 max-w-2xl text-[17px] leading-relaxed text-fog md:text-xl" style={{ animationDelay: "450ms" }}>
          Компьютерное зрение строит скелет игрока, математика меряет углы и скорости, эталон показывает разницу. Биомеханическая лаборатория, которая помещается в карман.
        </p>
        <div className="word-in mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "600ms" }}>
          <Link to="/analyze" className="group inline-flex h-12 items-center gap-2 rounded-xl bg-chalk px-6 text-[15px] font-semibold text-night shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_10px_30px_-10px_rgba(255,255,255,0.35)] transition hover:bg-white">
            Разобрать мой удар <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <Link to="/demo" className="group inline-flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 text-[15px] font-semibold text-chalk transition hover:bg-white/[0.07]">
            Смотреть демо-разбор <ChevronRight className="h-4 w-4 text-fog transition group-hover:translate-x-0.5" />
          </Link>
        </div>
        <p className="word-in mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-dim" style={{ animationDelay: "700ms" }}>
          {["Видео не покидает телефон", "Без датчиков и маркеров", "Без регистрации"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-lime/80" /> {t}
            </span>
          ))}
        </p>
      </div>

      <div className="relative mx-auto mt-16 max-w-6xl md:mt-20">
        <div aria-hidden className="absolute inset-x-[8%] -top-10 h-56 rounded-full bg-[radial-gradient(closest-side,rgba(198,255,61,0.18),transparent)] blur-3xl" />
        <div ref={tilt} className="word-in relative origin-top will-change-transform" style={{ animationDelay: "800ms", transform: "perspective(2200px) rotateX(22deg) scale(0.94)" }}>
          <div className="beam-border rounded-2xl">
            <AppWindow />
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-2 h-20 bg-gradient-to-b from-transparent to-night" />
      </div>
      <p className="relative mt-2 text-center text-xs text-dim">Интерфейс на синтетическом эталонном ударе модели</p>
    </section>
  );
}

const STATS = [
  { value: 33, suffix: "", label: "точки тела на каждом кадре" },
  { value: 240, suffix: " к/с", label: "замедленная съёмка телефона" },
  { value: 6, suffix: "", label: "биомеханических показателей" },
  { value: 0, suffix: "", label: "датчиков, маркеров и студий" },
];

function Stats() {
  return (
    <section className="px-5 py-10">
      <div className="mx-auto grid max-w-6xl grid-cols-2 border-y border-white/6 md:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 80} className={clsx("px-4 py-8 md:px-8", i % 2 && "border-l border-white/6", i >= 2 && "border-t border-white/6 md:border-t-0", i === 2 && "md:border-l")}>
            <p className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
              <CountUp to={s.value} suffix={s.suffix} />
            </p>
            <p className="mt-2 text-sm text-fog">{s.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Statement() {
  return (
    <section className="px-5 py-24 md:py-36">
      <div className="mx-auto max-w-5xl">
        <ScrollText
          className="font-display text-[clamp(28px,4.4vw,54px)] font-medium leading-[1.12] tracking-[-0.035em]"
          text="Удар длится 0,2 секунды. Глаз тренера видит, куда полетел мяч. *Kickscope видит, почему: угол колена в момент касания, наклон корпуса, место опорной ноги и порядок, в котором бедро передаёт энергию голени."
        />
      </div>
    </section>
  );
}

function FeatureHead({ id, n, label, title, text }: { id?: string; n: string; label: string; title: ReactNode; text: ReactNode }) {
  return (
    <Reveal className="mb-12 md:mb-16">
      <div id={id} className="scroll-mt-28">
        <p className="hud flex items-center gap-2 text-[13px] text-fog">
          <span className="text-lime">{n}</span> {label} <ChevronRight className="h-3.5 w-3.5" />
        </p>
        <div className="mt-6 grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-end md:gap-16">
          <h2 className="text-grad font-display text-[clamp(32px,4.6vw,56px)] font-semibold leading-[1.04] tracking-[-0.04em]">{title}</h2>
          <p className="max-w-md text-[17px] leading-relaxed text-fog">{text}</p>
        </div>
      </div>
    </Reveal>
  );
}

function Block({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={clsx("px-5 py-20 md:py-28", className)}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

const PIPE = [
  { icon: Smartphone, step: "Видео", text: "Телефон сбоку, 60–240 к/с, 2 секунды удара", where: "телефон" },
  { icon: ScanLine, step: "Поза", text: "MediaPipe находит 33 точки тела на каждом кадре", where: "браузер" },
  { icon: Waypoints, step: "Фазы", text: "Разбег, опора, замах, контакт, сопровождение", where: "сервер" },
  { icon: Sigma, step: "Биомеханика", text: "Углы через векторы суставов, ω = dθ/dt", where: "сервер" },
  { icon: BrainCircuit, step: "Эталон и совет", text: "DTW выравнивает удар по времени с эталоном", where: "сервер" },
];

function Pipeline() {
  return (
    <Block>
      <FeatureHead
        id="product"
        n="1.0"
        label="Конвейер"
        title={<>От пикселей до совета тренера за 20 секунд</>}
        text="Нейросеть отвечает только за то, где находятся суставы. Всё остальное считает формула, и каждое число можно проверить на кадре."
      />
      <Reveal>
        <div className="relative grid gap-3 lg:grid-cols-5">
          <div aria-hidden className="absolute left-[10%] right-[10%] top-[52px] hidden h-px overflow-hidden bg-white/8 lg:block">
            <span className="flow absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-lime to-transparent" />
          </div>
          {PIPE.map(({ icon: Icon, step, text, where }, i) => (
            <Spot key={step} className="card relative p-5 transition hover:border-white/15">
              <div className="flex items-center justify-between">
                <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-panel text-chalk shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="hud text-[11px] text-dim">0{i + 1}</span>
              </div>
              <p className="mt-6 font-semibold tracking-tight">{step}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-fog">{text}</p>
              <span className={clsx("hud mt-4 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px]", where === "сервер" ? "bg-cyan/10 text-cyan" : "bg-lime/10 text-lime")}>
                {where === "сервер" ? <Cpu className="h-3 w-3" /> : <Lock className="h-3 w-3" />} {where}
              </span>
            </Spot>
          ))}
        </div>
      </Reveal>
    </Block>
  );
}

function Kinematics() {
  return (
    <Block>
      <FeatureHead
        id="method"
        n="2.0"
        label="Кинематика"
        title={<>Каждый кадр превращается в график</>}
        text="Угол колена и угловая скорость голени по всему удару. Проведи по графику: видно, как нога взводится в замахе и выстреливает к контакту."
      />
      <Reveal>
        <Spot className="frame rounded-2xl p-5 md:p-8">
          <KinematicsChart />
        </Spot>
      </Reveal>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          ["Угол сустава", "θ = arccos( u·v / |u||v| )", "между векторами бедро → колено и колено → голеностоп"],
          ["Угловая скорость", "ω = dθ / dt,  Δt = 1 / f", "производная по сглаженному ряду, f — частота кадров"],
          ["Масштаб в метрах", "м/пкс = 0,22 м / диаметр мяча", "калибровка по мячу 5 размера или по росту игрока"],
        ].map(([t, f, d], i) => (
          <Reveal key={t} delay={i * 90}>
            <div className="card h-full p-5">
              <p className="text-sm text-fog">{t}</p>
              <p className="hud mt-3 text-[15px] text-chalk">{f}</p>
              <p className="mt-3 text-[13px] leading-relaxed text-dim">{d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Block>
  );
}

function GhostSection() {
  const n = kick.player.frames.length;
  const [frame, setFrame] = useState(kick.player.contact);
  const [ghost, setGhost] = useState(true);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto || reduced()) return;
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % (n + 30);
      setFrame(Math.min(i, n - 1));
    }, 50);
    return () => clearInterval(t);
  }, [auto, n]);
  const pm = kick.player.metrics;
  const rm = kick.pro.metrics;
  const rows = [
    { label: "Опорная нога у мяча", you: `${Math.round(Math.abs(pm.plant_offset))} см`, ref: `${Math.round(Math.abs(rm.plant_offset))} см`, bad: true },
    { label: "Наклон корпуса", you: `${Math.round(pm.trunk_lean)}°`, ref: `+${Math.round(rm.trunk_lean)}°`, bad: true },
    { label: "Сгибание в замахе", you: `${Math.round(pm.backswing_knee)}°`, ref: `${Math.round(rm.backswing_knee)}°`, bad: true },
    { label: "Колено в момент удара", you: `${Math.round(pm.knee_contact)}°`, ref: `${Math.round(rm.knee_contact)}°`, bad: false },
  ];
  return (
    <Block>
      <FeatureHead
        n="3.0"
        label="Призрак эталона"
        title={
          <>
            Твой удар и эталон <br className="hidden md:block" />в одном кадре
          </>
        }
        text="DTW выравнивает два удара по времени, даже если ты бьёшь медленнее. Белый скелет — эталон, голубой — ты. Разница видна сразу."
      />
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Reveal>
          <div className="frame overflow-hidden rounded-2xl">
            <div className="flex h-10 items-center justify-between border-b border-white/6 px-4 text-xs">
              <span className="text-fog">
                Тимур <span className="text-dim">vs</span> Эталон
              </span>
              <span className="flex gap-3">
                <span className="flex items-center gap-1.5 text-cyan">
                  <span className="h-0.5 w-4 rounded bg-cyan" /> игрок
                </span>
                <span className="flex items-center gap-1.5 text-chalk/70">
                  <span className="h-0.5 w-4 rounded bg-chalk/70" /> эталон
                </span>
              </span>
            </div>
            <div className="relative aspect-video bg-[radial-gradient(90%_90%_at_50%_10%,#17191c,#0a0b0c)]">
              <div className="grid-bg absolute inset-0 opacity-50 [mask-image:none]" />
              <div className="absolute inset-x-0 bottom-0 h-[16%] bg-gradient-to-b from-transparent to-turf/70" />
              <GhostCompare frame={frame} ghost={ghost} className="absolute inset-0 h-full w-full" />
            </div>
            <div className="flex items-center gap-3 border-t border-white/6 px-4 py-3">
              <button onClick={() => setGhost(!ghost)} className={clsx("flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition", ghost ? "bg-chalk text-night" : "border border-white/10 text-fog")}>
                <Ghost className="h-3.5 w-3.5" /> Призрак
              </button>
              <input
                type="range"
                min={0}
                max={n - 1}
                value={frame}
                onChange={(e) => {
                  setAuto(false);
                  setFrame(Number(e.target.value));
                }}
                onPointerDown={() => setAuto(false)}
                className="range-thin w-full"
                aria-label="Момент удара"
              />
              <button onClick={() => (setAuto(false), setFrame(kick.player.contact))} className="h-8 shrink-0 rounded-lg border border-white/10 px-3 text-[13px] font-semibold text-fog transition hover:text-chalk">
                Контакт
              </button>
            </div>
          </div>
        </Reveal>
        <Reveal delay={120} className="flex flex-col gap-3">
          <div className="card divide-y divide-white/6">
            <div className="flex justify-between px-5 py-3 text-[11px] uppercase tracking-wider text-dim">
              <span>Показатель</span>
              <span>игрок / эталон</span>
            </div>
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <span className="flex items-center gap-2.5 text-[15px]">
                  <span className={clsx("h-1.5 w-1.5 rounded-full", r.bad ? "bg-coral" : "bg-mint")} /> {r.label}
                </span>
                <span className="hud text-right text-sm">
                  <span className={r.bad ? "text-coral" : "text-mint"}>{r.you}</span> <span className="text-dim">/ {r.ref}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="card flex-1 p-5">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-lime">
              <Sparkles className="h-3.5 w-3.5" /> Совет
            </p>
            <p className="mt-3 leading-relaxed text-chalk/85">Опорная нога стоит на 30 см позади точки удара — ты тянешься к мячу. Поставь фишку сбоку от мяча и 15 раз подряд ставь стопу точно к ней.</p>
          </div>
          <p className="px-1 text-xs text-dim">Пример на синтетических данных модели.</p>
        </Reveal>
      </div>
    </Block>
  );
}

const METRICS = [
  { kind: "knee", title: "Колено в момент удара", text: "Согнутая нога «тычет» мячом, прямая бьёт жёстко и неточно.", value: kick.pro.metrics.knee_contact, unit: "°" },
  { kind: "trunk", title: "Наклон корпуса", text: "Корпус назад — мяч уходит в небо. Над мячом — летит низом.", value: kick.pro.metrics.trunk_lean, unit: "°", decimals: 1 },
  { kind: "plant", title: "Опорная нога у мяча", text: "В сантиметрах от точки удара. Главная ошибка юниоров.", value: Math.abs(kick.pro.metrics.plant_offset), unit: " см" },
  { kind: "shank", title: "Скорость голени", text: "Главный источник силы удара, в градусах в секунду.", value: kick.pro.metrics.shank_speed, unit: "°/с" },
  { kind: "chain", title: "Бедро → голень", text: "Пики скорости идут по цепочке. Разрыв — потеря мощности.", value: kick.pro.metrics.chain_lag, unit: " мс" },
  { kind: "backswing", title: "Глубина замаха", text: "Насколько «взведена» нога перед ударом.", value: kick.pro.metrics.backswing_knee, unit: "°" },
] as const;

function Metrics() {
  return (
    <Block>
      <FeatureHead
        n="4.0"
        label="Показатели"
        title={<>Шесть чисел, которые тренер видит только в замедленной съёмке</>}
        text="Каждый показатель открывается на конкретном кадре и сравнивается с разбросом эталона. Значения ниже — эталонный удар модели."
      />
      <div className="grid gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/8 sm:grid-cols-2 lg:grid-cols-3">
        {METRICS.map((m, i) => (
          <Reveal key={m.title} delay={(i % 3) * 90} className="bg-night">
            <Spot className="h-full bg-white/[0.015] p-6 transition hover:bg-white/[0.03]">
              <div className="flex items-start justify-between">
                <p className="font-semibold tracking-tight">{m.title}</p>
                <span className="hud text-lg text-lime">
                  <CountUp to={m.value} decimals={"decimals" in m ? m.decimals : 0} suffix={m.unit} />
                </span>
              </div>
              <div className="my-4 rounded-xl border border-white/6 bg-black/30">
                <MetricArt kind={m.kind} />
              </div>
              <p className="text-sm leading-relaxed text-fog">{m.text}</p>
            </Spot>
          </Reveal>
        ))}
      </div>
    </Block>
  );
}

function Advice() {
  const pm = kick.player.metrics;
  const rm = kick.pro.metrics;
  const input = [
    ["plant_offset", `${pm.plant_offset.toFixed(1)} см`, `${rm.plant_offset.toFixed(1)}`],
    ["trunk_lean", `${pm.trunk_lean.toFixed(1)}°`, `+${rm.trunk_lean.toFixed(1)}`],
    ["backswing_knee", `${pm.backswing_knee.toFixed(1)}°`, `${rm.backswing_knee.toFixed(1)}`],
    ["knee_contact", `${pm.knee_contact.toFixed(1)}°`, `${rm.knee_contact.toFixed(1)}`],
    ["shank_speed", `${Math.round(pm.shank_speed)}°/с`, `${Math.round(rm.shank_speed)}`],
  ];
  return (
    <Block>
      <FeatureHead
        n="5.0"
        label="Совет"
        title={<>ИИ получает числа, а не видео. И не может их выдумать</>}
        text="Языковая модель пишет два предложения: что не так и какое упражнение сделать. Каждое число в тексте сверяется с измерениями. Не совпало — берём проверенный шаблон."
      />
      <Reveal>
        <div className="frame grid overflow-hidden rounded-2xl md:grid-cols-[1fr_auto_1.15fr]">
          <div className="p-6">
            <p className="hud text-[11px] uppercase tracking-wider text-dim">вход · только измерения</p>
            <div className="hud mt-4 space-y-2 text-[13px]">
              {input.map(([k, v, r]) => (
                <p key={k} className="flex justify-between gap-4">
                  <span className="text-cyan/90">{k}</span>
                  <span>
                    <span className="text-chalk">{v}</span> <span className="text-dim">эталон {r}</span>
                  </span>
                </p>
              ))}
            </div>
          </div>
          <div className="relative hidden w-px bg-white/8 md:block">
            <span className="flow-y absolute inset-x-0 h-1/4 bg-gradient-to-b from-transparent via-lime to-transparent" />
          </div>
          <div className="border-t border-white/8 p-6 md:border-t-0">
            <p className="hud flex items-center gap-2 text-[11px] uppercase tracking-wider text-lime">
              <Sparkles className="h-3.5 w-3.5" /> совет тренера
            </p>
            <p className="mt-4 min-h-[96px] text-lg leading-relaxed text-chalk">
              <Typewriter text="Опорная нога стоит на 30 см позади точки удара — ты тянешься к мячу и заваливаешь корпус назад. Поставь фишку сбоку от мяча и 15 раз подряд ставь стопу точно к ней." />
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="flex items-center gap-1.5 rounded-md bg-mint/10 px-2 py-1 text-mint">
                <Check className="h-3.5 w-3.5" /> 30 см есть в измерениях
              </span>
              <span className="flex items-center gap-1.5 rounded-md bg-mint/10 px-2 py-1 text-mint">
                <Check className="h-3.5 w-3.5" /> упражнение из базы тренеров
              </span>
            </div>
          </div>
        </div>
      </Reveal>
    </Block>
  );
}

function Coach() {
  const roster = [
    ["Алихан", 84, [62, 70, 74, 80, 84], ["good", "good", "warn", "good", "good", "good"]],
    ["Тимур", 78, [46, 52, 61, 71, 78], ["good", "warn", "bad", "good", "good", "good"]],
    ["Айгерим", 77, [70, 69, 73, 75, 77], ["good", "good", "good", "warn", "good", "good"]],
    ["Даня", 70, [58, 64, 61, 66, 70], ["good", "good", "good", "good", "good", "bad"]],
    ["Арсен", 66, [50, 55, 60, 63, 66], ["warn", "good", "bad", "good", "warn", "good"]],
  ] as const;
  const color = { good: "bg-mint", warn: "bg-amber", bad: "bg-coral" };
  const spark = (v: readonly number[]) => v.map((y, i) => `${i ? "L" : "M"}${i * 15},${24 - ((y - 40) / 50) * 22}`).join(" ");
  return (
    <Block>
      <FeatureHead
        id="coach"
        n="6.0"
        label="Кабинет тренера"
        title={<>Вся команда на одном экране</>}
        text="Игроки входят по QR-коду, без аккаунтов и фамилий. Тренер видит, какие ошибки повторяются у группы, и строит тренировку под них."
      />
      <Reveal>
        <div className="frame overflow-hidden rounded-2xl">
          <div className="flex h-11 items-center gap-3 border-b border-white/6 px-4">
            <LogoMark size={20} />
            <span className="text-[13px] font-semibold">U15 · Академия</span>
            <span className="hud rounded-md border border-white/8 px-1.5 py-0.5 text-[10px] text-lime">K7Q2X</span>
            <span className="ml-auto hidden text-xs text-fog sm:block">5 игроков · 38 попыток · 5 недель</span>
          </div>
          <div className="grid lg:grid-cols-[1.5fr_1fr]">
            <div className="overflow-x-auto p-2">
              <table className="w-full min-w-[460px] text-left text-[13px]">
                <thead className="text-[11px] text-dim">
                  <tr>
                    <th className="px-3 py-2 font-medium">Игрок</th>
                    <th className="px-3 py-2 font-medium">Тренд</th>
                    <th className="px-3 py-2 font-medium">Показатели</th>
                    <th className="px-3 py-2 text-right font-medium">Оценка</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map(([name, score, trend, st]) => (
                    <tr key={name} className="border-t border-white/[0.05] transition hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-2.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.07] text-[11px] font-semibold">{name[0]}</span>
                          {name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <svg viewBox="0 0 60 26" className="h-6 w-16" aria-hidden>
                          <path d={spark(trend)} fill="none" stroke="#2BD67B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="flex gap-1">
                          {st.map((s, i) => (
                            <span key={i} className={clsx("h-2 w-2 rounded-full", color[s])} />
                          ))}
                        </span>
                      </td>
                      <td className="hud px-3 py-2.5 text-right text-chalk">{score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 border-t border-white/6 p-4 lg:border-l lg:border-t-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-dim">Частые ошибки группы</p>
              {[
                { n: "3 из 5", t: "ставят опорную ногу далеко позади мяча", w: "60%", c: "bg-coral", tc: "text-coral" },
                { n: "2 из 5", t: "заваливают корпус назад в момент удара", w: "40%", c: "bg-amber", tc: "text-amber" },
                { n: "1 из 5", t: "разгибают колено раньше бедра", w: "20%", c: "bg-amber", tc: "text-amber" },
              ].map((x) => (
                <div key={x.t} className="rounded-xl border border-white/6 bg-white/[0.02] p-3.5">
                  <p className={clsx("hud text-xs", x.tc)}>{x.n}</p>
                  <p className="mt-1 text-[13px] text-chalk/85">{x.t}</p>
                  <div className="mt-2.5 h-1 rounded-full bg-white/6">
                    <div className={clsx("h-full rounded-full", x.c)} style={{ width: x.w }} />
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-3 rounded-xl border border-lime/15 bg-lime/[0.04] p-3.5">
                <Users className="h-5 w-5 shrink-0 text-lime" />
                <p className="text-[13px] text-chalk/80">
                  Растут <b className="font-semibold text-chalk">5 из 5</b> игроков за 5 недель
                </p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link to="/team/DEMO1" className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold transition hover:bg-white/[0.07]">
          Открыть демо-команду <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/team" className="inline-flex h-10 items-center gap-1 rounded-[10px] px-3 text-sm font-semibold text-fog transition hover:text-chalk">
          Создать свою команду <ChevronRight className="h-4 w-4" />
        </Link>
        <span className="text-xs text-dim">Иллюстрация интерфейса.</span>
      </div>
    </Block>
  );
}

function Progress() {
  return (
    <Block>
      <FeatureHead n="7.0" label="Прогресс" title={<>Один разбор — это тест. Разбор каждую неделю — это рост</>} text="Каждая попытка ложится во временной ряд. Видно, какой показатель тянет оценку вниз и как он меняется от недели к неделе." />
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Reveal>
          <Spot className="card h-full p-6">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Опорная нога у мяча, см</p>
              <span className="rounded-md bg-mint/10 px-2 py-1 text-xs font-semibold text-mint">ближе к эталону</span>
            </div>
            <LineChart className="mt-6" values={[-34, -27, -21, -14, -9]} band={[-11, -5]} height={150} color="#2BD67B" labels={["нед 1", "нед 2", "нед 3", "нед 4", "нед 5"]} />
            <p className="mt-3 text-xs text-dim">Демо-игрок: +6 см в неделю. Зелёная полоса — разброс эталона.</p>
          </Spot>
        </Reveal>
        <div className="grid gap-3">
          {[
            [32, "+", "балла оценки за 5 недель у демо-игрока"],
            [25, "", "сантиметров ближе к мячу стала опорная нога"],
            [5, "", "недель, чтобы закрепить новую технику"],
          ].map(([v, pre, t], i) => (
            <Reveal key={t as string} delay={i * 90}>
              <div className="card flex items-center gap-5 p-5">
                <span className="font-display w-24 text-4xl font-semibold tracking-tight text-lime">
                  {pre}
                  <CountUp to={v as number} />
                </span>
                <span className="text-sm text-fog">{t}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Block>
  );
}

function Mirror() {
  return (
    <Block className="py-10 md:py-12">
      <Reveal>
        <div className="frame relative overflow-hidden rounded-3xl p-8 md:p-14">
          <div aria-hidden className="absolute -left-20 -top-32 h-96 w-96 rounded-full bg-[radial-gradient(closest-side,rgba(61,242,255,0.16),transparent)] blur-2xl" />
          <div aria-hidden className="dots-bg absolute inset-y-0 right-0 w-1/2 opacity-40 [mask-image:linear-gradient(90deg,transparent,#000)]" />
          <div className="relative grid items-center gap-10 md:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="hud flex items-center gap-2 text-[13px] text-cyan">
                <Camera className="h-4 w-4" /> Зеркало
              </p>
              <h3 className="text-grad mt-5 font-display text-3xl font-semibold leading-[1.08] tracking-[-0.035em] md:text-5xl">Встань перед камерой и ударь по воздуху</h3>
              <p className="mt-5 max-w-lg text-fog">Скелет и угол колена в реальном времени. Kickscope сам поймает момент удара и разберёт его прямо на сцене, без мяча и без видео.</p>
              <Link to="/live" className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-cyan px-5 text-sm font-semibold text-night shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_10px_30px_-10px_rgba(61,242,255,0.6)] transition hover:brightness-110">
                Включить зеркало <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative mx-auto aspect-square w-56 md:w-64">
              <div className="absolute inset-0 rounded-full border border-cyan/25" />
              <div className="absolute inset-8 rounded-full border border-cyan/15" />
              <div className="absolute inset-16 rounded-full border border-cyan/10" />
              <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full animate-float" aria-hidden>
                <g stroke="#3DF2FF" strokeWidth="4" strokeLinecap="round" fill="none" style={{ filter: "drop-shadow(0 0 6px #3DF2FF)" }}>
                  <circle cx="58" cy="26" r="7" />
                  <path d="M58 33v28M58 40l-14 10M58 40l15 6M58 61l-9 18-2 20" />
                </g>
                <path d="M58 61l18 10 16 4" stroke="#C6FF3D" strokeWidth="4.5" strokeLinecap="round" fill="none" style={{ filter: "drop-shadow(0 0 6px #C6FF3D)" }} />
                <text x="78" y="64" fill="#C6FF3D" fontSize="9" fontFamily="JetBrains Mono" fontWeight="700">
                  162°
                </text>
              </svg>
            </div>
          </div>
        </div>
      </Reveal>
    </Block>
  );
}

const ROADMAP = [
  { status: "Готово", tone: "text-mint", dot: "bg-mint", items: ["Поза в браузере, 33 точки", "Фазы удара и 6 показателей", "DTW-сравнение с эталоном", "Совет с проверкой чисел", "Кабинет игрока и тренера", "Зеркало по веб-камере"] },
  { status: "В работе", tone: "text-lime", dot: "bg-lime", items: ["Трекинг мяча и его скорость", "Гомография: поправка на ракурс камеры", "Эталоны от тренеров академий"] },
  { status: "Исследуем", tone: "text-cyan", dot: "bg-cyan", items: ["Восстановление скрытых суставов", "Группировка ошибок в команде", "Регрессия «техника → скорость мяча»", "Пас, штрафной, пенальти"] },
];

function Roadmap() {
  return (
    <Block>
      <FeatureHead id="roadmap" n="8.0" label="Дорожная карта" title={<>От удара к лаборатории для всей академии</>} text="Мы честно делим то, что работает сегодня, и то, над чем работаем. Ядро уже в продукте, дальше — мяч, ракурс и аналитика команды." />
      <div className="grid gap-3 md:grid-cols-3">
        {ROADMAP.map((col, k) => (
          <Reveal key={col.status} delay={k * 100}>
            <Spot className="card h-full p-6">
              <p className={clsx("flex items-center gap-2 text-sm font-semibold", col.tone)}>
                <span className="relative flex h-2 w-2">
                  {k === 1 && <span className={clsx("ping-dot absolute inset-0 rounded-full", col.dot)} />}
                  <span className={clsx("relative h-2 w-2 rounded-full", col.dot)} />
                </span>{" "}
                {col.status}
              </p>
              <ul className="mt-5 space-y-3">
                {col.items.map((t) => (
                  <li key={t} className="flex gap-3 text-[15px] text-chalk/85">
                    {k === 0 ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" /> : <span className="mt-2 h-1 w-3 shrink-0 rounded bg-white/20" />}
                    {t}
                  </li>
                ))}
              </ul>
            </Spot>
          </Reveal>
        ))}
      </div>
    </Block>
  );
}

function Principles() {
  const cols = [
    { icon: ScanLine, title: "ИИ видит", text: "Нейросеть находит суставы. Это всё, что ей доверено.", items: ["Скелет ищется прямо в браузере", "Видео остаётся на телефоне", "На сервер уходят только координаты"] },
    { icon: Sigma, title: "Математика меряет", text: "Углы, скорости и фазы считает формула, а не догадка.", items: ["Каждое число открывается на кадре", "Тесты на синтетических ударах", "Совет сверяется с измерениями"] },
    { icon: ShieldCheck, title: "Тренер решает", text: "Мы даём цифры, а не приговор и не диагноз.", items: ["Не оцениваем риск травм", "Без фамилий и аккаунтов детей", "Тренер видит, что исправлять"] },
  ];
  return (
    <Block>
      <Reveal className="mb-12 text-center">
        <h2 className="text-grad mx-auto max-w-3xl font-display text-[clamp(32px,4.6vw,56px)] font-semibold leading-[1.04] tracking-[-0.04em]">Честный ИИ для детского спорта</h2>
      </Reveal>
      <div className="grid overflow-hidden rounded-2xl border border-white/8 md:grid-cols-3">
        {cols.map(({ icon: Icon, title, text, items }, k) => (
          <Reveal key={title} delay={k * 100} className={clsx("p-7", k > 0 && "border-t border-white/8 md:border-l md:border-t-0")}>
            <Icon className="h-5 w-5 text-lime" />
            <p className="mt-5 text-xl font-semibold tracking-tight">{title}</p>
            <p className="mt-2 text-sm leading-relaxed text-fog">{text}</p>
            <ul className="mt-6 space-y-2.5">
              {items.map((t) => (
                <li key={t} className="flex gap-2.5 text-sm text-chalk/80">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-dim" /> {t}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </Block>
  );
}

const FAQ = [
  ["Нужна ли камера 240 кадров в секунду?", "Нет. Подойдёт любой современный телефон и 60 к/с. Замедленная съёмка 120–240 к/с делает момент удара и скорость голени точнее."],
  ["Это точнее, чем глаз тренера?", "Удар длится доли секунды: глазом не увидеть угол колена в момент касания мяча. Мы меряем его на кадре. Но решение за тренером: мы даём цифры, а не приговор."],
  ["Что с видео и данными детей?", "Видео не загружается на сервер. Хранятся только координаты 33 точек скелета, ник и код команды. Без фамилий и без лиц."],
  ["Откуда эталон?", "Сейчас это синтетический эталон модели из чистых ударов. На пилоте эталон собираем вместе с тренерами из удачных ударов их игроков."],
  ["Работает ли без интернета?", "Скелет считается в браузере. Для показателей нужен наш сервер, а для текста совета — интернет; если ИИ недоступен, совет пишется по правилам."],
  ["Какие удары разбирает?", "Сейчас удар подъёмом по неподвижному мячу, снятый сбоку. Дальше пас, штрафной и пенальти."],
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Block>
      <div id="faq" className="grid scroll-mt-28 gap-10 md:grid-cols-[1fr_1.6fr]">
        <Reveal>
          <h2 className="text-grad font-display text-[clamp(32px,4vw,48px)] font-semibold leading-[1.05] tracking-[-0.04em]">Частые вопросы</h2>
          <p className="mt-4 text-fog">Не нашёл ответа? Открой демо-разбор: там видно каждый шаг.</p>
        </Reveal>
        <Reveal delay={100} className="border-t border-white/8">
          {FAQ.map(([q, a], i) => (
            <div key={q} className="border-b border-white/8">
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 py-5 text-left text-[16px] font-medium transition hover:text-chalk" aria-expanded={open === i}>
                {q}
                <Plus className={clsx("h-4 w-4 shrink-0 text-fog transition duration-300", open === i && "rotate-45 text-chalk")} />
              </button>
              <div className={clsx("grid transition-all duration-300", open === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                <p className="overflow-hidden pb-0 pr-8 leading-relaxed text-fog [&:not(:empty)]:pb-5">{a}</p>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </Block>
  );
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden px-5 pb-32 pt-24 md:pt-32">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="pitch-run absolute inset-x-0 bottom-0 h-[70%] origin-bottom [transform:perspective(600px)_rotateX(62deg)] [background-image:linear-gradient(rgba(198,255,61,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(198,255,61,0.16)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_top,#000,transparent_85%)]" />
        <div className="absolute left-1/2 top-[30%] h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(198,255,61,0.12),transparent)] blur-2xl" />
      </div>
      <Reveal className="relative mx-auto max-w-4xl text-center">
        <LogoMark size={56} className="mx-auto" />
        <h2 className="mt-8 font-display text-[clamp(40px,6.4vw,80px)] font-semibold leading-[1] tracking-[-0.045em]">
          <span className="text-grad">Сними один удар.</span>
          <br />
          <span className="text-grad-lime">Увидь всё.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-fog">Первый разбор станет точкой отсчёта для каждого следующего. Нужен только телефон.</p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/analyze" className="group inline-flex h-12 items-center gap-2 rounded-xl bg-chalk px-6 text-[15px] font-semibold text-night shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_10px_30px_-10px_rgba(255,255,255,0.35)] transition hover:bg-white">
            Разобрать удар <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <Link to="/demo" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-night/60 px-6 text-[15px] font-semibold backdrop-blur transition hover:bg-white/[0.07]">
            Смотреть демо
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  const cols = [
    { title: "Продукт", links: [["/analyze", "Разбор удара"], ["/live", "Зеркало"], ["/me", "Мой прогресс"], ["/team", "Кабинет тренера"]] },
    { title: "Метод", links: [["/method", "Как это работает"], ["/demo", "Демо-разбор"], ["#method", "Кинематика"], ["#roadmap", "Дорожная карта"]] },
    { title: "Проект", links: [["#faq", "Вопросы"], ["#coach", "Для академий"], ["/team/DEMO1", "Демо-команда"]] },
  ];
  return (
    <footer className="border-t border-white/6 px-5 pb-10 pt-14">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-fog">Биомеханический анализ футбольного удара по видео с телефона. ИИ видит, математика меряет, тренер решает.</p>
        </div>
        {cols.map((c) => (
          <div key={c.title} className="space-y-3 text-sm">
            <p className="font-medium text-chalk">{c.title}</p>
            {c.links.map(([h, l]) =>
              h.startsWith("#") ? (
                <a key={h} href={h} className="block text-fog transition hover:text-chalk">
                  {l}
                </a>
              ) : (
                <Link key={h} to={h} className="block text-fog transition hover:text-chalk">
                  {l}
                </Link>
              ),
            )}
          </div>
        ))}
      </div>
      <div className="mx-auto mt-14 flex max-w-6xl flex-col gap-2 border-t border-white/6 pt-6 text-xs text-dim md:flex-row md:justify-between">
        <span>© 2026 Kickscope · сделано в Казахстане</span>
        <span>Демо-данные синтетические · поза — MediaPipe (Apache 2.0)</span>
      </div>
    </footer>
  );
}

export function Landing() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-night">
      <Nav />
      <Hero />
      <Stats />
      <Statement />
      <Pipeline />
      <Kinematics />
      <GhostSection />
      <Metrics />
      <Advice />
      <Coach />
      <Progress />
      <Mirror />
      <Roadmap />
      <Principles />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}
