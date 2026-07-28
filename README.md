# 🌾 BhooDristi - Intelligent Crop Recommendation System

## 📖 Overview

**BhooDristi** is an intelligent agricultural decision support system for Maharashtra farmers. It combines machine learning, geolocation services, and real-time weather data to provide personalized crop recommendations based on soil conditions and local climate.

Built with React + FastAPI + Scikit-learn, it delivers 99% accurate crop predictions to help farmers optimize their harvests.

---

## ✨ Key Features

### 🎯 **Smart Crop Recommendations**
- AI-powered predictions using Gradient Boosting (99.09% accuracy)
- 22 crop types across cereals, pulses, fruits, and beverages
- Real-time recommendations based on soil & weather parameters

### 🗺️ **Maharashtra Geolocation**
- Interactive district map (all 36 districts)
- GPS-based location detection
- Season-aware recommendations (Kharif/Rabi)

### 🌡️ **Real-Time Weather Integration**
- Live weather data from OpenWeatherMap
- Temperature & humidity tracking
- Precipitation forecasts

### 👨‍🌾 **Farmer Profiles**
- Customizable soil parameter management
- Historical recommendation tracking
- Profile-based prefill for faster decisions

### 🔐 **Secure Authentication**
- OTP-based verification
- Role-based access (farmer/admin)
- Firebase integration

### 📊 **Admin Dashboard**
- Farmer management
- Prediction analytics
- System monitoring

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│         Frontend (React + Vite)                 │
│  - CropRecommendation, Dashboard, Profile      │
└──────────────────┬──────────────────────────────┘
                   │ Axios HTTP
                   ↓
┌─────────────────────────────────────────────────┐
│    Backend (FastAPI + SQLAlchemy)              │
│  - Auth Routes, ML Inference, Weather API      │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ↓          ↓          ↓
    ┌────────┐ ┌────────┐ ┌──────────┐
    │   ML   │ │Database│ │ Weather  │
    │ Models │ │(Postgres)
    │ (99%)  │ └────────┘ │ API      │
    └────────┘            └──────────┘
```

---

## 📋 Documentation Structure

This project includes focused documentation for each component:

1. **[FRONTEND.md](FRONTEND.md)** - React UI & Components
   - Setup & development
   - Component architecture
   - Styling & responsive design
   - State management
   - Deployment

2. **[BACKEND.md](BACKEND.md)** - FastAPI Server
   - Project structure
   - API endpoints & ML integration
   - Database models
   - Authentication & JWT
   - Docker & deployment

3. **[AI.md](AI.md)** - Machine Learning
   - Model training pipeline
   - 22 supported crops
   - 99% prediction accuracy
   - Feature engineering
   - Retraining process

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js (v18+)
- PostgreSQL
- Virtual environment

### 1️⃣ **Backend Setup**

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows

# Install dependencies
pip install -r requirements.txt

# Run server 
python app/main.py
# Server runs on http://localhost:8000
# API docs: http://localhost:8000/docs
```

### 2️⃣ **Frontend Setup**

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# App runs on http://localhost:5173
```

### 3️⃣ **Run Both**

**Option A - Separate Terminals:**
```bash
# Terminal 1 - Backend
cd backend && venv\Scripts\activate && python app/main.py

