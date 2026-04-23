import json
import math
import os
from collections import Counter, defaultdict
from copy import deepcopy
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
NORMALIZED_DIR = DATA_DIR / "normalized"
PERSISTENT_DIR = DATA_DIR / "persistent"
REPORTS_DIR = ROOT / "reports"

CURRENT_FILES = {
    "learned_weights": DATA_DIR / "learned_weights.json",
    "species_role_priors": DATA_DIR / "species_role_priors.json",
    "move_choice_weights": DATA_DIR / "move_choice_weights.json",
    "threat_penalties": DATA_DIR / "threat_penalties.json",
    "team_archive": DATA_DIR / "team_archive.json",
    "combined_training_pool": NORMALIZED_DIR / "combined_training_pool.json",
    "source_meta_snapshot": NORMALIZED_DIR / "source_meta_snapshot.json",
    "high_level_creator_pool": NORMALIZED_DIR / "high_level_creator_pool.json",
}

PERSISTENT_FILES = {
    "training_history": PERSISTENT_DIR / "training_history.json",
    "persistent_shell_memory": PERSISTENT_DIR / "persistent_shell_memory.json",
    "persistent_archetype_memory": PERSISTENT_DIR / "persistent_archetype_memory.json",
    "persistent_source_reliability": PERSISTENT_DIR / "persistent_source_reliability.json",
    "persistent_matchup_memory": PERSISTENT_DIR / "persistent_matchup_memory.json",
    "persistent_mega_memory": PERSISTENT_DIR / "persistent_mega_memory.json",
    "training_memory_debug": PERSISTENT_DIR / "training_memory_debug.json",
}

MEGA_STONE_MAP = {
    "charizardite x": "Mega Charizard X",
    "charizardite y": "Mega Charizard Y",
    "tyranitarite": "Mega Tyranitar",
    "venusaurite": "Mega Venusaur",
    "gengarite": "Mega Gengar",
    "kangaskhanite": "Mega Kangaskhan",
    "salamencite": "Mega Salamence",
    "metagrossite": "Mega Metagross",
    "swampertite": "Mega Swampert",
}

WEATHER_ABILITIES = {
    "drizzle": "rain",
    "drought": "sun",
    "sand stream": "sand",
    "snow warning": "snow",
}

SOURCE_QUALITY_WEIGHTS = {
    "tournament_result": 1.35,
    "serious_ladder": 1.15,
    "high_level_analysis": 1.1,
    "niche_showcase": 0.95,
    "experimental_high_level": 0.92,
    "entertainment_low_confidence": 0.65,
    "archive": 1.12,
    "meta": 1.05,
    "random": 0.55,
    "selfplay": 0.78,
}


def require_remote_only():
    if os.environ.get("GITHUB_ACTIONS") != "true":
        raise RuntimeError("persistent_memory.py refuses local execution")
    if os.environ.get("RUNNER_ENVIRONMENT", "").lower() == "self-hosted":
        raise RuntimeError("persistent_memory.py refuses self-hosted runners")


def load_json(path, default):
    if not path.exists():
        return deepcopy(default)
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=True)
        handle.write("\n")


def normalize_text(value):
    return str(value or "").strip()


def slugify(value):
    return normalize_text(value).lower().replace("_", "-")


def coerce_learning_slot(slot):
    if isinstance(slot, str):
        return {
            "name": slot,
            "species": slot,
            "item": "",
            "mega_stone": "",
            "ability": "",
            "moves": [],
            "role": "",
            "archetype": "",
        }
    if isinstance(slot, dict):
        return slot
    return {
        "name": "",
        "species": "",
        "item": "",
        "mega_stone": "",
        "ability": "",
        "moves": [],
        "role": "",
        "archetype": "",
    }


def get_learning_species_identity(slot):
    return normalize_text(
        slot.get("base_species")
        or slot.get("baseSpecies")
        or slot.get("species")
        or slot.get("name")
    )


def get_learning_mega_identity(slot):
    item = slugify(slot.get("mega_stone") or slot.get("megaStone") or slot.get("item"))
    if item in MEGA_STONE_MAP:
        return MEGA_STONE_MAP[item]
    explicit = normalize_text(slot.get("mega_identity") or slot.get("megaIdentity"))
    if explicit:
        return explicit
    species = normalize_text(slot.get("species"))
    if species.startswith("Mega "):
        return species
    return ""


