from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Union
import json
from ..database.config import get_db
from ..models.farmer import Farmer
from ..utils.auth import hash_password, verify_password, create_access_token
from ..utils.otp import generate_otp, store_otp, verify_otp

router = APIRouter(prefix="/auth", tags=["authentication"])

class SendOTPRequest(BaseModel):
    phone_number: str

class VerifyOTPRequest(BaseModel):
    phone_number: str
    otp: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class LoginRequest(BaseModel):
    phone_number: Optional[str] = None
    email: Optional[str] = None
    password: str

class RegisterRequest(BaseModel):
    phone_number: Optional[str] = None
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: str

class FarmerProfileResponse(BaseModel):
    id: int
    name: str
    first_name: Optional[str]
    last_name: Optional[str]
    phone_number: Optional[str]
    email: Optional[str]
    district: Optional[str]
    village: Optional[str]
    farm_size: Optional[str]
    soil_type: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    usual_crops: list[str] = []
    soil_nitrogen: Optional[float] = None
    soil_phosphorus: Optional[float] = None
    soil_potassium: Optional[float] = None
    soil_ph: Optional[float] = None

class UpdateProfileRequest(BaseModel):
    phone_number: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    district: Optional[str] = None
    village: Optional[str] = None
    farm_size: Optional[Union[str, float]] = None  # Accept both string and float
    soil_type: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    usual_crops: Optional[Union[str, list[str]]] = None
    soil_nitrogen: Optional[float] = None
    soil_phosphorus: Optional[float] = None
    soil_potassium: Optional[float] = None
    soil_ph: Optional[float] = None


def parse_usual_crops(value):
    if not value:
        return []
    if isinstance(value, list):
        return value
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except (TypeError, json.JSONDecodeError):
        return []

class OTPResponse(BaseModel):
    message: str
    phone_number: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    message: str
    farmer_id: Optional[int] = None

@router.post("/send-otp", response_model=OTPResponse)
async def send_otp(request: SendOTPRequest, db: Session = Depends(get_db)):
    """Send OTP to farmer's phone number"""
    phone_number = request.phone_number
    
    if not phone_number or len(phone_number) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    otp = generate_otp()
    store_otp(phone_number, otp)
    
    # Send OTP via Twilio SMS
    from ..utils.otp import send_sms_otp
    sms_sent = send_sms_otp(phone_number, otp)
    
    if not sms_sent:
        print(f"Warning: SMS failed, but OTP stored for {phone_number}")
    
    return {
        "message": f"OTP sent successfully to +91{phone_number}",
        "phone_number": phone_number
    }

@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp_endpoint(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    """Verify OTP and create/update farmer"""
    phone_number = request.phone_number
    otp = request.otp
    
    if not verify_otp(phone_number, otp):
        raise HTTPException(status_code=401, detail="Invalid OTP")
    
    # Check if farmer exists
    farmer = db.query(Farmer).filter(Farmer.phone_number == phone_number).first()
    
    if not farmer:
        # Create new farmer
        farmer = Farmer(
            phone_number=phone_number,
            first_name=request.first_name or "Farmer",
            last_name=request.last_name or "",
            name=f"{request.first_name or 'Farmer'} {request.last_name or ''}".strip(),
            is_verified=True
        )
        db.add(farmer)
        db.commit()
        db.refresh(farmer)
    else:
        # Update existing farmer with name if provided
        if request.first_name:
            farmer.first_name = request.first_name
        if request.last_name:
            farmer.last_name = request.last_name
        # Update the name field
        farmer.name = f"{farmer.first_name or ''} {farmer.last_name or ''}".strip()
        farmer.is_verified = True
        db.commit()
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(farmer.id), "phone": phone_number}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "message": "Login successful",
        "farmer_id": farmer.id
    }

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login with phone number or email and password"""
    farmer = None
    
    # Try email first (priority for admin)
    if request.email:
        farmer = db.query(Farmer).filter(Farmer.email == request.email).first()
    # Then try phone number
    elif request.phone_number:
        farmer = db.query(Farmer).filter(Farmer.phone_number == request.phone_number).first()
    
    if not farmer or not farmer.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(request.password, farmer.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(
        data={"sub": str(farmer.id), "phone": request.phone_number}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "message": "Login successful",
        "farmer_id": farmer.id
    }

@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register new user with email and password"""
    
    # At least one of email or phone must be provided
    if not request.email and not request.phone_number:
        raise HTTPException(status_code=400, detail="Either email or phone number is required")
    
    # Check if email or phone already exists
    if request.email:
        existing = db.query(Farmer).filter(Farmer.email == request.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    if request.phone_number:
        existing = db.query(Farmer).filter(Farmer.phone_number == request.phone_number).first()
        if existing:
            raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Create new farmer
    first_name = request.first_name or "User"
    last_name = request.last_name or ""
    full_name = f"{first_name} {last_name}".strip()
    
    farmer = Farmer(
        email=request.email,
        phone_number=request.phone_number,
        first_name=first_name,
        last_name=last_name,
        name=full_name,
        password_hash=hash_password(request.password),
        is_verified=True
    )
    
    db.add(farmer)
    db.commit()
    db.refresh(farmer)
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(farmer.id), "email": request.email or request.phone_number}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "message": "Registration successful",
        "farmer_id": farmer.id
    }