# Terminal 2 - Frontend
cd frontend && npm run dev
```

**Option B - Docker Compose:**
```bash
docker-compose up --build
```

---

## 📊 Feature Matrix

| Feature | Frontend | Backend | AI/ML | Status |
|---------|----------|---------|-------|--------|
| Crop Recommendations | ✅ UI | ✅ API | ✅ 99% | ✅ Live |
| Location Map | ✅ Leaflet | ✅ District DB | - | ✅ Live |
| Weather Integration | ✅ Display | ✅ API Route | - | ✅ Live |
| Farmer Auth | ✅ Forms | ✅ JWT/OTP | - | ✅ Live |
| Admin Dashboard | ✅ Charts | ✅ Analytics | - | ✅ Live |
| Soil Parameters | ✅ Sliders | ✅ Validation | ✅ Input | ✅ Live |
| Profile Management | ✅ UI | ✅ CRUD | - | ✅ Live |
| Historical Data | ✅ Display | ✅ Storage | - | ✅ Live |

---

## 🔧 Technology Stack

### Frontend
- **Framework:** React 18.2.0
- **Build:** Vite 5.0.0
- **Styling:** Tailwind CSS 3.3.0
- **Maps:** Leaflet 1.9.4
- **Charts:** Chart.js 4.4.0
- **HTTP:** Axios 1.6.0
- **State:** React Context API

### Backend
- **Framework:** FastAPI 0.104.1
- **Server:** Uvicorn 0.24.0
- **Database:** SQLAlchemy ORM, PostgreSQL
- **Auth:** JWT, OTP
- **ML:** Scikit-learn 1.8.0
- **APIs:** OpenWeatherMap, Firebase

### AI/ML
- **Primary Model:** Gradient Boosting Classifier
- **Accuracy:** 99.09% test, 98.86% CV
- **Framework:** Scikit-learn 1.8.0
- **Data:** 2,200 samples, 7 features
- **Crops:** 22 types supported
- **Inference Time:** <100ms

---

## 📁 Project Structure

```
BhooDristi/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── database/            # SQLAlchemy models
│   │   ├── routes/              # API endpoints
│   │   │   ├── crop.py         # ML predictions
│   │   │   ├── auth.py
│   │   │   ├── weather.py
│   │   │   └── admin.py
│   │   ├── models/              # DB schemas
│   │   ├── utils/               # Helpers
│   │   │   └── model_inference.py  # ML wrapper
│   │   └── __pycache__/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── pages/              # Components
│   │   │   ├── CropRecommendationPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ProfilePage.jsx
│   │   │   └── AdminLoginPage.jsx
│   │   ├── components/         # UI components
│   │   ├── services/           # API calls
│   │   │   └── api.js         # Axios client
│   │   ├── utils/
│   │   ├── contexts/           # State management
│   │   └── App.jsx
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
│
├── ai/
│   ├── train_models.py         # Model training
│   ├── datasets/               # CSV data files
│   │   └── AgroData/
│   │       ├── Crop_recommendation.csv
│   │       ├── CropDataset-Enhanced.csv
│   │       └── *.pkl           # Trained models
│   ├── models/                 # Model artifacts
│   │   ├── BhooDristi_gb_model.pkl
│   │   ├── scaler.pkl
│   │   └── label_encoder.pkl
│   └── README.md
│
├── docker-compose.yml
├── FRONTEND.md                 # Frontend docs
├── BACKEND.md                  # Backend docs
├── AI.md                       # ML docs
├── README.md                   # This file
└── ARCHITECTURE.md             # System design
```

---

## 🔗 API Endpoints

### Crop Predictions
```
POST /crop/predict
Body: {
  "nitrogen": 60,
  "phosphorus": 50,
  "potassium": 40,
  "temperature": 25,
  "humidity": 70,
  "ph": 6.5,
  "rainfall": 150
}
Response: {
  "recommended_crop": "rice",
  "confidence": 92.45,
  "top_crops": [...]
}
```

### Weather
```
GET /weather/{district}
Response: {
  "district": "Pune",
  "temperature": 28.5,
  "humidity": 65,
  "description": "Clear sky"
}
```

### Authentication
```
POST /auth/request-otp
POST /auth/verify-otp
POST /auth/logout
```

Full API docs: See [BACKEND.md](BACKEND.md)

---

## 🧠 ML Model Performance

### Accuracy Metrics
- **Test Accuracy:** 99.09%
- **Cross-Validation:** 98.86% ± 0.70%
- **Inference Time:** <100ms
- **Training Time:** ~30 seconds

### Supported Crops (22)
| Category | Crops |
|----------|-------|
| Cereals | Rice, Maize, Jute, Cotton |
| Pulses | Chickpea, Lentil, Kidneybeans, Mothbeans, Mungbean, Pigeonpeas, Blackgram |
| Fruits | Apple, Banana, Mango, Orange, Grapes, Watermelon, Muskmelon, Papaya, Pomegranate, Coconut |
| Beverages | Coffee |

### Training Data
- **Total:** 2,200 samples
- **Train/Test:** 70/30 split
- **Features:** 7 (N, P, K, Temperature, Humidity, pH, Rainfall)
- **Classes:** 22 crop types

More details: See [AI.md](AI.md)

This starts:
- Backend: http://localhost:8000
- Frontend: http://localhost:3000
- PostgreSQL: localhost:5432

### Individual Containers
```bash
# Backend
docker build -t BhooDristi-backend ./backend
docker run -p 8000:8000 BhooDristi-backend

