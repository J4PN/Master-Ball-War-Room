import json
import os
from pathlib import Path

from common import build_pool_document, normalize_team_entry

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


def match_registry_entry(source_name, registry):
    lowered = source_name.lower()
    for entry in registry:
        for pattern in entry.get("patterns", []):
            if pattern.lower() in lowered:
                return entry
    return None


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
    youtube = load_json(RAW_YOUTUBE, {"videos": []})
    reddit = load_json(RAW_REDDIT, {"posts": []})
    teams = []

    for source_bucket, origin_source_type in (
        (get_bucket_entries(youtube, "videos", "entries"), "youtube"),
        (get_bucket_entries(reddit, "posts", "entries"), "reddit"),
    ):
        for entry in source_bucket:
            source_name = str(entry.get("source_name") or entry.get("sourceName") or entry.get("channel") or entry.get("author") or entry.get("title") or "")
            matched = match_registry_entry(source_name, registry)
            if not matched:
                continue
            quality_class = matched.get("quality_class", "high_level_analysis")
            tags = list(dict.fromkeys((matched.get("tags", []) or []) + (entry.get("tags", []) or []) + ["high_level", origin_source_type]))
            normalized_entry = normalize_team_entry(
                source_type="high_level",
                source_name=source_name or "high_level_creator",
                source_url=entry.get("source_url") or entry.get("sourceUrl") or entry.get("url") or "",
                archetype=entry.get("archetype", ""),
                slots=entry.get("team") or entry.get("members") or [],
                tags=tags,
                confidence=entry.get("confidence", 0.8),
                import_strategy=entry.get("importStrategy", "creator-source-match"),
                notes=entry.get("notes", f"Matched curated high-level creator registry from {origin_source_type}."),
            )
            normalized_entry["qualityClass"] = quality_class
            normalized_entry["originSourceType"] = origin_source_type
            teams.append(normalized_entry)

    curated_imports = load_json(CURATED_FILE, {"manual_teams": []}).get("manual_teams", [])
    for entry in curated_imports:
        source_name = entry.get("source_name") or entry.get("sourceName") or "curated_high_level"
        quality_class = entry.get("quality_class", "high_level_analysis")
        tags = list(dict.fromkeys((entry.get("tags", []) or []) + ["high_level", "creator"]))
        normalized_entry = normalize_team_entry(
            source_type="high_level",
            source_name=source_name,
            source_url=entry.get("source_url") or entry.get("sourceUrl") or "",
            archetype=entry.get("archetype", ""),
            slots=entry.get("team") or entry.get("members") or [],
            tags=tags,
            confidence=entry.get("confidence", 0.95),
            import_strategy=entry.get("importStrategy", "curated-high-level-import"),
            notes=entry.get("notes", "Curated high-level creator team import."),
        )
        normalized_entry["qualityClass"] = quality_class
        normalized_entry["originSourceType"] = "creator"
        teams.append(normalized_entry)

    return build_pool_document("high_level", teams, "Built from creator-registry-matched YouTube/Reddit sources and curated high-level imports.")


def main():
    require_remote_only()
    save_json(NORMALIZED_FILE, build_high_level_creator_pool())


if __name__ == "__main__":
    main()
