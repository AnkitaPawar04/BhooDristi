from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import os
from dotenv import load_dotenv
import random
from datetime import datetime, timedelta

load_dotenv()

router = APIRouter(prefix="/weather", tags=["weather"])


# =========================================================
# HTTP SESSION WITH RETRY
# =========================================================

def get_session():
    session = requests.Session()

    retry_strategy = Retry(
        total=2,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"]
    )

    adapter = HTTPAdapter(
        max_retries=retry_strategy,
        pool_connections=10,
        pool_maxsize=20
    )

    session.mount("http://", adapter)
    session.mount("https://", adapter)

    return session


# =========================================================
# RESPONSE MODELS
# =========================================================

class WeatherResponse(BaseModel):
    temperature: float
    humidity: float
    rainfall: float
    description: str


class ForecastDay(BaseModel):
    date: str
    day: str
    temp_max: float
    temp_min: float
    humidity: float
    rainfall: float
    description: str


class ForecastResponse(BaseModel):
    forecast: List[ForecastDay]


# =========================================================
# OPEN-METEO WEATHER CODE
# =========================================================

def weather_code_to_description(code: int) -> str:

    weather_codes = {
        0: "Clear Sky",
        1: "Mainly Clear",
        2: "Partly Cloudy",
        3: "Overcast",

        45: "Fog",
        48: "Depositing Rime Fog",

        51: "Light Drizzle",
        53: "Moderate Drizzle",
        55: "Dense Drizzle",

        56: "Light Freezing Drizzle",
        57: "Dense Freezing Drizzle",

        61: "Slight Rain",
        63: "Moderate Rain",
        65: "Heavy Rain",

        66: "Light Freezing Rain",
        67: "Heavy Freezing Rain",

        71: "Slight Snow",
        73: "Moderate Snow",
        75: "Heavy Snow",

        77: "Snow Grains",

        80: "Slight Rain Showers",
        81: "Moderate Rain Showers",
        82: "Violent Rain Showers",

        85: "Slight Snow Showers",
        86: "Heavy Snow Showers",

        95: "Thunderstorm",

        96: "Thunderstorm with Slight Hail",
        99: "Thunderstorm with Heavy Hail"
    }

    return weather_codes.get(
        code,
        "Unknown"
    )


# =========================================================
# OPEN-METEO CURRENT WEATHER
# =========================================================

def get_open_meteo_weather(
    latitude: float,
    longitude: float
):

    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={latitude}"
        f"&longitude={longitude}"
        "&current="
        "temperature_2m,"
        "relative_humidity_2m,"
        "precipitation,"
        "rain,"
        "weather_code"
        "&timezone=auto"
    )

    session = get_session()

    response = session.get(
        url,
        timeout=10
    )

    response.raise_for_status()

    data = response.json()

    current = data["current"]

    return {
        "temperature": current["temperature_2m"],
        "humidity": current["relative_humidity_2m"],
        "rainfall": current["rain"],
        "weather_code": current["weather_code"]
    }


# =========================================================
# OPEN-METEO FORECAST
# =========================================================

def get_open_meteo_forecast(
    latitude: float,
    longitude: float
):

    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={latitude}"
        f"&longitude={longitude}"
        "&daily="
        "temperature_2m_max,"
        "temperature_2m_min,"
        "relative_humidity_2m_mean,"
        "precipitation_sum,"
        "weather_code"
        "&forecast_days=5"
        "&timezone=auto"
    )

    session = get_session()

    response = session.get(
        url,
        timeout=10
    )

    response.raise_for_status()

    data = response.json()

    daily = data["daily"]

    forecast_days = []

    for i in range(len(daily["time"])):

        date_string = daily["time"][i]

        date_object = datetime.strptime(
            date_string,
            "%Y-%m-%d"
        )

        weather_code = daily["weather_code"][i]

        forecast_days.append({

            "date": date_string,

            "day": date_object.strftime("%A"),

            "temp_max": round(
                daily["temperature_2m_max"][i],
                1
            ),

            "temp_min": round(
                daily["temperature_2m_min"][i],
                1
            ),

            "humidity": round(
                daily["relative_humidity_2m_mean"][i],
                1
            ),

            "rainfall": round(
                daily["precipitation_sum"][i],
                1
            ),

            "description": weather_code_to_description(
                weather_code
            )
        })

    return forecast_days


