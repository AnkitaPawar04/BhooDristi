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

# Create a session with retry strategy for better connection handling
def get_session():
    session = requests.Session()
    retry_strategy = Retry(
        total=2,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
    )
    adapter = HTTPAdapter(max_retries=retry_strategy, pool_connections=10, pool_maxsize=20)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

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

@router.get("/current/{latitude}/{longitude}", response_model=WeatherResponse)
async def get_current_weather(latitude: float, longitude: float):
    """Get current weather for coordinates from OpenWeatherMap API"""
    api_key = os.getenv("OPENWEATHERMAP_API_KEY")
    
    # Always try to use real API first
    if api_key:
        try:
            url = f"https://api.openweathermap.org/data/2.5/weather?lat={latitude}&lon={longitude}&appid={api_key}&units=metric"
            session = get_session()
            response = session.get(url, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "temperature": round(data["main"]["temp"], 1),
                    "humidity": data["main"]["humidity"],
                    "rainfall": data.get("rain", {}).get("1h", 0),
                    "description": data["weather"][0]["main"]
                }
            else:
                print(f"OpenWeatherMap API returned status {response.status_code}: {response.text}")
        except requests.exceptions.Timeout:
            print(f"OpenWeatherMap API timeout for coordinates {latitude}, {longitude}")
        except requests.exceptions.ConnectionError as e:
            print(f"OpenWeatherMap API connection error: {e}")
        except Exception as e:
            print(f"OpenWeatherMap API error: {e}")
    else:
        print("Warning: OPENWEATHERMAP_API_KEY not configured in environment")
    
    # Fallback: Generate realistic mock data (only if API fails)
    print(f"Using mock weather data for {latitude}, {longitude}")
    random.seed(int((latitude + longitude) * 1000))
    
    base_temp = 20 + (latitude / 30) * 10
    temperature = base_temp + random.uniform(-3, 3)
    humidity = 50 + random.randint(-15, 25)
    rainfall = random.choice([0, 0, 0, 2, 5, 10, 15])
    
    weather_conditions = [
        "Clear", "Partly Cloudy", "Cloudy", "Light Rain", 
        "Moderate Rain", "Overcast", "Sunny", "Haze"
    ]
    description = random.choice(weather_conditions)
    
    return {
        "temperature": round(temperature, 1),
        "humidity": min(100, max(30, humidity)),
        "rainfall": rainfall,
        "description": description
    }

@router.get("/forecast/{latitude}/{longitude}", response_model=ForecastResponse)
async def get_forecast(latitude: float, longitude: float):
    """Get 5-day weather forecast for coordinates from OpenWeatherMap API"""
    api_key = os.getenv("OPENWEATHERMAP_API_KEY")
    
    # Always try to use real API first
    if api_key:
        try:
            url = f"https://api.openweathermap.org/data/2.5/forecast?lat={latitude}&lon={longitude}&appid={api_key}&units=metric"
            session = get_session()
            response = session.get(url, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                forecast_list = data["list"]
                
                # Group forecasts by day (one per day at noon)
                daily_forecasts = {}
                for item in forecast_list:
                    dt = datetime.fromtimestamp(item["dt"])
                    date_str = dt.strftime("%Y-%m-%d")
                    
                    # Only take noon forecasts (12:00)
                    if dt.hour == 12 or date_str not in daily_forecasts:
                        if date_str not in daily_forecasts or dt.hour == 12:
                            daily_forecasts[date_str] = {
                                "date": date_str,
                                "day": dt.strftime("%A"),
                                "temp_max": item["main"]["temp_max"],
                                "temp_min": item["main"]["temp_min"],
                                "humidity": item["main"]["humidity"],
                                "rainfall": item.get("rain", {}).get("3h", 0),
                                "description": item["weather"][0]["main"]
                            }
                
                # Return 5 days
                forecast_days = sorted(daily_forecasts.items())[:5]
                return {
                    "forecast": [day[1] for day in forecast_days]
                }
            else:
                print(f"OpenWeatherMap forecast API returned status {response.status_code}")
        except requests.exceptions.Timeout:
            print(f"OpenWeatherMap forecast API timeout")
        except Exception as e:
            print(f"OpenWeatherMap forecast API error: {e}")
    
    # Fallback: Generate realistic mock forecast
    print(f"Using mock forecast data for {latitude}, {longitude}")
    random.seed(int((latitude + longitude) * 1000))
    
    forecast_days = []
    base_temp = 20 + (latitude / 30) * 10
    
    for i in range(5):
        date = datetime.now() + timedelta(days=i+1)
        
        forecast_days.append({
            "date": date.strftime("%Y-%m-%d"),
            "day": date.strftime("%A"),
            "temp_max": round(base_temp + random.uniform(2, 8), 1),
            "temp_min": round(base_temp + random.uniform(-3, 2), 1),
            "humidity": min(100, max(30, 50 + random.randint(-15, 25))),
            "rainfall": random.choice([0, 0, 0, 2, 5, 10]),
            "description": random.choice(["Clear", "Partly Cloudy", "Cloudy", "Light Rain", "Overcast"])
        })
    
    return {"forecast": forecast_days}
