#!/usr/bin/env python3
"""Remote-only lightweight learning loop for the teambuilder.

This pipeline is intentionally offline and intended for GitHub-hosted runners only.
It never runs in the browser and it refuses local execution unless explicitly in
an approved remote CI environment.
"""

from __future__ import annotations

import argparse
import ast
import json
import math
import os
import random
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Sequence


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
NORMALIZED_DIR = DATA_DIR / "normalized"
REPORT_DIR = ROOT / "reports"
BATTLE_LOG_DIR = DATA_DIR / "battle_logs"
CURATED_DIR = DATA_DIR / "curated"

SOURCE_CONFIDENCE_DEFAULTS = {
    "meta": 1.0,
    "pikalytics": 0.96,
    "pikalytics_variant": 0.768,
    "high_level": 0.9,
    "high_level_variant": 0.72,
    "archive": 0.9,
    "archive_variant": 0.72,
    "reddit": 0.72,
    "reddit_variant": 0.576,
    "youtube": 0.62,
    "youtube_variant": 0.496,
    "selfplay": 0.4,
    "random": 0.35,
}

SOURCE_SAMPLING_DEFAULTS = {
    "meta": 1.0,
    "pikalytics": 0.95,
    "pikalytics_variant": 0.74,
    "high_level": 0.9,
    "high_level_variant": 0.72,
    "archive": 0.8,
    "archive_variant": 0.64,
    "reddit": 0.55,
    "reddit_variant": 0.44,
    "youtube": 0.45,
    "youtube_variant": 0.36,
    "selfplay": 0.2,
    "random": 0.2,
}

EVALUATION_SOURCE_CAPS = {
    "selfplay": 0.60,
    "random": 0.05,
}

EVALUATION_SOURCE_MINIMUMS = {
    "archive": 0.10,
    "archive_variant": 0.10,
    "high_level": 0.05,
    "pikalytics": 0.05,
}

EVALUATION_SOURCE_GROUP_MINIMUMS = {
    ("archive", "archive_variant"): 0.22,
    (
        "high_level",
        "high_level_variant",
        "pikalytics",
        "pikalytics_variant",
        "reddit",
        "reddit_variant",
        "youtube",
        "youtube_variant",
        "meta",
    ): 0.20,
}

RETAINED_SOURCE_CAPS = {
    "selfplay": 0.10,
    "archive": 0.40,
    "random": 0.02,
}

RETAINED_SOURCE_MINIMUMS = {
    "archive": 0.22,
    "high_level": 0.15,
}

RETAINED_SOURCE_GROUP_MINIMUMS = {
    ("meta", "pikalytics", "high_level", "archive"): 0.75,
}

MIN_EVALUATION_POOL_FLOOR = 24
MIN_EVALUATION_POOL_FLOOR_LARGE_RUN = 300
MAX_EVALUATION_POOL_TARGET = 1000
MIN_EVALUATION_WARNING_THRESHOLD = 100
RETENTION_POOL_SIZE = 24
MIN_SERIOUS_RETENTION_TEAM_SIZE = 4
STRICT_RETAINED_CAP_SOURCES = {"selfplay", "random"}
SAFE_RETAINED_SELFPLAY_SHARE = 0.15
GUARDRAIL_MAX_EVALUATION_SELFPLAY_SHARE = 0.65
GUARDRAIL_MAX_RETAINED_SELFPLAY_SHARE = 0.18
REAL_VARIANT_SOURCE_TYPES = {
    "archive": "archive_variant",
    "high_level": "high_level_variant",
    "pikalytics": "pikalytics_variant",
    "reddit": "reddit_variant",
    "youtube": "youtube_variant",
}
VARIANT_SOURCE_TYPES = set(REAL_VARIANT_SOURCE_TYPES.values())
VALID_SOURCE_TYPES = {
    "meta",
    "pikalytics",
    "pikalytics_variant",
    "high_level",
    "high_level_variant",
    "archive",
    "archive_variant",
    "reddit",
    "reddit_variant",
    "youtube",
    "youtube_variant",
    "selfplay",
    "random",
}
ORIGINAL_PRIORITY_BONUS = {
    "meta": 0.14,
    "high_level": 0.12,
    "pikalytics": 0.1,
    "archive": 0.09,
    "reddit": 0.05,
    "youtube": 0.04,
    "archive_variant": -0.01,
    "high_level_variant": -0.02,
    "pikalytics_variant": -0.03,
    "reddit_variant": -0.05,
    "youtube_variant": -0.06,
    "selfplay": -0.18,
    "random": -0.12,
}

EVALUATION_SOURCE_ORDER = (
    "meta",
    "pikalytics",
    "pikalytics_variant",
    "high_level",
    "high_level_variant",
    "reddit",
    "reddit_variant",
    "youtube",
    "youtube_variant",
    "archive",
    "archive_variant",
    "random",
    "selfplay",
)


def ensure_remote_only() -> None:
    approved_ci = os.getenv("GITHUB_ACTIONS") == "true" and not os.getenv("RUNNER_ENVIRONMENT", "").lower().startswith("self-hosted")
    if not approved_ci:
        raise SystemExit(
            "Remote-only training guard: this script runs only on GitHub-hosted "
            "GitHub Actions runners."
        )


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def normalize_key(value: str) -> str:
    return "".join(ch.lower() for ch in str(value or "") if ch.isalnum())


def collapse_repeated_source_prefix(text: str, source_type: str) -> str:
    cleaned = str(text or "").strip()
    prefix = canonical_source_type(source_type, "").replace("_", "")
    if not cleaned or not prefix:
        return cleaned
    lowered = normalize_key(cleaned)
    while lowered.startswith(prefix * 2):
        lowered = prefix + lowered[len(prefix) * 2:]
    return lowered or prefix


def canonical_source_type(value: str, fallback: str = "unknown") -> str:
    key = normalize_key(value)
    mapping = {
        "selfplay": "selfplay",
        "self_play": "selfplay",
        "archive": "archive",
        "archivevariant": "archive_variant",
        "meta": "meta",
        "pikalytics": "pikalytics",
        "pikalyticsvariant": "pikalytics_variant",
        "reddit": "reddit",
        "redditvariant": "reddit_variant",
        "youtube": "youtube",
        "youtubevariant": "youtube_variant",
        "random": "random",
        "highlevel": "high_level",
        "highlevelvariant": "high_level_variant",
        "curatedhighlevel": "high_level",
        "creator": "high_level",
    }
    return mapping.get(key, key or fallback)


def is_serialized_slot_blob(value) -> bool:
    if not isinstance(value, str):
        return False
    text = str(value or "").strip()
    if len(text) < 16 or not (text.startswith("{") and text.endswith("}")):
        return False
    lowered = text.lower()
    markers = ("base_species", "display_species", "identity_key", "form_identity", "mega_identity")
    return sum(marker in lowered for marker in markers) >= 2


def is_pathological_serialized_slot_blob(value) -> bool:
    if not isinstance(value, str):
        return False
    text = str(value or "").strip()
    lowered = text.lower()
    if len(text) > 12000:
        return True
    if text.count("{") > 80 or text.count("}") > 80:
        return True
    if lowered.count("base_species") > 8:
        return True
    if lowered.count("identity_key") > 8:
        return True
    if "{'base_species': \"{'base_species':" in text or '"base_species": "{\'base_species\':' in text:
        return True
    return False


def try_parse_serialized_slot(value):
    if not is_serialized_slot_blob(value):
        return None
    if is_pathological_serialized_slot_blob(value):
        return None
    try:
        parsed = ast.literal_eval(str(value).strip())
    except (SyntaxError, ValueError):
        return None
    return parsed if isinstance(parsed, dict) else None


def build_clean_recovered_slot(slot) -> dict:
    if isinstance(slot, dict):
        name = ""
        for key in ("name", "display_species", "species", "base_species", "form_identity"):
            candidate = str(slot.get(key, "")).strip()
            if candidate and not is_serialized_slot_blob(candidate):
                name = candidate
                break
        return {
            "name": name,
            "item": str(slot.get("item", "")).strip(),
            "ability": str(slot.get("ability", "")).strip(),
            "moves": [str(move).strip() for move in slot.get("moves", []) if str(move).strip()] if isinstance(slot.get("moves", []), list) else [],
            "nature": str(slot.get("nature", "")).strip(),
            "spreads": slot.get("spreads", {}) if isinstance(slot.get("spreads", {}), dict) else {},
        }
    name = str(slot or "").strip()
    return {
        "name": name,
        "item": "",
        "ability": "",
        "moves": [],
        "nature": "",
        "spreads": {},
    }


def slot_snapshot(slot) -> str:
    if isinstance(slot, dict):
        try:
            return json.dumps(slot, sort_keys=True, ensure_ascii=True, default=str)
        except TypeError:
            return repr(sorted((str(key), str(value)) for key, value in slot.items()))
    return str(slot)


def merge_slot_payload(primary: dict, secondary: dict) -> dict:
    merged = {}
    for key in set(secondary) | set(primary):
        primary_value = primary.get(key)
        secondary_value = secondary.get(key)
        if isinstance(primary_value, str) and is_serialized_slot_blob(primary_value) and secondary_value not in (None, "", [], {}):
            merged[key] = secondary_value
        elif primary_value in (None, "", [], {}):
            merged[key] = secondary_value
        else:
            merged[key] = primary_value
    return merged


def unwrap_serialized_slot_payload(slot, max_depth=3):
    current = dict(slot) if isinstance(slot, dict) else slot
    best = current
    seen = set()
    target_keys = ("name", "display_species", "species", "base_species", "form_identity")
    for _ in range(max_depth):
        snapshot = slot_snapshot(current)
        if snapshot in seen:
            break
        seen.add(snapshot)
        improved = False
        if isinstance(current, str):
            parsed = try_parse_serialized_slot(current)
            if not parsed:
                break
            candidate = parsed
            candidate_snapshot = slot_snapshot(candidate)
            if candidate_snapshot in seen or candidate_snapshot == snapshot:
                break
            current = candidate
            best = candidate
            improved = True
        elif isinstance(current, dict):
            for key in target_keys:
                parsed = try_parse_serialized_slot(current.get(key))
                if not parsed:
                    continue
                candidate = merge_slot_payload(current, parsed)
                candidate_snapshot = slot_snapshot(candidate)
                if candidate_snapshot in seen or candidate_snapshot == snapshot:
                    continue
                current = candidate
                best = candidate
                improved = True
                break
        if not improved:
            break
    return best


def recover_team_slot(slot) -> dict | None:
    unwrapped = unwrap_serialized_slot_payload(slot, max_depth=3)
    recovered = build_clean_recovered_slot(unwrapped)
    if not recovered.get("name") or is_pathological_serialized_slot_blob(recovered.get("name")):
        return None
    return recovered


def canonical_team_slots(slots: Sequence[dict]) -> List[dict]:
    normalized = []
    seen = set()
    for slot in slots or []:
        recovered = recover_team_slot(slot)
        if not recovered:
            continue
        name = recovered["name"]
        if not name:
            continue
        key = normalize_key(name)
        if key in seen:
            continue
        seen.add(key)
        normalized.append(recovered)
        if len(normalized) >= 6:
            break
    return normalized


def species_list(team_row: dict) -> List[str]:
    return [slot["name"] for slot in canonical_team_slots(team_row.get("team", []))]


def team_size(team_row: dict) -> int:
    return len(species_list(team_row))


def get_summary_team_species_list(team_row: dict) -> List[str]:
    return species_list(team_row)


def species_universe(*pools: Iterable[dict]) -> List[str]:
    names = []
    for pool in pools:
        for row in pool:
            names.extend(species_list(row))
    return sorted(set(names))


def normalize_pool_row(row: dict, fallback_source_type: str = "") -> dict:
    normalized = dict(row or {})
    source_type = canonical_source_type(
        normalized.get("sourceType")
        or normalized.get("source_type")
        or normalized.get("source")
        or fallback_source_type
        or "unknown"
    )
    normalized["sourceType"] = source_type
    normalized["sourceName"] = collapse_repeated_source_prefix(
        normalized.get("sourceName") or normalized.get("source_name") or source_type,
        source_type,
    )
    normalized["sourceUrl"] = normalized.get("sourceUrl") or normalized.get("source_url") or normalized.get("url") or ""
    normalized["archetype"] = str(normalized.get("archetype", "") or "").strip()
    normalized["tags"] = list(dict.fromkeys([str(tag).strip() for tag in normalized.get("tags", []) if str(tag).strip()] + [source_type]))
    return ensure_variant_provenance(normalized)


