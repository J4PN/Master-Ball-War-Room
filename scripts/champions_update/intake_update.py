#!/usr/bin/env python3
"""Prepare future Champions update intake reviews and guarded apply steps.

This script is intentionally conservative:
- review mode scaffolds intake data and a review report
- apply mode only stages verified intake records into the intake registry
- audit mode checks the current repo for Champions data drift

It does not guess unknown Champions legality.
"""

from __future__ import annotations

import argparse
import copy
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
UPDATE_DIR = DATA_DIR / "update_intake"
STAGING_DIR = UPDATE_DIR / "staging"
APPLIED_DIR = UPDATE_DIR / "applied"
REPORT_PATH = ROOT / "reports" / "champions_update_review.md"
REGISTRY_PATH = UPDATE_DIR / "update_registry.json"

CHAMPIONS_DATABASE_PATH = ROOT / "champions_database_complete.js"
ABILITIES_PATH = ROOT / "abilities-data.js"
ITEMS_JS_PATH = ROOT / "items-data.js"
ITEMS_JSON_PATH = ROOT / "items.json"
APP_PATH = ROOT / "app.js"
MOVE_POLICY_PATH = ROOT / "pokemon_move_discourage_policy.json"

POKEMON_TEMPLATE_PATH = UPDATE_DIR / "pokemon_template.json"
ITEM_TEMPLATE_PATH = UPDATE_DIR / "item_template.json"
MOVE_TEMPLATE_PATH = UPDATE_DIR / "move_template.json"

TYPE_TO_TEMPLATE = {
    "pokemon": POKEMON_TEMPLATE_PATH,
    "items": ITEM_TEMPLATE_PATH,
    "moves": MOVE_TEMPLATE_PATH,
}

TYPE_TO_STAGING_DIR = {
    "pokemon": STAGING_DIR / "pokemon",
    "items": STAGING_DIR / "items",
    "moves": STAGING_DIR / "moves",
}

TYPE_TO_APPLIED_DIR = {
    "pokemon": APPLIED_DIR / "pokemon",
    "items": APPLIED_DIR / "items",
    "moves": APPLIED_DIR / "moves",
}

TYPE_TO_TARGET_FILES = {
    "pokemon": [
        "champions_database_complete.js",
        "abilities-data.js",
        "app.js",
    ],
    "items": [
        "items.json",
        "items-data.js",
        "app.js",
    ],
    "moves": [
        "champions_database_complete.js",
        "pokemon_move_discourage_policy.json",
        "app.js",
    ],
}

REQUIRED_CHECKS = [
    "official_patch_notes_checked",
    "existing_source_files_checked",
    "moveset_legality_verified",
    "ability_legality_verified",
    "item_form_legality_verified",
    "calc_compatibility_verified",
]

SINGULAR_LABEL = {
    "pokemon": "pokemon",
    "items": "item",
    "moves": "move",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(value or "").strip().lower()).strip("-")


def normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value or "").strip().lower())


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return copy.deepcopy(default)
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def load_template(entity_type: str) -> dict:
    return read_json(TYPE_TO_TEMPLATE[entity_type], {})


def ensure_update_dirs() -> None:
    UPDATE_DIR.mkdir(parents=True, exist_ok=True)
    STAGING_DIR.mkdir(parents=True, exist_ok=True)
    APPLIED_DIR.mkdir(parents=True, exist_ok=True)
    for path in TYPE_TO_STAGING_DIR.values():
        path.mkdir(parents=True, exist_ok=True)
    for path in TYPE_TO_APPLIED_DIR.values():
        path.mkdir(parents=True, exist_ok=True)
    if not REGISTRY_PATH.exists():
        write_json(
            REGISTRY_PATH,
            {
                "updatedAt": None,
                "pokemon": {},
                "items": {},
                "moves": {},
            },
        )


def extract_balanced_block(text: str, start_marker: str, open_char: str, close_char: str) -> str:
    start = text.find(start_marker)
    if start == -1:
        raise ValueError(f"start marker not found: {start_marker}")
    open_index = text.find(open_char, start)
    if open_index == -1:
        raise ValueError(f"opening char not found after marker: {start_marker}")
    depth = 0
    for index in range(open_index, len(text)):
        char = text[index]
        if char == open_char:
            depth += 1
        elif char == close_char:
            depth -= 1
            if depth == 0:
                return text[open_index:index + 1]
    raise ValueError(f"unterminated block for marker: {start_marker}")


