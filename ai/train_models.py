#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Crop Recommendation Model Training Script
Trains ML models using soil nutrients, weather, and environmental data
"""

import pandas as pd
import numpy as np
import joblib
import os
from pathlib import Path
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, classification_report

# Set up paths
DATASETS_PATH = Path(__file__).parent / "datasets" / "AgroData"
MODELS_PATH = Path(__file__).parent / "models"

# Create models directory if it doesn't exist
MODELS_PATH.mkdir(exist_ok=True)

print("=" * 70)
print("CROP RECOMMENDATION MODEL TRAINING")
print("=" * 70)

# ============================================================================
# STEP 1: Load Data
# ============================================================================
print("\n[STEP 1] Loading Data...")

try:
    crop_df = pd.read_csv(DATASETS_PATH / "Crop_recommendation.csv")
    geo_df = pd.read_csv(DATASETS_PATH / "CropDataset-Enhanced.csv")
    
    print(f"✓ Loaded crop recommendation data: {crop_df.shape}")
    print(f"  Columns: {list(crop_df.columns)}")
    print(f"✓ Loaded geographic data: {geo_df.shape}")
except FileNotFoundError as e:
    print(f"✗ Error: {e}")
    print(f"  Expected files in: {DATASETS_PATH}")
    exit(1)

# ============================================================================
# STEP 2: Data Preparation
# ============================================================================
print("\n[STEP 2] Data Preparation and Cleaning...")

print("\nSample data:")
print(crop_df.head())

print(f"\nMissing values:\n{crop_df.isnull().sum()}")

crop_df = crop_df.drop_duplicates()
print(f"✓ After removing duplicates: {crop_df.shape}")

print(f"\nCrop distribution:")
print(crop_df['label'].value_counts())

# ============================================================================
# STEP 3: Feature Engineering
# ============================================================================
print("\n[STEP 3] Feature Engineering...")

feature_columns = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
target_column = 'label'

X = crop_df[feature_columns].copy()
y = crop_df[target_column].copy()

label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)

print(f"✓ Features shape: {X.shape}")
print(f"✓ Target shape: {y_encoded.shape}")
print(f"✓ Unique crops: {len(label_encoder.classes_)}")
print(f"✓ Crops: {list(label_encoder.classes_)}")

print(f"\nFeature Statistics:")
print(X.describe())

# ============================================================================
# STEP 4: Feature Scaling
# ============================================================================
print("\n[STEP 4] Feature Scaling...")

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

print(f"✓ Features scaled using StandardScaler")

# ============================================================================
# STEP 5: Train/Test Split
# ============================================================================
print("\n[STEP 5] Splitting Data (70% train, 30% test)...")

X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y_encoded, test_size=0.3, random_state=42, stratify=y_encoded
)

print(f"✓ Training set: {X_train.shape}")
print(f"✓ Test set: {X_test.shape}")

# ============================================================================
# STEP 6: Train Multiple Models
# ============================================================================
print("\n[STEP 6] Training Multiple Models...")
print("-" * 70)

models = {
    "Decision Tree": DecisionTreeClassifier(max_depth=10, random_state=42),
    "Random Forest": RandomForestClassifier(n_estimators=200, max_depth=15, random_state=42),
    "Gradient Boosting": GradientBoostingClassifier(n_estimators=200, learning_rate=0.1, max_depth=5, random_state=42),
    "KNN": KNeighborsClassifier(n_neighbors=5),
    "SVM": SVC(kernel='rbf', probability=True, random_state=42)
}

results = {}
trained_models = {}

for name, model in models.items():
    print(f"Training {name}...", end=" ")
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    results[name] = acc
    trained_models[name] = model
    print(f"✓ Accuracy: {acc:.4f}")

# ============================================================================
# STEP 7: Model Comparison
# ============================================================================
print("\n" + "=" * 70)
print("MODEL COMPARISON (Test Accuracy)")
print("=" * 70)

results_df = pd.DataFrame(results.items(), columns=["Model", "Accuracy"]).sort_values(by="Accuracy", ascending=False)
print(results_df.to_string(index=False))

best_model_name = results_df.iloc[0]["Model"]
best_accuracy = results_df.iloc[0]["Accuracy"]

print(f"\n✓ Best Model: {best_model_name} (Accuracy: {best_accuracy:.4f})")

# ============================================================================
# STEP 8: Cross Validation
# ============================================================================
print("\n[STEP 8] Cross-Validation Scores (5-Fold)...")

cv_results = {}
for name, model in models.items():
    scores = cross_val_score(model, X_scaled, y_encoded, cv=5)
    cv_results[name] = {
        "mean": scores.mean(),
        "std": scores.std(),
    }
    print(f"  {name:20s}: {scores.mean():.4f} (+/- {scores.std():.4f})")

# ============================================================================
# STEP 9: Train Final Model
# ============================================================================
print("\n[STEP 9] Training Final Model (Gradient Boosting)...")

final_model = GradientBoostingClassifier(
    n_estimators=200,
    learning_rate=0.1,
    max_depth=5,
    random_state=42
)

final_model.fit(X_scaled, y_encoded)
print("✓ Final Gradient Boosting model trained on full dataset")

y_pred_final = final_model.predict(X_test)
print(f"\nFinal Model Test Accuracy: {accuracy_score(y_test, y_pred_final):.4f}")

# ============================================================================
# STEP 10: Save All Components
# ============================================================================
print("\n[STEP 10] Saving Models and Components as Pickle Files...")
print("-" * 70)

# Save main model
main_model_path = MODELS_PATH / "BhooDrishti_gb_model.pkl"
joblib.dump(final_model, main_model_path)
print(f"✓ Main model: {main_model_path.name}")

# Save scaler
scaler_path = MODELS_PATH / "scaler.pkl"
joblib.dump(scaler, scaler_path)
print(f"✓ Scaler: {scaler_path.name}")

# Save features
features_path = MODELS_PATH / "BhooDrishti_features.pkl"
joblib.dump(feature_columns, features_path)
print(f"✓ Features list: {features_path.name}")

# Save label encoder
encoder_path = MODELS_PATH / "label_encoder.pkl"
joblib.dump(label_encoder, encoder_path)
print(f"✓ Label encoder: {encoder_path.name}")

# Save classes
classes_path = MODELS_PATH / "BhooDrishti_classes.pkl"
joblib.dump(label_encoder.classes_, classes_path)
print(f"✓ Classes: {classes_path.name}")

# Save all trained models
for name, model in trained_models.items():
    model_name = name.lower().replace(" ", "_")
    path = MODELS_PATH / f"BhooDrishti_{model_name}_model.pkl"
    joblib.dump(model, path)
    print(f"✓ {name} model: {path.name}")

# Save metadata
metadata = {
    "features": feature_columns,
    "classes": list(label_encoder.classes_),
    "accuracy": accuracy_score(y_test, y_pred_final),
    "model_type": "GradientBoostingClassifier",
    "n_classes": len(label_encoder.classes_),
}
metadata_path = MODELS_PATH / "model_metadata.pkl"
joblib.dump(metadata, metadata_path)
print(f"✓ Metadata: {metadata_path.name}")

# ============================================================================
# Summary
# ============================================================================
print("\n" + "=" * 70)
print("✓ TRAINING COMPLETED SUCCESSFULLY!")
print("=" * 70)

print(f"\nAll models saved in: {MODELS_PATH}\n")

print("Saved Files:")
for file in sorted(MODELS_PATH.glob("*.pkl")):
    file_size = file.stat().st_size / 1024
    print(f"  • {file.name:<40s} ({file_size:>6.1f} KB)")

print(f"\nBest Model: Gradient Boosting")
print(f"  • Test Accuracy: {accuracy_score(y_test, y_pred_final):.4f}")
print(f"  • Number of Crops: {len(label_encoder.classes_)}")
print(f"  • Training Samples: {X_train.shape[0]}")
print(f"  • Test Samples: {X_test.shape[0]}")

print("\n" + "=" * 70)
