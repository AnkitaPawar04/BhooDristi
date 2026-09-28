"""
Chat Context Builder

Collects BhooDristi's own model outputs (soil, weather, crop
recommendation, irrigation, government schemes, farmer profile)
and formats them as a context block for the chatbot prompt, so
answers are grounded in the app's data instead of being generic.
"""

import json
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

from ..database.config import SessionLocal
from ..models.farmer import Farmer, IrrigationPrediction, Prediction
from .location import get_district_from_coordinates
from .model_inference import get_model
from .soil_database import get_soil_data
from .irrigation_model import get_irrigation_model
from .irrigation_utils import map_prediction_to_recommendation
from ..services.market_service import fetch_market_prices


# ============================================================
# SCHEMES DATA
# ============================================================

SCHEMES_FILE = (
    Path(__file__).resolve().parents[3]
    / "frontend"
    / "public"
    / "data"
    / "maharashtra_agriculture_schemes.json"
)

_schemes_cache = None


def load_schemes() -> list:

    global _schemes_cache

    if _schemes_cache is None:

        try:
            with open(SCHEMES_FILE, encoding="utf-8") as f:
                _schemes_cache = list(json.load(f).values())
        except Exception as e:
            print("⚠️ Could not load schemes:", repr(e))
            _schemes_cache = []

    return _schemes_cache


SCHEME_KEYWORDS = [
    "scheme", "yojana", "subsidy", "government", "loan",
    "insurance", "pm-kisan", "kisan", "grant", "benefit",
    "योजना", "अनुदान", "सरकार", "सरकारी", "कर्ज", "विमा", "बीमा",
]


def is_scheme_question(message: str) -> bool:

    text = message.lower()

    return any(word in text for word in SCHEME_KEYWORDS)


def find_relevant_schemes(message: str, limit: int = 5) -> list:
    """Return schemes whose name/category share words with the question."""

    schemes = load_schemes()

    if not schemes:
        return []

    words = {
        w.strip(".,?!()").lower()
        for w in message.split()
        if len(w) > 3
    }

    scored = []

    for scheme in schemes:

        if str(scheme.get("status", "")).lower() not in ("", "active"):
            continue

        haystack = (
            f"{scheme.get('scheme_name', '')} "
            f"{scheme.get('category', '')} "
            f"{scheme.get('description', '')}"
        ).lower()

        score = sum(1 for w in words if w in haystack)
        scored.append((score, scheme))

    scored.sort(key=lambda item: item[0], reverse=True)

    return [scheme for _, scheme in scored[:limit]]


# ============================================================
# SEASON
# ============================================================

def current_season(month: Optional[int] = None) -> str:

    month = month or datetime.now().month

    if month in (6, 7, 8, 9, 10):
        return "kharif"

    if month in (11, 12, 1, 2):
        return "rabi"

    return "zaid"


# ============================================================
# FARMER DATA FROM DATABASE
# ============================================================

def get_farmer_records(farmer_id: Optional[int]) -> dict:
    """Farmer profile + latest saved crop and irrigation predictions."""

    if not farmer_id:
        return {}

    db = SessionLocal()

    try:

        farmer = (
            db.query(Farmer)
            .filter(Farmer.id == farmer_id)
            .first()
        )

        last_crop = (
            db.query(Prediction)
            .filter(Prediction.farmer_id == farmer_id)
            .order_by(Prediction.created_at.desc())
            .first()
        )

        last_irrigation = (
            db.query(IrrigationPrediction)
            .filter(IrrigationPrediction.farmer_id == farmer_id)
            .order_by(IrrigationPrediction.timestamp.desc())
            .first()
        )

        return {
            "farmer": farmer,
            "last_crop": last_crop,
            "last_irrigation": last_irrigation,
        }

    except Exception as e:
        print("⚠️ Could not read farmer records:", repr(e))
        return {}

    finally:
        db.close()


# ============================================================
# CACHE
# ============================================================

# Soil, weather, crop model, irrigation and market data change slowly,
# so they are cached per farmer/location for 30 minutes. Only the
# scheme lookup depends on the message and is done every time.
CONTEXT_TTL_SECONDS = 30 * 60
_context_cache = {}


def _cache_key(farmer_id, latitude, longitude, district):
    lat = round(latitude, 2) if latitude is not None else None
    lon = round(longitude, 2) if longitude is not None else None
    return (farmer_id, lat, lon, (district or "").lower(), current_season())


def clear_context_cache(farmer_id: Optional[int] = None) -> None:
    """Drop cached farm data (e.g. after the farmer edits the profile)."""

    for key in list(_context_cache):
        if farmer_id is None or key[0] == farmer_id:
            _context_cache.pop(key, None)


# ============================================================
# LIVE IRRIGATION ESTIMATE
# ============================================================

