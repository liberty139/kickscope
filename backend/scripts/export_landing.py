"""Exports two synthetic kicks for the landing animation: a clean one and one with typical faults.

Run from backend/: .venv/Scripts/python -m scripts.export_landing
Writes ../frontend/src/data/kick.json (60 fps, the 17 points we draw, ball path, knee angle, shank speed).
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from app.analysis import analyze
from app.synthetic import generate

POINTS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]
OUT = Path(__file__).resolve().parents[2] / "frontend" / "src" / "data" / "kick.json"


def export(**kw) -> dict:
    g = generate(fps=120, noise_px=0.0, **kw)
    a = analyze(g["landmarks"], g["fps"], g["width"], g["height"], ball=g["ball"])
    lm = g["landmarks"][::2, POINTS, :2]  # 60 fps
    c = a["phases"]["contact"] // 2
    n = lm.shape[0]
    bx, by, br = g["ball"]["x"], g["ball"]["y"], g["ball"]["r"]
    aspect = g["width"] / g["height"]
    ball = []
    for i in range(n):
        dt = max(0, i - c) / 60
        # After contact: fast and slightly rising, with gravity; normalised x is per width, y per height.
        x = bx + 26 * dt / 3.4 / aspect * 0.56
        y = by - (5.5 * dt - 4.9 * dt * dt) / 3.4 * 0.56
        ball.append([round(x, 4), round(y, 4)])
    return {
        "frames": np.round(lm, 4).tolist(),
        "ball": ball,
        "ball_r": round(br, 4),
        "contact": int(c),
        "plant": a["phases"]["plant"] // 2,
        "backswing": a["phases"]["backswing"] // 2,
        "knee": [round(v) for v in a["series"]["knee"][::2]],
        "shank_speed": [round(v) for v in a["series"]["shank_speed"][::2]],
        "metrics": {k: round(v, 1) for k, v in a["metrics"].items()},
    }


def main() -> None:
    data = {
        "aspect": 1280 / 720,
        "points": POINTS,
        "pro": export(seed=1),
        "player": export(seed=2, plant_offset_cm=-30, lean=-13, backswing_knee=128),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    print(f"{OUT} {OUT.stat().st_size / 1024:.0f} KB, frames {len(data['pro']['frames'])}/{len(data['player']['frames'])}")


if __name__ == "__main__":
    main()