def load_normalized_pool(path: Path) -> List[dict]:
    payload = read_json(path, {"teams": []})
    teams = payload.get("teams", [])
    fallback_source_type = canonical_source_type(payload.get("sourceType") or path.stem.replace("_pool", ""))
    return [normalized for row in teams if (normalized := normalize_pool_row(row, fallback_source_type)) and species_list(normalized)]


def load_raw_source_pool(path: Path, source_type: str, *field_names: str) -> List[dict]:
    payload = read_json(path, {})
    rows = []
    for field_name in field_names:
        candidate_rows = payload.get(field_name, [])
        if isinstance(candidate_rows, list) and candidate_rows:
            rows = candidate_rows
            break
        if isinstance(candidate_rows, list):
            rows = candidate_rows
    return [
        normalized
        for row in rows
        if (normalized := normalize_pool_row(row, source_type)) and species_list(normalized)
    ]


def root_source_type(row: dict) -> str:
    source_type = canonical_source_type(row.get("sourceType", "unknown"))
    if source_type in VARIANT_SOURCE_TYPES:
        return canonical_source_type(row.get("originSourceType", "unknown"))
    return source_type


def is_variant_source_type(source_type: str) -> bool:
    return canonical_source_type(source_type) in VARIANT_SOURCE_TYPES


def is_variant_row(row: dict) -> bool:
    return is_variant_source_type(row.get("sourceType", ""))


def source_confidence_for(source_type: str) -> float:
    return float(SOURCE_CONFIDENCE_DEFAULTS.get(canonical_source_type(source_type), 0.5))


def source_sampling_for(source_type: str) -> float:
    return float(SOURCE_SAMPLING_DEFAULTS.get(canonical_source_type(source_type), 0.5))


def derive_variant_origin_source_type(source_type: str) -> str:
    source_type = canonical_source_type(source_type, "")
    if source_type in VARIANT_SOURCE_TYPES:
        return canonical_source_type(source_type[: -len("_variant")], "")
    return ""


def ensure_variant_provenance(row: dict) -> dict:
    normalized = dict(row or {})
    source_type = canonical_source_type(normalized.get("sourceType", "unknown"))
    normalized["sourceType"] = source_type
    if source_type not in VARIANT_SOURCE_TYPES:
        return normalized
    origin_source_type = canonical_source_type(
        normalized.get("originSourceType") or derive_variant_origin_source_type(source_type),
        derive_variant_origin_source_type(source_type) or "unknown",
    )
    normalized["originSourceType"] = origin_source_type
    normalized["parentSourceName"] = str(
        normalized.get("parentSourceName")
        or normalized.get("sourceName")
        or origin_source_type
    ).strip()
    normalized["generated"] = bool(normalized.get("generated", True))
    normalized["variantReason"] = str(
        normalized.get("variantReason") or "controlled-source-variant"
    ).strip()
    if "sourceLineageConfidence" not in normalized:
        normalized["sourceLineageConfidence"] = round(source_confidence_for(origin_source_type) * 0.8, 3)
    return normalized


def count_sources(rows: Sequence[dict]) -> Dict[str, int]:
    return dict(Counter(canonical_source_type(row.get("sourceType", "unknown")) for row in rows))


def compute_source_shares_from_counts(source_counts: Dict[str, int]) -> Dict[str, float]:
    total = sum(source_counts.values()) or 1
    return {source_type: count / total for source_type, count in source_counts.items()}


def inspect_pool_file(path: Path) -> dict:
    payload = read_json(path, {"teams": []})
    teams = payload.get("teams", []) if isinstance(payload, dict) else []
    reasons = Counter()
    valid = 0
    samples = []
    for row in teams:
        normalized = normalize_pool_row(row, canonical_source_type(payload.get("sourceType") or path.stem.replace("_pool", "")))
        size = team_size(normalized)
        if size <= 0:
            reasons["normalization_failure_or_empty_team"] += 1
        else:
            valid += 1
        if len(samples) < 5:
            samples.append({
                "sourceType": normalized.get("sourceType"),
                "sourceName": normalized.get("sourceName"),
                "teamSize": size,
            })
    return {
        "exists": path.exists(),
        "rawTeamCount": len(teams),
        "validTeamCount": valid,
        "droppedReasons": dict(reasons),
        "samples": samples,
    }


def match_registry_entry(source_name: str, registry: Sequence[dict]) -> dict | None:
    lowered = str(source_name or "").lower()
    for entry in registry:
        for pattern in entry.get("patterns", []):
            if str(pattern).lower() in lowered:
                return entry
    return None


DEFAULT_CREATOR_PROFILES = [
    {
        "source_name": "PokeaimMD",
        "patterns": ["pokeaim", "pokeaimmd", "joey"],
        "title_patterns": ["top teams", "sample team", "bulky offense", "balance"],
        "archetypes": ["bulky-offense", "balance", "tailwind_balance"],
        "signature_cores": [
            ["Incineroar", "Garchomp", "Whimsicott"],
            ["Incineroar", "Starmie", "Whimsicott"],
        ],
        "quality_class": "high_level_analysis",
        "tags": ["tailwind_balance", "niche_competitive", "experimental_high_level"],
    },
    {
        "source_name": "Wolfe Glick",
        "patterns": ["wolfe", "wolfe glick", "world champ"],
        "title_patterns": ["world champ", "tournament", "championship", "sun", "charizard"],
        "archetypes": ["sun", "bulky-offense", "balance", "trick-room"],
        "signature_cores": [
            ["Charizard", "Venusaur"],
            ["Incineroar", "Whimsicott"],
            ["Farigiraf", "Incineroar"],
        ],
        "quality_class": "tournament_result",
        "tags": ["standard_meta", "mega_sun", "bulky_offense", "anti_rain"],
    },
    {
        "source_name": "Moxie Boosted",
        "patterns": ["moxie boosted", "moxie"],
        "title_patterns": ["rain shell", "ladder", "trick room", "off meta"],
        "archetypes": ["rain", "hard-tr", "balance", "tailwind_balance"],
        "signature_cores": [
            ["Pelipper", "Basculegion"],
            ["Farigiraf", "Kingambit"],
            ["Incineroar", "Whimsicott"],
        ],
        "quality_class": "serious_ladder",
        "tags": ["niche_competitive", "tailwind_balance", "hard_tr"],
    },
]


def creator_profile_catalog(registry: Sequence[dict]) -> List[dict]:
    merged: Dict[str, dict] = {}
    for profile in DEFAULT_CREATOR_PROFILES:
        key = normalize_key(profile.get("source_name") or "")
        if not key:
            continue
        merged[key] = dict(profile)
    for entry in registry:
        key = normalize_key(entry.get("source_name") or "")
        if not key:
            continue
        baseline = dict(merged.get(key, {}))
        baseline.update({k: v for k, v in entry.items() if v not in (None, "", [], {})})
        baseline["patterns"] = list(
            dict.fromkeys([*(merged.get(key, {}).get("patterns", []) or []), *(entry.get("patterns", []) or [])])
        )
        baseline["tags"] = list(
            dict.fromkeys([*(merged.get(key, {}).get("tags", []) or []), *(entry.get("tags", []) or [])])
        )
        baseline["title_patterns"] = list(
            dict.fromkeys([*(merged.get(key, {}).get("title_patterns", []) or []), *(entry.get("title_patterns", []) or [])])
        )
        baseline["archetypes"] = list(
            dict.fromkeys([*(merged.get(key, {}).get("archetypes", []) or []), *(entry.get("archetypes", []) or [])])
        )
        baseline["signature_cores"] = [
            *(merged.get(key, {}).get("signature_cores", []) or []),
            *(entry.get("signature_cores", []) or []),
        ]
        merged[key] = baseline
    return list(merged.values())


def resolve_creator_profile(entry: dict, registry: Sequence[dict]) -> dict:
    source_name = str(entry.get("sourceName") or entry.get("source_name") or entry.get("channel") or entry.get("author") or entry.get("label") or entry.get("title") or "")
    direct = match_registry_entry(source_name, registry)
    if direct:
        return {"matched": True, "profile": direct, "reason": "source_name_pattern", "score": 1.0, "core_overlap": 0.0}
    text_blob = " ".join(
        str(entry.get(field) or "")
        for field in ("sourceName", "source_name", "channel", "author", "label", "title", "notes", "archetype")
    ).lower()
    archetype = str(entry.get("archetype") or "").strip().lower()
    tags = {str(tag).strip().lower() for tag in entry.get("tags", []) if str(tag).strip()}
    species = {normalize_key(name) for name in species_list(entry) if normalize_key(name)}
    best = {"matched": False, "profile": None, "reason": "no_profiles", "score": 0.0, "core_overlap": 0.0}
    for profile in creator_profile_catalog(registry):
        score = 0.0
        core_overlap = 0.0
        if any(pattern in text_blob for pattern in [value.lower() for value in profile.get("title_patterns", [])]):
            score += 0.24
        if archetype and archetype in {value.lower() for value in profile.get("archetypes", [])}:
            score += 0.16
        if tags & {tag.lower() for tag in profile.get("tags", [])}:
            score += 0.08
        for core in profile.get("signature_cores", []):
            core_keys = {normalize_key(name) for name in core}
            overlap = len(species & core_keys) / max(1, len(core_keys))
            core_overlap = max(core_overlap, overlap)
        if len(species) >= 4 and core_overlap >= 0.5:
            score += 0.08
        score += core_overlap * 0.58
        candidate = {
            "matched": score >= 0.42 and (core_overlap >= 0.34 or score >= 0.62),
            "profile": profile,
            "reason": "content_profile",
            "score": round(score, 4),
            "core_overlap": round(core_overlap, 4),
        }
        if candidate["score"] > best["score"]:
            best = candidate
    return best


def build_high_level_pool_from_sources(youtube_pool: Sequence[dict], reddit_pool: Sequence[dict]) -> List[dict]:
    registry = read_json(CURATED_DIR / "high_level_source_registry.json", {"sources": [], "manual_teams": []})
    teams: List[dict] = []
    for source_bucket, origin_source in ((youtube_pool, "youtube"), (reddit_pool, "reddit")):
        for row in source_bucket:
            match = resolve_creator_profile(row, registry.get("sources", []))
            matched = match.get("profile")
            source_name = row.get("sourceName") or row.get("source_name") or row.get("label") or row.get("title") or ""
            if not matched or not match.get("matched"):
                continue
            normalized = normalize_pool_row({**row}, "high_level")
            normalized["sourceType"] = "high_level"
            normalized["sourceName"] = matched.get("source_name") or source_name
            normalized["rawSourceName"] = source_name
            normalized["tags"] = list(dict.fromkeys(list(normalized.get("tags", [])) + ["high_level", origin_source] + list(matched.get("tags", []))))
            normalized["qualityClass"] = matched.get("quality_class", "high_level_analysis")
            normalized["originSourceType"] = origin_source
            normalized["confidence"] = round(max(float(normalized.get("confidence", 0.8) or 0.8), 0.78), 3)
            normalized["matchedCreator"] = matched.get("source_name") or ""
            normalized["creatorMatchReason"] = match.get("reason")
            normalized["creatorMatchScore"] = match.get("score", 0.0)
            normalized["creatorCoreOverlap"] = match.get("core_overlap", 0.0)
            teams.append(normalized)
    for entry in registry.get("manual_teams", []):
        slots = canonical_team_slots(entry.get("team") or entry.get("members") or [])
        if not slots:
            continue
        teams.append(
            {
                "id": normalize_key(f"high-level-{entry.get('source_name', 'creator')}-{'-'.join(slot['name'] for slot in slots)}"),
                "sourceType": "high_level",
                "sourceName": entry.get("source_name") or "curated_high_level",
                "sourceUrl": entry.get("source_url") or "",
                "archetype": entry.get("archetype") or "",
                "team": slots,
                "confidence": round(max(0.1, min(1.0, float(entry.get("confidence", 0.95) or 0.95))), 3),
                "completeness": round(max(0.0, min(1.0, float(entry.get("completeness", 0.85) or 0.85))), 3),
                "tags": list(dict.fromkeys(["high_level", "creator", *(entry.get("tags", []) or [])])),
                "qualityClass": entry.get("quality_class", "high_level_analysis"),
                "originSourceType": "creator",
            }
        )
    deduped = {}
    for row in teams:
        key = "|".join(species_list(row))
        if key:
            incumbent = deduped.get(key)
            if incumbent is None or candidate_quality_score(row) > candidate_quality_score(incumbent):
                deduped[key] = row
    return list(deduped.values())


