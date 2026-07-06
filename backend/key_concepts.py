"""Key concept detection for uploaded materials (遊戲庫 v3 §7.1–7.4)."""
from __future__ import annotations

import re
import uuid
from collections import Counter
from typing import Any, Callable, Dict, List, Optional

KEY_CONCEPT_SYSTEM_PROMPT = """You are an expert K-12 curriculum analyst.
Analyze the study material and identify Key Concepts for spaced-repetition learning.
Return ONLY valid JSON, no markdown fences, no commentary.

Schema:
{
  "key_concepts": [
    {
      "exact_term": "must use the EXACT wording from the material — never paraphrase the term itself",
      "simplified_explanation": "plain-language explanation (may rephrase for clarity)",
      "language": "zh or en",
      "presentation": "mindmap | point_form | flashcard | cloze | game",
      "context_snippet": "short quote from material showing usage, or null"
    }
  ]
}

Rules:
- exact_term MUST copy the original material wording for terms/names (exam answers depend on this).
- Identify: repeated proper nouns, bold/heading-like phrases, definition patterns (「XX係指…」「XX稱為…」「XX is…」).
- presentation hints:
  - process/cause-effect chains → mindmap
  - definitions/terms → point_form or flashcard
  - facts/dates/numbers → cloze
  - otherwise → game
- Extract 6–25 concepts depending on material length.
- Split zh vs en per token; mixed uploads should tag each concept's language correctly.
- For track_type=reading_dictation (生字/單字 vocabulary lists): the material is usually
  a LIST of individual words/phrases, not prose. Treat EACH list entry as its own concept
  — never merge multiple words into one concept, even if they run together on one line
  with no spaces (e.g. "你好門口地區好像" is FOUR separate 2-character words: 你好, 門口,
  地區, 好像 — not one 8-character concept).
- NEVER bundle a section heading with its example items into one concept (e.g. a
  "【好詞】喜笑顏開、興高采烈、手舞足蹈" list is a heading plus THREE separate idioms —
  create one concept per idiom, and do not include the "【好詞】" heading itself as a
  concept). This applies to any bulleted/numbered/comma-separated list in any subject.
"""

PRESENTATION_META = {
    "mindmap": {"emoji": "🧠", "label": "心智圖"},
    "point_form": {"emoji": "📋", "label": "重點列表"},
    "flashcard": {"emoji": "🃏", "label": "咭卡 G16"},
    "cloze": {"emoji": "✏️", "label": "填空 G5/G13"},
    "game": {"emoji": "🎮", "label": "遊戲"},
}


def detect_token_language(token: str) -> str:
    if re.search(r"[\u4e00-\u9fff]", token or ""):
        return "zh"
    if re.search(r"[A-Za-z]", token or ""):
        return "en"
    return "neutral"


def language_split_stats(text: str) -> dict:
    zh, en, other = 0, 0, 0
    for tok in re.findall(r"[\u4e00-\u9fff]+|[A-Za-z]+", text or ""):
        lang = detect_token_language(tok)
        if lang == "zh":
            zh += 1
        elif lang == "en":
            en += 1
        else:
            other += 1
    return {"zh_count": zh, "en_count": en, "mixed": zh > 0 and en > 0}


def _guess_presentation(term: str, context: Optional[str], track_type: str) -> str:
    blob = f"{term} {context or ''}"
    if re.search(r"\d{3,4}年|\d+%|→|因此|because|step \d", blob, re.I):
        return "cloze"
    if track_type in ("quiz", "exam"):
        return "point_form"
    if re.search(r"流程|步驟|process|stage|phase", blob, re.I):
        return "mindmap"
    if len(term or "") <= 12:
        return "flashcard"
    return "game"


_LIST_DELIM_RE = re.compile(r"[\n\r\t,，、;；/｜|]+|(?:[ \u3000]{2,})")
# reading_dictation materials ARE word lists by definition, so for that track
# type it's safe to also split on a single space/full-width space — unlike
# the generic delimiter above, which requires 2+ spaces to avoid shredding
# ordinary English prose in other track types.
_WORD_LIST_DELIM_RE = re.compile(r"[\n\r\t,，、;；/｜| \u3000]+")


def _split_word_list(text: str, loose: bool = False) -> List[str]:
    """Split vocab/word-list style material (one word per line, or comma/space
    separated) into individual candidate words."""
    pattern = _WORD_LIST_DELIM_RE if loose else _LIST_DELIM_RE
    parts = [p.strip(" \u3000.。·-") for p in pattern.split(text)]
    return [p for p in parts if p]


