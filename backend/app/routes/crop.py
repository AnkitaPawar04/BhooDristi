from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database.config import get_db
from ..models.farmer import Prediction
from ..utils.location import get_district_from_coordinates
from ..utils.land_cover import check_land_cover, LandCoverProviderError
from ..utils.soil_database import get_soil_data
from ..utils.model_inference import get_model

# Reuse existing weather service
from .weather import get_current_weather

import json
import logging
import re
from pathlib import Path
from typing import Optional


router = APIRouter(
    prefix="/crop",
    tags=["crop recommendation"]
)

logger = logging.getLogger(__name__)


# ============================================================
# DATASET PATH
# ============================================================

# Current file:
# backend/app/routes/crop.py
#
# Project root:
# E:/AgroSahyadri/
#
# Dataset:
# E:/AgroSahyadri/ai/datasets/AgroData/CropDataset-Enhanced.csv

CURRENT_FILE = Path(__file__).resolve()

PROJECT_ROOT = CURRENT_FILE.parents[3]

DISTRICT_CROP_DATASET = (
    PROJECT_ROOT
    / "ai"
    / "datasets"
    / "AgroData"
    / "CropDataset-Enhanced.csv"
)


# ============================================================
# REQUEST MODEL
# ============================================================

class CropRecommendationRequest(BaseModel):
    latitude: float
    longitude: float
    season: str
    farmer_id: int

    # Kept for frontend compatibility.
    # Backend uses district-specific soil values.
    nitrogen: Optional[float] = 50
    phosphorus: Optional[float] = 50
    potassium: Optional[float] = 50

    temperature: Optional[float] = None
    humidity: Optional[float] = None
    ph: Optional[float] = None
    rainfall: Optional[float] = None

    # Optional district.
    district: Optional[str] = None


# ============================================================
# RESPONSE MODEL
# ============================================================

class CropRecommendationResponse(BaseModel):
    recommended_crop: str
    confidence: float
    top_crops: list
    district: str
    season: str

    district_crops: list = []
    district_data_available: bool = False

    model_recommendation: Optional[str] = None
    model_recommendation_in_district: bool = False


# ============================================================
# SEASON CROP FILTERS
# ============================================================

SEASON_CROPS = {

    "kharif": [
        "rice",
        "maize",
        "cotton",
        "sugarcane",

        "pigeonpeas",
        "pigeonpea",
        "mungbean",
        "mung",
        "blackgram",
        "urid",
        "mothbeans",

        "groundnut",
        "peanut",

        "jowar",
        "sorghum",

        "soybean",
        "soybeans",
    ],

    "rabi": [
        "wheat",

        "chickpea",
        "chick pea",
        "gram",

        "lentil",
        "lentils",

        "barley",
        "oats",

        "mustard",
        "rapeseed",

        "sunflower",

        "onion",
        "garlic",

        "peas",
        "pea",

        "sugarcane",
        "jowar",
        "sorghum",
        "maize",
    ],

    "zaid": [
        "watermelon",
        "muskmelon",
        "cucumber",
        "squash",
        "pumpkin",
        "bottlegourd",
        "bottle gourd",
        "cowpea",
        "okra",
        "brinjal",
    ],
}


# ============================================================
# CROP NAME NORMALIZATION
# ============================================================

