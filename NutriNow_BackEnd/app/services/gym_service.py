import logging
import os
from math import asin, cos, radians, sin, sqrt

import requests

from app.services.runtime_cache import TTLCache

logger = logging.getLogger(__name__)

DEFAULT_RADIUS_KM = 10
MAX_RADIUS_KM = 50
MAX_ACADEMIAS = 60
RESULTS_CACHE_SECONDS = int(os.getenv("ACADEMIAS_CACHE_SECONDS", "600"))

OVERPASS_URLS = [
    os.getenv("OVERPASS_URL", "https://overpass-api.de/api/interpreter"),
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.osm.ch/api/interpreter",
]

_session = requests.Session()
_session.headers.update({"User-Agent": "NutriNow/2.0 (contato web)"})

_results_cache = TTLCache(ttl_seconds=RESULTS_CACHE_SECONDS, max_items=256)


def _rounded(value, decimals=6):
    return round(float(value), decimals)


def haversine_km(lat1, lng1, lat2, lng2):
    lat1, lng1, lat2, lng2 = map(radians, (lat1, lng1, lat2, lng2))
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    return 2 * asin(sqrt(a)) * 6371.0088


def _build_query(lat, lng, radius_m):
    center = f"(around:{radius_m},{_rounded(lat)},{_rounded(lng)})"
    return f"""
[out:json][timeout:25];
(
  node["leisure"="fitness_centre"]{center};
  way["leisure"="fitness_centre"]{center};
  relation["leisure"="fitness_centre"]{center};
);
out center body;
""".strip()


def _element_point(element):
    lat = element.get("lat")
    lon = element.get("lon")
    if lat is None or lon is None:
        center = element.get("center")
        if center:
            lat, lon = center.get("lat"), center.get("lon")
    if lat is None or lon is None:
        return None
    return (_rounded(lat), _rounded(lon))


def _element_address(tags):
    parts = []
    street = tags.get("addr:street") or tags.get("addr:place")
    housenumber = tags.get("addr:housenumber")
    district = tags.get("addr:neighbourhood") or tags.get("addr:district")
    city = tags.get("addr:city")
    state = tags.get("addr:state")

    if street:
        parts.append(f"{street} {housenumber}".strip() if housenumber else street)
    elif housenumber:
        parts.append(housenumber)
    if district:
        parts.append(district)
    if city:
        parts.append(city)
    if state and state != city:
        parts.append(state)
    return ", ".join(parts)


def _serialize_academia(element, point, origin):
    tags = element.get("tags") or {}
    element_id = element.get("id") or ""
    element_type = element.get("type") or ""
    origin_lat, origin_lng = origin
    return {
        "id": f"{element_type}-{element_id}",
        "nome": tags.get("name") or tags.get("operator") or "Academia",
        "endereco": _element_address(tags),
        "telefone": tags.get("phone") or tags.get("contact:phone") or "",
        "website": tags.get("website") or tags.get("contact:website") or None,
        "horarios": tags.get("opening_hours") or "",
        "lat": point[0],
        "lng": point[1],
        "distancia_km": round(haversine_km(origin_lat, origin_lng, point[0], point[1]), 2),
    }


def _fetch_overpass(query):
    errors = []
    for url in OVERPASS_URLS:
        try:
            response = _session.post(
                url,
                data={"data": query},
                headers={"Accept": "application/json"},
                timeout=30,
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as exc:
            logger.warning("Falha ao consultar Overpass em %s: %s", url, exc)
            errors.append(exc)
    raise RuntimeError("Nao foi possivel consultar academias proximas") from errors[-1]


def _search(lat, lng, radius_m):
    query = _build_query(lat, lng, radius_m)
    payload = _fetch_overpass(query)

    lat, lng = float(lat), float(lng)
    academias = []
    seen_ids = set()

    for element in payload.get("elements", []):
        point = _element_point(element)
        if not point:
            continue
        item = _serialize_academia(element, point, (lat, lng))
        if item["id"] in seen_ids:
            continue
        seen_ids.add(item["id"])
        academias.append(item)

    academias.sort(key=lambda item: item["distancia_km"])
    return academias[:MAX_ACADEMIAS]


def buscar_academias_proximas(lat, lng, radius_km=None):
    radius_km = max(1, min(MAX_RADIUS_KM, float(radius_km or DEFAULT_RADIUS_KM)))
    radius_m = int(radius_km * 1000)

    cache_key = ("academias_proximas", _rounded(lat), _rounded(lng), radius_m)
    cached = _results_cache.get(cache_key)
    if cached is not None:
        return cached

    result = _search(lat, lng, radius_m)
    _results_cache.set(cache_key, result)
    return result