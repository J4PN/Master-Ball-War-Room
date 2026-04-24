#!/usr/bin/env python3
"""Safely expand high-level creator sources from trusted raw and curated buckets."""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

from common import CURATED_DIR, NORMALIZED_DIR, ROOT, build_pool_document, ensure_remote_only, normalize_key, normalize_team_entry, read_json, utc_now, write_json


RAW_YOUTUBE = CURATED_DIR.parent / "raw" / "youtube_sources.json"
RAW_REDDIT = CURATED_DIR.parent / "raw" / "reddit_threads.json"
CURATED_REGISTRY = CURATED_DIR / "high_level_source_registry.json"
CURATED_YOUTUBE = CURATED_DIR / "youtube_imports.json"
CURATED_REDDIT = CURATED_DIR / "reddit_imports.json"
CURATED_PIKALYTICS = CURATED_DIR / "pikalytics_imports.json"
CURATED_EXPANDED = CURATED_DIR / "high_level_expanded_candidates.json"
NORMALIZED_HIGH_LEVEL = NORMALIZED_DIR / "high_level_creator_pool.json"
REPORT_JSON = ROOT / "reports" / "high_level_expansion_review.json"
REPORT_MD = ROOT / "reports" / "high_level_expansion_review.md"

TRUSTED_BUCKET_SCORES = {
    "existing_high_level": 0.94,
    "manual_registry": 0.96,
    "curated_youtube": 0.9,
    "curated_reddit": 0.9,
    "curated_pikalytics": 0.88,
    "raw_youtube": 0.7,
    "raw_reddit": 0.72,
}

DEFAULT_CREATOR_PROFILES = [
    {
        "source_name": "PokeaimMD",
        "patterns": ["pokeaim", "pokeaimmd", "joey"],
        "title_patterns": ["top teams", "sample team", "bulky offense", "balance"],
        "archetypes": ["bulky-offense", "balance", "tailwind_balance"],
        "signature_cores": [["Incineroar", "Garchomp", "Whimsicott"], ["Incineroar", "Starmie", "Whimsicott"]],
        "quality_class": "high_level_analysis",
        "tags": ["tailwind_balance", "niche_competitive", "experimental_high_level"],
    },
    {
        "source_name": "Wolfe Glick",
        "patterns": ["wolfe", "wolfe glick", "world champ"],
        "title_patterns": ["world champ", "tournament", "championship", "sun", "charizard"],
        "archetypes": ["sun", "bulky-offense", "balance", "trick-room"],
        "signature_cores": [["Charizard", "Venusaur"], ["Incineroar", "Whimsicott"], ["Farigiraf", "Incineroar"]],
        "quality_class": "tournament_result",
        "tags": ["standard_meta", "mega_sun", "bulky_offense", "anti_rain"],
    },
    {
        "source_name": "Moxie Boosted",
        "patterns": ["moxie boosted", "moxie"],
        "title_patterns": ["rain shell", "ladder", "trick room", "off meta"],
        "archetypes": ["rain", "hard-tr", "balance", "tailwind_balance"],
        "signature_cores": [["Pelipper", "Basculegion"], ["Farigiraf", "Kingambit"], ["Incineroar", "Whimsicott"]],
        "quality_class": "serious_ladder",
        "tags": ["niche_competitive", "tailwind_balance", "hard_tr"],
    },
    {
        "source_name": "CybertronVGC",
        "patterns": ["cybertron", "cybertronvgc", "aaron zheng", "aaron"],
        "title_patterns": ["vgc", "tournament", "regionals", "balance", "tailwind"],
        "archetypes": ["balance", "bulky-offense", "tailwind_balance"],
        "signature_cores": [["Incineroar", "Whimsicott"], ["Amoonguss", "Landorus"], ["Urshifu", "Rillaboom"]],
        "quality_class": "tournament_result",
        "tags": ["standard_meta", "balance", "tournament"],
    },
]