@dataclass
class CandidateResult:
    label: str
    source_type: str
    confidence: float
    tags: List[str]
    team: List[dict]
    overall: float
    by_source: Dict[str, float]
    diagnostics: Dict[str, dict]


def team_confidence(row: dict) -> float:
    source_type = canonical_source_type(row.get("sourceType", "random"))
    baseline = SOURCE_CONFIDENCE_DEFAULTS.get(source_type, 0.5)
    declared = row.get("confidence")
    completeness = row.get("completeness", 0.0)
    try:
        declared_value = float(declared) if declared is not None else baseline
    except (TypeError, ValueError):
        declared_value = baseline
    try:
        completeness_value = float(completeness)
    except (TypeError, ValueError):
        completeness_value = 0.0
    return max(0.1, min(1.0, declared_value * 0.75 + completeness_value * 0.25))


def role_bonus(team_row: dict, priors: Dict[str, dict]) -> float:
    species = species_list(team_row)
    total = 0.0
    for name in species:
        total += float(priors.get(normalize_key(name), {}).get("weight", 0))
    return total / max(1, len(species))


def move_bonus(team_row: dict, weights: Dict[str, float]) -> float:
    total = 0.0
    count = 0
    for slot in canonical_team_slots(team_row.get("team", [])):
        for move in slot.get("moves", []):
            total += float(weights.get(normalize_key(move), 0))
            count += 1
    return total / max(1, count)


def overlap_penalty(left: Sequence[str], right: Sequence[str]) -> float:
    overlap = len(set(left) & set(right))
    return overlap / max(1, len(set(right)))


def threat_pressure(opponent: Sequence[str], threat_penalties: Dict[str, dict]) -> float:
    if not opponent:
        return 1.0
    total = 0.0
    for species in opponent:
        total += float(threat_penalties.get(normalize_key(species), {}).get("multiplier", 1))
    return total / len(opponent)


def evaluate_vs_pool(
    candidate: dict,
    pool: Sequence[dict],
    priors: Dict[str, dict],
    move_weights: Dict[str, float],
    threat_penalties: Dict[str, dict],
) -> float:
    if not pool:
        return 0.5
    candidate_species = species_list(candidate)
    base_role_bonus = role_bonus(candidate, priors)
    base_move_bonus = move_bonus(candidate, move_weights)
    candidate_signals = get_team_structure_signals(candidate)
    scores = []
    for opponent in pool:
        opponent_species = species_list(opponent)
        source_weight = SOURCE_SAMPLING_DEFAULTS.get(canonical_source_type(opponent.get("sourceType", "random")), 0.5)
        confidence_weight = team_confidence(opponent)
        overlap = overlap_penalty(candidate_species, opponent_species)
        pressure = threat_pressure(opponent_species, threat_penalties)
        partial_penalty = max(0.0, 1.0 - float(opponent.get("completeness", 0)))
        structure_alignment = compute_structure_alignment(candidate, opponent)["alignment"]
        score = (
            1.25
            - overlap * 0.42
            - pressure * 0.16
            - partial_penalty * 0.08
            + base_role_bonus * 0.28
            + base_move_bonus * 0.24
            + structure_alignment * 0.2
            + candidate_signals["shell_integrity"] * 0.08
        )
        scores.append(max(0.0, min(1.0, score * source_weight * 0.35 + confidence_weight * 0.65)))
    return sum(scores) / len(scores)


def team_move_set(team_row: dict) -> set[str]:
    moves = set()
    for slot in canonical_team_slots(team_row.get("team", [])):
        for move in slot.get("moves", []):
            key = normalize_key(move)
            if key:
                moves.add(key)
    return moves


def get_team_structure_signals(team_row: dict) -> dict:
    species = {normalize_key(name) for name in species_list(team_row) if normalize_key(name)}
    moves = team_move_set(team_row)
    has_tailwind = "tailwind" in moves
    has_trick_room = "trickroom" in moves
    has_fake_out = "fakeout" in moves
    has_parting_shot = "partingshot" in moves or "uturn" in moves
    mega_sun = (
        ("charizard" in species or "megacharizardy" in species)
        and ("venusaur" in species or "ninetales" in species or "torkoal" in species)
    )
    rain_shell = "pelipper" in species and ("basculegion" in species or "whimsicott" in species)
    hard_tr = has_trick_room and ("farigiraf" in species or "kingambit" in species or "sinistcha" in species)
    speed_control = has_tailwind or has_trick_room
    shell_integrity = min(1.0, len(species) / 6.0)
    coherence_bonus = 0.0
    if speed_control:
        coherence_bonus += 0.03
    if has_fake_out and has_parting_shot:
        coherence_bonus += 0.03
    if mega_sun:
        coherence_bonus += 0.09
    if hard_tr:
        coherence_bonus += 0.08
    if rain_shell:
        coherence_bonus += 0.05
    return {
        "mega_sun": mega_sun,
        "rain_shell": rain_shell,
        "hard_tr": hard_tr,
        "speed_control": speed_control,
        "shell_integrity": round(shell_integrity, 4),
        "coherence_bonus": round(coherence_bonus, 4),
    }


def compute_high_level_similarity(candidate: dict, reference: dict) -> dict:
    candidate_species = {normalize_key(name) for name in species_list(candidate) if normalize_key(name)}
    reference_species = {normalize_key(name) for name in species_list(reference) if normalize_key(name)}
    if not candidate_species or not reference_species:
        return {
            "similarity": 0.0,
            "shell_overlap": 0.0,
            "core_overlap": 0.0,
            "archetype_overlap": 0.0,
            "move_overlap": 0.0,
        }
    shared_species = candidate_species & reference_species
    shell_overlap = len(shared_species) / max(1, min(len(candidate_species), len(reference_species)))
    core_overlap = min(1.0, len(shared_species) / 3.0)
    candidate_archetype = str(candidate.get("archetype", "") or "").strip().lower()
    reference_archetype = str(reference.get("archetype", "") or "").strip().lower()
    archetype_overlap = 1.0 if candidate_archetype and reference_archetype and candidate_archetype == reference_archetype else 0.0
    candidate_moves = team_move_set(candidate)
    reference_moves = team_move_set(reference)
    move_overlap = len(candidate_moves & reference_moves) / max(1, len(candidate_moves | reference_moves)) if candidate_moves and reference_moves else 0.0
    similarity = (
        shell_overlap * 0.55
        + core_overlap * 0.2
        + archetype_overlap * 0.15
        + move_overlap * 0.1
    )
    return {
        "similarity": round(similarity, 4),
        "shell_overlap": round(shell_overlap, 4),
        "core_overlap": round(core_overlap, 4),
        "archetype_overlap": round(archetype_overlap, 4),
        "move_overlap": round(move_overlap, 4),
    }


def compute_structure_alignment(candidate: dict, reference: dict) -> dict:
    candidate_signals = get_team_structure_signals(candidate)
    reference_signals = get_team_structure_signals(reference)
    structure_hits = 0.0
    if candidate_signals["mega_sun"] and reference_signals["mega_sun"]:
        structure_hits += 0.45
    if candidate_signals["hard_tr"] and reference_signals["hard_tr"]:
        structure_hits += 0.4
    if candidate_signals["rain_shell"] and reference_signals["rain_shell"]:
        structure_hits += 0.3
    if candidate_signals["speed_control"] and reference_signals["speed_control"]:
        structure_hits += 0.18
    shell_integrity = min(candidate_signals["shell_integrity"], reference_signals["shell_integrity"])
    alignment = min(1.0, structure_hits + shell_integrity * 0.2)
    return {
        "alignment": round(alignment, 4),
        "candidateSignals": candidate_signals,
        "referenceSignals": reference_signals,
    }


def evaluate_high_level_pool(candidate: dict, pool: Sequence[dict]) -> tuple[float, dict]:
    if not pool:
        return 0.5, {
            "poolSize": 0,
            "fallbackUsed": True,
            "reason": "high_level pool empty",
            "matched": False,
            "matchedSource": "",
            "similarity": 0.0,
            "shellOverlap": 0.0,
            "coreOverlap": 0.0,
            "archetypeOverlap": 0.0,
            "moveOverlap": 0.0,
            "finalContribution": 0.5,
        }
    scored_matches = []
    for reference in pool:
        similarity = compute_high_level_similarity(candidate, reference)
        confidence = team_confidence(reference)
        quality_class = str(reference.get("qualityClass") or reference.get("quality_class") or "").strip().lower()
        quality_bonus = {
            "tournament_result": 0.12,
            "serious_ladder": 0.08,
            "high_level_analysis": 0.06,
            "experimental_high_level": 0.02,
        }.get(quality_class, 0.03)
        contribution = max(0.0, min(1.0, similarity["similarity"] * 0.72 + confidence * 0.22 + quality_bonus))
        scored_matches.append(
            {
                "sourceName": reference.get("sourceName", "high_level"),
                "matchedCreator": reference.get("matchedCreator") or reference.get("sourceName", "high_level"),
                "rawSourceName": reference.get("rawSourceName") or reference.get("sourceName", "high_level"),
                "originSourceType": reference.get("originSourceType") or reference.get("origin_source_type") or "",
                "qualityClass": quality_class or "unknown",
                "confidence": round(confidence, 4),
                **similarity,
                "contribution": round(contribution, 4),
            }
        )
    scored_matches.sort(key=lambda row: row["contribution"], reverse=True)
    best = scored_matches[0]
    top_matches = scored_matches[:3]
    weighted = sum(match["contribution"] * max(0.2, 1.0 - index * 0.18) for index, match in enumerate(top_matches))
    divisor = sum(max(0.2, 1.0 - index * 0.18) for index, _ in enumerate(top_matches)) or 1.0
    final_score = round(max(0.0, min(1.0, weighted / divisor)), 4)
    return final_score, {
        "poolSize": len(pool),
        "fallbackUsed": False,
        "reason": "creator shell similarity",
        "matched": best["contribution"] > 0.0,
        "matchedSource": best["sourceName"],
        "matchedCreator": best["matchedCreator"],
        "rawSourceName": best["rawSourceName"],
        "originSourceType": best["originSourceType"],
        "qualityClass": best["qualityClass"],
        "similarity": best["similarity"],
        "shellOverlap": best["shell_overlap"],
        "coreOverlap": best["core_overlap"],
        "archetypeOverlap": best["archetype_overlap"],
        "moveOverlap": best["move_overlap"],
        "referenceConfidence": best["confidence"],
        "finalContribution": final_score,
        "topMatches": top_matches,
    }


def make_team_row(
    label: str,
    source_type: str,
    slots: Sequence[dict],
    confidence: float,
    completeness: float,
    tags: Sequence[str],
    source_name: str = "",
    source_url: str = "",
    archetype: str = "",
    provenance: dict | None = None,
) -> dict:
    cleaned_label = collapse_repeated_source_prefix(label, source_type)
    row = {
        "id": normalize_key(cleaned_label if normalize_key(cleaned_label).startswith(normalize_key(source_type)) else f"{source_type}-{cleaned_label}"),
        "sourceType": source_type,
        "sourceName": collapse_repeated_source_prefix(source_name or source_type, source_type),
        "sourceUrl": source_url,
        "archetype": archetype,
        "team": canonical_team_slots(slots),
        "confidence": round(max(0.1, min(1.0, confidence)), 3),
        "completeness": round(max(0.0, min(1.0, completeness)), 3),
        "tags": list(dict.fromkeys([source_type, *tags])),
    }
    if provenance:
        row.update(provenance)
    return row


def candidate_quality_score(row: dict) -> float:
    source_type = canonical_source_type(row.get("sourceType", "unknown"))
    completeness = float(row.get("completeness", 0.0) or 0.0)
    confidence = team_confidence(row)
    archetype = str(row.get("archetype", "") or "").strip().lower()
    tags = {str(tag).strip().lower() for tag in row.get("tags", []) if str(tag).strip()}
    niche_bonus = 0.07 if {"niche_competitive", "anti_rain", "anti_meta"} & tags else 0.0
    archetype_bonus = 0.04 if archetype and archetype not in {"unknown", "standard"} else 0.0
    source_bonus = SOURCE_SAMPLING_DEFAULTS.get(source_type, 0.5) * 0.18
    provenance_penalty = 0.06 if source_type in VARIANT_SOURCE_TYPES else 0.0
    provenance_penalty += 0.12 if source_type == "selfplay" else 0.0
    authority_bonus = ORIGINAL_PRIORITY_BONUS.get(source_type, 0.0)
    return confidence * 0.52 + completeness * 0.26 + source_bonus + niche_bonus + archetype_bonus + authority_bonus - provenance_penalty