def load_js_assigned_json(path: Path, marker: str) -> dict:
    text = path.read_text(encoding="utf-8")
    block = extract_balanced_block(text, marker, "{", "}")
    return json.loads(block)


def load_champions_database() -> dict:
    return load_js_assigned_json(CHAMPIONS_DATABASE_PATH, "const CHAMPIONS_DATABASE")


def load_abilities() -> dict:
    return load_js_assigned_json(ABILITIES_PATH, "window.CHAMPIONS_ABILITIES")


def load_items() -> dict:
    if ITEMS_JSON_PATH.exists():
        return read_json(ITEMS_JSON_PATH, {})
    return load_js_assigned_json(ITEMS_JS_PATH, "window.CHAMPIONS_ITEMS")


def load_app_text() -> str:
    return APP_PATH.read_text(encoding="utf-8")


def extract_strings_from_block(block: str) -> list[str]:
    return re.findall(r'"([^"]+)"', block)


def extract_raw_mega_definitions(app_text: str) -> list[dict]:
    try:
        block = extract_balanced_block(app_text, "const rawMegaDefinitions", "[", "]")
    except ValueError:
        return []
    entries = []
    for match in re.finditer(r'\{\s*name:\s*"([^"]+)"(?P<body>.*?)\}', block, re.S):
        body = match.group("body")
        base_match = re.search(r'baseName:\s*"([^"]+)"', body)
        ability_match = re.search(r'ability:\s*"([^"]+)"', body)
        entries.append(
            {
                "name": match.group(1),
                "baseName": base_match.group(1) if base_match else "",
                "ability": ability_match.group(1) if ability_match else "",
            }
        )
    return entries


def extract_object_pairs(app_text: str, marker: str) -> dict[str, str]:
    try:
        block = extract_balanced_block(app_text, marker, "{", "}")
    except ValueError:
        return {}
    return {
        key: value
        for key, value in re.findall(r'"([^"]+)":\s*"([^"]+)"', block)
    }


def extract_seed_species_and_moves(app_text: str) -> tuple[list[str], list[str]]:
    try:
        block = extract_balanced_block(app_text, "const META_MOVESET_SEED", "{", "}")
    except ValueError:
        return [], []
    species = re.findall(r'"([^"]+)":\s*\{\s*moves:', block)
    move_names: list[str] = []
    for moves_block in re.finditer(r'moves:\s*\[([^\]]*)\]', block):
        move_names.extend(extract_strings_from_block(moves_block.group(1)))
    return species, move_names


def resolve_base_species(form_name: str, registry_keys: set[str]) -> str:
    stripped = re.sub(r"\s*\([^)]*\)\s*$", "", form_name)
    candidates = [stripped]
    if "-" in stripped:
        parts = stripped.split("-")
        for length in range(len(parts) - 1, 0, -1):
            candidates.append("-".join(parts[:length]))
    for candidate in candidates:
        if candidate in registry_keys and candidate != form_name:
            return candidate
    return ""


def champions_move_index(champions_database: dict) -> set[str]:
    moves = set()
    for row in champions_database.get("pokemon", {}).values():
        for move in row.get("legalMoves", []):
            moves.add(str(move).strip())
    return moves


def list_missing_required_fields(entity_type: str, payload: dict) -> list[str]:
    missing = []
    verification = payload.get("verification", {})
    checklist = verification.get("checklist", {})
    if payload.get("verification_status") != "verified":
        missing.append("verification_status != verified")
    for key in REQUIRED_CHECKS:
        if not checklist.get(key):
            missing.append(f"verification.checklist.{key} != true")
    if entity_type == "pokemon":
        if not payload.get("species"):
            missing.append("species missing")
        if payload.get("champions_legal") is None:
            missing.append("champions_legal missing")
        if not payload.get("typing"):
            missing.append("typing missing")
        if not payload.get("base_stats"):
            missing.append("base_stats missing")
    elif entity_type == "items":
        if not payload.get("item"):
            missing.append("item missing")
        if payload.get("champions_legal") is None:
            missing.append("champions_legal missing")
        if not payload.get("category"):
            missing.append("category missing")
    elif entity_type == "moves":
        if not payload.get("move"):
            missing.append("move missing")
        if payload.get("champions_legal") is None:
            missing.append("champions_legal missing")
        if not payload.get("move_type"):
            missing.append("move_type missing")
    return missing


