"""Kickscope API: analyse kicks from skeleton points, compare with a reference, coach in two sentences."""

from __future__ import annotations

import time
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import advice, config, seed, store
from .analysis import AnalysisError, analyze
from .compare import METRICS, compare
from .reference import build

MAX_FRAMES = 1200


@asynccontextmanager
async def lifespan(_: FastAPI):
    seed.run()
    yield


app = FastAPI(title="Kickscope", lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=1024)


class Ball(BaseModel):
    x: float
    y: float
    r: float | None = None


class AttemptIn(BaseModel):
    landmarks: list[list[list[float]]] = Field(min_length=12, max_length=MAX_FRAMES)
    fps: float = Field(gt=4, le=1000)
    width: int = Field(gt=0, le=8000)
    height: int = Field(gt=0, le=8000)
    ball: Ball | None = None
    foot: str = "auto"
    height_cm: float | None = Field(default=None, gt=80, lt=230)
    contact: int | None = None
    player_id: str | None = None
    ref_id: str | None = None
    source: str = "upload"


class RecomputeIn(BaseModel):
    contact: int | None = None
    ball: Ball | None = None
    ref_id: str | None = None
    foot: str | None = None


class PlayerIn(BaseModel):
    nickname: str = Field(min_length=1, max_length=40)
    team_code: str | None = None


class TeamIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)


class JoinIn(BaseModel):
    player_id: str


class RefIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    attempt_ids: list[str] = Field(min_length=1, max_length=30)


def _ref(ref_id: str | None) -> dict:
    ref = store.get_ref(ref_id) if ref_id else None
    ref = ref or store.get_ref("demo-pro")
    if not ref:
        raise HTTPException(503, "Эталон ещё не готов")
    return ref


def _run(landmarks, fps, width, height, ball, foot, height_cm, contact, ref_id) -> tuple[dict, dict]:
    try:
        analysis = analyze(landmarks, fps, width, height, ball=ball, foot=foot, height_cm=height_cm, contact=contact)
    except AnalysisError as e:
        raise HTTPException(422, str(e)) from e
    analysis["ball"] = ball
    analysis["height_cm"] = height_cm
    return analysis, compare(analysis, _ref(ref_id))


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "ai": advice.ai_status(), "refs": len(store.list_refs())}


@app.post("/api/attempts")
def create_attempt(body: AttemptIn) -> dict:
    if any(len(f) != 33 for f in body.landmarks):
        raise HTTPException(422, "В каждом кадре должно быть 33 точки")
    if body.player_id and not store.get_player(body.player_id):
        raise HTTPException(404, "Игрок не найден")
    ball = body.ball.model_dump() if body.ball else None
    analysis, comparison = _run(body.landmarks, body.fps, body.width, body.height, ball, body.foot, body.height_cm, body.contact, body.ref_id)
    landmarks = np.round(np.asarray(body.landmarks, dtype=float), 4).tolist()
    aid = store.save_attempt({"player_id": body.player_id, "analysis": analysis, "comparison": comparison, "landmarks": landmarks, "source": body.source})
    return store.get_attempt(aid)


@app.get("/api/attempts/{aid}")
def get_attempt(aid: str) -> dict:
    a = store.get_attempt(aid)
    if not a:
        raise HTTPException(404, "Разбор не найден")
    return a


@app.post("/api/attempts/{aid}/recompute")
def recompute(aid: str, body: RecomputeIn) -> dict:
    a = store.get_attempt(aid)
    if not a:
        raise HTTPException(404, "Разбор не найден")
    an = a["analysis"]
    ball = body.ball.model_dump() if body.ball else an.get("ball")
    analysis, comparison = _run(a["landmarks"], an["fps"], an["width"], an["height"], ball, body.foot or an["kick_foot"], an.get("height_cm"), body.contact, body.ref_id or a["ref_id"])
    store.update_attempt(aid, analysis=analysis, comparison=comparison, ref_id=comparison["ref_id"], score=comparison["score"], advice=None, advice_source=None)
    return store.get_attempt(aid)


@app.post("/api/attempts/{aid}/advice")
def attempt_advice(aid: str) -> dict:
    a = store.get_attempt(aid, with_landmarks=False)
    if not a:
        raise HTTPException(404, "Разбор не найден")
    if a["advice"]:
        return {"text": a["advice"], "source": a["advice_source"]}
    out = advice.advise(a["comparison"])
    store.update_attempt(aid, advice=out["text"], advice_source=out["source"])
    return out


@app.get("/api/refs")
def refs() -> dict:
    return {"items": store.list_refs()}


@app.get("/api/refs/{ref_id}")
def ref(ref_id: str) -> dict:
    r = store.get_ref(ref_id)
    if not r:
        raise HTTPException(404, "Эталон не найден")
    return r


@app.post("/api/refs")
def create_ref(body: RefIn) -> dict:
    kicks = []
    for aid in body.attempt_ids:
        a = store.get_attempt(aid)
        if not a:
            raise HTTPException(404, f"Разбор {aid} не найден")
        kicks.append((a["analysis"], a["landmarks"]))
    r = build(store.new_id("ref"), body.name, kicks, source="coach")
    store.save_ref(r)
    return {k: r[k] for k in ("id", "name", "n_kicks")}


@app.post("/api/players")
def create_player(body: PlayerIn) -> dict:
    team = body.team_code.upper() if body.team_code else None
    if team and not store.get_team(team):
        raise HTTPException(404, "Команда не найдена")
    return store.create_player(body.nickname, team)


