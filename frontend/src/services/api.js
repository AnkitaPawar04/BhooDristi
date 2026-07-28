import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout for all requests
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  register: (email, password, firstName = '', lastName = '') =>
    api.post('/auth/register', { 
      email,
      password,
      first_name: firstName,
      last_name: lastName
    }),
  
  login: (email, password) =>
    api.post('/auth/login', { 
      email,
      password
    }),

  sendOTP: (phoneNumber) =>
    api.post('/auth/send-otp', { phone_number: phoneNumber }),
  
  verifyOTP: (phoneNumber, otp, firstName = '', lastName = '') =>
    api.post('/auth/verify-otp', { 
      phone_number: phoneNumber, 
      otp,
      first_name: firstName,
      last_name: lastName
    }),

  getFarmerProfile: (farmerId) =>
    api.get(`/auth/profile/${farmerId}`),

  updateFarmerProfile: (farmerId, profileData) =>
    api.put(`/auth/profile/${farmerId}`, profileData),
};

// Crop APIs
export const cropAPI = {
  predictCrop: (latitude, longitude, season, farmerId, nitrogen = 50, phosphorus = 50, potassium = 50, temperature = 25, humidity = 60, ph = 6.5, rainfall = 100) =>
    api.post('/crop/predict', {
      latitude,
      longitude,
      season,
      farmer_id: farmerId,
      nitrogen,
      phosphorus,
      potassium,
      temperature,
      humidity,
      ph,
      rainfall
    }),
  
  getDistrictCrops: (district) =>
    api.get(`/crop/district/${district}`),
  
  getSupportedCrops: () =>
    api.get('/crop/supported-crops'),
};

// Weather APIs
export const weatherAPI = {
  getCurrentWeather: (latitude, longitude) =>
    api.get(`/weather/current/${latitude}/${longitude}`),
  
  getForecast: (latitude, longitude) =>
    api.get(`/weather/forecast/${latitude}/${longitude}`),
};

// Soil APIs
export const soilAPI = {
  getSoilData: (district) =>
    api.get(`/soil/${district}`),
};

// Irrigation APIs
export const irrigationAPI = {
  predictIrrigation: (requestData) =>
    api.post('/irrigation/predict', requestData),
  
  getIrrigationHistory: (farmerId) =>
    api.get(`/irrigation/history/${farmerId}`),
};

// Admin APIs
export const adminAPI = {
  adminLogin: (email, password) =>
    api.post('/admin/login', { email, password }),
  
  getAllFarmers: () =>
    api.get('/admin/farmers'),
  
  getAllPredictions: () =>
    api.get('/admin/predictions'),
  
  getDistrictAnalysis: () =>
    api.get('/admin/district-analysis'),

  getAllDistricts: () =>
    api.get('/admin/districts'),
  
  getStatistics: () =>
    api.get('/admin/statistics'),
  
  deleteFarmer: (farmerId) =>
    api.delete(`/admin/farmers/${farmerId}`),
  
  getSupportedCrops: () =>
    api.get('/crop/supported-crops'),
};

export default api;