def build_patch_note_evidence(reference: str) -> dict:
    if not reference:
        return {
            "reference": "TBD",
            "kind": "missing",
            "excerpt": "TBD",
        }
    candidate = Path(reference)
    if candidate.exists():
        text = candidate.read_text(encoding="utf-8", errors="replace")
        excerpt = "\n".join(text.splitlines()[:20]).strip() or "TBD"
        return {
            "reference": str(candidate),
            "kind": "local_file",
            "excerpt": excerpt[:1200],
        }
    return {
        "reference": reference,
        "kind": "url_or_external_reference",
        "excerpt": "TBD",
    }


def default_verification_block() -> dict:
    return {
        "status": "unverified",
        "checklist": {key: False for key in REQUIRED_CHECKS},
        "sources": [],
        "uncertainty_notes": [
            "Do not assume cartridge legality equals Champions legality.",
            "Record Champions-specific overrides explicitly instead of guessing.",
        ],
        "reviewed_by": "",
        "reviewed_at": None,
    }


def hydrate_pokemon_intake(species: str, patch_notes: str, champions_database: dict, abilities: dict, items: dict) -> dict:
    payload = copy.deepcopy(load_template("pokemon"))
    current_row = champions_database.get("pokemon", {}).get(species, {})
    current_abilities = abilities.get(species, [])
    if isinstance(current_abilities, str):
        current_abilities = [current_abilities]
    payload["species"] = species
    payload["patch_note_reference"] = patch_notes or "TBD"
    payload["source_notes"] = list(dict.fromkeys(payload.get("source_notes", []) + [f"Patch notes reference: {patch_notes or 'TBD'}"]))
    payload["verification"] = payload.get("verification") or default_verification_block()
    payload["verification_status"] = payload.get("verification_status") or "unverified"
    payload["apply_targets"] = TYPE_TO_TARGET_FILES["pokemon"]
    payload["current_champions_registry"] = {
        "present_in_registry": bool(current_row),
        "types": current_row.get("types", []),
        "base_stats": current_row.get("baseStats", []),
        "legal_moves": current_row.get("legalMoves", []),
        "abilities": current_abilities,
    }
    payload["forms"] = payload.get("forms") or []
    payload["base_stats"] = payload.get("base_stats") or {}
    payload["abilities"] = payload.get("abilities") or []
    payload["hidden_ability"] = payload.get("hidden_ability") or ""
    payload["typing"] = payload.get("typing") or []
    payload["legal_items"] = payload.get("legal_items") or []
    payload["champions_legal"] = payload.get("champions_legal")
    payload["champions_specific_moves"] = payload.get("champions_specific_moves") or []
    payload["removed_moves"] = payload.get("removed_moves") or []
    payload["new_moves"] = payload.get("new_moves") or []
    payload["baseline_data"] = payload.get("baseline_data") or {}
    payload["champions_overrides"] = payload.get("champions_overrides") or {}
    payload["baseline_data"].setdefault("typing", [])
    payload["baseline_data"].setdefault("base_stats", {})
    payload["baseline_data"].setdefault("abilities", [])
    payload["baseline_data"].setdefault("hidden_ability", "")
    payload["baseline_data"].setdefault("standard_moves", [])
    payload["baseline_data"].setdefault("legal_items", [])
    payload["champions_overrides"].setdefault("typing_override", [])
    payload["champions_overrides"].setdefault("base_stat_overrides", {})
    payload["champions_overrides"].setdefault("ability_overrides", [])
    payload["champions_overrides"].setdefault("champions_specific_moves", [])
    payload["champions_overrides"].setdefault("removed_moves", [])
    payload["champions_overrides"].setdefault("new_moves", [])
    payload["champions_overrides"].setdefault("form_overrides", [])
    payload["champions_overrides"].setdefault("item_overrides", [])
    payload["champions_overrides"].setdefault("mega_behavior_notes", [])
    if not payload.get("source_evidence"):
        payload["source_evidence"] = []
    payload["source_evidence"].append(build_patch_note_evidence(patch_notes))
    if current_row:
        payload["source_notes"].append("Species already exists in current Champions registry; verify whether this is an update, form change, or legality-only change.")
    else:
        payload["source_notes"].append("Species not present in current Champions registry; baseline and Champions legality remain unverified until source-backed review is complete.")
    payload["source_notes"].append("Review Mega/item coupling separately; legal items in Champions may diverge from cartridge defaults.")
    return payload


