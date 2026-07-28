# 🎨 Frontend Documentation

## Overview

BhooDristi Frontend is a React-based web application built with Vite, providing farmers with an intuitive interface for crop recommendations, weather data, and soil analysis.

**Tech Stack:**
- React 18.2.0
- Vite 5.0.0
- Tailwind CSS 3.3.0
- Axios for API calls
- React Router v6
- Chart.js for data visualization
- Leaflet for maps

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── App.jsx                 # Main app component
│   ├── main.jsx                # Entry point
│   ├── index.css               # Global styles
│   ├── pages/                  # Page components
│   │   ├── AdminDashboardPage.jsx
│   │   ├── AdminLoginPage.jsx
│   │   ├── CropRecommendationPage.jsx  # ML predictions
│   │   ├── DashboardPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── SettingsPage.jsx
│   │   └── WeatherPage.jsx
│   ├── components/             # Reusable components
│   │   ├── DistrictSelect.jsx
│   │   ├── LogoutConfirm.jsx
│   │   └── Sidebar.jsx
│   ├── services/               # API communication
│   │   ├── api.js              # Axios instance & endpoints
│   │   ├── authStorage.js      # Token management
│   │   └── firebase.js         # Firebase config
│   ├── contexts/               # React context
│   │   └── AppContext.jsx
│   ├── hooks/                  # Custom hooks
│   │   └── useGeolocation.js
│   ├── maps/                   # Map components
│   │   └── MaharashtraMap.jsx
│   ├── charts/                 # Chart components
│   │   └── Charts.jsx
│   └── utils/                  # Utilities
│       ├── districts.js
│       └── i18n.js
├── package.json
├── vite.config.js
├── tailwind.config.cjs
└── postcss.config.cjs
```

---

## 🚀 Getting Started

### Installation
```bash
cd frontend
npm install
```

### Development Server
```bash
npm run dev
```
Runs on: `http://localhost:5173/`

### Build for Production
```bash
npm run build
npm run preview
```

### Credentials for Testing

#### Admin Login
```
Email: admin.agro@gmail.com
Password: Admin@123
```
- Access admin dashboard and analytics
- Manage farmer data
- View system statistics
- **Role Selection:** Select "Admin" on login page

#### Farmer Registration
- Click "Sign Up" on login page
- Create new account with email and password
- Access farmer dashboard and features

---

## 🔑 Key Features

### 1. **Crop Recommendation Page**
- Interactive Maharashtra map for location selection
- Season selection (Kharif/Rabi)
- Collapsible soil parameters:
  - Nitrogen, Phosphorus, Potassium levels
  - Temperature, Humidity, pH
  - Rainfall
- ML-powered predictions with confidence scores
- Alternative crop suggestions
- **File:** `src/pages/CropRecommendationPage.jsx`

### 2. **Authentication**
- Email/Password login
- Phone OTP verification
- Firebase integration
- Token management in localStorage
- **Files:** `src/pages/LoginPage.jsx`, `src/services/authStorage.js`

#### Admin Credentials
```
Email: admin.agro@gmail.com
Password: Admin@123
```
**Note:** Use the "Admin" role selector on the login page to access admin features.

#### Farmer Registration
- New farmers can register with email/password
- Phone OTP verification for additional security
- Farmer dashboard access after login

### 3. **Dashboard**
- Farmer dashboard with predictions
- Admin dashboard for analytics
- Crop performance charts
- District-wise analysis
- **Files:** `src/pages/DashboardPage.jsx`, `src/pages/AdminDashboardPage.jsx`

### 4. **Weather & Location**
- Real-time weather data display
- District selection
- Geolocation support
- **Files:** `src/pages/WeatherPage.jsx`, `src/components/DistrictSelect.jsx`

### 5. **User Management**
- Profile management
- Settings page
- Logout functionality
- **Files:** `src/pages/ProfilePage.jsx`, `src/pages/SettingsPage.jsx`

