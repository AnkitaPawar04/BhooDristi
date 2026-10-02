#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Irrigation prediction routes
POST /irrigation/predict - Get irrigation recommendation
GET /irrigation/history/{farmer_id} - Get prediction history
"""
import asyncio

from ..utils.soilgrids import get_soilgrids_data
from ..utils.location_data import get_location_data
from fastapi import APIRouter, HTTPException, Depends, Query
from ..utils.season import get_current_season
from pydantic import BaseModel, Field
from typing import Any, Dict, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session

from ..database.config import get_db
from ..models.farmer import Farmer, IrrigationPrediction
from ..utils.irrigation_model import get_irrigation_model
from ..utils.irrigation_utils import (
    validate_irrigation_input,
    map_prediction_to_recommendation,
    generate_irrigation_advice,
    determine_district_from_coordinates
)
from ..utils.geometry import validate_polygon
from ..utils.land_cover import check_land_cover, LandCoverProviderError

router = APIRouter(prefix="/irrigation", tags=["irrigation"])


class IrrigationPredictRequest(BaseModel):
    farmer_id: Optional[int] = None

    latitude: float = Field(
        ...,
        ge=-90,
        le=90,
        description="Farmer latitude"
    )

    longitude: float = Field(
        ...,
        ge=-180,
        le=180,
        description="Farmer longitude"
    )

    crop_type: str = Field(
        ...,
        description="Crop type"
    )

    crop_growth_stage: str = Field(
        ...,
        description="Current crop growth stage"
    )

    soil_type: str = Field(
        ...,
        description="Farmer-reported soil type"
    )

    previous_irrigation_mm: float = Field(
        default=0,
        ge=0,
        description="Previous irrigation amount in mm"
    )

    irrigation_type: str = Field(
        ...,
        description="Irrigation method"
    )

    water_source: str = Field(
        ...,
        description="Water source"
    )

    field_area_hectare: float = Field(
        ...,
        ge=0.1,
        le=1000,
        description="Field area in hectares"
    )

    mulching_used: str = Field(
        ...,
        description="Whether mulching is used (Yes/No)"
    )
    polygon: Optional[Dict[str, Any]] = Field(default=None, description="Farm boundary as GeoJSON Polygon")
    electrical_conductivity: Optional[float] = Field(default=None, ge=0, description="Manual EC when no reliable remote estimate exists")
    sunlight_hours: Optional[float] = Field(default=None, ge=0, le=24, description="Manual sunlight input; no remote estimate is supplied")


class IrrigationLocationRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    polygon: Optional[Dict[str, Any]] = None
class IrrigationPredictResponse(BaseModel):
    prediction: str
    confidence: float
    irrigate_action: str
    water_amount_liters_per_m2: str
    advice: str
    timestamp: datetime
    
    class Config:
        from_attributes = True


class IrrigationHistoryResponse(BaseModel):
    id: int
    farmer_id: int
    district: str
    crop_type: str
    soil_type: str
    soil_moisture: float
    temperature_c: float
    humidity: float
    rainfall_mm: float
    crop_growth_stage: str
    previous_irrigation_mm: float
    prediction_class: str
    confidence: float
    irrigate_action: str
    water_amount_liters_per_m2: str
    advice: str
    timestamp: datetime
    
    class Config:
        from_attributes = True
@router.get("/soilgrids")
async def get_soilgrids(
    latitude: float,
    longitude: float
):
    """
    Test endpoint for retrieving location-based SoilGrids data.
    """

    soil_data = get_soilgrids_data(
        latitude=latitude,
        longitude=longitude
    )

    return soil_data


@router.post("/location-data")
async def irrigation_location_data(request: IrrigationLocationRequest):
    """Return source-labelled weather and remote-sensing estimates for a farm location."""
    polygon_info = None
    if request.polygon is not None:
        try:
            polygon_info = validate_polygon(request.polygon)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error))

    async def fetch_land_cover():
        try:
            return await asyncio.to_thread(
                check_land_cover,
                request.latitude,
                request.longitude,
            )
        except LandCoverProviderError as error:
            return {"allowed": None, "status": "unavailable", "message": str(error)}

    land_cover, data = await asyncio.gather(
        fetch_land_cover(),
        asyncio.to_thread(
            get_location_data,
            request.latitude,
            request.longitude,
            request.polygon,
        ),
    )
    district = determine_district_from_coordinates(request.latitude, request.longitude)
    return {
        "location": {
            "latitude": request.latitude,
            "longitude": request.longitude,
            "district": district,
            "region": district,
        },
        "farm": polygon_info,
        "weather": data["weather"],
        "soil": data["soil"],
        "soil_moisture": data["soil_moisture"],
        "season": get_current_season(),
        "land_cover": land_cover,
        "sources": data.get("sources", {}),
        "retrieved_at": datetime.utcnow().isoformat() + "Z",
    }

@router.post("/predict", response_model=IrrigationPredictResponse)
async def predict_irrigation(
    request: IrrigationPredictRequest,
    db: Session = Depends(get_db)
):
    """
    Get irrigation recommendation based on environmental and agricultural parameters
    
    Returns:
    - prediction: Low/Medium/High irrigation need
    - confidence: Model confidence (0-100%)
    - irrigate_action: Yes/Moderate/No irrigation action
    - water_amount: Recommended water amount (L/m²)
    - advice: Agricultural advice based on conditions
    - timestamp: Prediction timestamp
    """
    
    try:
        polygon_info = None
        if request.polygon is not None:
            try:
                polygon_info = validate_polygon(request.polygon)
            except ValueError as error:
                raise HTTPException(status_code=422, detail=str(error))
        if polygon_info:
            request.field_area_hectare = polygon_info["area_hectares"]

        try:
            land_cover = check_land_cover(request.latitude, request.longitude)
        except LandCoverProviderError as error:
            raise HTTPException(status_code=503, detail=f"Unable to validate agricultural land cover: {error}")
        if not land_cover.get("allowed"):
            raise HTTPException(status_code=400, detail={
                "message": "Irrigation prediction requires a location classified as agricultural land.",
                "land_cover": land_cover.get("land_cover_class"),
                "class_id": land_cover.get("class_id"),
            })

        # Get location-specific soil and weather data. The backend remains the source of truth.
        location_data = get_location_data(
            latitude=request.latitude,
            longitude=request.longitude,
            polygon=request.polygon,
        )

        soil_data = location_data["soil"]["soil"]
        current_weather = location_data["weather"]["current"]
        forecast = location_data["weather"]["forecast"]
        soil_moisture_data = location_data["soil_moisture"]

        if not current_weather:
            raise HTTPException(status_code=503, detail="Open-Meteo weather data is unavailable for this location.")
        if soil_data.get("ph") is None or soil_data.get("organic_carbon") is None:
            raise HTTPException(status_code=503, detail="Required SoilGrids pH or organic-carbon data is unavailable for this location.")

        if not soil_moisture_data.get("available"):
            raise HTTPException(
                status_code=503,
                detail="Recent satellite soil-moisture data is unavailable for this location."
            )

        soil_moisture = soil_moisture_data["surface_moisture_percent"]
        season = get_current_season()

        try:
            validate_irrigation_input(request.dict())
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        
        # Determine district from coordinates
        district = determine_district_from_coordinates(request.latitude, request.longitude)

        # RESEARCH NOTE: Derive region from district for model compatibility.
        # Dataset was trained with 5 regions: North, South, East, West, Central.
        # This is a post-hoc geographic classification based on Maharashtra districts.
        district_to_region = {
            'Pune': 'South',
            'Satara': 'South',
            'Kolhapur': 'South',
            'Solapur': 'South',
            'Nashik': 'West',
            'Jalgaon': 'West',
            'Dhule': 'West',
            'Nandurbar': 'West',
            'Amravati': 'Central',
            'Akola': 'Central',
            'Buldhana': 'Central',
            'Washim': 'Central',
            'Yavatmal': 'East',
            'Aurangabad': 'Central',
            'Parbhani': 'Central',
            'Latur': 'East',
            'Hingoli': 'East',
            'Nagpur': 'East',
            'Wardha': 'East',
            'Bhandara': 'East',
            'Chandrapur': 'East',
            'Gondia': 'East',
        }
        region = district_to_region.get(district, 'West')
        
        # Get ML model
        model = get_irrigation_model()
        
        # Prepare features for prediction
        # RESEARCH NOTE: Features from three sources:
        # 1. Satellite data (SoilGrids 250m, SMAP 9km, Open-Meteo)
        # 2. Farmer input (crop, soil type, irrigation practice)
        # 3. Derived/modeled (season, region geographic classification)
        # Missing features (electrical_conductivity, sunlight_hours) use model defaults
        # because real-time measurement sources are unavailable.
        features = {
    # Location-derived environmental data
    'soil_moisture': soil_moisture,  # NASA SMAP L4, 0-100%
    'temperature_c': current_weather["temperature"],  # Open-Meteo current
    'humidity': current_weather["humidity"],  # Open-Meteo current
    'rainfall_mm': current_weather["rainfall"],  # Open-Meteo current/instantaneous
    'wind_speed_kmh': current_weather["wind_speed_kmh"],  # Open-Meteo current

    # SoilGrids-derived soil properties (ISRIC, 0-5cm depth, 250m resolution)
    'soil_ph': soil_data["ph"],  # SoilGrids pH
    'organic_carbon': soil_data["organic_carbon"],  # SoilGrids % (after /10 scale)
    **({'electrical_conductivity': request.electrical_conductivity} if request.electrical_conductivity is not None else {}),
    **({'sunlight_hours': request.sunlight_hours} if request.sunlight_hours is not None else {}),

    # Farmer/farm information
    'crop_type': request.crop_type,
    'soil_type': request.soil_type,
    'crop_growth_stage': request.crop_growth_stage,
    'previous_irrigation_mm': request.previous_irrigation_mm,
    'irrigation_type': request.irrigation_type,
    'water_source': request.water_source,
    'field_area_hectare': request.field_area_hectare,
    'mulching_used': request.mulching_used,
    'season': season,  # Derived from current date
    'region': region,  # Derived from coordinates → district → region
}
        
        # Get prediction from model
        prediction_result = model.predict(features)
        
        # Map to recommendation
        forecast_rainfall = 0.0
        for day in (forecast or [])[:3]:
            if isinstance(day, dict) and day.get("rainfall") is not None:
                try:
                    forecast_rainfall += float(day["rainfall"])
                except (TypeError, ValueError):
                    continue

        recommendation = map_prediction_to_recommendation(
            prediction_result['prediction'],
            soil_moisture,
            current_weather["rainfall"],
            forecast_rainfall,
            request.crop_type,
            request.crop_growth_stage
        )
        
        # Generate advice
        advice = generate_irrigation_advice(
            prediction_result['prediction'],
            soil_moisture,
            current_weather["rainfall"],
            forecast_rainfall,
            request.crop_type,
            request.crop_growth_stage,
            current_weather["temperature"],
            current_weather["humidity"]
        )
        
        now = datetime.utcnow()
        
        # Save to database if farmer_id is provided
        if request.farmer_id:
            try:
                farmer = db.query(Farmer).filter(Farmer.id == request.farmer_id).first()
                if farmer:
                    prediction_record = IrrigationPrediction(
                        farmer_id=request.farmer_id,
                        district=district,
                        # Soil parameters
                        soil_type=request.soil_type,
                        soil_ph=soil_data["ph"],
                        soil_moisture=soil_moisture,
                        organic_carbon=soil_data["organic_carbon"],
                        # NOTE: electrical_conductivity is not available from real-time sources.
                        # Model uses default 1.0 during inference.
                        electrical_conductivity=None,

                        temperature_c=current_weather["temperature"],
                        humidity=current_weather["humidity"],
                        rainfall_mm=current_weather["rainfall"],
                        # NOTE: sunlight_hours is not available from real-time sources.
                        # Model uses default 8.0 during inference.
                        sunlight_hours=None,
                        wind_speed_kmh=current_weather["wind_speed_kmh"],
                        # Crop and farm parameters
                        crop_type=request.crop_type,
                        crop_growth_stage=request.crop_growth_stage,
                        season=season,
                        field_area_hectare=request.field_area_hectare,
                        previous_irrigation_mm=request.previous_irrigation_mm,
                        # Irrigation management
                        irrigation_type=request.irrigation_type,
                        water_source=request.water_source,
                        mulching_used=request.mulching_used,
                        # Prediction results
                        prediction_class=prediction_result['prediction'],
                        confidence=prediction_result['confidence'],
                        irrigate_action=recommendation['action'],
                        water_amount_liters_per_m2=recommendation['water_amount'],
                        advice=advice,
                        latitude=request.latitude,
                        longitude=request.longitude,
                        timestamp=now
                    )
                    db.add(prediction_record)
                    db.commit()
                    print(f"[OK] Saved irrigation prediction for farmer {request.farmer_id}")
            except Exception as e:
                print(f"⚠️  Database save warning: {e}")
                # Continue without saving if DB fails - don't fail the prediction
                db.rollback()
        
        return IrrigationPredictResponse(
            prediction=prediction_result['prediction'],
            confidence=prediction_result['confidence'],
            irrigate_action=recommendation['action'],
            water_amount_liters_per_m2=recommendation['water_amount'],
            advice=advice,
            timestamp=now
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Prediction error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )


@router.get("/history/{farmer_id}", response_model=List[IrrigationHistoryResponse])
async def get_irrigation_history(
    farmer_id: int,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get irrigation prediction history for a farmer
    
    Args:
        farmer_id: Farmer ID
        limit: Maximum number of records to return (default: 10, max: 100)
    
    Returns:
        List of irrigation predictions ordered by timestamp (newest first)
    """
    try:
        # Check if farmer exists
        farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
        if not farmer:
            raise HTTPException(status_code=404, detail="Farmer not found")
        
        predictions = db.query(IrrigationPrediction)\
            .filter(IrrigationPrediction.farmer_id == farmer_id)\
            .order_by(IrrigationPrediction.timestamp.desc())\
            .limit(limit)\
            .all()
        
        return predictions
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] History fetch error: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.get("/stats/{farmer_id}")
async def get_irrigation_stats(
    farmer_id: int,
    db: Session = Depends(get_db)
):
    """
    Get irrigation prediction statistics for a farmer
    
    Returns statistics like average confidence, prediction counts, etc.
    """
    try:
        farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
        if not farmer:
            raise HTTPException(status_code=404, detail="Farmer not found")
        
        predictions = db.query(IrrigationPrediction)\
            .filter(IrrigationPrediction.farmer_id == farmer_id)\
            .all()
        
        if not predictions:
            return {
                "farmer_id": farmer_id,
                "total_predictions": 0,
                "average_confidence": 0,
                "prediction_counts": {"Low": 0, "Medium": 0, "High": 0}
            }
        
        # Calculate stats
        confidence_sum = sum(p.confidence for p in predictions)
        avg_confidence = confidence_sum / len(predictions)
        
        prediction_counts = {
            "Low": len([p for p in predictions if p.prediction_class == "Low"]),
            "Medium": len([p for p in predictions if p.prediction_class == "Medium"]),
            "High": len([p for p in predictions if p.prediction_class == "High"])
        }
        
        return {
            "farmer_id": farmer_id,
            "total_predictions": len(predictions),
            "average_confidence": round(avg_confidence, 2),
            "prediction_counts": prediction_counts,
            "latest_prediction": {
                "timestamp": predictions[0].timestamp,
                "prediction": predictions[0].prediction_class,
                "crop": predictions[0].crop_type
            } if predictions else None
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Stats calculation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
