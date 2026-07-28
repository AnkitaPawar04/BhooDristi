# 🤖 AI & ML Documentation

## Overview

The AI/ML component of BhooDristi handles data processing, model training, and crop prediction. It includes trained scikit-learn models achieving 99% accuracy on crop recommendations.

**Tech Stack:**
- Python 3.10+
- Scikit-learn 1.8.0
- Pandas 3.0.1
- NumPy 2.4.3
- Joblib 1.5.3

---

## 📁 Project Structure

```
ai/
├── train_models.py             # Model training script
├── utils.py                    # Utility functions
├── datasets/
│   ├── AgroData/              # Data folder
│   │   ├── Crop_recommendation.csv          # Training data (2200 samples)
│   │   ├── CropDataset-Enhanced.csv         # Geographic data
│   │   ├── BhooDristi_cleaned_full_dataset.csv
│   │   ├── BhooDristi_district_dataset.csv
│   │   └── *.pkl              # Pre-trained models
│   └── README.md
├── models/                     # Trained models directory
│   ├── BhooDristi_gb_model.pkl            # Main Gradient Boosting model (8.8MB)
│   ├── BhooDristi_random_forest_model.pkl # Alternative model (6.8MB)
│   ├── BhooDristi_gradient_boosting_model.pkl
│   ├── BhooDristi_decision_tree_model.pkl
│   ├── BhooDristi_knn_model.pkl
│   ├── BhooDristi_svm_model.pkl
│   ├── scaler.pkl              # Feature normalization
│   ├── label_encoder.pkl       # Crop category encoding
│   ├── BhooDristi_features.pkl
│   ├── BhooDristi_classes.pkl
│   └── model_metadata.pkl      # Model info
└── README.md
```

---

## 🚀 Quick Start

### 1. Data Preparation
Data files are pre-loaded in `datasets/AgroData/`:
- `Crop_recommendation.csv`: 2,200 samples × 8 features
- `CropDataset-Enhanced.csv`: Geographic & soil data

### 2. Model Training
```bash
cd ai
python train_models.py
```

**Output:**
- Trains 5 ML models
- Compares accuracy
- Saves best model & components
- Creates 11 pickle files

### 3. Using Trained Models
```python
from pathlib import Path
import joblib

# Load model
model = joblib.load("models/BhooDristi_gb_model.pkl")
scaler = joblib.load("models/scaler.pkl")

# Prepare features
features = [[60, 50, 40, 25, 70, 6.5, 150]]  # N, P, K, T, H, pH, R
scaled = scaler.transform(features)

# Predict
prediction = model.predict(scaled)
print(prediction)  # ['rice']
```

---

## 📊 Dataset Details

### Crop Recommendation Dataset
**File:** `datasets/AgroData/Crop_recommendation.csv`

| Column | Type | Range | Description |
|--------|------|-------|-------------|
| N | Integer | 0-140 | Nitrogen content (mg/kg) |
| P | Integer | 5-145 | Phosphorus content (mg/kg) |
| K | Integer | 5-205 | Potassium content (mg/kg) |
| temperature | Float | 10-45 | Temperature (°C) |
| humidity | Float | 10-100 | Humidity (%) |
| ph | Float | 3.5-9.9 | Soil pH |
| rainfall | Float | 20-300 | Rainfall (mm) |
| label | String | - | Crop type (22 classes) |

**Stats:**
- Total Samples: 2,200
- Samples per Crop: 100
- Missing Values: 0
- Class Balance: Perfect (100 each)

### Geographic Dataset
**File:** `datasets/AgroData/CropDataset-Enhanced.csv`

Contains:
- District names & coordinates
- Latitude/Longitude
- Soil nutrient percentages
- pH levels

---

## 🤖 Models Trained

### Model Comparison

