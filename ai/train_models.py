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
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, classification_report, precision_score, recall_score, f1_score

# Set up paths
DATASETS_PATH = Path(__file__).parent / "datasets" / "AgroData"
MODELS_PATH = Path(__file__).parent / "models_retrain"

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

print(f"✓ Features shape: {X.shape}")
print(f"✓ Target shape: {y.shape}")

print(f"\nFeature Statistics:")
print(X.describe())

# ============================================================================
# STEP 5: Train/Test Split
# ============================================================================
print("\n[STEP 5] Splitting Data (70% train, 30% test)...")

X_train_raw, X_test_raw, y_train_labels, y_test_labels = train_test_split(
    X, y, test_size=0.3, random_state=42, stratify=y
)

label_encoder = LabelEncoder()
y_train = label_encoder.fit_transform(y_train_labels)
y_test = label_encoder.transform(y_test_labels)
y_encoded = label_encoder.transform(y)

scaler = StandardScaler()
X_train = scaler.fit_transform(X_train_raw)
X_test = scaler.transform(X_test_raw)

print(f"✓ Fitted label encoder on training labels: {len(label_encoder.classes_)} crop classes")
print("✓ Fitted StandardScaler on training features only")
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
performance_results = []
trained_models = {}

for name, model in models.items():
    print(f"Training {name}...", end=" ")
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    recall = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)
    results[name] = acc
    performance_results.append({
        "Model": name,
        "Accuracy": acc,
        "Precision": precision,
        "Recall": recall,
        "F1-Score": f1,
    })
    trained_models[name] = model
    print(f"✓ Accuracy: {acc:.4f} | Precision: {precision:.4f} | Recall: {recall:.4f} | F1: {f1:.4f}")

# ============================================================================
# STEP 7: Model Comparison
# ============================================================================
print("\n" + "=" * 70)
print("MODEL PERFORMANCE COMPARISON (Test Set)")
print("=" * 70)

performance_df = pd.DataFrame(performance_results).sort_values(by="Accuracy", ascending=False)
print(performance_df.to_string(index=False, formatters={
    "Accuracy": "{:.2%}".format,
    "Precision": "{:.2%}".format,
    "Recall": "{:.2%}".format,
    "F1-Score": "{:.2%}".format,
}))

print(f"\nTABLE II TEST METRICS (n={len(y_test)})")
print("Model & Accuracy & Weighted precision & Weighted recall & Weighted F1 \\\\")
for result in performance_results:
    print(
        f"{result['Model']} & {result['Accuracy'] * 100:.2f} & "
        f"{result['Precision'] * 100:.2f} & "
        f"{result['Recall'] * 100:.2f} & "
        f"{result['F1-Score'] * 100:.2f} \\\\"
    )

best_model_name = performance_df.iloc[0]["Model"]
best_accuracy = performance_df.iloc[0]["Accuracy"]

print(f"\n✓ Best Model: {best_model_name} (Accuracy: {best_accuracy:.4f})")

# ============================================================================
# STEP 8: Cross Validation
# ============================================================================
print("\n[STEP 8] Cross-Validation Scores (5-Fold)...")

cv_results = {}
for name, model in models.items():
    scores = cross_val_score(
        make_pipeline(StandardScaler(), model),
        X,
        y_encoded,
        cv=5,
    )
    cv_results[name] = {
        "mean": scores.mean(),
        "std": scores.std(),
    }
    print(f"  {name:20s}: {scores.mean():.4f} (+/- {scores.std():.4f})")

# ============================================================================
# STEP 10: Save All Components
# ============================================================================
print("\n[STEP 10] Saving Models and Components as Pickle Files...")
print("-" * 70)

# Save main model
final_model = trained_models["Gradient Boosting"]
final_metrics = next(
    result for result in performance_results
    if result["Model"] == "Gradient Boosting"
)
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
    "accuracy": final_metrics["Accuracy"],
    "precision_weighted": final_metrics["Precision"],
    "recall_weighted": final_metrics["Recall"],
    "f1_weighted": final_metrics["F1-Score"],
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

print(f"\nBest performing model: {best_model_name} (Accuracy: {best_accuracy:.4f})")
print("Saved main model: Gradient Boosting")
print(f"  • Test Accuracy: {final_metrics['Accuracy']:.4f}")
print(f"  • Test Precision (weighted): {final_metrics['Precision']:.4f}")
print(f"  • Test Recall (weighted): {final_metrics['Recall']:.4f}")
print(f"  • Test F1-Score (weighted): {final_metrics['F1-Score']:.4f}")
print(f"  • Number of Crops: {len(label_encoder.classes_)}")
print(f"  • Training Samples: {X_train.shape[0]}")
print(f"  • Test Samples: {X_test.shape[0]}")

print("\n" + "=" * 70)
