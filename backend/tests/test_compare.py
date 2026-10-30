import numpy as np
import pytest

from app.advice import check, rules
from app.analysis import analyze
from app.compare import compare, dtw
from app.reference import demo_reference
from app.synthetic import generate


@pytest.fixture(scope="module")
def ref():
    return demo_reference()


def kick(**kw):
    g = generate(**kw)
    return analyze(g["landmarks"], g["fps"], g["width"], g["height"], ball=g["ball"])


def test_dtw_aligns_a_time_warped_copy():
    t = np.linspace(0, 1, 80)
    a = np.stack([np.sin(2 * np.pi * t), np.cos(2 * np.pi * t)], axis=-1)
    warped_t = t**1.4
    b = np.stack([np.sin(2 * np.pi * warped_t), np.cos(2 * np.pi * warped_t)], axis=-1)
    d_warp, path, _ = dtw(a, b, band=0.3)
    d_other = dtw(a, -b, band=0.3)[0]
    assert d_warp < 0.1 < d_other
    assert path[0] == (0, 0) and path[-1] == (79, 79)


def test_good_kick_scores_high_and_has_no_focus(ref):
    r = compare(kick(seed=7), ref)
    assert r["score"] >= 90
    assert r["focus"] is None


@pytest.mark.parametrize(
    "kw,focus",
    [
        ({"lean": -15}, "trunk_lean"),
        ({"plant_offset_cm": 28}, "plant_offset"),
        ({"chain_ok": False}, "chain_lag"),
        ({"backswing_knee": 135}, "backswing_knee"),
    ],
)
def test_faults_are_found(ref, kw, focus):
    good = compare(kick(seed=7), ref)
    bad = compare(kick(seed=8, **kw), ref)
    assert bad["focus"] == focus
    assert bad["score"] < good["score"] - 8


def test_faster_than_reference_is_not_a_fault(ref):
    r = compare(kick(seed=9, swing=0.85), ref)
    row = next(m for m in r["metrics"] if m["key"] == "shank_speed")
    assert row["z"] > 0 and row["status"] == "good"


def test_ghost_maps_every_frame(ref):
    a = kick(seed=10)
    r = compare(a, ref)
    g = r["ghost_frames"]
    assert len(g) == a["n_frames"]
    assert all(0 <= j < ref["n_frames"] for j in g)
    assert g == sorted(g)


def test_left_footed_ghost_is_swapped(ref):
    r = compare(kick(seed=11, foot="left"), ref)
    assert r["ghost_swap"] is True


def test_rules_text_uses_only_measured_numbers(ref):
    r = compare(kick(seed=12, lean=-15), ref)
    text = rules(r)
    assert "Корпус" in text
    assert check(text, r)


def test_check_rejects_invented_numbers_and_medicine(ref):
    r = compare(kick(seed=13), ref)
    assert not check("Скорость мяча 777 км/ч, удар отличный. Сделай 10 ударов.", r)
    assert not check("Есть риск травмы колена. Сделай 10 ударов.", r)
    assert check("Удар хороший. Сделай 10 ударов подряд.", r)