@router.get("/profile/{farmer_id}", response_model=FarmerProfileResponse)
async def get_farmer_profile(farmer_id: int, db: Session = Depends(get_db)):
    """Get farmer's profile by ID"""
    farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    return FarmerProfileResponse(
        id=farmer.id,
        name=farmer.name,
        first_name=farmer.first_name,
        last_name=farmer.last_name,
        phone_number=farmer.phone_number,
        email=farmer.email,
        district=farmer.district,
        village=farmer.village,
        farm_size=farmer.farm_size,
        soil_type=farmer.soil_type,
        latitude=farmer.latitude,
        longitude=farmer.longitude,
        usual_crops=parse_usual_crops(farmer.usual_crops),
        soil_nitrogen=farmer.soil_nitrogen,
        soil_phosphorus=farmer.soil_phosphorus,
        soil_potassium=farmer.soil_potassium,
        soil_ph=farmer.soil_ph
    )

@router.put("/profile/{farmer_id}")
async def update_farmer_profile(farmer_id: int, request: UpdateProfileRequest, db: Session = Depends(get_db)):
    """Update farmer's profile"""
    try:
        farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
        if not farmer:
            raise HTTPException(status_code=404, detail="Farmer not found")
        
        # Update fields (only if provided)
        if request.phone_number is not None and request.phone_number != "":
            farmer.phone_number = request.phone_number
        if request.first_name is not None and request.first_name != "":
            farmer.first_name = request.first_name
        if request.last_name is not None and request.last_name != "":
            farmer.last_name = request.last_name
        if request.email is not None and request.email != "":
            farmer.email = request.email
        if request.district is not None and request.district != "":
            farmer.district = request.district
        if request.village is not None and request.village != "":
            farmer.village = request.village
        if request.farm_size is not None and request.farm_size != "":
            # Convert to string if needed
            farmer.farm_size = str(request.farm_size)
        if request.soil_type is not None and request.soil_type != "":
            farmer.soil_type = request.soil_type
        if request.latitude is not None:
            farmer.latitude = request.latitude
        if request.longitude is not None:
            farmer.longitude = request.longitude
        if request.usual_crops is not None:
            crops = request.usual_crops
            if isinstance(crops, str):
                crops = parse_usual_crops(crops)
            farmer.usual_crops = json.dumps(crops)
        
        # Soil Health Card values
        for field in ("soil_nitrogen", "soil_phosphorus", "soil_potassium", "soil_ph"):
            value = getattr(request, field)
            if value is not None:
                setattr(farmer, field, value)

        # Update name if first_name or last_name changed
        if request.first_name is not None or request.last_name is not None:
            farmer.name = f"{request.first_name or farmer.first_name or ''} {request.last_name or farmer.last_name or ''}".strip()
        
        db.commit()
        db.refresh(farmer)

        # The chatbot caches farm data; refresh it with the new profile.
        from ..utils.chat_context import clear_context_cache
        clear_context_cache(farmer_id)
        
        return {
            "message": "Profile updated successfully",
            "farmer": FarmerProfileResponse(
                id=farmer.id,
                name=farmer.name,
                first_name=farmer.first_name,
                last_name=farmer.last_name,
                phone_number=farmer.phone_number,
                email=farmer.email,
                district=farmer.district,
                village=farmer.village,
                farm_size=farmer.farm_size,
                soil_type=farmer.soil_type,
                latitude=farmer.latitude,
                longitude=farmer.longitude,
                usual_crops=parse_usual_crops(farmer.usual_crops),
                soil_nitrogen=farmer.soil_nitrogen,
                soil_phosphorus=farmer.soil_phosphorus,
                soil_potassium=farmer.soil_potassium,
                soil_ph=farmer.soil_ph
            )
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating profile: {str(e)}")