| Model | Test Accuracy | CV Accuracy | Training Time |
|-------|---------------|-------------|---------------|
| **Gradient Boosting** | 99.09% | 98.86% ± 0.70% | ~30s |
| Random Forest | 99.39% | 99.45% ± 0.23% | ~15s |
| SVM | 98.94% | 98.23% ± 0.17% | ~5s |
| Decision Tree | 98.03% | 97.68% ± 0.83% | ~1s |
| KNN | 97.88% | 97.14% ± 0.59% | <1s |

### Selected Model: Gradient Boosting
**Why?** Balance of accuracy and inference speed for production use.

**Hyperparameters:**
```python
GradientBoostingClassifier(
    n_estimators=200,
    learning_rate=0.1,
    max_depth=5,
    random_state=42
)
```

**Characteristics:**
- Robust to outliers
- Handles mixed feature types
- Good generalization
- <100ms prediction time

---

## 🔄 Model Training Pipeline

```python
# 1. Load Data
crop_df = pd.read_csv("Crop_recommendation.csv")
geo_df = pd.read_csv("CropDataset-Enhanced.csv")

# 2. Data Cleaning
crop_df = crop_df.drop_duplicates()
crop_df = crop_df.dropna()

# 3. Feature Extraction
features = ['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']
X = crop_df[features]
y = crop_df['label']

# 4. Label Encoding
label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)

# 5. Feature Scaling
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# 6. Train/Test Split (70/30)
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y_encoded, test_size=0.3, 
    random_state=42, stratify=y_encoded
)

# 7. Model Training
model = GradientBoostingClassifier(...)
model.fit(X_train, y_train)

# 8. Evaluation
accuracy = model.score(X_test, y_test)
print(f"Accuracy: {accuracy:.4f}")  # 0.9909

# 9. Cross-Validation
cv_scores = cross_val_score(model, X_scaled, y_encoded, cv=5)
print(f"CV: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

# 10. Save Models
joblib.dump(model, "model.pkl")
joblib.dump(scaler, "scaler.pkl")
joblib.dump(label_encoder, "encoder.pkl")
```

---

## 📦 Supported Crops (22)

| Category | Crops |
|----------|-------|
| **Cereals** | Rice, Maize, Jute, Cotton |
| **Pulses** | Chickpea, Lentil, Kidneybeans, Mothbeans, Mungbean, Pigeonpeas, Blackgram |
| **Fruits** | Apple, Banana, Mango, Orange, Grapes, Watermelon, Muskmelon, Papaya, Pomegranate, Coconut |
| **Beverages** | Coffee |

---

## 🔧 Prediction Function

### Input Parameters

```python
def predict(
    nitrogen: float = 50,           # 0-140
    phosphorus: float = 50,         # 5-145
    potassium: float = 50,          # 5-205
    temperature: float = 25,        # 10-45°C
    humidity: float = 60,           # 10-100%
    ph: float = 6.5,                # 3.5-9.9
    rainfall: float = 100           # 20-300mm
) -> Dict
```

### Output Format

```python
{
    "recommended_crop": "rice",
    "confidence": 92.45,
    "top_crops": [
        {"crop": "rice", "confidence": 92.45},
        {"crop": "maize", "confidence": 5.30},
        {"crop": "chickpea", "confidence": 2.25}
    ],
    "input_features": {
        "nitrogen": 60,
        "phosphorus": 50,
        ...
    }
}
```

---

## 📝 Model Files Description

| File | Size | Purpose |
|------|------|---------|
| `BhooDristi_gb_model.pkl` | 8.8 MB | Primary Gradient Boosting model |
| `BhooDristi_random_forest_model.pkl` | 6.8 MB | Random Forest (99.39% accuracy) |
| `scaler.pkl` | 1.0 KB | StandardScaler for features |
| `label_encoder.pkl` | 0.7 KB | Crop label encoder |
| `BhooDristi_features.pkl` | 0.1 KB | Feature list |
| `BhooDristi_classes.pkl` | 0.6 KB | Supported crops |
| `model_metadata.pkl` | 0.4 KB | Model information |

---

## 🎯 Feature Engineering Details

