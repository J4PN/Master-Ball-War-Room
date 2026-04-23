#!/usr/bin/env python3
"""Remote-only lightweight learning loop for the teambuilder.

This pipeline is intentionally offline and intended for GitHub-hosted runners only.
It never runs in the browser and it refuses local execution unless explicitly in
an approved remote CI environment.
"""

from __future__ import annotations

import argparse
import ast
import json
import os
import random
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Sequence


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
NORMALIZED_DIR = DATA_DIR / "normalized"
REPORT_DIR = ROOT / "reports"
BATTLE_LOG_DIR = DATA_DIR / "battle_logs"

SOURCE_CONFIDENCE_DEFAULTS = {
    "meta": 1.0,
    "pikalytics": 0.96,
    "archive": 0.9,
    "reddit": 0.72,
    "youtube": 0.62,
    "selfplay": 0.58,
    "random": 0.35,
}

SOURCE_SAMPLING_DEFAULTS = {
    "meta": 1.0,
    "pikalytics": 0.95,
    "archive": 0.8,
    "reddit": 0.55,
    "youtube": 0.45,
    "selfplay": 0.5,
    "random": 0.3,
}


def ensure_remote_only() -> None:
    approved_ci = os.getenv("GITHUB_ACTIONS") == "true" and not os.getenv("RUNNER_ENVIRONMENT", "").lower().startswith("self-hosted")
    if not approved_ci:
        raise SystemExit(
            "Remote-only training guard: this script runs only on GitHub-hosted "
            "GitHub Actions runners."
        )


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def normalize_key(value: str) -> str:
    return "".join(ch.lower() for ch in str(value or "") if ch.isalnum())


def is_serialized_slot_blob(value) -> bool:
    if not isinstance(value, str):
        return False
    text = str(value or "").strip()
    if len(text) < 16 or not (text.startswith("{") and text.endswith("}")):
        return False
    lowered = text.lower()
    markers = ("base_species", "display_species", "identity_key", "form_identity", "mega_identity")
    return sum(marker in lowered for marker in markers) >= 2


def is_pathological_serialized_slot_blob(value) -> bool:
    if not isinstance(value, str):
        return False
    text = str(value or "").strip()
    lowered = text.lower()
    if len(text) > 12000:
        return True
    if text.count("{") > 80 or text.count("}") > 80:
        return True
    if lowered.count("base_species") > 8:
        return True
    if lowered.count("identity_key") > 8:
        return True
    if "{'base_species': \"{'base_species':" in text or '"base_species": "{\'base_species\':' in text:
        return True
    return False


def try_parse_serialized_slot(value):
    if not is_serialized_slot_blob(value):
        return None
    if is_pathological_serialized_slot_blob(value):
        return None
    try:
        parsed = ast.literal_eval(str(value).strip())
    except (SyntaxError, ValueError):
        return None
    return parsed if isinstance(parsed, dict) else None


def build_clean_recovered_slot(slot) -> dict:
    if isinstance(slot, dict):
        name = ""
        for key in ("name", "display_species", "species", "base_species", "form_identity"):
            candidate = str(slot.get(key, "")).strip()
            if candidate and not is_serialized_slot_blob(candidate):
                name = candidate
                break
        return {
            "name": name,
            "item": str(slot.get("item", "")).strip(),
            "ability": str(slot.get("ability", "")).strip(),
            "moves": [str(move).strip() for move in slot.get("moves", []) if str(move).strip()] if isinstance(slot.get("moves", []), list) else [],
            "nature": str(slot.get("nature", "")).strip(),
            "spreads": slot.get("spreads", {}) if isinstance(slot.get("spreads", {}), dict) else {},
        }
    name = str(slot or "").strip()
    return {
        "name": name,
        "item": "",
        "ability": "",
        "moves": [],
        "nature": "",
        "spreads": {},
    }


def slot_snapshot(slot) -> str:
    if isinstance(slot, dict):
        try:
            return json.dumps(slot, sort_keys=True, ensure_ascii=True, default=str)
        except TypeError:
            return repr(sorted((str(key), str(value)) for key, value in slot.items()))
    return str(slot)


def merge_slot_payload(primary: dict, secondary: dict) -> dict:
    merged = {}
    for key in set(secondary) | set(primary):
        primary_value = primary.get(key)
        secondary_value = secondary.get(key)
        if isinstance(primary_value, str) and is_serialized_slot_blob(primary_value) and secondary_value not in (None, "", [], {}):
            merged[key] = secondary_value
        elif primary_value in (None, "", [], {}):
            merged[key] = secondary_value
        else:
            merged[key] = primary_value
    return merged


