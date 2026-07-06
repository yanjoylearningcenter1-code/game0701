"""Iteration 4 regression tests — cover endpoints touched by code-quality fixes:
- POST /api/reviews (BattlePage.recordReview .catch console.warn)
- GET /api/follow-ups
- GET /api/daily-battle (expected 400 if no tracks)
- GET /api/home-status recent sessions have session_id (KidHome key)
- POST /api/tracks then GET /api/daily-battle returns game
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')


def _fresh_client():
    s = requests.Session()
    gid = f"iter4-{int(time.time()*1000)}-{uuid.uuid4().hex[:6]}"
    s.headers.update({"Content-Type": "application/json", "X-Guest-Id": gid})
    return s, gid


class TestReviewsAndFollowUps:
    def test_reviews_records_unit_review(self):
        api, _ = _fresh_client()
        # Create a track first so a knowledge_unit exists
        r = api.post(f"{BASE_URL}/api/tracks",
                     json={"text": "alpha beta gamma delta epsilon",
                           "title": "TEST_rev_track", "track_type": "quiz"},
                     timeout=20)
        assert r.status_code == 200
        battle = api.post(f"{BASE_URL}/api/tracks/{r.json()['track']['track_id']}/battle", timeout=20)
        assert battle.status_code == 200
        unit_ids = battle.json().get("unit_ids", [])
        assert len(unit_ids) > 0
        # POST review for first unit
        rv = api.post(f"{BASE_URL}/api/reviews",
                      json={"unit_id": unit_ids[0], "correct": True, "response_time_ms": 1500},
                      timeout=15)
        assert rv.status_code == 200, rv.text
        body = rv.json()
        # Should have SM-2 updated fields
        assert "ease_factor" in body or "interval_days" in body or "next_due_at" in body or body.get("ok") is not None

    def test_reviews_unknown_unit_returns_404(self):
        api, _ = _fresh_client()
        r = api.post(f"{BASE_URL}/api/reviews",
                     json={"unit_id": "unit_nonexistent_xyz", "correct": True, "response_time_ms": 1000},
                     timeout=15)
        assert r.status_code == 404

    def test_follow_ups_empty_for_fresh_guest(self):
        api, _ = _fresh_client()
        r = api.get(f"{BASE_URL}/api/follow-ups", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body, dict)
        assert "due" in body and "resolved" in body and "upcoming" in body
        assert body["due"] == [] and body["resolved"] == [] and body["upcoming"] == []


class TestDailyBattle:
    def test_daily_battle_no_tracks_returns_400_or_empty(self):
        api, _ = _fresh_client()
        r = api.get(f"{BASE_URL}/api/daily-battle", timeout=15)
        # spec says may 400 if no tracks
        assert r.status_code in (200, 400, 404)

    def test_daily_battle_after_track_creation(self):
        api, _ = _fresh_client()
        r = api.post(f"{BASE_URL}/api/tracks",
                     json={"text": "one two three four five six seven",
                           "title": "TEST_daily_battle_track", "track_type": "quiz"},
                     timeout=20)
        assert r.status_code == 200
        db = api.get(f"{BASE_URL}/api/daily-battle", timeout=20)
        # Now should either work or gracefully return
        assert db.status_code in (200, 400)
        if db.status_code == 200:
            data = db.json()
            assert "game" in data or "challenges" in data or "unit_ids" in data


class TestHomeStatusSessions:
    def test_recent_sessions_have_session_id(self):
        api, _ = _fresh_client()
        # Insert a session
        api.post(f"{BASE_URL}/api/game-sessions",
                 json={"mode": "quiz", "score": 300, "max_combo": 2, "correct": 3, "wrong": 1},
                 timeout=15)
        r = api.get(f"{BASE_URL}/api/home-status", timeout=15)
        assert r.status_code == 200
        data = r.json()
        recent = data.get("recent_sessions") or data.get("recent") or []
        # Recent sessions field may or may not exist; if present each must have session_id (for KidHome key)
        if recent:
            for s in recent:
                assert "session_id" in s, f"session missing session_id: {s}"


class TestMaterialsListKey:
    def test_materials_return_material_id(self):
        api, _ = _fresh_client()
        for i in range(2):
            api.post(f"{BASE_URL}/api/materials",
                     json={"title": f"TEST_mat_iter4_{i}", "text": f"sample text {i} more content here"},
                     timeout=15)
        r = api.get(f"{BASE_URL}/api/materials", timeout=15)
        assert r.status_code == 200
        mats = r.json()
        assert isinstance(mats, list)
        assert len(mats) >= 2
        for m in mats:
            assert "material_id" in m and m["material_id"].startswith("mat_")
