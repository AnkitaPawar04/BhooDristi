import ee
import os
from datetime import datetime
from .earth_engine import initialize_earth_engine as _initialize_earth_engine
from .geometry import polygon_centroid


EE_PROJECT = os.getenv("EE_PROJECT", "ee-redijmukta04")

SMAP_ASSET = "NASA/SMAP/SPL4SMGP/008"

# SMAP L4 provides soil moisture in volume fraction.
# Multiplying by 100 converts it to percentage.
SURFACE_MOISTURE_BAND = "sm_surface"
ROOTZONE_MOISTURE_BAND = "sm_rootzone"

# SMAP L4 has approximately 9 km spatial resolution.
SMAP_SCALE = 9000


def initialize_earth_engine():
    """Initialize Google Earth Engine for this application."""
    try:
        return _initialize_earth_engine()
    except Exception as e:
        raise RuntimeError(
            f"Failed to initialize Google Earth Engine: {str(e)}"
        ) from e


def get_soil_moisture(
    latitude: float,
    longitude: float,
    lookback_days: int = 10,
    geometry=None,
) -> dict:
    """
    Retrieve recent SMAP soil-moisture estimates for a location.

    Returns:
        - surface soil moisture: approximately 0-5 cm
        - root-zone soil moisture: approximately 0-100 cm

    Values are converted from volume fraction to percentage.
    """

    try:
        initialize_earth_engine()

        sample_geometry = (
            ee.Geometry(geometry) if isinstance(geometry, dict)
            else geometry or ee.Geometry.Point([longitude, latitude]).buffer(SMAP_SCALE / 2)
        )

        end_date = ee.Date(
            datetime.utcnow().strftime("%Y-%m-%d")
        )

        start_date = end_date.advance(
            -lookback_days,
            "day"
        )

        collection = (
            ee.ImageCollection(SMAP_ASSET)
            .filterDate(start_date, end_date)
            .select([
                SURFACE_MOISTURE_BAND,
                ROOTZONE_MOISTURE_BAND
            ])
        )

        image = collection.mean()
        reduction = image.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=sample_geometry,
            scale=SMAP_SCALE,
            bestEffort=True,
        )
        response = ee.Dictionary({
            "count": collection.size(),
            "reduction": reduction,
        }).getInfo()
        count = response.get("count", 0)

        if count == 0:
            return {
                "source": "NASA SMAP L4",
                "available": False,
                "message": "No recent SMAP observations available",
                "surface_moisture_percent": None,
                "rootzone_moisture_percent": None,
            }

        values = response.get("reduction") or {}

        surface = values.get(SURFACE_MOISTURE_BAND)
        rootzone = values.get(ROOTZONE_MOISTURE_BAND)

        if isinstance(geometry, dict) and (surface is None or rootzone is None):
            centroid = polygon_centroid(geometry)
            centroid_geometry = ee.Geometry.Point(
                [centroid["longitude"], centroid["latitude"]]
            )
            values = image.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=centroid_geometry,
                scale=SMAP_SCALE,
                bestEffort=True,
            ).getInfo()
            surface = values.get(SURFACE_MOISTURE_BAND)
            rootzone = values.get(ROOTZONE_MOISTURE_BAND)

        if surface is not None:
            surface = float(surface) * 100

        if rootzone is not None:
            rootzone = float(rootzone) * 100

        return {
            "latitude": latitude,
            "longitude": longitude,
            "source": "NASA SMAP L4",
            "available": True,
            "observations_used": count,
            "resolution_m": SMAP_SCALE,
            "surface_depth": "0-5cm",
            "rootzone_depth": "0-100cm",
            "surface_moisture_percent": surface,
            "rootzone_moisture_percent": rootzone,
        }

    except Exception as e:
        raise RuntimeError(
            f"Failed to retrieve SMAP soil moisture: {str(e)}"
        ) from e