def unwrap_serialized_slot_payload(slot, max_depth=3):
    current = dict(slot) if isinstance(slot, dict) else slot
    best = current
    seen = set()
    target_keys = ("name", "display_species", "species", "base_species", "form_identity")
    for _ in range(max_depth):
        snapshot = slot_snapshot(current)
        if snapshot in seen:
            break
        seen.add(snapshot)
        improved = False
        if isinstance(current, str):
            parsed = try_parse_serialized_slot(current)
            if not parsed:
                break
            candidate = parsed
            candidate_snapshot = slot_snapshot(candidate)
            if candidate_snapshot in seen or candidate_snapshot == snapshot:
                break
            current = candidate
            best = candidate
            improved = True
        elif isinstance(current, dict):
            for key in target_keys:
                parsed = try_parse_serialized_slot(current.get(key))
                if not parsed:
                    continue
                candidate = merge_slot_payload(current, parsed)
                candidate_snapshot = slot_snapshot(candidate)
                if candidate_snapshot in seen or candidate_snapshot == snapshot:
                    continue
                current = candidate
                best = candidate
                improved = True
                break
        if not improved:
            break
    return best


def recover_team_slot(slot) -> dict | None:
    unwrapped = unwrap_serialized_slot_payload(slot, max_depth=3)
    recovered = build_clean_recovered_slot(unwrapped)
    if not recovered.get("name") or is_pathological_serialized_slot_blob(recovered.get("name")):
        return None
    return recovered


def canonical_team_slots(slots: Sequence[dict]) -> List[dict]:
    normalized = []
    seen = set()
    for slot in slots or []:
        recovered = recover_team_slot(slot)
        if not recovered:
            continue
        name = recovered["name"]
        if not name:
            continue
        key = normalize_key(name)
        if key in seen:
            continue
        seen.add(key)
        normalized.append(recovered)
        if len(normalized) >= 6:
            break
    return normalized


def species_list(team_row: dict) -> List[str]:
    return [slot["name"] for slot in canonical_team_slots(team_row.get("team", []))]


def get_summary_team_species_list(team_row: dict) -> List[str]:
    return species_list(team_row)


def species_universe(*pools: Iterable[dict]) -> List[str]:
    names = []
    for pool in pools:
        for row in pool:
            names.extend(species_list(row))
    return sorted(set(names))


def load_normalized_pool(path: Path) -> List[dict]:
    payload = read_json(path, {"teams": []})
    teams = payload.get("teams", [])
    return [row for row in teams if species_list(row)]


@dataclass
class CandidateResult:
    label: str
    source_type: str
    confidence: float
    tags: List[str]
    team: List[dict]
    overall: float
    by_source: Dict[str, float]


def team_confidence(row: dict) -> float:
    source_type = row.get("sourceType", "random")
    baseline = SOURCE_CONFIDENCE_DEFAULTS.get(source_type, 0.5)
    declared = row.get("confidence")
    completeness = row.get("completeness", 0.0)
    try:
        declared_value = float(declared) if declared is not None else baseline
    except (TypeError, ValueError):
        declared_value = baseline
    try:
        completeness_value = float(completeness)
    except (TypeError, ValueError):
        completeness_value = 0.0
    return max(0.1, min(1.0, declared_value * 0.75 + completeness_value * 0.25))


def role_bonus(team_row: dict, priors: Dict[str, dict]) -> float:
    species = species_list(team_row)
    total = 0.0
    for name in species:
        total += float(priors.get(normalize_key(name), {}).get("weight", 0))
    return total / max(1, len(species))


def move_bonus(team_row: dict, weights: Dict[str, float]) -> float:
    total = 0.0
    count = 0
    for slot in canonical_team_slots(team_row.get("team", [])):
        for move in slot.get("moves", []):
            total += float(weights.get(normalize_key(move), 0))
            count += 1
    return total / max(1, count)


def overlap_penalty(left: Sequence[str], right: Sequence[str]) -> float:
    overlap = len(set(left) & set(right))
    return overlap / max(1, len(set(right)))


def threat_pressure(opponent: Sequence[str], threat_penalties: Dict[str, dict]) -> float:
    if not opponent:
        return 1.0
    total = 0.0
    for species in opponent:
        total += float(threat_penalties.get(normalize_key(species), {}).get("multiplier", 1))
    return total / len(opponent)


