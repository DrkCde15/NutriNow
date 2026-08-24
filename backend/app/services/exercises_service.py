import json
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

_EXERCISES = None
_EXERCISES_BY_BODY_PART = {}
_EXERCISES_BY_EQUIPMENT = {}
_EXERCISES_BY_CATEGORY = {}
_EXERCISES_BY_TARGET = {}
_EXERCISES_BY_MUSCLE_GROUP = {}
_EXERCISES_BY_ID = {}
_ALL_EQUIPMENT = set()
_ALL_BODY_PARTS = set()
_ALL_CATEGORIES = set()
_ALL_TARGETS = set()
_ALL_MUSCLE_GROUPS = set()


def _dataset_base_dir():
    configured = os.environ.get("EXERCISES_DATASET_DIR", "").strip()
    if configured:
        return os.path.abspath(configured)
    base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    return os.path.join(base, "exercises-dataset")


def get_dataset_dir():
    return _dataset_base_dir()


def _dataset_path():
    return os.path.join(_dataset_base_dir(), "data", "exercises.json")

def _media_dir():
    return _dataset_base_dir()


def _build_index(exercises):
    for ex in exercises:
        ex_id = ex["id"]
        _EXERCISES_BY_ID[ex_id] = ex

        for key, store, target_set in [
            ("body_part", _EXERCISES_BY_BODY_PART, _ALL_BODY_PARTS),
            ("equipment", _EXERCISES_BY_EQUIPMENT, _ALL_EQUIPMENT),
            ("category", _EXERCISES_BY_CATEGORY, _ALL_CATEGORIES),
            ("target", _EXERCISES_BY_TARGET, _ALL_TARGETS),
            ("muscle_group", _EXERCISES_BY_MUSCLE_GROUP, _ALL_MUSCLE_GROUPS),
        ]:
            val = ex.get(key)
            if val:
                val_lower = val.lower()
                store.setdefault(val_lower, []).append(ex)
                target_set.add(val_lower)


def ensure_loaded():
    global _EXERCISES
    if _EXERCISES is not None:
        return True
    path = _dataset_path()
    if not os.path.isfile(path):
        logger.error(f"exercises.json nao encontrado em: {path}")
        return False
    try:
        with open(path, "r", encoding="utf-8") as f:
            _EXERCISES = json.load(f)
        _build_index(_EXERCISES)
        logger.info(
            f"Exercises dataset carregado: {len(_EXERCISES)} exercicios, "
            f"{len(_ALL_BODY_PARTS)} grupos musculares, "
            f"{len(_ALL_EQUIPMENT)} equipamentos"
        )
        return True
    except Exception as e:
        logger.error(f"Erro ao carregar exercises.json: {e}")
        _EXERCISES = []
        return False


def get_all():
    ensure_loaded()
    return _EXERCISES


def get_by_id(exercise_id: str):
    ensure_loaded()
    return _EXERCISES_BY_ID.get(exercise_id)


def search(
    body_part=None,
    equipment=None,
    category=None,
    target=None,
    muscle_group=None,
    query=None,
    limit=None,
):
    ensure_loaded()
    candidates = list(_EXERCISES)

    if body_part:
        key = body_part.lower()
        candidates = [ex for ex in candidates if ex.get("body_part", "").lower() == key]
    if equipment:
        key = equipment.lower()
        candidates = [ex for ex in candidates if ex.get("equipment", "").lower() == key]
    if category:
        key = category.lower()
        candidates = [ex for ex in candidates if ex.get("category", "").lower() == key]
    if target:
        key = target.lower()
        candidates = [ex for ex in candidates if ex.get("target", "").lower() == key]
    if muscle_group:
        key = muscle_group.lower()
        candidates = [ex for ex in candidates if ex.get("muscle_group", "").lower() == key]

    if query:
        q = query.lower()
        candidates = [ex for ex in candidates if q in ex["name"].lower()]

    candidates.sort(key=lambda x: x["name"])
    if limit:
        candidates = candidates[: int(limit)]
    return candidates


def get_filters():
    ensure_loaded()
    return {
        "body_parts": sorted(_ALL_BODY_PARTS),
        "equipment": sorted(_ALL_EQUIPMENT),
        "categories": sorted(_ALL_CATEGORIES),
        "targets": sorted(_ALL_TARGETS),
        "muscle_groups": sorted(_ALL_MUSCLE_GROUPS),
    }


def get_exercise_context(max_exercises=200):
    ensure_loaded()
    exercises = _EXERCISES[:max_exercises]
    lines = []
    for ex in exercises:
        name = ex.get("name", "")
        body_part = ex.get("body_part", "")
        equipment = ex.get("equipment", "")
        target = ex.get("target", "")
        muscle_group = ex.get("muscle_group", "")
        steps = ex.get("instruction_steps", {}).get("en", [])
        instructions = " | ".join(steps[:3])
        lines.append(
            f"- {name} | grupo: {body_part} | foco: {target} | musculo: {muscle_group} | "
            f"equipamento: {equipment} | instrucoes: {instructions}"
        )
    if not lines:
        return ""
    return "\n\n[CATALOGO DE EXERCICIOS]:\n" + "\n".join(lines)
