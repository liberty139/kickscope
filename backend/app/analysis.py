"""From raw landmarks to phases and measurements of one kick.

Pipeline: pixels → fill gaps → smooth → face the kick to +x → pick the kicking
leg → phases (plant, backswing, contact, follow-through) → measurements.
Nothing here guesses: every number is geometry on the tracked points.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from . import skeleton as sk
from .signal import fill_gaps, smooth, speed

BALL_DIAMETER_M = 0.22  # size 5
LEG_SHARE_OF_HEIGHT = 0.491  # thigh + shank, Winter's anthropometric tables
ASSUMED_HEIGHT_M = 1.70


class AnalysisError(ValueError):
    pass


@dataclass
class Track:
    """Smoothed pixel points facing +x, with the kicking side known."""

    points: np.ndarray  # (frames, 33, 2)
    fps: float
    width: int
    height: int
    kick: str
    mirrored: bool
    ball: np.ndarray | None  # centre in pixels, already mirrored
    ball_r: float | None
    missing: float

    @property
    def n(self) -> int:
        return self.points.shape[0]

    def leg(self, which: str) -> dict[str, np.ndarray]:
        side = self.kick if which == "kick" else sk.other(self.kick)
        return {name: self.points[:, idx] for name, idx in sk.LEG[side].items()}


def prepare(landmarks, fps: float, width: int, height: int, ball: dict | None = None, foot: str = "auto") -> Track:
    lm = np.asarray(landmarks, dtype=float)
    if lm.ndim != 3 or lm.shape[1] != sk.N_POINTS or lm.shape[2] < 2:
        raise AnalysisError("Ожидаются кадры × 33 точки × (x, y[, z, видимость])")
    if lm.shape[0] < max(12, int(0.35 * fps)):
        raise AnalysisError("Слишком короткий отрезок: нужен весь удар, от замаха до сопровождения")
    if not (5 <= fps <= 1000):
        raise AnalysisError("Странная частота кадров")
    vis = lm[:, :, 3] if lm.shape[2] >= 4 else np.ones(lm.shape[:2])
    pts = lm[:, :, :2] * np.array([width, height], dtype=float)
    pts, missing = fill_gaps(pts, vis)
    if missing > 0.6:
        raise AnalysisError("Скелет почти не виден: снимите игрока целиком и при хорошем свете")
    pts = smooth(pts, fps)

    peaks = {}
    for side in ("left", "right"):
        v = smooth(pts[:, sk.LEG[side]["foot"]], fps, deriv=1)
        s = np.linalg.norm(v, axis=-1)
        i = int(np.argmax(s[2:-2])) + 2
        peaks[side] = (s[i], v[i, 0])
    kick = foot if foot in ("left", "right") else max(peaks, key=lambda k: peaks[k][0])
    mirrored = peaks[kick][1] < 0
    b = None
    r = None
    if ball:
        b = np.array([ball["x"] * width, ball["y"] * height], dtype=float)
        r = float(ball.get("r") or 0) * width or None
    if mirrored:
        pts = pts.copy()
        pts[:, :, 0] = width - pts[:, :, 0]
        if b is not None:
            b[0] = width - b[0]
    return Track(pts, float(fps), int(width), int(height), kick, bool(mirrored), b, r, missing)


def _subframe(y: np.ndarray, i: int) -> float:
    """Parabolic refinement of a maximum at sample i."""
    if 0 < i < len(y) - 1:
        den = y[i - 1] - 2 * y[i] + y[i + 1]
        if den < 0:
            return i + float(np.clip(0.5 * (y[i - 1] - y[i + 1]) / den, -0.5, 0.5))
    return float(i)


def _at(series: np.ndarray, t: float) -> np.ndarray | float:
    """Linear interpolation at a fractional frame; works for (frames,) and (frames, d)."""
    i = int(np.clip(np.floor(t), 0, len(series) - 2))
    w = t - i
    return series[i] * (1 - w) + series[i + 1] * w


def _phases(tr: Track, contact: int | None) -> dict:
    fps, n = tr.fps, tr.n
    K, S = tr.leg("kick"), tr.leg("support")
    foot_speed = speed(K["foot"], fps)
    toe_y = K["foot"][:, 1]
    edge = 2
    if contact is not None:
        c = int(np.clip(contact, edge, n - 1 - edge))
        ct = float(c)
        confident = True
    else:
        peak = int(np.argmax(foot_speed[edge : n - edge])) + edge
        # The ball lies on the ground: contact is the bottom of the foot's arc near its fastest moment.
        k = int(round(0.06 * fps)) + 1
        lo, hi = max(edge, peak - k), min(n - edge, peak + k + 1)
        c = lo + int(np.argmax(toe_y[lo:hi]))
        # The toe often skims the ground for several frames; take the middle of that flat bottom.
        leg_px = float(np.median(np.linalg.norm(K["hip"] - K["knee"], axis=-1) + np.linalg.norm(K["knee"] - K["ankle"], axis=-1)))
        near = toe_y >= toe_y[c] - max(1.5, 0.012 * leg_px)
        a, z = c, c
        while a - 1 >= lo and near[a - 1]:
            a -= 1
        while z + 1 < hi and near[z + 1]:
            z += 1
        ct = (a + z) / 2 if z > a else _subframe(toe_y, c)
        c = int(round(ct))
        if tr.ball is not None:
            k = int(round(0.04 * fps)) + 1
            lo, hi = max(edge, c - k), min(n - edge, c + k + 1)
            gap = np.abs(np.linalg.norm(K["foot"][lo:hi] - tr.ball, axis=-1) - (tr.ball_r or 0))
            c = lo + int(np.argmin(gap))
            ct = _subframe(-np.abs(np.linalg.norm(K["foot"] - tr.ball, axis=-1) - (tr.ball_r or 0)), c)
        confident = bool(foot_speed[peak] > 3 * np.median(foot_speed) and edge < c < n - 1 - edge)

    knee = sk.joint_angle(K["hip"], K["knee"], K["ankle"])
    lo = max(0, c - int(0.5 * fps))
    b = lo + int(np.argmin(knee[lo:c])) if c > lo else c

    sup_speed = speed(S["ankle"], fps)
    w = max(3, int(round(0.06 * fps)))
    sup_speed = np.convolve(sup_speed, np.ones(w) / w, mode="same")
    lo = max(0, c - int(0.8 * fps))
    threshold = 0.2 * float(np.max(sup_speed[lo : c + 1]))
    p = None
    for i in range(max(0, c - int(0.45 * fps)), c + 1):
        if np.all(sup_speed[i : c + 1] < threshold):
            p = i
            break
    if p is None:
        p = max(0, c - int(round(0.08 * fps)))

    f = min(n - 1, c + int(0.35 * fps))
    after = np.nonzero(foot_speed[c + 1 :] < 0.2 * foot_speed[c])[0]
    if after.size:
        f = min(f, c + 1 + int(after[0]))
    return {"plant": int(p), "backswing": int(b), "contact": int(c), "contact_t": round(ct, 3), "follow": int(f), "confident": confident}


def _scale(tr: Track, height_cm: float | None) -> dict:
    if tr.ball_r:
        return {"m_per_px": BALL_DIAMETER_M / (2 * tr.ball_r), "source": "ball"}
    S = tr.leg("support")
    leg_px = float(np.median(np.linalg.norm(S["hip"] - S["knee"], axis=-1) + np.linalg.norm(S["knee"] - S["ankle"], axis=-1)))
    h = (height_cm / 100) if height_cm else ASSUMED_HEIGHT_M
    return {"m_per_px": LEG_SHARE_OF_HEIGHT * h / max(leg_px, 1e-6), "source": "height" if height_cm else "assumed"}


def analyze(landmarks, fps: float, width: int, height: int, ball: dict | None = None, foot: str = "auto", height_cm: float | None = None, contact: int | None = None) -> dict:
    tr = prepare(landmarks, fps, width, height, ball, foot)
    ph = _phases(tr, contact)
    p, b, c, f = ph["plant"], ph["backswing"], ph["contact"], ph["follow"]
    K, S = tr.leg("kick"), tr.leg("support")
    P = tr.points

    knee = sk.joint_angle(K["hip"], K["knee"], K["ankle"])
    hip = sk.joint_angle(P[:, sk.LEG[tr.kick]["shoulder"]], K["hip"], K["knee"])
    thigh = sk.segment_angle(K["hip"], K["knee"])
    shank = sk.segment_angle(K["knee"], K["ankle"])
    footseg = sk.segment_angle(K["ankle"], K["foot"])
    trunk = sk.trunk_lean(P)
    w_thigh, w_shank, w_foot = (smooth(a, tr.fps, deriv=1) for a in (thigh, shank, footseg))

    scale = _scale(tr, height_cm)
    m = scale["m_per_px"]
    foot_v = speed(K["foot"], tr.fps) * m

    hi = min(tr.n - 1, c + 2)
    swing = slice(b, hi + 1)
    t_thigh = b + int(np.argmax(w_thigh[swing]))
    t_shank = b + int(np.argmax(w_shank[swing]))
    t_foot = b + int(np.argmax(w_foot[swing]))
    ms = 1000 / tr.fps
    # Proximal → distal: the thigh has to peak before the shank, or speed leaks out of the chain.
    chain_ok = t_shank > t_thigh

    ct = ph["contact_t"]
    if tr.ball is not None:
        # The instep meets the ball at its rear-lower part, about 30° below the centre.
        contact_x = tr.ball[0] - 0.87 * (tr.ball_r or 0)
    else:
        contact_x = float(_at(K["foot"][:, 0], ct))
    metrics = {
        "knee_contact": float(_at(knee, ct)),
        "trunk_lean": float(_at(trunk, ct)),
        "plant_offset": float((_at(S["ankle"][:, 0], ct) - contact_x) * m * 100),
        "shank_speed": float(np.max(w_shank[swing])),
        "backswing_knee": float(knee[b]),
        "chain_lag": float((t_shank - t_thigh) * ms),
        "foot_speed": float(np.max(foot_v[max(0, c - 2) : c + 1])),
    }
    w0 = max(0, min(p, b) - int(round(0.15 * tr.fps)))
    w1 = min(tr.n - 1, f + int(round(0.05 * tr.fps)))
    r1 = lambda a: [round(float(x), 1) for x in a]  # noqa: E731
    return {
        "fps": tr.fps,
        "n_frames": tr.n,
        "width": tr.width,
        "height": tr.height,
        "kick_foot": tr.kick,
        "mirrored": tr.mirrored,
        "missing_share": round(tr.missing, 3),
        "phases": ph,
        "window": [w0, w1],
        "scale": scale,
        "metrics": {k: round(v, 2) for k, v in metrics.items()},
        "chain": {
            "order_ok": bool(chain_ok),
            "thigh_ms": round((t_thigh - c) * ms, 1),
            "shank_ms": round((t_shank - c) * ms, 1),
            "foot_ms": round((t_foot - c) * ms, 1),
        },
        "series": {
            "knee": r1(knee),
            "hip": r1(hip),
            "thigh": r1(thigh),
            "shank": r1(shank),
            "trunk": r1(trunk),
            "shank_speed": r1(w_shank),
            "foot_speed": [round(float(x), 2) for x in foot_v],
        },
    }


def normalized_frames(landmarks, analysis: dict) -> np.ndarray:
    """The kick facing +x, pelvis-centred and torso-scaled — what the ghost overlay draws."""
    tr = prepare(landmarks, analysis["fps"], analysis["width"], analysis["height"], None, analysis["kick_foot"])
    norm, _ = sk.normalize(tr.points)
    return norm
