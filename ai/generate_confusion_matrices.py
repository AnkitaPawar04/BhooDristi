#!/usr/bin/env python
"""Generate publication-ready confusion matrices for the project's ML models.

The evaluator intentionally reproduces the preprocessing and train/test splits
from the training scripts. It evaluates the production crop model and the
production irrigation model by default. Use --crop-models all to also evaluate
the crop-model comparison set saved by train_models.py.
"""

from __future__ import annotations

import argparse
import pickle
from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import ConfusionMatrixDisplay, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier


AI_DIR = Path(__file__).resolve().parent
DATA_DIR = AI_DIR / "datasets"
MODEL_DIR = AI_DIR / "models"
OUTPUT_DIR = AI_DIR / "confusion_matrices"

CROP_FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
CROP_MODELS = {
    "Gradient Boosting (production)": GradientBoostingClassifier(
        n_estimators=200, learning_rate=0.1, max_depth=5, random_state=42
    ),
    "Random Forest": RandomForestClassifier(
        n_estimators=200, max_depth=15, random_state=42
    ),
    "Decision Tree": DecisionTreeClassifier(max_depth=10, random_state=42),
    "KNN": KNeighborsClassifier(n_neighbors=5),
    "SVM": SVC(kernel="rbf", probability=True, random_state=42),
}

IRRIGATION_CATEGORICAL = [
    "Soil_Type", "Crop_Type", "Crop_Growth_Stage", "Season",
    "Irrigation_Type", "Water_Source", "Mulching_Used", "Region",
]
IRRIGATION_NUMERIC = [
    "Soil_pH", "Soil_Moisture", "Organic_Carbon", "Electrical_Conductivity",
    "Temperature_C", "Humidity", "Rainfall_mm", "Sunlight_Hours",
    "Wind_Speed_kmh", "Field_Area_hectare", "Previous_Irrigation_mm",
]


def save_matrix(y_true, y_pred, labels, title: str, filename: str) -> None:
    """Save a count matrix as PNG, PDF, and CSV for paper preparation."""
    matrix = confusion_matrix(y_true, y_pred, labels=range(len(labels)))
    pd.DataFrame(matrix, index=labels, columns=labels).to_csv(
        OUTPUT_DIR / f"{filename}.csv", index_label="true\\predicted"
    )

    figure_size = max(10, len(labels) * 0.48)
    fig, ax = plt.subplots(figsize=(figure_size, figure_size))
    display = ConfusionMatrixDisplay(confusion_matrix=matrix, display_labels=labels)
    display.plot(ax=ax, cmap="Blues", xticks_rotation=90, values_format="d", colorbar=True)
    ax.set_title(title)
    ax.set_xlabel("Predicted label")
    ax.set_ylabel("True label")
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / f"{filename}.png", dpi=300, bbox_inches="tight")
    fig.savefig(OUTPUT_DIR / f"{filename}.pdf", bbox_inches="tight")
    plt.close(fig)


def evaluate_crop_models(crop_models: str) -> None:
    data = pd.read_csv(DATA_DIR / "AgroData" / "Crop_recommendation.csv").drop_duplicates()
    x = data[CROP_FEATURES]
    labels = sorted(data["label"].unique())
    label_to_id = {label: index for index, label in enumerate(labels)}
    y = data["label"].map(label_to_id)

    scaler = StandardScaler()
    x_scaled = scaler.fit_transform(x)
    x_train, x_test, y_train, y_test = train_test_split(
        x_scaled, y, test_size=0.3, random_state=42, stratify=y
    )

    selected = CROP_MODELS if crop_models == "all" else {
        "Gradient Boosting (production)": CROP_MODELS["Gradient Boosting (production)"]
    }
    results = []
    for name, model in selected.items():
        model.fit(x_train, y_train)
        predictions = model.predict(x_test)
        filename = "crop_" + name.lower().replace(" (production)", "").replace(" ", "_")
        save_matrix(
            y_test,
            predictions,
            labels,
            f"Crop recommendation - {name} (test set)",
            filename,
        )
        results.append({"task": "crop recommendation", "model": name,
                        "test_accuracy": (predictions == y_test).mean(),
                        "test_samples": len(y_test)})

    pd.DataFrame(results).to_csv(OUTPUT_DIR / "metrics_summary.csv", index=False)


def evaluate_irrigation_model() -> None:
    data = pd.read_csv(DATA_DIR / "irrigation_prediction.csv").dropna(subset=["Irrigation_Need"])
    x = data[IRRIGATION_CATEGORICAL + IRRIGATION_NUMERIC].copy()
    for column in IRRIGATION_CATEGORICAL:
        encoder = joblib.load(MODEL_DIR / "encoders.pkl")[column]
        x[column] = encoder.transform(x[column].astype(str))
    for column in IRRIGATION_NUMERIC:
        x[column] = x[column].fillna(x[column].mean())

    target_encoder = joblib.load(MODEL_DIR / "target_encoder.pkl")
    y = target_encoder.transform(data["Irrigation_Need"])
    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=100, max_depth=15, min_samples_split=5,
        min_samples_leaf=2, random_state=42, n_jobs=-1, class_weight="balanced"
    )
    model.fit(x_train, y_train)
    predictions = model.predict(x_test)
    labels = list(target_encoder.classes_)
    save_matrix(
        y_test,
        predictions,
        labels,
        "Irrigation need - Random Forest (test set)",
        "irrigation_random_forest",
    )

    metrics_path = OUTPUT_DIR / "metrics_summary.csv"
    existing = pd.read_csv(metrics_path) if metrics_path.exists() else pd.DataFrame()
    irrigation_metrics = pd.DataFrame([{
        "task": "irrigation need", "model": "Random Forest (production)",
        "test_accuracy": (predictions == y_test).mean(), "test_samples": len(y_test),
    }])
    pd.concat([existing, irrigation_metrics], ignore_index=True).to_csv(metrics_path, index=False)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--crop-models", choices=("production", "all"), default="production",
        help="Evaluate only production Gradient Boosting or all five crop models.",
    )
    parser.add_argument(
        "--task", choices=("all", "crop", "irrigation"), default="all",
        help="Select which project task to evaluate.",
    )
    args = parser.parse_args()
    OUTPUT_DIR.mkdir(exist_ok=True)

    if args.task in ("all", "crop"):
        evaluate_crop_models(args.crop_models)
    if args.task in ("all", "irrigation"):
        evaluate_irrigation_model()
    print(f"Confusion matrices written to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()