def normalize_crop_name(crop_name: str) -> str:
    """
    Normalize crop names between:

    CropDataset-Enhanced.csv
    and
    Crop_recommendation.csv
    """

    if not crop_name:
        return ""

    name = str(crop_name).strip().lower()

    # Normalize spaces
    name = re.sub(r"\s+", " ", name)

    aliases = {

        # ----------------------------------------------------
        # Pulses
        # ----------------------------------------------------

        "tur": "pigeonpeas",
        "tur dal": "pigeonpeas",
        "tur (pigeon pea)": "pigeonpeas",
        "pigeon pea": "pigeonpeas",
        "pigeonpeas": "pigeonpeas",

        # ----------------------------------------------------
        # Jowar
        # ----------------------------------------------------

        "jowar": "jowar",
        "jowar (sorghum)": "jowar",
        "sorghum": "jowar",

        # ----------------------------------------------------
        # Soybean
        # ----------------------------------------------------

        "soybean": "soybean",
        "soyabean": "soybean",
        "soybeans": "soybean",

        # ----------------------------------------------------
        # Groundnut
        # ----------------------------------------------------

        "groundnut": "groundnut",
        "peanut": "groundnut",

        # ----------------------------------------------------
        # Bajra
        # ----------------------------------------------------

        "bajra": "bajra",
        "bajra (pearl millet)": "bajra",

        # ----------------------------------------------------
        # Common crops
        # ----------------------------------------------------

        "wheat": "wheat",
        "rice": "rice",
        "cotton": "cotton",
        "sugarcane": "sugarcane",
        "maize": "maize",

        # ----------------------------------------------------
        # Fruits
        # ----------------------------------------------------

        "orange": "orange",
        "oranges": "orange",

        "grape": "grapes",
        "grapes": "grapes",

        "pomegranate": "pomegranate",
        "pomegranates": "pomegranate",

        "banana": "banana",

        # ----------------------------------------------------
        # Vegetables
        # ----------------------------------------------------

        "onion": "onion",

        # ----------------------------------------------------
        # Generic ML crop names
        # ----------------------------------------------------

        "chickpea": "chickpea",
        "blackgram": "blackgram",
        "mungbean": "mungbean",
        "mothbeans": "mothbeans",
        "lentil": "lentil",

        "apple": "apple",
        "coconut": "coconut",
        "coffee": "coffee",
        "jute": "jute",
        "kidneybeans": "kidneybeans",
        "mango": "mango",
        "muskmelon": "muskmelon",
        "papaya": "papaya",
        "watermelon": "watermelon",
    }

    if name in aliases:
        return aliases[name]

    # Handle names such as:
    # "Jowar (Sorghum)"
    # "Tur (Pigeon Pea)"

    if "(" in name:

        base = name.split("(")[0].strip()

        if base in aliases:
            return aliases[base]

    return name


# ============================================================
# LOAD DISTRICT CROP DATA
# ============================================================

def load_district_crop_data():
    """
    Load Maharashtra district crop information.

    CropDataset-Enhanced.csv contains:
        Region
        Address
        Crop

    Crop can contain multiple comma-separated crops.
    """

    if not DISTRICT_CROP_DATASET.exists():

        logger.warning(
            "District crop dataset not found: %s",
            DISTRICT_CROP_DATASET
        )

        return {}

    try:

        import pandas as pd

        df = pd.read_csv(
            DISTRICT_CROP_DATASET
        )

        required_columns = {
            "Region",
            "Address",
            "Crop",
        }

        missing = (
            required_columns
            - set(df.columns)
        )

        if missing:

            logger.error(
                "District crop dataset is missing columns: %s",
                missing
            )

            return {}

        # ----------------------------------------------------
        # Only Maharashtra
        # ----------------------------------------------------

        df = df[
            df["Region"]
            .astype(str)
            .str.strip()
            .str.lower()
            == "maharashtra"
        ].copy()

        district_data = {}

        for _, row in df.iterrows():

            address = str(
                row.get(
                    "Address",
                    ""
                )
            ).strip()

            crop_text = str(
                row.get(
                    "Crop",
                    ""
                )
            ).strip()

            if not address:
                continue

            # ------------------------------------------------
            # Urban / non-agricultural entries
            # ------------------------------------------------

            if (
                "urban area" in crop_text.lower()
                or
                "minimal agricultural activity"
                in crop_text.lower()
            ):

                district_data[
                    address.lower()
                ] = {
                    "district": address,
                    "crops": [],
                }

                continue

            # ------------------------------------------------
            # Split comma-separated crops
            # ------------------------------------------------

            raw_crops = [
                crop.strip()
                for crop in crop_text.split(",")
                if crop.strip()
            ]

            normalized_crops = []

            for crop in raw_crops:

                normalized = normalize_crop_name(
                    crop
                )

                if (
                    normalized
                    and normalized
                    not in normalized_crops
                ):

                    normalized_crops.append(
                        normalized
                    )

            district_data[
                address.lower()
            ] = {
                "district": address,
                "crops": normalized_crops,
            }

        logger.info(
            "Loaded Maharashtra crop data for %d districts",
            len(district_data)
        )

        return district_data

    except Exception:

        logger.exception(
            "Failed to load district crop dataset"
        )

        return {}


