#!/usr/bin/env python3
"""Shared helpers for remote-only ingestion and normalization."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Sequence


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
CURATED_DIR = DATA_DIR / "curated"
NORMALIZED_DIR = DATA_DIR / "normalized"

SOURCE_CONFIDENCE_DEFAULTS = {
    "meta": 1.0,
    "pikalytics": 0.96,
    "high_level": 0.9,
    "archive": 0.9,
    "reddit": 0.72,
    "youtube": 0.62,
    "selfplay": 0.4,
    "random": 0.35,
}


def ensure_remote_only() -> None:
    approved_ci = os.getenv("GITHUB_ACTIONS") == "true" and not os.getenv("RUNNER_ENVIRONMENT", "").lower().startswith("self-hosted")
    if not approved_ci:
        raise SystemExit(
            "Remote-only guard: ingestion and training scripts run only on GitHub-hosted "
            "GitHub Actions runners."
        )


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def normalize_key(value: str) -> str:
    return "".join(ch.lower() for ch in str(value or "") if ch.isalnum())


def read_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def canonical_team_slots(slots: Sequence[dict]) -> List[dict]:
    normalized = []
    seen = set()
    for slot in slots or []:
        name = str(slot.get("name", "")).strip()
        if not name:
            continue
        key = normalize_key(name)
        if key in seen:
            continue
        seen.add(key)
        normalized.append(
            {
                "name": name,
                "item": str(slot.get("item", "")).strip(),
                "ability": str(slot.get("ability", "")).strip(),
                "moves": [str(move).strip() for move in slot.get("moves", []) if str(move).strip()],
                "nature": str(slot.get("nature", "")).strip(),
                "spreads": slot.get("spreads", {}) if isinstance(slot.get("spreads", {}), dict) else {},
            }
        )
        if len(normalized) >= 6:
            break
    return normalized


def infer_completeness(slots: Sequence[dict]) -> float:
    normalized = canonical_team_slots(slots)
    if not normalized:
        return 0.0
    fields = 0
    filled = 0
    for slot in normalized:
        fields += 5
        filled += 1
        filled += 1 if slot.get("item") else 0
        filled += 1 if slot.get("ability") else 0
        filled += 1 if slot.get("moves") else 0
        filled += 1 if slot.get("nature") else 0
    return round(filled / max(1, fields), 3)


def normalize_team_entry(
    *,
    source_type: str,
    source_name: str,
    source_url: str,
    archetype: str,
    slots: Sequence[dict],
    tags: Sequence[str],
    confidence: float | None = None,
    import_strategy: str = "normalized",
    notes: str = "",
    team_id: str = "",
) -> dict:
    canonical_slots = canonical_team_slots(slots)
    inferred_confidence = SOURCE_CONFIDENCE_DEFAULTS.get(source_type, 0.5) if confidence is None else confidence
    completeness = infer_completeness(canonical_slots)
    return {
        "id": team_id or normalize_key(f"{source_type}-{source_name}-{','.join(slot['name'] for slot in canonical_slots)}"),
        "sourceType": source_type,
        "sourceName": source_name,
        "sourceUrl": source_url,
        "archetype": archetype,
        "team": canonical_slots,
        "confidence": round(max(0.1, min(1.0, float(inferred_confidence))), 3),
        "completeness": completeness,
        "tags": list(dict.fromkeys([source_type, *tags])),
        "importStrategy": import_strategy,
        "notes": notes,
    }


def build_pool_document(source_type: str, teams: Sequence[dict], notes: str = "") -> dict:
    return {
        "updatedAt": utc_now(),
        "sourceType": source_type,
        "notes": notes,
        "teams": list(teams),
    }