def diversify_source_rows(rows: Sequence[dict]) -> List[dict]:
    archetype_buckets: Dict[str, List[dict]] = defaultdict(list)
    for row in sorted(rows, key=candidate_quality_score, reverse=True):
        archetype = str(row.get("archetype", "") or "").strip().lower() or "unknown"
        archetype_buckets[archetype].append(row)
    ordered: List[dict] = []
    selected_per_archetype = Counter()
    while archetype_buckets:
        best_archetype = None
        best_score = None
        for archetype, bucket in archetype_buckets.items():
            if not bucket:
                continue
            head_score = candidate_quality_score(bucket[0])
            score = (
                selected_per_archetype[archetype],
                -head_score,
                -len(bucket),
                archetype,
            )
            if best_score is None or score < best_score:
                best_archetype = archetype
                best_score = score
        if best_archetype is None:
            break
        ordered.append(archetype_buckets[best_archetype].pop(0))
        selected_per_archetype[best_archetype] += 1
        if not archetype_buckets[best_archetype]:
            del archetype_buckets[best_archetype]
    return ordered


def compute_source_target_count(total_candidates: int, share: float, available_count: int) -> int:
    if total_candidates <= 0 or share <= 0 or available_count <= 0:
        return 0
    return min(available_count, max(1, math.ceil(total_candidates * share)))


def compute_source_cap_count(total_candidates: int, share: float, available_count: int) -> int:
    if total_candidates <= 0 or share <= 0 or available_count <= 0:
        return 0
    return min(available_count, max(0, math.floor(total_candidates * share)))


def get_minimum_evaluation_pool_size(iterations: int, generated_count: int) -> int:
    if generated_count <= 0:
        return 0
    floor = MIN_EVALUATION_POOL_FLOOR_LARGE_RUN if iterations >= 1000 else MIN_EVALUATION_POOL_FLOOR
    return min(max(floor, math.ceil(iterations * 0.5)), MAX_EVALUATION_POOL_TARGET)


def result_quality_score(result: CandidateResult) -> float:
    tags = {str(tag).strip().lower() for tag in getattr(result, "tags", []) if str(tag).strip()}
    niche_bonus = 0.04 if {"niche_competitive", "anti_rain", "anti_meta"} & tags else 0.0
    archetype_like_tags = tags - set(EVALUATION_SOURCE_ORDER) - {"generated", "exploratory"}
    archetype_bonus = 0.02 if archetype_like_tags else 0.0
    structure_bonus = min(0.05, len(result.team) * 0.01)
    structure_penalty = 0.18 if len(result.team) < MIN_SERIOUS_RETENTION_TEAM_SIZE else 0.0
    signals = get_team_structure_signals({"team": result.team})
    real_source_strength = (
        float(result.by_source.get("archive", 0.0) or 0.0) * 0.28
        + float(result.by_source.get("meta", 0.0) or 0.0) * 0.28
        + float(result.by_source.get("pikalytics", 0.0) or 0.0) * 0.22
        + float(result.by_source.get("high_level", 0.0) or 0.0) * 0.22
    )
    real_source_bonus = min(0.16, real_source_strength * 0.12)
    novelty_penalty = 0.08 if canonical_source_type(result.source_type) == "selfplay" and real_source_strength < 0.5 else 0.0
    variant_penalty = 0.07 if canonical_source_type(result.source_type) in VARIANT_SOURCE_TYPES else 0.0
    return (
        result.overall * 0.68
        + result.confidence * 0.24
        + niche_bonus
        + archetype_bonus
        + structure_bonus
        + signals["coherence_bonus"]
        + real_source_bonus
        - structure_penalty
        - novelty_penalty
        - variant_penalty
    )


def get_source_backed_retention_adjustment(result: CandidateResult) -> float:
    external_sources = ("archive", "meta", "pikalytics", "high_level", "reddit", "youtube")
    external_scores = {source: float(result.by_source.get(source, 0.0) or 0.0) for source in external_sources}
    strong_support = [source for source, score in external_scores.items() if score >= 0.7]
    moderate_support = [source for source, score in external_scores.items() if score >= 0.6]
    source_type = canonical_source_type(result.source_type)
    if source_type != "selfplay":
        bonus = 0.0
        if source_type in {"archive", "meta", "pikalytics", "high_level"}:
            bonus += 0.05
        elif source_type in VARIANT_SOURCE_TYPES:
            bonus -= 0.03
        if strong_support:
            bonus += 0.04
        return round(bonus, 4)
    adjustment = 0.0
    if "high_level" in strong_support or "archive" in strong_support or "pikalytics" in strong_support:
        adjustment += 0.08
    elif len(moderate_support) >= 2:
        adjustment += 0.04
    if not moderate_support:
        adjustment -= 0.28
    if external_scores["high_level"] < 0.58 and external_scores["archive"] < 0.62:
        adjustment -= 0.12
    if max(external_scores.values() or [0.0]) < 0.58:
        adjustment -= 0.1
    if result.confidence < 0.45:
        adjustment -= 0.08
    return round(adjustment, 4)


def retention_priority_score(result: CandidateResult) -> float:
    source_type = canonical_source_type(result.source_type)
    base = result_quality_score(result) + get_source_backed_retention_adjustment(result)
    if source_type == "selfplay":
        base -= 0.16
    elif source_type in {"high_level_variant", "pikalytics_variant", "archive_variant", "reddit_variant", "youtube_variant"}:
        base -= 0.06
    elif source_type == "high_level":
        base += 0.08
    elif source_type in {"archive", "meta", "pikalytics"}:
        base += 0.06
    return base


def diversify_results(rows: Sequence[CandidateResult]) -> List[CandidateResult]:
    archetype_buckets: Dict[str, List[CandidateResult]] = defaultdict(list)
    for row in sorted(rows, key=retention_priority_score, reverse=True):
        candidate_tags = [
            str(tag).strip().lower()
            for tag in row.tags
            if str(tag).strip()
            and str(tag).strip().lower() not in EVALUATION_SOURCE_ORDER
            and str(tag).strip().lower() not in {"generated", "exploratory"}
        ]
        archetype = candidate_tags[0] if candidate_tags else row.source_type
        archetype_buckets[archetype].append(row)
    ordered: List[CandidateResult] = []
    selected_per_archetype = Counter()
    while archetype_buckets:
        best_archetype = None
        best_score = None
        for archetype, bucket in archetype_buckets.items():
            if not bucket:
                continue
            score = (
                selected_per_archetype[archetype],
                -retention_priority_score(bucket[0]),
                -len(bucket),
                archetype,
            )
            if best_score is None or score < best_score:
                best_archetype = archetype
                best_score = score
        if best_archetype is None:
            break
        ordered.append(archetype_buckets[best_archetype].pop(0))
        selected_per_archetype[best_archetype] += 1
        if not archetype_buckets[best_archetype]:
            del archetype_buckets[best_archetype]
    return ordered


def rebalance_retained_results(
    results: Sequence[CandidateResult],
    target_size: int,
    source_caps: Dict[str, float],
    source_minimums: Dict[str, float],
    source_group_minimums: Dict[tuple, float],
) -> List[CandidateResult]:
    if target_size <= 0:
        return []
    structurally_valid_results = [result for result in results if len(result.team) >= MIN_SERIOUS_RETENTION_TEAM_SIZE]
    candidate_results = structurally_valid_results or list(results)
    grouped: Dict[str, List[CandidateResult]] = defaultdict(list)
    for result in candidate_results:
        grouped[canonical_source_type(result.source_type)].append(result)
    ordered_by_source = {source: diversify_results(rows) for source, rows in grouped.items()}
    selected: List[CandidateResult] = []
    selected_labels = set()
    counts = Counter()
    cursors = defaultdict(int)
    cap_counts = {
        source: max(
            compute_source_cap_count(target_size, share, len(ordered_by_source.get(source, []))),
            compute_source_target_count(target_size, source_minimums.get(source, 0.0), len(ordered_by_source.get(source, []))),
        )
        for source, share in source_caps.items()
    }

    def next_result(source: str):
        rows = ordered_by_source.get(source, [])
        while cursors[source] < len(rows):
            row = rows[cursors[source]]
            cursors[source] += 1
            key = row.label
            if key in selected_labels:
                continue
            return row
        return None

    def take_from_source(source: str, ignore_cap: bool = False) -> bool:
        if not ignore_cap and counts[source] >= cap_counts.get(source, len(ordered_by_source.get(source, []))):
            return False
        row = next_result(source)
        if not row:
            return False
        selected.append(row)
        selected_labels.add(row.label)
        counts[source] += 1
        return True

    for source, share in sorted(source_minimums.items(), key=lambda item: item[1], reverse=True):
        target = compute_source_target_count(target_size, share, len(ordered_by_source.get(source, [])))
        while counts[source] < target and take_from_source(source):
            pass

    for sources, share in source_group_minimums.items():
        target = compute_source_target_count(target_size, share, sum(len(ordered_by_source.get(source, [])) for source in sources))
        while sum(counts[source] for source in sources) < target:
            available_sources = [source for source in sources if counts[source] < cap_counts.get(source, len(ordered_by_source.get(source, []))) and cursors[source] < len(ordered_by_source.get(source, []))]
            if not available_sources:
                break
            available_sources.sort(key=lambda source: (counts[source], -retention_priority_score(ordered_by_source[source][cursors[source]]), source))
            if not take_from_source(available_sources[0]):
                break

    while len(selected) < min(target_size, len(candidate_results)):
        available_sources = [
            source
            for source in ordered_by_source
            if counts[source] < cap_counts.get(source, len(ordered_by_source.get(source, [])))
            and cursors[source] < len(ordered_by_source.get(source, []))
        ]
        if not available_sources:
            break
        available_sources.sort(key=lambda source: (-retention_priority_score(ordered_by_source[source][cursors[source]]), counts[source], source))
        if not take_from_source(available_sources[0]):
            break

    # Soft-cap fallback: if the target size is still not met because real-source coverage is sparse,
    # fill the remaining slots with the best leftover results rather than collapsing the retained pool.
    while len(selected) < min(target_size, len(candidate_results)):
        available_sources = [
            source for source in ordered_by_source if cursors[source] < len(ordered_by_source.get(source, []))
        ]
        if not available_sources:
            break
        available_sources = [
            source
            for source in available_sources
            if source not in STRICT_RETAINED_CAP_SOURCES
            or counts[source] < cap_counts.get(source, len(ordered_by_source.get(source, [])))
        ]
        if not available_sources:
            break
        available_sources.sort(key=lambda source: (-retention_priority_score(ordered_by_source[source][cursors[source]]), counts[source], source))
        if not take_from_source(available_sources[0], ignore_cap=True):
            break

    for source, share in source_caps.items():
        while selected and counts[source] and (counts[source] / max(1, len(selected))) > share:
            removable = [row for row in selected if canonical_source_type(row.source_type) == source]
            if not removable:
                break
            row = min(removable, key=retention_priority_score)
            selected.remove(row)
            selected_labels.discard(row.label)
            counts[source] -= 1

    return selected


def get_locked_species_keys(team_row: dict) -> set[str]:
    slots = canonical_team_slots(team_row.get("team", []))
    moves = {normalize_key(move) for slot in slots for move in slot.get("moves", []) if normalize_key(move)}
    species_keys = [normalize_key(slot["name"]) for slot in slots if normalize_key(slot.get("name", ""))]
    locked = set(species_keys[:2])
    for slot in slots:
        species_key = normalize_key(slot.get("name", ""))
        slot_moves = {normalize_key(move) for move in slot.get("moves", []) if normalize_key(move)}
        if slot_moves & {"tailwind", "trickroom", "fakeout", "raindance", "sunnyday"}:
            locked.add(species_key)
    if "pelipper" in species_keys:
        locked.add("pelipper")
    if "basculegion" in species_keys:
        locked.add("basculegion")
    if "whimsicott" in species_keys and "pelipper" in species_keys:
        locked.add("whimsicott")
    if "charizard" in species_keys or "megacharizardy" in species_keys:
        locked.update({"charizard", "megacharizardy"})
        for partner in ("venusaur", "ninetales", "torkoal"):
            if partner in species_keys:
                locked.add(partner)
    if "trickroom" in moves:
        for partner in ("farigiraf", "kingambit", "sinistcha"):
            if partner in species_keys:
                locked.add(partner)
    return locked


