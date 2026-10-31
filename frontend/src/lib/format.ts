const nf = (v: number, d = 0) => v.toFixed(d).replace(".", ",").replace("-", "−");

/** Value with unit and a short reading in plain words. */
export function metricText(key: string, v: number): { value: string; hint?: string } {
  switch (key) {
    case "knee_contact":
      return { value: `${nf(v)}°`, hint: v >= 165 ? "почти прямая" : v >= 140 ? "слегка согнута" : "согнута" };
    case "trunk_lean":
      return { value: `${v > 0 ? "+" : ""}${nf(v)}°`, hint: v > 2 ? "над мячом" : v < -4 ? "назад" : "ровно" };
    case "plant_offset":
      return { value: `${nf(v)} см`, hint: v < -2 ? "позади мяча" : v > 2 ? "впереди мяча" : "рядом с мячом" };
    case "shank_speed":
      return { value: `${nf(v)} °/с` };
    case "backswing_knee":
      return { value: `${nf(v)}°`, hint: v > 120 ? "короткий замах" : v < 95 ? "глубокий замах" : "хороший замах" };
    case "chain_lag":
      return { value: `${nf(v)} мс`, hint: v <= 0 ? "голень раньше бедра" : "бедро → голень" };
    case "foot_speed":
      return { value: `${nf(v, 1)} м/с` };
    default:
      return { value: nf(v, 1) };
  }
}

export const refText = (key: string, v: number) => metricText(key, v).value;

export function when(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) + ", " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function perWeek(v: number | null, unit: string): string | null {
  if (v === null || Math.abs(v) < 0.05) return null;
  const d = Math.abs(v) >= 10 ? 0 : 1;
  return `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(d).replace(".", ",")} ${unit} в неделю`;
}