# ============================================================
# LOAD ON STARTUP
# ============================================================

DISTRICT_CROP_DATA = load_district_crop_data()


# ============================================================
# FIND DISTRICT CROP DATA
# ============================================================

def get_district_crop_info(
    district: str
) -> Optional[dict]:

    if not district:
        return None

    requested = (
        district
        .strip()
        .lower()
    )

    # --------------------------------------------------------
    # Direct match
    # --------------------------------------------------------

    if requested in DISTRICT_CROP_DATA:

        return DISTRICT_CROP_DATA[
            requested
        ]

    # --------------------------------------------------------
    # Remove Maharashtra suffix
    # --------------------------------------------------------

    requested_clean = (
        requested
        .replace(
            ", maharashtra",
            ""
        )
        .strip()
    )

    for key, data in DISTRICT_CROP_DATA.items():

        key_clean = (
            key
            .replace(
                ", maharashtra",
                ""
            )
            .strip()
        )

        if key_clean == requested_clean:

            return data

    # --------------------------------------------------------
    # Partial matching
    # --------------------------------------------------------

    for key, data in DISTRICT_CROP_DATA.items():

        key_clean = (
            key
            .replace(
                ", maharashtra",
                ""
            )
            .strip()
        )

        if (
            requested_clean in key_clean
            or
            key_clean in requested_clean
        ):

            return data

    return None


# ============================================================
# SEASON CHECK
# ============================================================

def is_crop_in_season(
    crop_name: str,
    season: str
) -> bool:

    normalized = normalize_crop_name(
        crop_name
    )

    allowed = SEASON_CROPS.get(
        season.lower(),
        []
    )

    allowed_normalized = {
        normalize_crop_name(crop)
        for crop in allowed
    }

    return normalized in allowed_normalized


# ============================================================
# WEATHER
# ============================================================

async def get_weather_data(
    latitude: float,
    longitude: float
) -> dict:

    try:

        weather = await get_current_weather(
            latitude,
            longitude
        )

        return {

            "temperature": float(
                weather.get(
                    "temperature",
                    25
                )
            ),

            "humidity": float(
                weather.get(
                    "humidity",
                    60
                )
            ),

            "rainfall": float(
                weather.get(
                    "rainfall",
                    100
                )
            ),

            "description": weather.get(
                "description",
                "Unknown"
            )
        }

    except Exception:

        logger.exception(
            "Failed to get weather for "
            "latitude=%s longitude=%s",
            latitude,
            longitude
        )

        return {

            "temperature": 25.0,
            "humidity": 60.0,
            "rainfall": 100.0,
            "description": "Fallback"
        }


# ============================================================
# CROP PREDICTION
# ============================================================

