"""A side-view kick generator that outputs MediaPipe-shaped landmarks.

It drives tests (known ground truth), the demo reference and demo players until
real clips are collected. Everything it makes is labelled as synthetic.
"""

from __future__ import annotations

from dataclasses import dataclass, replace

import numpy as np
from scipy.interpolate import PchipInterpolator

from . import skeleton as sk


@dataclass(frozen=True)
class KickParams:
    fps: float = 120.0
    knee_contact: float = 170.0  # interior knee angle of the kicking leg at contact
    backswing_knee: float = 105.0  # interior knee angle at the top of the backswing
    lean: float = 3.0  # trunk lean at contact, positive = over the ball
    plant_offset_cm: float = -8.0  # support ankle relative to the foot–ball contact point, along the kick
    swing: float = 1.0  # >1 makes the forward swing slower
    chain_ok: bool = True  # thigh peaks before shank (proximal → distal)
    foot: str = "right"
    direction: int = 1  # +1: kick goes right in the image, -1: left
    height_m: float = 1.70
    noise_px: float = 1.0
    seed: int = 0
    width: int = 1280
    height: int = 720


def _d(theta_deg: np.ndarray) -> np.ndarray:
    t = np.radians(theta_deg)
    return np.stack([np.sin(t), np.cos(t)], axis=-1)


def _curve(points: list[tuple[float, float]], t: np.ndarray) -> np.ndarray:
    xs, ys = zip(*sorted(points))
    return PchipInterpolator(np.array(xs), np.array(ys), extrapolate=True)(t)


def _timeline(p: KickParams) -> dict[str, float]:
    tp, tb = 0.70, 0.74
    tc = tb + 0.12 * p.swing
    return {"tp": tp, "tb": tb, "tc": tc, "tf": tc + 0.14, "end": tc + 0.62}


def _angles(p: KickParams, t: np.ndarray, support_shift: float) -> dict[str, np.ndarray]:
    k = _timeline(p)
    tp, tb, tc, tf, end = k["tp"], k["tb"], k["tc"], k["tf"], k["end"]
    swing = tc - tb
    thigh_c = 22.0
    shank_c = thigh_c - (180.0 - p.knee_contact)
    thigh_b = -30.0
    shank_b = thigh_b - (180.0 - p.backswing_knee)
    if p.chain_ok:
        mid_t, thigh_m, shank_m = tb + 0.45 * swing, 10.0, shank_b + 0.33 * (shank_c - shank_b)
    else:
        mid_t, thigh_m, shank_m = tb + 0.6 * swing, -22.0, shank_c - 15.0
    approach_k = [(0.0, 20, 5), (0.18, -20, -40), (0.36, 25, 10), (0.54, -15, -30), (tp, -25, -80)]
    kick_thigh = [(a, b) for a, b, _ in approach_k] + [(tb, thigh_b), (mid_t, thigh_m), (tc, thigh_c), (tf, 70), (tf + 0.2, 35), (end, 10)]
    kick_shank = [(a, c) for a, _, c in approach_k] + [(tb, shank_b), (mid_t, shank_m), (tc, shank_c), (tf, 68), (tf + 0.2, 25), (end, 5)]
    s = support_shift
    sup_thigh = [(0.0, -20), (0.18, 25), (0.36, -20), (0.54, 28), (tp, 12 + s), (tc, 2 + s), (tf, -8 + s * 0.6), (tf + 0.2, -5), (end, 0)]
    sup_shank = [(0.0, -35), (0.18, 10), (0.36, -40), (0.54, 12), (tp, -2 + s), (tc, -10 + s), (tf, -12 + s * 0.6), (tf + 0.2, -8), (end, 0)]
    return {
        "kick_thigh": _curve(kick_thigh, t),
        "kick_shank": _curve(kick_shank, t),
        "kick_plantar": _curve([(0, 10), (0.18, 25), (0.36, 10), (0.54, 25), (tp, 35), (tb, 40), (tc, 55), (tf, 40), (end, 10)], t),
        "sup_thigh": _curve(sup_thigh, t),
        "sup_shank": _curve(sup_shank, t),
        "sup_plantar": _curve([(0, 25), (0.18, 10), (0.36, 25), (0.54, 10), (tp, 5), (end, 5)], t),
        "trunk": _curve([(0, 12), (0.54, 10), (tp, 7), (tc, p.lean), (tf, p.lean - 4), (end, 4)], t),
        "arm_sup": _curve([(0, -20), (0.36, 20), (tp, 40), (tc, 80), (tf, 60), (end, 10)], t),
        "arm_kick": _curve([(0, 20), (0.36, -20), (tp, -30), (tc, -40), (end, -5)], t),
        "speed": _curve([(0, 3.0), (0.5, 2.6), (tp, 1.3), (tc, 0.7), (tc + 0.25, 0.4), (end, 0.1)], t),
    }