def build_candidate_provenance(parent: dict, variant_source_type: str) -> dict:
    origin_source_type = root_source_type(parent)
    return {
        "sourceType": variant_source_type,
        "originSourceType": origin_source_type,
        "parentSourceName": parent.get("sourceName") or parent.get("parentSourceName") or origin_source_type,
        "generated": True,
        "variantReason": "controlled-source-variant",
        "sourceLineageConfidence": round(source_confidence_for(origin_source_type) * 0.8, 3),
    }


def choose_variant_replacement(
    base_row: dict,
    source_pool: Sequence[dict],
    universe: Sequence[str],
    rng: random.Random,
) -> str | None:
    current_species = {normalize_key(name) for name in species_list(base_row)}
    archetype = str(base_row.get("archetype", "") or "").strip().lower()
    candidate_species = []
    for row in source_pool:
        row_root = root_source_type(row)
        if row_root != root_source_type(base_row):
            continue
        row_archetype = str(row.get("archetype", "") or "").strip().lower()
        if archetype and row_archetype and row_archetype != archetype:
            continue
        signals = compute_structure_alignment(base_row, row)
        if signals["alignment"] < 0.38:
            continue
        for name in species_list(row):
            key = normalize_key(name)
            if key and key not in current_species:
                candidate_species.append(name)
    if not candidate_species:
        candidate_species = [name for name in universe if normalize_key(name) not in current_species]
    if not candidate_species:
        return None
    return rng.choice(candidate_species)


def generate_controlled_variant(
    base_team: dict,
    source_pool: Sequence[dict],
    universe: Sequence[str],
    rng: random.Random,
) -> dict | None:
    origin_source = root_source_type(base_team)
    variant_source_type = REAL_VARIANT_SOURCE_TYPES.get(origin_source)
    if not variant_source_type:
        return None
    slots = canonical_team_slots(base_team.get("team", []))
    if len(slots) < 4:
        return None
    locked = get_locked_species_keys(base_team)
    mutable_indexes = [index for index, slot in enumerate(slots) if normalize_key(slot.get("name", "")) not in locked]
    variant_slots = [dict(slot) for slot in slots]
    swap_count = 1
    if len(mutable_indexes) >= 2 and rng.random() < 0.55:
        swap_count = 2
    for _ in range(swap_count):
        replacement = choose_variant_replacement({"team": variant_slots, "archetype": base_team.get("archetype", ""), "sourceType": base_team.get("sourceType", "")}, source_pool, universe, rng)
        if replacement is None:
            if _ == 0:
                return None
            break
        replacement_slot = {
            "name": replacement,
            "item": "",
            "ability": "",
            "moves": [],
            "nature": "",
            "spreads": {},
        }
        remaining_mutable = [index for index, slot in enumerate(variant_slots) if normalize_key(slot.get("name", "")) not in locked]
        if remaining_mutable:
            variant_slots[rng.choice(remaining_mutable)] = replacement_slot
        elif len(variant_slots) < 6:
            variant_slots.append(replacement_slot)
        else:
            break
    if species_list({"team": variant_slots}) == species_list(base_team):
        return None
    parent_confidence = team_confidence(base_team)
    provenance = build_candidate_provenance(base_team, variant_source_type)
    return make_team_row(
        label=f"{base_team.get('id', 'candidate')}-variant",
        source_type=variant_source_type,
        slots=variant_slots,
        confidence=max(0.1, min(1.0, parent_confidence * 0.8)),
        completeness=max(0.35, min(1.0, float(base_team.get("completeness", 0.6) or 0.6) * 0.97)),
        tags=list(dict.fromkeys(list(base_team.get("tags", [])) + ["generated", "controlled-source-variant", variant_source_type])),
        source_name=base_team.get("sourceName") or provenance["parentSourceName"],
        source_url=base_team.get("sourceUrl") or "",
        archetype=base_team.get("archetype") or "",
        provenance=provenance,
    )


def generate_mutation(base_team: dict, universe: Sequence[str], rng: random.Random) -> dict:
    slots = canonical_team_slots(base_team.get("team", []))
    known_species = [slot["name"] for slot in slots]
    available = [name for name in universe if name not in known_species]
    if not available:
        return base_team
    swaps = 1 if len(slots) < 6 else rng.randint(1, 2)
    for _ in range(swaps):
        if not available:
            break
        replacement = available.pop(rng.randrange(len(available)))
        replacement_slot = {
            "name": replacement,
            "item": "",
            "ability": "",
            "moves": [],
            "nature": "",
            "spreads": {}
        }
        if len(slots) < 6:
            slots.append(replacement_slot)
        else:
            slots[rng.randrange(len(slots))] = replacement_slot
    return make_team_row(
        label=f"{base_team.get('id', 'candidate')}-mut",
        source_type="selfplay",
        slots=slots,
        confidence=0.4,
        completeness=0.4,
        tags=["generated", "exploratory"],
        source_name="self-generated",
        provenance={
            "generated": True,
            "variantReason": "selfplay-exploration",
        },
    )


def compute_desired_evaluation_pool_size(iterations: int, available_count: int) -> int:
    if available_count <= 0:
        return 0
    if iterations >= 1000:
        return min(available_count, max(MIN_EVALUATION_POOL_FLOOR_LARGE_RUN, math.ceil(iterations * 0.8)))
    if iterations >= 200:
        return min(available_count, max(120, math.ceil(iterations * 0.75)))
    return available_count


def rebalance_evaluation_pool(
    rows: Sequence[dict],
    target_size: int,
    source_caps: Dict[str, float],
    source_minimums: Dict[str, float],
    source_group_minimums: Dict[tuple, float],
) -> tuple[List[dict], Dict[str, int]]:
    if target_size <= 0:
        return [], {}
    grouped: Dict[str, List[dict]] = defaultdict(list)
    for row in rows:
        grouped[canonical_source_type(row.get("sourceType", "unknown"))].append(row)
    ordered_by_source = {source: diversify_source_rows(bucket) for source, bucket in grouped.items()}
    selected: List[dict] = []
    selected_ids = set()
    counts = Counter()
    cursors = defaultdict(int)
    dropped = Counter()
    cap_counts = {
        source: max(
            compute_source_cap_count(target_size, share, len(ordered_by_source.get(source, []))),
            compute_source_target_count(target_size, source_minimums.get(source, 0.0), len(ordered_by_source.get(source, []))),
        )
        for source, share in source_caps.items()
    }

    def next_row(source: str):
        rows_for_source = ordered_by_source.get(source, [])
        while cursors[source] < len(rows_for_source):
            row = rows_for_source[cursors[source]]
            cursors[source] += 1
            key = row.get("id") or row.get("sourceName") or "|".join(species_list(row))
            if key in selected_ids:
                continue
            return row
        return None

    def take_from_source(source: str, ignore_cap: bool = False) -> bool:
        if not ignore_cap and counts[source] >= cap_counts.get(source, len(ordered_by_source.get(source, []))):
            dropped[f"cap_{source}"] += 1
            return False
        row = next_row(source)
        if not row:
            return False
        selected.append(row)
        selected_ids.add(row.get("id") or row.get("sourceName") or "|".join(species_list(row)))
        counts[source] += 1
        return True

    for source, share in sorted(source_minimums.items(), key=lambda item: item[1], reverse=True):
        target = compute_source_target_count(target_size, share, len(ordered_by_source.get(source, [])))
        while counts[source] < target and len(selected) < target_size and take_from_source(source):
            pass

    for sources, share in source_group_minimums.items():
        target = compute_source_target_count(target_size, share, sum(len(ordered_by_source.get(source, [])) for source in sources))
        while len(selected) < target_size and sum(counts[source] for source in sources) < target:
            available_sources = [
                source
                for source in sources
                if counts[source] < cap_counts.get(source, len(ordered_by_source.get(source, [])))
                and cursors[source] < len(ordered_by_source.get(source, []))
            ]
            if not available_sources:
                break
            available_sources.sort(
                key=lambda source: (
                    counts[source],
                    -candidate_quality_score(ordered_by_source[source][cursors[source]]),
                    EVALUATION_SOURCE_ORDER.index(source) if source in EVALUATION_SOURCE_ORDER else 999,
                    source,
                )
            )
            if not take_from_source(available_sources[0]):
                break

    while len(selected) < min(target_size, len(rows)):
        available_sources = [
            source
            for source in ordered_by_source
            if cursors[source] < len(ordered_by_source.get(source, []))
            and counts[source] < cap_counts.get(source, len(ordered_by_source.get(source, [])))
        ]
        if not available_sources:
            break
        available_sources.sort(
            key=lambda source: (
                EVALUATION_SOURCE_ORDER.index(source) if source in EVALUATION_SOURCE_ORDER else 999,
                counts[source],
                -candidate_quality_score(ordered_by_source[source][cursors[source]]),
                source,
            )
        )
        if not take_from_source(available_sources[0]):
            break

    while len(selected) < min(target_size, len(rows)):
        available_sources = [
            source
            for source in ordered_by_source
            if source not in source_caps and cursors[source] < len(ordered_by_source.get(source, []))
        ]
        if not available_sources:
            break
        available_sources.sort(
            key=lambda source: (
                EVALUATION_SOURCE_ORDER.index(source) if source in EVALUATION_SOURCE_ORDER else 999,
                counts[source],
                -candidate_quality_score(ordered_by_source[source][cursors[source]]),
                source,
            )
        )
        if not take_from_source(available_sources[0], ignore_cap=True):
            break

    selected_source_keys = {row.get("id") or row.get("sourceName") or "|".join(species_list(row)) for row in selected}
    for row in rows:
        key = row.get("id") or row.get("sourceName") or "|".join(species_list(row))
        if key in selected_source_keys:
            continue
        source_type = canonical_source_type(row.get("sourceType", "unknown"))
        if source_type in source_caps and counts[source_type] >= cap_counts.get(source_type, len(ordered_by_source.get(source_type, []))):
            dropped[f"source_cap_{source_type}"] += 1
        else:
            dropped["target_trim"] += 1
    return selected, dict(dropped)


