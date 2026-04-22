#!/usr/bin/env python3
"""Ingest Pikalytics-derived snapshots into normalized pool files.

This path is intentionally conservative. It processes checked-in raw snapshots
and curated imports rather than pretending brittle scraping is reliable.
"""

from __future__ import annotations

from common import CURATED_DIR, NORMALIZED_DIR, RAW_DIR, build_pool_document, ensure_remote_only, normalize_team_entry, read_json, write_json


def main() -> None:
    ensure_remote_only()
    raw_payload = read_json(RAW_DIR / "pikalytics_snapshot.json", {"entries": []})
    curated_payload = read_json(CURATED_DIR / "pikalytics_imports.json", {"teams": []})
    teams = []
    for entry in raw_payload.get("entries", []):
        species = entry.get("team", [])
        slots = []
        for slot in species:
            if isinstance(slot, str):
                slots.append({"name": slot})
            elif isinstance(slot, dict):
                slots.append(slot)
        teams.append(
            normalize_team_entry(
                source_type="pikalytics",
                source_name=entry.get("sourceName", "Pikalytics-derived snapshot"),
                source_url=entry.get("sourceUrl", ""),
                archetype=entry.get("archetype", ""),
                slots=slots,
                tags=["meta", "pikalytics"],
                confidence=entry.get("confidence", 0.96),
                import_strategy="raw-snapshot",
                notes=entry.get("notes", "Processed from checked-in Pikalytics-derived raw snapshot."),
            )
        )
    for entry in curated_payload.get("teams", []):
        teams.append(
            normalize_team_entry(
                source_type="pikalytics",
                source_name=entry.get("sourceName", "Pikalytics curated import"),
                source_url=entry.get("sourceUrl", ""),
                archetype=entry.get("archetype", ""),
                slots=entry.get("team", []),
                tags=["meta", "pikalytics", "curated"],
                confidence=entry.get("confidence", 0.98),
                import_strategy="curated-import",
                notes=entry.get("notes", "Curated import for Pikalytics-derived team data."),
            )
        )
    write_json(
        NORMALIZED_DIR / "pikalytics_pool.json",
        build_pool_document("pikalytics", teams, "Built from raw Pikalytics-derived snapshots and curated imports."),
    )


if __name__ == "__main__":
    main()