ALLOWED_FULL_AUTHORITY_CLASSES = {"high_level_verified"}
ILLEGAL_TEXT_MARKERS = ("base_species", "display_species", "identity_key", "form_identity", "mega_identity", "archivearchive")


def creator_profile_catalog(registry_sources):
    merged = {}
    for profile in DEFAULT_CREATOR_PROFILES:
        merged[normalize_key(profile["source_name"])] = dict(profile)
    for entry in registry_sources:
        key = normalize_key(entry.get("source_name") or "")
        if not key:
            continue
        baseline = dict(merged.get(key, {}))
        baseline.update({k: v for k, v in entry.items() if v not in (None, "", [], {})})
        for field in ("patterns", "title_patterns", "archetypes", "tags"):
            baseline[field] = list(dict.fromkeys([*(merged.get(key, {}).get(field, []) or []), *(entry.get(field, []) or [])]))
        baseline["signature_cores"] = [*(merged.get(key, {}).get("signature_cores", []) or []), *(entry.get("signature_cores", []) or [])]
        merged[key] = baseline
    return list(merged.values())


def get_bucket_entries(payload, *field_names):
    for field_name in field_names:
        values = payload.get(field_name, [])
        if isinstance(values, list) and values:
            return values
    for field_name in field_names:
        values = payload.get(field_name, [])
        if isinstance(values, list):
            return values
    return []


def resolve_creator_profile(entry, registry_sources):
    profiles = creator_profile_catalog(registry_sources)
    source_name = " ".join(
        str(entry.get(field) or "")
        for field in ("source_name", "sourceName", "channel", "author", "title", "notes")
    ).lower()
    archetype = str(entry.get("archetype") or "").strip().lower()
    tags = {str(tag).strip().lower() for tag in entry.get("tags", []) if str(tag).strip()}
    species = {normalize_key(slot.get("name") or slot.get("species")) for slot in (entry.get("team") or entry.get("members") or []) if isinstance(slot, dict)}
    best = {"matched": False, "profile": None, "score": 0.0, "core_overlap": 0.0, "reason": "no_match"}
    for profile in profiles:
        score = 0.0
        core_overlap = 0.0
        if any(pattern.lower() in source_name for pattern in profile.get("patterns", [])):
            score += 0.46
        if any(pattern.lower() in source_name for pattern in profile.get("title_patterns", [])):
            score += 0.2
        if archetype and archetype in {value.lower() for value in profile.get("archetypes", [])}:
            score += 0.12
        if tags & {tag.lower() for tag in profile.get("tags", [])}:
            score += 0.08
        for core in profile.get("signature_cores", []):
            core_keys = {normalize_key(name) for name in core}
            core_overlap = max(core_overlap, len(species & core_keys) / max(1, len(core_keys)))
        score += core_overlap * 0.4
        candidate = {
            "matched": score >= 0.52 or (score >= 0.42 and core_overlap >= 0.5),
            "profile": profile,
            "score": round(score, 4),
            "core_overlap": round(core_overlap, 4),
            "reason": "profile_match" if score else "no_match",
        }
        if candidate["score"] > best["score"]:
            best = candidate
    return best


def infer_archetype(entry):
    explicit = str(entry.get("archetype") or "").strip().lower()
    if explicit:
        return explicit
    names = {normalize_key(slot.get("name") or "") for slot in entry.get("team", []) if isinstance(slot, dict)}
    moves = {normalize_key(move) for slot in entry.get("team", []) if isinstance(slot, dict) for move in slot.get("moves", [])}
    if "pelipper" in names and "basculegion" in names:
        return "rain"
    if ("charizard" in names or "megacharizardy" in names) and ({"venusaur", "torkoal", "ninetales"} & names):
        return "mega-sun"
    if "trickroom" in moves or {"farigiraf", "cresselia"} & names:
        return "trick-room"
    if "tailwind" in moves and {"incineroar", "whimsicott"} & names:
        return "tailwind_balance"
    if {"incineroar", "kingambit", "garchomp"} <= names:
        return "bulky-offense"
    return "balance"