# Values the trained irrigation model knows (from ai/models/encoders.pkl).
IRRIGATION_CROPS = {
    "cotton": "Cotton", "maize": "Maize", "potato": "Potato",
    "rice": "Rice", "paddy": "Rice", "sugarcane": "Sugarcane",
    "wheat": "Wheat",
    "कापूस": "Cotton", "कपास": "Cotton", "मका": "Maize", "मक्का": "Maize",
    "बटाटा": "Potato", "आलू": "Potato", "भात": "Rice", "धान": "Rice",
    "चावल": "Rice", "ऊस": "Sugarcane", "गन्ना": "Sugarcane",
    "गहू": "Wheat", "गेहूं": "Wheat",
}

SOIL_TYPE_MAP = {
    "black": "Clay", "clay": "Clay", "loamy": "Loamy", "sandy": "Sandy",
    "red": "Loamy", "laterite": "Sandy", "alluvial": "Silt",
}


def find_irrigation_crop(message: str, usual_crops) -> Optional[str]:
    """Crop from the question first, then from the farmer's usual crops."""

    text = message.lower()

    for word, crop in IRRIGATION_CROPS.items():
        if word in text:
            return crop

    for crop in usual_crops or []:
        mapped = IRRIGATION_CROPS.get(str(crop).strip().lower())
        if mapped:
            return mapped

    return None


def estimate_irrigation(crop, soil, weather, soil_type, season):

    model_soil = "Loamy"
    for key, value in SOIL_TYPE_MAP.items():
        if soil_type and key in soil_type.lower():
            model_soil = value
            break

    temperature = float(weather.get("temperature", 28))
    humidity = float(weather.get("humidity", 60))
    rainfall = float(weather.get("rainfall", 0))

    result = get_irrigation_model().predict({
        "soil_type": model_soil,
        "soil_ph": float(soil.get("ph", 6.5)),
        "soil_moisture": 40,
        "organic_carbon": 0.5,
        "electrical_conductivity": 1.0,
        "rainfall_mm": rainfall,
        "previous_irrigation_mm": 0,
        "temperature_c": temperature,
        "humidity": humidity,
        "sunlight_hours": 8,
        "wind_speed_kmh": 8,
        "crop_type": crop,
        "crop_growth_stage": "Vegetative",
        "season": season.title(),
        "irrigation_type": "Drip",
        "water_source": "Groundwater",
        "field_area_hectare": 1,
        "mulching_used": "No",
        "region": "West",
    })

    recommendation = map_prediction_to_recommendation(
        result["prediction"], 40, rainfall, crop, "Vegetative"
    )

    return (
        f"LIVE IRRIGATION ESTIMATE (BhooDristi irrigation model) for {crop}\n"
        f"Irrigation need: {result['prediction']} "
        f"({round(float(result.get('confidence', 0)), 1)}%)\n"
        f"Action: {recommendation['action']}, water: {recommendation['water_amount']}\n"
        f"Assumed (not measured): vegetative stage, 40% soil moisture, "
        f"drip irrigation. Tell the farmer these assumptions and suggest "
        f"the Irrigation Prediction page for an exact result."
    )


# ============================================================
# MARKET PRICES
# ============================================================

def market_prices_section(district: str, crops: list) -> Optional[str]:
    """Latest mandi prices (data.gov.in) for the district."""

    try:
        records = fetch_market_prices(district=district, limit=100)["records"]
    except Exception as e:
        print("⚠️ Market prices unavailable:", repr(e))
        return None

    if not records:
        return None

    wanted = {str(c).lower() for c in crops if c}

    def score(record):
        name = record["commodity"].lower()
        return any(w in name or name in w for w in wanted)

    records.sort(key=lambda r: (not score(r), r["commodity"]))

    lines = []
    seen = set()

    for r in records:
        key = (r["commodity"], r["market"])
        if key in seen or r["modal_price"] is None:
            continue
        seen.add(key)
        lines.append(
            f"- {r['commodity']} at {r['market']}: ₹{r['modal_price']:.0f}/quintal "
            f"(range ₹{r['min_price'] or 0:.0f}–{r['max_price'] or 0:.0f}, {r['arrival_date']})"
        )
        if len(lines) >= 10:
            break

    if not lines:
        return None

    return (
        f"MARKET PRICES (government mandi data, {district})\n"
        + "\n".join(lines)
    )


# ============================================================
# FARM CONTEXT (cached part)
# ============================================================

