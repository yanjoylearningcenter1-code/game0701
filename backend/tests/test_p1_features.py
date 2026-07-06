"""Tests for P1 features: classroom, streak, Chinese fallback, dev auth."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
GUEST_ID = f"test-{uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "X-Guest-Id": GUEST_ID})
    return s


@pytest.fixture(scope="module")
def teacher_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/dev-login", json={
        "email": f"teacher-{GUEST_ID}@test.local", "role": "teacher"
    }, timeout=15)
    assert r.status_code == 200, r.text
    return s


def test_dev_login(teacher_session):
    r = teacher_session.get(f"{BASE_URL}/api/auth/me", timeout=15)
    assert r.status_code == 200
    assert r.json()["role"] == "teacher"


def test_classroom_create_and_list(teacher_session):
    r = teacher_session.post(f"{BASE_URL}/api/classrooms", json={
        "name": "TEST_P1_Raid", "mode": "quiz"
    }, timeout=15)
    assert r.status_code == 200
    room = r.json()
    assert len(room["room_code"]) == 5
    r2 = teacher_session.get(f"{BASE_URL}/api/classrooms", timeout=15)
    assert r2.status_code == 200
    codes = [x["room_code"] for x in r2.json()]
    assert room["room_code"] in codes


def test_classroom_join(api, teacher_session):
    r = teacher_session.post(f"{BASE_URL}/api/classrooms", json={
        "name": "TEST_Join", "mode": "quiz"
    }, timeout=15)
    code = r.json()["room_code"]
    r2 = api.post(f"{BASE_URL}/api/classrooms/{code}/join", json={"display_name": "Student1"}, timeout=15)
    assert r2.status_code == 200
    r3 = api.get(f"{BASE_URL}/api/classrooms/{code}", timeout=15)
    assert len(r3.json().get("participants", [])) >= 1


def test_classroom_unauth(api):
    r = api.post(f"{BASE_URL}/api/classrooms", json={"name": "X", "mode": "quiz"}, timeout=15)
    assert r.status_code == 401


def test_streak_increments(api):
    r = api.post(f"{BASE_URL}/api/game-sessions", json={
        "mode": "quiz", "score": 100, "max_combo": 2, "correct": 5, "wrong": 1, "unit_ids": []
    }, timeout=15)
    assert r.status_code == 200
    assert "streak" in r.json()
    r2 = api.get(f"{BASE_URL}/api/streak", timeout=15)
    assert r2.status_code == 200
    assert r2.json().get("current_streak", 0) >= 1


def test_chinese_fallback_game(api):
    r = api.post(f"{BASE_URL}/api/generate-game", json={
        "text": "一馬當先，馬到成功。學習中文成語。",
        "mode": "quiz", "subject": "chinese", "difficulty": 2
    }, timeout=20)
    assert r.status_code == 200
    types = {c["type"] for c in r.json()["game"]["challenges"]}
    assert "idiom_repair" in types or "stroke_order" in types or "tap" in types


def test_home_status_includes_streak(api):
    r = api.get(f"{BASE_URL}/api/home-status", timeout=15)
    assert r.status_code == 200
    assert "streak" in r.json()
