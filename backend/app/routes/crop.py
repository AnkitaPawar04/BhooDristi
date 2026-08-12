from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database.config import get_db
from ..models.farmer import Prediction
from ..utils.location import get_district_from_coordinates
from ..utils.land_cover import check_land_cover, LandCoverProviderError
from ..utils.soil_database import get_soil_data
from ..utils.model_inference import get_model
import requests
import json
from datetime import datetime
from typing import Optional, List
import logging

router = APIRouter(prefix="/crop", tags=["crop recommendation"])
logger = logging.getLogger(__name__)

class CropRecommendationRequest(BaseModel):
    latitude: float
    longitude: float
    season: str  # Kharif or Rabi
    farmer_id: int
    nitrogen: Optional[float] = 50
    phosphorus: Optional[float] = 50
    potassium: Optional[float] = 50
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    ph: Optional[float] = None
    rainfall: Optional[float] = None

class CropRecommendationResponse(BaseModel):
    recommended_crop: str
    confidence: float
    top_crops: list
    district: str
    season: str

@router.post("/predict", response_model=CropRecommendationResponse)
async def predict_crop(request: CropRecommendationRequest, db: Session = Depends(get_db)):
    """
    Predict crop using ML model based on soil, weather, DISTRICT, and SEASON
    """

    # Validate land cover before any downstream crop recommendation logic
    try:
        land_cover = check_land_cover(
            request.latitude,
            request.longitude
        )
    except LandCoverProviderError:
        logger.exception(
            "Land cover validation failed for latitude=%s longitude=%s",
            request.latitude,
            request.longitude,
        )
        raise HTTPException(
            status_code=503,
            detail="Unable to validate land cover."
        )

    if not land_cover["allowed"]:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Crop recommendation is available only for agricultural land.",
                "land_cover": land_cover["land_cover_class"],
                "class_id": land_cover["class_id"]
            }
        )
    
    # Get district from coordinates
    district = get_district_from_coordinates(request.latitude, request.longitude)
    season = request.season.lower().strip()
    
    # Season-specific crop filters - Comprehensive list for Maharashtra
    season_crops = {
        "kharif": [
            # Primary Kharif crops
            "rice", "maize", "cotton", "sugarcane",
            # Pulses
            "pigeonpeas", "pigeonpea", "mungbean", "mung", "blackgram", "urid", 
            "mothbeans", "groundnut",
            # Other
            "jowar", "sorghum", "soybeans", "soybean"
        ],
        "rabi": [
            # Primary Rabi crops
            "wheat", "chickpea", "chick pea", "gram", "lentil", "lentils", 
            "barley", "oats",
            # Oilseeds
            "mustard", "rapeseed", "sunflower",
            # Vegetables
            "onion", "garlic", "peas", "pea",
            # Others
            "sugarcane", "jowar", "sorghum", "maize"
        ],
        "zaid": [
            # Summer vegetables
            "watermelon", "muskmelon", "cucumber", "squash", 
            "pumpkin", "bottlegourd", "bottle gourd", "cowpea", "okra", "brinjal"
        ]
    }
    
    # Get soil data for district
    soil_data = get_soil_data(district)
    
    # Get weather data from OpenWeatherMap or use provided data
    weather_data = get_weather_data(request.latitude, request.longitude)
    
    # Use provided values or defaults
    temperature = request.temperature if request.temperature is not None else weather_data.get("temperature", 25)
    humidity = request.humidity if request.humidity is not None else weather_data.get("humidity", 60)
    ph = request.ph if request.ph is not None else soil_data.get("ph", 6.5)
    rainfall = request.rainfall if request.rainfall is not None else weather_data.get("rainfall", 100)
    
    # Get ML model instance
    model = get_model()
    
    # Get raw predictions from trained model (without season filtering)
    prediction_result = model.predict(
        nitrogen=request.nitrogen,
        phosphorus=request.phosphorus,
        potassium=request.potassium,
        temperature=temperature,
        humidity=humidity,
        ph=ph,
        rainfall=rainfall
    )
    
    # FILTER TOP CROPS BY SEASON (Kharif, Rabi, Zaid)
    allowed_crops = season_crops.get(season.lower(), [])
    
    if not allowed_crops:
        # Invalid season - should not happen, but default to Kharif
        allowed_crops = season_crops["kharif"]
        season = "kharif"
    
    # Normalize allowed crops to lowercase for comparison
    allowed_crops_normalized = [crop.lower() for crop in allowed_crops]
    
    # Filter predictions - show crops that are allowed for this season
    # Skip duplicate crops - keep only first occurrence of each crop name
    filtered_crops = []
    seen_crops = set()
    
    for crop in prediction_result["top_crops"]:
        crop_name_lower = crop["crop"].lower()
        
        # Check if crop matches any in the allowed list (handle spaces and variations)
        if any(allowed in crop_name_lower or crop_name_lower in allowed for allowed in allowed_crops_normalized):
            # Skip if we've already seen this crop (avoid duplicates)
            if crop_name_lower not in seen_crops:
                filtered_crops.append(crop)
                seen_crops.add(crop_name_lower)
    
    # Log debug info
    print(f"DEBUG: {district} - {season.upper()} - Found {len(filtered_crops)} unique seasonal crops from top predictions")
    
    # If we found seasonal crops, use them (up to 3 unique crops)
    if len(filtered_crops) >= 1:
        top_crops_list = [crop["crop"] for crop in filtered_crops[:3]]
        
        # Pad with other top crops if needed (but only if different from seasonal crops)
        if len(top_crops_list) < 3:
            for crop in prediction_result["top_crops"]:
                crop_name_lower = crop["crop"].lower()
                if crop_name_lower not in seen_crops:
                    top_crops_list.append(crop["crop"])
                    seen_crops.add(crop_name_lower)
                    if len(top_crops_list) == 3:
                        break
    else:
        # Fallback: if no seasonal match found, use top unique crops
        top_crops_list = []
        seen_crops_fallback = set()
        
        for crop in prediction_result["top_crops"]:
            crop_name_lower = crop["crop"].lower()
            if crop_name_lower not in seen_crops_fallback:
                top_crops_list.append(crop["crop"])
                seen_crops_fallback.add(crop_name_lower)
                if len(top_crops_list) == 3:
                    break
        
        print(f"Info: No seasonal crops found for {season} in {district}. Showing top unique recommendations.")
    
    if not top_crops_list:
        raise HTTPException(
            status_code=400, 
            detail=f"Unable to find crop recommendations for {district} with current soil conditions. Please adjust soil parameters (nitrogen, phosphorus, potassium, pH)."
        )
    
    # Get confidence from first filtered crop or first prediction
    recommended_crop = top_crops_list[0]
    confidence = filtered_crops[0]["confidence"] if filtered_crops else prediction_result["confidence"]
    
    # Save prediction in database
    try:
        prediction = Prediction(
            farmer_id=request.farmer_id,
            district=district,
            season=request.season,
            recommended_crop=recommended_crop,
            confidence=filtered_crops[0]["confidence"] if filtered_crops else prediction_result["confidence"],
            top_crops=json.dumps(top_crops_list)
        )
        db.add(prediction)
        db.commit()
    except Exception as e:
        print(f"Warning: Could not save prediction to DB: {e}")
    
    return {
        "recommended_crop": recommended_crop,
        "confidence": filtered_crops[0]["confidence"] if filtered_crops else prediction_result["confidence"],
        "top_crops": top_crops_list,
        "district": district,
        "season": request.season
    }