def get_learning_form_identity(slot):
    mega_identity = get_learning_mega_identity(slot)
    if mega_identity:
        return mega_identity
    return normalize_text(slot.get("species") or slot.get("name"))


def canonicalize_learning_slot(slot):
    slot = deepcopy(coerce_learning_slot(slot))
    base_species = get_learning_species_identity(slot)
    mega_identity = get_learning_mega_identity(slot)
    form_identity = get_learning_form_identity(slot)
    moves = [normalize_text(move) for move in slot.get("moves", []) if normalize_text(move)]
    return {
        "base_species": base_species,
        "display_species": normalize_text(slot.get("species") or form_identity or base_species),
        "item": normalize_text(slot.get("item")),
        "mega_stone": normalize_text(slot.get("mega_stone") or slot.get("megaStone") or slot.get("item") if mega_identity else ""),
        "mega_identity": mega_identity,
        "form_identity": form_identity or base_species,
        "role": normalize_text(slot.get("role")),
        "archetype": normalize_text(slot.get("archetype")),
        "moves": moves[:4],
        "key_moves": moves[:2],
        "identity_key": "::".join([
            slugify(base_species),
            slugify(form_identity),
            slugify(normalize_text(slot.get("item"))),
            slugify(mega_identity),
        ]),
    }


def normalize_team_entry(entry, fallback_archetype=""):
    team = []
    members = entry.get("team") or entry.get("members") or []
    for slot in members:
        coerced_slot = coerce_learning_slot(slot)
        normalized = canonicalize_learning_slot({
            **coerced_slot,
            "archetype": coerced_slot.get("archetype") or entry.get("archetype") or fallback_archetype,
        })
        if normalized["base_species"] or normalized["form_identity"]:
            team.append(normalized)
    return {
        "source_type": normalize_text(entry.get("source_type") or entry.get("sourceType") or entry.get("source") or "unknown"),
        "source_name": normalize_text(entry.get("source_name") or entry.get("sourceName")),
        "source_url": normalize_text(entry.get("source_url") or entry.get("sourceUrl")),
        "quality_class": normalize_text(entry.get("quality_class") or entry.get("qualityClass") or entry.get("source_quality") or entry.get("sourceQuality")),
        "archetype": normalize_text(entry.get("archetype") or fallback_archetype),
        "tags": list(dict.fromkeys([normalize_text(tag) for tag in entry.get("tags", []) if normalize_text(tag)])),
        "team": team,
        "confidence": float(entry.get("confidence", 1.0) or 1.0),
        "score": float(entry.get("score", 0.0) or 0.0),
    }


def get_shell_signature(team_entry):
    slots = [slot["identity_key"] for slot in team_entry.get("team", []) if slot.get("identity_key")]
    return "|".join(sorted(slots))


def compute_team_quality(team_entry):
    quality = SOURCE_QUALITY_WEIGHTS.get(team_entry.get("quality_class"), 0.9)
    confidence = float(team_entry.get("confidence", 1.0) or 1.0)
    score = float(team_entry.get("score", 0.0) or 0.0)
    mega_bonus = 0.12 if any(slot.get("mega_identity") for slot in team_entry.get("team", [])) else 0.0
    niche_bonus = 0.08 if "niche_competitive" in team_entry.get("tags", []) else 0.0
    anti_rain_bonus = 0.1 if "anti_rain" in team_entry.get("tags", []) else 0.0
    rain_penalty = 0.12 if team_entry.get("archetype") == "rain" else 0.0
    return max(0.1, quality * confidence + (score * 0.01) + mega_bonus + niche_bonus + anti_rain_bonus - rain_penalty)