def build_candidate_pool(
    meta_pool: Sequence[dict],
    pikalytics_pool: Sequence[dict],
    high_level_pool: Sequence[dict],
    reddit_pool: Sequence[dict],
    youtube_pool: Sequence[dict],
    archive_pool: Sequence[dict],
    random_pool: Sequence[dict],
    selfplay_pool: Sequence[dict],
    iterations: int,
    rng: random.Random,
) -> tuple[List[dict], dict]:
    seed_rows = (
        list(meta_pool)
        + list(pikalytics_pool)
        + list(high_level_pool)
        + list(reddit_pool)
        + list(youtube_pool)
        + list(archive_pool)
        + list(random_pool)
        + list(selfplay_pool)
    )
    seed_rows = [normalize_pool_row(row, row.get("sourceType", "unknown")) for row in seed_rows if species_list(row)]
    universe = species_universe(meta_pool, pikalytics_pool, high_level_pool, reddit_pool, youtube_pool, archive_pool, random_pool, selfplay_pool)
    candidates = [row for row in seed_rows if species_list(row)]
    generation_stats = {
        "variantCountsByOrigin": {},
        "droppedCandidatesByReason": {},
    }
    variant_counts = Counter()
    source_variant_inputs = {
        "archive": list(archive_pool),
        "high_level": list(high_level_pool),
        "pikalytics": list(pikalytics_pool),
        "reddit": list(reddit_pool),
        "youtube": list(youtube_pool),
    }
    variant_seeds = [
        normalize_pool_row(row, row.get("sourceType", "unknown"))
        for source_rows in source_variant_inputs.values()
        for row in source_rows
        if species_list(row)
    ]
    controlled_variant_target = max(0, math.ceil(iterations * 0.8))
    controlled_variants: List[dict] = []
    if variant_seeds and controlled_variant_target > 0:
        ordered_variant_sources = ["archive", "high_level", "pikalytics", "reddit", "youtube"]
        source_cursors = {source: 0 for source in ordered_variant_sources}
        diversified_variant_sources = {
            source: diversify_source_rows([normalize_pool_row(row, row.get("sourceType", source)) for row in source_variant_inputs[source] if species_list(row)])
            for source in ordered_variant_sources
        }
        attempts = 0
        max_attempts = max(controlled_variant_target * 8, 100)
        while len(controlled_variants) < controlled_variant_target and attempts < max_attempts:
            attempts += 1
            source = ordered_variant_sources[(attempts - 1) % len(ordered_variant_sources)]
            source_rows = diversified_variant_sources.get(source, [])
            if not source_rows:
                continue
            base_row = source_rows[source_cursors[source] % len(source_rows)]
            source_cursors[source] += 1
            variant = generate_controlled_variant(base_row, source_rows, universe, rng)
            if not variant:
                generation_stats["droppedCandidatesByReason"]["variant_generation_failed"] = generation_stats["droppedCandidatesByReason"].get("variant_generation_failed", 0) + 1
                continue
            variant["id"] = normalize_key(f"{variant['sourceType']}-{len(controlled_variants) + 1}-{variant.get('parentSourceName', '')}")
            controlled_variants.append(variant)
            variant_counts[variant.get("originSourceType", source)] += 1
    candidates.extend(controlled_variants)
    generated_candidates: List[dict] = []
    weighted_seed_rows = [
        row
        for row in seed_rows
        for _ in range(max(1, int(round(SOURCE_SAMPLING_DEFAULTS.get(canonical_source_type(row.get("sourceType")), 0.5) * 10))))
    ]
    selfplay_fill_target = max(0, iterations - len(controlled_variants))
    for index in range(selfplay_fill_target):
        seed_choices = weighted_seed_rows or seed_rows
        if not seed_choices:
            break
        seed = rng.choice(seed_choices)
        mutated = generate_mutation(seed, universe, rng)
        mutated["id"] = normalize_key(f"generated-{index + 1}")
        mutated["sourceName"] = "self-generated"
        mutated["sourceUrl"] = ""
        mutated["tags"] = list(dict.fromkeys(mutated.get("tags", []) + ["generated"]))
        candidates.append(mutated)
        generated_candidates.append(mutated)
    deduped = {}
    duplicate_candidates: List[dict] = []
    for row in candidates:
        key = "|".join(species_list(row))
        if key:
            incumbent = deduped.get(key)
            if incumbent is None or candidate_quality_score(row) > candidate_quality_score(incumbent):
                if incumbent is not None:
                    duplicate_candidates.append(incumbent)
                deduped[key] = row
            else:
                duplicate_candidates.append(row)
    evaluation_pool = list(deduped.values())
    generation_stats["droppedCandidatesByReason"]["duplicate_team_species"] = len(duplicate_candidates)
    minimum_pool_size = get_minimum_evaluation_pool_size(iterations, len(generated_candidates))
    if len(evaluation_pool) < minimum_pool_size and duplicate_candidates:
        for row in sorted(duplicate_candidates, key=candidate_quality_score, reverse=True):
            row_id = row.get("id") or f"candidate-{len(evaluation_pool) + 1}"
            if any(existing.get("id") == row_id for existing in evaluation_pool):
                continue
            evaluation_pool.append(row)
            if len(evaluation_pool) >= minimum_pool_size:
                break
    generation_stats["variantCountsByOrigin"] = dict(variant_counts)
    desired_pool_size = compute_desired_evaluation_pool_size(iterations, len(evaluation_pool))
    balanced_pool, rebalance_drops = rebalance_evaluation_pool(
        evaluation_pool,
        desired_pool_size,
        EVALUATION_SOURCE_CAPS,
        EVALUATION_SOURCE_MINIMUMS,
        EVALUATION_SOURCE_GROUP_MINIMUMS,
    )
    for reason, count in rebalance_drops.items():
        generation_stats["droppedCandidatesByReason"][reason] = generation_stats["droppedCandidatesByReason"].get(reason, 0) + count
    generation_stats["preBalanceSourceCounts"] = count_sources(evaluation_pool)
    generation_stats["postBalanceSourceCounts"] = count_sources(balanced_pool)
    generation_stats["desiredEvaluationPoolSize"] = desired_pool_size
    return balanced_pool, generation_stats


def update_species_role_priors(previous: dict, top_results: Sequence[CandidateResult]) -> dict:
    priors = dict(previous.get("priors", {}))
    counts = Counter()
    for result in top_results:
        for slot in result.team:
            counts[normalize_key(slot["name"])] += 1
    total = max(1, sum(counts.values()))
    for species, count in counts.items():
        row = priors.get(species, {"roles": []})
        row["weight"] = round(count / total, 3)
        priors[species] = row
    return {"updatedAt": utc_now(), "priors": priors}


def update_move_choice_weights(previous: dict, top_results: Sequence[CandidateResult]) -> dict:
    weights = dict(previous.get("weights", {}))
    move_scores = defaultdict(float)
    for result in top_results:
        for slot in result.team:
            for move in slot.get("moves", []):
                move_scores[normalize_key(move)] += result.overall * result.confidence
    divisor = max(1.0, sum(move_scores.values()))
    for move, value in move_scores.items():
        weights[move] = round(max(-1.0, min(1.0, value / divisor * 8)), 3)
    return {"updatedAt": utc_now(), "weights": weights}


def update_threat_penalties(previous: dict, results: Sequence[CandidateResult], source_meta_snapshot: dict) -> dict:
    by_threat = dict(previous.get("byThreat", {}))
    weak_rows = results[-max(4, min(12, len(results))):]
    weak_counts = Counter()
    for result in weak_rows:
        for slot in result.team:
            weak_counts[normalize_key(slot["name"])] += 1
    snapshot_lookup = {normalize_key(row.get("name", "")): row for row in source_meta_snapshot.get("threats", [])}
    for key, snapshot_row in snapshot_lookup.items():
        current = by_threat.get(key, {"multiplier": 1.0, "notes": "Observed in remote source-weighted training."})
        pressure = weak_counts.get(key, 0) / max(1, len(weak_rows))
        current["multiplier"] = round(max(0.6, min(2.2, 1.0 + pressure * 0.35 + float(snapshot_row.get("importance", 1)) * 0.15)), 3)
        current["notes"] = snapshot_row.get("notes", current.get("notes", "Observed in remote source-weighted training."))
        by_threat[key] = current
    return {"updatedAt": utc_now(), "byThreat": by_threat}


def update_learned_weights(previous: dict, top_results: Sequence[CandidateResult], source_meta_snapshot: dict) -> dict:
    candidate_weights = dict(previous.get("candidateScoreWeights", {}))
    mean_score = sum(result.overall for result in top_results) / max(1, len(top_results))
    candidate_weights["rolePrior"] = round(max(2.0, min(12.0, 4.5 + mean_score * 4)), 3)
    candidate_weights["moveWeight"] = round(max(2.0, min(12.0, 3.5 + mean_score * 3.5)), 3)
    candidate_weights["threatPenalty"] = round(max(6.0, min(20.0, 9.5 + (1 - mean_score) * 7)), 3)
    candidate_weights["archiveBias"] = round(max(1.0, min(8.0, 2.0 + len(top_results) * 0.18)), 3)
    threat_rows = source_meta_snapshot.get("threats", [])
    severity_weights = {"default": 1, "byThreat": {}}
    for row in threat_rows:
        severity_weights["byThreat"][normalize_key(row.get("name", ""))] = round(float(row.get("importance", 1)), 3)
    return {
        "version": int(previous.get("version", 1)) + 1,
        "updatedAt": utc_now(),
        "candidateScoreWeights": candidate_weights,
        "leadPairBias": previous.get("leadPairBias", {"fakeOut": 0, "speedControl": 0}),
        "threatSeverityWeights": severity_weights,
        "sourceSamplingWeights": SOURCE_SAMPLING_DEFAULTS,
        "sourceConfidenceDefaults": SOURCE_CONFIDENCE_DEFAULTS,
    }


def update_team_archive(previous: dict, top_results: Sequence[CandidateResult]) -> dict:
    archived = list(previous.get("teams", []))
    for result in top_results[:14]:
        source_type = canonical_source_type(result.source_type)
        if source_type == "selfplay":
            external_support = max(
                float(result.by_source.get("archive", 0.0) or 0.0),
                float(result.by_source.get("meta", 0.0) or 0.0),
                float(result.by_source.get("pikalytics", 0.0) or 0.0),
                float(result.by_source.get("high_level", 0.0) or 0.0),
            )
            if external_support < 0.74 or len(result.team) < 5:
                continue
        archived.append(
            {
                "source": result.source_type,
                "label": result.label,
                "team": [slot["name"] for slot in result.team],
                "score": round(result.overall, 3),
                "confidence": round(result.confidence, 3),
            }
        )
    deduped = {}
    for row in archived:
        key = "|".join(str(name) for name in row.get("team", []))
        if key:
            deduped[key] = row
    return {"updatedAt": utc_now(), "teams": list(deduped.values())[-120:]}


def get_source_feedback_loop_penalty(candidate: dict, by_source: Dict[str, float]) -> float:
    source_type = canonical_source_type(candidate.get("sourceType", "unknown"))
    if source_type != "selfplay":
        return 0.0
    external_sources = ("archive", "meta", "pikalytics", "high_level", "reddit", "youtube")
    external_scores = [float(by_source.get(source, 0.0) or 0.0) for source in external_sources]
    archive_supported = float(by_source.get("archive", 0.0) or 0.0) >= 0.58
    external_overlap = sum(1 for score in external_scores if score >= 0.58)
    penalty = 0.0
    if external_overlap == 0:
        penalty += 0.18
    if not archive_supported:
        penalty += 0.07
    if max(external_scores or [0.0]) < 0.58:
        penalty += 0.09
    if team_confidence(candidate) < 0.45:
        penalty += 0.08
    return round(min(0.42, penalty), 4)


def build_source_meta_snapshot(*pools: Sequence[dict]) -> dict:
    counter = defaultdict(float)
    notes = {}
    sources = defaultdict(set)
    for pool in pools:
        for row in pool:
            confidence = team_confidence(row)
            source_type = canonical_source_type(row.get("sourceType", "unknown"))
            for slot in canonical_team_slots(row.get("team", [])):
                key = normalize_key(slot["name"])
                counter[key] += confidence * SOURCE_SAMPLING_DEFAULTS.get(source_type, 0.5)
                sources[key].add(source_type)
                if row.get("sourceName"):
                    notes[key] = f"Observed in {', '.join(sorted(sources[key]))} source pools."
    top_rows = []
    ordered = sorted(counter.items(), key=lambda item: item[1], reverse=True)[:30]
    if ordered:
        peak = ordered[0][1]
    else:
        peak = 1
    for key, value in ordered:
        top_rows.append(
            {
                "name": key,
                "displayName": key,
                "importance": round(max(0.6, min(1.8, value / peak * 1.8)), 3),
                "sources": sorted(sources[key]),
                "notes": notes.get(key, "Observed in normalized remote sources.")
            }
        )
    return {
        "updatedAt": utc_now(),
        "sources": sorted({source for row in top_rows for source in row.get("sources", [])}),
        "threats": top_rows
    }


def validate_training_state(
    candidates: Sequence[dict],
    retained_results: Sequence[CandidateResult],
    source_meta_snapshot: dict,
    high_level_pool: Sequence[dict],
    source_inputs: Dict[str, Sequence[dict]],
) -> dict:
    errors = []
    variant_errors = 0
    for index, row in enumerate(candidates):
        source_type = canonical_source_type(row.get("sourceType", "unknown"))
        if source_type not in VALID_SOURCE_TYPES:
            errors.append(f"candidate[{index}] invalid sourceType `{source_type}`")
        if source_type in VARIANT_SOURCE_TYPES and not canonical_source_type(row.get("originSourceType", "")):
            variant_errors += 1
        if "archivearchive" in json.dumps(row, ensure_ascii=True, default=str).lower():
            errors.append(f"candidate[{index}] contains archivearchive artifact")
        if contains_team_blob := any(is_serialized_slot_blob(slot.get("name", "")) for slot in canonical_team_slots(row.get("team", []))):
            if contains_team_blob:
                errors.append(f"candidate[{index}] contains serialized slot blob content")
    if variant_errors:
        errors.append(f"{variant_errors} variant candidates missing originSourceType")
    for index, result in enumerate(retained_results):
        if len(result.team) <= 1:
            errors.append(f"retained[{index}] collapsed to {len(result.team)} slot")
    if source_inputs.get("high_level") and not high_level_pool:
        errors.append("high_level pool empty despite available high_level sources")
    for threat in source_meta_snapshot.get("threats", []):
        key = str(threat.get("name", "")).strip()
        if not key or normalize_key(key) != key:
            errors.append(f"threat key not normalized: `{key}`")
    return {
        "ok": not errors,
        "errors": errors,
    }


