import json
import math
import os
import re
import ast
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
    "high_level": 1.08,
    "creator": 1.06,
    "archive": 1.12,
    "meta": 1.05,
    "random": 0.55,
    "selfplay": 0.35,
}

ARCHETYPE_BUCKETS = {
    "hard_tr": "Hard TR",
    "tr_hybrid": "TR Hybrid",
    "tailwind": "Tailwind",
    "hyper_offense": "Hyper Offense",
    "rain": "Rain",
    "sun": "Sun",
    "stall_fat_balance": "Stall / Fat Balance",
    "anti_meta": "Anti-meta",
    "double_mega": "Double Mega",
    "gc_only": "GC-only",
}

SOURCE_BACKED_TYPES = {
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
}

SUPPORT_SPECIES = {
    "Incineroar",
    "Farigiraf",
    "Sinistcha",
    "Whimsicott",
    "Amoonguss",
    "Pelipper",
    "Raichu",
    "Rotom-Wash",
    "Rillaboom",
}

SPEED_CONTROL_MOVES = {"Trick Room", "Tailwind", "Icy Wind", "Electroweb", "Thunder Wave", "Bulldoze"}
SUPPORT_MOVES = {"Fake Out", "Parting Shot", "Rage Powder", "Follow Me", "Helping Hand", "Encore", "Taunt", "Will-O-Wisp", "Wide Guard"}
TR_SETTERS = {"Farigiraf", "Sinistcha", "Oranguru", "Cresselia", "Hatterene", "Porygon2", "Indeedee-F", "Indeedee"}
SLOW_ATTACKERS = {"Torkoal", "Kingambit", "Conkeldurr", "Ursaluna", "Mega Camerupt", "Mega Ampharos", "Amoonguss", "Tyranitar", "Rhyperior"}
TAILWIND_SETTERS = {"Whimsicott", "Pelipper", "Talonflame", "Murkrow", "Tornadus", "Dragonite"}
RAIN_ABUSERS = {"Basculegion", "Archaludon", "Barraskewda", "Kingdra", "Ludicolo", "Floatzel", "Mega Swampert"}
SUN_SETTERS = {"Torkoal", "Mega Charizard Y", "Charizard", "Ninetales"}
SUN_ABUSERS = {"Venusaur", "Lilligant", "Walking Wake", "Scovillain"}
BULKY_SUPPORTS = SUPPORT_SPECIES | {"Primarina", "Porygon2", "Cresselia", "Indeedee-F", "Indeedee", "Dusclops"}
FAST_PRESSURE_SPECIES = {"Sneasler", "Garchomp", "Starmie", "Dragonite", "Basculegion", "Gengar", "Mega Gengar", "Mega Aerodactyl", "Mega Lopunny", "Weavile", "Dragapult"}
COMMON_THREAT_ANSWERS = {"Incineroar", "Rillaboom", "Rotom-Wash", "Primarina", "Kingambit", "Dragonite", "Whimsicott", "Farigiraf", "Amoonguss", "Sinistcha"}
PRIORITY_MOVES = {"Fake Out", "Sucker Punch", "Extreme Speed", "Aqua Jet", "Mach Punch", "Bullet Punch", "Grassy Glide", "First Impression"}
SETUP_MOVES = {"Swords Dance", "Nasty Plot", "Dragon Dance", "Bulk Up", "Calm Mind", "Shell Smash", "Quiver Dance"}
RECOVERY_REDIRECT_PIVOT_MOVES = SUPPORT_MOVES | {"Recover", "Roost", "Strength Sap", "Life Dew", "Slack Off", "Moonlight", "Synthesis", "U-turn", "Volt Switch", "Flip Turn"}