def merge_persistent_shell_memory(current_entries, history):
    prior_shells = {entry["shell_signature"]: entry for entry in history.get("shells", [])}
    for team_entry in current_entries:
        signature = get_shell_signature(team_entry)
        if not signature:
            continue
        quality = compute_team_quality(team_entry)
        shell = prior_shells.get(signature, {
            "shell_signature": signature,
            "archetype": team_entry.get("archetype"),
            "sample_count": 0,
            "quality_score": 0.0,
            "last_sources": [],
            "team": team_entry.get("team", []),
            "rain_bias_count": 0,
            "mega_count": 0,
        })
        shell["sample_count"] += 1
        shell["quality_score"] = round((shell["quality_score"] * 0.84) + quality, 4)
        shell["archetype"] = team_entry.get("archetype") or shell.get("archetype")
        shell["team"] = team_entry.get("team", shell.get("team", []))
        source_name = team_entry.get("source_name") or team_entry.get("source_type")
        shell["last_sources"] = list(dict.fromkeys(([source_name] + shell.get("last_sources", []))))[:6]
        if team_entry.get("archetype") == "rain":
            shell["rain_bias_count"] = shell.get("rain_bias_count", 0) + 1
        if any(slot.get("mega_identity") for slot in team_entry.get("team", [])):
            shell["mega_count"] = shell.get("mega_count", 0) + 1
        prior_shells[signature] = shell
    shells = sorted(prior_shells.values(), key=lambda item: (item["quality_score"], item["sample_count"]), reverse=True)
    return {"shells": shells[:220]}


def merge_archetype_memory(current_entries, history):
    prior = history.get("archetypes", {})
    for entry in current_entries:
        archetype = entry.get("archetype") or "unknown"
        bucket = prior.setdefault(archetype, {
            "count": 0,
            "quality_score": 0.0,
            "mega_count": 0,
            "anti_rain_count": 0,
            "weather_count": 0,
        })
        quality = compute_team_quality(entry)
        bucket["count"] += 1
        bucket["quality_score"] = round((bucket["quality_score"] * 0.86) + quality, 4)
        bucket["mega_count"] += 1 if any(slot.get("mega_identity") for slot in entry.get("team", [])) else 0
        bucket["anti_rain_count"] += 1 if "anti_rain" in entry.get("tags", []) else 0
        bucket["weather_count"] += 1 if archetype in {"rain", "sun", "sand", "snow"} else 0
    return {"archetypes": prior}


def merge_source_reliability(current_entries, history):
    prior = history.get("sources", {})
    for entry in current_entries:
        source = entry.get("source_name") or entry.get("source_type") or "unknown"
        bucket = prior.setdefault(source, {
            "quality_class": entry.get("quality_class") or "unknown",
            "sample_count": 0,
            "reliability_score": 0.0,
            "tags": [],
        })
        bucket["sample_count"] += 1
        bucket["reliability_score"] = round((bucket["reliability_score"] * 0.87) + compute_team_quality(entry), 4)
        bucket["quality_class"] = entry.get("quality_class") or bucket["quality_class"]
        bucket["tags"] = list(dict.fromkeys(bucket.get("tags", []) + entry.get("tags", [])))[:12]
    return {"sources": prior}


def resolve_mega_weather_override(slot):
    mega_identity = get_learning_mega_identity(slot)
    if mega_identity == "Mega Charizard Y":
        return "sun"
    return ""


def get_effective_weather_controller(slot):
    mega_weather = resolve_mega_weather_override(slot)
    if mega_weather:
        return {
            "controller": get_learning_form_identity(slot),
            "weather": mega_weather,
            "timing": "post-mega",
        }
    ability = slugify(slot.get("ability"))
    if ability in WEATHER_ABILITIES:
        return {
            "controller": get_learning_form_identity(slot),
            "weather": WEATHER_ABILITIES[ability],
            "timing": "on-entry",
        }
    return {"controller": get_learning_form_identity(slot), "weather": "", "timing": "none"}


def resolve_lead_weather_state(left_slot, right_slot):
    left = get_effective_weather_controller(left_slot)
    right = get_effective_weather_controller(right_slot)
    active_weather = left["weather"] or right["weather"]
    if right["timing"] == "post-mega" and right["weather"]:
        active_weather = right["weather"]
    elif left["timing"] == "post-mega" and left["weather"]:
        active_weather = left["weather"]
    return {
        "left_controller": left,
        "right_controller": right,
        "final_weather": active_weather,
        "debug": f'{left["controller"]}:{left["weather"]} vs {right["controller"]}:{right["weather"]} => {active_weather}',
    }


def merge_matchup_memory(current_entries, history):
    matchups = history.get("weather_resolution_examples", [])
    for entry in current_entries:
        team = entry.get("team", [])
        if len(team) < 2:
            continue
        for slot in team[:2]:
            if resolve_mega_weather_override(slot) or slugify(slot.get("ability")) in WEATHER_ABILITIES:
                example = resolve_lead_weather_state(team[0], slot)
                matchups.append(example)
                break
    return {"weather_resolution_examples": matchups[-80:]}