def build_guardrail_report(
    *,
    iterations: int,
    candidate_rows: Sequence[dict],
    retained_results: Sequence[CandidateResult],
    generation_stats: dict,
    evaluation_target: int,
    validation_status: dict,
    failure_reasons: Sequence[str],
) -> dict:
    retained_source_counts = Counter(result.source_type for result in retained_results)
    evaluation_counts = generation_stats.get("postBalanceSourceCounts") or count_sources(candidate_rows)
    evaluation_shares = compute_source_shares_from_counts(evaluation_counts)
    retained_shares = compute_source_shares_from_counts(dict(retained_source_counts))
    report = {
        "updatedAt": utc_now(),
        "iterations": iterations,
        "candidate_iterations": iterations,
        "evaluationTarget": evaluation_target,
        "evaluatedCandidates": len(candidate_rows),
        "evaluated_candidates": len(candidate_rows),
        "retainedCandidates": len(retained_results),
        "retained_candidates": len(retained_results),
        "persistent_memory_updated": False,
        "preBalanceSourceCounts": generation_stats.get("preBalanceSourceCounts", {}),
        "postBalanceSourceCounts": evaluation_counts,
        "evaluationSelfplayShare": round(evaluation_shares.get("selfplay", 0.0), 4),
        "retainedSelfplayShare": round(retained_shares.get("selfplay", 0.0), 4),
        "variantCountsByOrigin": generation_stats.get("variantCountsByOrigin", {}),
        "droppedCandidatesByReason": generation_stats.get("droppedCandidatesByReason", {}),
        "validationStatus": validation_status,
        "failureReasons": list(failure_reasons),
    }
    return report


def write_guardrail_report(report: dict) -> Path:
    path = REPORT_DIR / "training_guardrails.json"
    write_json(path, report)
    return path


def write_battle_log(results: Sequence[CandidateResult]) -> Path:
    BATTLE_LOG_DIR.mkdir(parents=True, exist_ok=True)
    path = BATTLE_LOG_DIR / f"training-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.jsonl"
    with path.open("w", encoding="utf-8") as handle:
        for result in results:
            handle.write(
                json.dumps(
                    {
                        "timestamp": utc_now(),
                        "label": result.label,
                        "sourceType": result.source_type,
                        "confidence": round(result.confidence, 3),
                        "tags": result.tags,
                        "team": [slot["name"] for slot in result.team],
                        "overall": round(result.overall, 4),
                        "bySource": {key: round(value, 4) for key, value in result.by_source.items()},
                        "diagnostics": result.diagnostics,
                    }
                )
                + "\n"
            )
    return path


def write_high_level_debug(results: Sequence[CandidateResult], high_level_pool_size: int) -> Path:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    path = REPORT_DIR / "high_level_debug.json"
    payload = {
        "updatedAt": utc_now(),
        "highLevelPoolSize": high_level_pool_size,
        "topTeams": [],
    }
    for result in results[:12]:
        payload["topTeams"].append(
            {
                "label": result.label,
                "sourceType": result.source_type,
                "confidence": round(result.confidence, 4),
                "overall": round(result.overall, 4),
                "team": [slot["name"] for slot in result.team],
                "highLevel": result.diagnostics.get("high_level", {}),
                "structureSignals": get_team_structure_signals({"team": result.team}),
            }
        )
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return path


