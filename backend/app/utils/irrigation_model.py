#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Irrigation prediction model inference service
Loads pre-trained ML model and provides predictions
"""

import pickle
from pathlib import Path
import numpy as np
import pandas as pd
from typing import Dict

class IrrigationModel:
    """Singleton class for irrigation prediction model"""
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self.model = None
        self.encoders = None
        self.target_encoder = None
        self.features = None  # Initialize features attribute
        self._load_models()
    
    def _load_models(self):
        """Load pre-trained models from pickle files"""
        try:
            # Paths to model files (in ai folder at project root)
            # This file: backend/app/utils/irrigation_model.py
            # Target: ai/
            current_file = Path(__file__)
            backend_dir = current_file.parent.parent.parent  # go to backend
            project_root = backend_dir.parent  # go to BhooDristi (project root)
            models_path = project_root / 'ai'
            
            model_file = models_path / 'irrigation_model.pkl'
            encoders_file = models_path / 'encoders.pkl'
            target_encoder_file = models_path / 'target_encoder.pkl'
            features_file = models_path / 'irrigation_features.pkl'
            
            # Check if files exist
            if not model_file.exists():
                raise FileNotFoundError(
                    f"Model file not found: {model_file}\n"
                    f"Please run: python ai/train_irrigation_model.py"
                )
            
            if not encoders_file.exists():
                raise FileNotFoundError(
                    f"Encoders file not found: {encoders_file}\n"
                    f"Please run: python ai/train_irrigation_model.py"
                )
            
            if not target_encoder_file.exists():
                raise FileNotFoundError(
                    f"Target encoder file not found: {target_encoder_file}\n"
                    f"Please run: python ai/train_irrigation_model.py"
                )
            
            # Load with protocol handling for version compatibility
            try:
                with open(model_file, 'rb') as f:
                    self.model = pickle.load(f)
                
                with open(encoders_file, 'rb') as f:
                    self.encoders = pickle.load(f)
                
                with open(target_encoder_file, 'rb') as f:
                    self.target_encoder = pickle.load(f)
                
                # Try to load feature names
                if features_file.exists():
                    with open(features_file, 'rb') as f:
                        self.features = pickle.load(f)
                else:
                    self.features = None
                
                print("✓ Irrigation models loaded successfully")
                print(f"  Model type: {type(self.model).__name__}")
                print(f"  Encoders: {list(self.encoders.keys())}")
                print(f"  Target classes: {list(self.target_encoder.classes_)}")
                if self.features:
                    print(f"  Features: {len(self.features)} features")
            
            except (pickle.UnpicklingError, EOFError) as e:
                raise FileNotFoundError(
                    f"Failed to load pickle files (possible version mismatch): {e}\n"
                    f"Solution: Retrain models by running: python ai/train_irrigation_model.py"
                )
        
        except Exception as e:
            print(f"✗ Error loading irrigation models: {e}")
            raise
    
    def predict(self, features_dict: Dict) -> Dict:
        """
        Make irrigation prediction
        
        Args:
            features_dict: Dict with input parameters
        
        Returns:
            Dict with prediction, confidence, and numeric code
        """
        try:
            if self.model is None or self.encoders is None or self.target_encoder is None:
                raise RuntimeError(
                    "Models not loaded. Please ensure train_irrigation_model.py was run successfully.\n"
                    "The pickle files may be corrupted or incompatible.\n"
                    "Solution: Run 'python ai/train_irrigation_model.py' from the project root."
                )
            
            features = []
            
            # Field mapping with default values
            field_mapping = {
                'Soil_Type': str(features_dict.get('soil_type', '')).strip(),
                'Soil_pH': float(features_dict.get('soil_ph', 6.5)),
                'Soil_Moisture': float(features_dict.get('soil_moisture', 50)),
                'Organic_Carbon': float(features_dict.get('organic_carbon', 0.5)),
                'Electrical_Conductivity': float(features_dict.get('electrical_conductivity', 1.0)),
                'Rainfall_mm': float(features_dict.get('rainfall_mm', 0)),
                'Previous_Irrigation_mm': float(features_dict.get('previous_irrigation_mm', 0)),
                'Temperature_C': float(features_dict.get('temperature_c', 25)),
                'Humidity': float(features_dict.get('humidity', 60)),
                'Sunlight_Hours': float(features_dict.get('sunlight_hours', 8)),
                'Wind_Speed_kmh': float(features_dict.get('wind_speed_kmh', 5)),
                'Crop_Type': str(features_dict.get('crop_type', '')).strip(),
                'Crop_Growth_Stage': str(features_dict.get('crop_growth_stage', '')).strip(),
                'Season': str(features_dict.get('season', 'Kharif')).strip(),
                'Irrigation_Type': str(features_dict.get('irrigation_type', 'Drip')).strip(),
                'Water_Source': str(features_dict.get('water_source', 'Groundwater')).strip(),
                'Field_Area_hectare': float(features_dict.get('field_area_hectare', 1)),
                'Mulching_Used': str(features_dict.get('mulching_used', 'No')).strip(),
                'Region': str(features_dict.get('region', 'Western')).strip(),
            }
            
            # Determine which features to use
            # If we have stored feature list, use it; otherwise, use encoder keys
            if self.features:
                feature_names = self.features
            else:
                # Use keys from encoders if available, otherwise all mapped fields
                feature_names = list(self.encoders.keys()) if self.encoders else list(field_mapping.keys())
            
            # Build feature array in correct order
            for feat_name in feature_names:
                if feat_name in field_mapping:
                    value = field_mapping[feat_name]
                    
                    # Check if this feature needs encoding
                    if feat_name in self.encoders:
                        # Categorical feature - encode it
                        encoder = self.encoders[feat_name]
                        
                        # Try to encode
                        if isinstance(value, str) and value in encoder.classes_:
                            encoded_val = encoder.transform([value])[0]
                        else:
                            # Use first class as fallback
                            encoded_val = encoder.transform([encoder.classes_[0]])[0]
                        
                        features.append(encoded_val)
                    else:
                        # Numeric feature
                        features.append(float(value))
            
            if not features:
                raise ValueError("No features could be extracted for prediction")
            
            # Convert to pandas DataFrame with feature names (required by model)
            features_df = pd.DataFrame([features], columns=feature_names)
            
            # Make prediction
            prediction_numeric = int(self.model.predict(features_df)[0])
            
            # Calculate confidence
            confidence = 75.0
            if hasattr(self.model, 'predict_proba'):
                try:
                    probabilities = self.model.predict_proba(features_df)[0]
                    confidence = float(max(probabilities) * 100)
                except:
                    pass
            
            # Decode to class label
            if prediction_numeric < len(self.target_encoder.classes_):
                prediction_class = self.target_encoder.inverse_transform([prediction_numeric])[0]
            else:
                prediction_class = 'Medium'  # Fallback
            
            return {
                'prediction': prediction_class,
                'confidence': round(confidence, 1),
                'numeric_prediction': prediction_numeric
            }
        
        except Exception as e:
            print(f"✗ Prediction error: {e}")
            raise


# Singleton instance
_irrigation_model = None

def get_irrigation_model() -> IrrigationModel:
    """Get or create singleton irrigation model instance"""
    global _irrigation_model
    if _irrigation_model is None:
        _irrigation_model = IrrigationModel()
    return _irrigation_model
