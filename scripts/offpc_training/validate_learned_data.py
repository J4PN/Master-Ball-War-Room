#!/usr/bin/env python3
"""Validation helper for remote-only learned and normalized data."""

from __future__ import annotations

from pathlib import Path

from common import DATA_DIR, NORMALIZED_DIR, ensure_remote_only, read_json

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
VARIANT_SOURCE_TYPES = {
    "pikalytics_variant",
    "high_level_variant",
    "archive_variant",
    "reddit_variant",
    "youtube_variant",
}


def assert_range(name: str, value: float, low: float, high: float) -> None:
    numeric = float(value)
    if not (low <= numeric <= high):
        raise SystemExit(f"{name} out of range: {numeric} not in [{low}, {high}]")


def contains_serialized_slot_blob(value) -> bool:
    if isinstance(value, str):
        lowered = value.strip().lower()
        return lowered.startswith("{") and "base_species" in lowered and "display_species" in lowered
    if isinstance(value, dict):
        return any(contains_serialized_slot_blob(field) for field in value.values())
    if isinstance(value, list):
        return any(contains_serialized_slot_blob(field) for field in value)
    return False


def validate_team_document(path: Path) -> None:
    payload = read_json(path, {"teams": []})
    if "teams" not in payload:
        raise SystemExit(f"{path.name} missing teams field")
    for index, row in enumerate(payload.get("teams", [])):
        if "sourceType" not in row:
            raise SystemExit(f"{path.name} team {index} missing sourceType")
        if row["sourceType"] not in VALID_SOURCE_TYPES:
            raise SystemExit(f"{path.name} team {index} invalid sourceType `{row['sourceType']}`")
        if row["sourceType"] in VARIANT_SOURCE_TYPES and not row.get("originSourceType"):
            raise SystemExit(f"{path.name} team {index} variant missing originSourceType")
        if "team" not in row or not isinstance(row["team"], list):
            raise SystemExit(f"{path.name} team {index} missing team list")
        if len(row["team"]) > 6:
            raise SystemExit(f"{path.name} team {index} exceeds 6 Pokemon")
        if "archivearchive" in str(row).lower():
            raise SystemExit(f"{path.name} team {index} contains archivearchive artifact")
        if contains_serialized_slot_blob(row.get("team", [])):
            raise SystemExit(f"{path.name} team {index} contains serialized slot blob content")
        assert_range(f"{path.name}.team[{index}].confidence", row.get("confidence", 0.5), 0.1, 1.0)
        assert_range(f"{path.name}.team[{index}].completeness", row.get("completeness", 0.0), 0.0, 1.0)
    for index, row in enumerate(payload.get("retainedTeams", [])):
        if len(row.get("team", [])) <= 1:
            raise SystemExit(f"{path.name} retained team {index} collapsed below 2 Pokemon")
        if row.get("sourceType") in VARIANT_SOURCE_TYPES and not row.get("originSourceType"):
            raise SystemExit(f"{path.name} retained team {index} variant missing originSourceType")


def main() -> None:
    ensure_remote_only()
    learned = read_json(DATA_DIR / "learned_weights.json", {})
    priors = read_json(DATA_DIR / "species_role_priors.json", {"priors": {}})
    moves = read_json(DATA_DIR / "move_choice_weights.json", {"weights": {}})
    penalties = read_json(DATA_DIR / "threat_penalties.json", {"byThreat": {}})
    archive = read_json(DATA_DIR / "team_archive.json", {"teams": []})

    for key in ["rolePrior", "moveWeight", "threatPenalty", "archiveBias"]:
        assert_range(f"candidateScoreWeights.{key}", learned["candidateScoreWeights"][key], 0, 25)

    for key, value in learned.get("sourceSamplingWeights", {}).items():
        assert_range(f"sourceSamplingWeights.{key}", value, 0, 2)

    for key, value in learned.get("sourceConfidenceDefaults", {}).items():
        assert_range(f"sourceConfidenceDefaults.{key}", value, 0.1, 1.0)

    for species, row in priors.get("priors", {}).items():
        assert_range(f"speciesRolePriors.{species}.weight", row.get("weight", 0), -1, 1)

    for move, value in moves.get("weights", {}).items():
        assert_range(f"moveChoiceWeights.{move}", value, -1, 1)

    for threat, row in penalties.get("byThreat", {}).items():
        assert_range(f"threatPenalties.{threat}.multiplier", row.get("multiplier", 1), 0.5, 2.5)

    for index, row in enumerate(archive.get("teams", [])):
        team = row.get("team", [])
        if not isinstance(team, list) or not team:
            raise SystemExit(f"teamArchive row {index} has no team list")
        if len(team) > 6:
            raise SystemExit(f"teamArchive row {index} exceeds 6 Pokemon")
        if contains_serialized_slot_blob(team):
            raise SystemExit(f"teamArchive row {index} contains serialized slot blob content")

    for pool_name in [
        "meta_pool.json",
        "random_pool.json",
        "self_play_pool.json",
        "pikalytics_pool.json",
        "high_level_creator_pool.json",
        "reddit_pool.json",
        "youtube_pool.json",
        "combined_training_pool.json",
    ]:
        path = NORMALIZED_DIR / pool_name
        if path.exists():
            validate_team_document(path)

    source_snapshot = read_json(NORMALIZED_DIR / "source_meta_snapshot.json", {"threats": []})
    for index, row in enumerate(source_snapshot.get("threats", [])):
        assert_range(f"source_meta_snapshot.threats[{index}].importance", row.get("importance", 1), 0.5, 2.0)
        name = str(row.get("name", "")).strip()
        if not name or any(ch for ch in name if not ch.isalnum() or ch.lower() != ch):
            raise SystemExit(f"source_meta_snapshot.threats[{index}] invalid normalized key `{name}`")

    archetype_memory = read_json(DATA_DIR / "persistent" / "persistent_archetype_memory.json", {"archetypes": {}})
    required_archetypes = {
        "hard_tr",
        "tr_hybrid",
        "tailwind",
        "hyper_offense",
        "rain",
        "sun",
        "stall_fat_balance",
        "anti_meta",
        "double_mega",
        "gc_only",
    }
    missing = required_archetypes.difference(archetype_memory.get("archetypes", {}).keys())
    if missing:
        raise SystemExit(f"persistent_archetype_memory missing buckets: {sorted(missing)}")
    for key, row in archetype_memory.get("archetypes", {}).items():
        for field in ["best_support_shells", "best_speed_control", "best_megas", "best_breakers", "bad_matchup_plans", "bad_patterns_to_avoid"]:
            if field not in row or not isinstance(row[field], list):
                raise SystemExit(f"persistent_archetype_memory.{key} missing list field {field}")

    print("validated learned and normalized data successfully")


if __name__ == "__main__":
    main()