def evaluate_vs_pool(
    candidate: dict,
    pool: Sequence[dict],
    priors: Dict[str, dict],
    move_weights: Dict[str, float],
    threat_penalties: Dict[str, dict],
) -> float:
    if not pool:
        return 0.5
    candidate_species = species_list(candidate)
    base_role_bonus = role_bonus(candidate, priors)
    base_move_bonus = move_bonus(candidate, move_weights)
    scores = []
    for opponent in pool:
        opponent_species = species_list(opponent)
        source_weight = SOURCE_SAMPLING_DEFAULTS.get(opponent.get("sourceType", "random"), 0.5)
        confidence_weight = team_confidence(opponent)
        overlap = overlap_penalty(candidate_species, opponent_species)
        pressure = threat_pressure(opponent_species, threat_penalties)
        partial_penalty = max(0.0, 1.0 - float(opponent.get("completeness", 0)))
        score = (
            1.25
            - overlap * 0.42
            - pressure * 0.16
            - partial_penalty * 0.08
            + base_role_bonus * 0.28
            + base_move_bonus * 0.24
        )
        scores.append(max(0.0, min(1.0, score * source_weight * 0.35 + confidence_weight * 0.65)))
    return sum(scores) / len(scores)


def make_team_row(
    label: str,
    source_type: str,
    slots: Sequence[dict],
    confidence: float,
    completeness: float,
    tags: Sequence[str],
    source_name: str = "",
    source_url: str = "",
    archetype: str = "",
) -> dict:
    return {
        "id": normalize_key(f"{source_type}-{label}"),
        "sourceType": source_type,
        "sourceName": source_name or source_type,
        "sourceUrl": source_url,
        "archetype": archetype,
        "team": canonical_team_slots(slots),
        "confidence": round(max(0.1, min(1.0, confidence)), 3),
        "completeness": round(max(0.0, min(1.0, completeness)), 3),
        "tags": list(dict.fromkeys([source_type, *tags])),
    }


def generate_mutation(base_team: dict, universe: Sequence[str], rng: random.Random) -> dict:
    slots = canonical_team_slots(base_team.get("team", []))
    known_species = [slot["name"] for slot in slots]
    available = [name for name in universe if name not in known_species]
    if not available:
        return base_team
    swaps = 1 if len(slots) < 6 else rng.randint(1, 2)
    for _ in range(swaps):
        if not available:
            break
        replacement = available.pop(rng.randrange(len(available)))
        replacement_slot = {
            "name": replacement,
            "item": "",
            "ability": "",
            "moves": [],
            "nature": "",
            "spreads": {}
        }
        if len(slots) < 6:
            slots.append(replacement_slot)
        else:
            slots[rng.randrange(len(slots))] = replacement_slot
    return make_team_row(
        label=f"{base_team.get('id', 'candidate')}-mut",
        source_type="selfplay",
        slots=slots,
        confidence=0.46,
        completeness=0.4,
        tags=["generated", "exploratory"],
        source_name="self-generated",
    )


def build_candidate_pool(
    meta_pool: Sequence[dict],
    pikalytics_pool: Sequence[dict],
    reddit_pool: Sequence[dict],
    youtube_pool: Sequence[dict],
    archive_pool: Sequence[dict],
    random_pool: Sequence[dict],
    selfplay_pool: Sequence[dict],
    iterations: int,
    rng: random.Random,
) -> List[dict]:
    seed_rows = list(meta_pool) + list(pikalytics_pool) + list(reddit_pool) + list(youtube_pool) + list(archive_pool) + list(random_pool) + list(selfplay_pool)
    universe = species_universe(meta_pool, pikalytics_pool, reddit_pool, youtube_pool, archive_pool, random_pool, selfplay_pool)
    candidates = [row for row in seed_rows if species_list(row)]
    for index in range(iterations):
        seed = rng.choice(seed_rows or [])
        if not seed:
            break
        mutated = generate_mutation(seed, universe, rng)
        mutated["id"] = normalize_key(f"generated-{index + 1}")
        mutated["sourceName"] = "self-generated"
        mutated["sourceUrl"] = ""
        mutated["tags"] = list(dict.fromkeys(mutated.get("tags", []) + ["generated"]))
        candidates.append(mutated)
    deduped = {}
    for row in candidates:
        key = "|".join(species_list(row))
        if key:
            deduped[key] = row
    return list(deduped.values())


