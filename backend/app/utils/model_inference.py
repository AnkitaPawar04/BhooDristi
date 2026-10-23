"""
Model Inference Module
Loads trained models and provides prediction interface
"""

import joblib
import logging
import os
from pathlib import Path
import numpy as np
import pandas as pd
from typing import Dict, List

from .model_loading import MODEL_LOAD_LOCK


logger = logging.getLogger(__name__)


class CropRecommendationModel:
    """Wrapper for crop recommendation ML models"""

    def __init__(self):

        # Current file:
        # backend/app/utils/model_inference.py

        current_file = Path(__file__)

        backend_dir = current_file.parent.parent.parent

        project_root = backend_dir.parent

        default_model_path = project_root / "ai" / "models"
        self.model_path = Path(
            os.getenv("CROP_MODEL_DIR") or default_model_path
        ).expanduser().resolve()

        self.model = None
        self.scaler = None
        self.label_encoder = None
        self.features = None

        self.load_models()

    # ==========================================================
    # LOAD MODELS
    # ==========================================================

    def load_models(self):

        artifacts = (
            ("agrosahyadri_gb_model.pkl", "model"),
            ("scaler.pkl", "scaler"),
            ("label_encoder.pkl", "label_encoder"),
            ("agrosahyadri_features.pkl", "features"),
        )
        loaded_artifacts = {}

        for filename, attribute in artifacts:
            artifact_path = self.model_path / filename
            try:
                loaded_artifacts[attribute] = joblib.load(artifact_path)
            except Exception as error:
                raise RuntimeError(
                    f"Unable to load crop model artifact '{artifact_path}': {error}"
                ) from error

        self.model = loaded_artifacts["model"]
        self.scaler = loaded_artifacts["scaler"]
        self.label_encoder = loaded_artifacts["label_encoder"]
        self.features = loaded_artifacts["features"]

        print("[OK] Models loaded successfully")
        print(f"  Features: {self.features}")
        print(f"  Crops: {list(self.label_encoder.classes_)}")

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

        prediction_probs = (
            self.model.predict_proba(
                features_scaled
            )[0]
        )

        # ======================================================
        # 4. DECODE PREDICTION
        # ======================================================

        class_names = self.label_encoder.inverse_transform(self.model.classes_)
        predicted_crop = class_names[int(np.argmax(prediction_probs))]

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

        all_crops = [
            {
                "crop": crop_name,
                "confidence": round(float(probability * 100), 2),
            }
            for crop_name, probability in zip(class_names, prediction_probs)
        ]

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

        logger.debug("Crop model probabilities: %s", all_crops)

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
        with MODEL_LOAD_LOCK:
            if _model_instance is None:
                _model_instance = CropRecommendationModel()

    return _model_instance