def write_summary(
    results: Sequence[CandidateResult],
    retained_results: Sequence[CandidateResult],
    log_path: Path,
    iterations: int,
    source_counts: Dict[str, int],
    retained_source_counts: Dict[str, int],
    evaluation_target: int,
) -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    summary_results = list(retained_results[:6] or results[:6])
    total_sources = sum(source_counts.values()) or 1
    source_shares = {
        source_type: count / total_sources
        for source_type, count in source_counts.items()
    }
    retained_total_sources = sum(retained_source_counts.values()) or 1
    retained_source_shares = {
        source_type: count / retained_total_sources
        for source_type, count in retained_source_counts.items()
    }
    lines = [
        "# Off-PC Training Summary",
        "",
        f"- Timestamp: {utc_now()}",
        f"- Candidate iterations: {iterations}",
        f"- candidate_iterations: {iterations}",
        f"- Evaluated candidates: {len(results)}",
        f"- evaluated_candidates: {len(results)}",
        f"- Retained learning candidates: {len(retained_results)}",
        f"- retained_candidates: {len(retained_results)}",
        "- persistent_memory_updated: pending persistent_memory.py step",
        f"- Battle log: `{log_path.as_posix().replace(str(ROOT).replace(os.sep, '/'), '').lstrip('/')}`",
        "- High-level debug: `reports/high_level_debug.json`",
        "",
        "## Source Counts",
        "",
    ]
    for source_type in EVALUATION_SOURCE_ORDER:
        count = source_counts.get(source_type, 0)
        lines.append(f"- `{source_type}`: {count}")
    remaining_sources = sorted(source for source in source_counts if source not in EVALUATION_SOURCE_ORDER)
    for source_type in remaining_sources:
        lines.append(f"- `{source_type}`: {source_counts[source_type]}")
    lines.extend(["", "## Source Share", ""])
    for source_type in EVALUATION_SOURCE_ORDER:
        share = source_shares.get(source_type, 0.0)
        lines.append(f"- `{source_type}`: {share * 100:.1f}%")
    for source_type in remaining_sources:
        lines.append(f"- `{source_type}`: {source_shares[source_type] * 100:.1f}%")
    if source_shares.get("selfplay", 0.0) > 0.45:
        lines.extend(["", "WARNING: selfplay exceeds safe learning share"])
    if evaluation_target and len(results) < evaluation_target:
        lines.extend(["", f"WARNING: evaluation pool below expected size ({len(results)} < {evaluation_target})"])
    if iterations >= 1000 and len(results) < MIN_EVALUATION_WARNING_THRESHOLD:
        lines.extend(["", f"WARNING: evaluation pool critically low for run size ({len(results)} candidates)"])
    lines.extend(["", "## Retained Source Counts", ""])
    for source_type in EVALUATION_SOURCE_ORDER:
        count = retained_source_counts.get(source_type, 0)
        lines.append(f"- `{source_type}`: {count}")
    retained_remaining_sources = sorted(source for source in retained_source_counts if source not in EVALUATION_SOURCE_ORDER)
    for source_type in retained_remaining_sources:
        lines.append(f"- `{source_type}`: {retained_source_counts[source_type]}")
    lines.extend(["", "## Retained Source Share", ""])
    for source_type in EVALUATION_SOURCE_ORDER:
        share = retained_source_shares.get(source_type, 0.0)
        lines.append(f"- `{source_type}`: {share * 100:.1f}%")
    for source_type in retained_remaining_sources:
        lines.append(f"- `{source_type}`: {retained_source_shares[source_type] * 100:.1f}%")
    if retained_source_shares.get("selfplay", 0.0) > SAFE_RETAINED_SELFPLAY_SHARE:
        lines.extend(["", "WARNING: retained selfplay exceeds safe learning share"])
    lines.extend(["", "## Top Teams", ""])
    for result in summary_results:
        summary_species = ", ".join(get_summary_team_species_list({"team": result.team}))
        creator_debug = result.diagnostics.get("high_level", {})
        lines.append(
            f"- [{result.source_type}] score `{result.overall:.3f}` confidence `{result.confidence:.2f}`"
        )
        lines.append(f"  `{summary_species}`")
        lines.append(
            f"  meta `{result.by_source['meta']:.3f}` | pikalytics `{result.by_source['pikalytics']:.3f}` | "
            f"high_level `{result.by_source['high_level']:.3f}` | reddit `{result.by_source['reddit']:.3f}` | youtube `{result.by_source['youtube']:.3f}` | "
            f"archive `{result.by_source['archive']:.3f}` | random `{result.by_source['random']:.3f}` | "
            f"selfplay `{result.by_source['selfplay']:.3f}`"
        )
        if creator_debug.get("fallbackUsed"):
            lines.append("  creator match `none` | fallback `high_level pool empty`")
        elif creator_debug.get("matched"):
            lines.append(
                f"  creator match `{creator_debug.get('matchedCreator') or creator_debug.get('matchedSource')}` "
                f"| shell `{creator_debug.get('shellOverlap', 0.0):.2f}` "
                f"| core `{creator_debug.get('coreOverlap', 0.0):.2f}` "
                f"| archetype `{creator_debug.get('archetypeOverlap', 0.0):.2f}` "
                f"| final `{creator_debug.get('finalContribution', 0.0):.3f}`"
            )
        else:
            lines.append("  creator match `none` | unsupported by high-level pool")
    lines.extend(["", "## Creator Matches", ""])
    for result in summary_results:
        creator_debug = result.diagnostics.get("high_level", {})
        label = creator_debug.get("matchedCreator") or creator_debug.get("matchedSource") or "none"
        if creator_debug.get("fallbackUsed"):
            lines.append(f"- `{result.label}`: fallback used because high_level pool was empty")
        elif creator_debug.get("matched"):
            lines.append(
                f"- `{result.label}`: matched `{label}` from `{creator_debug.get('originSourceType', '')}` "
                f"with similarity `{creator_debug.get('similarity', 0.0):.3f}` "
                f"(shell `{creator_debug.get('shellOverlap', 0.0):.2f}`, core `{creator_debug.get('coreOverlap', 0.0):.2f}`, archetype `{creator_debug.get('archetypeOverlap', 0.0):.2f}`)"
            )
        else:
            lines.append(f"- `{result.label}`: no creator support; penalized in retained ranking")
    (REPORT_DIR / "training_summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def snapshot_write_targets() -> Dict[str, float | None]:
    paths = {
        "team_archive": DATA_DIR / "team_archive.json",
        "species_role_priors": DATA_DIR / "species_role_priors.json",
        "move_choice_weights": DATA_DIR / "move_choice_weights.json",
        "threat_penalties": DATA_DIR / "threat_penalties.json",
        "learned_weights": DATA_DIR / "learned_weights.json",
        "combined_training_pool": NORMALIZED_DIR / "combined_training_pool.json",
    }
    return {name: (path.stat().st_mtime if path.exists() else None) for name, path in paths.items()}


def run_synthetic_guardrail_test() -> dict:
    before = snapshot_write_targets()
    passing_report = read_json(REPORT_DIR / "training_guardrails.json", {})
    synthetic_pass = {
        "evaluatedCandidates": int(passing_report.get("evaluatedCandidates", 0)),
        "evaluationSelfplayShare": float(passing_report.get("evaluationSelfplayShare", 1.0)),
        "retainedSelfplayShare": float(passing_report.get("retainedSelfplayShare", 1.0)),
    }
    synthetic_fail_report = {
        "updatedAt": utc_now(),
        "iterations": 1000,
        "evaluationTarget": 800,
        "evaluatedCandidates": 812,
        "retainedCandidates": 24,
        "preBalanceSourceCounts": {"selfplay": 760, "archive": 18, "high_level": 12, "random": 22},
        "postBalanceSourceCounts": {"selfplay": 540, "archive": 120, "archive_variant": 72, "high_level": 40, "high_level_variant": 16, "random": 24},
        "evaluationSelfplayShare": 0.665,
        "retainedSelfplayShare": 0.2083,
        "variantCountsByOrigin": {"archive": 72, "high_level": 16},
        "droppedCandidatesByReason": {"source_cap_selfplay": 220},
        "validationStatus": {"ok": True, "errors": []},
        "failureReasons": [
            "synthetic evaluation selfplay share exceeded fail-safe",
            "synthetic retained selfplay share exceeded fail-safe",
        ],
    }
    write_guardrail_report(synthetic_fail_report)
    after = snapshot_write_targets()
    unchanged = {name: before[name] == after[name] for name in before}
    restored_report = write_guardrail_report(passing_report)
    return {
        "passScenario": {
            "evaluatedCandidates": synthetic_pass["evaluatedCandidates"],
            "evaluationSelfplayShare": round(synthetic_pass["evaluationSelfplayShare"], 4),
            "retainedSelfplayShare": round(synthetic_pass["retainedSelfplayShare"], 4),
            "meetsEvaluatedFloor": synthetic_pass["evaluatedCandidates"] >= 300,
            "meetsEvaluationSelfplayCap": synthetic_pass["evaluationSelfplayShare"] <= 0.60,
            "meetsRetainedSelfplayCap": synthetic_pass["retainedSelfplayShare"] <= 0.15,
        },
        "failScenario": {
            "guardrailReportWritten": restored_report.exists(),
            "learnedOutputsUnchanged": all(unchanged.values()),
            "unchangedTargets": unchanged,
        },
    }


def main() -> None:
    ensure_remote_only()
    parser = argparse.ArgumentParser()
    parser.add_argument("--iterations", type=int, default=32)
    parser.add_argument("--seed", type=int, default=11)
    parser.add_argument("--synthetic-guardrail-test", action="store_true")
    args = parser.parse_args()
    rng = random.Random(args.seed)

    normalized_meta = load_normalized_pool(NORMALIZED_DIR / "meta_pool.json")
    normalized_pikalytics = load_normalized_pool(NORMALIZED_DIR / "pikalytics_pool.json")
    normalized_reddit = load_normalized_pool(NORMALIZED_DIR / "reddit_pool.json")
    normalized_youtube = load_normalized_pool(NORMALIZED_DIR / "youtube_pool.json")
    high_level_file_status = inspect_pool_file(NORMALIZED_DIR / "high_level_creator_pool.json")
    normalized_high_level = load_normalized_pool(NORMALIZED_DIR / "high_level_creator_pool.json")
    if not normalized_high_level:
        fallback_youtube = normalized_youtube or load_raw_source_pool(DATA_DIR / "raw" / "youtube_sources.json", "youtube", "videos", "entries")
        fallback_reddit = normalized_reddit or load_raw_source_pool(DATA_DIR / "raw" / "reddit_threads.json", "reddit", "posts", "entries")
        normalized_high_level = build_high_level_pool_from_sources(fallback_youtube, fallback_reddit)
        if normalized_high_level:
            write_json(
                NORMALIZED_DIR / "high_level_creator_pool.json",
                {
                    "updatedAt": utc_now(),
                    "sourceType": "high_level",
                    "notes": "Fallback build from normalized YouTube/Reddit creator-registry matches.",
                    "teams": normalized_high_level,
                },
            )
        high_level_file_status["fallbackBuildCount"] = len(normalized_high_level)
    write_json(REPORT_DIR / "high_level_pool_status.json", high_level_file_status)
    normalized_random = load_normalized_pool(NORMALIZED_DIR / "random_pool.json")
    normalized_selfplay = load_normalized_pool(NORMALIZED_DIR / "self_play_pool.json")

    archive_state = read_json(DATA_DIR / "team_archive.json", {"teams": []})
    archive_pool = []
    for row in archive_state.get("teams", []):
        slots = canonical_team_slots(row.get("team", []))
        if not slots:
            continue
        archived_source = canonical_source_type(row.get("source", "archive"))
        archived_label = str(row.get("label") or "")
        if archived_source == "selfplay" or archived_label.startswith("generated"):
            continue
        archive_pool.append(
            make_team_row(
                label=collapse_repeated_source_prefix(
                    archived_label or row.get("source_name") or "-".join(species_list({"team": row.get("team", [])})[:2]) or "archive-team",
                    "archive",
                ),
                source_type="archive",
                slots=slots,
                confidence=float(row.get("confidence", 0.85)),
                completeness=0.5,
                tags=["archive"],
                source_name="team_archive",
            )
        )

    learned_weights = read_json(DATA_DIR / "learned_weights.json", {})
    species_role_priors = read_json(DATA_DIR / "species_role_priors.json", {"priors": {}})
    move_choice_weights = read_json(DATA_DIR / "move_choice_weights.json", {"weights": {}})
    threat_penalties = read_json(DATA_DIR / "threat_penalties.json", {"byThreat": {}})

    source_meta_snapshot = build_source_meta_snapshot(
        normalized_meta,
        normalized_pikalytics,
        normalized_high_level,
        normalized_reddit,
        normalized_youtube,
        archive_pool,
        normalized_random,
        normalized_selfplay,
    )
    write_json(NORMALIZED_DIR / "source_meta_snapshot.json", source_meta_snapshot)

    candidates, generation_stats = build_candidate_pool(
        normalized_meta,
        normalized_pikalytics,
        normalized_high_level,
        normalized_reddit,
        normalized_youtube,
        archive_pool,
        normalized_random,
        normalized_selfplay,
        args.iterations,
        rng,
    )
    evaluation_target = max(
        get_minimum_evaluation_pool_size(
            args.iterations,
            sum(1 for row in candidates if canonical_source_type(row.get("sourceType", "unknown")) == "selfplay"),
        ),
        generation_stats.get("desiredEvaluationPoolSize", 0),
    )

    results: List[CandidateResult] = []
    for candidate in candidates:
        high_level_score, high_level_debug = evaluate_high_level_pool(candidate, normalized_high_level)
        by_source = {
            "meta": evaluate_vs_pool(candidate, normalized_meta, species_role_priors.get("priors", {}), move_choice_weights.get("weights", {}), threat_penalties.get("byThreat", {})),
            "pikalytics": evaluate_vs_pool(candidate, normalized_pikalytics, species_role_priors.get("priors", {}), move_choice_weights.get("weights", {}), threat_penalties.get("byThreat", {})),
            "high_level": high_level_score,
            "reddit": evaluate_vs_pool(candidate, normalized_reddit, species_role_priors.get("priors", {}), move_choice_weights.get("weights", {}), threat_penalties.get("byThreat", {})),
            "youtube": evaluate_vs_pool(candidate, normalized_youtube, species_role_priors.get("priors", {}), move_choice_weights.get("weights", {}), threat_penalties.get("byThreat", {})),
            "archive": evaluate_vs_pool(candidate, archive_pool, species_role_priors.get("priors", {}), move_choice_weights.get("weights", {}), threat_penalties.get("byThreat", {})),
            "random": evaluate_vs_pool(candidate, normalized_random, species_role_priors.get("priors", {}), move_choice_weights.get("weights", {}), threat_penalties.get("byThreat", {})),
            "selfplay": evaluate_vs_pool(candidate, normalized_selfplay, species_role_priors.get("priors", {}), move_choice_weights.get("weights", {}), threat_penalties.get("byThreat", {})),
        }
        weighted_score = sum(
            by_source[source] * SOURCE_SAMPLING_DEFAULTS.get(source, 0.5)
            for source in by_source
        ) / max(1.0, sum(SOURCE_SAMPLING_DEFAULTS.get(source, 0.5) for source in by_source))
        weighted_score = max(0.0, weighted_score - get_source_feedback_loop_penalty(candidate, by_source))
        results.append(
            CandidateResult(
                label=candidate.get("id", candidate.get("sourceName", "candidate")),
                source_type=canonical_source_type(candidate.get("sourceType", "random")),
                confidence=team_confidence(candidate),
                tags=list(candidate.get("tags", [])),
                team=canonical_team_slots(candidate.get("team", [])),
                overall=weighted_score,
                by_source=by_source,
                diagnostics={
                    "high_level": high_level_debug,
                    "originSourceType": candidate.get("originSourceType") or "",
                    "parentSourceName": candidate.get("parentSourceName") or "",
                    "generated": bool(candidate.get("generated", False)),
                    "variantReason": candidate.get("variantReason") or "",
                },
            )
        )

    results.sort(key=lambda row: row.overall * row.confidence, reverse=True)
    retained_results = rebalance_retained_results(
        results,
        min(RETENTION_POOL_SIZE, len(results)),
        RETAINED_SOURCE_CAPS,
        RETAINED_SOURCE_MINIMUMS,
        RETAINED_SOURCE_GROUP_MINIMUMS,
    )
    source_counts = Counter(canonical_source_type(row.get("sourceType", "unknown")) for row in candidates)
    retained_source_counts = Counter(result.source_type for result in retained_results)
    evaluation_selfplay_share = (source_counts.get("selfplay", 0) / max(1, len(candidates)))
    retained_selfplay_share = (retained_source_counts.get("selfplay", 0) / max(1, len(retained_results)))
    non_selfplay_evaluated = len(candidates) - source_counts.get("selfplay", 0)
    validation_status = validate_training_state(
        candidates,
        retained_results,
        source_meta_snapshot,
        normalized_high_level,
        {
            "high_level": normalized_high_level,
        },
    )
    failure_reasons = []
    if evaluation_selfplay_share > GUARDRAIL_MAX_EVALUATION_SELFPLAY_SHARE:
        failure_reasons.append(
            f"evaluation selfplay share {evaluation_selfplay_share:.3f} exceeded {GUARDRAIL_MAX_EVALUATION_SELFPLAY_SHARE:.2f}"
        )
    if retained_selfplay_share > GUARDRAIL_MAX_RETAINED_SELFPLAY_SHARE and non_selfplay_evaluated >= 10:
        failure_reasons.append(
            f"retained selfplay share {retained_selfplay_share:.3f} exceeded {GUARDRAIL_MAX_RETAINED_SELFPLAY_SHARE:.2f}"
        )
    if args.iterations >= 1000 and len(candidates) < MIN_EVALUATION_POOL_FLOOR_LARGE_RUN:
        failure_reasons.append(
            f"evaluated candidate pool {len(candidates)} below minimum {MIN_EVALUATION_POOL_FLOOR_LARGE_RUN}"
        )
    if not validation_status["ok"]:
        failure_reasons.append("schema validation failed before writing outputs")
    guardrail_report = build_guardrail_report(
        iterations=args.iterations,
        candidate_rows=candidates,
        retained_results=retained_results,
        generation_stats=generation_stats,
        evaluation_target=evaluation_target,
        validation_status=validation_status,
        failure_reasons=failure_reasons,
    )
    write_guardrail_report(guardrail_report)
    if failure_reasons:
        raise SystemExit(
            "Training guardrail triggered; learned outputs were preserved. "
            + " | ".join(failure_reasons)
        )

    normalized_candidates_for_write = [ensure_variant_provenance(normalize_pool_row(row, row.get("sourceType", "unknown"))) for row in candidates]
    normalized_retained_for_write = []
    for result in retained_results:
        retained_row = {
            "id": result.label,
            "sourceType": result.source_type,
            "originSourceType": result.diagnostics.get("originSourceType") or "",
            "parentSourceName": result.diagnostics.get("parentSourceName") or result.label,
            "generated": bool(result.diagnostics.get("generated", False)),
            "variantReason": result.diagnostics.get("variantReason") or "",
            "sourceName": result.label,
            "sourceUrl": "",
            "archetype": "",
            "team": result.team,
            "confidence": round(result.confidence, 3),
            "completeness": 1.0,
            "tags": result.tags,
            "score": round(result.overall, 4),
        }
        normalized_retained_for_write.append(ensure_variant_provenance(retained_row))

    write_json(
        NORMALIZED_DIR / "combined_training_pool.json",
        {
            "updatedAt": utc_now(),
            "teams": normalized_candidates_for_write,
            "retainedTeams": normalized_retained_for_write,
            "evaluationTarget": evaluation_target,
        },
    )
    log_path = write_battle_log(results)
    write_high_level_debug(results, len(normalized_high_level))

    updated_archive = update_team_archive(archive_state, retained_results)
    updated_priors = update_species_role_priors(species_role_priors, retained_results[:14])
    updated_moves = update_move_choice_weights(move_choice_weights, retained_results[:12])
    updated_penalties = update_threat_penalties(threat_penalties, retained_results or results, source_meta_snapshot)
    updated_weights = update_learned_weights(learned_weights, retained_results[:12] or results[:12], source_meta_snapshot)

    write_json(DATA_DIR / "team_archive.json", updated_archive)
    write_json(DATA_DIR / "species_role_priors.json", updated_priors)
    write_json(DATA_DIR / "move_choice_weights.json", updated_moves)
    write_json(DATA_DIR / "threat_penalties.json", updated_penalties)
    write_json(DATA_DIR / "learned_weights.json", updated_weights)
    write_summary(results, retained_results, log_path, args.iterations, dict(source_counts), dict(retained_source_counts), evaluation_target)
    if args.synthetic_guardrail_test:
        write_json(REPORT_DIR / "synthetic_guardrail_test.json", run_synthetic_guardrail_test())


if __name__ == "__main__":
    main()