def update_species_role_priors(previous: dict, top_results: Sequence[CandidateResult]) -> dict:
    priors = dict(previous.get("priors", {}))
    counts = Counter()
    for result in top_results:
        for slot in result.team:
            counts[normalize_key(slot["name"])] += 1
    total = max(1, sum(counts.values()))
    for species, count in counts.items():
        row = priors.get(species, {"roles": []})
        row["weight"] = round(count / total, 3)
        priors[species] = row
    return {"updatedAt": utc_now(), "priors": priors}


def update_move_choice_weights(previous: dict, top_results: Sequence[CandidateResult]) -> dict:
    weights = dict(previous.get("weights", {}))
    move_scores = defaultdict(float)
    for result in top_results:
        for slot in result.team:
            for move in slot.get("moves", []):
                move_scores[normalize_key(move)] += result.overall * result.confidence
    divisor = max(1.0, sum(move_scores.values()))
    for move, value in move_scores.items():
        weights[move] = round(max(-1.0, min(1.0, value / divisor * 8)), 3)
    return {"updatedAt": utc_now(), "weights": weights}


def update_threat_penalties(previous: dict, results: Sequence[CandidateResult], source_meta_snapshot: dict) -> dict:
    by_threat = dict(previous.get("byThreat", {}))
    weak_rows = results[-max(4, min(12, len(results))):]
    weak_counts = Counter()
    for result in weak_rows:
        for slot in result.team:
            weak_counts[normalize_key(slot["name"])] += 1
    snapshot_lookup = {normalize_key(row.get("name", "")): row for row in source_meta_snapshot.get("threats", [])}
    for key, snapshot_row in snapshot_lookup.items():
        current = by_threat.get(key, {"multiplier": 1.0, "notes": "Observed in remote source-weighted training."})
        pressure = weak_counts.get(key, 0) / max(1, len(weak_rows))
        current["multiplier"] = round(max(0.6, min(2.2, 1.0 + pressure * 0.35 + float(snapshot_row.get("importance", 1)) * 0.15)), 3)
        current["notes"] = snapshot_row.get("notes", current.get("notes", "Observed in remote source-weighted training."))
        by_threat[key] = current
    return {"updatedAt": utc_now(), "byThreat": by_threat}


def update_learned_weights(previous: dict, top_results: Sequence[CandidateResult], source_meta_snapshot: dict) -> dict:
    candidate_weights = dict(previous.get("candidateScoreWeights", {}))
    mean_score = sum(result.overall for result in top_results) / max(1, len(top_results))
    candidate_weights["rolePrior"] = round(max(2.0, min(12.0, 4.5 + mean_score * 4)), 3)
    candidate_weights["moveWeight"] = round(max(2.0, min(12.0, 3.5 + mean_score * 3.5)), 3)
    candidate_weights["threatPenalty"] = round(max(6.0, min(20.0, 9.5 + (1 - mean_score) * 7)), 3)
    candidate_weights["archiveBias"] = round(max(1.0, min(8.0, 2.0 + len(top_results) * 0.18)), 3)
    threat_rows = source_meta_snapshot.get("threats", [])
    severity_weights = {"default": 1, "byThreat": {}}
    for row in threat_rows:
        severity_weights["byThreat"][normalize_key(row.get("name", ""))] = round(float(row.get("importance", 1)), 3)
    return {
        "version": int(previous.get("version", 1)) + 1,
        "updatedAt": utc_now(),
        "candidateScoreWeights": candidate_weights,
        "leadPairBias": previous.get("leadPairBias", {"fakeOut": 0, "speedControl": 0}),
        "threatSeverityWeights": severity_weights,
        "sourceSamplingWeights": SOURCE_SAMPLING_DEFAULTS,
        "sourceConfidenceDefaults": SOURCE_CONFIDENCE_DEFAULTS,
    }


def update_team_archive(previous: dict, top_results: Sequence[CandidateResult]) -> dict:
    archived = list(previous.get("teams", []))
    for result in top_results[:14]:
        archived.append(
            {
                "source": result.source_type,
                "label": result.label,
                "team": [slot["name"] for slot in result.team],
                "score": round(result.overall, 3),
                "confidence": round(result.confidence, 3),
            }
        )
    deduped = {}
    for row in archived:
        key = "|".join(str(name) for name in row.get("team", []))
        if key:
            deduped[key] = row
    return {"updatedAt": utc_now(), "teams": list(deduped.values())[-120:]}