@router.post(
    "/predict",
    response_model=CropRecommendationResponse
)
async def predict_crop(
    request: CropRecommendationRequest,
    db: Session = Depends(get_db)
):

    # ========================================================
    # 1. LAND COVER
    # ========================================================

    try:

        land_cover = check_land_cover(
            request.latitude,
            request.longitude
        )

    except LandCoverProviderError:

        logger.exception(
            "Land cover validation failed"
        )

        raise HTTPException(
            status_code=503,
            detail="Unable to validate land cover."
        )

    if not land_cover["allowed"]:

        raise HTTPException(
            status_code=400,
            detail={
                "message": (
                    "Crop recommendation is available "
                    "only for agricultural land."
                ),
                "land_cover":
                    land_cover["land_cover_class"],
                "class_id":
                    land_cover["class_id"],
            },
        )

    # ========================================================
    # 2. DISTRICT
    # ========================================================

    try:

        if request.district:

            district = (
                request.district
                .strip()
            )

        else:

            district = (
                get_district_from_coordinates(
                    request.latitude,
                    request.longitude
                )
            )

    except Exception:

        logger.exception(
            "Failed to determine district"
        )

        raise HTTPException(
            status_code=400,
            detail=(
                "Unable to determine district "
                "from selected location."
            )
        )

    if not district:

        raise HTTPException(
            status_code=400,
            detail="District could not be determined."
        )

    # ========================================================
    # 3. SEASON
    # ========================================================

    season = (
        request.season
        .lower()
        .strip()
    )

    if season not in SEASON_CROPS:

        logger.warning(
            "Invalid season '%s'. "
            "Defaulting to Kharif.",
            season
        )

        season = "kharif"

    # ========================================================
    # 4. DISTRICT CROPS
    # ========================================================

    district_crop_info = (
        get_district_crop_info(
            district
        )
    )

    district_data_available = (
        district_crop_info is not None
    )

    district_crops = []

    if district_crop_info:

        district_crops = [
            normalize_crop_name(crop)
            for crop in district_crop_info.get(
                "crops",
                []
            )
        ]

        district_crops = list(
            dict.fromkeys(
                district_crops
            )
        )

    # ========================================================
    # 5. SOIL
    # ========================================================

    try:

        soil_data = get_soil_data(
            district
        )

    except Exception:

        logger.exception(
            "Failed to get soil data for %s",
            district
        )

        raise HTTPException(
            status_code=500,
            detail=(
                f"Unable to load soil data "
                f"for {district}."
            )
        )

    if not soil_data:

        raise HTTPException(
            status_code=404,
            detail=(
                f"Soil data not found "
                f"for district: {district}."
            )
        )

    # ========================================================
    # 6. SOIL VALUES
    # ========================================================

    try:

        nitrogen = float(
            soil_data.get(
                "nitrogen",
                50
            )
        )

        phosphorus = float(
            soil_data.get(
                "phosphorus",
                50
            )
        )

        potassium = float(
            soil_data.get(
                "potassium",
                50
            )
        )

        soil_ph = float(
            soil_data.get(
                "ph",
                6.5
            )
        )

    except (
        TypeError,
        ValueError
    ):

        logger.exception(
            "Invalid soil data for %s: %s",
            district,
            soil_data
        )

        raise HTTPException(
            status_code=500,
            detail=(
                f"Invalid soil data "
                f"for {district}."
            )
        )

    # ========================================================
    # 7. WEATHER
    # ========================================================

    weather_data = await get_weather_data(
        request.latitude,
        request.longitude
    )

    temperature = float(
        weather_data.get(
            "temperature",
            25
        )
    )

    humidity = float(
        weather_data.get(
            "humidity",
            60
        )
    )

    rainfall = float(
        weather_data.get(
            "rainfall",
            100
        )
    )

    weather_description = weather_data.get(
        "description",
        "Unknown"
    )

    # ========================================================
    # 8. DEBUG INPUT
    # ========================================================

    print(
        "\n"
        "============================================\n"
        f"DEBUG MODEL INPUT - {district} - "
        f"{season.upper()}\n"
        "============================================\n"
        f"  N           = {nitrogen}\n"
        f"  P           = {phosphorus}\n"
        f"  K           = {potassium}\n"
        f"  Temperature = {temperature}\n"
        f"  Humidity    = {humidity}\n"
        f"  pH          = {soil_ph}\n"
        f"  Rainfall    = {rainfall}\n"
        f"  Weather     = {weather_description}\n"
        "--------------------------------------------\n"
        f"  District data available = "
        f"{district_data_available}\n"
        f"  District crops = "
        f"{district_crops}\n"
        "============================================\n"
    )

    # ========================================================
    # 9. LOAD MODEL
    # ========================================================

    try:

        model = get_model()

    except Exception:

        logger.exception(
            "Failed to load crop recommendation model"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Crop recommendation model "
                "could not be loaded."
            )
        )

    # ========================================================
    # 10. MODEL PREDICTION
    # ========================================================

    try:

        prediction_result = model.predict(

            nitrogen=nitrogen,
            phosphorus=phosphorus,
            potassium=potassium,

            temperature=temperature,
            humidity=humidity,

            ph=soil_ph,
            rainfall=rainfall,
        )

    except Exception:

        logger.exception(
            "ML prediction failed for %s",
            district
        )

        raise HTTPException(
            status_code=500,
            detail="Crop prediction failed."
        )

    # ========================================================
    # 11. RAW ML RECOMMENDATION
    # ========================================================

    model_recommended_crop = (
        prediction_result.get(
            "recommended_crop"
        )
    )

    if not model_recommended_crop:

        raise HTTPException(
            status_code=500,
            detail=(
                "Model did not return "
                "a recommended crop."
            )
        )

    model_recommended_normalized = (
        normalize_crop_name(
            model_recommended_crop
        )
    )

    model_confidence = float(
        prediction_result.get(
            "confidence",
            0
        )
    )

    # ========================================================
    # 12. USE ALL MODEL CROPS
    # ========================================================
    #
    # IMPORTANT:
    #
    # We use all_crops rather than only top_crops.
    #
    # Example:
    #
    # muskmelon = 75%
    # rice       = 8%
    #
    # Even though rice is not top-10, it must still be
    # available for district filtering.
    #

    all_model_crops = prediction_result.get(
        "all_crops",
        []
    )

    # --------------------------------------------------------
    # Compatibility fallback
    # --------------------------------------------------------
    #
    # If an older model_inference.py is still running and
    # doesn't provide all_crops, use top_crops so the API
    # doesn't crash.
    #

    if not all_model_crops:

        all_model_crops = []

        # Add actual prediction
        all_model_crops.append({

            "crop":
                model_recommended_crop,

            "confidence":
                model_confidence
        })

        # Add alternatives
        for crop in prediction_result.get(
            "top_crops",
            []
        ):

            crop_name = crop.get(
                "crop"
            )

            if not crop_name:
                continue

            all_model_crops.append({

                "crop":
                    crop_name,

                "confidence":
                    float(
                        crop.get(
                            "confidence",
                            0
                        )
                    )
            })

    # ========================================================
    # 13. REMOVE DUPLICATES
    # ========================================================

    model_candidates = []

    seen_crops = set()

    for crop in all_model_crops:

        crop_name = crop.get(
            "crop"
        )

        if not crop_name:
            continue

        normalized = normalize_crop_name(
            crop_name
        )

        if normalized in seen_crops:
            continue

        seen_crops.add(
            normalized
        )

        model_candidates.append({

            "crop":
                crop_name,

            "confidence":
                float(
                    crop.get(
                        "confidence",
                        0
                    )
                )
        })

    # ========================================================
    # 14. SORT BY ML CONFIDENCE
    # ========================================================

    model_candidates.sort(
        key=lambda x: x["confidence"],
        reverse=True
    )

    # ========================================================
    # 15. SEASON FILTER
    # ========================================================

    seasonal_candidates = []

    for candidate in model_candidates:

        crop_name = candidate[
            "crop"
        ]

        if is_crop_in_season(
            crop_name,
            season
        ):

            seasonal_candidates.append(
                candidate
            )

    # ========================================================
    # 16. DISTRICT FILTER
    # ========================================================

    final_candidates = []

    if district_data_available:

        district_crop_set = {

            normalize_crop_name(
                crop
            )

            for crop in district_crops
        }

        for candidate in seasonal_candidates:

            candidate_normalized = (
                normalize_crop_name(
                    candidate["crop"]
                )
            )

            if (
                candidate_normalized
                in district_crop_set
            ):

                final_candidates.append(
                    candidate
                )

    else:

        # District not present in Maharashtra dataset.
        #
        # In this case use season-filtered ML predictions.
        final_candidates = (
            seasonal_candidates.copy()
        )

    # ========================================================
    # 17. FALLBACK: DISTRICT MATCH WITHOUT SEASON
    # ========================================================
    #
    # This is only used when district data exists but there
    # are no district + season matches.
    #
    # We prefer a district crop over an unrelated generic
    # crop.
    #

    if (
        district_data_available
        and not final_candidates
    ):

        logger.warning(
            "No model-supported seasonal crop "
            "matched district crop list for %s.",
            district
        )

        district_crop_set = {

            normalize_crop_name(
                crop
            )

            for crop in district_crops
        }

        district_model_matches = []

        for candidate in model_candidates:

            candidate_normalized = (
                normalize_crop_name(
                    candidate["crop"]
                )
            )

            if (
                candidate_normalized
                in district_crop_set
            ):

                district_model_matches.append(
                    candidate
                )

        if district_model_matches:

            logger.info(
                "Found %d district crop "
                "matches without season filter "
                "for %s.",
                len(
                    district_model_matches
                ),
                district
            )

            final_candidates = (
                district_model_matches
            )

    # ========================================================
    # 18. FINAL RECOMMENDATION
    # ========================================================

    if final_candidates:

        final_candidates.sort(
            key=lambda x: x["confidence"],
            reverse=True
        )

        recommended = (
            final_candidates[0]
        )

        recommended_crop = (
            recommended["crop"]
        )

        recommended_confidence = float(
            recommended["confidence"]
        )

        alternatives = (
            final_candidates[1:3]
        )

    else:

        # ----------------------------------------------------
        # Generic fallback
        # ----------------------------------------------------
        #
        # This should happen only when:
        #
        # 1. District data doesn't exist, OR
        # 2. There is absolutely no overlap between the
        #    model's supported crops and the district data.
        #
        # We keep the API functional instead of returning
        # an empty response.
        #

        recommended_crop = (
            model_recommended_crop
        )

        recommended_confidence = (
            model_confidence
        )

        alternatives = []

        logger.warning(
            "Using generic ML fallback for %s: %s",
            district,
            recommended_crop
        )

    # ========================================================
    # 19. TOP 3
    # ========================================================

    top_crops = []

    for crop in alternatives[:2]:

        top_crops.append({

            "crop":
                crop["crop"],

            "confidence":
                float(
                    crop["confidence"]
                )
        })

    # ========================================================
    # 20. CHECK RAW MODEL RECOMMENDATION
    # ========================================================

    model_recommendation_in_district = False

    if district_data_available:

        district_crop_set = {

            normalize_crop_name(
                crop
            )

            for crop in district_crops
        }

        model_recommendation_in_district = (
            model_recommended_normalized
            in district_crop_set
        )

    # ========================================================
    # 21. DEBUG FINAL RESULT
    # ========================================================

    print(
        "\n"
        "============================================\n"
        f"FINAL CROP RESULT - {district}\n"
        "============================================\n"
        f"  Raw ML recommendation = "
        f"{model_recommended_crop}\n"
        f"  Raw ML confidence     = "
        f"{model_confidence:.2f}%\n"
        f"  District crops        = "
        f"{district_crops}\n"
        f"  Model candidates      = "
        f"{len(model_candidates)}\n"
        f"  Seasonal candidates   = "
        f"{len(seasonal_candidates)}\n"
        f"  Final candidates      = "
        f"{len(final_candidates)}\n"
        f"  Final recommendation  = "
        f"{recommended_crop}\n"
        f"  Final confidence      = "
        f"{recommended_confidence:.2f}%\n"
        f"  Alternatives          = "
        f"{top_crops}\n"
        "============================================\n"
    )

    # ========================================================
    # 22. SAVE DATABASE RECORD
    # ========================================================

    try:

        prediction = Prediction(

            farmer_id=request.farmer_id,

            district=district,

            season=request.season,

            recommended_crop=
                recommended_crop,

            confidence=
                recommended_confidence,

            top_crops=json.dumps(
                [
                    crop["crop"]
                    for crop in top_crops
                ]
            ),
        )

        db.add(
            prediction
        )

        db.commit()

    except Exception as e:

        db.rollback()

        logger.warning(
            "Could not save prediction to DB: %s",
            e
        )

    # ========================================================
    # 23. FINAL RESPONSE
    # ========================================================

    return {

        "recommended_crop":
            recommended_crop,

        "confidence":
            recommended_confidence,

        "top_crops":
            top_crops,

        "district":
            district,

        "season":
            season,

        "district_crops":
            district_crops,

        "district_data_available":
            district_data_available,

        "model_recommendation":
            model_recommended_crop,

        "model_recommendation_in_district":
            model_recommendation_in_district,
    }


