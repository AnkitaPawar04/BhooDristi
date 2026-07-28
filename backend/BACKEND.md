# 🔧 Backend Documentation

## Overview

BhooDristi Backend is a FastAPI-based REST API that powers the crop recommendation system. It integrates machine learning models with real-time data processing to provide intelligent agricultural recommendations.

**Tech Stack:**
- FastAPI 0.104.1
- Uvicorn Web Server
- SQLAlchemy ORM
- PostgreSQL Database
- Scikit-learn ML Models
- Python 3.10+

---

## 📁 Project Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app initialization
│   ├── __init__.py
│   ├── database/               # Database configuration
│   │   ├── config.py          # SQLAlchemy setup
│   │   └── __init__.py
│   ├── models/                 # SQLAlchemy models
│   │   ├── farmer.py          # Farmer & Prediction models
│   │   ├── soil.py            # Soil data model
│   │   └── __init__.py
│   ├── routes/                 # API endpoints
│   │   ├── auth.py            # Authentication endpoints
│   │   ├── crop.py            # Crop prediction endpoints
│   │   ├── admin.py           # Admin analytics
│   │   ├── weather.py         # Weather data
│   │   ├── soil.py            # Soil analysis
│   │   └── __init__.py
│   ├── utils/                  # Utility functions
│   │   ├── model_inference.py # ML model wrapper
│   │   ├── location.py        # Geolocation services
│   │   ├── soil_database.py   # Soil data lookup
│   │   ├── auth.py            # Authentication helpers
│   │   ├── otp.py             # OTP generation
│   │   └── __init__.py
│   └── __pycache__/
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Docker configuration
└── README.md
```

---

## 🚀 Getting Started

### Installation

```bash
cd backend
pip install -r requirements.txt
```

### Environment Setup

Create `.env` file:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/BhooDristi
SECRET_KEY=your-secret-key-here
OPENWEATHERMAP_API_KEY=your-api-key
```

### Run Development Server

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Access API docs: `http://localhost:8000/docs`

---

## 🔑 Core Features

### 1. **ML Crop Prediction** ⭐
ML-powered crop recommendations using trained scikit-learn models.

**Endpoint:** `POST /crop/predict`

**Request:**
```json
{
  "latitude": 18.516,
  "longitude": 73.856,
  "season": "Kharif",
  "farmer_id": 1,
  "nitrogen": 60,
  "phosphorus": 50,
  "potassium": 40,
  "temperature": 25,
  "humidity": 70,
  "ph": 6.5,
  "rainfall": 150
}
```

**Response:**
```json
{
  "recommended_crop": "rice",
  "confidence": 92.45,
  "top_crops": ["rice", "maize", "chickpea"],
  "district": "Pune",
  "season": "Kharif"
}
```

**File:** `app/routes/crop.py`

### 2. **Authentication**
- Email/Password registration & login
- Phone OTP verification
- JWT token management
- Role-based access control

**Endpoints:**
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/send-otp`
- `POST /auth/verify-otp`

**File:** `app/routes/auth.py`

### 3. **Crop Management**
- Get supported crops (22 total)
- District-wise crop analysis
- Prediction history

**Endpoints:**
- `GET /crop/supported-crops`
- `GET /crop/district/{district}`
- `GET /crop/history/{farmer_id}`

**File:** `app/routes/crop.py`

### 4. **Weather Integration**
- Real-time weather data
- Historical weather analysis
- Weather-based recommendations

**Endpoints:**
- `GET /weather/current/{lat}/{lon}`
- `GET /weather/forecast/{district}`

**File:** `app/routes/weather.py`

### 5. **Soil Analysis**
- Soil data by district
- Nutrient level analysis
- pH and mineral composition

**Endpoints:**
- `GET /soil/{district}`
- `POST /soil/analyze`

**File:** `app/routes/soil.py`

### 6. **Admin Dashboard**
- Farmer management
- Prediction analytics
- District analysis
- System statistics

**Endpoints:**
- `GET /admin/farmers`
- `GET /admin/predictions`
- `GET /admin/district-analysis`
- `GET /admin/statistics`

**File:** `app/routes/admin.py`

---

## 🤖 ML Model Integration

### Model Wrapper: `app/utils/model_inference.py`

**Usage:**
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

print(result)
# {
#   "recommended_crop": "coffee",
#   "confidence": 8.96,
#   "top_crops": [...]
# }
```

### Supported Crops (22)
apple, banana, blackgram, chickpea, coconut, coffee, cotton, grapes, jute, kidneybeans, lentil, maize, mango, mothbeans, mungbean, muskmelon, orange, papaya, pigeonpeas, pomegranate, rice, watermelon

### Model Performance
- **Accuracy:** 99.09%
- **Cross-Validation:** 98.86% ± 0.70%
- **Prediction Time:** <100ms
- **Framework:** Scikit-learn (Gradient Boosting)

