"""Building a reference ("эталон") from a handful of good kicks."""

from __future__ import annotations

import math

import numpy as np

from .compare import INFO_METRICS, METRICS, dtw, feature_track, resample
from .synthetic import KickParams, generate
from .analysis import analyze, normalized_frames


def build(ref_id: str, name: str, kicks: list[tuple[dict, list]], source: str, is_demo: bool = False) -> dict:
    """`kicks` are (analysis, landmarks) pairs. The medoid becomes the template the ghost draws."""
    if not kicks:
        raise ValueError("Нужен хотя бы один удар для эталона")
    tracks = [resample(feature_track(a)[0]) for a, _ in kicks]
    n = len(tracks)
    dist = np.zeros((n, n))
    for i in range(n):
        for j in range(i + 1, n):
            dist[i, j] = dist[j, i] = dtw(tracks[i], tracks[j])[0]
    medoid = int(np.argmin(dist.sum(axis=1))) if n > 1 else 0
    others = [dist[medoid, j] for j in range(n) if j != medoid]
    # τ so that a typical reference kick scores about 92 against the template.
    tau = (float(np.median(others)) / math.log(100 / 92)) if others else 0.6
    tau = max(tau, 0.15)

    stats = {}
    for key in list(METRICS) + list(INFO_METRICS):
        vals = np.array([a["metrics"][key] for a, _ in kicks], dtype=float)
        stats[key] = [float(vals.mean()), float(vals.std(ddof=1)) if n > 1 else 0.0]

    a, lm = kicks[medoid]
    norm = normalized_frames(lm, a)
    if a["kick_foot"] == "left":
        from .skeleton import swap_sides

        norm = swap_sides(norm)
    return {
        "id": ref_id,
        "name": name,
        "source": source,
        "is_demo": is_demo,
        "foot": "right",
        "fps": a["fps"],
        "n_frames": a["n_frames"],
        "n_kicks": n,
        "template_track": tracks[medoid].round(4).tolist(),
        "template_window": a["window"],
        "template_phases": a["phases"],
        "frames": norm[:, :, :2].round(4).tolist(),
        "stats": stats,
        "tau": tau,
    }


def demo_reference() -> dict:
    """Eight clean synthetic kicks with small natural variation — a stand-in until a coach records real ones."""
    rng = np.random.default_rng(42)
    kicks = []
    for i in range(8):
        g = generate(
            KickParams(
                knee_contact=170 + rng.normal(0, 2),
                backswing_knee=105 + rng.normal(0, 3),
                lean=3 + rng.normal(0, 1.5),
                plant_offset_cm=-6 + rng.normal(0, 3),
                swing=1.0 + rng.normal(0, 0.04),
                seed=100 + i,
            )
        )
        kicks.append((analyze(g["landmarks"], g["fps"], g["width"], g["height"], ball=g["ball"]), g["landmarks"]))
    return build("demo-pro", "Эталон (демо, синтетический)", kicks, source="synthetic", is_demo=True)