def build_source_meta_snapshot(*pools: Sequence[dict]) -> dict:
    counter = defaultdict(float)
    notes = {}
    sources = defaultdict(set)
    for pool in pools:
        for row in pool:
            confidence = team_confidence(row)
            source_type = row.get("sourceType", "unknown")
            for slot in canonical_team_slots(row.get("team", [])):
                key = normalize_key(slot["name"])
                counter[key] += confidence * SOURCE_SAMPLING_DEFAULTS.get(source_type, 0.5)
                sources[key].add(source_type)
                if row.get("sourceName"):
                    notes[key] = f"Observed in {', '.join(sorted(sources[key]))} source pools."
    top_rows = []
    ordered = sorted(counter.items(), key=lambda item: item[1], reverse=True)[:30]
    if ordered:
        peak = ordered[0][1]
    else:
        peak = 1
    for key, value in ordered:
        top_rows.append(
            {
                "name": key,
                "displayName": key,
                "importance": round(max(0.6, min(1.8, value / peak * 1.8)), 3),
                "sources": sorted(sources[key]),
                "notes": notes.get(key, "Observed in normalized remote sources.")
            }
        )
    return {
        "updatedAt": utc_now(),
        "sources": sorted({source for row in top_rows for source in row.get("sources", [])}),
        "threats": top_rows
    }


def write_battle_log(results: Sequence[CandidateResult]) -> Path:
    BATTLE_LOG_DIR.mkdir(parents=True, exist_ok=True)
    path = BATTLE_LOG_DIR / f"training-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.jsonl"
    with path.open("w", encoding="utf-8") as handle:
        for result in results:
            handle.write(
                json.dumps(
                    {
                        "timestamp": utc_now(),
                        "label": result.label,
                        "sourceType": result.source_type,
                        "confidence": round(result.confidence, 3),
                        "tags": result.tags,
                        "team": [slot["name"] for slot in result.team],
                        "overall": round(result.overall, 4),
                        "bySource": {key: round(value, 4) for key, value in result.by_source.items()},
                    }
                )
                + "\n"
            )
    return path