def hydrate_item_intake(item: str, patch_notes: str, items: dict) -> dict:
    payload = copy.deepcopy(load_template("items"))
    current_row = items.get(item, {})
    payload["item"] = item
    payload["patch_note_reference"] = patch_notes or "TBD"
    payload["verification"] = payload.get("verification") or default_verification_block()
    payload["verification_status"] = payload.get("verification_status") or "unverified"
    payload["apply_targets"] = TYPE_TO_TARGET_FILES["items"]
    payload["current_champions_registry"] = {
        "present_in_registry": bool(current_row),
        "category": current_row.get("category", ""),
        "effect": current_row.get("effect", ""),
    }
    payload["category"] = payload.get("category") or ""
    payload["effect"] = payload.get("effect") or ""
    payload["champions_legal"] = payload.get("champions_legal")
    payload["baseline_data"] = payload.get("baseline_data") or {}
    payload["champions_overrides"] = payload.get("champions_overrides") or {}
    payload["baseline_data"].setdefault("category", "")
    payload["baseline_data"].setdefault("effect", "")
    payload["champions_overrides"].setdefault("category_override", "")
    payload["champions_overrides"].setdefault("effect_override", "")
    payload["champions_overrides"].setdefault("related_forms", [])
    payload["source_notes"] = list(dict.fromkeys(payload.get("source_notes", []) + [f"Patch notes reference: {patch_notes or 'TBD'}"]))
    payload["source_evidence"] = (payload.get("source_evidence") or []) + [build_patch_note_evidence(patch_notes)]
    return payload


def hydrate_move_intake(move: str, patch_notes: str, champions_database: dict) -> dict:
    payload = copy.deepcopy(load_template("moves"))
    move_db = champions_move_index(champions_database)
    payload["move"] = move
    payload["patch_note_reference"] = patch_notes or "TBD"
    payload["verification"] = payload.get("verification") or default_verification_block()
    payload["verification_status"] = payload.get("verification_status") or "unverified"
    payload["apply_targets"] = TYPE_TO_TARGET_FILES["moves"]
    payload["current_champions_registry"] = {
        "present_in_registry": move in move_db,
    }
    payload["move_type"] = payload.get("move_type") or ""
    payload["category"] = payload.get("category") or ""
    payload["power"] = payload.get("power")
    payload["accuracy"] = payload.get("accuracy")
    payload["champions_legal"] = payload.get("champions_legal")
    payload["baseline_data"] = payload.get("baseline_data") or {}
    payload["champions_overrides"] = payload.get("champions_overrides") or {}
    payload["baseline_data"].setdefault("move_type", "")
    payload["baseline_data"].setdefault("category", "")
    payload["baseline_data"].setdefault("power", None)
    payload["baseline_data"].setdefault("accuracy", None)
    payload["champions_overrides"].setdefault("power_override", None)
    payload["champions_overrides"].setdefault("accuracy_override", None)
    payload["champions_overrides"].setdefault("distribution_notes", [])
    payload["source_notes"] = list(dict.fromkeys(payload.get("source_notes", []) + [f"Patch notes reference: {patch_notes or 'TBD'}"]))
    payload["source_evidence"] = (payload.get("source_evidence") or []) + [build_patch_note_evidence(patch_notes)]
    return payload


def staging_path(entity_type: str, name: str) -> Path:
    return TYPE_TO_STAGING_DIR[entity_type] / f"{slugify(name)}.json"


def applied_path(entity_type: str, name: str) -> Path:
    return TYPE_TO_APPLIED_DIR[entity_type] / f"{slugify(name)}.json"


