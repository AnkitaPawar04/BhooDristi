from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database.config import Base

class Farmer(Base):
    __tablename__ = "farmers"
    
    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, unique=True, nullable=True, index=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    name = Column(String, nullable=True)
    email = Column(String, unique=True, nullable=True)
    district = Column(String, nullable=True)
    village = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    password_hash = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    farm_size = Column(String, nullable=True)  # e.g., "5 acres"
    soil_type = Column(String, nullable=True)  # e.g., "Black Soil"
    usual_crops = Column(Text, nullable=True)  # JSON list of crops the farmer commonly grows
    # Soil Health Card values entered by the farmer (optional)
    soil_nitrogen = Column(Float, nullable=True)
    soil_phosphorus = Column(Float, nullable=True)
    soil_potassium = Column(Float, nullable=True)
    soil_ph = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    irrigation_predictions = relationship("IrrigationPrediction", back_populates="farmer", cascade="all, delete-orphan")

class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, index=True)
    district = Column(String)
    season = Column(String)  # Kharif or Rabi
    recommended_crop = Column(String)
    confidence = Column(Float)
    top_crops = Column(String)  # JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class IrrigationPrediction(Base):
    __tablename__ = "irrigation_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False, index=True)
    district = Column(String(100), nullable=True)
    
    # Input parameters - soil, weather, and environmental
    soil_type = Column(String(50))
    soil_ph = Column(Float)
    soil_moisture = Column(Float)
    organic_carbon = Column(Float)
    electrical_conductivity = Column(Float)
    
    # Weather parameters
    temperature_c = Column(Float)
    humidity = Column(Float)
    rainfall_mm = Column(Float)
    sunlight_hours = Column(Float)
    wind_speed_kmh = Column(Float)
    
    # Crop and farm parameters
    crop_type = Column(String(50))
    crop_growth_stage = Column(String(50))
    season = Column(String(50))
    field_area_hectare = Column(Float)
    previous_irrigation_mm = Column(Float)
    
    # Irrigation management parameters
    irrigation_type = Column(String(50))
    water_source = Column(String(50))
    mulching_used = Column(String(10))
    
    # Prediction results
    prediction_class = Column(String(20))  # Low, Medium, High
    confidence = Column(Float)
    irrigate_action = Column(String(20))  # Yes, Moderate, No
    water_amount_liters_per_m2 = Column(String(50))
    advice = Column(Text)
    
    # Metadata
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationship
    farmer = relationship("Farmer", back_populates="irrigation_predictions")


class ChatHistory(Base):
    """One chatbot message (farmer question or bot answer)."""

    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    feedback = Column(Integer, nullable=True)  # 1 = helpful, -1 = not helpful
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
