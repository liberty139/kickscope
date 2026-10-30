"""Demo data: a synthetic reference and a youth team whose players fix one habit each over five weeks.

Everything created here is flagged is_demo and shown as «демо» in the interface.
"""

from __future__ import annotations

import time
from dataclasses import replace

import numpy as np

from . import store
from .advice import rules
from .analysis import analyze
from .compare import compare
from .reference import demo_reference
from .synthetic import KickParams, generate

WEEK = 7 * 24 * 3600

# Each player starts with one typical fault and moves towards the reference week by week.
PLAYERS = [
    ("Алихан", {"lean": (-15, -1)}),
    ("Тимур", {"plant_offset_cm": (-34, -8)}),
    ("Даня", {"chain_ok": (False, True)}),
    ("Айгерим", {"swing": (1.38, 1.04)}),
    ("Санжар", {"backswing_knee": (132, 106)}),
    ("Миша", {"foot": ("left", "left"), "lean": (-6, 2), "direction": (-1, -1)}),
]


def _params(spec: dict, week: int, weeks: int, seed: int) -> KickParams:
    k = week / max(weeks - 1, 1)
    kw = {}
    for name, (start, end) in spec.items():
        if isinstance(start, bool):
            kw[name] = end if week >= weeks - 2 else start
        elif isinstance(start, str) or name == "direction":
            kw[name] = start
        else:
            kw[name] = start + (end - start) * k
    return replace(KickParams(seed=seed), **kw)


def run(weeks: int = 5) -> dict:
    store.init()
    if store.has_demo():
        team = store.demo_team()
        return {"team_code": team["code"], "created": False}
    ref = demo_reference()
    store.save_ref(ref)
    team = store.create_team("Демо · U15", is_demo=True, code="DEMO1")
    now = time.time()
    rng = np.random.default_rng(7)
    featured = None
    for n, (name, spec) in enumerate(PLAYERS):
        player = store.create_player(name, team["code"], is_demo=True, created=now - weeks * WEEK)
        for w in range(weeks):
            g = generate(_params(spec, w, weeks, seed=1000 + n * 10 + w))
            analysis = analyze(g["landmarks"], g["fps"], g["width"], g["height"], ball=g["ball"])
            comparison = compare(analysis, ref)
            created = now - (weeks - 1 - w) * WEEK - rng.uniform(0, 2) * 3600
            aid = store.save_attempt(
                {
                    "player_id": player["id"],
                    "created": created,
                    "analysis": analysis | {"ball": g["ball"]},
                    "comparison": comparison,
                    "landmarks": np.round(g["landmarks"], 4).tolist(),
                    "advice": rules(comparison),
                    "advice_source": "rules",
                    "source": "demo",
                    "is_demo": True,
                }
            )
            if name == "Тимур" and w == 0:
                featured = aid
    return {"team_code": team["code"], "created": True, "featured": featured}


def featured_attempt() -> str | None:
    """The demo kick the landing and the pitch open: a clear fault with an obvious ghost difference."""
    with store.db() as c:
        row = c.execute(
            "select a.id from attempts a join players p on p.id = a.player_id where a.is_demo=1 and p.nickname='Тимур' order by a.created limit 1"
        ).fetchone()
    return row["id"] if row else None
