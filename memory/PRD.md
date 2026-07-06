# AI Cognitive Adventure Learning Platform — PRD

## Problem
Transform any homework/worksheet into a Roblox/P&D-style Boss battle game. Core loop: 拍照 → AI 轉化 → 冒險. 4 modes (讀默/背默/Quiz/Exam), 3 personas (Student/Parent/Teacher).

## Architecture
- **Backend**: FastAPI + MongoDB (Motor) + Emergent Google Auth + Gemini 3 Flash via emergentintegrations
- **Frontend**: React 19 + Tailwind + framer-motion + tesseract.js (in-browser OCR) + Web Audio API SFX
- **LLM safety**: 9s asyncio.wait_for on every LLM call → deterministic fallback game

## Implemented (2026-07-01)
- ✅ Landing / Identity / Login / AuthCallback
- ✅ Upload with camera capture + up to 3 files + Tesseract.js OCR
- ✅ Preview (editable OCR text)
- ✅ Mode Selection with date picker and dynamic world-state urgency tiers
- ✅ Transformation magic-moment animation (3-5s) with fallback chain
- ✅ Battle screen (tap / drag / memory_flash + Boss HP + Player HP + combo + SFX)
- ✅ Victory screen (stars, score, combo, accuracy)
- ✅ Kid Home World with world map
- ✅ Parent Dashboard (bento grid, recent quests, AI suggestions, materials library)
- ✅ Teacher Dashboard (create raid + room codes)
- ✅ SM-2 spaced repetition + LearningTrack engine (user-uploaded expansion)
- ✅ Guest identity via X-Guest-Id header
- ✅ Emergent Google OAuth for parent/teacher

## Backlog (P1)
- Chinese-specific challenge types (idiom repair, character stroke order)
- Real-time classroom mode (WebSocket) for teachers running live raids
- Progress emails for parents (Resend integration)
- Streak / daily login rewards
- Skill tree + inventory + pets (deferred)

## Backlog (P2)
- Guild system + world boss
- Mobile app packaging (React Native / Capacitor)
- Handwriting practice (Trace system)
- Full clinical-grade cognitive analytics

## Test Credentials
See /app/memory/test_credentials.md