def _chunk_cjk_bigrams(token: str) -> List[str]:
    """Best-effort split of unspaced running CJK text into 2-character words —
    the common shape of Cantonese/Mandarin primary vocab lists typed or OCR'd
    without separators between words."""
    chars = [c for c in token if c.strip()]
    chunks = ["".join(chars[i:i + 2]) for i in range(0, len(chars), 2)]
    return [c for c in chunks if c]


def key_concepts_fallback(text: str, track_type: str) -> List[dict]:
    """Heuristic key concept extraction when LLM unavailable."""
    concepts: List[dict] = []
    seen = set()

    def add(term: str, explanation: Optional[str] = None, context: Optional[str] = None):
        term = (term or "").strip()
        if len(term) < 2 or term in seen:
            return
        seen.add(term)
        concepts.append({
            "concept_id": f"kc_{uuid.uuid4().hex[:8]}",
            "exact_term": term[:120],
            "simplified_explanation": explanation,
            "language": detect_token_language(term),
            "presentation": _guess_presentation(term, context, track_type),
            "context_snippet": (context or "")[:200] or None,
        })

    # §7.4 — reading_dictation materials are word LISTS, not prose: a worksheet
    # of vocab (one per line, or comma/space separated, or even one contiguous
    # run of CJK characters typed with no separators) should split into
    # individual 1-4 char words, never one giant "concept" for the whole list.
    if track_type == "reading_dictation":
        stripped = text.strip()
        has_sentence_punct = bool(re.search(r"[。！？.!?]", stripped))
        list_parts = _split_word_list(stripped, loose=not has_sentence_punct)
        if len(list_parts) >= 2:
            for part in list_parts:
                if re.fullmatch(r"[\u4e00-\u9fff]{5,}", part):
                    for w in _chunk_cjk_bigrams(part):
                        add(w)
                elif 1 <= len(part) <= 24:
                    add(part)
            if concepts:
                return concepts[:25]
        elif not has_sentence_punct and re.fullmatch(r"[\u4e00-\u9fff]{4,60}", stripped):
            for w in _chunk_cjk_bigrams(stripped):
                add(w)
            if concepts:
                return concepts[:25]

    # Definition patterns (§7.1)
    for m in re.finditer(
        r"([^\n。！？]{1,40}?)[係称]為[：:]?\s*([^\n。！？]{4,120})",
        text,
    ):
        add(m.group(1).strip(), m.group(2).strip(), m.group(0))

    for m in re.finditer(
        r"([A-Za-z][A-Za-z0-9\s\-]{1,40}?)\s+(?:is|are|means|refers to)\s+([^\n.!?]{4,120})",
        text,
        re.I,
    ):
        add(m.group(1).strip(), m.group(2).strip(), m.group(0))

    # Headings / numbered points
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        hm = re.match(r"^(?:#{1,3}\s*|[\d一二三四五六七八九十]+[.、)]\s*|[•·\-*]\s*)(.{2,80})$", line)
        if hm:
            add(hm.group(1).strip(), context=line)

    # Frequent terms (2+ chars, 2+ occurrences)
    tokens = re.findall(r"[\u4e00-\u9fff]{2,8}|[A-Za-z]{3,20}", text)
    for tok, count in Counter(tokens).most_common(25):
        if count >= 2:
            add(tok)

    if not concepts:
        chunks = [c.strip() for c in re.split(r"\n+", text) if 5 < len(c.strip()) <= 80]
        for c in chunks[:12]:
            add(c[:60])

    return concepts[:25]


_BRACKET_HEADING_RE = re.compile(r"^[【\[][^】\]]{1,20}[】\]]\s*")


def _split_bloated_concept_term(term: str) -> List[str]:
    """Some extractions (a heading-line regex, or an LLM having a bad day)
    bundle a whole list into a single term — e.g. a "【好詞】" section heading
    plus 2-3 idiom examples all glued into one string. Detect and split that
    back into individual terms so no single challenge ends up asking about
    an entire unrelated blob of text (and no "peek hint" reveals a wall of
    text instead of one word/idiom)."""
    cleaned = _BRACKET_HEADING_RE.sub("", term).strip()
    parts = _split_word_list(cleaned, loose=True)
    if len(parts) >= 2 and all(1 <= len(p) <= 24 for p in parts):
        return parts
    return [cleaned or term.strip()]


