import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.synthetic import generate


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def payload(**kw):
    g = generate(**kw)
    return {"landmarks": np.round(g["landmarks"], 4).tolist(), "fps": g["fps"], "width": g["width"], "height": g["height"], "ball": g["ball"]}


def test_health_and_demo(client):
    h = client.get("/api/health").json()
    assert h["ok"] and h["refs"] >= 1
    d = client.get("/api/demo").json()
    assert d["team_code"] == "DEMO1" and d["featured"]
    a = client.get(f"/api/attempts/{d['featured']}").json()
    assert a["is_demo"] and a["comparison"]["focus"] == "plant_offset"


def test_attempt_roundtrip_advice_and_recompute(client):
    p = client.post("/api/players", json={"nickname": "Тест"}).json()
    r = client.post("/api/attempts", json=payload(seed=21, lean=-14) | {"player_id": p["id"]})
    assert r.status_code == 200, r.text
    a = r.json()
    assert a["comparison"]["focus"] == "trunk_lean"
    adv = client.post(f"/api/attempts/{a['id']}/advice").json()
    assert adv["source"] == "rules" and "Корпус" in adv["text"]
    c = a["analysis"]["phases"]["contact"]
    again = client.post(f"/api/attempts/{a['id']}/recompute", json={"contact": c + 3}).json()
    assert again["analysis"]["phases"]["contact"] == c + 3
    assert again["advice"] is None


def test_bad_input(client):
    assert client.post("/api/attempts", json={"landmarks": [[[0, 0, 0, 1]] * 33] * 20, "fps": 120, "width": 10, "height": 10}).status_code == 422
    bad = payload(seed=1)
    bad["landmarks"][0] = bad["landmarks"][0][:10]
    assert client.post("/api/attempts", json=bad).status_code == 422
    assert client.get("/api/attempts/nope").status_code == 404


def test_progress_and_team(client):
    team = client.get("/api/teams/DEMO1").json()
    assert team["total"] == 6 and team["issues"]
    timur = next(p for p in team["players"] if p["nickname"] == "Тимур")
    prog = client.get(f"/api/players/{timur['id']}/progress").json()
    assert len(prog["attempts"]) == 5
    plant = next(m for m in prog["metrics"] if m["key"] == "plant_offset")
    assert plant["closer"] is True and plant["per_week"] > 0
    assert prog["scores"][-1] > prog["scores"][0]


def test_join_team_and_custom_reference(client):
    t = client.post("/api/teams", json={"name": "Школа 7"}).json()
    p = client.post("/api/players", json={"nickname": "Игрок"}).json()
    assert client.post(f"/api/teams/{t['code']}/join", json={"player_id": p["id"]}).status_code == 200
    ids = [client.post("/api/attempts", json=payload(seed=30 + i) | {"player_id": p["id"]}).json()["id"] for i in range(3)]
    ref = client.post("/api/refs", json={"name": "Тренер", "attempt_ids": ids}).json()
    assert ref["n_kicks"] == 3
    r = client.post("/api/attempts", json=payload(seed=40) | {"ref_id": ref["id"]}).json()
    assert r["comparison"]["ref_id"] == ref["id"]
    assert client.delete(f"/api/players/{p['id']}").status_code == 200
