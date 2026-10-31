import clsx from "clsx";
import { ArrowRight, Camera, Ghost, Heart, Menu, Plane, Play, Plus, Sparkles, Ticket, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Flap } from "../components/Flap";
import { GhostCompare, kick } from "../components/KickScene";
import { Logo } from "../components/Logo";
import { CountUp, Reveal, ScrollText, Spot, Typewriter } from "../components/Motion";
import { KinematicsChart, MetricArt } from "../components/Showcase";
import { Sky } from "../components/Sky";
import { HeroPanel } from "../components/HeroPanel";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ chrome */

function Nav() {
  const [open, setOpen] = useState(false);
  const links = [
    ["#inside", "Продукт"],
    ["#method", "Метод"],
    ["#route", "Сравнение"],
    ["#coach", "Тренерам"],
    ["#board", "Рейсы"],
    ["#faq", "Вопросы"],
  ];
  return (
    <header className="fixed inset-x-[6px] top-[6px] z-50 md:inset-x-[10px] md:top-[10px]">
      <div className="flex h-14 items-center rounded-t-[14px] border-b border-[#6b6b6b] bg-[rgb(51_50_72/0.7)] px-4 backdrop-blur-[10px] md:rounded-t-[18px] md:px-6">
        <Link to="/" aria-label="Kickscope" className="shrink-0">
          <Logo mark={false} />
        </Link>
        <span className="mx-6 hidden h-6 w-px bg-[#6b6b6b] lg:block" />
        <nav className="hidden flex-1 items-center justify-center gap-7 lg:flex">
          {links.map(([h, l]) => (
            <a key={h} href={h} className="label text-chalk/85 underline-offset-4 transition hover:text-chalk hover:underline">
              {l}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/demo" className="label hidden h-9 items-center rounded-lg bg-chalk/[0.08] px-4 text-chalk transition hover:bg-chalk/15 sm:inline-flex">
            Демо
          </Link>
          <Link to="/analyze" className="btn-outline label inline-flex h-9 items-center px-4 text-chalk">
            Разобрать удар
          </Link>
          <button className="ml-1 flex h-9 w-9 items-center justify-center text-chalk lg:hidden" onClick={() => setOpen(!open)} aria-label="Меню">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="animate-rise border-b border-[#6b6b6b] bg-[rgb(20_20_28/0.92)] px-5 pb-4 backdrop-blur-[10px] lg:hidden">
          {[...links, ["/live", "Зеркало"]].map(([h, l]) => (
            <a key={h} href={h} onClick={() => setOpen(false)} className="label block border-b border-chalk/10 py-3.5 text-chalk">
              {l}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}

/** The signature closing stamp: the brand signs every screen like a postcard from Almaty. */
function CoordBar() {
  const fmt = useMemo(() => new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Almaty", hour: "2-digit", minute: "2-digit", second: "2-digit" }), []);
  const [now, setNow] = useState(() => fmt.format(new Date()));
  useEffect(() => {
    const t = setInterval(() => setNow(fmt.format(new Date())), 1000);
    return () => clearInterval(t);
  }, [fmt]);
  return (
    <div className="pointer-events-none fixed inset-x-[10px] bottom-[10px] z-50 hidden h-12 items-center justify-between rounded-b-[18px] bg-gradient-to-t from-night/90 to-transparent px-6 text-[13px] text-chalk/75 md:flex">
      <span className="flex items-center gap-5">
        <Plus className="h-3.5 w-3.5" />
        <span>Бей точно</span>
        <span className="text-chalk/50">Разбор удара</span>
      </span>
      <span className="hud flex items-center gap-4 text-[12px]">
        <span>43.2389° N, 76.8897° E</span>
        <span className="text-chalk/50">ALA {now}</span>
        <Heart className="h-3.5 w-3.5 fill-chalk text-chalk" />
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------- hero */

function Barcode({ seed, className }: { seed: string; className?: string }) {
  const bars = useMemo(() => {
    let x = 0;
    for (const c of seed) x = (x * 31 + c.charCodeAt(0)) >>> 0;
    return Array.from({ length: 46 }, () => {
      x = (x * 1103515245 + 12345) >>> 0;
      return 1 + (x % 4);
    });
  }, [seed]);
  return (
    <div className={clsx("flex flex-col justify-between", className)} aria-hidden>
      {bars.map((h, i) => (
        <span key={i} className="ml-auto block bg-chalk/70" style={{ height: h, width: `${40 + ((h * 37 + i * 23) % 61)}%` }} />
      ))}
    </div>
  );
}

function Pass() {
  return (
    <div className="pass relative w-full max-w-[440px] overflow-hidden p-7 pr-[76px] md:p-9 md:pr-24">
      <Barcode seed="KS-023 KICKSCOPE" className="absolute bottom-7 right-6 top-7 w-9 md:right-8" />
      <p className="label flex items-center gap-2 text-chalk/75">
        <Ticket className="h-4 w-4" /> Билет на разбор
      </p>
      <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-chalk/50">откуда</p>
          <p className="hud mt-1 text-[22px] text-chalk/90">ГЛАЗ</p>
        </div>
        <Plane className="mb-1.5 h-4 w-4 text-chalk/70" />
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-chalk/50">куда</p>
          <p className="hud mt-1 text-[22px] text-chalk/90">КАДР</p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-chalk/15 pt-4">
        {[
          ["рейс", "KS-023"],
          ["удар", "0,23 с"],
          ["точек", "33"],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-chalk/50">{k}</p>
            <p className="hud mt-1 text-[14px] text-chalk/90">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 text-[30px] font-light leading-[1.1] tracking-[-0.02em] md:text-[34px]">
        Работает
        <br />
        на телефоне
      </p>
      <div className="mt-7 space-y-3">
        <Link to="/analyze" className="pill-ghost flex h-14 items-center justify-center gap-3 px-6 text-[15px] text-chalk">
          <Upload className="h-4 w-4 text-lavender" /> Загрузить видео удара
        </Link>
        <Link to="/live" className="pill-ghost flex h-14 items-center justify-center gap-3 px-6 text-[15px] text-chalk">
          <Camera className="h-4 w-4 text-lavender" /> Включить зеркало
        </Link>
      </div>
    </div>
  );
}

function Hero() {
  const pm = kick.player.metrics;
  return (
    <section className="relative overflow-hidden">
      <Sky className="absolute inset-0" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,9,0.86)_0%,rgba(9,9,9,0.6)_45%,rgba(9,9,9,0.3)_100%)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-night" />
      <div className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-6 pb-24 pt-28 lg:min-h-[100svh] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.04fr)] lg:gap-14 lg:pb-20 lg:pt-28">
        <div>
          <p className="hud word-in text-[11px] uppercase tracking-[0.22em] text-lavender">Биомеханика удара · игрокам и академиям</p>
          <h1 className="mt-6 text-chalk">
            <span className="word-in serif-i block text-[clamp(64px,8.4vw,124px)] leading-[0.92]" style={{ animationDelay: "80ms" }}>
              Рентген
            </span>
            <span className="word-in block text-[clamp(34px,4.1vw,56px)] font-normal leading-[1.02] tracking-[-0.045em]" style={{ animationDelay: "160ms" }}>
              футбольного удара
            </span>
            <span className="word-in serif-i block text-[clamp(38px,4.7vw,66px)] leading-[1.12] text-chalk/70" style={{ animationDelay: "240ms" }}>
              в твоём телефоне
            </span>
          </h1>
          <p className="word-in mt-7 max-w-[520px] text-[18px] leading-relaxed text-chalk/80" style={{ animationDelay: "340ms" }}>
            Сними один удар сбоку. Kickscope построит скелет, найдёт точку контакта, наложит эталон и подскажет, что исправить.
          </p>
          <div className="word-in mt-9 flex flex-wrap gap-3" style={{ animationDelay: "420ms" }}>
            <Link to="/analyze" className="inline-flex h-[52px] items-center gap-2 rounded-lg bg-violet px-6 text-[15px] font-medium text-white shadow-[0_0_36px_rgba(175,80,255,0.45)] transition hover:bg-[#bd6bff]">
              Разобрать мой удар <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/demo" className="btn-outline inline-flex h-[52px] items-center gap-2 px-6 text-[15px] text-chalk">
              <Play className="h-3.5 w-3.5" /> Пример разбора
            </Link>
          </div>
          <div className="word-in mt-12 grid max-w-[560px] grid-cols-3 gap-6 border-t border-chalk/12 pt-6" style={{ animationDelay: "500ms" }}>
            {[
              ["1", "телефон — всё оборудование"],
              ["33", "точки тела на каждом кадре"],
              ["6", "биомеханических показателей"],
            ].map(([v, t]) => (
              <div key={t}>
                <p className="hud text-[34px] leading-none text-chalk">{v}</p>
                <p className="mt-2 text-[13px] leading-snug text-fog">{t}</p>
              </div>
            ))}
          </div>
          <p className="hud word-in mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] uppercase tracking-[0.2em] text-lavender" style={{ animationDelay: "560ms" }}>
            {["Съёмка", "Скелет", "Эталон", "Совет"].map((w, i) => (
              <span key={w} className="flex items-center gap-3">
                {i > 0 && <span className="text-chalk/40">→</span>}
                {w}
              </span>
            ))}
          </p>
        </div>
        <div className="word-in min-w-0" style={{ animationDelay: "280ms" }}>
          <HeroPanel />
          <div className="mt-3 flex items-start gap-4 rounded-[14px] border border-chalk/10 bg-[#0b0b0d]/85 p-4 backdrop-blur">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
            <p className="text-[14px] leading-relaxed text-chalk/85">
              <span className="hud mr-2 text-[10px] uppercase tracking-[0.16em] text-lavender">совет</span>
              Опорная нога стоит на {Math.round(Math.abs(pm.plant_offset))} см позади точки удара, корпус завален назад на {Math.round(Math.abs(pm.trunk_lean))}°. Ставь стопу сбоку от мяча.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- sections */

function Shell({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={clsx("scroll-mt-20 px-6 py-24 md:py-[120px]", className)}>
      <div className="mx-auto max-w-[1200px]">{children}</div>
    </section>
  );
}

/** Section signpost: a stamped mono word that flips in like a departures board. */
function Stamp({ n, word, lead }: { n: string; word: string; lead?: ReactNode }) {
  return (
    <div className="mb-14">
      <p className="label text-chalk/60">{n}</p>
      <h2 className="stamp mt-4 text-[clamp(30px,6vw,74px)] text-[#f0f0f0]">
        <Flap text={word} />
      </h2>
      {lead && <Reveal className="mt-8 max-w-2xl text-[18px] leading-relaxed text-fog">{lead}</Reveal>}
    </div>
  );
}

function Problem() {
  return (
    <Shell className="pt-16 md:pt-24">
      <p className="label text-chalk/60">в_начале</p>
      <Reveal>
        <h2 className="mt-6 text-[clamp(40px,6.4vw,84px)] font-medium leading-[1] tracking-[-0.05em]">
          У детского футбола
          <br />
          есть проблема с{" "}
          <span className="relative inline-block">
            <span className="hud absolute -top-3 left-1 whitespace-nowrap text-[10px] font-normal tracking-[0.12em] text-chalk/50 md:-top-4">{"{биомеханика_удара}"}</span>
            <span className="border-b-[3px] border-dotted border-chalk/60">разбором</span>
          </span>
          .
        </h2>
      </Reveal>
      <div className="mt-16 grid gap-12 md:grid-cols-[1.4fr_1fr]">
        <ScrollText
          className="text-[clamp(22px,2.6vw,32px)] font-light leading-[1.35] tracking-[-0.02em]"
          text="Удар длится 0,23 секунды. Глаз тренера видит, куда полетел мяч, но не видит почему. Лаборатория с камерами есть только у сборных. А у тренера детской команды — пятнадцать игроков и *одна пара глаз."
        />
        <div className="space-y-6 border-l border-chalk/12 pl-8">
          {[
            [0.23, 2, " с", "длится удар от опоры до касания мяча"],
            [1620, 0, "", "детей играли в лиге QJ League в 2025 году"],
            [0, 0, "", "датчиков и маркеров нужно Kickscope"],
          ].map(([v, d, s, t]) => (
            <Reveal key={t as string}>
              <p className="hud text-[40px] leading-none text-chalk">
                <CountUp to={v as number} decimals={d as number} suffix={s as string} />
              </p>
              <p className="mt-2 text-[14px] text-fog">{t}</p>
            </Reveal>
          ))}
          <p className="text-[11px] text-fog">Длительность — эталонный удар модели при 60 к/с. QJ League — Wikipedia, итоги сезона 2025.</p>
        </div>
      </div>
    </Shell>
  );
}

const ROWS = [
  ["СКЕЛЕТ 33 ТОЧКИ", "#method"],
  ["УГЛЫ И СКОРОСТИ", "#method"],
  ["ФАЗЫ УДАРА", "#method"],
  ["ПРИЗРАК ЭТАЛОНА", "#ghost"],
  ["СОВЕТ ТРЕНЕРА", "#ghost"],
  ["КАБИНЕТ КОМАНДЫ", "#coach"],
  ["ЗЕРКАЛО", "/live"],
];

function FlapRow({ text, href }: { text: string; href: string }) {
  const [replay, setReplay] = useState(0);
  const inner = (
    <>
      <span className="stamp min-w-0 text-[clamp(20px,4.9vw,64px)] text-[#f0f0f0]">
        <Flap text={text} replay={replay} />
      </span>
      <ArrowRight className="h-6 w-6 shrink-0 text-chalk/80 transition duration-300 group-hover:translate-x-1 group-hover:text-lavender md:h-8 md:w-8" />
    </>
  );
  const cls = "group flex items-center justify-between gap-4 rounded-[10.8px] border border-chalk/12 px-5 py-4 transition duration-300 hover:border-violet/60 hover:bg-violet/[0.06] md:px-8 md:py-5";
  return href.startsWith("#") ? (
    <a href={href} className={cls} onMouseEnter={() => setReplay((r) => r + 1)}>
      {inner}
    </a>
  ) : (
    <Link to={href} className={cls} onMouseEnter={() => setReplay((r) => r + 1)}>
      {inner}
    </Link>
  );
}

function Inside() {
  return (
    <Shell id="inside">
      <div className="mb-10 flex items-end justify-between">
        <p className="label text-chalk/60">что_внутри · 07 функций</p>
        <p className="label hidden text-chalk/50 md:block">наведи на строку</p>
      </div>
      <div className="space-y-3">
        {ROWS.map(([t, h]) => (
          <FlapRow key={t} text={t} href={h} />
        ))}
      </div>
    </Shell>
  );
}

function Method() {
  return (
    <Shell id="method">
      <Stamp
        n="01 / метод"
        word="КИНЕМАТИКА"
        lead="Нейросеть MediaPipe находит 33 точки тела прямо в браузере. Дальше работает формула: угол колена, угловая скорость голени и фазы удара на каждом кадре. Проведи по графику."
      />
      <Reveal>
        <Spot className="frame rounded-[19.2px] p-5 md:p-10">
          <KinematicsChart />
        </Spot>
      </Reveal>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {[
          ["Угол сустава", "θ = arccos( u·v / |u||v| )", "между векторами бедро → колено и колено → голеностоп"],
          ["Угловая скорость", "ω = dθ / dt,  Δt = 1 / f", "производная по сглаженному ряду, f — частота кадров"],
          ["Масштаб в метрах", "м/пкс = 0,22 м / ⌀ мяча", "калибровка по мячу 5 размера или по росту игрока"],
        ].map(([t, f, d], i) => (
          <Reveal key={t} delay={i * 90}>
            <div className="card h-full p-7">
              <p className="label text-chalk/60">{t}</p>
              <p className="hud mt-4 text-[16px] text-chalk">{f}</p>
              <p className="mt-4 text-[14px] leading-relaxed text-fog">{d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Shell>
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
  const input = [
    ["plant_offset", `${pm.plant_offset.toFixed(1)} см`, `${rm.plant_offset.toFixed(1)}`],
    ["trunk_lean", `${pm.trunk_lean.toFixed(1)}°`, `+${rm.trunk_lean.toFixed(1)}`],
    ["backswing_knee", `${pm.backswing_knee.toFixed(1)}°`, `${rm.backswing_knee.toFixed(1)}`],
    ["knee_contact", `${pm.knee_contact.toFixed(1)}°`, `${rm.knee_contact.toFixed(1)}`],
  ];
  return (
    <Shell id="ghost">
      <Stamp
        n="02 / сравнение"
        word="ПРИЗРАК ЭТАЛОНА"
        lead="DTW выравнивает два удара по времени, даже если ребёнок бьёт медленнее. Белый скелет — эталон, лавандовый — игрок. Разница видна на кадре контакта."
      />
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Reveal>
          <div className="frame overflow-hidden rounded-[19.2px]">
            <div className="flex h-11 items-center justify-between border-b border-chalk/10 px-5 text-[12px]">
              <span className="label text-chalk/60">Тимур · попытка 05</span>
              <span className="flex gap-4">
                <span className="flex items-center gap-1.5 text-lavender">
                  <span className="h-0.5 w-4 rounded bg-lavender" /> игрок
                </span>
                <span className="flex items-center gap-1.5 text-chalk/70">
                  <span className="h-0.5 w-4 rounded bg-chalk/70" /> эталон
                </span>
              </span>
            </div>
            <div className="relative aspect-video bg-[radial-gradient(90%_90%_at_50%_0%,#1d1530,#0b0b0d)]">
              <div className="grid-bg absolute inset-0 opacity-60 [mask-image:none]" />
              <GhostCompare frame={frame} ghost={ghost} className="absolute inset-0 h-full w-full" />
            </div>
            <div className="flex items-center gap-3 border-t border-chalk/10 px-5 py-3.5">
              <button onClick={() => setGhost(!ghost)} className={clsx("label flex h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 transition", ghost ? "bg-chalk text-night" : "border border-chalk/30 text-chalk")}>
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
              <button onClick={() => (setAuto(false), setFrame(kick.player.contact))} className="label h-9 shrink-0 rounded-lg border border-chalk/30 px-3.5 text-chalk transition hover:bg-chalk hover:text-night">
                Контакт
              </button>
            </div>
          </div>
        </Reveal>
        <Reveal delay={120} className="flex flex-col">
          <div className="card divide-y divide-chalk/10">
            <div className="label flex justify-between px-6 py-4 text-chalk/50">
              <span>показатель</span>
              <span>игрок / эталон</span>
            </div>
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-4 px-6 py-4">
                <span className="flex items-center gap-3 text-[15px]">
                  <span className={clsx("h-1.5 w-1.5 rounded-full", r.bad ? "bg-coral" : "bg-mint")} /> {r.label}
                </span>
                <span className="hud text-right text-[14px]">
                  <span className={r.bad ? "text-coral" : "text-mint"}>{r.you}</span> <span className="text-chalk/60">/ {r.ref}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 px-1 text-[12px] text-fog">Пример на синтетических данных модели.</p>
        </Reveal>
      </div>

      <Reveal className="mt-4">
        <div className="card grid overflow-hidden md:grid-cols-[1fr_1.2fr]">
          <div className="border-b border-chalk/10 p-8 md:border-b-0 md:border-r">
            <p className="label text-chalk/60">вход · только числа</p>
            <div className="hud mt-6 space-y-3 text-[13px]">
              {input.map(([k, v, r]) => (
                <p key={k} className="flex justify-between gap-4">
                  <span className="text-lavender">{k}</span>
                  <span>
                    <span className="text-chalk">{v}</span> <span className="text-chalk/60">эталон {r}</span>
                  </span>
                </p>
              ))}
            </div>
          </div>
          <div className="p-8">
            <p className="label flex items-center gap-2 text-chalk/50">
              <Sparkles className="h-3.5 w-3.5 text-violet" /> совет тренера
            </p>
            <p className="mt-6 min-h-[112px] text-[20px] font-light leading-relaxed">
              <Typewriter text="Опорная нога стоит на 30 см позади точки удара — ты тянешься к мячу и заваливаешь корпус назад. Поставь фишку сбоку от мяча и 15 раз подряд ставь стопу точно к ней." />
            </p>
            <p className="mt-6 text-[13px] text-fog">ИИ видит только числа, не видео. Каждое число в тексте сверяется с измерениями, иначе берём проверенный шаблон.</p>
          </div>
        </div>
      </Reveal>
    </Shell>
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
    <Shell>
      <Stamp n="03 / показатели" word="ШЕСТЬ ЧИСЕЛ" lead="Каждый показатель открывается на конкретном кадре и сравнивается с разбросом эталона. Значения ниже — эталонный удар модели." />
      <div className="grid gap-px overflow-hidden rounded-[19.2px] border border-chalk/10 bg-chalk/10 sm:grid-cols-2 lg:grid-cols-3">
        {METRICS.map((m, i) => (
          <Reveal key={m.title} delay={(i % 3) * 90} className="bg-night">
            <Spot className="h-full p-8">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[18px] tracking-[-0.01em]">{m.title}</p>
                <span className="hud whitespace-nowrap text-[18px] text-lavender">
                  <CountUp to={m.value} decimals={"decimals" in m ? m.decimals : 0} suffix={m.unit} />
                </span>
              </div>
              <div className="my-6 rounded-[12px] border border-chalk/8 bg-[radial-gradient(100%_100%_at_50%_100%,#1b1230,#0c0c0e)]">
                <MetricArt kind={m.kind} />
              </div>
              <p className="text-[14px] leading-relaxed text-fog">{m.text}</p>
            </Spot>
          </Reveal>
        ))}
      </div>
    </Shell>
  );
}

const ROUTE = [
  { n: "01", label: "лаборатория", title: "Камеры и маркеры", text: "Точно, но это уровень сборных: отдельный зал, специалисты, часы на одного игрока.", bloom: "bloom-blue" },
  { n: "02", label: "датчики", title: "Железо на каждого", text: "Датчик на бутсу считает скорость, но не видит позу. На команду нужен комплект.", bloom: "bloom-pink" },
  { n: "03", label: "видеоразбор", title: "Линии вручную", text: "Тренер останавливает видео и рисует углы пальцем. Пять минут на один удар.", bloom: "bloom-dusk" },
  { n: "04", label: "прямой рейс", title: "Kickscope", text: "Один телефон, разбор за секунды, эталон поверх удара и вся команда на одном экране.", bloom: "bloom-violet" },
];

function Route() {
  return (
    <Shell id="route">
      <Stamp n="04 / маршрут" word="ТРИ ПЕРЕСАДКИ" />
      <Reveal className="-mt-6 mb-14">
        <p className="text-[clamp(30px,4vw,52px)] font-light leading-[1.1] tracking-[-0.03em]">
          До разбора удара вели три маршрута с пересадками.
          <br />
          <span className="serif-i text-chalk/75">Мы открыли прямой рейс.</span>
        </p>
      </Reveal>
      <div className="relative">
        <div aria-hidden className="absolute left-[12%] right-[12%] top-0 hidden h-px bg-chalk/25 lg:block" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROUTE.map((c, i) => (
            <Reveal key={c.n} delay={i * 110} className="relative lg:pt-10">
              <span aria-hidden className={clsx("absolute left-1/2 top-0 hidden h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border lg:block", i === 3 ? "border-violet bg-violet shadow-[0_0_16px_rgba(175,80,255,0.9)]" : "border-chalk/60 bg-night")} />
              <div className={clsx("relative flex min-h-[360px] flex-col overflow-hidden rounded-[19.2px] p-8", c.bloom)}>
                <span aria-hidden className="pointer-events-none absolute -right-2 -top-6 text-[150px] font-light leading-none tracking-[-0.06em] text-white/[0.08]">
                  {c.n}
                </span>
                <p className="stamp relative text-[11px] tracking-[0.2em] text-chalk/70">{c.label}</p>
                <p className="relative mt-auto text-[26px] font-normal tracking-[-0.02em]">{c.title}</p>
                <p className="relative mt-3 text-[14px] leading-relaxed text-chalk/75">{c.text}</p>
                {i === 3 ? (
                  <Link to="/analyze" className="relative mt-6 inline-flex items-center gap-2 text-[15px] font-medium">
                    Начать разбор <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="relative mt-6 inline-flex items-center gap-2 text-[15px] text-chalk/85">
                    против Kickscope <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Shell>
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
    <Shell id="coach">
      <Stamp n="05 / тренерам" word="КАБИНЕТ КОМАНДЫ" lead="Игроки входят по QR-коду, без аккаунтов и фамилий. Тренер видит, кто растёт и какие ошибки повторяются у группы, и строит тренировку под них." />
      <Reveal>
        <div className="frame overflow-hidden rounded-[19.2px]">
          <div className="flex h-12 items-center gap-3 border-b border-chalk/10 px-5">
            <span className="label text-chalk">U15 · Академия</span>
            <span className="hud rounded-md border border-chalk/20 px-2 py-0.5 text-[11px] text-lavender">K7Q2X</span>
            <span className="label ml-auto hidden text-chalk/50 sm:block">5 игроков · 38 попыток · 5 недель</span>
          </div>
          <div className="grid lg:grid-cols-[1.5fr_1fr]">
            <div className="overflow-x-auto p-3">
              <table className="w-full min-w-[460px] text-left text-[14px]">
                <thead className="label text-chalk/60">
                  <tr>
                    <th className="px-3 py-3 font-normal">Игрок</th>
                    <th className="px-3 py-3 font-normal">Тренд</th>
                    <th className="px-3 py-3 font-normal">Показатели</th>
                    <th className="px-3 py-3 text-right font-normal">Оценка</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map(([name, score, trend, st]) => (
                    <tr key={name} className="border-t border-chalk/8 transition hover:bg-chalk/[0.03]">
                      <td className="px-3 py-3.5">{name}</td>
                      <td className="px-3 py-3.5">
                        <svg viewBox="0 0 60 26" className="h-6 w-16" aria-hidden>
                          <path d={spark(trend)} fill="none" stroke="#E1BDFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="flex gap-1">
                          {st.map((s, i) => (
                            <span key={i} className={clsx("h-2 w-2 rounded-full", color[s])} />
                          ))}
                        </span>
                      </td>
                      <td className="hud px-3 py-3.5 text-right">{score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 border-t border-chalk/10 p-5 lg:border-l lg:border-t-0">
              <p className="label text-chalk/60">Частые ошибки группы</p>
              {[
                { n: "3 из 5", t: "ставят опорную ногу далеко позади мяча", w: "60%", c: "bg-coral", tc: "text-coral" },
                { n: "2 из 5", t: "заваливают корпус назад в момент удара", w: "40%", c: "bg-amber", tc: "text-amber" },
                { n: "1 из 5", t: "разгибают колено раньше бедра", w: "20%", c: "bg-amber", tc: "text-amber" },
              ].map((x) => (
                <div key={x.t} className="rounded-[12px] border border-chalk/10 p-4">
                  <p className={clsx("hud text-[12px]", x.tc)}>{x.n}</p>
                  <p className="mt-1 text-[14px] text-chalk/85">{x.t}</p>
                  <div className="mt-3 h-1 rounded-full bg-chalk/10">
                    <div className={clsx("h-full rounded-full", x.c)} style={{ width: x.w }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link to="/team/DEMO1" className="btn-outline label inline-flex h-11 items-center gap-2 px-5 text-chalk">
          Открыть демо-команду <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/team" className="label inline-flex h-11 items-center px-4 text-chalk/80 underline-offset-4 hover:underline">
          Создать свою команду
        </Link>
        <span className="text-[12px] text-fog">Иллюстрация интерфейса.</span>
      </div>
    </Shell>
  );
}

const FLIGHTS = [
  ["KS-101", "Поза в браузере, 33 точки", "ПРИБЫЛ"],
  ["KS-102", "Фазы удара и шесть показателей", "ПРИБЫЛ"],
  ["KS-103", "DTW-сравнение с эталоном", "ПРИБЫЛ"],
  ["KS-104", "Кабинет тренера и зеркало", "ПРИБЫЛ"],
  ["KS-201", "Трекинг мяча и его скорость", "В ПОЛЁТЕ"],
  ["KS-202", "Поправка на ракурс камеры", "В ПОЛЁТЕ"],
  ["KS-301", "Восстановление скрытых суставов", "ПО ПЛАНУ"],
  ["KS-302", "Пас, штрафной, пенальти", "ПО ПЛАНУ"],
];

function Board() {
  return (
    <Shell id="board">
      <Stamp n="06 / дорожная карта" word="ТАБЛО РЕЙСОВ" lead="Честно делим то, что уже приземлилось, и то, что ещё в пути. Ядро работает сегодня, дальше — мяч, ракурс и новые удары." />
      <Reveal>
        <div className="frame overflow-hidden rounded-[19.2px]">
          <div className="label grid grid-cols-[90px_1fr_120px] gap-4 border-b border-chalk/10 px-5 py-4 text-chalk/60 md:grid-cols-[140px_1fr_180px] md:px-8">
            <span>рейс</span>
            <span>направление</span>
            <span className="text-right">статус</span>
          </div>
          {FLIGHTS.map(([code, dest, status]) => (
            <div key={code} className="grid grid-cols-[90px_1fr_120px] items-center gap-4 border-b border-chalk/8 px-5 py-4 last:border-b-0 md:grid-cols-[140px_1fr_180px] md:px-8">
              <span className="hud text-[14px] text-chalk/60">{code}</span>
              <span className="text-[15px] md:text-[17px]">{dest}</span>
              <span
                className={clsx(
                  "stamp text-right text-[11px] tracking-[0.18em] md:text-[13px]",
                  status === "ПРИБЫЛ" && "text-chalk",
                  status === "В ПОЛЁТЕ" && "blink text-lavender",
                  status === "ПО ПЛАНУ" && "text-chalk/60",
                )}
              >
                <Flap text={status} speed={40} />
              </span>
            </div>
          ))}
        </div>
      </Reveal>
    </Shell>
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
    <Shell id="faq">
      <div className="grid gap-12 md:grid-cols-[1fr_1.7fr]">
        <div>
          <p className="label text-chalk/60">07 / вопросы</p>
          <h2 className="mt-5 text-[clamp(36px,4.4vw,56px)] font-light leading-[1.05] tracking-[-0.04em]">
            Частые
            <br />
            <span className="serif-i">вопросы</span>
          </h2>
        </div>
        <div className="border-t border-chalk/12">
          {FAQ.map(([q, a], i) => (
            <div key={q} className="border-b border-chalk/12">
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-6 py-6 text-left text-[18px]" aria-expanded={open === i}>
                {q}
                <Plus className={clsx("h-5 w-5 shrink-0 text-chalk/70 transition duration-300", open === i && "rotate-45 text-lavender")} />
              </button>
              <div className={clsx("grid transition-all duration-300", open === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                <p className="overflow-hidden pr-10 text-[16px] leading-relaxed text-fog [&:not(:empty)]:pb-6">{a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function Final() {
  return (
    <section className="relative overflow-hidden">
      <Sky className="absolute inset-0" scale={0.4} />
      <div aria-hidden className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-night to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-night" />
      <div aria-hidden className="streak pointer-events-none absolute left-[22%] top-[22%] hidden items-center lg:flex">
        <span className="tail block h-[2px] w-[20vw] bg-gradient-to-r from-transparent via-white/40 to-white/90" />
        <span className="block h-3 w-3 rounded-full bg-white shadow-[0_0_14px_4px_rgba(255,255,255,0.7)]" />
      </div>
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-14 px-6 pb-40 pt-48 md:pb-52 md:pt-60 lg:grid-cols-[minmax(0,1fr)_440px]">
        <Reveal>
          <h2>
            <span className="serif-i block text-[clamp(84px,13vw,180px)] leading-[0.85]">Бей</span>
            <span className="block text-[clamp(48px,7.4vw,104px)] font-normal leading-[0.95] tracking-[-0.05em]">точно.</span>
          </h2>
          <p className="mt-8 max-w-md text-[20px] font-light leading-snug text-chalk/85">Сними один удар сегодня. Он станет точкой отсчёта для каждого следующего.</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/analyze" className="inline-flex h-14 items-center gap-2 rounded-lg bg-violet px-7 text-[16px] font-medium text-white shadow-[0_0_40px_rgba(175,80,255,0.55)] transition hover:bg-[#bd6bff]">
              Разобрать мой удар <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/demo" className="btn-outline inline-flex h-14 items-center px-7 text-[16px] text-chalk">
              Смотреть демо
            </Link>
          </div>
        </Reveal>
        <Reveal delay={150} className="flex justify-center lg:justify-end">
          <Pass />
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    { title: "Продукт", links: [["/analyze", "Разбор удара"], ["/live", "Зеркало"], ["/me", "Мой прогресс"], ["/team", "Кабинет тренера"]] },
    { title: "Метод", links: [["/method", "Как это работает"], ["/demo", "Демо-разбор"], ["#method", "Кинематика"], ["#board", "Табло рейсов"]] },
    { title: "Проект", links: [["#faq", "Вопросы"], ["#coach", "Для академий"], ["/team/DEMO1", "Демо-команда"]] },
  ];
  return (
    <footer className="border-t border-chalk/10 px-6 pb-24 pt-16">
      <div className="mx-auto grid max-w-[1200px] gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-fog">Биомеханический анализ футбольного удара по видео с телефона. ИИ видит, математика меряет, тренер решает.</p>
        </div>
        {cols.map((c) => (
          <div key={c.title} className="space-y-3 text-[14px]">
            <p className="label text-chalk/60">{c.title}</p>
            {c.links.map(([h, l]) =>
              h.startsWith("#") ? (
                <a key={h} href={h} className="block text-chalk/85 transition hover:text-lavender">
                  {l}
                </a>
              ) : (
                <Link key={h} to={h} className="block text-chalk/85 transition hover:text-lavender">
                  {l}
                </Link>
              ),
            )}
          </div>
        ))}
      </div>
      <div className="mx-auto mt-14 flex max-w-[1200px] flex-col gap-2 border-t border-chalk/10 pt-6 text-[12px] text-fog md:flex-row md:justify-between">
        <span>© 2026 Kickscope · сделано в Казахстане</span>
        <span>Демо-данные синтетические · поза — MediaPipe (Apache 2.0)</span>
      </div>
    </footer>
  );
}

export function Landing() {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-night">
      <div className="window-frame" aria-hidden />
      <Nav />
      <Hero />
      <Problem />
      <Inside />
      <Method />
      <GhostSection />
      <Metrics />
      <Route />
      <Coach />
      <Board />
      <Faq />
      <Final />
      <Footer />
      <CoordBar />
    </div>
  );
}
