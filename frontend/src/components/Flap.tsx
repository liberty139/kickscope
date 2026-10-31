import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "./Motion";

const GLYPHS = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ0123456789#%+=<>/";
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A split-flap departures board: letters cycle through random glyphs and settle left to right.
 * Unsettled glyphs are drawn as outlines. Bump `replay` to flip the board again.
 */
export function Flap({ text, className, replay = 0, speed = 34 }: { text: string; className?: string; replay?: number; speed?: number }) {
  const [ref, seen] = useInView<HTMLSpanElement>(0.4);
  const [step, setStep] = useState(-1);
  const seed = useRef(0);
  const total = text.length + 6;

  useEffect(() => {
    if (!seen) return;
    if (reduced()) return setStep(total);
    setStep(0);
    const t = setInterval(() => {
      seed.current += 1;
      setStep((s) => {
        if (s >= total) {
          clearInterval(t);
          return s;
        }
        return s + 1;
      });
    }, speed);
    return () => clearInterval(t);
  }, [seen, replay, total, speed]);

  const chars = useMemo(() => text.split(""), [text]);
  return (
    <span ref={ref} className={clsx("inline-block whitespace-pre", className)} aria-label={text}>
      {chars.map((ch, i) => {
        const settled = step < 0 ? false : step - 6 >= i;
        const flipping = !settled && step >= i - 2 && step >= 0;
        if (ch === " ") return <span key={i}> </span>;
        if (settled) return <span key={i}>{ch}</span>;
        const g = GLYPHS[(i * 7 + seed.current * 13 + step) % GLYPHS.length];
        return (
          <span key={i} aria-hidden className={flipping ? "flap-ghost" : "opacity-0"}>
            {flipping ? g : ch}
          </span>
        );
      })}
    </span>
  );
}
