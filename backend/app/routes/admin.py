from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from ..database.config import get_db
from ..models.farmer import Farmer, Prediction
from ..utils.auth import create_access_token
from ..utils.soil_database import MAHARASHTRA_ZONES

router = APIRouter(prefix="/admin", tags=["admin"])

class AdminLoginRequest(BaseModel):
    email: str
    password: str

# Hardcoded admin credentials (in production, use a database)
ADMIN_EMAIL = "admin.agro@gmail.com"
ADMIN_PASSWORD = "Admin@123"

@router.post("/login")
async def admin_login(request: AdminLoginRequest):
    """Admin login endpoint"""
    if request.email == ADMIN_EMAIL and request.password == ADMIN_PASSWORD:
        access_token = create_access_token(
            data={"sub": "admin", "is_admin": True}
        )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "is_admin": True,
            "message": "Admin login successful"
        }
    else:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

@router.get("/farmers")
async def get_all_farmers(db: Session = Depends(get_db)):
    """Get all registered farmers"""
    farmers = db.query(Farmer).all()
    return {
        "total_farmers": len(farmers),
        "farmers": [
            {
                "id": f.id,
                "name": f.name,
                "phone": f.phone_number,
                "district": f.district,
                "verified": f.is_verified,
                "created_at": f.created_at
            }
            for f in farmers
        ]
    }

@router.get("/predictions")
async def get_all_predictions(db: Session = Depends(get_db)):
    """Get all crop predictions"""
    predictions = db.query(Prediction).all()
    return {
        "total_predictions": len(predictions),
        "predictions": [
            {
                "id": p.id,
                "farmer_id": p.farmer_id,
                "district": p.district,
                "season": p.season,
                "recommended_crop": p.recommended_crop,
                "confidence": p.confidence,
                "created_at": p.created_at
            }
            for p in predictions
        ]
    }

@router.get("/district-analysis")
async def get_district_analysis(db: Session = Depends(get_db)):
    """Get crop analysis by district"""
    results = db.query(
        Prediction.district,
        Prediction.season,
        Prediction.recommended_crop,
        func.count(Prediction.id).label('count')
    ).group_by(
        Prediction.district,
        Prediction.season,
        Prediction.recommended_crop
    ).all()
    
    district_data = {}
    for result in results:
        district = result.district or "Unknown"
        if district not in district_data:
            district_data[district] = {
                "district": district,
                "total_predictions": 0,
                "crops": [],
                "seasons": {}
            }
        
        district_data[district]["total_predictions"] += result.count
        district_data[district]["crops"].append({
            "crop": result.recommended_crop,
            "count": result.count
        })
        
        if result.season not in district_data[district]["seasons"]:
            district_data[district]["seasons"][result.season] = 0
        district_data[district]["seasons"][result.season] += result.count
    
    return {
        "total_districts": len(district_data),
        "districts": list(district_data.values())
    }

@router.get("/districts")
async def get_all_districts(db: Session = Depends(get_db)):
    """Get all districts from dataset and database"""
    farmer_district_rows = (
        db.query(Farmer.district)
        .filter(Farmer.district.isnot(None))
        .filter(func.trim(Farmer.district) != "")
        .distinct()
        .order_by(Farmer.district.asc())
        .all()
    )

    farmer_districts = [d[0].strip() for d in farmer_district_rows if d and d[0]]
    dataset_districts = list(MAHARASHTRA_ZONES.keys())

    district_list = sorted(set(dataset_districts + farmer_districts), key=str.lower)

    return {
        "total_districts": len(district_list),
        "districts": district_list
    }

@router.get("/statistics")
async def get_statistics(db: Session = Depends(get_db)):
    """Get admin dashboard statistics"""
    total_farmers = db.query(func.count(Farmer.id)).scalar() or 0
    total_predictions = db.query(func.count(Prediction.id)).scalar() or 0
    verified_farmers = db.query(func.count(Farmer.id)).filter(Farmer.is_verified == True).scalar() or 0
    
    # Most recommended crops
    top_crops = db.query(
        Prediction.recommended_crop,
        func.count(Prediction.id).label('count')
    ).group_by(Prediction.recommended_crop).order_by(func.count(Prediction.id).desc()).limit(5).all()
    
    return {
        "total_farmers": total_farmers,
        "verified_farmers": verified_farmers,
        "total_predictions": total_predictions,
        "top_crops": [{"crop": c[0], "count": c[1]} for c in top_crops]
    }

@router.delete("/farmers/{farmer_id}")
async def delete_farmer(farmer_id: int, db: Session = Depends(get_db)):
    """Delete a farmer and all their predictions"""
    farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
    
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    farmer_name = farmer.name or f"User ID {farmer_id}"
    
    try:
        # Delete all predictions for this farmer
        db.query(Prediction).filter(Prediction.farmer_id == farmer_id).delete()
        
        # Delete the farmer
        db.delete(farmer)
        db.commit()
        
        return {
            "success": True,
            "message": f"Farmer '{farmer_name}' and all associated data have been deleted successfully",
            "farmer_id": farmer_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting farmer: {str(e)}")
