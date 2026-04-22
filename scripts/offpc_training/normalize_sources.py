#!/usr/bin/env python3
"""Rebuild normalized pools and combined source snapshot from raw/curated data."""

from __future__ import annotations

from common import DATA_DIR, NORMALIZED_DIR, build_pool_document, ensure_remote_only, normalize_team_entry, read_json, write_json


def pass_through_existing(path_name: str, source_type: str, notes: str):
    payload = read_json(DATA_DIR / f"{path_name}.json", {"teams": []})
    teams = []
    for row in payload.get("teams", []):
        slots = row.get("team", [])
        if slots and isinstance(slots[0], str):
            slots = [{"name": name} for name in slots]
        teams.append(
            normalize_team_entry(
                source_type=source_type,
                source_name=row.get("label", row.get("sourceName", path_name)),
                source_url=row.get("sourceUrl", ""),
                archetype=row.get("archetype", ""),
                slots=slots,
                tags=row.get("tags", [source_type]),
                confidence=row.get("confidence"),
                import_strategy="pass-through",
                notes=notes,
            )
        )
    write_json(
        NORMALIZED_DIR / f"{path_name}.json",
        build_pool_document(source_type, teams, notes),
    )


def main() -> None:
    ensure_remote_only()
    pass_through_existing("meta_pool", "meta", "Normalized from maintained internal meta pool.")
    pass_through_existing("random_pool", "random", "Normalized from generated robustness pool.")
    pass_through_existing("self_play_pool", "selfplay", "Normalized from self-built exploratory pool.")


if __name__ == "__main__":
    main()