def _world(p: KickParams, support_shift: float) -> tuple[np.ndarray, dict]:
    """Right-footed kick towards +x in metres (y down, ground at 0). Returns (frames, 33, 2) and timing."""
    k = _timeline(p)
    n = int(round(k["end"] * p.fps)) + 1
    t = np.arange(n) / p.fps
    a = _angles(p, t, support_shift)
    H = p.height_m
    thigh, shank, foot_len, trunk_len = 0.245 * H, 0.246 * H, 0.152 * H, 0.288 * H
    pelvis_x = np.concatenate([[0.0], np.cumsum((a["speed"][1:] + a["speed"][:-1]) / 2 / p.fps)])

    def leg(hip, th, sh, plantar):
        knee = hip + thigh * _d(th)
        ankle = knee + shank * _d(sh)
        fdir = sh + 90 - plantar
        toe = ankle + 0.75 * foot_len * _d(fdir)
        heel = ankle + 0.25 * foot_len * _d(fdir + 180) + 0.024 * H * _d(sh)
        return knee, ankle, heel, toe

    zero = np.zeros((n, 2))
    hip_r, hip_l = zero + [0.02, 0], zero + [-0.02, 0]
    kr = leg(hip_r, a["kick_thigh"], a["kick_shank"], a["kick_plantar"])
    sl = leg(hip_l, a["sup_thigh"], a["sup_shank"], a["sup_plantar"])
    lowest = np.max(np.stack([kr[2][:, 1], kr[3][:, 1], sl[2][:, 1], sl[3][:, 1]]), axis=0)
    # From the plant to the end of the follow-through the body stands on the support foot alone;
    # the kicking foot swings through the ball's height instead of lifting the whole body.
    stance = (t >= k["tp"]) & (t <= k["tf"] + 0.1)
    lowest[stance] = np.max(np.stack([sl[2][stance, 1], sl[3][stance, 1]]), axis=0)
    origin = np.stack([pelvis_x, -lowest], axis=-1)

    P = np.zeros((n, sk.N_POINTS, 2))
    P[:, sk.R_HIP], P[:, sk.L_HIP] = hip_r, hip_l
    P[:, sk.R_KNEE], P[:, sk.R_ANKLE], P[:, sk.R_HEEL], P[:, sk.R_FOOT] = kr
    P[:, sk.L_KNEE], P[:, sk.L_ANKLE], P[:, sk.L_HEEL], P[:, sk.L_FOOT] = sl
    lean = a["trunk"]
    up = np.stack([np.sin(np.radians(lean)), -np.cos(np.radians(lean))], axis=-1)
    sm = trunk_len * up
    P[:, sk.R_SHOULDER], P[:, sk.L_SHOULDER] = sm + [0.02, 0], sm + [-0.02, 0]
    head_up = np.stack([np.sin(np.radians(lean + 10)), -np.cos(np.radians(lean + 10))], axis=-1)
    nose = sm + 0.13 * H * head_up + [0.05, 0]
    P[:, sk.NOSE] = nose
    for i, off in zip(range(1, 11), [(0.0, -0.025), (0.005, -0.028), (0.01, -0.025), (0.0, -0.025), (0.005, -0.028), (0.01, -0.025), (-0.07, -0.01), (-0.07, -0.01), (-0.005, 0.025), (0.005, 0.025)]):
        P[:, i] = nose + off
    for side, arm, sh_idx, el_idx, wr_idx, hand in (
        ("sup", a["arm_sup"], sk.L_SHOULDER, sk.L_ELBOW, sk.L_WRIST, (17, 19, 21)),
        ("kick", a["arm_kick"], sk.R_SHOULDER, sk.R_ELBOW, sk.R_WRIST, (18, 20, 22)),
    ):
        elbow = P[:, sh_idx] + 0.186 * H * _d(arm)
        wrist = elbow + 0.146 * H * _d(arm + 35)
        P[:, el_idx], P[:, wr_idx] = elbow, wrist
        for j, extra in zip(hand, (-8, 0, 8)):
            P[:, j] = wrist + 0.06 * _d(arm + 35 + extra)
    P += origin[:, None, :]
    ic = int(round(k["tc"] * p.fps))
    timing = {key: int(round(val * p.fps)) for key, val in k.items() if key != "end"} | {"n": n, "contact": ic}
    return P, timing