def has_blob_or_corruption(entry):
    text = json.dumps(entry, ensure_ascii=True, default=str).lower()
    return any(marker in text for marker in ILLEGAL_TEXT_MARKERS)


def compute_structure_coherence(normalized_entry):
    team = normalized_entry.get("team", [])
    if len(team) < 4:
        return 0.0
    names = {normalize_key(slot.get("name") or "") for slot in team}
    moves = {normalize_key(move) for slot in team for move in slot.get("moves", [])}
    score = min(0.45, len(team) * 0.08)
    if "tailwind" in moves or "trickroom" in moves:
        score += 0.12
    if {"incineroar", "whimsicott"} <= names:
        score += 0.1
    if {"pelipper", "basculegion"} <= names:
        score += 0.16
    if ("charizard" in names or "megacharizardy" in names) and ({"venusaur", "torkoal", "ninetales"} & names):
        score += 0.18
    if {"farigiraf", "kingambit"} <= names or "trickroom" in moves:
        score += 0.14
    if len(team) >= 5:
        score += 0.08
    return round(min(1.0, score), 4)


def classify_candidate(raw_entry, bucket_name, registry_sources):
    source_name = raw_entry.get("sourceName") or raw_entry.get("source_name") or raw_entry.get("title") or bucket_name
    source_url = raw_entry.get("sourceUrl") or raw_entry.get("source_url") or raw_entry.get("url") or ""
    tags = list(dict.fromkeys([str(tag).strip() for tag in raw_entry.get("tags", []) if str(tag).strip()] + [bucket_name]))
    normalized = normalize_team_entry(
        source_type="high_level",
        source_name=str(source_name),
        source_url=str(source_url),
        archetype=infer_archetype(raw_entry),
        slots=raw_entry.get("team") or raw_entry.get("members") or [],
        tags=tags,
        confidence=raw_entry.get("confidence", 0.72),
        import_strategy=raw_entry.get("importStrategy", f"{bucket_name}-expansion"),
        notes=raw_entry.get("notes", f"Expanded from {bucket_name}."),
    )
    creator_match = resolve_creator_profile(raw_entry, registry_sources)
    matched_creator = (
        ((creator_match.get("profile", {}) or {}).get("source_name")) if creator_match.get("matched") else ""
    ) or raw_entry.get("matchedCreator") or raw_entry.get("sourceName") or raw_entry.get("source_name") or bucket_name
    normalized["matchedCreator"] = matched_creator
    normalized["originSourceType"] = raw_entry.get("originSourceType") or bucket_name.replace("curated_", "").replace("raw_", "")
    normalized["rawSourceName"] = raw_entry.get("sourceName") or raw_entry.get("source_name") or raw_entry.get("title") or ""
    normalized["qualityClass"] = raw_entry.get("qualityClass") or raw_entry.get("quality_class") or (creator_match.get("profile", {}) or {}).get("quality_class") or "high_level_analysis"
    normalized["creatorMatchReason"] = creator_match.get("reason")
    normalized["creatorMatchScore"] = creator_match.get("score", 0.0)
    normalized["creatorCoreOverlap"] = creator_match.get("core_overlap", 0.0)
    normalized["archetype"] = infer_archetype(normalized)
    team_size = len(normalized.get("team", []))
    trust_score = TRUSTED_BUCKET_SCORES.get(bucket_name, 0.65)
    structure_score = compute_structure_coherence(normalized)
    completeness = float(normalized.get("completeness", 0.0) or 0.0)
    partial_flag = "partial" in {tag.lower() for tag in normalized.get("tags", [])}
    rejection_reasons = []
    if has_blob_or_corruption(normalized):
        rejection_reasons.append("serialized_blob_or_corruption")
    if team_size <= 1:
        rejection_reasons.append("team_too_small")
    if not normalized.get("sourceType"):
        rejection_reasons.append("missing_source_type")
    if not normalized.get("matchedCreator"):
        rejection_reasons.append("missing_matched_creator")
    confidence = min(0.95, max(0.35, trust_score * 0.45 + structure_score * 0.35 + completeness * 0.2 + creator_match.get("score", 0.0) * 0.08))
    if bucket_name.startswith("raw_") and partial_flag:
        confidence = min(confidence, 0.74)
    if confidence < 0.5 and not rejection_reasons:
        rejection_reasons.append("low_confidence")
    if rejection_reasons:
        classification = "rejected"
    elif team_size >= 4 and trust_score >= 0.86 and structure_score >= 0.6 and not partial_flag and (creator_match.get("matched") or bucket_name.startswith("curated_") or bucket_name in {"manual_registry", "existing_high_level"}):
        classification = "high_level_verified"
        confidence = max(confidence, 0.82)
    elif team_size >= 4 and structure_score >= 0.45:
        classification = "high_level_partial"
        confidence = min(confidence, 0.79)
    else:
        classification = "needs_review"
        confidence = min(confidence, 0.69)
    if classification not in ALLOWED_FULL_AUTHORITY_CLASSES:
        confidence = min(confidence, 0.79)
    normalized["confidence"] = round(confidence, 3)
    normalized["classification"] = classification
    normalized["expansionBucket"] = bucket_name
    normalized["expansionReasons"] = rejection_reasons or [classification]
    return normalized


