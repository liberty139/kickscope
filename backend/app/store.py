"""SQLite storage: players, teams, attempts and references. JSON in zlib blobs; no video is ever stored."""

from __future__ import annotations

import json
import secrets
import sqlite3
import threading
import time
import zlib
from contextlib import contextmanager

from . import config

_lock = threading.Lock()

SCHEMA = """
create table if not exists teams (code text primary key, name text not null, created real not null, is_demo int not null default 0);
create table if not exists players (id text primary key, nickname text not null, team_code text, created real not null, is_demo int not null default 0);
create table if not exists refs (id text primary key, name text not null, created real not null, is_demo int not null default 0, data blob not null);
create table if not exists attempts (
  id text primary key, player_id text, created real not null, ref_id text, score real, kick_foot text, source text,
  analysis blob not null, comparison blob not null, landmarks blob not null, advice text, advice_source text, is_demo int not null default 0
);
create index if not exists attempts_player on attempts(player_id, created);
"""


def pack(obj) -> bytes:
    return zlib.compress(json.dumps(obj, separators=(",", ":"), ensure_ascii=False).encode(), 6)


def unpack(blob: bytes):
    return json.loads(zlib.decompress(blob))


@contextmanager
def db():
    config.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _lock:
        conn = sqlite3.connect(config.DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()


def init() -> None:
    with db() as c:
        c.executescript(SCHEMA)


def new_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_urlsafe(8)}"


def team_code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(5))


# --- references -------------------------------------------------------------


def save_ref(ref: dict) -> None:
    with db() as c:
        c.execute("insert or replace into refs values (?,?,?,?,?)", (ref["id"], ref["name"], time.time(), int(ref.get("is_demo", False)), pack(ref)))


def get_ref(ref_id: str) -> dict | None:
    with db() as c:
        row = c.execute("select data from refs where id=?", (ref_id,)).fetchone()
    return unpack(row["data"]) if row else None


def list_refs() -> list[dict]:
    with db() as c:
        rows = c.execute("select data from refs order by is_demo, created desc").fetchall()
    out = []
    for r in rows:
        d = unpack(r["data"])
        out.append({k: d[k] for k in ("id", "name", "source", "is_demo", "n_kicks", "fps")} | {"stats": {k: [round(v[0], 1), round(v[1], 1)] for k, v in d["stats"].items()}})
    return out


# --- players and teams ------------------------------------------------------


def create_player(nickname: str, team: str | None = None, is_demo: bool = False, pid: str | None = None, created: float | None = None) -> dict:
    pid = pid or new_id("p")
    with db() as c:
        c.execute("insert into players values (?,?,?,?,?)", (pid, nickname.strip()[:40] or "Игрок", team, created or time.time(), int(is_demo)))
    return get_player(pid)


def get_player(pid: str) -> dict | None:
    with db() as c:
        row = c.execute("select * from players where id=?", (pid,)).fetchone()
    return dict(row) if row else None


def set_team(pid: str, code: str | None) -> None:
    with db() as c:
        c.execute("update players set team_code=? where id=?", (code, pid))


def delete_player(pid: str) -> None:
    with db() as c:
        c.execute("delete from attempts where player_id=?", (pid,))
        c.execute("delete from players where id=?", (pid,))


def create_team(name: str, is_demo: bool = False, code: str | None = None) -> dict:
    with db() as c:
        for _ in range(10):
            code = code or team_code()
            if not c.execute("select 1 from teams where code=?", (code,)).fetchone():
                break
            code = None
        c.execute("insert into teams values (?,?,?,?)", (code, name.strip()[:60] or "Команда", time.time(), int(is_demo)))
    return get_team(code)


def get_team(code: str) -> dict | None:
    with db() as c:
        row = c.execute("select * from teams where code=?", (code.upper(),)).fetchone()
    return dict(row) if row else None


def team_players(code: str) -> list[dict]:
    with db() as c:
        return [dict(r) for r in c.execute("select * from players where team_code=? order by nickname", (code,)).fetchall()]


# --- attempts ---------------------------------------------------------------


def save_attempt(a: dict) -> str:
    aid = a.get("id") or new_id("k")
    with db() as c:
        c.execute(
            "insert into attempts values (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                aid,
                a.get("player_id"),
                a.get("created") or time.time(),
                a["comparison"]["ref_id"],
                a["comparison"]["score"],
                a["analysis"]["kick_foot"],
                a.get("source", "upload"),
                pack(a["analysis"]),
                pack(a["comparison"]),
                pack(a["landmarks"]),
                a.get("advice"),
                a.get("advice_source"),
                int(a.get("is_demo", False)),
            ),
        )
    return aid


def update_attempt(aid: str, **fields) -> None:
    sets, vals = [], []
    for k, v in fields.items():
        sets.append(f"{k}=?")
        vals.append(pack(v) if k in ("analysis", "comparison") else v)
    with db() as c:
        c.execute(f"update attempts set {', '.join(sets)} where id=?", (*vals, aid))


def get_attempt(aid: str, with_landmarks: bool = True) -> dict | None:
    with db() as c:
        row = c.execute("select * from attempts where id=?", (aid,)).fetchone()
    if not row:
        return None
    out = {k: row[k] for k in ("id", "player_id", "created", "ref_id", "score", "kick_foot", "source", "advice", "advice_source")}
    out["is_demo"] = bool(row["is_demo"])
    out["analysis"] = unpack(row["analysis"])
    out["comparison"] = unpack(row["comparison"])
    if with_landmarks:
        out["landmarks"] = unpack(row["landmarks"])
    return out


def player_attempts(pid: str) -> list[dict]:
    with db() as c:
        rows = c.execute("select id, created, score, analysis, comparison, source, is_demo from attempts where player_id=? order by created", (pid,)).fetchall()
    out = []
    for r in rows:
        comp = unpack(r["comparison"])
        out.append({"id": r["id"], "created": r["created"], "score": r["score"], "source": r["source"], "is_demo": bool(r["is_demo"]), "comparison": comp, "metrics": unpack(r["analysis"])["metrics"]})
    return out


def has_demo() -> bool:
    with db() as c:
        return c.execute("select 1 from teams where is_demo=1").fetchone() is not None


def demo_team() -> dict | None:
    with db() as c:
        row = c.execute("select * from teams where is_demo=1 limit 1").fetchone()
    return dict(row) if row else None
