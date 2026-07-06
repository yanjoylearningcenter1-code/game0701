"""Backend regression tests for AI Cognitive Adventure Platform"""
import os
import time
import uuid
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')
GUEST_ID = f"test-{uuid.uuid4().hex[:8]}"

@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "X-Guest-Id": GUEST_ID})
    return s


def test_root(api):
    r = api.get(f"{BASE_URL}/api/", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data.get("ok") is True
    assert "AI Cognitive Adventure" in data.get("message", "")


def test_auth_me_unauth(api):
    s = requests.Session()  # no cookie/header
    r = s.get(f"{BASE_URL}/api/auth/me", timeout=15)
    assert r.status_code == 401


def test_create_material(api):
    r = api.post(f"{BASE_URL}/api/materials", json={"title": "TEST_mat", "text": "some material text here"}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "TEST_mat"
    assert data["text"] == "some material text here"
    assert data["material_id"].startswith("mat_")


def test_generate_game(api):
    t0 = time.time()
    r = api.post(f"{BASE_URL}/api/generate-game", json={
        "text": "The cat sat on the mat. Dogs bark loudly.",
        "mode": "quiz", "subject": "general", "difficulty": 2
    }, timeout=20)
    elapsed = time.time() - t0
    assert r.status_code == 200
    data = r.json()
    challenges = data.get("game", {}).get("challenges", [])
    assert len(challenges) >= 1, "Should return challenges"
    assert elapsed < 15, f"generate-game took {elapsed:.1f}s, should be <15s"
    print(f"generate-game took {elapsed:.2f}s, source={data.get('source')}, challenges={len(challenges)}")


def test_tracks_create_standard(api):
    t0 = time.time()
    r = api.post(f"{BASE_URL}/api/tracks", json={
        "text": "apple banana cherry date fig grape", "title": "TEST_track_std",
        "track_type": "quiz", "due_date": None
    }, timeout=20)
    elapsed = time.time() - t0
    assert r.status_code == 200
    data = r.json()
    assert data["unit_count"] > 0
    assert data["urgency_tier"] == "standard"
    assert data["track"]["track_id"].startswith("trk_")
    assert elapsed < 15, f"tracks POST took {elapsed:.1f}s"
    print(f"tracks POST took {elapsed:.2f}s, tier={data['urgency_tier']}, units={data['unit_count']}")
    # Store for battle test
    pytest.track_id = data["track"]["track_id"]


def test_tracks_urgency_survival(api):
    # 1 day from now -> emergency (24h < lead < 48h). For 'survival' we need <=2h.
    due = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    r = api.post(f"{BASE_URL}/api/tracks", json={
        "text": "word1 word2 word3", "title": "TEST_survival",
        "track_type": "quiz", "due_date": due
    }, timeout=20)
    assert r.status_code == 200
    assert r.json()["urgency_tier"] == "survival"


def test_tracks_urgency_emergency(api):
    due = (datetime.now(timezone.utc) + timedelta(hours=20)).isoformat()
    r = api.post(f"{BASE_URL}/api/tracks", json={
        "text": "alpha beta gamma", "title": "TEST_emerg",
        "track_type": "quiz", "due_date": due
    }, timeout=20)
    assert r.status_code == 200
    assert r.json()["urgency_tier"] == "emergency"


def test_tracks_urgency_cram(api):
    # 8 days for quiz (quiz min = 14 days) -> cram
    due = (datetime.now(timezone.utc) + timedelta(days=8)).isoformat()
    r = api.post(f"{BASE_URL}/api/tracks", json={
        "text": "one two three four five", "title": "TEST_cram",
        "track_type": "quiz", "due_date": due
    }, timeout=20)
    assert r.status_code == 200
    assert r.json()["urgency_tier"] == "cram"


def test_tracks_battle(api):
    tid = getattr(pytest, "track_id", None)
    assert tid, "prior test should set track_id"
    t0 = time.time()
    r = api.post(f"{BASE_URL}/api/tracks/{tid}/battle", timeout=20)
    elapsed = time.time() - t0
    assert r.status_code == 200, r.text
    data = r.json()
    assert "game" in data and "challenges" in data["game"]
    assert len(data["game"]["challenges"]) > 0
    assert len(data.get("unit_ids", [])) > 0
    assert elapsed < 15, f"track battle took {elapsed:.1f}s"
    print(f"track battle took {elapsed:.2f}s, challenges={len(data['game']['challenges'])}")


def test_timeout_resilience_huge_text(api):
    huge_text = ("The quick brown fox jumps over the lazy dog. " * 60)  # ~2600 chars
    t0 = time.time()
    r = api.post(f"{BASE_URL}/api/tracks", json={
        "text": huge_text, "title": "TEST_huge", "track_type": "quiz", "due_date": None
    }, timeout=25)
    elapsed = time.time() - t0
    assert r.status_code == 200
    data = r.json()
    assert data["unit_count"] > 0
    assert elapsed < 20, f"huge tracks POST took {elapsed:.1f}s, should be <20s due to 9s LLM timeout"
    print(f"huge track POST took {elapsed:.2f}s, units={data['unit_count']}")


def test_game_sessions(api):
    r = api.post(f"{BASE_URL}/api/game-sessions", json={
        "mode": "quiz", "score": 500, "max_combo": 3, "correct": 4, "wrong": 1
    }, timeout=15)
    assert r.status_code == 200
    assert r.json()["score"] == 500

    r2 = api.get(f"{BASE_URL}/api/game-sessions", timeout=15)
    assert r2.status_code == 200
    assert isinstance(r2.json(), list)
    assert len(r2.json()) >= 1