def dedupe_candidates(rows):
    deduped = {}
    review_rejections = []
    for row in rows:
        key = "|".join(sorted(slot.get("name", "") for slot in row.get("team", [])))
        if not key:
            review_rejections.append({"sourceName": row.get("sourceName", ""), "reason": "empty_dedupe_key"})
            continue
        incumbent = deduped.get(key)
        if incumbent is None or float(row.get("confidence", 0.0)) > float(incumbent.get("confidence", 0.0)):
            if incumbent is not None:
                review_rejections.append({"sourceName": incumbent.get("sourceName", ""), "reason": "duplicate_replaced"})
            deduped[key] = row
        else:
            review_rejections.append({"sourceName": row.get("sourceName", ""), "reason": "duplicate_dropped"})
    return list(deduped.values()), review_rejections


def diversify_accepted_rows(rows):
    archetype_buckets = defaultdict(list)
    for row in sorted(rows, key=lambda item: (item.get("classification") != "high_level_verified", -float(item.get("confidence", 0.0))), reverse=False):
        archetype_buckets[row.get("archetype") or "balance"].append(row)
    selected = []
    while archetype_buckets:
        for archetype in list(archetype_buckets):
            bucket = archetype_buckets[archetype]
            if bucket:
                selected.append(bucket.pop(0))
            if not bucket:
                del archetype_buckets[archetype]
    return selected


def build_review_markdown(review):
    lines = [
        "# High-Level Expansion Review",
        "",
        f"- Updated: {review['updatedAt']}",
        f"- Sources scanned: {review['sourcesScanned']}",
        f"- Accepted teams: {review['acceptedCount']}",
        f"- Rejected teams: {review['rejectedCount']}",
        "",
        "## Accepted By Class",
        "",
    ]
    for key, value in review["acceptedByClass"].items():
        lines.append(f"- `{key}`: {value}")
    lines.extend(["", "## Accepted Archetypes", ""])
    for key, value in review["acceptedArchetypes"].items():
        lines.append(f"- `{key}`: {value}")
    lines.extend(["", "## Rejection Reasons", ""])
    for key, value in review["rejectedByReason"].items():
        lines.append(f"- `{key}`: {value}")
    lines.extend(["", "## Accepted Samples", ""])
    for row in review["acceptedSamples"]:
        lines.append(f"- `{row['classification']}` `{row['matchedCreator']}` `{row['archetype']}` score `{row['confidence']}`")
        lines.append(f"  `{', '.join(row['team'])}`")
    return "\n".join(lines) + "\n"