async def _build_base_context(
    latitude, longitude, district, farmer_id
):
    """Everything except the message-specific parts. Returns (sections, info)."""

    from ..routes.crop import get_weather_data, rank_top_crop_candidates
    from ..routes.weather import get_forecast

    sections = []
    info = {"usual_crops": [], "soil": {}, "weather": {}, "soil_type": None}

    records = get_farmer_records(farmer_id)
    farmer = records.get("farmer")

    # 1. Farmer profile
    if farmer:
        profile = []
        if farmer.district:
            profile.append(f"District (profile): {farmer.district}")
        if farmer.village:
            profile.append(f"Village: {farmer.village}")
        if farmer.farm_size:
            profile.append(f"Farm size: {farmer.farm_size}")
        if farmer.soil_type:
            profile.append(f"Soil type: {farmer.soil_type}")
            info["soil_type"] = farmer.soil_type
        if farmer.usual_crops:
            profile.append(f"Usually grows: {farmer.usual_crops}")
            try:
                info["usual_crops"] = json.loads(farmer.usual_crops)
            except Exception:
                pass
        if profile:
            sections.append("FARMER PROFILE\n" + "\n".join(profile))

        if latitude is None and farmer.latitude is not None:
            latitude, longitude = farmer.latitude, farmer.longitude
        if not district and farmer.district:
            district = farmer.district

    # 2. District
    if latitude is not None and longitude is not None:
        try:
            district = get_district_from_coordinates(latitude, longitude)
        except Exception as e:
            print("⚠️ District lookup failed:", repr(e))

    if not district:
        return None, info

    season = current_season()
    info["district"] = district
    sections.append(f"LOCATION\nDistrict: {district}\nCurrent season: {season.title()}")

    # 3. Soil: the farmer's Soil Health Card if entered, else district estimate
    soil = {}
    card = None
    if farmer is not None:
        card = {
            "nitrogen": farmer.soil_nitrogen,
            "phosphorus": farmer.soil_phosphorus,
            "potassium": farmer.soil_potassium,
            "ph": farmer.soil_ph,
        }
    try:
        estimate = get_soil_data(district) or {}
    except Exception as e:
        print("⚠️ Soil data failed:", repr(e))
        estimate = {}

    if card and any(v is not None for v in card.values()):
        soil = {k: (card[k] if card[k] is not None else estimate.get(k)) for k in card}
        source = "farmer's Soil Health Card"
        if any(v is None for v in card.values()):
            source += " (missing values filled from district estimate)"
    else:
        soil = estimate
        source = (
            "district-level ESTIMATE, not a lab test. Suggest the farmer "
            "enter Soil Health Card values in Profile for exact advice"
        )

    if soil:
        info["soil"] = soil
        sections.append(
            f"SOIL ({source})\n"
            f"Nitrogen: {soil.get('nitrogen', 'Unknown')}\n"
            f"Phosphorus: {soil.get('phosphorus', 'Unknown')}\n"
            f"Potassium: {soil.get('potassium', 'Unknown')}\n"
            f"pH: {soil.get('ph', 'Unknown')}"
        )

    # 4. Weather
    weather = {}
    if latitude is not None and longitude is not None:
        try:
            weather = await get_weather_data(latitude, longitude)
            if weather.get("description") != "Fallback":
                sections.append(
                    "CURRENT WEATHER\n"
                    f"Temperature: {weather.get('temperature')} °C\n"
                    f"Humidity: {weather.get('humidity')} %\n"
                    f"Rainfall: {weather.get('rainfall')} mm\n"
                    f"Conditions: {weather.get('description')}"
                )
            else:
                weather = {}
        except Exception as e:
            print("⚠️ Weather failed:", repr(e))
        try:
            forecast = await get_forecast(latitude, longitude)
            sections.append(f"5-DAY FORECAST\n{forecast}")
        except Exception as e:
            print("⚠️ Forecast failed:", repr(e))
    info["weather"] = weather

    # 5. Crop recommendation model (calibrated top 3)
    if soil:
        try:
            result = get_model().predict(
                nitrogen=float(soil.get("nitrogen", 50)),
                phosphorus=float(soil.get("phosphorus", 50)),
                potassium=float(soil.get("potassium", 50)),
                temperature=float(weather.get("temperature", 25)),
                humidity=float(weather.get("humidity", 60)),
                ph=float(soil.get("ph", 6.5)),
                rainfall=float(weather.get("rainfall", 100)),
            )

            in_season = rank_top_crop_candidates(
                result.get("all_crops", []), season=season, max_results=3,
            )
            raw_top = result.get("top_crops", [])[:3]

            def fmt(crops):
                return "\n".join(
                    f"{i}. {c['crop']} ({c['confidence']}%)"
                    for i, c in enumerate(crops, 1)
                )

            caution = (
                "\nNote: the model's percentages are relative scores, not "
                "guarantees. Do not describe any crop as certain."
            )

            if in_season:
                sections.append(
                    f"CROP RECOMMENDATION (BhooDristi ML model, top 3 "
                    f"{season.title()} crops)\n" + fmt(in_season) + caution
                )
            else:
                sections.append(
                    "CROP RECOMMENDATION (BhooDristi ML model)\n"
                    "The model's top crops for this soil and weather are:\n"
                    + fmt(raw_top)
                    + f"\nNONE of these is a {season.title()} season crop. "
                    "Tell the farmer this honestly: say which season these "
                    f"crops belong to, and do NOT call them {season.title()} "
                    f"crops. For {season.title()} sowing, suggest common "
                    f"Maharashtra {season.title()} crops and say this is "
                    "general guidance, not the model's output."
                    + caution
                )
        except Exception as e:
            print("⚠️ Crop model failed:", repr(e))

    last_crop = records.get("last_crop")
    if last_crop:
        sections.append(
            "FARMER'S LAST SAVED CROP PREDICTION\n"
            f"Recommended crop: {last_crop.recommended_crop} "
            f"({last_crop.confidence}%), season {last_crop.season}, "
            f"district {last_crop.district}\n"
            f"Top crops: {last_crop.top_crops}"
        )

    last_irrigation = records.get("last_irrigation")
    if last_irrigation:
        sections.append(
            "IRRIGATION (farmer's last saved Irrigation Prediction)\n"
            f"Crop: {last_irrigation.crop_type} ({last_irrigation.crop_growth_stage})\n"
            f"Irrigation need: {last_irrigation.prediction_class} ({last_irrigation.confidence}%)\n"
            f"Action: {last_irrigation.irrigate_action}\n"
            f"Water amount: {last_irrigation.water_amount_liters_per_m2} L/m²\n"
            f"Method: {last_irrigation.irrigation_type}, source: {last_irrigation.water_source}\n"
            f"Advice: {last_irrigation.advice}"
        )

    # 6. Market prices
    market = market_prices_section(district, info["usual_crops"])
    if market:
        sections.append(market)

    return sections, info


