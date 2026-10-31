"""Comparing a kick with a reference: per-metric deviations, DTW similarity, phase scores, ghost alignment."""

from __future__ import annotations

import math

import numpy as np

FEATURES = ("knee", "thigh", "shank", "trunk")
# Degrees that count as one unit of difference; the trunk is weighted up because small leans matter.
FEATURE_SCALE = np.array([20.0, 20.0, 25.0, 8.0])
RESAMPLE = 120

METRICS = {
    "knee_contact": {"label": "Колено в момент удара", "unit": "°", "floor": 4.0},
    "trunk_lean": {"label": "Наклон корпуса", "unit": "°", "floor": 3.0},
    "plant_offset": {"label": "Опорная нога у мяча", "unit": "см", "floor": 5.0},
    "shank_speed": {"label": "Скорость голени", "unit": "°/с", "floor": 120.0, "higher_is_better": True},
    "backswing_knee": {"label": "Сгибание в замахе", "unit": "°", "floor": 6.0},
    "chain_lag": {"label": "Бедро → голень", "unit": "мс", "floor": 15.0},
}
INFO_METRICS = {"foot_speed": {"label": "Скорость стопы", "unit": "м/с"}}
PHASES = ("backswing", "strike", "follow", "base")
PHASE_LABELS = {"backswing": "Замах", "strike": "Удар", "follow": "Сопровождение", "base": "Опора и баланс"}


def feature_track(analysis: dict) -> tuple[np.ndarray, int, int]:
    w0, w1 = analysis["window"]
    s = analysis["series"]
    track = np.stack([np.asarray(s[k][w0 : w1 + 1], dtype=float) for k in FEATURES], axis=-1)
    return track / FEATURE_SCALE, w0, w1


def resample(track: np.ndarray, n: int = RESAMPLE) -> np.ndarray:
    src = np.linspace(0, 1, len(track))
    dst = np.linspace(0, 1, n)
    return np.stack([np.interp(dst, src, track[:, k]) for k in range(track.shape[1])], axis=-1)


def dtw(a: np.ndarray, b: np.ndarray, band: float = 0.15) -> tuple[float, list[tuple[int, int]], np.ndarray]:
    """Dynamic time warping with a Sakoe–Chiba band. Returns mean step cost, path and per-step costs."""
    n, m = len(a), len(b)
    w = max(int(band * max(n, m)), abs(n - m) + 1)
    D = np.full((n + 1, m + 1), np.inf)
    D[0, 0] = 0.0
    cost = np.linalg.norm(a[:, None, :] - b[None, :, :], axis=-1)
    for i in range(1, n + 1):
        for j in range(max(1, i - w), min(m, i + w) + 1):
            D[i, j] = cost[i - 1, j - 1] + min(D[i - 1, j], D[i, j - 1], D[i - 1, j - 1])
    i, j = n, m
    path = [(i - 1, j - 1)]
    while i > 1 or j > 1:
        steps = [(D[i - 1, j - 1], i - 1, j - 1), (D[i - 1, j], i - 1, j), (D[i, j - 1], i, j - 1)]
        _, i, j = min(steps, key=lambda s: s[0])
        path.append((i - 1, j - 1))
    path.reverse()
    step_costs = np.array([cost[p, q] for p, q in path])
    return float(step_costs.mean()), path, step_costs


def similarity(d: float, tau: float) -> float:
    return 100.0 * math.exp(-d / max(tau, 1e-6))


def z_score(value: float, mean: float, sd: float, floor: float) -> float:
    return (value - mean) / max(sd, floor)


def z_to_score(z: float) -> float:
    """1σ ≈ 88, 2σ ≈ 61, 3σ ≈ 32."""
    return 100.0 * math.exp(-(z**2) / 8)


def status(z: float) -> str:
    a = abs(z)
    return "good" if a < 1 else "warn" if a < 2 else "bad"


def compare(analysis: dict, ref: dict) -> dict:
    """`ref` is a built reference (see reference.build): template track, stats and τ."""
    rows = []
    for key, meta in METRICS.items():
        mean, sd = ref["stats"][key]
        value = analysis["metrics"][key]
        z = z_score(value, mean, sd, meta["floor"])
        # Faster than the reference is never a fault.
        st = "good" if meta.get("higher_is_better") and z > 0 else status(z)
        rows.append({"key": key, "label": meta["label"], "unit": meta["unit"], "value": value, "ref": round(mean, 1), "ref_sd": round(max(sd, meta["floor"]), 1), "z": round(z, 2), "status": st})
    for key, meta in INFO_METRICS.items():
        rows.append({"key": key, "label": meta["label"], "unit": meta["unit"], "value": analysis["metrics"][key], "ref": round(ref["stats"].get(key, [0, 0])[0], 1), "ref_sd": None, "z": None, "status": "info"})

    track, w0, w1 = feature_track(analysis)
    a = resample(track)
    d, path, steps = dtw(a, np.asarray(ref["template_track"]))
    sim = similarity(d, ref["tau"])

    # Map resampled steps back to the kicker's frames and label them by phase.
    span = max(w1 - w0, 1)
    frames = np.array([w0 + p * span / (RESAMPLE - 1) for p, _ in path])
    ph = analysis["phases"]
    phase_of = np.where(frames < ph["backswing"], "backswing", np.where(frames <= ph["contact"], "strike", "follow"))
    by_phase = {}
    for name in ("backswing", "strike", "follow"):
        sel = steps[phase_of == name]
        by_phase[name] = round(similarity(float(sel.mean()), ref["tau"]) if sel.size else sim, 1)
    zs = {r["key"]: (0.0 if METRICS[r["key"]].get("higher_is_better") and r["z"] > 0 else r["z"]) for r in rows if r["z"] is not None}
    by_phase["base"] = round((z_to_score(zs["plant_offset"]) + z_to_score(zs["trunk_lean"])) / 2, 1)

    metric_scores = [z_to_score(z) for z in zs.values()]
    # One big fault should not drown in five good numbers: the worst metric costs extra.
    overall = round(max(0.0, 0.4 * sim + 0.6 * float(np.mean(metric_scores)) - 0.25 * (100 - min(metric_scores))))

    # Ghost: for every kicker frame, which reference frame to draw.
    ref_w0, ref_w1 = ref["template_window"]
    ref_span = max(ref_w1 - ref_w0, 1)
    ratio = ref["fps"] / analysis["fps"]
    pairs = {}
    for p, q in path:
        pairs.setdefault(p, []).append(q)
    ghost = []
    for i in range(analysis["n_frames"]):
        if i < w0:
            j = ref_w0 - (w0 - i) * ratio
        elif i > w1:
            j = ref_w1 + (i - w1) * ratio
        else:
            k = int(round((i - w0) / span * (RESAMPLE - 1)))
            q = float(np.median(pairs.get(k, [k])))
            j = ref_w0 + q * ref_span / (RESAMPLE - 1)
        ghost.append(int(np.clip(round(j), 0, ref["n_frames"] - 1)))

    worst = max(rows[: len(METRICS)], key=lambda r: abs(zs[r["key"]]))
    return {
        "ref_id": ref["id"],
        "ref_name": ref["name"],
        "score": overall,
        "similarity": round(sim, 1),
        "phase_scores": [{"key": k, "label": PHASE_LABELS[k], "score": by_phase[k]} for k in PHASES],
        "metrics": rows,
        "focus": worst["key"] if abs(zs[worst["key"]]) >= 1 else None,
        "ghost_frames": ghost,
        "ghost_swap": analysis["kick_foot"] != ref["foot"],
        "dtw": round(d, 3),
    }