def merge_existing_intake(existing: dict, hydrated: dict) -> dict:
    merged = copy.deepcopy(hydrated)
    for key, value in existing.items():
        if key not in merged:
            merged[key] = value
            continue
        if isinstance(value, dict) and isinstance(merged[key], dict):
            merged[key].update(value)
        elif isinstance(value, list) and isinstance(merged[key], list):
            merged[key] = value or merged[key]
        elif value not in (None, "", [], {}):
            merged[key] = value
    if "verification" in existing:
        merged["verification"] = existing["verification"]
        merged["verification_status"] = existing.get("verification_status", merged.get("verification_status", "unverified"))
    return merged


def create_or_refresh_staging_entries(args: argparse.Namespace, champions_database: dict, abilities: dict, items: dict) -> dict[str, list[dict]]:
    staged = {"pokemon": [], "items": [], "moves": []}
    for species in args.pokemon:
        hydrated = hydrate_pokemon_intake(species, args.patch_notes, champions_database, abilities, items)
        path = staging_path("pokemon", species)
        existing = read_json(path, {})
        payload = merge_existing_intake(existing, hydrated)
        write_json(path, payload)
        staged["pokemon"].append(payload)
    for item in args.item:
        hydrated = hydrate_item_intake(item, args.patch_notes, items)
        path = staging_path("items", item)
        existing = read_json(path, {})
        payload = merge_existing_intake(existing, hydrated)
        write_json(path, payload)
        staged["items"].append(payload)
    for move in args.move:
        hydrated = hydrate_move_intake(move, args.patch_notes, champions_database)
        path = staging_path("moves", move)
        existing = read_json(path, {})
        payload = merge_existing_intake(existing, hydrated)
        write_json(path, payload)
        staged["moves"].append(payload)
    return staged


def render_entity_review(entity_type: str, payload: dict) -> list[str]:
    name = payload.get("species") or payload.get("item") or payload.get("move") or "unknown"
    missing = list_missing_required_fields(entity_type, payload)
    lines = [
        f"### {SINGULAR_LABEL.get(entity_type, entity_type).title()}: `{name}`",
        "",
        f"- Verification status: `{payload.get('verification_status', 'unverified')}`",
        f"- Patch notes reference: `{payload.get('patch_note_reference', 'TBD')}`",
        f"- Current registry presence: `{payload.get('current_champions_registry', {}).get('present_in_registry', False)}`",
        f"- Files that would need updates: `{', '.join(payload.get('apply_targets', [])) or 'TBD'}`",
        "",
        "Baseline vs Champions:",
        f"- Baseline data: `{json.dumps(payload.get('baseline_data', {}), ensure_ascii=True)}`",
        f"- Champions overrides: `{json.dumps(payload.get('champions_overrides', {}), ensure_ascii=True)}`",
        "",
        "Verification checklist:",
    ]
    checklist = payload.get("verification", {}).get("checklist", {})
    for key in REQUIRED_CHECKS:
        lines.append(f"- `{key}`: `{checklist.get(key, False)}`")
    lines.extend(
        [
            "",
            "Source evidence:",
        ]
    )
    for source in payload.get("source_evidence", []):
        lines.append(f"- `{source.get('kind', 'unknown')}`: `{source.get('reference', 'TBD')}`")
    lines.extend(
        [
            "",
            "Unverified fields:",
        ]
    )
    if missing:
        for field in missing:
            lines.append(f"- `{field}`")
    else:
        lines.append("- `none`")
    lines.extend(
        [
            "",
            "Warnings:",
            "- `Do not assume cartridge legality equals Champions legality.`",
            "- `Keep unknown fields as TBD/unverified until source-backed verification exists.`",
            "",
        ]
    )
    return lines


def extract_policy_moves(policy_payload: dict) -> set[str]:
    moves = set()
    roles = policy_payload.get("roles", {})
    for role_payload in roles.values():
        for move in role_payload.get("hard_discourage", []):
            moves.add(str(move))
        conditional = role_payload.get("conditional_discourage", {})
        for value in conditional.values():
            if isinstance(value, list):
                for move in value:
                    moves.add(str(move))
        for move in role_payload.get("allow_list", []):
            moves.add(str(move))
    return moves


