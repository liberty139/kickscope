"""Two sentences of coaching from the numbers: an LLM when available, checked; rules otherwise."""

from __future__ import annotations

import json
import re

import httpx

from . import config

# (problem when below the reference, problem when above, drill). {v} value, {r} reference, {d} |difference|.
RULES = {
    "knee_contact": (
        "В момент удара колено согнуто сильнее, чем у эталона ({v}° против {r}°), поэтому удар выходит «тычком» и теряет силу.",
        "В момент удара нога почти прямая ({v}° против {r}°), удар получается жёстким и менее точным.",
        "Сделай 10 ударов с места по неподвижному мячу и думай о том, чтобы голень «выстрелила» вперёд к мячу.",
    ),
    "trunk_lean": (
        "Корпус заваливается назад ({v}° против {r}° у эталона), поэтому мяч уходит вверх.",
        "Корпус слишком наклонён вперёд ({v}° против {r}°), удар прижимается к земле и слабеет.",
        "Сделай 10 низких ударов вдоль газона: в момент удара плечи над мячом, взгляд на мяч.",
    ),
    "plant_offset": (
        "Опорная нога стоит на {av} см позади точки удара (у эталона {ar} см): ты тянешься к мячу и теряешь контроль.",
        "Опорная нога стоит слишком близко к мячу или впереди него ({v} см против {r} см у эталона), бьющая нога врезается сверху.",
        "Поставь фишку сбоку от мяча и 15 раз подряд ставь опорную стопу точно к ней.",
    ),
    "shank_speed": (
        "Голень разгоняется медленнее эталона ({v}°/с против {r}°/с), поэтому удар слабее, чем мог бы быть.",
        "Голень разгоняется быстрее эталона ({v}°/с), это хорошо, держи технику.",
        "Сделай 3 серии по 8 ударов: короткий замах и резкий «хлёст» голенью.",
    ),
    "backswing_knee": (
        "Замах глубже эталона (колено {v}° против {r}°): следи, чтобы не терять точность.",
        "Замах короткий: колено сгибается только до {v}° (у эталона {r}°), разгона не хватает.",
        "Без мяча сделай 10 замахов «пятка к ягодице», затем 10 ударов с тем же замахом.",
    ),
    "chain_lag": (
        "Голень начинает разгоняться раньше бедра, и часть энергии теряется по пути к мячу.",
        "Между бедром и голенью большая пауза ({v} мс против {r} мс), удар получается в два движения.",
        "Сделай медленные махи «сначала колено вперёд, потом голень», затем 10 ударов с места.",
    ),
}
GOOD = "Удар близок к эталону, все показатели в пределах нормы. Сделай ещё 5 ударов подряд и проверь, что результат держится."
BANNED = ("травм", "вальгус", "диагноз", "риск", "врач", "болезн")


def _fmt(x: float) -> str:
    s = f"{x:.0f}" if abs(x) >= 10 or float(x).is_integer() else f"{x:.1f}".replace(".", ",")
    return s.replace("-", "−")


def rules(comparison: dict) -> str:
    focus = comparison.get("focus")
    if not focus:
        return GOOD
    row = next(r for r in comparison["metrics"] if r["key"] == focus)
    low, high, drill = RULES[focus]
    v, ref = row["value"], row["ref"]
    text = (low if row["z"] < 0 else high).format(v=_fmt(v), r=_fmt(ref), av=_fmt(abs(v)), ar=_fmt(abs(ref)), d=_fmt(abs(v - ref)))
    return f"{text} {drill}"


def _numbers(text: str) -> set[float]:
    return {round(abs(float(m.replace(",", "."))), 1) for m in re.findall(r"\d+(?:[.,]\d+)?", text)}


def _allowed(comparison: dict) -> set[float]:
    ok = {float(i) for i in range(0, 31)}  # repetition counts and sets
    for r in comparison["metrics"]:
        for x in (r["value"], r["ref"]):
            if x is None:
                continue
            ok |= {round(abs(x), 1), float(round(abs(x))), round(abs(x), 0)}
        if r["ref"] is not None:
            d = abs(r["value"] - r["ref"])
            ok |= {round(d, 1), float(round(d))}
    ok.add(float(comparison["score"]))
    return ok


def check(text: str, comparison: dict) -> bool:
    """Every number must come from the measurements; no medical words; two short sentences."""
    if not text or len(text) > 400 or any(b in text.lower() for b in BANNED):
        return False
    return _numbers(text) <= _allowed(comparison)


def _prompt(comparison: dict) -> str:
    rows = [
        {"показатель": r["label"], "значение": r["value"], "единицы": r["unit"], "эталон": r["ref"], "отклонение_в_сигмах": r["z"]}
        for r in comparison["metrics"]
        if r["z"] is not None
    ]
    focus = next((r["label"] for r in comparison["metrics"] if r["key"] == comparison.get("focus")), "нет")
    return (
        "Ты детский тренер по футболу. По измерениям удара напиши ровно два предложения по-русски, всего до 45 слов. "
        "Первое: главное, что отличается от эталона, и чем это мешает удару. Второе: одно конкретное упражнение. "
        "Обращайся на «ты». Используй только числа из данных ниже или число повторений. Никаких диагнозов, травм и медицины. "
        f"Главный показатель: {focus}. Оценка удара: {comparison['score']} из 100.\n"
        f"Данные: {json.dumps(rows, ensure_ascii=False)}"
    )


def llm(comparison: dict) -> str | None:
    if not config.LLM_ENABLED:
        return None
    headers = {"Authorization": f"Bearer {config.OLLAMA_KEY}"} if config.OLLAMA_KEY else {}
    try:
        r = httpx.post(
            f"{config.OLLAMA_HOST}/api/chat",
            headers=headers,
            json={"model": config.LLM_MODEL, "stream": False, "think": False, "options": {"temperature": 0.3}, "messages": [{"role": "user", "content": _prompt(comparison)}]},
            timeout=25,
        )
        r.raise_for_status()
        text = (r.json().get("message") or {}).get("content", "").strip()
    except Exception:
        return None
    text = re.sub(r"\s+", " ", text.replace("*", "")).strip()
    return text if check(text, comparison) else None


def advise(comparison: dict) -> dict:
    text = llm(comparison)
    if text:
        return {"text": text, "source": "llm"}
    return {"text": rules(comparison), "source": "rules"}


def ai_status() -> dict:
    return {"enabled": config.LLM_ENABLED, "model": config.LLM_MODEL, "host": "ollama cloud" if "ollama.com" in config.OLLAMA_HOST else "ollama local", "key": bool(config.OLLAMA_KEY)}
