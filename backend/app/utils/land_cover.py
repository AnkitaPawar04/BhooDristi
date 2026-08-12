"""
Land-cover validation utilities.

The crop recommendation flow uses this module to validate that the
requested coordinates fall on agricultural land before allowing the
existing crop model to run.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Dict, Mapping, Optional, Protocol

import requests

logger = logging.getLogger(__name__)


ESA_WORLD_COVER_CLASSES: Dict[int, str] = {
    10: "Trees",
    20: "Shrubland",
    30: "Grassland",
    40: "Cropland",
    50: "Built-up",
    60: "Bare / Sparse vegetation",
    70: "Snow / Ice",
    80: "Permanent Water",
    90: "Herbaceous Wetland",
    95: "Mangroves",
    100: "Moss and Lichen",
}


_NORMALIZED_LABEL_TO_ID = {
    label.lower()
    .replace("/", " ")
    .replace("-", " ")
    .replace("  ", " ")
    .strip(): class_id
    for class_id, label in ESA_WORLD_COVER_CLASSES.items()
}


class LandCoverProviderError(RuntimeError):
    """Raised when the configured land-cover provider cannot complete a lookup."""


class LandCoverProvider(Protocol):
    def check(self, latitude: float, longitude: float) -> Dict[str, Any]:
        ...


def _normalize_label(label: str) -> str:
    return " ".join(
        label.lower()
        .replace("/", " ")
        .replace("-", " ")
        .split()
    )


def _class_id_from_value(
    class_id: Optional[Any],
    land_cover_class: Optional[Any],
) -> int:
    """
    Resolve a canonical ESA WorldCover class ID from either a numeric
    class ID or a supported class label.
    """

    if class_id is not None:
        try:
            return int(class_id)
        except (TypeError, ValueError) as exc:
            raise LandCoverProviderError(
                f"Invalid land-cover class_id value: {class_id!r}"
            ) from exc

    if land_cover_class is not None:
        normalized = _normalize_label(str(land_cover_class))

        if normalized in _NORMALIZED_LABEL_TO_ID:
            return _NORMALIZED_LABEL_TO_ID[normalized]

    raise LandCoverProviderError(
        "Land-cover provider did not return a valid class_id or class label."
    )


def _class_label_from_id(
    class_id: int,
    land_cover_class: Optional[str] = None,
) -> str:
    """
    Convert a WorldCover class ID into its canonical label.
    """

    if class_id in ESA_WORLD_COVER_CLASSES:
        return ESA_WORLD_COVER_CLASSES[class_id]

    if land_cover_class:
        return str(land_cover_class)

    return "Unknown"


def _extract_payload(data: Any) -> Mapping[str, Any]:
    """
    Validate that the provider response is a mapping.
    """

    if isinstance(data, Mapping):
        return data

    raise LandCoverProviderError(
        "Land-cover provider returned an unexpected payload format."
    )


@dataclass
class HttpLandCoverProvider:
    """
    Generic HTTP provider for a remote land-cover classification service.
    """

    api_url: str
    api_key: str = ""
    timeout_seconds: float = 10.0

    def check(
        self,
        latitude: float,
        longitude: float,
    ) -> Dict[str, Any]:

        headers = {
            "Accept": "application/json"
        }

        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            response = requests.get(
                self.api_url,
                params={
                    "latitude": latitude,
                    "longitude": longitude,
                },
                headers=headers,
                timeout=self.timeout_seconds,
            )

            response.raise_for_status()
            payload = response.json()

        except requests.RequestException as exc:
            raise LandCoverProviderError(
                "Remote land-cover provider request failed."
            ) from exc

        except ValueError as exc:
            raise LandCoverProviderError(
                "Remote land-cover provider returned invalid JSON."
            ) from exc

        payload_map = _extract_payload(payload)

        nested = (
            payload_map.get("data")
            if isinstance(payload_map.get("data"), Mapping)
            else payload_map
        )

        class_id = _class_id_from_value(
            nested.get("class_id")
            or nested.get("classId")
            or payload_map.get("class_id")
            or payload_map.get("classId"),

            nested.get("land_cover_class")
            or nested.get("landCoverClass")
            or payload_map.get("land_cover_class")
            or payload_map.get("landCoverClass"),
        )

        land_cover_class = _class_label_from_id(
            class_id,
            str(
                nested.get("land_cover_class")
                or nested.get("landCoverClass")
                or payload_map.get("land_cover_class")
                or payload_map.get("landCoverClass")
                or ""
            ).strip()
            or None,
        )

        return {
            "allowed": class_id == 40,
            "land_cover_class": land_cover_class,
            "class_id": class_id,
        }


@dataclass
class EarthEngineProvider:
    """
    Google Earth Engine provider backed by ESA WorldCover v200.
    """

    dataset_id: str = "ESA/WorldCover/v200"
    band_name: str = "Map"
    scale_meters: int = 10

    def check(
        self,
        latitude: float,
        longitude: float,
    ) -> Dict[str, Any]:

        ee = _get_earth_engine_client()

        worldcover_image = _get_worldcover_image(
            ee,
            self.dataset_id,
            self.band_name,
        )

        point = ee.Geometry.Point(
            [longitude, latitude]
        )

        try:
            region = worldcover_image.reduceRegion(
                reducer=ee.Reducer.first(),
                geometry=point,
                scale=self.scale_meters,
                bestEffort=True,
                maxPixels=1,
            ).getInfo()

        except Exception as exc:
            raise LandCoverProviderError(
                "Earth Engine land-cover query failed."
            ) from exc

        if not region:
            raise LandCoverProviderError(
                "Earth Engine returned no land-cover pixel "
                "for the requested coordinates."
            )

        pixel_value = region.get(self.band_name)

        if pixel_value is None:
            raise LandCoverProviderError(
                "Earth Engine returned no land-cover pixel "
                "for the requested coordinates."
            )

        class_id = _class_id_from_value(
            pixel_value,
            None,
        )

        land_cover_class = _class_label_from_id(
            class_id
        )

        return {
            "allowed": class_id == 40,
            "land_cover_class": land_cover_class,
            "class_id": class_id,
        }


@lru_cache(maxsize=1)
def _get_earth_engine_client():
    """
    Initialize and return the Earth Engine client.

    Authentication is expected to have been performed in the backend
    environment using:

        earthengine authenticate
    """

    try:
        import ee

    except ImportError as exc:
        raise LandCoverProviderError(
            "earthengine-api is not installed. "
            "Add it to requirements and install dependencies."
        ) from exc

    project_id = os.getenv(
        "EE_PROJECT",
        "",
    ).strip()

    try:
        # Initialize using local OAuth credentials created by running
        # `earthengine authenticate` in the backend environment.
        #
        # Do not attempt to authenticate programmatically here.

        if project_id:
            ee.Initialize(
                project=project_id
            )
        else:
            ee.Initialize()

    except Exception as exc:

        msg = str(exc).lower()

        auth_err_msg = (
            "Earth Engine is not authenticated. "
            "Run 'earthengine authenticate' in the backend "
            "virtual environment."
        )

        if (
            "authenticate" in msg
            or "authentication" in msg
            or "not authenticated" in msg
            or "no credentials" in msg
        ):
            raise LandCoverProviderError(
                auth_err_msg
            ) from exc

        raise LandCoverProviderError(
            f"Earth Engine authentication failed: {exc}"
        ) from exc

    return ee


@lru_cache(maxsize=1)
def _get_worldcover_image(
    ee_client,
    dataset_id: str,
    band_name: str,
):
    """
    Load the ESA WorldCover image collection and select
    the configured land-cover band.
    """

    try:
        return (
            ee_client
            .ImageCollection(dataset_id)
            .first()
            .select(band_name)
        )

    except Exception as exc:
        raise LandCoverProviderError(
            f"Unable to load ESA WorldCover dataset "
            f"'{dataset_id}' from Earth Engine."
        ) from exc


def _build_provider() -> LandCoverProvider:
    """
    Build the configured land-cover provider.
    """

    provider_name = os.getenv(
        "LAND_COVER_PROVIDER",
        "earth_engine",
    ).strip().lower()

    api_url = os.getenv(
        "LAND_COVER_API_URL",
        "",
    ).strip()

    api_key = os.getenv(
        "LAND_COVER_API_KEY",
        "",
    ).strip()

    if provider_name in {
        "earth_engine",
        "gee",
        "google_earth_engine",
        "auto",
    }:
        return EarthEngineProvider()

    if provider_name in {
        "http",
        "external_api",
        "external-api",
        "api",
    }:

        if not api_url:
            raise LandCoverProviderError(
                "LAND_COVER_API_URL is not configured "
                "for the active land-cover provider."
            )

        return HttpLandCoverProvider(
            api_url=api_url,
            api_key=api_key,
        )

    raise LandCoverProviderError(
        f"Unsupported land-cover provider "
        f"'{provider_name}'. "
        "Configure LAND_COVER_PROVIDER to 'http'."
    )


@lru_cache(maxsize=1)
def _get_provider() -> LandCoverProvider:
    """
    Return the configured land-cover provider.
    """

    return _build_provider()


def check_land_cover(
    latitude: float,
    longitude: float,
) -> Dict[str, Any]:
    """
    Validate the land-cover class at the requested coordinates.

    Returns a dictionary containing the canonical ESA WorldCover
    class and whether crop recommendation should proceed.
    """

    provider = _get_provider()

    result = provider.check(
        latitude,
        longitude,
    )

    class_id = int(
        result["class_id"]
    )

    land_cover_class = str(
        result["land_cover_class"]
    )

    # Only ESA WorldCover class 40 (Cropland)
    # is accepted for crop recommendation.
    allowed = class_id == 40

    logger.info(
        "Land cover validation: "
        "latitude=%s longitude=%s class=%s "
        "class_id=%s allowed=%s",
        latitude,
        longitude,
        land_cover_class,
        class_id,
        "allowed" if allowed else "rejected",
    )

    return {
        "allowed": allowed,
        "land_cover_class": land_cover_class,
        "class_id": class_id,
    }