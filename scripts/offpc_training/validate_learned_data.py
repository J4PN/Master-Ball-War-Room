#!/usr/bin/env python3
"""Validation helper for remote-only learned and normalized data."""

from __future__ import annotations

from pathlib import Path

from common import DATA_DIR, NORMALIZED_DIR, ensure_remote_only, read_json


def assert_range(name: str, value: float, low: float, high: float) -> None:
    numeric = float(value)
    if not (low <= numeric <= high):
        raise SystemExit(f"{name} out of range: {numeric} not in [{low}, {high}]")


def validate_team_document(path: Path) -> None:
    payload = read_json(path, {"teams": []})
    if "teams" not in payload:
        raise SystemExit(f"{path.name} missing teams field")
    for index, row in enumerate(payload.get("teams", [])):
        if "sourceType" not in row:
            raise SystemExit(f"{path.name} team {index} missing sourceType")
        if "team" not in row or not isinstance(row["team"], list):
            raise SystemExit(f"{path.name} team {index} missing team list")
        if len(row["team"]) > 6:
            raise SystemExit(f"{path.name} team {index} exceeds 6 Pokemon")
        assert_range(f"{path.name}.team[{index}].confidence", row.get("confidence", 0.5), 0.1, 1.0)
        assert_range(f"{path.name}.team[{index}].completeness", row.get("completeness", 0.0), 0.0, 1.0)


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

    for pool_name in [
        "meta_pool.json",
        "random_pool.json",
        "self_play_pool.json",
        "pikalytics_pool.json",
        "reddit_pool.json",
        "youtube_pool.json",
        "combined_training_pool.json",
    ]:
        validate_team_document(NORMALIZED_DIR / pool_name)

    source_snapshot = read_json(NORMALIZED_DIR / "source_meta_snapshot.json", {"threats": []})
    for index, row in enumerate(source_snapshot.get("threats", [])):
        assert_range(f"source_meta_snapshot.threats[{index}].importance", row.get("importance", 1), 0.5, 2.0)

    print("validated learned and normalized data successfully")


if __name__ == "__main__":
    main()
