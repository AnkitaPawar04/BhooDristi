import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { useApp } from '../../contexts/AppContext';
import { getTranslation, getDistrictTranslation } from '../../utils/i18n';
import { weatherAPI, soilAPI } from '../../services/api';
import useGeolocation from '../../hooks/useGeolocation';
import dashboardBgVideo from './videos/dashboard.mp4';

const WeatherPage = ({ onNavigate }) => {
  const { language } = useApp();
  const { location, error: locationError, getLocation, loading: locationLoading } = useGeolocation();
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [soilData, setSoilData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [district, setDistrict] = useState('');

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (location) {
      fetchWeatherData(location.latitude, location.longitude);
    }
  }, [location]);

  const fetchWeatherData = async (lat, lon) => {
    setLoading(true);
    try {
      const weatherResponse = await weatherAPI.getCurrentWeather(lat, lon);
      console.log('Weather API Response:', weatherResponse);
      // Handle both response.data and direct response
      const weatherData = weatherResponse.data || weatherResponse;
      setWeather(weatherData);

      // Fetch 5-day forecast
      const forecastResponse = await weatherAPI.getForecast(lat, lon);
      console.log('Forecast API Response:', forecastResponse);
      const forecastData = forecastResponse.data || forecastResponse;
      setForecast(forecastData.forecast);

      // Determine district based on coordinates
      determineDistrict(lat, lon);
    } catch (err) {
      console.error('Failed to fetch weather data:', err);
    } finally {
      setLoading(false);
    }
  };

  const determineDistrict = (lat, lon) => {
    const districts = [
      { name: 'Pune', lat: 18.516, lon: 73.856 },
      { name: 'Satara', lat: 17.665, lon: 73.912 },
      { name: 'Kolhapur', lat: 16.702, lon: 73.735 },
    ];

    let closestDistrict = 'Pune';
    let minDistance = Infinity;

    districts.forEach((d) => {
      const distance = Math.sqrt((lat - d.lat) ** 2 + (lon - d.lon) ** 2);
      if (distance < minDistance) {
        minDistance = distance;
        closestDistrict = d.name;
      }
    });

    setDistrict(closestDistrict);
  };

  const fetchSoilData = async (dist) => {
    try {
      const response = await soilAPI.getSoilData(dist);
      setSoilData(response.data);
    } catch (err) {
      console.error('Failed to fetch soil data:', err);
    }
  };

  const handleFetchSoilData = () => {
    fetchSoilData(district);
  };

  return (
    <div className="flex h-screen bg-transparent dark:bg-transparent">
      <Sidebar currentPage="weather" onNavigate={onNavigate} userName="Farmer" />
      
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

        <div className="dashboard-content relative z-10">
        <div className="p-8 relative z-10">
          {/* Top Navigation */}
          <div className="page-header animate-fadeInUp">
            <h1 className="page-title">Atmospheric Insight</h1>
            <p className="page-subtitle">Real-time weather monitoring for Sahyadri Valley, Maharashtra</p>
            <div className="page-divider"></div>
          </div>

        {/* Weather Card */}
        <section className="grid grid-cols-1 gap-8 mb-10 animate-fadeInUp" style={{animationDelay: '0.1s'}}>
          {/* Current Weather Card */}
          <div className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-blue-200 dark:border-blue-700 overflow-hidden transition-shadow duration-300">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
              <h2 className="text-3xl font-bold flex items-center gap-3">📊 Current Condition</h2>
              <p className="text-blue-100 mt-2 text-lg">Real-time atmospheric data for your location</p>
            </div>
            
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <button
                    onClick={getLocation}
                    disabled={locationLoading}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl mb-6 transition disabled:opacity-50 shadow-lg text-lg"
                  >
                    {locationLoading ? '📡 Detecting Location...' : '🔄 Refresh Current Location'}
                  </button>
                </div>
              </div>

              {locationError && (
                <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded-lg text-red-700 dark:text-red-200 text-sm mb-6">
                  ⚠️ {locationError}
                </div>
              )}

              {weather ? (
                <div className="bg-gradient-to-br from-blue-50 dark:from-gray-700 to-white dark:to-gray-800 rounded-2xl p-8 text-center border-2 border-blue-100 dark:border-blue-600">
                  <p className="text-blue-700 dark:text-blue-300 text-sm mb-2 font-bold">CURRENT CONDITIONS</p>
                  <p className="text-6xl font-bold text-gray-900 dark:text-white">{weather.temperature}°C</p>
                  <p className="text-xl text-gray-700 dark:text-gray-300 font-semibold mt-4">{weather.description}</p>
                  
                  {/* Weather Details Grid */}
                  <div className="grid grid-cols-3 gap-4 mt-8">
                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded-xl p-4 border-l-4 border-blue-600">
                      <p className="text-blue-700 dark:text-blue-300 text-sm font-semibold">💧 Humidity</p>
                      <p className="text-3xl font-bold text-blue-800 dark:text-blue-200 mt-2">{weather.humidity}%</p>
                    </div>
                    <div className="bg-cyan-100 dark:bg-cyan-900/30 rounded-xl p-4 border-l-4 border-cyan-600">
                      <p className="text-cyan-700 dark:text-cyan-300 text-sm font-semibold">🌧️ Rainfall</p>
                      <p className="text-3xl font-bold text-cyan-800 dark:text-cyan-200 mt-2">{weather.rainfall}mm</p>
                    </div>
                    <div className="bg-indigo-100 dark:bg-indigo-900/30 rounded-xl p-4 border-l-4 border-indigo-600">
                      <p className="text-indigo-700 dark:text-indigo-300 text-sm font-semibold">📍 Location</p>
                      <p className="text-3xl font-bold text-indigo-800 dark:text-indigo-200 mt-2">{district || 'Current Location'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-2xl">
                  <p className="text-gray-700 dark:text-gray-300 text-lg font-semibold">📍 Loading weather for your current location...</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 5-Day Forecast Section */}
        {forecast && forecast.length > 0 && (
          <section className="mb-10 animate-fadeInUp" style={{animationDelay: '0.2s'}}>
            <div className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-green-200 dark:border-green-700 overflow-hidden transition-shadow duration-300">
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
                <h2 className="text-3xl font-bold flex items-center gap-3">📅 5-Day Forecast</h2>
                <p className="text-green-100 mt-2 text-lg">Extended outlook for your region</p>
              </div>
              
              <div className="p-8">
                <div className="grid grid-cols-5 gap-4">
                  {forecast.map((day, index) => (
                    <div key={index} className="bg-gradient-to-br from-green-50 dark:from-gray-700 to-white dark:to-gray-800 rounded-xl p-4 border-2 border-green-100 dark:border-green-600 text-center transition-shadow duration-300">
                      <p className="font-bold text-gray-800 dark:text-white text-lg">{day.day}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{day.date}</p>
                      
                      <div className="mb-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{day.description}</p>
                        <div className="flex justify-around items-center mb-3">
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Max</p>
                            <p className="text-xl font-bold text-red-600">{day.temp_max}°</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Min</p>
                            <p className="text-xl font-bold text-blue-600">{day.temp_min}°</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t border-green-100 dark:border-green-600 pt-3">
                        <div className="flex justify-around text-xs">
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">💧</p>
                            <p className="font-semibold text-gray-700 dark:text-gray-300">{day.humidity}%</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">🌧️</p>
                            <p className="font-semibold text-gray-700 dark:text-gray-300">{day.rainfall}mm</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherPage;
