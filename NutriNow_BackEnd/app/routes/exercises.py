import logging
from flask import Blueprint, jsonify, request, send_from_directory
from app.services.exercises_service import (
    get_dataset_dir,
    ensure_loaded,
    get_all,
    get_by_id,
    get_filters,
    search,
)

logger = logging.getLogger(__name__)
exercises_bp = Blueprint("exercises", __name__, url_prefix="/exercises")

_EXERCISES_DATASET_DIR = None
_MEDIA_PREFIX = "/exercises/media/"


def _media_base_dir():
    global _EXERCISES_DATASET_DIR
    if _EXERCISES_DATASET_DIR is None:
        _EXERCISES_DATASET_DIR = get_dataset_dir()
    return _EXERCISES_DATASET_DIR


def _rewrite_media_urls(ex):
    if isinstance(ex, dict):
        ex = dict(ex)
        if ex.get("image"):
            ex["image"] = _MEDIA_PREFIX + ex["image"]
        if ex.get("gif_url"):
            ex["gif_url"] = _MEDIA_PREFIX + ex["gif_url"]
    return ex


@exercises_bp.route("/media/<path:filename>", methods=["GET"])
def serve_media(filename):
    return send_from_directory(_media_base_dir(), filename)


@exercises_bp.route("", methods=["GET"])
def list_exercises():
    body_part = request.args.get("body_part")
    equipment = request.args.get("equipment")
    category = request.args.get("category")
    target = request.args.get("target")
    muscle_group = request.args.get("muscle_group")
    query = request.args.get("q")
    limit = request.args.get("limit")

    results = search(
        body_part=body_part,
        equipment=equipment,
        category=category,
        target=target,
        muscle_group=muscle_group,
        query=query,
        limit=limit,
    )
    return jsonify({"success": True, "count": len(results), "exercises": [_rewrite_media_urls(ex) for ex in results]})


@exercises_bp.route("/filters", methods=["GET"])
def list_filters():
    return jsonify({"success": True, "filters": get_filters()})


@exercises_bp.route("/<exercise_id>", methods=["GET"])
def get_exercise(exercise_id):
    ex = get_by_id(exercise_id)
    if not ex:
        return jsonify({"error": "Exercicio nao encontrado"}), 404
    return jsonify({"success": True, "exercise": _rewrite_media_urls(ex)})


@exercises_bp.route("/all", methods=["GET"])
def all_exercises():
    return jsonify({"success": True, "count": len(get_all()), "exercises": [_rewrite_media_urls(ex) for ex in get_all()]})
