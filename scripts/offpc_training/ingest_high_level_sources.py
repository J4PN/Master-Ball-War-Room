import json
import os
from pathlib import Path

from common import build_pool_document, normalize_team_entry

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
CURATED_FILE = DATA_DIR / "curated" / "high_level_source_registry.json"
EXPANDED_FILE = DATA_DIR / "curated" / "high_level_expanded_candidates.json"
RAW_YOUTUBE = DATA_DIR / "raw" / "youtube_sources.json"
RAW_REDDIT = DATA_DIR / "raw" / "reddit_threads.json"
NORMALIZED_FILE = DATA_DIR / "normalized" / "high_level_creator_pool.json"
REPORTS_DIR = ROOT / "reports"
DEBUG_FILE = REPORTS_DIR / "high_level_ingestion_debug.json"

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
    {
        "source_name": "CybertronVGC",
        "patterns": ["cybertron", "cybertronvgc", "aaron zheng", "aaron"],
        "title_patterns": ["vgc", "tournament", "regionals", "balance", "tailwind"],
        "archetypes": ["balance", "bulky-offense", "tailwind_balance"],
        "signature_cores": [
            ["Incineroar", "Whimsicott"],
            ["Amoonguss", "Landorus"],
            ["Urshifu", "Rillaboom"],
        ],
        "quality_class": "tournament_result",
        "tags": ["standard_meta", "balance", "tournament"],
    },
]


def creator_profile_catalog(registry):
    merged = {}
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
        baseline["patterns"] = list(dict.fromkeys([*(merged.get(key, {}).get("patterns", []) or []), *(entry.get("patterns", []) or [])]))
        baseline["tags"] = list(dict.fromkeys([*(merged.get(key, {}).get("tags", []) or []), *(entry.get("tags", []) or [])]))
        baseline["title_patterns"] = list(dict.fromkeys([*(merged.get(key, {}).get("title_patterns", []) or []), *(entry.get("title_patterns", []) or [])]))
        baseline["archetypes"] = list(dict.fromkeys([*(merged.get(key, {}).get("archetypes", []) or []), *(entry.get("archetypes", []) or [])]))
        baseline["signature_cores"] = [*(merged.get(key, {}).get("signature_cores", []) or []), *(entry.get("signature_cores", []) or [])]
        merged[key] = baseline
    return list(merged.values())


def require_remote_only():
    if os.environ.get("GITHUB_ACTIONS") != "true":
        raise RuntimeError("ingest_high_level_sources.py refuses local execution")
    if os.environ.get("RUNNER_ENVIRONMENT", "").lower() == "self-hosted":
        raise RuntimeError("ingest_high_level_sources.py refuses self-hosted runners")


def load_json(path, default):
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=True)
        handle.write("\n")


def match_registry_entry(source_name, registry):
    lowered = source_name.lower()
    for entry in registry:
        for pattern in entry.get("patterns", []):
            if pattern.lower() in lowered:
                return entry
    return None


def normalize_key(value):
    return "".join(ch.lower() for ch in str(value or "") if ch.isalnum())


def resolve_creator_profile(entry, registry):
    source_name = str(entry.get("source_name") or entry.get("sourceName") or entry.get("channel") or entry.get("author") or entry.get("title") or "")
    direct = match_registry_entry(source_name, registry)
    if direct:
        return {
            "matched": True,
            "profile": direct,
            "reason": "source_name_pattern",
            "score": 1.0,
            "core_overlap": 0.0,
        }

    text_blob = " ".join(
        str(entry.get(field) or "")
        for field in ("source_name", "sourceName", "channel", "author", "title", "notes", "archetype")
    ).lower()
    archetype = str(entry.get("archetype") or "").strip().lower()
    tags = {str(tag).strip().lower() for tag in entry.get("tags", []) if str(tag).strip()}
    species = {
        normalize_key(slot.get("name") or slot.get("species"))
        for slot in (entry.get("team") or entry.get("members") or [])
        if isinstance(slot, dict) and (slot.get("name") or slot.get("species"))
    }
    best = None
    for profile in creator_profile_catalog(registry):
        score = 0.0
        core_overlap = 0.0
        if any(pattern in text_blob for pattern in [p.lower() for p in profile.get("title_patterns", [])]):
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
        if best is None or candidate["score"] > best["score"]:
            best = candidate
    return best or {"matched": False, "profile": None, "reason": "no_profiles", "score": 0.0, "core_overlap": 0.0}


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