def _split_bloated_concepts(concepts: List[dict]) -> List[dict]:
    out: List[dict] = []
    for c in concepts:
        term = str(c.get("exact_term") or "")
        looks_listy = bool(_BRACKET_HEADING_RE.match(term)) or (
            len(term) > 12 and re.search(r"[、，,;；/｜|]| {2,}", term)
        )
        if not looks_listy:
            out.append(c)
            continue
        pieces = _split_bloated_concept_term(term)
        if len(pieces) <= 1:
            out.append(c)
            continue
        for p in pieces:
            nc = dict(c)
            nc["concept_id"] = f"kc_{uuid.uuid4().hex[:8]}"
            nc["exact_term"] = p[:120]
            nc["language"] = detect_token_language(p)
            out.append(nc)
    return out[:30]


def normalize_concepts(raw: List[dict], track_type: str) -> List[dict]:
    out = []
    for i, c in enumerate(raw or []):
        if not isinstance(c, dict):
            continue
        term = str(c.get("exact_term") or c.get("term") or "").strip()
        if not term:
            continue
        lang = c.get("language") or detect_token_language(term)
        if lang not in ("zh", "en"):
            lang = detect_token_language(term)
        pres = c.get("presentation") or _guess_presentation(term, c.get("context_snippet"), track_type)
        if pres not in PRESENTATION_META:
            pres = "game"
        out.append({
            "concept_id": c.get("concept_id") or f"kc_{uuid.uuid4().hex[:8]}",
            "exact_term": term[:200],
            "simplified_explanation": (c.get("simplified_explanation") or c.get("meaning") or None),
            "language": lang if lang in ("zh", "en") else detect_token_language(term),
            "presentation": pres,
            "context_snippet": c.get("context_snippet"),
        })
    return out[:30]


def concepts_to_knowledge_units(concepts: List[dict], track_type: str) -> List[dict]:
    """Map key concepts → knowledge unit payloads for track creation."""
    if not concepts:
        return []
    units = []
    for c in concepts:
        term = c["exact_term"]
        if track_type == "reading_dictation":
            unit_type = "word"
        elif track_type == "recital_dictation":
            unit_type = "sentence"
            term = c.get("context_snippet") or term
        elif track_type == "exam":
            unit_type = "topic"
        else:
            unit_type = "concept"
        units.append({
            "unit_type": unit_type,
            "term": str(term)[:300],
            "meaning": c.get("simplified_explanation"),
            "context": c.get("context_snippet"),
            "key_concept_id": c["concept_id"],
            "exact_term": c["exact_term"],
            "simplified_explanation": c.get("simplified_explanation"),
            "presentation": c.get("presentation"),
            "language": c.get("language"),
        })
    return units


async def extract_key_concepts(
    text: str,
    track_type: str,
    *,
    gemini_generate: Optional[Callable] = None,
    gemini_enabled: bool = False,
) -> dict:
    """Full analysis result for API + track creation."""
    stats = language_split_stats(text)
    concepts: List[dict] = []
    source = "fallback"

    if gemini_enabled and gemini_generate:
        try:
            prompt = (
                f"track_type: {track_type}\n"
                f"language_stats: zh_tokens={stats['zh_count']}, en_tokens={stats['en_count']}\n\n"
                f"Material:\n---\n{text[:5000]}\n---\nReturn ONLY the JSON object."
            )
            raw = await gemini_generate(KEY_CONCEPT_SYSTEM_PROMPT, prompt, timeout=12.0)
            import json
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
                cleaned = re.sub(r"\s*```$", "", cleaned)
            data = json.loads(cleaned)
            concepts = normalize_concepts(data.get("key_concepts") or [], track_type)
            if concepts:
                source = "gemini"
        except Exception:
            concepts = []

    if not concepts:
        concepts = key_concepts_fallback(text, track_type)
        source = "fallback"

    concepts = _split_bloated_concepts(concepts)

    for c in concepts:
        meta = PRESENTATION_META.get(c.get("presentation", "game"), PRESENTATION_META["game"])
        c["presentation_emoji"] = meta["emoji"]
        c["presentation_label"] = meta["label"]

    return {
        "key_concepts": concepts,
        "concept_count": len(concepts),
        "language_split": stats,
        "source": source,
        "suggested_formats": list({c["presentation"] for c in concepts}),
    }