# Frontend
docker build -t BhooDristi-frontend ./frontend
docker run -p 3000:3000 BhooDristi-frontend
```

---

## 🔐 Environment Configuration

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost/BhooDristi
WEATHER_API_KEY=your_openweathermap_key
JWT_SECRET=your_jwt_secret
FIREBASE_CONFIG=your_firebase_config
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_CONFIG=your_firebase_config
```

---

## 📱 Screenshots & Features

### Crop Recommendation Flow
1. User selects district on Maharashtra map
2. Chooses growing season (Kharif/Rabi)
3. Adjusts soil parameters (N, P, K)
4. Adds weather data
5. Receives ML prediction with confidence score

### Dashboard Features
- Historical recommendations
- Weather trends
- Crop performance charts
- Profile statistics

---
## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/
```

### Frontend Tests
```bash
cd frontend
npm test
```

---

## 📊 Data Models

### Farmer
```python
{
  "id": 1,
  "phone": "+919876543210",
  "district": "Pune",
  "created_at": "2024-01-01"
}
```

### Prediction
```python
{
  "id": 1,
  "farmer_id": 1,
  "recommended_crop": "rice",
  "confidence": 92.45,
  "input_features": {...},
  "created_at": "2024-01-15"
}
```

See [BACKEND.md](BACKEND.md) for complete schema.

---

## 🔄 CI/CD Pipeline

Recommended setup:
- GitHub Actions for tests
- Auto-build Docker images
- Deploy to container registry
- Auto-deploy on main branch

---

## 📈 Performance Metrics

| Metric | Value |
|--------|-------|
| API Latency | <50ms |
| Model Inference | <100ms |
| Frontend Load | <2s |
| Database Query | <10ms |
| Prediction Accuracy | 99.09% |
| Uptime Target | 99.5% |

---

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check Python version
python --version          # Should be 3.10+

# Check dependencies
pip list | grep scikit-learn

# Verify database
psql -U postgres -d BhooDristi
```

### Frontend Issues
```bash
# Clear cache
npm cache clean --force

# Reinstall dependencies
rm node_modules package-lock.json
npm install

# Check Node version
node --version            # Should be v18+
```

### Model Not Loading
```bash
# Verify pickle files
ls -la ai/models/*.pkl

# Test model loading
python -c "import joblib; m = joblib.load('ai/models/BhooDristi_gb_model.pkl')"
```

See detailed troubleshooting in [FRONTEND.md](FRONTEND.md), [BACKEND.md](BACKEND.md), [AI.md](AI.md).

---

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Update tests
4. Submit pull request
5. Code review required

## 📜 License

MIT License - Feel free to use for educational & commercial purposes.

**Last Updated:** 2026 
**Version:** 1.0.0  
**Status:** Production Ready ✅

🌾 Empowering Maharashtra farmers with AI-driven agriculture 🚀

Output
<img width="1910" height="916" alt="Screenshot 2026-04-18 101943" src="https://github.com/user-attachments/assets/7a982bb4-aa87-40eb-a32a-7a98a8095bf9" />
<img width="1919" height="927" alt="Screenshot 2026-04-18 102055" src="https://github.com/user-attachments/assets/9ae9f647-3e18-42fe-a5e5-07d23f40f3bd" />
<img width="1919" height="919" alt="Screenshot 2026-04-18 102235" src="https://github.com/user-attachments/assets/3aa4ebdd-1861-43fa-a0a4-f7f590f4594c" />
<img width="1891" height="924" alt="Screenshot 2026-04-18 102307" src="https://github.com/user-attachments/assets/417757ca-c5cd-4bff-ae39-ab21da51d216" />
<img width="1918" height="914" alt="Screenshot 2026-04-18 113917" src="https://github.com/user-attachments/assets/4cc0d0bc-6fdb-41c2-8512-add3077cc985" />
<img width="1883" height="920" alt="Screenshot 2026-04-18 103851" src="https://github.com/user-attachments/assets/3f7fe4b1-c399-4f88-bcab-d8a43a0a6f35" />






