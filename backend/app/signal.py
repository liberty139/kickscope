"""Gap filling, smoothing and derivatives for noisy pose tracks."""

from __future__ import annotations

import numpy as np
from scipy.signal import savgol_filter


def window_for(fps: float) -> int:
    """About 45 ms of frames, odd, at least 5 — wide enough to tame jitter, narrow enough to keep the kick peak."""
    w = max(5, int(round(fps * 0.045)))
    return w if w % 2 else w + 1


def smooth(x: np.ndarray, fps: float, deriv: int = 0) -> np.ndarray:
    """Savitzky–Golay along time (axis 0); with deriv=1 the result is per second."""
    n = x.shape[0]
    w = min(window_for(fps), n if n % 2 else n - 1)
    if w < 3:
        return np.gradient(x, 1 / fps, axis=0) if deriv else x.copy()
    order = 2 if w <= 7 else 3
    order = min(order, w - 1)
    return savgol_filter(x, w, order, deriv=deriv, delta=1 / fps, axis=0, mode="interp")


def fill_gaps(points: np.ndarray, visibility: np.ndarray, threshold: float = 0.5) -> tuple[np.ndarray, float]:
    """Replace low-visibility samples by linear interpolation in time, per landmark. Returns the share replaced."""
    out = points.copy()
    weak = visibility < threshold
    n = points.shape[0]
    t = np.arange(n)
    for j in range(points.shape[1]):
        bad = weak[:, j]
        if not bad.any() or bad.all():
            continue
        for k in range(points.shape[2]):
            out[bad, j, k] = np.interp(t[bad], t[~bad], points[~bad, j, k])
    return out, float(weak.mean())


def speed(track: np.ndarray, fps: float) -> np.ndarray:
    """Speed of a (frames, 2) track in units per second."""
    return np.linalg.norm(smooth(track, fps, deriv=1), axis=-1)