def build_source_rows():
    registry_payload = read_json(CURATED_REGISTRY, {"sources": [], "manual_teams": []})
    rows = []
    for entry in get_bucket_entries(read_json(RAW_YOUTUBE, {"videos": []}), "videos", "entries"):
        rows.append(("raw_youtube", entry))
    for entry in get_bucket_entries(read_json(RAW_REDDIT, {"posts": []}), "posts", "entries"):
        rows.append(("raw_reddit", entry))
    for entry in get_bucket_entries(read_json(CURATED_YOUTUBE, {"teams": []}), "teams", "entries"):
        rows.append(("curated_youtube", entry))
    for entry in get_bucket_entries(read_json(CURATED_REDDIT, {"teams": []}), "teams", "entries"):
        rows.append(("curated_reddit", entry))
    for entry in get_bucket_entries(read_json(CURATED_PIKALYTICS, {"teams": []}), "teams", "entries"):
        rows.append(("curated_pikalytics", entry))
    for entry in registry_payload.get("manual_teams", []):
        rows.append(("manual_registry", entry))
    return rows, registry_payload


def main():
    ensure_remote_only()
    source_rows, registry_payload = build_source_rows()
    registry_sources = registry_payload.get("sources", [])
    classified_rows = [classify_candidate(entry, bucket_name, registry_sources) for bucket_name, entry in source_rows]
    deduped_rows, duplicate_rejections = dedupe_candidates(classified_rows)
    accepted_rows = [row for row in deduped_rows if row.get("classification") in {"high_level_verified", "high_level_partial"}]
    accepted_rows = diversify_accepted_rows(accepted_rows)
    review = {
        "updatedAt": utc_now(),
        "sourcesScanned": len(source_rows),
        "acceptedCount": len(accepted_rows),
        "rejectedCount": len([row for row in deduped_rows if row.get("classification") in {"needs_review", "rejected"}]) + len(duplicate_rejections),
        "acceptedByClass": dict(Counter(row.get("classification", "unknown") for row in accepted_rows)),
        "acceptedArchetypes": dict(Counter(row.get("archetype") or "balance" for row in accepted_rows)),
        "rejectedByReason": dict(Counter(reason for row in deduped_rows for reason in row.get("expansionReasons", []) if row.get("classification") in {"needs_review", "rejected"})),
        "acceptedSamples": [
            {
                "classification": row.get("classification"),
                "matchedCreator": row.get("matchedCreator"),
                "archetype": row.get("archetype"),
                "confidence": row.get("confidence"),
                "team": [slot.get("name", "") for slot in row.get("team", [])],
            }
            for row in accepted_rows[:12]
        ],
        "duplicateRejections": duplicate_rejections[:24],
        "allCandidates": [
            {
                "sourceName": row.get("sourceName"),
                "matchedCreator": row.get("matchedCreator"),
                "classification": row.get("classification"),
                "archetype": row.get("archetype"),
                "confidence": row.get("confidence"),
                "reason": row.get("expansionReasons", []),
                "sourceUrl": row.get("sourceUrl"),
                "team": [slot.get("name", "") for slot in row.get("team", [])],
            }
            for row in sorted(deduped_rows, key=lambda item: (item.get("classification"), -float(item.get("confidence", 0.0))))
        ],
    }
    write_json(REPORT_JSON, review)
    REPORT_MD.parent.mkdir(parents=True, exist_ok=True)
    REPORT_MD.write_text(build_review_markdown(review), encoding="utf-8")
    write_json(
        CURATED_EXPANDED,
        {
            "updatedAt": review["updatedAt"],
            "notes": "Accepted high-level expansion candidates classified from trusted raw and curated sources.",
            "teams": accepted_rows,
        },
    )
    verified_rows = [row for row in accepted_rows if row.get("classification") == "high_level_verified"]
    if verified_rows:
        write_json(
            NORMALIZED_HIGH_LEVEL,
            build_pool_document(
                "high_level",
                verified_rows,
                "Expanded high-level pool built only from high_level_verified candidates.",
            ),
        )


if __name__ == "__main__":
    main()
