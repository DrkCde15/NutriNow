import os
import time
import logging
import requests
from flask import Blueprint, request, redirect

logger = logging.getLogger(__name__)

images_bp = Blueprint("images", __name__)

PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search"
_CACHE = {}
_CACHE_TTL = 60 * 60  # 1 hora


def _cached_redirect(cache_key, url):
    _CACHE[cache_key] = (time.time(), url)
    return redirect(url, 302)


def _fallback(q, w, h):
    return f"https://picsum.photos/seed/{requests.utils.quote(q, safe='')}/{w}/{h}"


@images_bp.route("/pexels-image", methods=["GET"])
def pexels_image():
    q = request.args.get("q", "food")
    w = request.args.get("w", 800, type=int) or 800
    h = request.args.get("h", 600, type=int) or 600
    orientation = request.args.get("orientation", "landscape")
    cache_key = (q, w, h, orientation)

    cached = _CACHE.get(cache_key)
    if cached and (time.time() - cached[0]) < _CACHE_TTL:
        return redirect(cached[1], 302)

    api_key = os.getenv("PEXELS_API_KEY")
    if not api_key:
        logger.warning("PEXELS_API_KEY nao configurada; usando fallback")
        return _cached_redirect(cache_key, _fallback(q, w, h))

    try:
        resp = requests.get(
            PEXELS_SEARCH_URL,
            headers={"Authorization": api_key},
            params={"query": q, "per_page": 1, "orientation": orientation},
            timeout=8,
        )
        resp.raise_for_status()
        photos = resp.json().get("photos") or []
        if not photos:
            raise ValueError("nenhuma foto retornada pelo Pexels")
        photo = photos[0]
        url = (
            photo.get("src", {}).get("large2x")
            or photo.get("src", {}).get("large")
            or photo.get("src", {}).get("original")
        )
        if not url:
            raise ValueError("url da foto ausente")
        return _cached_redirect(cache_key, url)
    except Exception as exc:
        logger.warning("Falha ao buscar imagem no Pexels (%s); usando fallback", exc)
        return _cached_redirect(cache_key, _fallback(q, w, h))
