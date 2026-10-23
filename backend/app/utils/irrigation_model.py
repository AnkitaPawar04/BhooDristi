#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Irrigation prediction model inference service
Loads pre-trained ML model and provides predictions
"""

import pickle
import os
from pathlib import Path
from threading import Lock
import numpy as np
import pandas as pd
from typing import Dict

from .model_loading import MODEL_LOAD_LOCK


class IrrigationModel:
    """Singleton class for irrigation prediction model"""
    _instance = None
    _instance_lock = Lock()
    
    def __new__(cls):
        with cls._instance_lock:
            if cls._instance is None:
                instance = super().__new__(cls)
                instance._initialization_lock = Lock()
                instance._initialized = False
                cls._instance = instance
            return cls._instance
    
    def __init__(self):
        with self._initialization_lock:
            if self._initialized:
                return

            self.model = None
            self.encoders = None
            self.target_encoder = None
            self.features = None
            with MODEL_LOAD_LOCK:
                self._load_models()
            self._initialized = True
    
    def _load_models(self):
        """Load pre-trained models from pickle files"""
        try:
            # Paths to model files (in ai folder at project root)
            # This file: backend/app/utils/irrigation_model.py
            # Target: ai/
            current_file = Path(__file__)
            backend_dir = current_file.parent.parent.parent
            project_root = backend_dir.parent
            default_models_path = project_root / "ai"
            models_path = Path(
                os.getenv("IRRIGATION_MODEL_DIR") or default_models_path
            ).expanduser().resolve()
            self.model_path = models_path
            
            model_file = models_path / 'irrigation_model.pkl'
            encoders_file = models_path / 'encoders.pkl'
            target_encoder_file = models_path / 'target_encoder.pkl'
            features_file = models_path / 'irrigation_features.pkl'
            
            self.model = self._load_pickle_artifact(model_file)
            self.encoders = self._load_pickle_artifact(encoders_file)
            self.target_encoder = self._load_pickle_artifact(target_encoder_file)

            if features_file.exists():
                self.features = self._load_pickle_artifact(features_file)
            else:
                self.features = None

            print("[OK] Irrigation models loaded successfully")
            print(f"  Model type: {type(self.model).__name__}")
            print(f"  Encoders: {list(self.encoders.keys())}")
            print(f"  Target classes: {list(self.target_encoder.classes_)}")
            if self.features:
                print(f"  Features: {len(self.features)} features")

        except Exception as e:
            print(f"[ERROR] Error loading irrigation models: {e}")
            raise

    @staticmethod
    def _load_pickle_artifact(path: Path):
        try:
            with path.open("rb") as artifact:
                return pickle.load(artifact)
        except Exception as error:
            raise RuntimeError(
                f"Unable to load irrigation model artifact '{path}': {error}"
            ) from error
    
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
            
            probabilities = self.model.predict_proba(features_df)[0]
            prediction_index = int(np.argmax(probabilities))
            prediction_numeric = int(self.model.classes_[prediction_index])
            confidence = float(np.max(probabilities) * 100)
            
            # Decode to class label
            prediction_class = self.target_encoder.inverse_transform(
                [prediction_numeric]
            )[0]
            
            return {
                'prediction': prediction_class,
                'confidence': round(confidence, 1),
                'numeric_prediction': prediction_numeric
            }
        
        except Exception as e:
            print(f"[ERROR] Prediction error: {e}")
            raise


def get_irrigation_model() -> IrrigationModel:
    """Get or create singleton irrigation model instance"""
    return IrrigationModel()