def write_summary(results: Sequence[CandidateResult], log_path: Path, iterations: int, source_counts: Dict[str, int]) -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Off-PC Training Summary",
        "",
        f"- Timestamp: {utc_now()}",
        f"- Candidate iterations: {iterations}",
        f"- Evaluated candidates: {len(results)}",
        f"- Battle log: `{log_path.as_posix().replace(str(ROOT).replace(os.sep, '/'), '').lstrip('/')}`",
        "",
        "## Source Counts",
        "",
    ]
    for source_type, count in sorted(source_counts.items()):
        lines.append(f"- `{source_type}`: {count}")
    lines.extend(["", "## Top Teams", ""])
    for result in results[:6]:
        summary_species = ", ".join(get_summary_team_species_list({"team": result.team}))
        lines.append(
            f"- [{result.source_type}] score `{result.overall:.3f}` confidence `{result.confidence:.2f}`"
        )
        lines.append(f"  `{summary_species}`")
        lines.append(
            f"  meta `{result.by_source['meta']:.3f}` | pikalytics `{result.by_source['pikalytics']:.3f}` | "
            f"reddit `{result.by_source['reddit']:.3f}` | youtube `{result.by_source['youtube']:.3f}` | "
            f"archive `{result.by_source['archive']:.3f}` | random `{result.by_source['random']:.3f}` | "
            f"selfplay `{result.by_source['selfplay']:.3f}`"
        )
    (REPORT_DIR / "training_summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    ensure_remote_only()
    parser = argparse.ArgumentParser()
    parser.add_argument("--iterations", type=int, default=32)
    parser.add_argument("--seed", type=int, default=11)
    args = parser.parse_args()
    rng = random.Random(args.seed)

    normalized_meta = load_normalized_pool(NORMALIZED_DIR / "meta_pool.json")
    normalized_pikalytics = load_normalized_pool(NORMALIZED_DIR / "pikalytics_pool.json")
    normalized_reddit = load_normalized_pool(NORMALIZED_DIR / "reddit_pool.json")
    normalized_youtube = load_normalized_pool(NORMALIZED_DIR / "youtube_pool.json")
    normalized_random = load_normalized_pool(NORMALIZED_DIR / "random_pool.json")
    normalized_selfplay = load_normalized_pool(NORMALIZED_DIR / "self_play_pool.json")

    archive_state = read_json(DATA_DIR / "team_archive.json", {"teams": []})
    archive_pool = [
        make_team_row(
            label=row.get("label") or row.get("source_name") or "-".join(species_list({"team": row.get("team", [])})[:2]) or "archive-team",
            source_type="archive",
            slots=canonical_team_slots(row.get("team", [])),
            confidence=float(row.get("confidence", 0.85)),
            completeness=0.5,
            tags=["archive"],
            source_name="team_archive",
        )
        for row in archive_state.get("teams", [])
        if row.get("team")
    ]

    learned_weights = read_json(DATA_DIR / "learned_weights.json", {})
    species_role_priors = read_json(DATA_DIR / "species_role_priors.json", {"priors": {}})
    move_choice_weights = read_json(DATA_DIR / "move_choice_weights.json", {"weights": {}})
    threat_penalties = read_json(DATA_DIR / "threat_penalties.json", {"byThreat": {}})

    source_meta_snapshot = build_source_meta_snapshot(
        normalized_meta,
        normalized_pikalytics,
        normalized_reddit,
        normalized_youtube,
        archive_pool,
        normalized_selfplay,
    )
    write_json(NORMALIZED_DIR / "source_meta_snapshot.json", source_meta_snapshot)

    candidates = build_candidate_pool(
        normalized_meta,
        normalized_pikalytics,
        normalized_reddit,
        normalized_youtube,
        archive_pool,
        normalized_random,
        normalized_selfplay,
        args.iterations,
        rng,
    )
    write_json(
        NORMALIZED_DIR / "combined_training_pool.json",
        {
            "updatedAt": utc_now(),
            "teams": candidates,
        },
    )

    results: List[CandidateResult] = []
    for candidate in candidates:
        by_source = {
            "meta": evaluate_vs_pool(candidate, normalized_meta, species_role_priors.get("priors", {}), move_choice_weights.get("weights", {}), threat_penalties.get("byThreat", {})),
            "pikalytics": evaluate_vs_pool(candidate, normalized_pikalytics, species_role_priors.get("priors", {}), move_choice_weights.get("weights", {}), threat_penalties.get("byThreat", {})),
            "reddit": evaluate_vs_pool(candidate, normalized_reddit, species_role_priors.get("priors", {}), move_choice_weights.get("weights", {}), threat_penalties.get("byThreat", {})),
            "youtube": evaluate_vs_pool(candidate, normalized_youtube, species_role_priors.get("priors", {}), move_choice_weights.get("weights", {}), threat_penalties.get("byThreat", {})),
            "archive": evaluate_vs_pool(candidate, archive_pool, species_role_priors.get("priors", {}), move_choice_weights.get("weights", {}), threat_penalties.get("byThreat", {})),
            "random": evaluate_vs_pool(candidate, normalized_random, species_role_priors.get("priors", {}), move_choice_weights.get("weights", {}), threat_penalties.get("byThreat", {})),
            "selfplay": evaluate_vs_pool(candidate, normalized_selfplay, species_role_priors.get("priors", {}), move_choice_weights.get("weights", {}), threat_penalties.get("byThreat", {})),
        }
        weighted_score = sum(
            by_source[source] * SOURCE_SAMPLING_DEFAULTS.get(source, 0.5)
            for source in by_source
        ) / max(1.0, sum(SOURCE_SAMPLING_DEFAULTS.get(source, 0.5) for source in by_source))
        results.append(
            CandidateResult(
                label=candidate.get("id", candidate.get("sourceName", "candidate")),
                source_type=candidate.get("sourceType", "random"),
                confidence=team_confidence(candidate),
                tags=list(candidate.get("tags", [])),
                team=canonical_team_slots(candidate.get("team", [])),
                overall=weighted_score,
                by_source=by_source,
            )
        )

    results.sort(key=lambda row: row.overall * row.confidence, reverse=True)
    log_path = write_battle_log(results)

    updated_archive = update_team_archive(archive_state, results)
    updated_priors = update_species_role_priors(species_role_priors, results[:14])
    updated_moves = update_move_choice_weights(move_choice_weights, results[:12])
    updated_penalties = update_threat_penalties(threat_penalties, results, source_meta_snapshot)
    updated_weights = update_learned_weights(learned_weights, results[:12], source_meta_snapshot)

    write_json(DATA_DIR / "team_archive.json", updated_archive)
    write_json(DATA_DIR / "species_role_priors.json", updated_priors)
    write_json(DATA_DIR / "move_choice_weights.json", updated_moves)
    write_json(DATA_DIR / "threat_penalties.json", updated_penalties)
    write_json(DATA_DIR / "learned_weights.json", updated_weights)

    source_counts = Counter(row.get("sourceType", "unknown") for row in candidates)
    write_summary(results, log_path, args.iterations, dict(source_counts))


if __name__ == "__main__":
    main()
