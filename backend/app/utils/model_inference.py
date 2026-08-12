"""
Model Inference Module
Loads trained models and provides prediction interface
"""

import joblib
from pathlib import Path
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple

class CropRecommendationModel:
    """Wrapper for crop recommendation ML models"""
    
    def __init__(self):
        # Get models directory relative to this file
        # This file is at: backend/app/utils/model_inference.py
        # Models are at: ai/models/
        current_file = Path(__file__)
        backend_dir = current_file.parent.parent.parent  # go to backend folder
        project_root = backend_dir.parent  # go to project root (BhooDrishti)
        self.model_path = project_root / "ai" / "models"
        
        self.model = None
        self.scaler = None
        self.label_encoder = None
        self.features = None
        self.load_models()
    
    def load_models(self):
        """Load all necessary models and components"""
        try:
            # Load the trained Gradient Boosting model
            self.model = joblib.load(self.model_path / "agrosahyadri_gb_model.pkl")
            
            # Load scaler for feature normalization
            self.scaler = joblib.load(self.model_path / "scaler.pkl")
            
            # Load label encoder for crop classes
            self.label_encoder = joblib.load(self.model_path / "label_encoder.pkl")
            
            # Load features list
            self.features = joblib.load(self.model_path / "agrosahyadri_features.pkl")
            
            print("✓ Models loaded successfully")
            print(f"  Features: {self.features}")
            print(f"  Crops: {list(self.label_encoder.classes_)}")
            
        except FileNotFoundError as e:
            print(f"✗ Error loading models: {e}")
            print(f"  Model path: {self.model_path}")
            raise
    
    def predict(self, 
                nitrogen: float = 50,
                phosphorus: float = 50,
                potassium: float = 50,
                temperature: float = 25,
                humidity: float = 60,
                ph: float = 6.5,
                rainfall: float = 100) -> Dict:
        """
        Predict crop based on soil and weather parameters
        
        Args:
            nitrogen: Nitrogen content (0-140)
            phosphorus: Phosphorus content (5-145)
            potassium: Potassium content (5-205)
            temperature: Temperature in Celsius (10-45)
            humidity: Humidity percentage (10-100)
            ph: Soil pH (3.5-9.9)
            rainfall: Rainfall in mm (20-300)
        
        Returns:
            Dictionary with recommended crop and confidence
        """
        
        # Create a feature frame with the same column names used during training
        feature_names = self.features or ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
        features = pd.DataFrame(
            [[nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall]],
            columns=feature_names
        )
        
        # Scale features using the trained scaler
        features_scaled = self.scaler.transform(features)
        
        # Get predictions from model
        prediction_encoded = self.model.predict(features_scaled)[0]
        
        # Get prediction probabilities for confidence
        prediction_probs = self.model.predict_proba(features_scaled)[0]
        
        # Decode the prediction
        predicted_crop = self.label_encoder.inverse_transform([prediction_encoded])[0]
        confidence = float(np.max(prediction_probs)) * 100
        
        # Get top 10 recommended crops to ensure we have enough after season filtering
        top_indices = np.argsort(prediction_probs)[-10:][::-1]
        all_crops = [
            {
                "crop": self.label_encoder.inverse_transform([idx])[0],
                "confidence": float(prediction_probs[idx] * 100)
            }
            for idx in top_indices
        ]
        
        # Filter out the recommended crop from alternatives, keep the next 10
        alternative_crops = [crop for crop in all_crops if crop["crop"] != predicted_crop][:10]
        
        return {
            "recommended_crop": predicted_crop,
            "confidence": round(confidence, 2),
            "top_crops": alternative_crops,
            "input_features": {
                "nitrogen": nitrogen,
                "phosphorus": phosphorus,
                "potassium": potassium,
                "temperature": temperature,
                "humidity": humidity,
                "ph": ph,
                "rainfall": rainfall
            }
        }
    
    def get_supported_crops(self) -> List[str]:
        """Get list of all supported crops"""
        return sorted(list(self.label_encoder.classes_))

# Global model instance
_model_instance = None

def get_model() -> CropRecommendationModel:
    """Get or create the global model instance"""
    global _model_instance
    if _model_instance is None:
        _model_instance = CropRecommendationModel()
    return _model_instance