---

## 🔗 API Integration

### Base URL
```javascript
const API_BASE_URL = 'http://localhost:8000';
```

### Available Endpoints

**Crop Prediction:**
```javascript
cropAPI.predictCrop(latitude, longitude, season, farmerId, 
  nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall)
```

**Weather:**
```javascript
weatherAPI.getCurrentWeather(latitude, longitude)
```

**Soil Data:**
```javascript
soilAPI.getSoilData(district)
```

**Admin:**
```javascript
adminAPI.getAllFarmers()
adminAPI.getAllPredictions()
adminAPI.getDistrictAnalysis()
adminAPI.getStatistics()
```

**See:** `src/services/api.js`

---

## 🎨 Styling

### Tailwind CSS
- Custom color scheme with green theme
- Dark mode support
- Responsive design
- Mobile-first approach

### Component Classes
```javascript
.card              // Card container
.card-content      // Card inner content
.btn-hover         // Button hover effect
.info-box          // Info notification box
.info-box-red      // Error notification
```

---

## 📱 Responsive Design

- **Desktop:** Full layout with sidebar navigation
- **Tablet:** Collapsible sidebar
- **Mobile:** Bottom navigation or hamburger menu

---

## 🗺️ Maps Integration

**Leaflet Maps:**
- Interactive Maharashtra district map
- Click-based location selection
- Latitude/Longitude display
- **File:** `src/maps/MaharashtraMap.jsx`

---

## 📊 Charts & Visualization

**Chart.js Integration:**
- Crop performance bar charts
- Yield trends
- District comparisons
- **File:** `src/charts/Charts.jsx`

---

## 🔐 Authentication Flow

1. User logs in with email/password or OTP
2. Backend returns access token
3. Token stored in localStorage
4. All API requests include token in header
5. Token auto-refreshed on page load

**Storage:** `src/services/authStorage.js`

---

## 🌍 Geolocation

```javascript
const { location, getLocation } = useGeolocation();
```

Gets user's GPS coordinates when permitted.

---

## 🔄 State Management

**React Context API:**
- App-wide state in `AppContext.jsx`
- User authentication state
- Theme preferences
- Global notifications

---

## ⚙️ Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.js` | Vite build configuration |
| `tailwind.config.cjs` | Tailwind CSS customization |
| `postcss.config.cjs` | PostCSS plugins |
| `package.json` | Dependencies & scripts |

---

## 🐛 Debugging

Enable in browser console:
```javascript
// Check API calls
console.log(response)

// Check React state
debugger;

// DevTools (F12)
```

---

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | 18.2.0 | UI library |
| vite | 5.0.0 | Build tool |
| axios | 1.6.0 | HTTP client |
| leaflet | 1.9.4 | Maps |
| chart.js | 4.4.0 | Charts |
| tailwindcss | 3.3.0 | CSS framework |
| firebase | 10.7.2 | Auth service |

---

## 🚀 Deployment

### Environment Variables
```bash
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_CONFIG={"...": "..."}
```

### Build & Deploy
```bash
npm run build
# Deploy 'dist' folder to hosting service
```

Supported platforms:
- Vercel
- Netlify
- AWS Amplify
- GitHub Pages

---

## 📝 Development Guidelines

1. **Component Structure:** One component per file
2. **Naming:** PascalCase for components, camelCase for functions
3. **Styling:** Use Tailwind classes, avoid inline styles
4. **State:** Use hooks (useState, useEffect, useContext)
5. **API Calls:** Use Axios instance from services/api.js

---

## ✨ Future Enhancements

- [ ] PWA (Progressive Web App) support
- [ ] Offline mode
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Real-time notifications
- [ ] Advanced analytics dashboard

---

## 📞 Support

For issues or questions:
1. Check browser console (F12)
2. Verify backend is running on port 8000
3. Check API response in Network tab
4. See Common Issues section in README.md