# ============================================================
# MAIN BUILDER
# ============================================================

async def build_farm_context(
    message: str,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    district: Optional[str] = None,
    farmer_id: Optional[int] = None,
) -> str:
    """
    Build the FARM DATA block for the chatbot system prompt.
    Every section is optional: a failing source is skipped,
    never invented.
    """

    key = _cache_key(farmer_id, latitude, longitude, district)
    cached = _context_cache.get(key)

    if cached and time.time() - cached[0] < CONTEXT_TTL_SECONDS:
        sections, info = cached[1], cached[2]
        print("⚡ Farm context served from cache")
    else:
        sections, info = await _build_base_context(
            latitude, longitude, district, farmer_id
        )
        _context_cache[key] = (time.time(), sections, info)

    if sections is None:
        return (
            "No farm data is available (no GPS, district or farmer profile).\n"
            "Do not invent soil, weather or crop values. Give general "
            "advice and ask the farmer for their district."
        )

    sections = list(sections)

    # Message-specific: live irrigation estimate for the crop asked about
    crop = find_irrigation_crop(message, info.get("usual_crops"))
    if crop and info.get("soil"):
        try:
            sections.append(
                estimate_irrigation(
                    crop, info["soil"], info.get("weather", {}),
                    info.get("soil_type"), current_season(),
                )
            )
        except Exception as e:
            print("⚠️ Irrigation model failed:", repr(e))

    # Message-specific: government schemes
    if is_scheme_question(message):
        schemes = find_relevant_schemes(message)
        if schemes:
            lines = [
                f"- {s.get('scheme_name')} | {s.get('category')} | "
                f"Documents: {s.get('required_documents')} | "
                f"Apply: {s.get('application_mode')} {s.get('official_link')}"
                for s in schemes
            ]
            sections.append(
                "GOVERNMENT SCHEMES (BhooDristi schemes database)\n"
                + "\n".join(lines)
            )

    return (
        "============================================================\n"
        "FARM DATA FROM BHOODRISTI MODELS\n"
        "============================================================\n\n"
        + "\n\n".join(sections)
        + "\n\n============================================================\n"
        "HOW TO USE THIS DATA\n"
        "- Base your answer on the FARM DATA above first.\n"
        "- Quote the actual values (district, N/P/K, pH, weather, top crops,\n"
        "  irrigation need, market prices, scheme names) that support your advice.\n"
        "- Say where soil values come from (Soil Health Card or estimate).\n"
        "- For crop choice, start from the ML model's ranked crops and\n"
        "  explain why they fit this soil, weather and season.\n"
        "- For selling questions, use the MARKET PRICES section.\n"
        "- For irrigation, use the irrigation model's result and weather.\n"
        "- For schemes, name the schemes listed above and how to apply.\n"
        "- If a needed value is missing, say it is not available and do\n"
        "  not invent it.\n"
    )