VARIANT_SOURCE_TYPE_MAP = {
    "archive_variant": "archive",
    "high_level_variant": "high_level",
    "pikalytics_variant": "pikalytics",
    "reddit_variant": "reddit",
    "youtube_variant": "youtube",
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


def canonical_source_type(value):
    text = normalize_text(value).lower().replace("-", "_")
    if text == "self_play":
        return "selfplay"
    if text == "highlevel":
        return "high_level"
    if text == "highlevelvariant":
        return "high_level_variant"
    if text == "archivevariant":
        return "archive_variant"
    if text == "pikalyticsvariant":
        return "pikalytics_variant"
    if text == "redditvariant":
        return "reddit_variant"
    if text == "youtubevariant":
        return "youtube_variant"
    return text


def collapse_repeated_source_prefix(text, source_type):
    cleaned = normalize_text(text)
    prefix = canonical_source_type(source_type).replace("_", "")
    lowered = slugify(cleaned).replace("-", "")
    if not cleaned or not prefix:
        return cleaned
    while lowered.startswith(prefix * 2):
        lowered = prefix + lowered[len(prefix) * 2:]
    return lowered or prefix


def derive_variant_origin_source_type(source_type):
    source_type = canonical_source_type(source_type)
    if source_type in VARIANT_SOURCE_TYPE_MAP:
        return VARIANT_SOURCE_TYPE_MAP[source_type]
    if source_type.endswith("_variant"):
        return canonical_source_type(source_type[: -len("_variant")])
    return ""


def ensure_variant_provenance(entry):
    normalized = dict(entry or {})
    source_type = canonical_source_type(normalized.get("sourceType") or normalized.get("source_type") or normalized.get("source"))
    if not source_type:
        return normalized
    normalized["sourceType"] = source_type
    normalized["source_type"] = source_type
    if source_type not in VARIANT_SOURCE_TYPE_MAP and not source_type.endswith("_variant"):
        return normalized
    origin_source_type = canonical_source_type(
        normalized.get("originSourceType")
        or normalized.get("origin_source_type")
        or derive_variant_origin_source_type(source_type)
    )
    normalized["originSourceType"] = origin_source_type
    normalized["origin_source_type"] = origin_source_type
    parent_source_name = normalize_text(
        normalized.get("parentSourceName")
        or normalized.get("parent_source_name")
        or normalized.get("sourceName")
        or normalized.get("source_name")
        or origin_source_type
    )
    normalized["parentSourceName"] = parent_source_name
    normalized["parent_source_name"] = parent_source_name
    normalized["generated"] = bool(normalized.get("generated", True))
    normalized["variantReason"] = normalize_text(normalized.get("variantReason") or normalized.get("variant_reason") or "controlled-source-variant")
    normalized["variant_reason"] = normalized["variantReason"]
    return normalized


CANONICAL_SLOT_KEYS = {
    "base_species",
    "display_species",
    "identity_key",
}

SERIALIZED_SLOT_MARKERS = (
    "base_species",
    "display_species",
    "identity_key",
    "form_identity",
    "mega_identity",
    "mega_stone",
    "moves",
    "ability",
    "item",
    "role",
    "archetype",
)


MALFORMED_THREAT_KEY_MARKERS = (
    "basespecies",
    "displayspecies",
    "megastone",
    "megaidentity",
    "formidentity",
    "identitykey",
    "source_type",
    "sourcetype",
    "source_name",
    "sourcename",
    "moves",
    "ability",
    "item",
)


def extract_clean_species_name(value):
    if isinstance(value, dict):
        for key in ("display_species", "species", "name", "base_species"):
            candidate = normalize_text(value.get(key))
            if candidate:
                return candidate
        return ""
    if isinstance(value, str):
        text = normalize_text(value)
        if not text:
            return ""
        lowered = text.lower()
        if "basespecies" in lowered:
            match = re.search(r"basespecies([a-z0-9\- .']+?)(displayspecies|item|ability|moves|role|archetype|mega|formidentity|identitykey|$)", lowered)
            if match:
                return match.group(1).strip(" -_:.")
        if "display_species" in lowered or "base_species" in lowered or "species" in lowered:
            match = re.search(r"(display_species|species|name|base_species)['\"]?\s*[:=]\s*['\"]?([a-z0-9\- .']+)", lowered)
            if match:
                return match.group(2).strip(" '\"{},")
        return text
    return ""


def is_serialized_slot_blob(value):
    if not isinstance(value, str):
        return False
    text = normalize_text(value)
    if len(text) < 16 or text[0] != "{" or text[-1] != "}":
        return False
    lowered = text.lower()
    return sum(marker in lowered for marker in SERIALIZED_SLOT_MARKERS) >= 3


def try_parse_serialized_slot(value):
    if not is_serialized_slot_blob(value):
        return None
    try:
        parsed = ast.literal_eval(normalize_text(value))
    except (SyntaxError, ValueError):
        return None
    return parsed if isinstance(parsed, dict) else None


def is_canonical_learning_slot(slot):
    return isinstance(slot, dict) and CANONICAL_SLOT_KEYS.issubset(slot.keys())


def normalize_move_list(value):
    if isinstance(value, str):
        parsed = try_parse_serialized_slot(value)
        if parsed:
            value = parsed.get("moves", [])
        else:
            value = [part.strip() for part in value.split(",")]
    if not isinstance(value, list):
        return []
    return [normalize_text(move) for move in value if normalize_text(move)]


def unwrap_learning_slot_payload(slot, depth=0):
    if depth > 4:
        return {}
    if isinstance(slot, str):
        parsed = try_parse_serialized_slot(slot)
        if parsed:
            return unwrap_learning_slot_payload(parsed, depth + 1)
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
    if not isinstance(slot, dict):
        return {}

    parsed_fields = {}
    for key in ("base_species", "display_species", "species", "name", "form_identity"):
        parsed = try_parse_serialized_slot(slot.get(key))
        if parsed:
            nested = unwrap_learning_slot_payload(parsed, depth + 1)
            if nested:
                parsed_fields.update(nested)
                break

    merged = {**deepcopy(slot), **parsed_fields}
    for field in ("base_species", "display_species", "species", "name", "form_identity", "mega_identity", "identity_key"):
        parsed = try_parse_serialized_slot(merged.get(field))
        if parsed:
            nested = unwrap_learning_slot_payload(parsed, depth + 1)
            if nested:
                merged.update(nested)

    merged["moves"] = normalize_move_list(merged.get("moves", []))
    return merged


def canonical_slot_has_blob_fields(slot):
    if not isinstance(slot, dict):
        return True
    for key in ("base_species", "display_species", "form_identity", "identity_key"):
        value = slot.get(key)
        if is_serialized_slot_blob(value):
            return True
        text = normalize_text(value)
        if "base_species" in text.lower() and "display_species" in text.lower():
            return True
    return False


def get_clean_team_archetype(team_entry):
    explicit = slugify(team_entry.get("archetype"))
    if explicit in {"rain", "sun", "sand", "snow"}:
        return explicit
    weather_counts = Counter()
    for slot in team_entry.get("team", []):
        weather = get_effective_weather_controller(slot).get("weather")
        if weather:
            weather_counts[weather] += 1
    if weather_counts:
        return weather_counts.most_common(1)[0][0]
    return explicit or "unknown"


def is_corrupted_team_entry(entry):
    if not isinstance(entry, dict):
        return True
    source_name = normalize_text(entry.get("source_name") or entry.get("sourceName") or entry.get("label"))
    source_type = normalize_text(entry.get("source_type") or entry.get("sourceType") or entry.get("source"))
    if slugify(source_name) == "archivearchive" or slugify(source_type) == "archivearchive":
        return True
    members = entry.get("team") or entry.get("members") or []
    if not isinstance(members, list):
        return True
    for slot in members:
        raw_slot = unwrap_learning_slot_payload(slot)
        if not raw_slot:
            return True
        for field in ("base_species", "display_species", "species", "name", "identity_key"):
            value = raw_slot.get(field)
            if is_serialized_slot_blob(value):
                return True
            text = normalize_text(value)
            if "{'base_species'" in text or '"base_species"' in text:
                return True
    return False


def normalize_species_key(value):
    species = extract_clean_species_name(value)
    species = species.replace("Mega ", "").replace("mega ", "")
    species = re.sub(r"[^A-Za-z0-9]+", "", species).lower()
    return species


def is_malformed_threat_key(key):
    normalized = normalize_text(key).lower()
    if not normalized:
        return True
    if len(normalized) > 40:
        return True
    return any(marker in normalized for marker in MALFORMED_THREAT_KEY_MARKERS)


def sanitize_threat_key_map(raw_map):
    cleaned = {}
    if not isinstance(raw_map, dict):
        return cleaned
    for raw_key, raw_value in raw_map.items():
        clean_key = normalize_species_key(raw_key)
        if not clean_key:
            continue
        if is_malformed_threat_key(raw_key) and clean_key == normalize_species_key(str(raw_key)):
            recovered = extract_clean_species_name(raw_key)
            clean_key = normalize_species_key(recovered)
        if not clean_key or is_malformed_threat_key(clean_key):
            continue
        try:
            value = float(raw_value)
        except (TypeError, ValueError):
            continue
        cleaned[clean_key] = round(max(cleaned.get(clean_key, 0.0), value), 4)
    return cleaned


def collect_clean_threat_weights(current_entries):
    counts = Counter()
    for entry in current_entries:
        quality = compute_team_quality(entry)
        for slot in entry.get("team", []):
            key = normalize_species_key(slot)
            if key:
                counts[key] += quality
    if not counts:
        return {}
    max_count = max(counts.values()) or 1.0
    return {
        key: round(1.0 + min(1.25, value / max_count), 4)
        for key, value in counts.items()
    }


def sanitize_learned_threat_weights(learned_weights, current_entries):
    learned_weights = dict(learned_weights or {})
    threat_weights = dict(learned_weights.get("threatSeverityWeights") or {})
    existing_clean = sanitize_threat_key_map(threat_weights.get("byThreat") or {})
    rebuilt_clean = collect_clean_threat_weights(current_entries)
    merged = dict(existing_clean)
    for key, value in rebuilt_clean.items():
        merged[key] = round(max(merged.get(key, 0.0), value), 4)
    threat_weights["byThreat"] = {
        key: merged[key]
        for key in sorted(merged)
        if key and not is_malformed_threat_key(key)
    }
    learned_weights["threatSeverityWeights"] = threat_weights
    return learned_weights


def sanitize_source_meta_snapshot_threats(snapshot, current_entries):
    snapshot = dict(snapshot or {})
    for field in ("byThreat", "threatImportance", "threatPenalties"):
        if isinstance(snapshot.get(field), dict):
            snapshot[field] = sanitize_threat_key_map(snapshot[field])
    rebuilt = collect_clean_threat_weights(current_entries)
    if rebuilt:
        snapshot["cleanThreatImportance"] = rebuilt
    return snapshot


def coerce_learning_slot(slot):
    parsed = try_parse_serialized_slot(slot) if isinstance(slot, str) else None
    if parsed:
        return coerce_learning_slot(parsed)
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
    if is_canonical_learning_slot(slot):
        return normalize_text(slot.get("base_species") or slot.get("display_species") or slot.get("form_identity"))
    return normalize_text(
        slot.get("base_species")
        or slot.get("baseSpecies")
        or slot.get("species")
        or slot.get("name")
    )


def get_learning_mega_identity(slot):
    if is_canonical_learning_slot(slot):
        return normalize_text(slot.get("mega_identity"))
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
    if is_canonical_learning_slot(slot):
        return normalize_text(slot.get("form_identity") or slot.get("display_species") or slot.get("base_species"))
    mega_identity = get_learning_mega_identity(slot)
    if mega_identity:
        return mega_identity
    return normalize_text(slot.get("species") or slot.get("name"))


def canonicalize_learning_slot(slot):
    slot = unwrap_learning_slot_payload(slot)
    slot = deepcopy(coerce_learning_slot(slot))
    if is_canonical_learning_slot(slot):
        base_species = normalize_text(slot.get("base_species"))
        display_species = normalize_text(slot.get("display_species") or base_species)
        mega_identity = normalize_text(slot.get("mega_identity"))
        form_identity = normalize_text(slot.get("form_identity") or display_species or base_species)
        item = normalize_text(slot.get("item"))
        mega_stone = normalize_text((slot.get("mega_stone") or item) if mega_identity else "")
        moves = normalize_move_list(slot.get("moves", []))
        identity_key = normalize_text(slot.get("identity_key")) or "::".join([
            slugify(base_species),
            slugify(form_identity),
            slugify(item),
            slugify(mega_identity),
        ])
        normalized = {
            "base_species": base_species,
            "display_species": display_species,
            "item": item,
            "mega_stone": mega_stone,
            "mega_identity": mega_identity,
            "form_identity": form_identity,
            "role": normalize_text(slot.get("role")),
            "archetype": normalize_text(slot.get("archetype")),
            "moves": moves[:4],
            "key_moves": [normalize_text(move) for move in slot.get("key_moves", []) if normalize_text(move)] or moves[:2],
            "identity_key": identity_key,
        }
        if canonical_slot_has_blob_fields(normalized):
            return {}
        return normalized
    base_species = get_learning_species_identity(slot)
    mega_identity = get_learning_mega_identity(slot)
    form_identity = get_learning_form_identity(slot)
    moves = normalize_move_list(slot.get("moves", []))
    normalized = {
        "base_species": base_species,
        "display_species": normalize_text(slot.get("species") or form_identity or base_species),
        "item": normalize_text(slot.get("item")),
        "mega_stone": normalize_text((slot.get("mega_stone") or slot.get("megaStone") or slot.get("item")) if mega_identity else ""),
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
    if canonical_slot_has_blob_fields(normalized):
        return {}
    return normalized


def normalize_team_entry(entry, fallback_archetype=""):
    if is_corrupted_team_entry(entry):
        return None
    team = []
    members = entry.get("team") or entry.get("members") or []
    for slot in members:
        coerced_slot = unwrap_learning_slot_payload(slot)
        normalized = canonicalize_learning_slot({
            **coerced_slot,
            "archetype": coerced_slot.get("archetype") or entry.get("archetype") or fallback_archetype,
        })
        if normalized and (normalized["base_species"] or normalized["form_identity"]):
            team.append(normalized)
    if not team:
        return None
    source_type = canonical_source_type(entry.get("source_type") or entry.get("sourceType") or entry.get("source") or "unknown")
    if slugify(source_type) == "archivearchive":
        source_type = "archive"
    source_name = collapse_repeated_source_prefix(entry.get("source_name") or entry.get("sourceName"), source_type)
    if slugify(source_name) == "archivearchive":
        source_name = "archive"
    normalized_entry = {
        "source_type": source_type,
        "source_name": source_name,
        "source_url": normalize_text(entry.get("source_url") or entry.get("sourceUrl")),
        "quality_class": normalize_text(entry.get("quality_class") or entry.get("qualityClass") or entry.get("source_quality") or entry.get("sourceQuality")),
        "archetype": normalize_text(entry.get("archetype") or fallback_archetype),
        "tags": list(dict.fromkeys([normalize_text(tag) for tag in entry.get("tags", []) if normalize_text(tag)])),
        "team": team,
        "confidence": float(entry.get("confidence", 1.0) or 1.0),
        "score": float(entry.get("score", 0.0) or 0.0),
    }
    normalized_entry["sourceType"] = source_type
    normalized_entry["sourceName"] = source_name or source_type
    normalized_entry["sourceUrl"] = normalized_entry["source_url"]
    normalized_entry["originSourceType"] = normalize_text(entry.get("originSourceType") or entry.get("origin_source_type"))
    normalized_entry["parentSourceName"] = normalize_text(entry.get("parentSourceName") or entry.get("parent_source_name"))
    normalized_entry["generated"] = bool(entry.get("generated", False))
    normalized_entry["variantReason"] = normalize_text(entry.get("variantReason") or entry.get("variant_reason"))
    normalized_entry["archetype"] = get_clean_team_archetype(normalized_entry)
    return ensure_variant_provenance(normalized_entry)


def normalize_output_team_entry(entry):
    normalized = dict(entry or {})
    if "sourceType" not in normalized:
        normalized["sourceType"] = normalized.get("source_type", "archive")
    normalized["sourceType"] = canonical_source_type(normalized.get("sourceType"))
    if "sourceName" not in normalized:
        normalized["sourceName"] = normalized.get("source_name", normalized["sourceType"])
    normalized["sourceName"] = collapse_repeated_source_prefix(normalized.get("sourceName"), normalized.get("sourceType"))
    if slugify(normalized.get("sourceName")) == "archivearchive":
        normalized["sourceName"] = "archive"
    if "sourceUrl" not in normalized:
        normalized["sourceUrl"] = normalized.get("source_url", "")
    if "team" not in normalized or not isinstance(normalized["team"], list):
        normalized["team"] = []
    clean_team = []
    for slot in normalized.get("team", []):
        canonical_slot = canonicalize_learning_slot(slot)
        if not canonical_slot:
            continue
        clean_team.append({
            "name": canonical_slot.get("display_species") or canonical_slot.get("base_species"),
            "species": canonical_slot.get("display_species") or canonical_slot.get("base_species"),
            "base_species": canonical_slot.get("base_species"),
            "display_species": canonical_slot.get("display_species"),
            "item": canonical_slot.get("item"),
            "mega_stone": canonical_slot.get("mega_stone"),
            "mega_identity": canonical_slot.get("mega_identity"),
            "form_identity": canonical_slot.get("form_identity"),
            "role": canonical_slot.get("role"),
            "archetype": canonical_slot.get("archetype"),
            "moves": canonical_slot.get("moves", []),
            "identity_key": canonical_slot.get("identity_key"),
        })
    normalized["team"] = clean_team[:6]
    normalized["archetype"] = get_clean_team_archetype({"team": clean_team, "archetype": normalized.get("archetype", "")})
    return ensure_variant_provenance(normalized)


def finalize_output_row(entry):
    normalized = normalize_output_team_entry(entry)
    normalized = ensure_variant_provenance(normalized)
    normalized["sourceName"] = collapse_repeated_source_prefix(normalized.get("sourceName"), normalized.get("sourceType"))
    if slugify(normalized.get("sourceName")) == "archivearchive":
        normalized["sourceName"] = "archive"
    if (
        str(normalized.get("sourceType", "")).endswith("_variant")
        and not normalize_text(normalized.get("originSourceType"))
    ):
        raise AssertionError(f"finalize_output_row missing originSourceType for variant row `{normalized.get('id') or normalized.get('sourceName')}`")
    return normalized


def get_shell_signature(team_entry):
    slots = [slot["identity_key"] for slot in team_entry.get("team", []) if slot.get("identity_key")]
    return "|".join(sorted(slots))


def compute_team_quality(team_entry):
    quality = SOURCE_QUALITY_WEIGHTS.get(team_entry.get("quality_class"), 0.9)
    source_type = canonical_source_type(team_entry.get("source_type") or team_entry.get("sourceType") or team_entry.get("source"))
    if source_type == "selfplay":
        quality = min(quality, 0.35)
    elif source_type in SOURCE_BACKED_TYPES:
        quality = max(quality, 1.0)
    confidence = float(team_entry.get("confidence", 1.0) or 1.0)
    score = float(team_entry.get("score", 0.0) or 0.0)
    mega_bonus = 0.12 if any(slot.get("mega_identity") for slot in team_entry.get("team", [])) else 0.0
    niche_bonus = 0.08 if "niche_competitive" in team_entry.get("tags", []) else 0.0
    anti_rain_bonus = 0.1 if "anti_rain" in team_entry.get("tags", []) else 0.0
    rain_penalty = 0.12 if get_clean_team_archetype(team_entry) == "rain" else 0.0
    return max(0.1, quality * confidence + (score * 0.01) + mega_bonus + niche_bonus + anti_rain_bonus - rain_penalty)


def merge_persistent_shell_memory(current_entries, history):
    prior_shells = {}
    for entry in history.get("shells", []):
        normalized = normalize_team_entry({
            **entry,
            "team": entry.get("team", []),
            "source_type": "archive",
            "quality_class": "archive",
        }, fallback_archetype=entry.get("archetype", ""))
        if not normalized:
            continue
        signature = entry.get("shell_signature") or get_shell_signature(normalized)
        if not signature:
            continue
        prior_shells[signature] = {
            **entry,
            "shell_signature": signature,
            "archetype": get_clean_team_archetype(normalized),
            "team": normalized.get("team", []),
        }
    for team_entry in current_entries:
        signature = get_shell_signature(team_entry)
        if not signature:
            continue
        clean_archetype = get_clean_team_archetype(team_entry)
        quality = compute_team_quality(team_entry)
        shell = prior_shells.get(signature, {
            "shell_signature": signature,
            "archetype": clean_archetype,
            "sample_count": 0,
            "quality_score": 0.0,
            "last_sources": [],
            "team": team_entry.get("team", []),
            "rain_bias_count": 0,
            "mega_count": 0,
        })
        shell["sample_count"] += 1
        shell["quality_score"] = round((shell["quality_score"] * 0.84) + quality, 4)
        shell["archetype"] = clean_archetype or shell.get("archetype")
        shell["team"] = team_entry.get("team", shell.get("team", []))
        source_name = team_entry.get("source_name") or team_entry.get("source_type")
        shell["last_sources"] = list(dict.fromkeys(([source_name] + shell.get("last_sources", []))))[:6]
        if clean_archetype == "rain":
            shell["rain_bias_count"] = shell.get("rain_bias_count", 0) + 1
        if any(slot.get("mega_identity") for slot in team_entry.get("team", [])):
            shell["mega_count"] = shell.get("mega_count", 0) + 1
        prior_shells[signature] = shell
    shells = sorted(prior_shells.values(), key=lambda item: (item["quality_score"], item["sample_count"]), reverse=True)
    return {"shells": shells[:220]}


def normalize_archetype_key(value):
    text = slugify(value).replace("_", "-")
    compact = text.replace("-", "")
    if text in {"hard-tr", "full-tr", "tr", "trick-room", "hard-trick-room"} or compact in {"hardtr", "fulltr", "trickroom"}:
        return "hard_tr"
    if text in {"tr-hybrid", "soft-tr", "tr-balance", "trick-room-hybrid"} or "tr-hybrid" in text:
        return "tr_hybrid"
    if "tailwind" in text:
        return "tailwind"
    if text in {"hyper-offense", "fast-offense", "ho"} or "hyper-offense" in text or "fast-offense" in text:
        return "hyper_offense"
    if "anti-meta" in text or "antimeta" in compact or text.startswith("anti-"):
        return "anti_meta"
    if "rain" in text:
        return "rain"
    if "sun" in text or "mega-sun" in text:
        return "sun"
    if text in {"stall", "fat-balance", "bulky-balance", "balance-fat", "bulky-offense"}:
        return "stall_fat_balance"
    if "double-mega" in text:
        return "double_mega"
    if text in {"gc", "gc-only", "grand-challenge"} or "gc-only" in text:
        return "gc_only"
    return ""


def archetype_entry_text(entry):
    fields = [
        entry.get("archetype"),
        " ".join(str(tag) for tag in entry.get("tags", []) if str(tag).strip()),
        entry.get("source_name"),
        entry.get("sourceName"),
        entry.get("source_type"),
        entry.get("sourceType"),
        entry.get("source_url"),
        entry.get("sourceUrl"),
        entry.get("quality_class"),
        entry.get("qualityClass"),
        entry.get("ruleset"),
        entry.get("format"),
        entry.get("notes"),
        entry.get("title"),
    ]
    return " ".join(normalize_text(field) for field in fields if normalize_text(field)).lower()


def archetype_move_key(move):
    return slugify(move).replace("-", "")


def archetype_slot_species(slot):
    return normalize_text(
        slot.get("mega_identity")
        or slot.get("display_species")
        or slot.get("form_identity")
        or slot.get("base_species")
        or slot.get("species")
        or slot.get("name")
    )


def archetype_species_key(species):
    return slugify(species).replace("-", "").replace(" ", "")


def archetype_has_species(species_keys, names):
    wanted = {archetype_species_key(name) for name in names}
    return bool(species_keys.intersection(wanted))


def archetype_mega_count(team):
    count = 0
    for slot in team:
        name = archetype_slot_species(slot)
        item = normalize_text(slot.get("mega_stone") or slot.get("megaStone") or slot.get("item"))
        if slot.get("mega_identity") or name.startswith("Mega ") or slugify(item) in MEGA_STONE_MAP:
            count += 1
    return count


def infer_archetype_keys(entry):
    text = archetype_entry_text(entry)
    text_key = slugify(text)
    compact_text = text_key.replace("-", "")
    team = entry.get("team", [])
    move_keys = {archetype_move_key(move) for slot in team for move in slot.get("moves", [])}
    species = {archetype_slot_species(slot) for slot in team if archetype_slot_species(slot)}
    species_keys = {archetype_species_key(name) for name in species}
    mega_count = archetype_mega_count(team)
    keys = set()
    explicit = normalize_archetype_key(entry.get("archetype"))
    if explicit:
        keys.add(explicit)
    for tag in entry.get("tags", []):
        tag_key = normalize_archetype_key(tag)
        if tag_key:
            keys.add(tag_key)

    trick_room_count = sum(1 for slot in team if "trickroom" in {archetype_move_key(move) for move in slot.get("moves", [])})
    trick_room_count += sum(1 for name in species if name in TR_SETTERS)
    tailwind_count = sum(1 for slot in team if "tailwind" in {archetype_move_key(move) for move in slot.get("moves", [])})
    tailwind_count += sum(1 for name in species if name in TAILWIND_SETTERS)
    slow_count = sum(1 for name in species if name in SLOW_ATTACKERS)
    support_count = sum(1 for name in species if name in BULKY_SUPPORTS)
    support_count += sum(1 for slot in team if {archetype_move_key(move) for move in slot.get("moves", [])}.intersection({archetype_move_key(move) for move in RECOVERY_REDIRECT_PIVOT_MOVES}))
    fast_pressure_count = sum(1 for name in species if name in FAST_PRESSURE_SPECIES)
    priority_count = len(move_keys.intersection({archetype_move_key(move) for move in PRIORITY_MOVES}))
    setup_count = len(move_keys.intersection({archetype_move_key(move) for move in SETUP_MOVES}))
    breaker_count = max(0, len(team) - min(support_count, len(team)))

    tr_text = any(token in text for token in ("trick room", "hard tr", "hard-tr", "full tr", "full-tr")) or "trickroom" in compact_text
    if trick_room_count or tr_text:
        hard_tr_shell = slow_count >= 2 or archetype_has_species(species_keys, {"Farigiraf", "Sinistcha", "Torkoal"})
        if hard_tr_shell and ("hard tr" in text or "hard-tr" in text_key or "full tr" in text or slow_count >= 2):
            keys.add("hard_tr")
        else:
            keys.add("tr_hybrid")
        if tailwind_count or priority_count >= 2 or fast_pressure_count >= 2:
            keys.add("tr_hybrid")

    if tailwind_count or "tailwind" in text:
        keys.add("tailwind")

    rain_score = 0
    rain_score += 2 if "rain" in text and "anti-rain" not in text_key else 0
    rain_score += 2 if archetype_has_species(species_keys, {"Pelipper"}) else 0
    rain_score += 1 if archetype_has_species(species_keys, RAIN_ABUSERS) else 0
    rain_score += 1 if "drizzle" in compact_text else 0
    if rain_score >= 2:
        keys.add("rain")

    sun_score = 0
    sun_score += 2 if "sun" in text or "mega-sun" in text_key else 0
    sun_score += 2 if archetype_has_species(species_keys, SUN_SETTERS) else 0
    sun_score += 1 if archetype_has_species(species_keys, SUN_ABUSERS) else 0
    sun_score += 1 if "drought" in compact_text else 0
    if sun_score >= 2:
        keys.add("sun")

    if "hyper offense" in text or "hyper-offense" in text_key or "fast offense" in text or (breaker_count >= 4 and support_count <= 1 and fast_pressure_count + priority_count + setup_count >= 2):
        keys.add("hyper_offense")

    anti_terms = ("anti meta", "anti-meta", "antimeta", "anti rain", "anti-rain", "anti tailwind", "anti-tailwind", "anti tr", "anti-tr", "counter", "matchup", "meta call", "standard meta")
    if any(term in text for term in anti_terms) or any(str(tag).lower().startswith("anti_") for tag in entry.get("tags", [])):
        keys.add("anti_meta")
    elif canonical_source_type(entry.get("source_type") or entry.get("sourceType")) in SOURCE_BACKED_TYPES and archetype_has_species(species_keys, COMMON_THREAT_ANSWERS) and len(team) >= 4:
        keys.add("anti_meta")

    if mega_count >= 2:
        keys.add("double_mega")
    if "gc" in text_key.split("-") or "gc-only" in text_key or "grand challenge" in text or "grand-challenge" in text_key:
        keys.add("gc_only")

    if not keys and support_count >= 2:
        keys.add("stall_fat_balance")
    if not keys and breaker_count >= 4:
        keys.add("hyper_offense")
    return sorted(keys or {"unknown"})


def bump_counter_list(rows, key, amount, sample=None, limit=18):
    if not key:
        return rows
    found = None
    for row in rows:
        if row.get("key") == key:
            found = row
            break
    if not found:
        found = {"key": key, "score": 0.0, "samples": []}
        rows.append(found)
    found["score"] = round(float(found.get("score", 0.0)) * 0.9 + amount, 4)
    if sample:
        found["samples"] = list(dict.fromkeys([sample] + found.get("samples", [])))[:5]
    rows.sort(key=lambda row: row.get("score", 0), reverse=True)
    return rows[:limit]


def archetype_slot_name(slot):
    return normalize_text(slot.get("mega_identity") or slot.get("display_species") or slot.get("base_species"))


def merge_archetype_memory(current_entries, history):
    prior = {
        name: payload
        for name, payload in (history.get("archetypes", {}) or {}).items()
        if normalize_text(name)
        and not is_serialized_slot_blob(name)
        and "base_species" not in normalize_text(name).lower()
    }
    for key, label in ARCHETYPE_BUCKETS.items():
        bucket = prior.setdefault(key, {})
        bucket.setdefault("label", label)
        bucket.setdefault("count", 0)
        bucket.setdefault("quality_score", 0.0)
        bucket.setdefault("best_support_shells", [])
        bucket.setdefault("best_speed_control", [])
        bucket.setdefault("best_megas", [])
        bucket.setdefault("best_breakers", [])
        bucket.setdefault("bad_matchup_plans", [])
        bucket.setdefault("bad_patterns_to_avoid", [])
    legacy_unknown = prior.get("unknown", {})
    if int(legacy_unknown.get("count", 0) or 0) > 0:
        fallback = prior["stall_fat_balance"]
        fallback["count"] = int(fallback.get("count", 0) or 0) + int(legacy_unknown.get("count", 0) or 0)
        fallback["quality_score"] = round(max(float(fallback.get("quality_score", 0.0) or 0.0), float(legacy_unknown.get("quality_score", 0.0) or 0.0)), 4)
        legacy_unknown["count"] = 0
        legacy_unknown["quality_score"] = 0.0
    for entry in current_entries:
        quality = compute_team_quality(entry)
        source_type = canonical_source_type(entry.get("source_type") or entry.get("sourceType") or entry.get("source"))
        authority = 0.45 if source_type == "selfplay" else 1.0
        sample = entry.get("source_name") or entry.get("source_type") or "training"
        team = entry.get("team", [])
        support_names = [archetype_slot_name(slot) for slot in team if archetype_slot_name(slot) in SUPPORT_SPECIES or SUPPORT_MOVES.intersection(slot.get("moves", []))]
        support_shell = " + ".join(support_names[:3])
        for archetype in infer_archetype_keys(entry):
            bucket = prior.setdefault(archetype, {
                "label": ARCHETYPE_BUCKETS.get(archetype, archetype),
                "count": 0,
                "quality_score": 0.0,
                "best_support_shells": [],
                "best_speed_control": [],
                "best_megas": [],
                "best_breakers": [],
                "bad_matchup_plans": [],
                "bad_patterns_to_avoid": [],
            })
            bucket["label"] = ARCHETYPE_BUCKETS.get(archetype, bucket.get("label", archetype))
            bucket["count"] = int(bucket.get("count", 0)) + 1
            bucket["quality_score"] = round(float(bucket.get("quality_score", 0.0)) * 0.9 + quality * authority, 4)
            if support_shell:
                bucket["best_support_shells"] = bump_counter_list(bucket.get("best_support_shells", []), support_shell, quality * authority, sample)
            for slot in team:
                name = archetype_slot_name(slot)
                moves = set(slot.get("moves", []))
                for move in sorted(moves.intersection(SPEED_CONTROL_MOVES)):
                    bucket["best_speed_control"] = bump_counter_list(bucket.get("best_speed_control", []), f"{name}: {move}", quality * authority, sample)
                if slot.get("mega_identity") or name.startswith("Mega "):
                    bucket["best_megas"] = bump_counter_list(bucket.get("best_megas", []), name, quality * authority, sample)
                damaging = [move for move in slot.get("moves", []) if move not in SUPPORT_MOVES and move not in SPEED_CONTROL_MOVES and move != "Protect"]
                if damaging and name not in SUPPORT_SPECIES:
                    bucket["best_breakers"] = bump_counter_list(bucket.get("best_breakers", []), name, quality * authority, sample)
            for tag in entry.get("tags", []):
                if str(tag).startswith("anti_") or "counter" in str(tag):
                    bucket["bad_matchup_plans"] = bump_counter_list(bucket.get("bad_matchup_plans", []), str(tag), quality * authority, sample, limit=12)
            if source_type in {"selfplay", "random"}:
                bucket["bad_patterns_to_avoid"] = bump_counter_list(bucket.get("bad_patterns_to_avoid", []), f"do not treat {source_type} as authority", 0.2, sample, limit=12)
            if archetype == "hard_tr" and any("Tailwind" in slot.get("moves", []) for slot in team):
                bucket["bad_patterns_to_avoid"] = bump_counter_list(bucket.get("bad_patterns_to_avoid", []), "mixing Tailwind into Hard TR without hybrid intent", quality, sample, limit=12)
    for key, bucket in prior.items():
        bucket.setdefault("label", ARCHETYPE_BUCKETS.get(key, key))
        bucket.setdefault("count", 0)
        bucket.setdefault("quality_score", 0.0)
        bucket.setdefault("best_support_shells", [])
        bucket.setdefault("best_speed_control", [])
        bucket.setdefault("best_megas", [])
        bucket.setdefault("best_breakers", [])
        bucket.setdefault("bad_matchup_plans", [])
        bucket.setdefault("bad_patterns_to_avoid", [])
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
    weather_shell_counts = Counter(get_clean_team_archetype(shell) for shell in shells if shell.get("team"))
    shell_total = sum(weather_shell_counts.values()) or 1
    rain_shell_share = weather_shell_counts.get("rain", 0) / shell_total
    sun_shell_share = weather_shell_counts.get("sun", 0) / shell_total
    effective_rain_share = max(rain_share, rain_shell_share)
    effective_sun_share = max(sun_share, sun_shell_share)
    diversity_pressure = {
        "rain_penalty": round(max(0.0, effective_rain_share - 0.26) * 1.7, 4),
        "sun_support": round(max(0.0, 0.18 - effective_sun_share) * 1.2, 4),
        "weather_diversity_target": 0.26,
        "rain_share": round(rain_share, 4),
        "sun_share": round(sun_share, 4),
        "rain_shell_share": round(rain_shell_share, 4),
        "sun_shell_share": round(sun_shell_share, 4),
        "applied": effective_rain_share > 0.26,
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
    retained_pool = combined_pool.get("retainedTeams", [])
    active_learning_pool = retained_pool if isinstance(retained_pool, list) and retained_pool else combined_pool.get("teams", [])
    current_entries = []
    for team in active_learning_pool:
        normalized = normalize_team_entry(team)
        if normalized:
            current_entries.append(normalized)
    for team in team_archive.get("teams", []):
        normalized = normalize_team_entry({**team, "source_type": "archive", "quality_class": "archive"})
        if normalized:
            current_entries.append(normalized)
    for team in high_level_pool.get("teams", []):
        normalized = normalize_team_entry(team)
        if normalized:
            current_entries.append(normalized)
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
    finalized_rows = [finalize_output_row(entry) for entry in current_entries[:240]]
    for row in finalized_rows:
        assert not (
            str(row.get("sourceType", "")).endswith("_variant")
            and not normalize_text(row.get("originSourceType"))
        ), f"rewrite_combined_pool refusing invalid variant row `{row.get('id') or row.get('sourceName')}`"
    payload = {
        "teams": finalized_rows,
        "diversity_pressure": diversity_pressure,
    }
    save_json(CURRENT_FILES["combined_training_pool"], payload)


def rewrite_source_meta_snapshot(current_entries, diversity_pressure):
    archetype_counts = Counter(entry.get("archetype") or "unknown" for entry in current_entries)
    payload = load_json(CURRENT_FILES["source_meta_snapshot"], {})
    payload = sanitize_source_meta_snapshot_threats(payload, current_entries)
    payload["persistent_archetype_counts"] = dict(archetype_counts)
    payload["archetype_diversity_pressure"] = diversity_pressure
    payload["top_sources"] = Counter(entry.get("source_name") or entry.get("source_type") for entry in current_entries).most_common(12)
    save_json(CURRENT_FILES["source_meta_snapshot"], payload)


def main():
    require_remote_only()
    current_entries = merge_current_entries()
    learned_weights = load_json(CURRENT_FILES["learned_weights"], {})
    learned_weights = sanitize_learned_threat_weights(learned_weights, current_entries)
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
        "persistent_memory_updated": True,
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
            "- persistent_memory_updated: true",
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