def build_high_level_creator_pool():
    registry = load_json(CURATED_FILE, {"sources": []}).get("sources", [])
    expanded_payload = load_json(EXPANDED_FILE, {"teams": []})
    youtube = load_json(RAW_YOUTUBE, {"videos": []})
    reddit = load_json(RAW_REDDIT, {"posts": []})
    teams = []
    debug = {
        "updatedAt": None,
        "registrySourceCount": len(registry),
        "acceptedTeamCount": 0,
        "rejections": [],
        "sources": {
            "youtube": {"rows": 0, "accepted": 0},
            "reddit": {"rows": 0, "accepted": 0},
            "creator": {"rows": 0, "accepted": 0},
            "expanded": {"rows": 0, "accepted": 0},
        },
    }

    for source_bucket, origin_source_type in (
        (get_bucket_entries(youtube, "videos", "entries"), "youtube"),
        (get_bucket_entries(reddit, "posts", "entries"), "reddit"),
    ):
        debug["sources"][origin_source_type]["rows"] = len(source_bucket)
        for entry in source_bucket:
            source_name = str(entry.get("source_name") or entry.get("sourceName") or entry.get("channel") or entry.get("author") or entry.get("title") or "")
            matched_result = resolve_creator_profile(entry, registry)
            matched = matched_result.get("profile")
            team_slots = entry.get("team") or entry.get("members") or []
            if not source_name:
                debug["rejections"].append({
                    "originSourceType": origin_source_type,
                    "reason": "missing_source_name",
                    "entryTitle": entry.get("title", ""),
                })
                continue
            if not matched:
                debug["rejections"].append({
                    "originSourceType": origin_source_type,
                    "sourceName": source_name,
                    "reason": "registry_mismatch",
                    "matchMode": matched_result.get("reason"),
                    "matchScore": matched_result.get("score", 0.0),
                    "coreOverlap": matched_result.get("core_overlap", 0.0),
                    "teamLength": len(team_slots) if isinstance(team_slots, list) else 0,
                })
                continue
            if not isinstance(team_slots, list) or not team_slots:
                debug["rejections"].append({
                    "originSourceType": origin_source_type,
                    "sourceName": source_name,
                    "reason": "missing_team",
                })
                continue
            quality_class = matched.get("quality_class", "high_level_analysis")
            matched_creator = matched.get("source_name") or source_name
            tags = list(dict.fromkeys((matched.get("tags", []) or []) + (entry.get("tags", []) or []) + ["high_level", origin_source_type]))
            normalized_entry = normalize_team_entry(
                source_type="high_level",
                source_name=matched_creator or "high_level_creator",
                source_url=entry.get("source_url") or entry.get("sourceUrl") or entry.get("url") or "",
                archetype=entry.get("archetype", ""),
                slots=team_slots,
                tags=tags,
                confidence=entry.get("confidence", 0.8),
                import_strategy=entry.get("importStrategy", "creator-source-match"),
                notes=entry.get("notes", f"Matched curated high-level creator registry from {origin_source_type}."),
            )
            if not normalized_entry.get("team"):
                debug["rejections"].append({
                    "originSourceType": origin_source_type,
                    "sourceName": source_name,
                    "reason": "normalization_failure",
                    "rawTeamLength": len(team_slots),
                })
                continue
            normalized_entry["qualityClass"] = quality_class
            normalized_entry["originSourceType"] = origin_source_type
            normalized_entry["rawSourceName"] = source_name
            normalized_entry["matchedCreator"] = matched_creator
            normalized_entry["creatorMatchReason"] = matched_result.get("reason")
            normalized_entry["creatorMatchScore"] = matched_result.get("score", 1.0)
            normalized_entry["creatorCoreOverlap"] = matched_result.get("core_overlap", 0.0)
            teams.append(normalized_entry)
            debug["sources"][origin_source_type]["accepted"] += 1

    curated_imports = load_json(CURATED_FILE, {"manual_teams": []}).get("manual_teams", [])
    debug["sources"]["creator"]["rows"] = len(curated_imports)
    for entry in curated_imports:
        source_name = entry.get("source_name") or entry.get("sourceName") or "curated_high_level"
        quality_class = entry.get("quality_class", "high_level_analysis")
        tags = list(dict.fromkeys((entry.get("tags", []) or []) + ["high_level", "creator"]))
        team_slots = entry.get("team") or entry.get("members") or []
        if not isinstance(team_slots, list) or not team_slots:
            debug["rejections"].append({
                "originSourceType": "creator",
                "sourceName": source_name,
                "reason": "missing_team",
            })
            continue
        normalized_entry = normalize_team_entry(
            source_type="high_level",
            source_name=source_name,
            source_url=entry.get("source_url") or entry.get("sourceUrl") or "",
            archetype=entry.get("archetype", ""),
            slots=team_slots,
            tags=tags,
            confidence=entry.get("confidence", 0.95),
            import_strategy=entry.get("importStrategy", "curated-high-level-import"),
            notes=entry.get("notes", "Curated high-level creator team import."),
        )
        if not normalized_entry.get("team"):
            debug["rejections"].append({
                "originSourceType": "creator",
                "sourceName": source_name,
                "reason": "normalization_failure",
                "rawTeamLength": len(team_slots),
            })
            continue
        normalized_entry["qualityClass"] = quality_class
        normalized_entry["originSourceType"] = "creator"
        teams.append(normalized_entry)
        debug["sources"]["creator"]["accepted"] += 1

    expanded_teams = expanded_payload.get("teams", []) if isinstance(expanded_payload.get("teams", []), list) else []
    debug["sources"]["expanded"]["rows"] = len(expanded_teams)
    for entry in expanded_teams:
        if str(entry.get("classification") or "") not in {"high_level_verified", "high_level_partial"}:
            debug["rejections"].append({
                "originSourceType": entry.get("originSourceType", ""),
                "sourceName": entry.get("sourceName", ""),
                "reason": "expansion_not_accepted",
            })
            continue
        normalized_entry = normalize_team_entry(
            source_type="high_level",
            source_name=entry.get("matchedCreator") or entry.get("sourceName") or "expanded_high_level",
            source_url=entry.get("sourceUrl") or "",
            archetype=entry.get("archetype", ""),
            slots=entry.get("team") or [],
            tags=list(dict.fromkeys((entry.get("tags", []) or []) + ["high_level", "expanded"])),
            confidence=entry.get("confidence", 0.78),
            import_strategy=entry.get("importStrategy", "expansion-reviewed-import"),
            notes=entry.get("notes", "Accepted from reviewed high-level expansion."),
        )
        if not normalized_entry.get("team"):
            debug["rejections"].append({
                "originSourceType": entry.get("originSourceType", ""),
                "sourceName": entry.get("sourceName", ""),
                "reason": "expansion_normalization_failure",
            })
            continue
        normalized_entry["qualityClass"] = entry.get("qualityClass") or "high_level_analysis"
        normalized_entry["originSourceType"] = entry.get("originSourceType") or entry.get("expansionBucket", "")
        normalized_entry["rawSourceName"] = entry.get("rawSourceName") or entry.get("sourceName", "")
        normalized_entry["matchedCreator"] = entry.get("matchedCreator") or entry.get("sourceName", "")
        normalized_entry["creatorMatchReason"] = entry.get("creatorMatchReason") or "expansion_review"
        normalized_entry["creatorMatchScore"] = entry.get("creatorMatchScore", 0.0)
        normalized_entry["creatorCoreOverlap"] = entry.get("creatorCoreOverlap", 0.0)
        normalized_entry["classification"] = entry.get("classification")
        teams.append(normalized_entry)
        debug["sources"]["expanded"]["accepted"] += 1

    deduped = {}
    for row in teams:
        key = row.get("id") or f"{row.get('sourceName','unknown')}|{'|'.join(slot.get('name','') for slot in row.get('team', []))}"
        if key in deduped:
            debug["rejections"].append({
                "originSourceType": row.get("originSourceType", ""),
                "sourceName": row.get("sourceName", ""),
                "reason": "duplicate_collapse",
            })
            continue
        deduped[key] = row
    teams = list(deduped.values())
    debug["acceptedTeamCount"] = len(teams)

    return build_pool_document("high_level", teams, "Built from creator-registry-matched YouTube/Reddit sources and curated high-level imports."), debug


def main():
    require_remote_only()
    payload, debug = build_high_level_creator_pool()
    debug["updatedAt"] = payload.get("updatedAt")
    save_json(NORMALIZED_FILE, payload)
    save_json(DEBUG_FILE, debug)


if __name__ == "__main__":
    main()
