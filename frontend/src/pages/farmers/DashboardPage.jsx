import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { useApp } from '../../contexts/AppContext';
import { getTranslation, getCropTranslation, getDistrictTranslation } from '../../utils/i18n';
import { weatherAPI, soilAPI } from '../../services/api';
import { TemperatureTrendChart, RainfallChart, SoilNutrientsChart, CropPerformanceChart } from '../../charts/Charts';
import useGeolocation from '../../hooks/useGeolocation';
import MaharashtraMap from '../../maps/MaharashtraMap';
import dashboardBgVideo from './videos/dashboard.mp4';
// Page-level icons removed per UI change

const DashboardPage = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { language } = useApp();
  const { location, loading: locationLoading, error: locationError, getLocation } = useGeolocation();
  const [weather, setWeather] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [district, setDistrict] = useState('');
  const [soilData, setSoilData] = useState(null);

  // Get user role from storage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = localStorage.getItem('is_admin') === 'true' || user.email === 'ankita.pawar19@gmail.com';
  const userRole = isAdmin ? 'admin' : 'farmer';
  const userName = user.firstName || (userRole === 'admin' ? 'Admin' : 'Farmer');

  // Redirect admin users to admin dashboard
  useEffect(() => {
    if (isAdmin) {
      localStorage.setItem('is_admin', 'true');
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAdmin, navigate]);

  // Mock analytics data
  const temperatureData = [
    { day: 'Mon', temp: 28 },
    { day: 'Tue', temp: 30 },
    { day: 'Wed', temp: 29 },
    { day: 'Thu', temp: 32 },
    { day: 'Fri', temp: 31 },
    { day: 'Sat', temp: 27 },
    { day: 'Sun', temp: 25 },
  ];

  const rainfallData = [
    { day: 'Mon', rainfall: 5 },
    { day: 'Tue', rainfall: 0 },
    { day: 'Wed', rainfall: 12 },
    { day: 'Thu', rainfall: 8 },
    { day: 'Fri', rainfall: 3 },
    { day: 'Sat', rainfall: 0 },
    { day: 'Sun', rainfall: 15 },
  ];

  const mockSoilData = {
    nitrogen: 45,
    phosphorus: 35,
    potassium: 58,
    ph: 6.8,
  };

  const mapLocation = selectedLocation || location;
  const weatherDisplay = weather || {
    description: 'Detect your current location to load live weather',
    temperature: '--',
    humidity: '--',
    rainfall: '--',
  };

  const cropPerformanceData = [
    { crop: 'Sugarcane', yield: 85 },
    { crop: 'Maize', yield: 72 },
    { crop: 'Cotton', yield: 68 },
    { crop: 'Wheat', yield: 80 },
    { crop: 'Rice', yield: 78 },
  ];

  useEffect(() => {
    if (location) {
      setSelectedLocation(location);
      fetchWeather(location.latitude, location.longitude);
    }
  }, [location]);

  const fetchWeather = async (lat, lon) => {
    try {
      const response = await weatherAPI.getCurrentWeather(lat, lon);
      setWeather(response.data);
      setSelectedLocation({ latitude: lat, longitude: lon });
    } catch (err) {
      console.error('Failed to fetch weather:', err);
    }
  };

  return (
    <div className="flex h-screen bg-transparent dark:bg-transparent">
      <Sidebar currentPage="dashboard" onNavigate={onNavigate} userName={userName} />
      
      <div className="flex-1 overflow-auto farm-dashboard relative">
        {/* Background Video - Slow Cinematic Playback */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="dashboard-bg-video"
          ref={(video) => {
            if (video) video.playbackRate = 0.5;
          }}
        >
          <source src={dashboardBgVideo} type="video/mp4" />
        </video>

        {/* Dashboard Content Wrapper */}
        <div className="dashboard-content relative z-10">
          <div className="p-8 relative z-10">
          <div className="page-header animate-fadeInUp">
            <h1 className="page-title">
              {userRole === 'admin' ? getTranslation(language, 'adminDashboard') : getTranslation(language, 'dashboard')}
            </h1>
            <p className="page-subtitle">
              {userRole === 'admin' 
                ? `${getTranslation(language, 'welcome')}, Administrator! ${getTranslation(language, 'monitorSystem')}.`
                : `${getTranslation(language, 'welcome')}, ${userName}! Live monitor of your farm`
              }
            </p>
            <div className="page-divider"></div>
          </div>

          {/* Location and Map Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 animate-fadeInUp" style={{animationDelay: '0.1s'}}>
            <div className="farm-card bg-yellow-100 dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-green-200 dark:border-green-700 overflow-hidden transition-shadow duration-300 p-0">
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 text-white">
                <h2 className="text-2xl font-bold flex items-center gap-3">{getTranslation(language, 'yourLocation')}</h2>
                <p className="text-green-100 mt-1 text-sm">Your Farm Position</p>
              </div>
              <div className="p-4">
                <button
                  onClick={getLocation}
                  disabled={locationLoading}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2.5 px-4 rounded-xl mb-4 transition disabled:opacity-50 shadow-lg text-sm"
                >
                  {locationLoading ? getTranslation(language, 'gettingLocation') : getTranslation(language, 'detectCurrentLocation')}
                </button>
                {locationError && (
                  <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 p-3 rounded mb-3 text-red-700 dark:text-red-200 text-sm">
                    {locationError}
                  </div>
                )}
                {mapLocation && (
                  <div className="space-y-3 text-gray-700 dark:text-gray-200">
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border-l-4 border-green-500">
                      <p className="text-xs text-green-700 dark:text-green-300">Latitude</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">{mapLocation.latitude.toFixed(4)}°</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border-l-4 border-blue-500">
                      <p className="text-xs text-blue-700 dark:text-blue-300">Longitude</p>
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{mapLocation.longitude.toFixed(4)}°</p>
                    </div>
                    {district && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border-l-4 border-yellow-500">
                        <p className="text-xs text-yellow-700 dark:text-yellow-300">District</p>
                        <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{getDistrictTranslation(district, language)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-emerald-200 dark:border-emerald-700 overflow-hidden transition-shadow duration-300 p-0" style={{animationDelay: '0.15s'}}>
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 text-white">
                <h2 className="text-2xl font-bold flex items-center gap-3">Farm Map</h2>
                <p className="text-emerald-100 mt-1 text-sm">Live view of your farm location</p>
              </div>
              <div className="p-4 space-y-3">
                <MaharashtraMap
                  onLocationSelect={(lat, lon) => {
                    setSelectedLocation({ latitude: lat, longitude: lon });
                    fetchWeather(lat, lon);
                  }}
                  selectedLocation={mapLocation}
                  className="w-full h-64 rounded-xl overflow-hidden border-2 border-emerald-200 dark:border-emerald-700"
                />
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-sm text-emerald-900 dark:text-emerald-100">
                  Click anywhere on the map to adjust the marker.
                </div>
              </div>
            </div>
          </div>

          {/* Weather + Summary Section */}
          <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-5 mb-6 animate-fadeInUp" style={{animationDelay: '0.2s'}}>
            <div className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-blue-200 dark:border-blue-700 overflow-hidden transition-shadow duration-300 p-0 dashboard-compact-card">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 text-white">
                <h2 className="text-xl font-bold flex items-center gap-2">{getTranslation(language, 'weatherInformationLabel')}</h2>
                <p className="text-blue-100 mt-1 text-xs">{weatherDisplay.description}</p>
              </div>
              <div className="p-3 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-3">
                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border-2 border-orange-300 dark:border-orange-700 text-center flex flex-col justify-center min-h-[220px] lg:min-h-[240px]">
                  <p className="text-orange-700 dark:text-orange-300 text-xs font-semibold">Temperature</p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-3">{weatherDisplay.temperature}°C</p>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg border-2 border-blue-300 dark:border-blue-700 text-center flex flex-col justify-center min-h-[68px]">
                    <p className="text-blue-700 dark:text-blue-300 text-xs font-semibold">Humidity</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{weatherDisplay.humidity}%</p>
                  </div>
                  <div className="bg-cyan-50 dark:bg-cyan-900/20 p-2.5 rounded-lg border-2 border-cyan-300 dark:border-cyan-700 text-center flex flex-col justify-center min-h-[68px]">
                    <p className="text-cyan-700 dark:text-cyan-300 text-xs font-semibold">Rainfall</p>
                    <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">{weatherDisplay.rainfall}mm</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-2.5 rounded-lg border-2 border-green-300 dark:border-green-700 text-center flex flex-col justify-center min-h-[68px]">
                    <p className="text-green-700 dark:text-green-300 text-xs font-semibold">Condition</p>
                    <p className="text-sm font-bold text-green-600 dark:text-green-400 mt-1">{weather ? 'Good' : 'Waiting'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="dashboard-stat-card dashboard-stat-card-compact">
                <div className="stat-card-icon green"></div>
                <h3 className="stat-card-title">Total Predictions</h3>
                <p className="stat-card-value">--</p>
                <p className="stat-card-desc">Total crop suggestions</p>
              </div>

              <div className="dashboard-stat-card dashboard-stat-card-compact">
                <div className="stat-card-icon blue"></div>
                <h3 className="stat-card-title">Last Recommendation</h3>
                <p className="stat-card-value"></p>
                <p className="stat-card-desc">Best crop for season</p>
              </div>

              <div className="dashboard-stat-card dashboard-stat-card-compact">
                <div className="stat-card-icon green"></div>
                <h3 className="stat-card-title">Farm Health</h3>
                <p className="stat-card-value status-good">Good</p>
                <p className="stat-card-desc">Farm conditions optimal</p>
              </div>
            </div>
          </div>

          {/* Analytics Section */}
          <div className="mt-8 mb-6 animate-fadeInUp" style={{animationDelay: '0.4s'}}>
            <div className="bg-gradient-to-r from-green-600 to-green-700 dark:from-green-800 dark:to-green-900 text-white rounded-2xl p-4 shadow-xl mb-4 border-4 border-green-300 dark:border-green-700">
              <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">{getTranslation(language, 'analyticsInsights')}</h2>
              <p className="text-green-100 text-sm">Monitor your farm's health and performance in real-time</p>
            </div>
            
            {/* Temperature and Rainfall Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-orange-200 dark:border-orange-700 overflow-hidden transition-shadow duration-300 dashboard-compact-card">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-3 text-white">
                  <h3 className="text-lg font-bold flex items-center gap-2">{getTranslation(language, 'temperatureTrend')}</h3>
                  <p className="text-orange-100 mt-1 text-xs">Weekly temperature changes</p>
                </div>
                <div className="p-3">
                  <div style={{ position: 'relative', height: '160px' }}>
                    <TemperatureTrendChart data={temperatureData} />
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-2.5 rounded-lg border-l-4 border-orange-500 mt-2.5">
                    <p className="text-orange-700 dark:text-orange-300 text-sm font-semibold">Average Temperature</p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">29°C</p>
                    <p className="text-orange-600 dark:text-orange-300 text-xs mt-1">Ideal for monsoon crops</p>
                  </div>
                </div>
              </div>

              <div className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-blue-200 dark:border-blue-700 overflow-hidden transition-shadow duration-300 dashboard-compact-card" style={{animationDelay: '0.05s'}}>
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 text-white">
                  <h3 className="text-lg font-bold flex items-center gap-2">{getTranslation(language, 'rainfallPattern')}</h3>
                  <p className="text-blue-100 mt-1 text-xs">Weekly rainfall distribution</p>
                </div>
                <div className="p-3">
                  <div style={{ position: 'relative', height: '160px' }}>
                    <RainfallChart data={rainfallData} />
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg border-l-4 border-blue-500 mt-2.5">
                    <p className="text-blue-700 dark:text-blue-300 text-sm font-semibold">Total Rainfall</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">43mm</p>
                    <p className="text-blue-600 dark:text-blue-300 text-xs mt-1">Good moisture for crops</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Soil Nutrients and Crop Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-green-200 dark:border-green-700 overflow-hidden transition-shadow duration-300 dashboard-compact-card">
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 text-white">
                  <h3 className="text-lg font-bold flex items-center gap-2">{getTranslation(language, 'soilNutrients')}</h3>
                  <p className="text-green-100 mt-1 text-xs">Soil health analysis</p>
                </div>
                <div className="p-3">
                  <div style={{ position: 'relative', height: '150px' }}>
                    <SoilNutrientsChart data={mockSoilData} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-center p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-300 dark:border-green-700">
                      <p className="text-green-700 dark:text-green-300 text-xs font-bold">pH LEVEL</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{mockSoilData.ph}</p>
                      <p className="text-green-600 dark:text-green-300 text-xs mt-1">Optimal</p>
                    </div>
                    <div className="text-center p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-300 dark:border-blue-700">
                      <p className="text-blue-700 dark:text-blue-300 text-xs font-bold">MOISTURE</p>
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">65%</p>
                      <p className="text-blue-600 dark:text-blue-300 text-xs mt-1">Good</p>
                    </div>
                    <div className="text-center p-2.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border-2 border-yellow-300 dark:border-yellow-700">
                      <p className="text-yellow-700 dark:text-yellow-300 text-xs font-bold">STATUS</p>
                      <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">Good</p>
                      <p className="text-yellow-600 dark:text-yellow-300 text-xs mt-1">Healthy</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-purple-200 dark:border-purple-700 overflow-hidden transition-shadow duration-300 dashboard-compact-card" style={{animationDelay: '0.05s'}}>
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-3 text-white">
                  <h3 className="text-lg font-bold flex items-center gap-2">{getTranslation(language, 'cropPerformance')}</h3>
                  <p className="text-purple-100 mt-1 text-xs">Your crops' yield data</p>
                </div>
                <div className="p-3">
                  <div style={{ position: 'relative', height: '150px' }}>
                    <CropPerformanceChart data={cropPerformanceData} />
                  </div>
                  <div className="mt-3 p-2.5 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-l-4 border-purple-500 rounded-lg">
                    <p className="text-purple-900 dark:text-purple-100 font-bold">Smart Recommendation</p>
                    <p className="text-purple-800 dark:text-purple-200 text-sm mt-2">Your sugarcane shows excellent yield performance (85%). Consider expanding cultivation area for better returns.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default DashboardPage;
