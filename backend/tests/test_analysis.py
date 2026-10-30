import numpy as np
import pytest

from app import skeleton as sk
from app.analysis import AnalysisError, analyze
from app.synthetic import generate


def run(ball=True, **kw):
    g = generate(**kw)
    a = analyze(g["landmarks"], g["fps"], g["width"], g["height"], ball=g["ball"] if ball else None)
    return g["truth"], a


def test_joint_angle_right_angle():
    a, b, c = np.array([[0.0, 0.0]]), np.array([[0.0, 1.0]]), np.array([[1.0, 1.0]])
    assert sk.joint_angle(a, b, c)[0] == pytest.approx(90.0)


def test_segment_angle_forward_is_positive():
    start, end = np.array([[0.0, 0.0]]), np.array([[1.0, 1.0]])
    assert sk.segment_angle(start, end)[0] == pytest.approx(45.0)


@pytest.mark.parametrize("kw", [{}, {"direction": -1}, {"foot": "left"}, {"fps": 240}, {"knee_contact": 150, "lean": -12, "plant_offset_cm": 15}, {"noise_px": 2.0, "seed": 3}])
def test_recovers_truth_with_ball(kw):
    t, a = run(**kw)
    m = a["metrics"]
    assert abs(a["phases"]["contact_t"] - t["contact"]) <= 1.0
    assert m["knee_contact"] == pytest.approx(t["knee_contact"], abs=6)
    assert m["trunk_lean"] == pytest.approx(t["lean"], abs=1.5)
    assert m["plant_offset"] == pytest.approx(t["plant_offset_cm"], abs=1.5)
    assert m["backswing_knee"] == pytest.approx(t["backswing_knee"], abs=3)
    assert a["scale"]["source"] == "ball"
    assert a["scale"]["m_per_px"] == pytest.approx(t["m_per_px"], rel=0.02)


@pytest.mark.parametrize("kw", [{}, {"fps": 60}, {"swing": 1.3, "seed": 5}])
def test_without_ball_is_close(kw):
    t, a = run(ball=False, **kw)
    assert abs(a["phases"]["contact_t"] - t["contact"]) <= 1.0
    assert a["metrics"]["knee_contact"] == pytest.approx(t["knee_contact"], abs=8)
    assert a["metrics"]["plant_offset"] == pytest.approx(t["plant_offset_cm"], abs=8)
    assert a["scale"]["source"] == "assumed"


def test_kicking_foot_and_direction_detected():
    _, a = run(foot="left", direction=-1)
    assert a["kick_foot"] == "left"
    assert a["mirrored"] is True


@pytest.mark.parametrize("ok", [True, False])
def test_kinetic_chain_order(ok):
    t, a = run(chain_ok=ok)
    assert t["chain_ok"] is ok
    assert a["chain"]["order_ok"] is ok


def test_phases_are_ordered():
    _, a = run()
    ph = a["phases"]
    assert ph["backswing"] < ph["contact"] < ph["follow"]
    assert ph["plant"] <= ph["contact"]
    assert a["window"][0] <= min(ph["plant"], ph["backswing"]) and a["window"][1] >= ph["follow"]


def test_slower_swing_means_slower_shank():
    _, fast = run(swing=0.95, seed=1)
    _, slow = run(swing=1.35, seed=1)
    assert slow["metrics"]["shank_speed"] < fast["metrics"]["shank_speed"] - 150


def test_rejects_garbage():
    with pytest.raises(AnalysisError):
        analyze(np.zeros((5, 33, 4)), 120, 1280, 720)
    with pytest.raises(AnalysisError):
        analyze(np.zeros((100, 20, 4)), 120, 1280, 720)
    with pytest.raises(AnalysisError):
        analyze(np.zeros((100, 33, 4)), 120, 1280, 720)  # nothing visible