def build_mega_memory(current_entries, history):
    raw_prior = history.get("mega_identities", {})
    prior = {}
    for mega_identity, payload in raw_prior.items():
        prior[mega_identity] = {
            "count": payload.get("count", 0),
            "base_species": payload.get("base_species", ""),
            "mega_stones": Counter(payload.get("mega_stones", {})),
            "archetypes": Counter(payload.get("archetypes", {})),
        }
    for entry in current_entries:
        for slot in entry.get("team", []):
            mega_identity = slot.get("mega_identity")
            if not mega_identity:
                continue
            bucket = prior.setdefault(mega_identity, {
                "count": 0,
                "base_species": slot.get("base_species"),
                "mega_stones": Counter(),
                "archetypes": Counter(),
            })
            bucket["count"] += 1
            stone = slot.get("mega_stone") or slot.get("item")
            if stone:
                bucket["mega_stones"][stone] += 1
            archetype = entry.get("archetype") or slot.get("archetype")
            if archetype:
                bucket["archetypes"][archetype] += 1
    serializable = {}
    for mega_identity, payload in prior.items():
        serializable[mega_identity] = {
            "count": payload["count"],
            "base_species": payload["base_species"],
            "mega_stones": dict(payload["mega_stones"]),
            "archetypes": dict(payload["archetypes"]),
        }
    return {"mega_identities": serializable}


def build_training_history(current_entries, history):
    entries = history.get("runs", [])
    archetype_counts = Counter(entry.get("archetype") or "unknown" for entry in current_entries)
    entries.append({
        "run_index": len(entries) + 1,
        "team_count": len(current_entries),
        "archetype_counts": dict(archetype_counts),
        "mega_team_count": sum(1 for entry in current_entries if any(slot.get("mega_identity") for slot in entry.get("team", []))),
    })
    return {"runs": entries[-120:]}


def apply_diversity_pressure(shell_memory, archetype_memory, learned_weights):
    shells = shell_memory.get("shells", [])
    archetypes = archetype_memory.get("archetypes", {})
    archetype_counts = {name: data.get("count", 0) for name, data in archetypes.items()}
    total = sum(archetype_counts.values()) or 1
    rain_share = archetype_counts.get("rain", 0) / total
    sun_share = archetype_counts.get("sun", 0) / total
    diversity_pressure = {
        "rain_penalty": round(max(0.0, rain_share - 0.26) * 1.7, 4),
        "sun_support": round(max(0.0, 0.18 - sun_share) * 1.2, 4),
        "weather_diversity_target": 0.26,
        "applied": rain_share > 0.26,
    }
    learned_weights["archetype_diversity_pressure"] = diversity_pressure
    learned_weights["persistent_shell_count"] = len(shells)
    learned_weights["rain_shell_pressure"] = diversity_pressure["rain_penalty"]
    learned_weights["sun_shell_support"] = diversity_pressure["sun_support"]
    return diversity_pressure


def merge_current_entries():
    combined_pool = load_json(CURRENT_FILES["combined_training_pool"], {"teams": []})
    team_archive = load_json(CURRENT_FILES["team_archive"], {"teams": []})
    high_level_pool = load_json(CURRENT_FILES["high_level_creator_pool"], {"teams": []})
    current_entries = []
    for team in combined_pool.get("teams", []):
        current_entries.append(normalize_team_entry(team))
    for team in team_archive.get("teams", []):
        current_entries.append(normalize_team_entry({**team, "source_type": "archive", "quality_class": "archive"}))
    for team in high_level_pool.get("teams", []):
        current_entries.append(normalize_team_entry(team))
    deduped = {}
    for entry in current_entries:
        signature = get_shell_signature(entry)
        if not signature:
            continue
        incumbent = deduped.get(signature)
        if not incumbent or compute_team_quality(entry) > compute_team_quality(incumbent):
            deduped[signature] = entry
    return list(deduped.values())