# =========================================================
# CURRENT WEATHER
# =========================================================

@router.get(
    "/current/{latitude}/{longitude}",
    response_model=WeatherResponse
)
async def get_current_weather(
    latitude: float,
    longitude: float
):

    # -----------------------------------------------------
    # 1. TRY OPENWEATHERMAP
    # -----------------------------------------------------

    api_key = os.getenv(
        "OPENWEATHERMAP_API_KEY"
    )

    if api_key:

        try:

            print("----------------------------------------")
            print("Trying OpenWeatherMap...")
            print(
                "Latitude:",
                latitude,
                "Longitude:",
                longitude
            )

            url = (
                "https://api.openweathermap.org/data/2.5/weather"
                f"?lat={latitude}"
                f"&lon={longitude}"
                f"&appid={api_key}"
                "&units=metric"
            )

            session = get_session()

            response = session.get(
                url,
                timeout=15
            )

            if response.status_code == 200:

                data = response.json()

                weather_result = {

                    "temperature": round(
                        data["main"]["temp"],
                        1
                    ),

                    "humidity": data["main"]["humidity"],

                    "rainfall": data.get(
                        "rain",
                        {}
                    ).get(
                        "1h",
                        0
                    ),

                    "description": data["weather"][0]["main"]
                }

                print(
                    "OpenWeatherMap SUCCESS:",
                    weather_result
                )

                return weather_result

            else:

                print(
                    "OpenWeatherMap failed:",
                    response.status_code
                )

        except requests.exceptions.Timeout:

            print(
                "OpenWeatherMap timeout"
            )

        except requests.exceptions.ConnectionError as e:

            print(
                "OpenWeatherMap connection error:",
                e
            )

        except Exception as e:

            print(
                "OpenWeatherMap error:",
                e
            )

    else:

        print(
            "OPENWEATHERMAP_API_KEY not configured"
        )


    # -----------------------------------------------------
    # 2. TRY OPEN-METEO BACKUP
    # -----------------------------------------------------

    try:

        print("----------------------------------------")
        print("Trying Open-Meteo backup...")

        open_meteo_data = get_open_meteo_weather(
            latitude,
            longitude
        )

        weather_result = {

            "temperature": round(
                open_meteo_data["temperature"],
                1
            ),

            "humidity": open_meteo_data["humidity"],

            "rainfall": open_meteo_data["rainfall"],

            "description": weather_code_to_description(
                open_meteo_data["weather_code"]
            )
        }

        print(
            "Open-Meteo SUCCESS:",
            weather_result
        )

        return weather_result

    except Exception as e:

        print(
            "Open-Meteo failed:",
            e
        )


    # -----------------------------------------------------
    # 3. FINAL MOCK FALLBACK
    # -----------------------------------------------------

    print("----------------------------------------")
    print(
        "Both weather APIs failed."
    )
    print(
        "Using mock weather data."
    )

    random.seed(
        int(
            (latitude + longitude) * 1000
        )
    )

    base_temp = (
        20 +
        (latitude / 30) * 10
    )

    temperature = (
        base_temp +
        random.uniform(-3, 3)
    )

    humidity = (
        50 +
        random.randint(-15, 25)
    )

    rainfall = random.choice(
        [
            0,
            0,
            0,
            2,
            5,
            10,
            15
        ]
    )

    weather_conditions = [
        "Clear",
        "Partly Cloudy",
        "Cloudy",
        "Light Rain",
        "Moderate Rain",
        "Overcast",
        "Sunny",
        "Haze"
    ]

    description = random.choice(
        weather_conditions
    )

    return {

        "temperature": round(
            temperature,
            1
        ),

        "humidity": min(
            100,
            max(
                30,
                humidity
            )
        ),

        "rainfall": rainfall,

        "description": description
    }


# =========================================================
# 5-DAY FORECAST
# =========================================================

