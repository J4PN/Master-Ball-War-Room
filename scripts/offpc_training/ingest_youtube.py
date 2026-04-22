#!/usr/bin/env python3
"""Normalize YouTube-derived and curated YouTube team sources.

This path is explicitly semi-manual. It supports descriptions, pinned comments,
subtitle-derived fragments, and curated imports without pretending every video
contains a full usable team.
"""

from __future__ import annotations

from common import CURATED_DIR, NORMALIZED_DIR, RAW_DIR, build_pool_document, ensure_remote_only, normalize_team_entry, read_json, write_json


def main() -> None:
    ensure_remote_only()
    raw_payload = read_json(RAW_DIR / "youtube_sources.json", {"videos": []})
    curated_payload = read_json(CURATED_DIR / "youtube_imports.json", {"teams": []})
    teams = []
    for video in raw_payload.get("videos", []):
        teams.append(
            normalize_team_entry(
                source_type="youtube",
                source_name=video.get("sourceName", video.get("title", "YouTube source")),
                source_url=video.get("sourceUrl", ""),
                archetype=video.get("archetype", ""),
                slots=video.get("team", []),
                tags=["youtube", "community", *video.get("tags", [])],
                confidence=video.get("confidence", 0.58),
                import_strategy=video.get("importStrategy", "description-or-comment-parse"),
                notes=video.get("notes", "YouTube extraction may be partial; incomplete teams remain exploratory."),
            )
        )
    for video in curated_payload.get("teams", []):
        teams.append(
            normalize_team_entry(
                source_type="youtube",
                source_name=video.get("sourceName", "Curated YouTube import"),
                source_url=video.get("sourceUrl", ""),
                archetype=video.get("archetype", ""),
                slots=video.get("team", []),
                tags=["youtube", "curated", *video.get("tags", [])],
                confidence=video.get("confidence", 0.78),
                import_strategy="curated-import",
                notes=video.get("notes", "Curated YouTube team import."),
            )
        )
    write_json(
        NORMALIZED_DIR / "youtube_pool.json",
        build_pool_document("youtube", teams, "Built from checked-in YouTube raw snapshots and curated imports."),
    )


if __name__ == "__main__":
    main()
