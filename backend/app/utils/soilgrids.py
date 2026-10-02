import copy
import ee
import hashlib
import json
import logging
import os
import threading
import time
from collections import OrderedDict
from concurrent.futures import Future
from .earth_engine import initialize_earth_engine as _initialize_earth_engine

logger = logging.getLogger(__name__)

EE_PROJECT = os.getenv("EE_PROJECT", "ee-redijmukta04")


def initialize_earth_engine():
    """Initialize Google Earth Engine for this application."""
    try:
        return _initialize_earth_engine()
    except Exception as e:
        raise RuntimeError(
            f"Failed to initialize Google Earth Engine: {str(e)}"
        ) from e

# SoilGrids Earth Engine assets
SOILGRIDS_ASSETS = {
    "ph": {
        "asset": "projects/soilgrids-isric/phh2o_mean",
        "band_prefix": "phh2o",
    },
    "organic_carbon": {
        "asset": "projects/soilgrids-isric/soc_mean",
        "band_prefix": "soc",
    },
    "nitrogen": {
        "asset": "projects/soilgrids-isric/nitrogen_mean",
        "band_prefix": "nitrogen",
    },
    "clay": {
        "asset": "projects/soilgrids-isric/clay_mean",
        "band_prefix": "clay",
    },
    "sand": {
        "asset": "projects/soilgrids-isric/sand_mean",
        "band_prefix": "sand",
    },
    "silt": {
        "asset": "projects/soilgrids-isric/silt_mean",
        "band_prefix": "silt",
    },
}

# We initially use the surface 0–5 cm layer.
DEPTH = "0-5cm"

# SoilGrids scale factors
SCALE_FACTORS = {
    "ph": 10,
    "organic_carbon": 10,
    "nitrogen": 100,
    "clay": 10,
    "sand": 10,
    "silt": 10,
}


_SOILGRIDS_CACHE_TTL_SECONDS = 24 * 60 * 60
# 128 entries bound memory use while covering repeated locations in active sessions.
# This cache is process-local; separate backend workers maintain independent caches.
_SOILGRIDS_CACHE_MAX_ENTRIES = 128
_soilgrids_cache = OrderedDict()
_soilgrids_cache_lock = threading.Lock()
_soilgrids_inflight = {}


def _soilgrids_cache_key(latitude: float, longitude: float, geometry=None):
    if isinstance(geometry, dict):
        try:
            serialized_geometry = json.dumps(
                geometry,
                sort_keys=True,
                separators=(",", ":"),
                ensure_ascii=False,
                allow_nan=False,
            )
        except (TypeError, ValueError):
            # Preserve the existing provider path for geometry values that are
            # not safely representable as deterministic GeoJSON JSON.
            return None
        geometry_digest = hashlib.sha256(serialized_geometry.encode("utf-8")).hexdigest()
        return (
            "polygon",
            float(latitude).hex(),
            float(longitude).hex(),
            geometry_digest,
        )

    if geometry is None or not geometry:
        return (
            "point-buffer-2000m",
            float(latitude).hex(),
            float(longitude).hex(),
        )

    # Non-GeoJSON explicit geometries retain their existing uncached behavior.
    return None


def _remove_expired_soilgrids_entries(now: float) -> None:
    expired_keys = [
        key for key, (expires_at, _result) in _soilgrids_cache.items()
        if expires_at <= now
    ]
    for key in expired_keys:
        del _soilgrids_cache[key]


def _clear_soilgrids_cache() -> None:
    """Clear the process-local result cache (primarily for focused tests)."""
    with _soilgrids_cache_lock:
        _soilgrids_cache.clear()


def get_soilgrids_data(latitude: float, longitude: float, geometry=None) -> dict:
    """
    Fetch SoilGrids estimates for a given latitude/longitude.

    Returns surface-soil properties from the 0–5 cm depth.
    """

    cache_key = _soilgrids_cache_key(latitude, longitude, geometry)
    if cache_key is None:
        return _get_soilgrids_data_uncached(latitude, longitude, geometry)

    with _soilgrids_cache_lock:
        now = time.monotonic()
        entry = _soilgrids_cache.get(cache_key)
        if entry is not None:
            expires_at, cached_result = entry
            if expires_at > now:
                _soilgrids_cache.move_to_end(cache_key)
                logger.info("SoilGrids cache hit")
                return copy.deepcopy(cached_result)
            del _soilgrids_cache[cache_key]

        pending = _soilgrids_inflight.get(cache_key)
        if pending is None:
            pending = Future()
            _soilgrids_inflight[cache_key] = pending
            is_owner = True
            logger.info("SoilGrids cache miss")
        else:
            is_owner = False
            logger.info("SoilGrids single-flight wait")

    if not is_owner:
        return copy.deepcopy(pending.result())

    try:
        result = _get_soilgrids_data_uncached(latitude, longitude, geometry)
    except BaseException as error:
        with _soilgrids_cache_lock:
            _soilgrids_inflight.pop(cache_key, None)
            pending.set_exception(error)
        raise

    if result.get("status") == "available":
        cached_result = copy.deepcopy(result)
        with _soilgrids_cache_lock:
            now = time.monotonic()
            _remove_expired_soilgrids_entries(now)
            _soilgrids_cache[cache_key] = (
                now + _SOILGRIDS_CACHE_TTL_SECONDS,
                cached_result,
            )
            _soilgrids_cache.move_to_end(cache_key)
            while len(_soilgrids_cache) > _SOILGRIDS_CACHE_MAX_ENTRIES:
                _soilgrids_cache.popitem(last=False)
            _soilgrids_inflight.pop(cache_key, None)
            pending.set_result(copy.deepcopy(result))
        logger.info("SoilGrids cache store")
    else:
        with _soilgrids_cache_lock:
            _soilgrids_inflight.pop(cache_key, None)
            pending.set_result(copy.deepcopy(result))

    return result


def _get_soilgrids_data_uncached(latitude: float, longitude: float, geometry=None) -> dict:
    """Run the existing SoilGrids calculation without reading/writing cache."""

    try:
        initialize_earth_engine()
        sample_geometry = (
            ee.Geometry(geometry) if isinstance(geometry, dict)
            else geometry or ee.Geometry.Point([longitude, latitude]).buffer(2000)
        )

        result = {}

        for property_name, config in SOILGRIDS_ASSETS.items():
            image = ee.Image(config["asset"])

            band_name = f"{config['band_prefix']}_{DEPTH}_mean"

            value = (
                image
                .select(band_name)
                .reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=sample_geometry,
                    scale=250,
                    bestEffort=True,
                )
                .get(band_name)
                .getInfo()
            )

            if value is not None:
                value = float(value) / SCALE_FACTORS[property_name]

            result[property_name] = value

        return {
            "latitude": latitude,
            "longitude": longitude,
            "depth": DEPTH,
            "source": "ISRIC SoilGrids",
            "resolution_m": 250,
            "soil": result,
            "status": "available" if any(value is not None for value in result.values()) else "unavailable",
        }

    except Exception as e:
        raise RuntimeError(
            f"Failed to retrieve SoilGrids data: {str(e)}"
        ) from e