@app.get("/api/players/{pid}")
def get_player(pid: str) -> dict:
    p = store.get_player(pid)
    if not p:
        raise HTTPException(404, "Игрок не найден")
    return p


@app.delete("/api/players/{pid}")
def delete_player(pid: str) -> dict:
    p = store.get_player(pid)
    if not p:
        raise HTTPException(404, "Игрок не найден")
    if p["is_demo"]:
        raise HTTPException(403, "Демо-игрока удалить нельзя")
    store.delete_player(pid)
    return {"ok": True}


def _trend(xs: list[float], ys: list[float]) -> float | None:
    if len(xs) < 2 or np.var(xs) == 0:
        return None
    return float(np.cov(xs, ys, bias=True)[0, 1] / np.var(xs))


@app.get("/api/players/{pid}/progress")
def progress(pid: str) -> dict:
    p = store.get_player(pid)
    if not p:
        raise HTTPException(404, "Игрок не найден")
    items = store.player_attempts(pid)
    if not items:
        return {"player": p, "attempts": [], "metrics": []}
    t0 = items[0]["created"]
    weeks = [(i["created"] - t0) / (7 * 24 * 3600) for i in items]
    metrics = []
    for key, meta in METRICS.items():
        values = [i["metrics"][key] for i in items]
        rows = [next(r for r in i["comparison"]["metrics"] if r["key"] == key) for i in items]
        ref = rows[-1]["ref"]
        metrics.append(
            {
                "key": key,
                "label": meta["label"],
                "unit": meta["unit"],
                "ref": ref,
                "ref_sd": rows[-1]["ref_sd"],
                "values": values,
                "per_week": _trend(weeks, values),
                "closer": abs(values[-1] - ref) < abs(values[0] - ref) if len(values) > 1 else None,
                "status": rows[-1]["status"],
            }
        )
    scores = [i["score"] for i in items]
    return {
        "player": p,
        "attempts": [{"id": i["id"], "created": i["created"], "score": i["score"], "focus": i["comparison"]["focus"], "is_demo": i["is_demo"]} for i in items],
        "scores": scores,
        "score_per_week": _trend(weeks, scores),
        "metrics": metrics,
    }


@app.post("/api/teams")
def create_team(body: TeamIn) -> dict:
    return store.create_team(body.name)


@app.post("/api/teams/{code}/join")
def join_team(code: str, body: JoinIn) -> dict:
    team = store.get_team(code)
    if not team:
        raise HTTPException(404, "Команда не найдена")
    if not store.get_player(body.player_id):
        raise HTTPException(404, "Игрок не найден")
    store.set_team(body.player_id, team["code"])
    return team


ISSUE_TEXT = {
    ("knee_contact", -1): "бьют согнутой ногой",
    ("knee_contact", 1): "бьют почти прямой ногой",
    ("trunk_lean", -1): "заваливают корпус назад",
    ("trunk_lean", 1): "слишком наклоняются вперёд",
    ("plant_offset", -1): "ставят опорную ногу далеко позади мяча",
    ("plant_offset", 1): "ставят опорную ногу впереди мяча",
    ("shank_speed", -1): "медленно разгоняют голень",
    ("backswing_knee", 1): "делают короткий замах",
    ("backswing_knee", -1): "замахиваются слишком глубоко",
    ("chain_lag", -1): "разгоняют голень раньше бедра",
    ("chain_lag", 1): "бьют «в два движения»",
}


@app.get("/api/teams/{code}")
def team(code: str) -> dict:
    t = store.get_team(code)
    if not t:
        raise HTTPException(404, "Команда не найдена")
    roster, issues = [], {}
    players = store.team_players(t["code"])
    for p in players:
        items = store.player_attempts(p["id"])
        last = items[-1] if items else None
        row = {"id": p["id"], "nickname": p["nickname"], "attempts": len(items), "is_demo": bool(p["is_demo"])}
        if last:
            comp = last["comparison"]
            row |= {
                "last_id": last["id"],
                "last_created": last["created"],
                "score": last["score"],
                "first_score": items[0]["score"],
                "focus": next((m["label"] for m in comp["metrics"] if m["key"] == comp["focus"]), None),
                "statuses": {m["key"]: m["status"] for m in comp["metrics"] if m["status"] != "info"},
            }
            for m in comp["metrics"]:
                if m["status"] in ("warn", "bad") and m["z"] is not None:
                    sign = -1 if m["z"] < 0 else 1
                    issues.setdefault((m["key"], sign), []).append(p["nickname"])
        roster.append(row)
    top = sorted(
        ({"key": k, "text": ISSUE_TEXT.get((k, s), METRICS[k]["label"]), "players": names, "count": len(names)} for (k, s), names in issues.items()),
        key=lambda x: -x["count"],
    )
    return {"team": t, "players": roster, "issues": top[:5], "total": len(players)}


@app.get("/api/demo")
def demo() -> dict:
    t = store.demo_team()
    return {"team_code": t["code"] if t else None, "featured": seed.featured_attempt(), "ref_id": "demo-pro", "now": time.time()}


DIST: Path = config.DIST
if (DIST / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith("api/"):
            raise HTTPException(404, "Not found")
        file = (DIST / path).resolve()
        if path and file.is_file() and file.is_relative_to(DIST.resolve()):
            return FileResponse(file)
        return FileResponse(DIST / "index.html")