@router.get(
    "/forecast/{latitude}/{longitude}",
    response_model=ForecastResponse
)
async def get_forecast(
    latitude: float,
    longitude: float
):

    # -----------------------------------------------------
    # 1. TRY OPENWEATHERMAP
    # -----------------------------------------------------

    api_key = os.getenv(
        "OPENWEATHERMAP_API_KEY"
    )

    if api_key:

        try:

            print("----------------------------------------")
            print("Trying OpenWeatherMap forecast...")

            url = (
                "https://api.openweathermap.org/data/2.5/forecast"
                f"?lat={latitude}"
                f"&lon={longitude}"
                f"&appid={api_key}"
                "&units=metric"
            )

            session = get_session()

            response = session.get(
                url,
                timeout=15
            )

            if response.status_code == 200:

                data = response.json()

                forecast_list = data["list"]

                daily_forecasts = {}

                for item in forecast_list:

                    dt = datetime.fromtimestamp(
                        item["dt"]
                    )

                    date_str = dt.strftime(
                        "%Y-%m-%d"
                    )

                    if (
                        dt.hour == 12
                        or date_str not in daily_forecasts
                    ):

                        if (
                            date_str not in daily_forecasts
                            or dt.hour == 12
                        ):

                            daily_forecasts[
                                date_str
                            ] = {

                                "date": date_str,

                                "day": dt.strftime(
                                    "%A"
                                ),

                                "temp_max": item[
                                    "main"
                                ]["temp_max"],

                                "temp_min": item[
                                    "main"
                                ]["temp_min"],

                                "humidity": item[
                                    "main"
                                ]["humidity"],

                                "rainfall": item.get(
                                    "rain",
                                    {}
                                ).get(
                                    "3h",
                                    0
                                ),

                                "description": item[
                                    "weather"
                                ][0]["main"]
                            }

                forecast_days = sorted(
                    daily_forecasts.items()
                )[:5]

                result = {
                    "forecast": [
                        day[1]
                        for day in forecast_days
                    ]
                }

                print(
                    "OpenWeatherMap forecast SUCCESS"
                )

                return result

            else:

                print(
                    "OpenWeatherMap forecast failed:",
                    response.status_code
                )

        except requests.exceptions.Timeout:

            print(
                "OpenWeatherMap forecast timeout"
            )

        except Exception as e:

            print(
                "OpenWeatherMap forecast error:",
                e
            )

    else:

        print(
            "OPENWEATHERMAP_API_KEY not configured"
        )


    # -----------------------------------------------------
    # 2. TRY OPEN-METEO FORECAST BACKUP
    # -----------------------------------------------------

    try:

        print("----------------------------------------")
        print("Trying Open-Meteo forecast backup...")

        forecast = get_open_meteo_forecast(
            latitude,
            longitude
        )

        print(
            "Open-Meteo forecast SUCCESS"
        )

        return {
            "forecast": forecast
        }

    except Exception as e:

        print(
            "Open-Meteo forecast failed:",
            e
        )


    # -----------------------------------------------------
    # 3. FINAL MOCK FORECAST
    # -----------------------------------------------------

    print("----------------------------------------")
    print(
        "Both forecast APIs failed."
    )

    print(
        "Using mock forecast data."
    )

    random.seed(
        int(
            (latitude + longitude) * 1000
        )
    )

    forecast_days = []

    base_temp = (
        20 +
        (latitude / 30) * 10
    )

    for i in range(5):

        date = (
            datetime.now()
            + timedelta(days=i + 1)
        )

        forecast_days.append({

            "date": date.strftime(
                "%Y-%m-%d"
            ),

            "day": date.strftime(
                "%A"
            ),

            "temp_max": round(
                base_temp +
                random.uniform(2, 8),
                1
            ),

            "temp_min": round(
                base_temp +
                random.uniform(-3, 2),
                1
            ),

            "humidity": min(
                100,
                max(
                    30,
                    50 +
                    random.randint(
                        -15,
                        25
                    )
                )
            ),

            "rainfall": random.choice(
                [
                    0,
                    0,
                    0,
                    2,
                    5,
                    10
                ]
            ),

            "description": random.choice(
                [
                    "Clear",
                    "Partly Cloudy",
                    "Cloudy",
                    "Light Rain",
                    "Overcast"
                ]
            )
        })

    return {
        "forecast": forecast_days
    }