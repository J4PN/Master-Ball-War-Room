#!/usr/bin/env python3
"""Normalize Reddit-derived and curated Reddit team sources.

This script handles honest partial extraction. If a post only contains a partial
team or Pokepaste reference, it preserves that state and marks confidence lower.
"""

from __future__ import annotations

from common import CURATED_DIR, NORMALIZED_DIR, RAW_DIR, build_pool_document, ensure_remote_only, normalize_team_entry, read_json, write_json


def main() -> None:
    ensure_remote_only()
    raw_payload = read_json(RAW_DIR / "reddit_threads.json", {"posts": []})
    curated_payload = read_json(CURATED_DIR / "reddit_imports.json", {"teams": []})
    teams = []
    for post in raw_payload.get("posts", []):
        slots = post.get("team", [])
        teams.append(
            normalize_team_entry(
                source_type="reddit",
                source_name=post.get("sourceName", post.get("title", "Reddit thread")),
                source_url=post.get("sourceUrl", ""),
                archetype=post.get("archetype", ""),
                slots=slots,
                tags=["reddit", "community", *post.get("tags", [])],
                confidence=post.get("confidence", 0.66),
                import_strategy=post.get("importStrategy", "raw-thread-parse"),
                notes=post.get("notes", "Reddit extraction may be partial and is preserved honestly."),
            )
        )
    for post in curated_payload.get("teams", []):
        teams.append(
            normalize_team_entry(
                source_type="reddit",
                source_name=post.get("sourceName", "Curated Reddit import"),
                source_url=post.get("sourceUrl", ""),
                archetype=post.get("archetype", ""),
                slots=post.get("team", []),
                tags=["reddit", "curated", *post.get("tags", [])],
                confidence=post.get("confidence", 0.8),
                import_strategy="curated-import",
                notes=post.get("notes", "Curated Reddit team import."),
            )
        )
    write_json(
        NORMALIZED_DIR / "reddit_pool.json",
        build_pool_document("reddit", teams, "Built from checked-in Reddit raw snapshots and curated imports."),
    )


if __name__ == "__main__":
    main()
