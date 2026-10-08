import json
import re
from typing import Any

import httpx

from .config import get_settings

CURRENCY_RE = re.compile(r"(?:₹|rs\.?|inr|usd|\$|€|£)\s*[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?\s*(?:lpa|lakhs?|k|m|per\s+annum)", re.I)
DEADLINE_RE = re.compile(r"\b(?:deadline|apply by|applications? close|closing date|before)\b.{0,80}", re.I)

SYSTEM = """You are ApplyEase Job Lens. Analyze only the supplied job posting. Never infer facts that are not in the text. Return strict JSON only. Every factual claim must carry a source_span with exact character start, end, and exact text copied from the source. This includes summary, title, company, location, type, responsibilities, requirements, preferred requirements, process, skills and deadline. A summary may be a plain-language paraphrase, but its source_span must be the exact source passage that supports it. If a field is not stated, return null or an empty list. Never invent salary, benefits, deadlines, company facts, locations, job types or requirements."""

SCHEMA = {
    "summary": "{text, source_span} or null",
    "responsibilities": "array of {text, source_span}",
    "required": "array of {text, source_span}",
    "preferred": "array of {text, source_span}",
    "process": "array of {text, source_span}",
    "deadline": "{text, source_span} or null",
    "skills": "array of {text, source_span}",
    "title": "{text, source_span} or null",
    "company": "{text, source_span} or null",
    "location": "{text, source_span} or null",
    "type": "{text, source_span} or null",
}


def _prompt(text: str) -> str:
    return (
        "SOURCE TEXT (do not modify):\n"
        f"{text}\n\nReturn JSON matching this shape:\n{json.dumps(SCHEMA)}\n"
        "For every source_span use character offsets into SOURCE TEXT and copy the exact source substring."
    )


def _normal_span(source: str, span: Any) -> dict[str, Any] | None:
    if not isinstance(span, dict):
        return None
    try:
        start, end, copied = int(span["start"]), int(span["end"]), str(span["text"])
    except (KeyError, TypeError, ValueError):
        return None
    if not (0 <= start < end <= len(source)) or source[start:end] != copied:
        return None
    return {"start": start, "end": end, "text": copied}


def _claim(source: str, item: Any) -> tuple[str, dict[str, Any]] | None:
    if not isinstance(item, dict):
        return None
    text = str(item.get("text", "")).strip()
    span = _normal_span(source, item.get("source_span"))
    if not text or span is None:
        return None
    return text, span


def _claim_list(source: str, values: Any) -> tuple[list[str], list[dict[str, Any]]]:
    texts: list[str] = []
    spans: list[dict[str, Any]] = []
    for item in values or []:
        result = _claim(source, item)
        if result is None:
            continue
        text, span = result
        if not _safety_claim_ok(text, span["text"]):
            continue
        texts.append(text)
        spans.append(span)
    return texts, spans


def _scalar_claim(source: str, item: Any) -> tuple[str | None, dict[str, Any] | None]:
    result = _claim(source, item)
    if result is None:
        return None, None
    return result



def _safety_claim_ok(text: str, span_text: str) -> bool:
    """Extra anti-fabrication checks for high-risk salary/deadline claims."""
    currency_claims = CURRENCY_RE.findall(text)
    if currency_claims:
        span_currency = {m.lower().replace(" ", "") for m in CURRENCY_RE.findall(span_text)}
        if not all(m.lower().replace(" ", "") in span_currency for m in currency_claims):
            return False
    if DEADLINE_RE.search(text):
        if not DEADLINE_RE.search(span_text):
            return False
    return True

def validate_grounding(source: str, payload: dict) -> dict:
    """Keep only claims whose supplied source span exactly matches the source."""
    payload = payload if isinstance(payload, dict) else {}
    clean: dict[str, Any] = {"grounded": False}
    spans: dict[str, Any] = {}

    summary, summary_span = _scalar_claim(source, payload.get("summary"))
    if summary_span is not None and summary is not None and not _safety_claim_ok(summary, summary_span["text"]):
        summary, summary_span = None, None
    clean["summary"] = summary or ""
    spans["summary"] = summary_span

    for key in ("responsibilities", "required", "preferred", "process", "skills"):
        texts, claim_spans = _claim_list(source, payload.get(key, []))
        clean[key] = texts
        spans[key] = claim_spans

    deadline, deadline_span = _scalar_claim(source, payload.get("deadline"))
    if deadline_span is not None and deadline is not None and not _safety_claim_ok(deadline, deadline_span["text"]):
        deadline, deadline_span = None, None
    clean["deadline"] = deadline
    spans["deadline"] = deadline_span

    for key in ("title", "company", "location", "type"):
        value, span = _scalar_claim(source, payload.get(key))
        clean[key] = value
        spans[key] = span

    clean["sourceSpans"] = spans

    # A salary/deadline claim cannot survive without an exact source span. Since
    # every retained claim already has one, this additionally removes any
    # unsupported scalar/list claim that somehow contains these patterns while
    # the source contains no corresponding pattern.
    all_claims = [clean.get("summary", ""), clean.get("deadline") or ""]
    for key in ("responsibilities", "required", "preferred", "process", "skills"):
        all_claims.extend(clean[key])
    claim_text = " ".join(all_claims)
    if CURRENCY_RE.search(claim_text) and not CURRENCY_RE.search(source):
        for key in ("responsibilities", "required", "preferred", "process", "skills"):
            kept = [(text, span) for text, span in zip(clean[key], spans[key]) if not CURRENCY_RE.search(text)]
            clean[key] = [text for text, _ in kept]
            spans[key] = [span for _, span in kept]
        if clean["summary"] and CURRENCY_RE.search(clean["summary"]):
            clean["summary"] = ""
            spans["summary"] = None
        if clean["deadline"] and CURRENCY_RE.search(clean["deadline"]):
            clean["deadline"] = None
            spans["deadline"] = None

    if clean["deadline"] and DEADLINE_RE.search(clean["deadline"]) and not DEADLINE_RE.search(source):
        clean["deadline"] = None
        spans["deadline"] = None

    clean["grounded"] = bool(
        clean["summary"]
        or clean["responsibilities"]
        or clean["required"]
        or clean["preferred"]
        or clean["process"]
        or clean["skills"]
    )
    return clean


async def analyze_with_claude(source: str) -> tuple[dict, str]:
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")
    url = settings.anthropic_base_url.rstrip("/") + "/v1/messages"
    headers = {
        "x-api-key": settings.anthropic_api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": settings.anthropic_model,
        "max_tokens": 2200,
        "temperature": 0,
        "system": SYSTEM,
        "messages": [{"role": "user", "content": _prompt(source)}],
    }
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(url, headers=headers, json=body)
        response.raise_for_status()
        data = response.json()
    text = "".join(block.get("text", "") for block in data.get("content", []) if block.get("type") == "text")
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.I | re.M).strip()
    parsed = json.loads(text)
    return validate_grounding(source, parsed), settings.anthropic_model
