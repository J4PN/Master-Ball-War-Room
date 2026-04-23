import json
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
CURATED_FILE = DATA_DIR / "curated" / "high_level_source_registry.json"
RAW_YOUTUBE = DATA_DIR / "raw" / "youtube_sources.json"
RAW_REDDIT = DATA_DIR / "raw" / "reddit_threads.json"
NORMALIZED_FILE = DATA_DIR / "normalized" / "high_level_creator_pool.json"


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


def normalize_team_slots(team, source_name, quality_class, tags):
    normalized = []
    for slot in team or []:
        if not isinstance(slot, dict):
            continue
        normalized.append({
            "species": slot.get("species") or slot.get("name") or "",
            "item": slot.get("item") or "",
            "ability": slot.get("ability") or "",
            "role": slot.get("role") or "",
            "moves": [move for move in slot.get("moves", []) if move][:4],
            "tags": list(dict.fromkeys((slot.get("tags", []) or []) + list(tags))),
            "source_name": source_name,
            "quality_class": quality_class,
        })
    return normalized


def match_registry_entry(source_name, registry):
    lowered = source_name.lower()
    for entry in registry:
        for pattern in entry.get("patterns", []):
            if pattern.lower() in lowered:
                return entry
    return None


def main():
    require_remote_only()
    registry = load_json(CURATED_FILE, {"sources": []}).get("sources", [])
    youtube = load_json(RAW_YOUTUBE, {"entries": []})
    reddit = load_json(RAW_REDDIT, {"entries": []})
    normalized = {"teams": []}

    for source_bucket, origin_source_type in ((youtube.get("entries", []), "youtube"), (reddit.get("entries", []), "reddit")):
        for entry in source_bucket:
            source_name = str(entry.get("source_name") or entry.get("channel") or entry.get("author") or "")
            matched = match_registry_entry(source_name, registry)
            if not matched:
                continue
            quality_class = matched.get("quality_class", "high_level_analysis")
            tags = list(dict.fromkeys((matched.get("tags", []) or []) + (entry.get("tags", []) or []) + ["high_level", origin_source_type]))
            normalized["teams"].append({
                "source_type": "high_level",
                "origin_source_type": origin_source_type,
                "source_name": source_name,
                "source_url": entry.get("source_url") or entry.get("url") or "",
                "quality_class": quality_class,
                "archetype": entry.get("archetype") or "",
                "confidence": float(entry.get("confidence", 0.8) or 0.8),
                "tags": tags,
                "team": normalize_team_slots(entry.get("team") or entry.get("members") or [], source_name, quality_class, tags),
            })

    curated_imports = load_json(CURATED_FILE, {"manual_teams": []}).get("manual_teams", [])
    for entry in curated_imports:
        source_name = entry.get("source_name") or "curated_high_level"
        quality_class = entry.get("quality_class", "high_level_analysis")
        tags = list(dict.fromkeys((entry.get("tags", []) or []) + ["high_level", "creator"]))
        normalized["teams"].append({
            "source_type": "high_level",
            "origin_source_type": "creator",
            "source_name": source_name,
            "source_url": entry.get("source_url") or "",
            "quality_class": quality_class,
            "archetype": entry.get("archetype") or "",
            "confidence": float(entry.get("confidence", 0.95) or 0.95),
            "tags": tags,
            "team": normalize_team_slots(entry.get("team") or [], source_name, quality_class, tags),
        })

    save_json(NORMALIZED_FILE, normalized)


if __name__ == "__main__":
    main()
