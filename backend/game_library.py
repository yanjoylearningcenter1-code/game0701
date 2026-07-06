"""Yanjoy Game Library G1–G20 — challenge builders for Learning Journey v3."""
from __future__ import annotations

import random
import re
from typing import Any, Dict, List, Optional, Tuple

GAME_LABELS: Dict[str, dict] = {
    "G1": {"name": "Bubble Pop", "name_zh": "泡泡消除"},
    "G2": {"name": "Memory Match", "name_zh": "記憶配對"},
    "G3": {"name": "Tap Attack", "name_zh": "一觸即中"},
    "G4": {"name": "Missing Letter Fill", "name_zh": "填字入格"},
    "G4-zh": {"name": "Radical Fill", "name_zh": "補部件"},
    "G5": {"name": "Missing Word Fill-in", "name_zh": "填空缺字"},
    "G6": {"name": "Word Unscramble", "name_zh": "拼字重組"},
    "G6-zh": {"name": "Component Unscramble", "name_zh": "部件重組"},
    "G7": {"name": "Slash Game", "name_zh": "詞語切切樂"},
    "G8": {"name": "Speed Reading", "name_zh": "拆彈速讀"},
    "G9": {"name": "Typed Recall", "name_zh": "打字回想"},
    "G10": {"name": "Error Detection", "name_zh": "錯題偵測"},
    "G11": {"name": "Scenario MC", "name_zh": "情境選擇題"},
    "G12": {"name": "Word Detective", "name_zh": "文字探測器"},
    "G13": {"name": "Contextual Cloze", "name_zh": "語境填空"},
    "G16": {"name": "Flashcard Flip", "name_zh": "咭卡翻轉"},
    "G17": {"name": "Sentence Making", "name_zh": "造句挑戰"},
    "G18": {"name": "Crossword", "name_zh": "填字遊戲"},
    "G19": {"name": "Synonym Match", "name_zh": "同義配對"},
    "G20": {"name": "Rescue Mission", "name_zh": "救援行動"},
    "G20-zh": {"name": "Rescue Mission (zh)", "name_zh": "救援行動（字形）"},
    "READ": {"name": "Read Aloud", "name_zh": "朗讀播放"},
    "HL": {"name": "Highlight Keyword", "name_zh": "標記關鍵字"},
    "HUNT": {"name": "Target Word Hunt", "name_zh": "搵字獵人"},
    "DIAG": {"name": "Weak Diagnosis", "name_zh": "弱項診斷"},
}

# English game id → Chinese variant for spelling steps
ZH_VARIANT_MAP = {"G4": "G4-zh", "G6": "G6-zh", "G20": "G20-zh"}


def detect_language(term: str) -> str:
    if re.search(r"[\u4e00-\u9fff]", term or ""):
        return "zh"
    return "en"


def resolve_game_id(game_id: str, language: str) -> str:
    if language == "zh" and game_id in ZH_VARIANT_MAP:
        return ZH_VARIANT_MAP[game_id]
    return game_id


def filter_game_options(options: List[str], language: str, step: int, track_type: str = "") -> List[str]:
    """Keep only games valid for unit language; swap en spelling games for zh variants."""
    out: List[str] = []
    for g in options:
        if g in ("G4", "G6", "G20") and language == "zh":
            out.append(resolve_game_id(g, "zh"))
        elif g.endswith("-zh") and language == "en":
            continue
        else:
            out.append(g)
    if track_type == "recital_dictation":
        out = [g for g in out if g != "G12"]
    return out or list(options)


def _shuffle(items: list) -> list:
    a = list(items)
    random.shuffle(a)
    return a


