from concurrent.futures import ThreadPoolExecutor

from .soilgrids import get_soilgrids_data
from .soil_moisture import get_soil_moisture
from ..routes.weather import (
    get_open_meteo_weather,
    get_open_meteo_forecast,
)
from .geometry import polygon_centroid


def get_location_data(latitude: float, longitude: float, polygon=None) -> dict:
    """
    Collect location-specific soil and weather information.

    Soil data:
        - ISRIC SoilGrids
        - 0–5 cm depth
        - 250 m resolution
        - 2 km area-based sampling

    Weather data:
        - Open-Meteo
        - Current weather
        - 5-day forecast
    """

    weather_latitude, weather_longitude = latitude, longitude
    if polygon:
        centroid = polygon_centroid(polygon)
        weather_latitude, weather_longitude = centroid["latitude"], centroid["longitude"]

    sources = {}
    try:
        soil_data = get_soilgrids_data(latitude, longitude, geometry=polygon)
        sources["soil"] = {"status": "available", "source": "ISRIC SoilGrids"}
    except Exception as error:
        soil_data = {"soil": {}, "status": "unavailable", "error": str(error)}
        sources["soil"] = {"status": "unavailable", "source": "ISRIC SoilGrids", "error": str(error)}

    try:
        soil_moisture = get_soil_moisture(latitude, longitude, geometry=polygon)
        sources["soil_moisture"] = {"status": "available" if soil_moisture.get("available") else "unavailable", "source": "NASA SMAP L4"}
    except Exception as error:
        soil_moisture = {"available": False, "surface_moisture_percent": None, "error": str(error)}
        sources["soil_moisture"] = {"status": "unavailable", "source": "NASA SMAP L4", "error": str(error)}

    current_weather = None
    forecast = []
    weather_errors = []
    current_weather_succeeded = False
    forecast_succeeded = False
    with ThreadPoolExecutor(max_workers=2, thread_name_prefix="open-meteo") as executor:
        current_future = executor.submit(
            get_open_meteo_weather,
            weather_latitude,
            weather_longitude,
        )
        forecast_future = executor.submit(
            get_open_meteo_forecast,
            weather_latitude,
            weather_longitude,
        )

        try:
            current_weather = current_future.result()
            current_weather_succeeded = True
        except Exception as error:
            weather_errors.append(f"Current weather: {error}")

        try:
            forecast = forecast_future.result()
            forecast_succeeded = True
        except Exception as error:
            weather_errors.append(f"Forecast: {error}")

    if not weather_errors:
        sources["weather"] = {"status": "available", "source": "Open-Meteo"}
    elif current_weather_succeeded or forecast_succeeded:
        sources["weather"] = {
            "status": "partial",
            "source": "Open-Meteo",
            "error": "; ".join(weather_errors),
        }
    else:
        sources["weather"] = {
            "status": "unavailable",
            "source": "Open-Meteo",
            "error": "; ".join(weather_errors),
        }

    current_weather_data = (
        {
            **current_weather,
            "rainfall": current_weather.get("rainfall_recent", current_weather.get("rainfall")),
        }
        if current_weather is not None
        else {}
    )

    return {
        "latitude": latitude,
        "longitude": longitude,
        "soil": soil_data,
        "soil_moisture": soil_moisture,
        "weather": {
            "current": current_weather_data,
            "forecast": forecast,
        },
        "sources": sources,
        "weather_coordinates": {"latitude": weather_latitude, "longitude": weather_longitude},
    }