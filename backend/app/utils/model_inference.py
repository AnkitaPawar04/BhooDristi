"""
Model Inference Module
Loads trained models and provides prediction interface
"""

import joblib
from pathlib import Path
import numpy as np
import pandas as pd
from typing import Dict, List


class CropRecommendationModel:
    """Wrapper for crop recommendation ML models"""

    def __init__(self):

        # Current file:
        # backend/app/utils/model_inference.py

        current_file = Path(__file__)

        backend_dir = current_file.parent.parent.parent

        project_root = backend_dir.parent

        self.model_path = (
            project_root
            / "ai"
            / "models"
        )

        self.model = None
        self.scaler = None
        self.label_encoder = None
        self.features = None

        self.load_models()

    # ==========================================================
    # LOAD MODELS
    # ==========================================================

    def load_models(self):

        try:

            self.model = joblib.load(
                self.model_path
                / "agrosahyadri_gb_model.pkl"
            )

            self.scaler = joblib.load(
                self.model_path
                / "scaler.pkl"
            )

            self.label_encoder = joblib.load(
                self.model_path
                / "label_encoder.pkl"
            )

            self.features = joblib.load(
                self.model_path
                / "agrosahyadri_features.pkl"
            )

            print(
                "✓ Models loaded successfully"
            )

            print(
                f"  Features: {self.features}"
            )

            print(
                f"  Crops: "
                f"{list(self.label_encoder.classes_)}"
            )

        except FileNotFoundError as e:

            print(
                f"✗ Error loading models: {e}"
            )

            print(
                f"  Model path: "
                f"{self.model_path}"
            )

            raise

    # ==========================================================
    # PREDICT
    # ==========================================================

    def predict(
        self,
        nitrogen: float = 50,
        phosphorus: float = 50,
        potassium: float = 50,
        temperature: float = 25,
        humidity: float = 60,
        ph: float = 6.5,
        rainfall: float = 100
    ) -> Dict:

        """
        Predict crop based on soil and weather parameters.

        Returns:
            recommended_crop
            confidence
            top_crops
            all_crops
            input_features
        """

        # ======================================================
        # 1. CREATE INPUT DATAFRAME
        # ======================================================

        feature_names = (
            self.features
            or [
                "N",
                "P",
                "K",
                "temperature",
                "humidity",
                "ph",
                "rainfall"
            ]
        )

        features = pd.DataFrame(

            [[
                nitrogen,
                phosphorus,
                potassium,
                temperature,
                humidity,
                ph,
                rainfall
            ]],

            columns=feature_names
        )

        # ======================================================
        # 2. SCALE FEATURES
        # ======================================================

        features_scaled = (
            self.scaler.transform(
                features
            )
        )

        # ======================================================
        # 3. PREDICTION
        # ======================================================

        prediction_encoded = (
            self.model.predict(
                features_scaled
            )[0]
        )

        prediction_probs = (
            self.model.predict_proba(
                features_scaled
            )[0]
        )

        # ======================================================
        # 4. DECODE PREDICTION
        # ======================================================

        predicted_crop = (
            self.label_encoder
            .inverse_transform(
                [prediction_encoded]
            )[0]
        )

        confidence = (
            float(
                np.max(
                    prediction_probs
                )
            )
            * 100
        )

        # ======================================================
        # 5. GET ALL CROP PROBABILITIES
        # ======================================================

        all_crops = []

        for class_index, probability in enumerate(
            prediction_probs
        ):

            crop_name = (
                self.label_encoder
                .inverse_transform(
                    [class_index]
                )[0]
            )

            all_crops.append({

                "crop": crop_name,

                "confidence": round(
                    float(
                        probability * 100
                    ),
                    2
                )
            })

        # ======================================================
        # 6. SORT ALL CROPS
        # ======================================================

        all_crops.sort(
            key=lambda x: x["confidence"],
            reverse=True
        )

        # ======================================================
        # 7. TOP 10
        # ======================================================

        top_crops = all_crops[:10]

        # ======================================================
        # 8. DEBUG
        # ======================================================

        print(
            "\n"
            "--------------------------------------------\n"
            "MODEL CROP PROBABILITIES\n"
            "--------------------------------------------"
        )

        for crop in all_crops:

            print(
                f"  {crop['crop']:15s} "
                f"{crop['confidence']:7.2f}%"
            )

        print(
            "--------------------------------------------\n"
        )

        # ======================================================
        # 9. RETURN
        # ======================================================

        return {

            "recommended_crop":
                predicted_crop,

            "confidence":
                round(
                    confidence,
                    2
                ),

            "top_crops":
                top_crops,

            # IMPORTANT:
            # This contains ALL supported crops.
            "all_crops":
                all_crops,

            "input_features": {

                "nitrogen":
                    nitrogen,

                "phosphorus":
                    phosphorus,

                "potassium":
                    potassium,

                "temperature":
                    temperature,

                "humidity":
                    humidity,

                "ph":
                    ph,

                "rainfall":
                    rainfall
            }
        }

    # ==========================================================
    # SUPPORTED CROPS
    # ==========================================================

    def get_supported_crops(
        self
    ) -> List[str]:

        return sorted(
            list(
                self.label_encoder.classes_
            )
        )


# ==============================================================
# GLOBAL MODEL INSTANCE
# ==============================================================

_model_instance = None


def get_model() -> CropRecommendationModel:

    global _model_instance

    if _model_instance is None:

        _model_instance = (
            CropRecommendationModel()
        )

    return _model_instance