def rewrite_team_archive(current_entries):
    archive_payload = {
        "teams": []
    }
    for entry in sorted(current_entries, key=compute_team_quality, reverse=True)[:180]:
        archive_payload["teams"].append({
            "source_type": entry.get("source_type"),
            "source_name": entry.get("source_name"),
            "source_url": entry.get("source_url"),
            "archetype": entry.get("archetype"),
            "tags": entry.get("tags", []),
            "confidence": entry.get("confidence", 1.0),
            "quality_class": entry.get("quality_class"),
            "team": entry.get("team", []),
        })
    save_json(CURRENT_FILES["team_archive"], archive_payload)


def rewrite_combined_pool(current_entries, diversity_pressure):
    payload = {
        "teams": current_entries[:240],
        "diversity_pressure": diversity_pressure,
    }
    save_json(CURRENT_FILES["combined_training_pool"], payload)


def rewrite_source_meta_snapshot(current_entries, diversity_pressure):
    archetype_counts = Counter(entry.get("archetype") or "unknown" for entry in current_entries)
    payload = load_json(CURRENT_FILES["source_meta_snapshot"], {})
    payload["persistent_archetype_counts"] = dict(archetype_counts)
    payload["archetype_diversity_pressure"] = diversity_pressure
    payload["top_sources"] = Counter(entry.get("source_name") or entry.get("source_type") for entry in current_entries).most_common(12)
    save_json(CURRENT_FILES["source_meta_snapshot"], payload)


def main():
    require_remote_only()
    current_entries = merge_current_entries()
    learned_weights = load_json(CURRENT_FILES["learned_weights"], {})
    training_history = build_training_history(current_entries, load_json(PERSISTENT_FILES["training_history"], {"runs": []}))
    shell_memory = merge_persistent_shell_memory(current_entries, load_json(PERSISTENT_FILES["persistent_shell_memory"], {"shells": []}))
    archetype_memory = merge_archetype_memory(current_entries, load_json(PERSISTENT_FILES["persistent_archetype_memory"], {"archetypes": {}}))
    source_reliability = merge_source_reliability(current_entries, load_json(PERSISTENT_FILES["persistent_source_reliability"], {"sources": {}}))
    matchup_memory = merge_matchup_memory(current_entries, load_json(PERSISTENT_FILES["persistent_matchup_memory"], {"weather_resolution_examples": []}))
    mega_memory = build_mega_memory(current_entries, load_json(PERSISTENT_FILES["persistent_mega_memory"], {"mega_identities": {}}))
    diversity_pressure = apply_diversity_pressure(shell_memory, archetype_memory, learned_weights)

    save_json(PERSISTENT_FILES["training_history"], training_history)
    save_json(PERSISTENT_FILES["persistent_shell_memory"], shell_memory)
    save_json(PERSISTENT_FILES["persistent_archetype_memory"], archetype_memory)
    save_json(PERSISTENT_FILES["persistent_source_reliability"], source_reliability)
    save_json(PERSISTENT_FILES["persistent_matchup_memory"], matchup_memory)
    save_json(PERSISTENT_FILES["persistent_mega_memory"], mega_memory)
    save_json(CURRENT_FILES["learned_weights"], learned_weights)

    rewrite_team_archive(current_entries)
    rewrite_combined_pool(current_entries, diversity_pressure)
    rewrite_source_meta_snapshot(current_entries, diversity_pressure)

    debug_payload = {
        "prior_runs_reused": len(training_history.get("runs", [])),
        "persistent_shells_retained": len(shell_memory.get("shells", [])),
        "mega_identities": list(mega_memory.get("mega_identities", {}).keys())[:20],
        "archetype_counts": archetype_memory.get("archetypes", {}),
        "diversity_pressure": diversity_pressure,
        "weather_example": resolve_lead_weather_state(
            {
                "species": "Pelipper",
                "ability": "Drizzle",
            },
            {
                "species": "Charizard",
                "item": "Charizardite Y",
                "ability": "Blaze",
            },
        ),
    }
    save_json(PERSISTENT_FILES["training_memory_debug"], debug_payload)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    (REPORTS_DIR / "training_memory_report.md").write_text(
        "\n".join([
            "# Persistent Training Memory Report",
            "",
            f"- Prior runs reused: {debug_payload['prior_runs_reused']}",
            f"- Persistent shells retained: {debug_payload['persistent_shells_retained']}",
            f"- Rain diversity penalty: {diversity_pressure['rain_penalty']}",
            f"- Sun support bonus: {diversity_pressure['sun_support']}",
            f"- Weather example: {debug_payload['weather_example']['debug']}",
        ]) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
