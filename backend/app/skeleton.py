"""MediaPipe Pose landmark layout and the plane geometry we measure on it.

Coordinates are pixels with x to the right and y down. Angles of a segment are
measured from the downward vertical, positive when the segment points forward
(+x, the direction of the kick after mirroring).
"""

from __future__ import annotations

import numpy as np

N_POINTS = 33
NOSE = 0
L_SHOULDER, R_SHOULDER = 11, 12
L_ELBOW, R_ELBOW = 13, 14
L_WRIST, R_WRIST = 15, 16
L_HIP, R_HIP = 23, 24
L_KNEE, R_KNEE = 25, 26
L_ANKLE, R_ANKLE = 27, 28
L_HEEL, R_HEEL = 29, 30
L_FOOT, R_FOOT = 31, 32

# Pairs MediaPipe calls left/right; swapping them turns a left-footed kick into a right-footed one.
SIDE_PAIRS = [(1, 4), (2, 5), (3, 6), (7, 8), (9, 10), (11, 12), (13, 14), (15, 16), (17, 18), (19, 20), (21, 22), (23, 24), (25, 26), (27, 28), (29, 30), (31, 32)]

LEG = {
    "left": {"hip": L_HIP, "knee": L_KNEE, "ankle": L_ANKLE, "heel": L_HEEL, "foot": L_FOOT, "shoulder": L_SHOULDER},
    "right": {"hip": R_HIP, "knee": R_KNEE, "ankle": R_ANKLE, "heel": R_HEEL, "foot": R_FOOT, "shoulder": R_SHOULDER},
}


def other(side: str) -> str:
    return "left" if side == "right" else "right"


def swap_sides(points: np.ndarray) -> np.ndarray:
    out = points.copy()
    for a, b in SIDE_PAIRS:
        out[:, [a, b]] = points[:, [b, a]]
    return out


def hip_mid(p: np.ndarray) -> np.ndarray:
    return (p[:, L_HIP] + p[:, R_HIP]) / 2


def shoulder_mid(p: np.ndarray) -> np.ndarray:
    return (p[:, L_SHOULDER] + p[:, R_SHOULDER]) / 2


def joint_angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> np.ndarray:
    """Interior angle at b in degrees, one value per frame."""
    u, v = a - b, c - b
    cos = np.sum(u * v, axis=-1) / np.maximum(np.linalg.norm(u, axis=-1) * np.linalg.norm(v, axis=-1), 1e-9)
    return np.degrees(np.arccos(np.clip(cos, -1.0, 1.0)))


def segment_angle(start: np.ndarray, end: np.ndarray) -> np.ndarray:
    """Direction of start→end from the downward vertical, degrees, unwrapped over time."""
    d = end - start
    return np.degrees(np.unwrap(np.arctan2(d[..., 0], d[..., 1])))


def trunk_lean(p: np.ndarray) -> np.ndarray:
    """Hip-centre → shoulder-centre from the upward vertical; positive = leaning forward over the ball."""
    d = shoulder_mid(p) - hip_mid(p)
    return np.degrees(np.arctan2(d[:, 0], -d[:, 1]))


def normalize(p: np.ndarray) -> tuple[np.ndarray, float]:
    """Pelvis-centred frames scaled by median torso length, for overlaying one kick on another."""
    torso = float(np.median(np.linalg.norm(shoulder_mid(p) - hip_mid(p), axis=-1)))
    torso = max(torso, 1e-6)
    return (p - hip_mid(p)[:, None, :]) / torso, torso