def _contact(P: np.ndarray, timing: dict, fps: float) -> int:
    """The ball lies on the ground, so the foot meets it at the bottom of its arc."""
    lo, hi = timing["tb"], min(P.shape[0] - 1, timing["tb"] + int(0.3 * fps))
    return lo + int(np.argmax(P[lo : hi + 1, sk.R_FOOT, 1]))


def generate(params: KickParams | None = None, **overrides) -> dict:
    """Landmarks (frames, 33, 4) normalised like MediaPipe, plus the ball and the ground truth."""
    p = replace(params or KickParams(), **overrides)
    lo, hi = -30.0, 30.0
    # Tilting the support leg moves the planted foot; find the tilt that gives the requested offset.
    for _ in range(40):
        mid = (lo + hi) / 2
        P, timing = _world(p, mid)
        c = _contact(P, timing, p.fps)
        offset = (P[c, sk.L_ANKLE, 0] - P[c, sk.R_FOOT, 0]) * 100
        if offset < p.plant_offset_cm:
            lo = mid
        else:
            hi = mid
    r_ball = 0.11
    toe = P[c, sk.R_FOOT]
    # The toe meets the ball at its rear-lower point, 30° below the centre.
    ball = toe + r_ball * np.array([np.cos(np.radians(30)), -np.sin(np.radians(30))])

    ppm = 0.56 * p.height / p.height_m
    ground = 0.88 * p.height

    def px(xy):
        x = (xy[..., 0] - ball[0]) * ppm + 0.62 * p.width
        y = xy[..., 1] * ppm + ground
        if p.direction < 0:
            x = p.width - x
        return np.stack([x, y], axis=-1)

    pts = px(P)
    truth = _truth(P, c, p)
    rng = np.random.default_rng(p.seed)
    pts = pts + rng.normal(0, p.noise_px, pts.shape)
    vis = rng.uniform(0.9, 0.99, pts.shape[:2])
    lm = np.zeros((pts.shape[0], sk.N_POINTS, 4))
    lm[..., 0] = pts[..., 0] / p.width
    lm[..., 1] = pts[..., 1] / p.height
    lm[..., 3] = vis
    if p.foot == "left":
        lm = sk.swap_sides(lm)
    b = px(ball)
    return {
        "landmarks": lm,
        "fps": p.fps,
        "width": p.width,
        "height": p.height,
        "ball": {"x": float(b[0] / p.width), "y": float(b[1] / p.height), "r": float(r_ball * ppm / p.width)},
        "truth": truth | {"plant": timing["tp"], "foot": p.foot, "direction": p.direction, "m_per_px": 1 / ppm},
    }


def _truth(P: np.ndarray, c: int, p: KickParams) -> dict:
    """Measurements on the clean, noise-free kinematics — what the analysis should recover."""
    knee = sk.joint_angle(P[:, sk.R_HIP], P[:, sk.R_KNEE], P[:, sk.R_ANKLE])
    lo = max(0, c - int(0.5 * p.fps))
    b = lo + int(np.argmin(knee[lo:c]))
    thigh = np.gradient(sk.segment_angle(P[:, sk.R_HIP], P[:, sk.R_KNEE]))
    shank = np.gradient(sk.segment_angle(P[:, sk.R_KNEE], P[:, sk.R_ANKLE]))
    return {
        "contact": c,
        "backswing": b,
        "knee_contact": float(knee[c]),
        "backswing_knee": float(knee[b]),
        "lean": float(sk.trunk_lean(P[[c]])[0]),
        "plant_offset_cm": float((P[c, sk.L_ANKLE, 0] - P[c, sk.R_FOOT, 0]) * 100),
        "chain_ok": bool(np.argmax(thigh[b : c + 3]) < np.argmax(shank[b : c + 3])),
    }