def _mask_letters(term: str) -> Tuple[str, str]:
    if not term or len(term) < 3:
        return term, term
    if re.search(r"[\u4e00-\u9fff]", term):
        if len(term) <= 2:
            return term[0] + "＿", term
        idx = len(term) // 2
        return term[:idx] + "＿" + term[idx + 1:], term
    letters = list(term)
    maskable = [i for i in range(len(letters)) if letters[i].isalpha()]
    if len(maskable) < 2:
        return term, term
    n_mask = max(1, len(maskable) // 3)
    for i in random.sample(maskable, n_mask):
        letters[i] = "_"
    return "".join(letters), term


def _mask_radical(term: str) -> Tuple[str, str, List[str]]:
    """Chinese G4-zh: hide one component, offer component choices."""
    if len(term) < 2:
        missing = term[-1]
        return term[0] + "＿", missing, _shuffle([missing, "口", "氵", "木"][:3])
    idx = len(term) // 2
    masked = term[:idx] + "＿" + term[idx + 1:]
    missing = term[idx]
    decoys = ["口", "氵", "木", "心", "亻", "足", "手", "言"]
    pool = _shuffle([missing] + [d for d in decoys if d != missing][:3])
    return masked, missing, pool[:4]


def _letter_tiles(term: str) -> List[str]:
    if re.search(r"[\u4e00-\u9fff]", term):
        return _shuffle(list(term))
    return _shuffle(list(term.replace(" ", "")))


def _radical_tiles(term: str) -> List[str]:
    return _shuffle(list(term))


def _letter_pool_for_rescue(term: str, is_zh: bool) -> List[str]:
    if is_zh:
        chars = list(dict.fromkeys(c for c in term if re.search(r"[\u4e00-\u9fff]", c)))
        decoys = ["的", "了", "在", "是", "我", "有", "他", "這", "不", "人", "大", "小"]
        pool = list(chars)
        for c in decoys:
            if len(pool) >= 14:
                break
            if c not in pool:
                pool.append(c)
        return _shuffle(pool)
    letters = list(dict.fromkeys(c.lower() for c in term if c.isalpha()))
    alphabet = list("abcdefghijklmnopqrstuvwxyz")
    extras = [c for c in alphabet if c not in letters][: max(0, 10 - len(letters))]
    return _shuffle([c.upper() if random.random() > 0.5 else c for c in letters + extras])[:12]


def _sentence_tokens(sentence: str) -> List[str]:
    if re.search(r"[\u4e00-\u9fff]", sentence):
        return [c for c in sentence if c.strip()]
    return sentence.split()


def _pick_keywords(sentence: str, n: int = 2) -> List[str]:
    tokens = _sentence_tokens(sentence)
    if len(tokens) <= n:
        return tokens
    ranked = sorted(set(tokens), key=len, reverse=True)
    return ranked[:n]


def _similar_distractor(term: str, all_terms: List[str]) -> str:
    """Pick a visually/phonetically similar distractor for G12."""
    cjk = re.search(r"[\u4e00-\u9fff]", term)
    candidates = [t for t in all_terms if t != term]
    if cjk:
        same_len = [t for t in candidates if len(t) == len(term)]
        if same_len:
            return random.choice(same_len)
    if candidates:
        return random.choice(candidates)
    return term + "?" if not cjk else "相似字"


def _profile_extras(profile: str, peek_disabled: bool, time_limit: Optional[int], step: int = 0) -> dict:
    replay_limit = {"L": None, "R": 2, "E": 1}.get(profile, 2)
    peek_limit = 0 if peek_disabled or profile == "E" else 5
    if step == 8 and not peek_disabled and profile != "E":
        peek_limit = 2
    return {
        "replay_limit": replay_limit,
        "peek_limit": peek_limit,
        "peek_disabled": peek_disabled or profile == "E" or peek_limit == 0,
        "time_limit_sec": time_limit,
    }


def _(zh_text: str, en_text: str, lang: str) -> str:
    """Pick the prompt string matching the unit's own language — a Chinese
    worksheet must produce Chinese 題目, not an English template with the
    word "meaning" plugged in."""
    return zh_text if lang == "zh" else en_text


def build_challenge(
    game_id: str,
    unit: dict,
    all_units: List[dict],
    *,
    step: int,
    profile: str = "L",
    peek_disabled: bool = False,
    time_limit_sec: Optional[int] = None,
    step_prompt: Optional[str] = None,
    visual_recall: bool = False,
) -> dict:
    """Build one challenge payload for a specific game id (G1–G20)."""
    term = unit.get("term", "")
    lang = unit.get("language") or detect_language(term)
    raw_meaning = (unit.get("meaning") or "").strip()
    has_meaning = bool(raw_meaning)
    # Word lists (typical 讀默 worksheets) rarely come with a definition —
    # rather than inventing a fake "this word" meaning and building a
    # meaning-quiz around nothing, unmeaning'd units fall back to a genuine
    # audio recognition task (listen, then pick/type what you heard), which
    # is what reading-dictation practice is actually testing anyway.
    meaning = raw_meaning or None
    uid = unit.get("unit_id", "")
    all_terms = [u.get("term", "") for u in all_units if u.get("term")]
    distractors = [t for t in all_terms if t != term][:3] or ["...", "...", "..."]
    extras = _profile_extras(profile, peek_disabled, time_limit_sec, step=step)
    base: Dict[str, Any] = {
        "unit_id": uid,
        "game_type": game_id,
        "step": step,
        "audio_profile": profile,
        **extras,
    }

    gid = game_id

    if gid == "G1":
        # Step 1 Recognize: alternate read-aloud modes — target hunt or bubble pop.
        if step == 1 and random.random() < 0.5:
            target_count = random.randint(3, 5)
            filler = _shuffle([t for t in (all_terms + distractors) if t != term])
            grid = [term] * target_count + filler[: max(0, 20 - target_count)]
            grid = _shuffle(grid)[:20]
            return {
                **base,
                "type": "target_hunt",
                "prompt": _(f"🔎 搵哂所有「{term}」 — 每點一下跟讀", f"🔎 Find every «{term}» — tap and read aloud", lang),
                "target": term,
                "grid": grid,
                "target_count": target_count,
                "answer": term,
                "explanation": meaning,
                "auto_play_audio": True,
            }
        prompt = step_prompt or (
            _(f"🫧 泡泡消除！揀出解釋為「{meaning}」嘅字", f"🫧 Bubble Pop! Which word matches: {meaning}?", lang)
            if has_meaning
            else _("🫧 泡泡消除！聽讀音，揀啱嘅字", "🫧 Bubble Pop! Listen and tap the word you hear", lang)
        )
        return {
            **base,
            "type": "tap",
            "prompt": prompt,
            "options": _shuffle((distractors + [term])[:4]),
            "answer": term,
            "explanation": meaning,
            "auto_play_audio": True,
        }

    if gid == "G2":
        if step == 1:
            prompt = step_prompt or _("🃏 認字 — 聽讀音揀啱嘅字", "🃏 Recognize — listen and pick the word", lang)
        elif step == 2:
            prompt = step_prompt or _("🃏 理解 — 配對啱嘅意思", "🃏 Understand — match the meaning", lang)
        else:
            prompt = step_prompt or (
                _("🃏 配對啱嘅意思", "🃏 Match the word to its meaning", lang)
                if has_meaning
                else _("🃏 聽讀音，揀啱嘅字", "🃏 Listen, then tap the matching word", lang)
            )
        return {
            **base,
            "type": "memory_match",
            "prompt": prompt,
            "pair_front": meaning if has_meaning else _("🔊 聽讀音", "🔊 Listen", lang),
            "options": _shuffle((distractors + [term])[:4]),
            "answer": term,
            "explanation": meaning,
            "auto_play_audio": True,
        }

    if gid == "G3":
        if step == 2:
            prompt = step_prompt or (
                _(f"🎯 理解 — 「{meaning}」係邊個字？", f"🎯 Understand — which word means: {meaning}?", lang)
                if has_meaning
                else _("🎯 理解 — 聽讀音揀啱嘅字", "🎯 Understand — listen and pick the word", lang)
            )
        else:
            prompt = step_prompt or (
                _(f"🎯 揀出解釋為「{meaning}」嘅字", f"🎯 Tap the word that means: {meaning}", lang)
                if has_meaning
                else _("🎯 聽讀音，揀啱嘅字", "🎯 Listen and tap the word you hear", lang)
            )
        return {
            **base,
            "type": "tap",
            "prompt": prompt,
            "options": _shuffle((distractors + [term])[:4]),
            "answer": term,
            "explanation": meaning,
            "auto_play_audio": not has_meaning,
        }

    if gid == "G4":
        masked, answer = _mask_letters(term)
        missing = None
        if re.search(r"[\u4e00-\u9fff]", term):
            m = re.search(r"[_＿]", masked)
            if m and m.start() < len(answer):
                missing = answer[m.start()]
        return {
            **base,
            "type": "missing_letter",
            "prompt": step_prompt or _(f"✏️ 補返缺字：{masked}", f"✏️ Fill in the missing letters: {masked}", lang),
            "masked": masked,
            "answer": answer,
            "missing_part": missing,
            "explanation": meaning,
            "auto_play_audio": profile == "L",
        }

    if gid == "G4-zh":
        masked, missing, opts = _mask_radical(term)
        return {
            **base,
            "type": "word_detective",
            "prompt": step_prompt or _(f"✏️ 補返缺咗嘅部件：{masked}", f"✏️ Pick the missing part: {masked}", lang),
            "display": masked,
            "options": _shuffle(opts),
            "answer": missing,
            "full_word": term,
            "component_mode": True,
            "explanation": meaning,
        }

    if gid == "G5":
        fallback_sentence = (
            _(f"呢個字嘅意思係「{meaning}」：___", f"The word ___ means {meaning}.", lang)
            if has_meaning
            else _("聽讀音，填返個字：___", "Listen, then fill in the missing word: ___", lang)
        )
        sentence = unit.get("context") or fallback_sentence
        blanked = sentence.replace(term, "___") if term in sentence else fallback_sentence
        prompt = step_prompt or _("📝 填返個字", "📝 Fill in the missing word", lang)
        return {
            **base,
            "type": "missing_letter",
            "prompt": prompt,
            "masked": blanked,
            "answer": term,
            "missing_part": term,
            "explanation": meaning,
            "auto_play_audio": not has_meaning,
        }

    if gid == "G6":
        # Sentence-level: unscramble words; word-level: letters
        if " " in term.strip() or (unit.get("unit_type") == "sentence"):
            words = term.split()
            tiles = _shuffle(words)
            ans = words
        else:
            tiles = _letter_tiles(term)
            ans = list(term.replace(" ", "")) if not re.search(r"[\u4e00-\u9fff]", term) else list(term)
        return {
            **base,
            "type": "drag",
            "prompt": step_prompt or _("🧩 按正確順序排列", "🧩 Arrange in the correct order", lang),
            "tiles": tiles,
            "answer": ans,
            "explanation": meaning,
            "allow_restore": True,
        }

    if gid == "G6-zh":
        tiles = _radical_tiles(term)
        return {
            **base,
            "type": "drag",
            "prompt": step_prompt or _("🧩 砌返正確字形（部件重組）", "🧩 Reassemble the correct character (radicals)", lang),
            "tiles": tiles,
            "answer": list(term),
            "explanation": meaning,
            "allow_restore": True,
        }

    if gid == "G7":
        decoys = _shuffle(distractors + [term])[:5]
        falling = [{"id": f"{i}-{w}", "text": w} for i, w in enumerate(decoys)]
        prompt = step_prompt or (
            _(f"⚔️ 切開解釋為「{meaning}」嘅字", f"⚔️ Slash the correct word for: {meaning}", lang)
            if has_meaning
            else _("⚔️ 聽讀音，切開啱嘅字", "⚔️ Listen and slash the word you hear", lang)
        )
        return {
            **base,
            "type": "slash",
            "prompt": prompt,
            "falling_words": falling,
            "falling_options": decoys,
            "answer": term,
            "explanation": meaning,
            "auto_play_audio": True,
            "spawn_ms": 900,
            "fall_duration_ms": 4200,
            "round_duration_sec": 20,
            "hits_required": 8,
        }

    if gid == "G8":
        # Multiple instances of the target word mixed into a larger grid (read-aloud defusal).
        target_count = random.randint(2, min(4, max(2, len(all_terms))))
        filler = _shuffle([t for t in (all_terms + distractors) if t != term])
        grid = [term] * target_count + filler[: max(0, 16 - target_count)]
        grid = _shuffle(grid)[:16]
        targets = [term]
        prompt = step_prompt or (
            _("⚡ 拆彈速讀 — 聽音找出並點擊所有目標字", "⚡ Defuse — listen and tap all target words", lang)
            if not has_meaning
            else _("⚡ 拆彈速讀 — 聽音找出並點擊所有目標字", "⚡ Defuse — listen and tap all matching words", lang)
        )
        return {
            **base,
            "type": "speed_grid",
            "prompt": "",
            "prompt_label": prompt,
            "grid": grid,
            "targets": targets,
            "answer": term,
            "explanation": meaning,
            "time_limit_sec": time_limit_sec or 60,
            "multi_select": True,
            "auto_play_audio": not has_meaning,
        }

    if gid == "HUNT":
        target_count = random.randint(3, 5)
        filler = _shuffle([t for t in (all_terms + distractors) if t != term])
        grid = [term] * target_count + filler[: max(0, 20 - target_count)]
        grid = _shuffle(grid)[:20]
        prompt = step_prompt or _(
            f"🔎 搵哂所有「{term}」 — 每點一下讀出嚟",
            f"🔎 Find every «{term}» — tap each one and read it aloud",
            lang,
        )
        return {
            **base,
            "game_type": "HUNT",
            "type": "target_hunt",
            "prompt": prompt,
            "target": term,
            "grid": grid,
            "target_count": target_count,
            "answer": term,
            "explanation": meaning,
            "auto_play_audio": True,
        }

    if gid == "G9":
        prompts_zh = {
            5: "🔊 首次回想 — 聽音、打字",
            6: "⏱ 限時任務 — 聽音打字",
            8: "⚡ 快速回想 — 限時打字",
            9: "🎯 衝線彩排 — 試下先，唔使緊張",
            10: "🏁 決賽閘 — 全部詞語，一次過",
        }
        prompts_en = {
            5: "🔊 First recall — listen, then type",
            6: "⏱ Timed mission — listen and type",
            8: "⚡ Fast recall — type quickly!",
            9: "🎯 Rehearsal — warm up, no pressure",
            10: "🏁 Final gate — all words, one run",
        }
        p = step_prompt or (prompts_zh if lang == "zh" else prompts_en).get(step, _("🔊 聽音打字", "🔊 Listen and type what you hear", lang))
        if peek_disabled:
            p += _("（無提示）", " (no hints)", lang)
        listen = unit.get("listen_mode") or ("sentence" if unit.get("unit_type") == "sentence" or len(term) > 20 else "word")
        g9 = {
            **base,
            "type": "typing",
            "prompt": p,
            "answer": term,
            "explanation": meaning,
            "audio_only": not visual_recall,
            "listen_mode": listen,
            **extras,
        }
        if visual_recall and meaning:
            g9["visual_hint"] = True
            g9["visual_cue"] = meaning
            g9["visual_term_hint"] = term[0] + "…" if len(term) > 1 else term
        return g9

    if gid == "G10":
        wrong = term[:-1] + ("x" if term else "x")
        ctx = (unit.get("context") or "").strip()
        if ctx and term in ctx:
            reference_sentence = ctx.replace(term, wrong, 1)
        elif ctx:
            reference_sentence = f"{ctx} ({wrong})"
        elif lang == "zh":
            reference_sentence = f"請找出錯字：{wrong}（應為 {term}）"
        else:
            reference_sentence = f"Find the typo: The {wrong} ran fast. (Should be «{term}».)"
        prompt = step_prompt or (
            _("🔍 邊個拼寫正確？", "🔍 Which spelling is CORRECT?", lang)
        )
        return {
            **base,
            "type": "tap",
            "prompt": prompt,
            "options": _shuffle([term, wrong, distractors[0] if distractors else "wrong", distractors[1] if len(distractors) > 1 else "error"]),
            "answer": term,
            "explanation": meaning,
            "reference_sentence": reference_sentence,
            "typo_word": wrong,
            "correct_word": term,
        }

    if gid == "G11":
        prompt = step_prompt or (
            _(f"📖 情境：揀出最啱嘅字——{meaning}", f"📖 Scenario: pick the best word — {meaning}", lang)
            if has_meaning
            else _("📖 情境：聽讀音揀出最啱嘅字", "📖 Scenario: listen and pick the best word", lang)
        )
        return {
            **base,
            "type": "tap",
            "prompt": prompt,
            "options": _shuffle((distractors + [term])[:4]),
            "answer": term,
            "explanation": meaning,
            "auto_play_audio": not has_meaning,
        }

    if gid == "G12":
        similar = _similar_distractor(term, all_terms)
        opts = _shuffle([term, similar])[:2]
        while len(opts) < 2:
            opts.append("...")
        prompt = step_prompt or (
            _(f"🔎 邊個先係解釋做「{meaning}」嘅正字？", f"🔎 Which is the correct word for «{meaning}»?", lang)
            if has_meaning
            else _("🔎 聽讀音，揀出正字", "🔎 Listen, then tap the correct word", lang)
        )
        return {
            **base,
            "type": "word_detective",
            "prompt": prompt,
            "display": None,
            "options": opts,
            "answer": term,
            "explanation": meaning,
            "auto_play_audio": True,
        }

    if gid == "G13":
        ctx = (unit.get("context") or "").strip()
        if term and term in ctx:
            idx = ctx.index(term)
            context_before = ctx[:idx]
            context_after = ctx[idx + len(term):]
        elif "___" in ctx:
            parts = ctx.split("___", 1)
            context_before = parts[0]
            context_after = parts[1] if len(parts) > 1 else ""
        else:
            fallback_ctx = f"___ ({meaning})" if has_meaning else "___"
            blanked = ctx.replace(term, "___") if term and term in ctx else fallback_ctx
            context_before = blanked.split("___")[0] if "___" in blanked else blanked
            context_after = blanked.split("___", 1)[1] if "___" in blanked else ""
        cloze_opts = _shuffle((distractors + [term])[:4])
        while len(cloze_opts) < 4 and distractors:
            cloze_opts.append(distractors[len(cloze_opts) % len(distractors)])
        prompt = step_prompt or _("📚 睇前後句，估中間缺咗咩字", "📚 Read before & after — guess the missing word", lang)
        return {
            **base,
            "type": "cloze_fill",
            "prompt": prompt,
            "sentence": f"{context_before}___{context_after}",
            "context_before": context_before,
            "context_after": context_after,
            "options": cloze_opts[:4],
            "answer": term,
            "hint": meaning or term,
            "explanation": meaning,
            "auto_play_audio": not has_meaning,
        }

    if gid == "G16":
        # Step 1: read-aloud flashcard — tap to hear, then confirm (no MC grid).
        if step == 1:
            return {
                **base,
                "type": "flashcard_read",
                "prompt": _(f"🃏 點擊卡片跟讀「{term}」", f"🃏 Tap the card and read «{term}» aloud", lang),
                "word": term,
                "definition": meaning or "",
                "answer": term,
                "explanation": meaning,
                "auto_play_audio": True,
            }
        if step in (2, 3, 4):
            return {
                **base,
                "type": "memory_write",
                "prompt": _("🃏 記住生字，然後寫出來", "🃏 Memorize the word, then write it", lang),
                "word": term,
                "show_ms": 5000,
                "answer": term,
                "explanation": meaning,
                "auto_play_audio": True,
            }
        prompt = step_prompt or _("🃏 反轉咭卡 — 你識唔識呢個字？", "🃏 Flip — do you know this word?", lang)
        return {
            **base,
            "type": "flashcard",
            "prompt": prompt,
            "front": meaning if has_meaning else _("🔊 聽讀音", "🔊 Listen", lang),
            "back": term,
            "options": _shuffle((distractors + [term])[:4]),
            "answer": term,
            "explanation": meaning,
            "auto_play_audio": True,
        }

    if gid == "G17":
        return {
            **base,
            "type": "sentence_making",
            "prompt": step_prompt or _(f"✍️ 用「{term}」造句", f"✍️ Type a sentence using «{term}»", lang),
            "keyword": term,
            "answer": term,
            "explanation": meaning,
            "min_keyword": True,
        }

    if gid == "G18":
        if re.search(r"[\u4e00-\u9fff]", term):
            if len(term) <= 1:
                masked, missing = term, term
            else:
                idx = len(term) // 2
                masked = term[:idx] + "＿" + term[idx + 1:]
                missing = term[idx]
        else:
            masked, _ans = _mask_letters(term)
            missing = None
        prompt = step_prompt or (
            _(f"📝 填字提示：{meaning}", f"📝 Crossword clue: {meaning}", lang)
            if has_meaning
            else _("📝 聽讀音，填返個字", "📝 Listen and fill in the word", lang)
        )
        return {
            **base,
            "type": "crossword",
            "prompt": prompt,
            "masked": masked,
            "answer": term,
            "missing_part": missing if re.search(r"[\u4e00-\u9fff]", term) else None,
            "explanation": meaning,
            "auto_play_audio": not has_meaning,
        }

    if gid == "G19":
        prompt = step_prompt or _("🔗 配對同義詞／相關字", "🔗 Match the synonym / related word", lang)
        return {
            **base,
            "type": "memory_match",
            "prompt": "",
            "prompt_label": prompt,
            "pair_front": meaning if has_meaning else _("🔊 聽讀音", "🔊 Listen", lang),
            "options": _shuffle((distractors + [term])[:4]),
            "answer": term,
            "explanation": meaning,
            "auto_play_audio": not has_meaning,
        }

    if gid in ("G20", "G20-zh"):
        is_zh = gid == "G20-zh" or bool(re.search(r"[\u4e00-\u9fff]", term))
        lives = 6
        return {
            **base,
            "type": "rescue",
            "prompt": step_prompt or _("🦸 救援行動 — 閘門關閉前猜中！", "🦸 Rescue Mission — guess before the bars close!", lang),
            "answer": term,
            "lives": lives,
            "letter_pool": _letter_pool_for_rescue(term, is_zh),
            "is_zh": is_zh,
            "time_limit_sec": time_limit_sec or 45,
            "explanation": meaning,
        }

    if gid == "READ":
        prompt = step_prompt or _("📖 跟讀 — 聽完再回答", "📖 Read along — listen, then answer", lang)
        question = meaning or _("呢段主要講乜？", "What is the main idea?", lang)
        return {
            **base,
            "game_type": "READ",
            "type": "read_along",
            "prompt": prompt,
            "passage": term,
            "question": question,
            "options": _shuffle((distractors + [term])[:4]) if distractors else _shuffle([term, "...", "...", "..."])[:4],
            "answer": term,
            "explanation": meaning,
            "auto_play_audio": True,
        }

    if gid == "HL":
        tokens = _sentence_tokens(term)
        keywords = _pick_keywords(term, min(2, max(1, len(tokens) // 4)))
        return {
            **base,
            "game_type": "HL",
            "type": "highlight",
            "prompt": step_prompt or _("✋ 點選句子中的關鍵字", "✋ Tap the key words in this sentence", lang),
            "tokens": tokens,
            "keywords": keywords,
            "answer": "|".join(keywords),
            "explanation": meaning,
        }

    # Fallback
    return build_challenge("G3", unit, all_units, step=step, profile=profile)


def build_passage_study_challenge(units: List[dict], step: int, profile: str = "L") -> dict:
    """背默 Step 1 — read full passage in order, chunked for kids."""
    sentences = [u.get("term", "") for u in units if u.get("term")]
    lang = "zh" if any(detect_language(s) == "zh" for s in sentences) else "en"
    chunks: List[str] = []
    buf: List[str] = []
    for s in sentences:
        buf.append(s)
        if len(buf) >= 2 or sum(len(x) for x in buf) > 36:
            chunks.append("\n".join(buf))
            buf = []
    if buf:
        chunks.append("\n".join(buf))
    passage = "\n".join(sentences)
    uids = [u.get("unit_id") for u in units if u.get("unit_id")]
    return {
        "unit_id": uids[0] if uids else "",
        "game_type": "READ",
        "step": step,
        "audio_profile": profile,
        "type": "passage_study",
        "prompt": _("📖 順序閱讀全文（分段）", "📖 Read the passage in order (chunk by chunk)", lang),
        "passage": passage,
        "chunks": chunks or [passage],
        "answer": "ack",
        "auto_pass": True,
    }


def build_full_recall_challenge(units: List[dict], step: int, profile: str = "E") -> dict:
    """背默 Step 10 — full passage reproduction."""
    passage = "\n".join(u.get("term", "") for u in units if u.get("term"))
    uids = [u.get("unit_id") for u in units if u.get("unit_id")]
    lang = "zh" if any(detect_language(u.get("term", "")) == "zh" for u in units) else "en"
    return {
        "unit_id": uids[0] if uids else "",
        "game_type": "G9",
        "step": step,
        "audio_profile": profile,
        "type": "full_recall",
        "prompt": _("背默：憑記憶寫出完整內容", "Write the full passage from memory", lang),
        "answer": passage,
        "answer_unit_ids": uids,
        "peek_disabled": True,
        "replay_limit": 1,
        "peek_limit": 0,
    }


def build_paragraph_recall_challenge(units: List[dict], step: int, profile: str = "R", *, segmented_hint: bool = False) -> dict:
    """背默 Step 6 — paragraph-level G9."""
    passage = " ".join(u.get("term", "") for u in units if u.get("term"))
    uids = [u.get("unit_id") for u in units if u.get("unit_id")]
    lang = "zh" if any(detect_language(u.get("term", "")) == "zh" for u in units) else "en"
    hint_suffix = _("（可用提示）", " (hints allowed)", lang) if segmented_hint else ""
    return {
        "unit_id": uids[0] if uids else "",
        "game_type": "G9",
        "step": step,
        "audio_profile": profile,
        "type": "typing",
        "prompt": _("🔊 段落回想 — 聽音打出整段", "🔊 Paragraph recall — listen and type the full paragraph", lang) + hint_suffix,
        "answer": passage,
        "answer_unit_ids": uids,
        "audio_only": True,
        "listen_mode": "sentence",
        "segment_hints": segmented_hint,
        "peek_disabled": not segmented_hint,
    }


# Per-step game weights so Step 1 (Recognize) and Step 2 (Understand) feel distinct.
STEP_GAME_WEIGHTS: Dict[str, Dict[int, Dict[str, int]]] = {
    "reading_dictation": {
        1: {"G1": 4, "G16": 4, "G2": 2, "G12": 2},
        2: {"G16": 6, "G2": 3, "G3": 2, "G19": 2, "G12": 1},
        3: {"G16": 6, "G18": 2, "G20": 2},
        4: {"G6": 3, "G18": 3, "G20": 2},
        5: {"G18": 4, "G9": 1},
    },
    "recital_dictation": {
        1: {"READ": 8},
        2: {"HL": 4, "G2": 3},
    },
    "quiz": {
        1: {"READ": 3, "G16": 4, "G2": 3},
        2: {"G2": 3, "G19": 4},
    },
}


def pick_game_for_step(
    step_options: List[str],
    unit: dict,
    performance: Optional[Dict[str, dict]] = None,
    *,
    step: int = 0,
    track_type: str = "reading_dictation",
    min_weight: float = 0.18,
) -> str:
    """Weighted random pick from step game options (spec §6.3a)."""
    lang = unit.get("language") or detect_language(unit.get("term", ""))
    eligible = filter_game_options(step_options, lang, step, track_type)
    if len(eligible) == 1:
        return eligible[0]

    step_weights = STEP_GAME_WEIGHTS.get(track_type, {}).get(step, {})
    if step_weights and not performance:
        weights = [max(step_weights.get(g, 1), 1) for g in eligible]
        return random.choices(eligible, weights=weights, k=1)[0]

    if not performance:
        return random.choice(eligible)

    rates: Dict[str, float] = {}
    for g in eligible:
        perf = performance.get(g) or {}
        attempts = int(perf.get("attempts") or 0)
        if attempts >= 5:
            rates[g] = float(perf.get("success_rate") or 0)

    if not rates:
        return random.choice(eligible)

    best = max(rates.values())
    base = 1.0 / len(eligible)
    weights: Dict[str, float] = {}
    for g in eligible:
        w = base
        if g in rates and rates[g] >= best - 0.01 and (rates[g] - min(rates.values())) >= 0.15:
            w = min(0.45, base * 2.8)
        weights[g] = max(w, min_weight)

    total = sum(weights.values())
    probs = [weights[g] / total for g in eligible]
    return random.choices(eligible, weights=probs, k=1)[0]