def run_audit(champions_database: dict, abilities: dict, items: dict, app_text: str) -> dict:
    pokemon_registry = champions_database.get("pokemon", {})
    registry_keys = set(pokemon_registry)
    move_db = champions_move_index(champions_database)
    mega_defs = extract_raw_mega_definitions(app_text)
    mega_name_to_stone = extract_object_pairs(app_text, "const MEGA_STONE_OVERRIDES")
    seed_species, seed_moves = extract_seed_species_and_moves(app_text)
    policy_moves = extract_policy_moves(read_json(MOVE_POLICY_PATH, {}))

    ui_species = sorted(set(seed_species + [row["name"] for row in mega_defs] + [row["baseName"] for row in mega_defs if row.get("baseName")]))
    species_in_ui_not_registry = [name for name in ui_species if name and name not in registry_keys and not name.startswith("Mega ")]

    missing_stats = [
        name for name, row in pokemon_registry.items()
        if not isinstance(row.get("baseStats"), list) or len(row.get("baseStats", [])) != 6
    ]
    missing_abilities = [
        name for name in registry_keys
        if name not in abilities or abilities.get(name) in (None, "", [])
    ]
    missing_moves = [
        name for name, row in pokemon_registry.items()
        if not row.get("legalMoves")
    ]

    forms_without_base = []
    for name in sorted(registry_keys):
        if "-" not in name and "(" not in name:
            continue
        base = resolve_base_species(name, registry_keys)
        if not base or base == name:
            forms_without_base.append(name)

    mega_stones = sorted(name for name, row in items.items() if row.get("category") == "mega_stone")
    referenced_mega_stones = set(mega_name_to_stone.values())
    mega_stones_without_forms = [stone for stone in mega_stones if stone not in referenced_mega_stones]

    referenced_moves = sorted(set(seed_moves) | policy_moves)
    move_refs_not_in_db = [move for move in referenced_moves if move not in move_db]

    registry_not_used_by_builder = []
    builder_usage_reason = "Builder roster is generated dynamically from CHAMPIONS_DATABASE.pokemon in app.js, so static non-use is not expected for base roster species."

    return {
        "missing_stats": missing_stats,
        "missing_abilities": missing_abilities,
        "missing_moves": missing_moves,
        "species_in_ui_not_registry": species_in_ui_not_registry,
        "registry_not_used_by_builder": registry_not_used_by_builder,
        "registry_not_used_reason": builder_usage_reason,
        "mega_stones_without_forms": mega_stones_without_forms,
        "forms_without_base_species": forms_without_base,
        "move_references_not_in_move_database": move_refs_not_in_db,
    }


