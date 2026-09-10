from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database.config import get_db
from ..utils.soil_database import get_soil_data

router = APIRouter(prefix="/soil", tags=["soil data"])

@router.get("/{district}")
async def get_soil_by_district(district: str, db: Session = Depends(get_db)):
    """Get soil data for a specific district"""
    soil_data = get_soil_data(district)
    
    return {
        "district": district,
        "source": "district_demo_estimate",
        "is_verified": False,
        "nitrogen": soil_data.get("nitrogen", 0),
        "phosphorus": soil_data.get("phosphorus", 0),
        "potassium": soil_data.get("potassium", 0),
        "ph": soil_data.get("ph", 0)
    }