### Features Used
1. **Nitrogen (N)** - Primary macronutrient
2. **Phosphorus (P)** - Root development
3. **Potassium (K)** - Plant strength
4. **Temperature** - Climate suitability
5. **Humidity** - Moisture availability
6. **pH** - Soil acidity/alkalinity
7. **Rainfall** - Water availability

### Feature Importance
(From Gradient Boosting model)
- Temperature: ~30%
- Rainfall: ~25%
- N, P, K: ~15% each
- Humidity: ~10%
- pH: ~5%

---

## 🧪 Model Validation Metrics

### Classification Report
```
              precision    recall  f1-score   support
apple           0.99      0.99      0.99        67
banana          0.99      0.99      0.99        66
chickpea        0.99      0.99      0.99        66
...
accuracy                           0.99       660
```

### Confusion Matrix
- True Positives: 653/660 (98.9%)
- False Positives: Minimal (~0.1%)
- False Negatives: Minimal (~1%)

---

## 🔄 Retraining Process

### When to Retrain?
- New seasonal data available
- Model accuracy drops <95%
- New crop types added
- Regional expansion needed

### Steps:
```bash
# 1. Update datasets
# 2. Run training script
python train_models.py

# 3. Compare accuracy
# 4. If improved, deploy new models
# 5. Update model_metadata.pkl version
```

---

## 📊 Data Preprocessing

### Cleaning Steps
1. **Duplicate Removal:** Remove identical rows
2. **Missing Values:** Drop NaN values
3. **Outlier Detection:** IQR method (if needed)
4. **Feature Scaling:** StandardScaler normalization
5. **Label Encoding:** Convert crop names to integers

### Train/Test Split
- Training: 70% (1,540 samples)
- Testing: 30% (660 samples)
- Stratification: Maintain class distribution
- Random State: 42 (reproducible)

---

## 🚀 Integration with Backend

### Model Inference Module
**File:** `backend/app/utils/model_inference.py`

```python
from app.utils.model_inference import get_model

model = get_model()
result = model.predict(
    nitrogen=60,
    phosphorus=50,
    potassium=40,
    temperature=25,
    humidity=70,
    ph=6.5,
    rainfall=150
)
```

---

## 📈 Performance Monitoring

### Metrics to Track
- Prediction accuracy
- Inference time
- Model size
- Memory usage
- User satisfaction

### Logging

```python
import logging

logger = logging.getLogger(__name__)
logger.info(f"Prediction: {crop}, Confidence: {confidence}%")
```

---

## 🐛 Troubleshooting

**Issue:** Model not loading
```python
# Check if pickle files exist
from pathlib import Path
print(Path("models/BhooDristi_gb_model.pkl").exists())
```

**Issue:** Different predictions on different runs
```python
# Set random seeds
np.random.seed(42)
model.random_state = 42
```

**Issue:** Scikit-learn version mismatch warning
- Update scikit-learn: `pip install --upgrade scikit-learn`
- Retrain models with new version

---

## ✨ Future Enhancements

- [ ] Deep Learning (TensorFlow/PyTorch)
- [ ] Real-time model monitoring
- [ ] Automated retraining pipeline
- [ ] A/B testing for new models
- [ ] IoT sensor integration
- [ ] Ensemble models
- [ ] Model explainability (SHAP)
- [ ] Climate change adaptation

---

## 🔗 Dependencies

```bash
pip install scikit-learn==1.8.0
pip install pandas==3.0.1
pip install numpy==2.4.3
pip install joblib==1.5.3
```

---

## 📚 Resources

- **Scikit-learn Docs:** https://scikit-learn.org/
- **Pandas Guide:** https://pandas.pydata.org/
- **Model Persistence:** https://scikit-learn.org/stable/model_persistence.html
- **Gradient Boosting:** https://towardsdatascience.com/gradient-boosting-explained-9b237fe58eae

---

## 📞 Support

1. Check model pickle files exist
2. Verify dataset CSV files
3. Run `verify_integration.py`
4. Check BACKEND.md for integration issues
