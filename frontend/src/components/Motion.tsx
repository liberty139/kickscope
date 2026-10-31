import clsx from "clsx";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen] as const;
}

/** Fades a block up the first time it scrolls into view; children key their own animations off `.is-in`. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const [ref, shown] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={clsx("reveal", shown && "is-in", className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** Counts from 0 to `to` when it scrolls into view. Decimals use a Russian comma. */
export function CountUp({ to, decimals = 0, suffix = "", duration = 1400 }: { to: number; decimals?: number; suffix?: string; duration?: number }) {
  const [ref, seen] = useInView<HTMLSpanElement>(0.4);
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (reduced()) return setValue(to);
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to, duration]);
  return (
    <span ref={ref} className="tabular-nums">
      {value.toFixed(decimals).replace(".", ",")}
      {suffix}
    </span>
  );
}

/** Splits a phrase into words that drift in one after another. */
export function Words({ text, delay = 0, step = 70, className }: { text: string; delay?: number; step?: number; className?: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          <span className={clsx("word-in inline-block", className)} style={{ animationDelay: `${delay + i * step}ms` }}>
            {w}
          </span>
          {i < words.length - 1 && " "}
        </span>
      ))}
    </>
  );
}

/** One-shot spray of confetti; remount with a new `key` to fire again. */
export function Burst({ count = 22, className }: { count?: number; className?: string }) {
  const [bits] = useState(() =>
    Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const r = 80 + Math.random() * 90;
      return { dx: Math.cos(a) * r, dy: Math.sin(a) * r - 40, rot: (Math.random() - 0.5) * 240, color: ["#C6FF3D", "#3DF2FF", "#F4F7F2", "#FFC145"][i % 4], w: 6 + (i % 3) * 3 };
    }),
  );
  return (
    <span className={clsx("pointer-events-none absolute left-1/2 top-1/2", className)} aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          className="burst-bit absolute block rounded-sm"
          style={{ "--dx": `${b.dx}px`, "--dy": `${b.dy}px`, "--rot": `${b.rot}deg`, background: b.color, width: b.w, height: b.w * 0.5, animationDelay: `${i * 10}ms` } as CSSProperties}
        />
      ))}
    </span>
  );
}

/** Feeds the cursor position to `.spot` so a soft light follows it across the card. */
export function trackSpot(e: PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
}

export function Spot({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div onPointerMove={trackSpot} className={clsx("spot", className)}>
      {children}
    </div>
  );
}

/** A statement that lights up word by word as it scrolls through the screen. Words starting with `*` are accented. */
export function ScrollText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const words = Array.from(el.querySelectorAll<HTMLSpanElement>("[data-w]"));
    if (reduced()) {
      words.forEach((w) => (w.style.opacity = "1"));
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const lit = p * (words.length + 2);
      words.forEach((w, i) => (w.style.opacity = String(Math.min(1, Math.max(0.16, lit - i)))));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => {
      removeEventListener("scroll", on);
      removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [text]);
  return (
    <p ref={ref} className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i} data-w className={clsx("transition-opacity duration-150", w.startsWith("*") && "text-lime")}>
          {w.replace(/^\*/, "")}{" "}
        </span>
      ))}
    </p>
  );
}

/** Types the text out once it scrolls into view. */
export function Typewriter({ text, className, speed = 22 }: { text: string; className?: string; speed?: number }) {
  const [ref, seen] = useInView<HTMLSpanElement>(0.5);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (reduced()) return setN(text.length);
    const t = setInterval(() => setN((k) => (k >= text.length ? (clearInterval(t), k) : k + 1)), speed);
    return () => clearInterval(t);
  }, [seen, text, speed]);
  return (
    <span ref={ref} className={className}>
      {text.slice(0, n)}
      <span className={clsx("ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.18em] bg-lime", n >= text.length ? "caret" : "")} />
    </span>
  );
}