# ============================================================
# SUPPORTED CROPS
# ============================================================

@router.get(
    "/supported-crops"
)
async def get_supported_crops():

    model = get_model()

    crops = model.get_supported_crops()

    return {

        "total_crops":
            len(crops),

        "crops":
            crops,
    }


# ============================================================
# DISTRICT CROP INFORMATION
# ============================================================

@router.get(
    "/district/{district}"
)
async def get_district_crops(
    district: str
):

    # ========================================================
    # DISTRICT DATA
    # ========================================================

    district_info = (
        get_district_crop_info(
            district
        )
    )

    soil_data = get_soil_data(
        district
    )

    if not soil_data:

        raise HTTPException(
            status_code=404,
            detail=(
                f"Soil data not found "
                f"for district: {district}"
            )
        )

    # ========================================================
    # MODEL
    # ========================================================

    model = get_model()

    # ========================================================
    # KHARIF
    # ========================================================

    kharif_prediction = model.predict(

        nitrogen=soil_data.get(
            "nitrogen",
            130
        ),

        phosphorus=soil_data.get(
            "phosphorus",
            40
        ),

        potassium=soil_data.get(
            "potassium",
            290
        ),

        temperature=25,

        humidity=80,

        ph=soil_data.get(
            "ph",
            7.2
        ),

        rainfall=800,
    )

    # ========================================================
    # RABI
    # ========================================================

    rabi_prediction = model.predict(

        nitrogen=soil_data.get(
            "nitrogen",
            130
        ),

        phosphorus=soil_data.get(
            "phosphorus",
            40
        ),

        potassium=soil_data.get(
            "potassium",
            290
        ),

        temperature=20,

        humidity=40,

        ph=soil_data.get(
            "ph",
            7.2
        ),

        rainfall=50,
    )

    # ========================================================
    # EXTRACT MODEL CROPS
    # ========================================================

    kharif_crops = [

        crop["crop"]

        for crop in kharif_prediction.get(
            "top_crops",
            []
        )[:3]
    ]

    rabi_crops = [

        crop["crop"]

        for crop in rabi_prediction.get(
            "top_crops",
            []
        )[:3]
    ]

    # ========================================================
    # DISTRICT CROPS
    # ========================================================

    district_crops = []

    if district_info:

        district_crops = (
            district_info.get(
                "crops",
                []
            )
        )

    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "district":
            district,

        "kharif_crops":
            kharif_crops,

        "rabi_crops":
            rabi_crops,

        "kharif_top_crop":
            kharif_prediction[
                "recommended_crop"
            ],

        "rabi_top_crop":
            rabi_prediction[
                "recommended_crop"
            ],

        "district_crops":
            district_crops,

        "district_data_available":
            bool(district_info),

        "soil_data":
            soil_data,

        # Existing frontend compatibility
        "prediction_count":
            142,

        "farmer_count":
            35,
    }