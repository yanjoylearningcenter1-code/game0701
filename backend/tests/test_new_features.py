"""Backend tests for iteration 2 new features:
- GET /api/energy
- GET /api/home-status
- POST /api/free-play
- Region unlock correctness
- Energy depletion via game-sessions
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')


def _fresh_client():
    """Fresh guest session for every test (isolate state)."""
    s = requests.Session()
    gid = f"fresh-{int(time.time()*1000)}-{uuid.uuid4().hex[:6]}"
    s.headers.update({"Content-Type": "application/json", "X-Guest-Id": gid})
    return s, gid


# ============== ENERGY ==============
class TestEnergy:
    def test_energy_fresh_guest_full(self):
        api, gid = _fresh_client()
        r = api.get(f"{BASE_URL}/api/energy", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["energy"] == 100.0, f"fresh guest energy should be 100, got {data['energy']}"
        assert data["max_energy"] == 100.0
        assert data["refill_per_hour"] == 12.5
        assert data["pct"] == 100.0
        # full_refill_at should be None when at full
        assert data.get("full_refill_at") is None

    def test_energy_depletes_after_session(self):
        api, gid = _fresh_client()
        # Pre-check: energy full
        r0 = api.get(f"{BASE_URL}/api/energy", timeout=15)
        assert r0.json()["energy"] == 100.0

        # Do a session: correct=5, wrong=1 -> expected cost = 5 + 6*1.5 = 14
        r = api.post(f"{BASE_URL}/api/game-sessions",
                     json={"mode": "quiz", "score": 500, "max_combo": 3, "correct": 5, "wrong": 1},
                     timeout=15)
        assert r.status_code == 200

        r2 = api.get(f"{BASE_URL}/api/energy", timeout=15)
        assert r2.status_code == 200
        data = r2.json()
        assert data["energy"] < 100.0, f"energy should drop after session, got {data['energy']}"
        # cost is ~14, minus refill during ~0-1s (negligible). Should be ~86.
        assert 80.0 <= data["energy"] <= 95.0, f"expected ~86, got {data['energy']}"
        assert data["pct"] < 100.0


# ============== HOME STATUS ==============
class TestHomeStatus:
    def test_home_status_fresh_guest(self):
        api, gid = _fresh_client()
        r = api.get(f"{BASE_URL}/api/home-status", timeout=15)
        assert r.status_code == 200
        data = r.json()

        # Energy full
        assert data["energy"]["energy"] == 100.0
        assert data["energy"]["pct"] == 100.0

        # Boss not ready
        assert data["boss_status"]["ready"] is False
        assert data["boss_status"]["units_due"] == 0

        # Regions: only forest true
        regs = data["regions_unlocked"]
        assert regs["forest"] is True
        assert regs["plain"] is False
        assert regs["abyss"] is False
        assert regs["mount"] is False
        assert regs["tower"] is False

        # Stats zero
        assert data["stats"]["total_sessions"] == 0
        assert data["stats"]["total_tracks"] == 0
        assert data["stats"]["boss_defeats"] == 0

    def test_home_status_plain_unlocks_after_track(self):
        api, gid = _fresh_client()

        # Fresh: plain locked
        pre = api.get(f"{BASE_URL}/api/home-status", timeout=15).json()
        assert pre["regions_unlocked"]["plain"] is False

        # Create a track
        r = api.post(f"{BASE_URL}/api/tracks",
                     json={"text": "apple banana cherry date fig grape",
                           "title": "TEST_home_track", "track_type": "quiz", "due_date": None},
                     timeout=20)
        assert r.status_code == 200, r.text

        # plain should unlock now (total_tracks >= 1)
        post = api.get(f"{BASE_URL}/api/home-status", timeout=15).json()
        assert post["stats"]["total_tracks"] >= 1
        assert post["regions_unlocked"]["plain"] is True
        assert post["regions_unlocked"]["forest"] is True


# ============== FREE PLAY ==============
class TestFreePlay:
    def test_free_play_with_text(self):
        api, gid = _fresh_client()
        t0 = time.time()
        r = api.post(f"{BASE_URL}/api/free-play",
                     json={"text": "The dog barks at the cat every morning. Apple banana cherry pie.",
                           "mode": "quiz"},
                     timeout=25)
        elapsed = time.time() - t0
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("is_free_play") is True
        assert "game" in data
        challenges = data["game"].get("challenges", [])
        assert len(challenges) >= 5, f"expected at least 5 challenges, got {len(challenges)}"
        assert data.get("source") in ("gemini", "fallback")
        assert elapsed < 20, f"free-play took {elapsed:.1f}s"
        print(f"free-play took {elapsed:.2f}s, source={data.get('source')}")

    def test_free_play_with_material_id(self):
        api, gid = _fresh_client()
        # Create material first
        m = api.post(f"{BASE_URL}/api/materials",
                     json={"title": "TEST_fp_mat", "text": "The quick brown fox jumps over lazy dog. Sun rises east."},
                     timeout=15)
        assert m.status_code == 200
        mid = m.json()["material_id"]

        r = api.post(f"{BASE_URL}/api/free-play", json={"material_id": mid, "mode": "quiz"}, timeout=25)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("is_free_play") is True
        assert len(data["game"]["challenges"]) >= 5

    def test_free_play_material_not_found(self):
        api, gid = _fresh_client()
        r = api.post(f"{BASE_URL}/api/free-play",
                     json={"material_id": "mat_does_not_exist_xyz"},
                     timeout=15)
        assert r.status_code == 404

    def test_free_play_no_input(self):
        api, gid = _fresh_client()
        r = api.post(f"{BASE_URL}/api/free-play", json={}, timeout=15)
        assert r.status_code == 400


# ============== REGRESSION SPOT CHECKS ==============
class TestRegression:
    def test_auth_me_401_for_guest(self):
        # No X-Guest-Id, no cookie - should be 401
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 401

    def test_daily_queue_works(self):
        api, gid = _fresh_client()
        r = api.get(f"{BASE_URL}/api/daily-queue", timeout=15)
        assert r.status_code == 200

    def test_materials_crud(self):
        api, gid = _fresh_client()
        r = api.post(f"{BASE_URL}/api/materials",
                     json={"title": "TEST_reg_mat", "text": "sample regression material text"},
                     timeout=15)
        assert r.status_code == 200
        assert r.json()["material_id"].startswith("mat_")

        r2 = api.get(f"{BASE_URL}/api/materials", timeout=15)
        assert r2.status_code == 200
        assert isinstance(r2.json(), list)