def write_review_report(staged: dict[str, list[dict]], audit_summary: dict | None, args: argparse.Namespace) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Champions Update Review",
        "",
        f"- Generated at: `{utc_now()}`",
        f"- Mode: `{'audit' if args.audit else args.mode}`",
        f"- Patch notes: `{args.patch_notes or 'TBD'}`",
        f"- Requested Pokemon: `{', '.join(args.pokemon) if args.pokemon else 'none'}`",
        f"- Requested Items: `{', '.join(args.item) if args.item else 'none'}`",
        f"- Requested Moves: `{', '.join(args.move) if args.move else 'none'}`",
        "",
        "## Proposed Additions",
        "",
    ]
    if not any(staged.values()):
        lines.extend([
            "- `No staged entities requested in this run.`",
            "",
        ])
    else:
        for entity_type in ("pokemon", "items", "moves"):
            if not staged[entity_type]:
                continue
            lines.append(f"## {entity_type.title()}")
            lines.append("")
            for payload in staged[entity_type]:
                lines.extend(render_entity_review(entity_type, payload))

    if audit_summary is not None:
        lines.extend(
            [
                "## Audit Findings",
                "",
                f"- Missing stats: `{len(audit_summary['missing_stats'])}`",
                f"- Missing abilities: `{len(audit_summary['missing_abilities'])}`",
                f"- Missing legal moves: `{len(audit_summary['missing_moves'])}`",
                f"- Species in UI but not registry: `{len(audit_summary['species_in_ui_not_registry'])}`",
                f"- Registry entries not used by builder: `{len(audit_summary['registry_not_used_by_builder'])}`",
                f"- Mega stones without Mega forms: `{len(audit_summary['mega_stones_without_forms'])}`",
                f"- Forms without base species: `{len(audit_summary['forms_without_base_species'])}`",
                f"- Move references not in move database: `{len(audit_summary['move_references_not_in_move_database'])}`",
                "",
                "Detailed audit lists:",
                f"- `missing_stats`: `{audit_summary['missing_stats']}`",
                f"- `missing_abilities`: `{audit_summary['missing_abilities']}`",
                f"- `missing_moves`: `{audit_summary['missing_moves']}`",
                f"- `species_in_ui_not_registry`: `{audit_summary['species_in_ui_not_registry']}`",
                f"- `registry_not_used_by_builder`: `{audit_summary['registry_not_used_by_builder']}`",
                f"- `registry_not_used_reason`: `{audit_summary['registry_not_used_reason']}`",
                f"- `mega_stones_without_forms`: `{audit_summary['mega_stones_without_forms']}`",
                f"- `forms_without_base_species`: `{audit_summary['forms_without_base_species']}`",
                f"- `move_references_not_in_move_database`: `{audit_summary['move_references_not_in_move_database']}`",
                "",
            ]
        )

    lines.extend(
        [
            "## Review Workflow",
            "",
            "- Review the staged JSON files under `data/update_intake/staging/`.",
            "- Fill baseline data separately from Champions overrides.",
            "- Keep unknown values as `TBD` / `unverified` until source-backed verification exists.",
            "- Run `--mode apply` only after the verification checklist is complete.",
            "",
            "## Core Warning",
            "",
            "- `Cartridge legality is not automatically Champions legality.`",
            "",
        ]
    )
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def apply_verified_entries(args: argparse.Namespace) -> list[str]:
    registry = read_json(REGISTRY_PATH, {"updatedAt": None, "pokemon": {}, "items": {}, "moves": {}})
    applied_messages = []
    for entity_type, names in (("pokemon", args.pokemon), ("items", args.item), ("moves", args.move)):
        for name in names:
            path = staging_path(entity_type, name)
            payload = read_json(path, {})
            if not payload:
                raise SystemExit(f"Missing staged {SINGULAR_LABEL[entity_type]} intake file: {path}")
            missing = list_missing_required_fields(entity_type, payload)
            if missing and not args.force:
                raise SystemExit(
                    f"Refusing apply for {SINGULAR_LABEL[entity_type]} '{name}' because verification is incomplete: {', '.join(missing)}"
                )
            payload["appliedAt"] = utc_now()
            payload["appliedWithForce"] = bool(args.force and missing)
            payload["stagingPath"] = str(path.relative_to(ROOT))
            payload["verification_status"] = payload.get("verification_status", "verified")
            registry.setdefault(entity_type, {})
            registry[entity_type][name] = payload
            write_json(applied_path(entity_type, name), payload)
            applied_messages.append(f"Applied {SINGULAR_LABEL[entity_type]} intake registry entry for {name}")
    registry["updatedAt"] = utc_now()
    write_json(REGISTRY_PATH, registry)
    return applied_messages


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pokemon", action="append", default=[], help="Pokemon species to prepare for intake review.")
    parser.add_argument("--item", action="append", default=[], help="Item names to prepare for intake review.")
    parser.add_argument("--move", action="append", default=[], help="Move names to prepare for intake review.")
    parser.add_argument("--patch-notes", default="", help="Patch note path or URL to record as evidence.")
    parser.add_argument("--mode", choices=["review", "apply"], default="review")
    parser.add_argument("--force", action="store_true", help="Allow apply despite incomplete verification.")
    parser.add_argument("--audit", action="store_true", help="Run repository audit checks instead of staging only.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ensure_update_dirs()

    champions_database = load_champions_database()
    abilities = load_abilities()
    items = load_items()
    app_text = load_app_text()

    staged = {"pokemon": [], "items": [], "moves": []}
    audit_summary = None

    if args.audit:
        audit_summary = run_audit(champions_database, abilities, items, app_text)
        write_review_report(staged, audit_summary, args)
        print(f"audit complete; review report written to {REPORT_PATH}")
        return

    staged = create_or_refresh_staging_entries(args, champions_database, abilities, items)
    if args.mode == "apply":
        messages = apply_verified_entries(args)
        write_review_report(staged, audit_summary, args)
        for message in messages:
            print(message)
        print(f"apply complete; review report written to {REPORT_PATH}")
        return

    write_review_report(staged, audit_summary, args)
    print(f"review prepared; report written to {REPORT_PATH}")


if __name__ == "__main__":
    main()