---

## 📊 Database Models

### Farmer Model
```python
class Farmer(Base):
    __tablename__ = "farmers"
    
    id: Integer (Primary Key)
    email: String (Unique)
    phone: String
    first_name: String
    last_name: String
    district: String
    latitude: Float
    longitude: Float
    created_at: DateTime
```

### Prediction Model
```python
class Prediction(Base):
    __tablename__ = "predictions"
    
    id: Integer (Primary Key)
    farmer_id: Integer (Foreign Key)
    district: String
    season: String
    recommended_crop: String
    confidence: Float
    top_crops: JSON
    created_at: DateTime
```

---

## 🔐 Authentication

### JWT Token Flow
1. User logs in with credentials
2. Backend validates and generates JWT token
3. Token includes user_id, role, expiry
4. Client stores token in localStorage
5. All requests include: `Authorization: Bearer {token}`

### OTP Verification
Uses Twilio for SMS OTP delivery:
```python
from app.utils.otp import generate_otp, send_otp_sms
```

---

## 🗺️ Location Services

### District Detection
```python
from app.utils.location import get_district_from_coordinates

district = get_district_from_coordinates(18.516, 73.856)
# Returns: "Pune"
```

Supports all Maharashtra districts.

---

## 🌍 Soil Database

### Lookup Soil Data
```python
from app.utils.soil_database import get_soil_data

soil = get_soil_data("Pune")
# Returns: {
#   "nitrogen": {...},
#   "phosphorus": {...},
#   "potassium": {...},
#   "ph": {...}
# }
```

---

## 📝 API Documentation

### Online Swagger UI
```
http://localhost:8000/docs
```

### ReDoc Alternative
```
http://localhost:8000/redoc
```

### Health Check
```bash
GET /health
```

---

## 🔄 CORS Configuration

Frontend origins allowed:
- `http://localhost:3000`
- `http://localhost:5173`
- `*` (for development)

**File:** `app/main.py`

---

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | 0.104.1 | Web framework |
| uvicorn | 0.24.0 | ASGI server |
| sqlalchemy | 2.0.23 | ORM |
| pydantic | 2.5.0 | Data validation |
| scikit-learn | 1.3.2 | ML models |
| joblib | 1.3.2 | Model serialization |
| requests | 2.31.0 | HTTP requests |
| python-dotenv | 1.0.0 | Environment vars |

---

## ⚙️ Configuration

### Database Connection
```python
DATABASE_URL = "postgresql://user:password@localhost:5432/BhooDristi"
```

### JWT Settings
```python
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
```

### External APIs
```python
OPENWEATHERMAP_API_KEY = "your-api-key"
TWILIO_ACCOUNT_SID = "your-account-sid"
TWILIO_AUTH_TOKEN = "your-auth-token"
```

---

## 🧪 Testing

Run tests:
```bash
pytest
```

Test coverage:
```bash
pytest --cov=app
```

---

## 🐳 Docker

### Build Image
```bash
docker build -t BhooDristi-backend .
```

### Run Container
```bash
docker run -p 8000:8000 BhooDristi-backend
```

---

## 📊 Database Migrations

Using Alembic (if set up):

```bash
# Create migration
alembic revision --autogenerate -m "Add user table"

# Apply migration
alembic upgrade head
```

---

## 🚀 Deployment

### Production Checklist
- [ ] Set strong SECRET_KEY
- [ ] Use PostgreSQL (not SQLite)
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up database backups
- [ ] Configure logging
- [ ] Use environment variables
- [ ] Set DEBUG=False

### Deployment Platforms
1. **Heroku**: `git push heroku main`
2. **AWS**: EC2 with Gunicorn
3. **Azure**: App Service
4. **DigitalOcean**: App Platform
5. **Railway**: Easy deployment

---

## 🐛 Common Issues

**Issue:** Port 8000 already in use
```bash
fuser -k 8000/tcp
```

**Issue:** Database connection error
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure database exists

**Issue:** ML models not loading
- Check model files exist in `ai/models/`
- Verify numpy/scikit-learn versions match

---

## 📈 Performance Optimization

1. **Database Indexing:** Add indexes on farmer_id, created_at
2. **Caching:** Redis for frequently accessed data
3. **Model Caching:** Load models once at startup
4. **Query Optimization:** Use select() with specific columns
5. **Rate Limiting:** Add rate limiting middleware

---

## 📝 Logging

Configure logging:
```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
```

---

## ✨ Future Enhancements

- [ ] Real-time WebSocket updates
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] SMS notifications
- [ ] Integration with IoT sensors
- [ ] Blockchain for transparent records

---

## 📞 Support

1. Check API docs: `http://localhost:8000/docs`
2. Review logs in console
3. See README.md for general setup
4. Check individual route files for specific endpoints