def get_weather_data(latitude: float, longitude: float) -> dict:
    """Fetch weather data from OpenWeatherMap API"""
    api_key = "your_openweathermap_api_key"
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={latitude}&lon={longitude}&appid={api_key}&units=metric"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            return {
                "temperature": data.get("main", {}).get("temp", 25),
                "humidity": data.get("main", {}).get("humidity", 60),
                "rainfall": data.get("rain", {}).get("1h", 0)
            }
    except:
        pass
    
    return {
        "temperature": 25,
        "humidity": 60,
        "rainfall": 0
    }

@router.get("/supported-crops")
async def get_supported_crops():
    """Get list of all supported crops in the model"""
    model = get_model()
    crops = model.get_supported_crops()
    return {
        "total_crops": len(crops),
        "crops": crops
    }

@router.get("/district/{district}")
async def get_district_crops(district: str):
    """Get top crops for a specific district using trained model"""
    
    # Get soil data for the district
    soil_data = get_soil_data(district)
    
    # Get the trained model
    model = get_model()
    
    # Predict for Kharif season (high rainfall, high humidity)
    kharif_prediction = model.predict(
        nitrogen=soil_data.get("nitrogen", 130),
        phosphorus=soil_data.get("phosphorus", 40),
        potassium=soil_data.get("potassium", 290),
        temperature=25,  # Average temperature during monsoon
        humidity=80,     # High humidity during monsoon
        ph=soil_data.get("ph", 7.2),
        rainfall=800     # High rainfall
    )
    
    # Predict for Rabi season (low rainfall, low humidity)
    rabi_prediction = model.predict(
        nitrogen=soil_data.get("nitrogen", 130),
        phosphorus=soil_data.get("phosphorus", 40),
        potassium=soil_data.get("potassium", 290),
        temperature=20,  # Cooler temperature during winter
        humidity=40,     # Low humidity during winter
        ph=soil_data.get("ph", 7.2),
        rainfall=50      # Low rainfall
    )
    
    # Extract top 3 crops for each season
    kharif_crops = [crop["crop"] for crop in kharif_prediction["top_crops"][:3]]
    rabi_crops = [crop["crop"] for crop in rabi_prediction["top_crops"][:3]]
    
    return {
        "district": district,
        "kharif_crops": kharif_crops,
        "rabi_crops": rabi_crops,
        "kharif_top_crop": kharif_prediction["recommended_crop"],
        "rabi_top_crop": rabi_prediction["recommended_crop"],
        "soil_data": soil_data,
        "prediction_count": 142,
        "farmer_count": 35
    }
