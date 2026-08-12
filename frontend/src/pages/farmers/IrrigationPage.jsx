import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import MaharashtraMap from '../../maps/MaharashtraMap';
import { useApp } from '../../contexts/AppContext';
import { getTranslation, getDistrictTranslation } from '../../utils/i18n';
import { irrigationAPI } from '../../services/api';
import useGeolocation from '../../hooks/useGeolocation';
import dashboardBgVideo from './videos/dashboard.mp4';

const IrrigationPage = ({ onNavigate }) => {
  const { language } = useApp();
  const { location, getLocation } = useGeolocation();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [district, setDistrict] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [submittedData, setSubmittedData] = useState(null);

  // Irrigation parameters
  const [irrigationParams, setIrrigationParams] = useState({
    soil_moisture: 50,
    temperature_c: 25,
    humidity: 60,
    rainfall_mm: 0,
    crop_type: 'Sugarcane',
    soil_type: 'Loamy',
    crop_growth_stage: 'Vegetative',
    previous_irrigation_mm: 0,
    soil_ph: 7.0,
    organic_carbon: 0.8,
    electrical_conductivity: 0.5,
    sunlight_hours: 8,
    wind_speed_kmh: 5,
    field_area_hectare: 1.0,
    season: 'Kharif',
    irrigation_type: 'Drip',
    water_source: 'Groundwater',
    mulching_used: 'No',
    region: 'Western',
  });

  const cropTypes = ['Sugarcane', 'Maize', 'Cotton', 'Wheat', 'Rice', 'Jowar', 'Pulse', 'Groundnut', 'Soybean', 'Potato'];
  const soilTypes = ['Sandy', 'Loamy', 'Clay', 'Silt', 'Peaty'];
  const growthStages = ['Germination', 'Sowing', 'Vegetative', 'Flowering', 'Fruiting/Grain Development', 'Harvest', 'Maturity'];
  const seasons = ['Kharif', 'Rabi', 'Zaid'];
  const irrigationTypes = ['Canal', 'Drip', 'Rainfed', 'Sprinkler'];
  const waterSources = ['Groundwater', 'Rainwater', 'Reservoir', 'River'];
  const mulchingOptions = ['Yes', 'No'];
  const regions = ['Western', 'Central', 'Northern', 'Eastern', 'Southern', 'Vidarbha'];

  const handleMapClick = (lat, lon) => {
    setSelectedLocation({ latitude: lat, longitude: lon });
    setPrediction(null);
    setError('');
    determineDistrict(lat, lon);
  };

  const determineDistrict = (lat, lon) => {
    const districts = [
      // Western Maharashtra
      { name: 'Pune', lat: 18.516, lon: 73.856 },
      { name: 'Satara', lat: 17.665, lon: 73.912 },
      { name: 'Kolhapur', lat: 16.702, lon: 73.735 },
      { name: 'Solapur', lat: 17.656, lon: 75.905 },
      // Northern Maharashtra
      { name: 'Nashik', lat: 19.997, lon: 73.791 },
      { name: 'Jalgaon', lat: 21.160, lon: 75.569 },
      { name: 'Dhule', lat: 21.196, lon: 74.774 },
      { name: 'Nandurbar', lat: 21.374, lon: 74.226 },
      // Eastern Maharashtra
      { name: 'Amravati', lat: 20.844, lon: 77.804 },
      { name: 'Akola', lat: 20.714, lon: 76.995 },
      { name: 'Buldhana', lat: 20.503, lon: 76.177 },
      { name: 'Washim', lat: 20.109, lon: 76.778 },
      { name: 'Yavatmal', lat: 20.384, lon: 77.775 },
      // Central Maharashtra
      { name: 'Aurangabad', lat: 19.876, lon: 75.343 },
      { name: 'Parbhani', lat: 19.268, lon: 76.774 },
      { name: 'Latur', lat: 18.379, lon: 76.508 },
      { name: 'Hingoli', lat: 19.717, lon: 77.154 },
      // Vidarbha
      { name: 'Nagpur', lat: 21.146, lon: 79.089 },
      { name: 'Wardha', lat: 20.763, lon: 78.609 },
      { name: 'Bhandara', lat: 21.305, lon: 79.263 },
      { name: 'Chandrapur', lat: 19.278, lon: 79.294 },
      { name: 'Gondia', lat: 21.443, lon: 80.189 },
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

  const handleParameterChange = (param, value) => {
    setIrrigationParams((prev) => ({
      ...prev,
      [param]: isNaN(parseFloat(value)) ? value : parseFloat(value),
    }));
  };

  const handleGetPrediction = async () => {
    if (!selectedLocation) {
      setError('Please select a location on the map');
      return;
    }

    setLoading(true);
    setError('');
    setPrediction(null);

    try {
      const farmerId = localStorage.getItem('farmer_id') || 1;
      const response = await irrigationAPI.predictIrrigation({
        farmer_id: farmerId,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        ...irrigationParams,
      });

      setPrediction(response.data);
      setSubmittedData({
        location: district,
        timestamp: new Date().toLocaleString(),
        ...irrigationParams,
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to get irrigation prediction. Please try again.');
      console.error('Prediction error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPredictionColor = (predictionClass) => {
    switch (predictionClass) {
      case 'High':
        return 'border-red-500 bg-red-50';
      case 'Medium':
        return 'border-yellow-500 bg-yellow-50';
      case 'Low':
        return 'border-green-500 bg-green-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const getPredictionIcon = (predictionClass) => {
    // icons removed; return empty string
    return '';
  };

  return (
    <div className="flex h-screen bg-transparent">
      <Sidebar currentPage="irrigation" onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Background Video - Slow Cinematic Playback */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover"
          ref={(video) => {
            if (video) video.playbackRate = 0.5;
          }}
        >
          <source src={dashboardBgVideo} type="video/mp4" />
        </video>

        <div className="relative z-10 flex-1 overflow-y-auto">
          <div className="p-8">
            {/* Header */}
          <div className="page-header animate-fadeInUp">
            <h1 className="page-title">{getTranslation(language, 'irrigationPrediction')}</h1>
            <p className="page-subtitle">{getTranslation(language, 'getIrrigationPrediction') || 'Get AI-powered irrigation recommendations for optimal water management'}</p>
            <div className="page-divider"></div>
          </div>

          {/* Map and Inputs Section */}
          <div className="space-y-6">
              {/* Map Section */}
              <div className="map-card">
                <h2>{getTranslation(language, 'selectYourFarmLocation')}</h2>
                <div className="map-card-inner">
                  <MaharashtraMap onLocationSelect={handleMapClick} selectedLocation={selectedLocation} />
                </div>
                {selectedLocation && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-700">
                      <strong>Selected Location:</strong> {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
                    </p>
                    <p className="text-sm text-gray-700 mt-2">
                      <strong>Detected District:</strong> {district}
                    </p>
                  </div>
                )}
              </div>

              {/* Input Parameters Section */}
              <div className="params-card">
                <h2>{getTranslation(language, 'environmentalCropParameters')}</h2>

                <div className="params-grid">
                  {/* Soil Moisture */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {getTranslation(language, 'soilMoisture')} (%) - {irrigationParams.soil_moisture}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={irrigationParams.soil_moisture}
                      onChange={(e) => handleParameterChange('soil_moisture', e.target.value)}
                      className="w-full h-2 bg-gradient-to-r from-red-400 to-green-400 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">0% = {getTranslation(language, 'dry')}, 100% = {getTranslation(language, 'saturated')}</p>
                  </div>

                  {/* Temperature */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {getTranslation(language, 'temperature')} (°C) - {irrigationParams.temperature_c}°C
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="45"
                      value={irrigationParams.temperature_c}
                      onChange={(e) => handleParameterChange('temperature_c', e.target.value)}
                      className="w-full h-2 bg-gradient-to-r from-blue-400 to-orange-400 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">{getTranslation(language, 'typicalRange')}: 15-35°C</p>
                  </div>

                  {/* Humidity */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {getTranslation(language, 'humidity')} (%) - {irrigationParams.humidity}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={irrigationParams.humidity}
                      onChange={(e) => handleParameterChange('humidity', e.target.value)}
                      className="w-full h-2 bg-gradient-to-r from-orange-400 to-blue-400 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">0% = {getTranslation(language, 'dry')}, 100% = {getTranslation(language, 'saturated')}</p>
                  </div>

                  {/* Rainfall */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {getTranslation(language, 'recentRainfall')} (mm) - {irrigationParams.rainfall_mm}mm
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={irrigationParams.rainfall_mm}
                      onChange={(e) => handleParameterChange('rainfall_mm', e.target.value)}
                      className="w-full h-2 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">{getTranslation(language, 'lastSevenDays')}</p>
                  </div>

                  {/* Crop Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{getTranslation(language, 'cropType')}</label>
                    <select
                      value={irrigationParams.crop_type}
                      onChange={(e) => handleParameterChange('crop_type', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {cropTypes.map((crop) => (
                        <option key={crop} value={crop}>
                          {crop}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Soil Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{getTranslation(language, 'soilTypeLabel')}</label>
                    <select
                      value={irrigationParams.soil_type}
                      onChange={(e) => handleParameterChange('soil_type', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {soilTypes.map((soil) => (
                        <option key={soil} value={soil}>
                          {soil}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Growth Stage */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{getTranslation(language, 'cropGrowthStage')}</label>
                    <select
                      value={irrigationParams.crop_growth_stage}
                      onChange={(e) => handleParameterChange('crop_growth_stage', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {growthStages.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Previous Irrigation */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Previous Irrigation (mm) - {irrigationParams.previous_irrigation_mm}mm
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={irrigationParams.previous_irrigation_mm}
                      onChange={(e) => handleParameterChange('previous_irrigation_mm', e.target.value)}
                      className="w-full h-2 bg-gradient-to-r from-indigo-400 to-teal-400 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">Last irrigation amount</p>
                  </div>

                  {/* Soil pH */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Soil pH - {irrigationParams.soil_ph.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="4.5"
                      max="8.5"
                      step="0.1"
                      value={irrigationParams.soil_ph}
                      onChange={(e) => handleParameterChange('soil_ph', e.target.value)}
                      className="w-full h-2 bg-gradient-to-r from-red-400 to-blue-400 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">4.5 = Acidic, 7 = Neutral, 8.5 = Alkaline</p>
                  </div>

                  {/* Organic Carbon */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Organic Carbon (%) - {irrigationParams.organic_carbon.toFixed(1)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="3"
                      step="0.1"
                      value={irrigationParams.organic_carbon}
                      onChange={(e) => handleParameterChange('organic_carbon', e.target.value)}
                      className="w-full h-2 bg-gradient-to-r from-orange-600 to-green-400 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">Soil organic matter content</p>
                  </div>

                  {/* Electrical Conductivity */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {getTranslation(language, 'electricalConductivity')} (dS/m) - {irrigationParams.electrical_conductivity.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.05"
                      value={irrigationParams.electrical_conductivity}
                      onChange={(e) => handleParameterChange('electrical_conductivity', e.target.value)}
                      className="w-full h-2 bg-gradient-to-r from-cyan-400 to-indigo-400 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">Soil salinity indicator</p>
                  </div>

                  {/* Season */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{getTranslation(language, 'season')}</label>
                    <select
                      value={irrigationParams.season}
                      onChange={(e) => handleParameterChange('season', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {seasons.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Irrigation Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{getTranslation(language, 'irrigationType')}</label>
                    <select
                      value={irrigationParams.irrigation_type}
                      onChange={(e) => handleParameterChange('irrigation_type', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {irrigationTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Water Source */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{getTranslation(language, 'waterSource')}</label>
                    <select
                      value={irrigationParams.water_source}
                      onChange={(e) => handleParameterChange('water_source', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {waterSources.map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sunlight Hours */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {getTranslation(language, 'sunlightHours')} - {irrigationParams.sunlight_hours}h
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="14"
                      step="0.5"
                      value={irrigationParams.sunlight_hours}
                      onChange={(e) => handleParameterChange('sunlight_hours', e.target.value)}
                      className="w-full h-2 bg-gradient-to-r from-gray-400 to-yellow-400 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">Daily sunlight exposure</p>
                  </div>

                  {/* Wind Speed */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {getTranslation(language, 'windSpeedKmh')} - {irrigationParams.wind_speed_kmh}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="0.5"
                      value={irrigationParams.wind_speed_kmh}
                      onChange={(e) => handleParameterChange('wind_speed_kmh', e.target.value)}
                      className="w-full h-2 bg-gradient-to-r from-slate-400 to-blue-400 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">{getTranslation(language, 'windSpeedKmh')}</p>
                  </div>

                  {/* Field Area */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {getTranslation(language, 'fieldAreaHectare')} - {irrigationParams.field_area_hectare.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={irrigationParams.field_area_hectare}
                      onChange={(e) => handleParameterChange('field_area_hectare', e.target.value)}
                      className="w-full h-2 bg-gradient-to-r from-green-400 to-emerald-600 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">Total farm area</p>
                  </div>

                  {/* Mulching */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{getTranslation(language, 'mulchingUsed')}</label>
                    <select
                      value={irrigationParams.mulching_used}
                      onChange={(e) => handleParameterChange('mulching_used', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {mulchingOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Region */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{getTranslation(language, 'region')}</label>
                    <select
                      value={irrigationParams.region}
                      onChange={(e) => handleParameterChange('region', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {regions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 font-semibold">{error}</p>
                  </div>
                )}

                {/* Get Prediction Button */}
                <button
                  onClick={handleGetPrediction}
                  disabled={loading || !selectedLocation}
                  className={`w-full mt-8 py-4 font-bold text-lg rounded-lg transition flex items-center justify-center gap-2 ${
                    loading || !selectedLocation
                      ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-lg hover:scale-105 transform'
                  }`}
                >
                  {loading ? (
                    <>
                      <span className="animate-spin"></span>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <span></span>
                      {getTranslation(language, 'getIrrigationPrediction')}
                    </>
                  )}
                </button>
              </div>

              {/* Prediction Results Section */}
              {prediction && (
                <div className={`params-card border-4 ${getPredictionColor(prediction.prediction)}`}>
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800">
                      {getTranslation(language, 'irrigationNeeded')}: <span className="text-3xl">{prediction.prediction}</span>
                    </h3>
                    <div className="mt-3 inline-block">
                      <span className="text-lg font-semibold text-gray-700">
                        {getTranslation(language, 'confidence')}: {(prediction.confidence || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Prediction Details */}
                  <div className="space-y-4 mb-6 border-t-2 border-gray-200 pt-4">
                    <div className="bg-white bg-opacity-60 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 font-semibold">{getTranslation(language, 'waterAmount')}</p>
                      <p className="text-xl font-bold text-blue-600">
                        {prediction.water_amount_liters_per_m2 || 'N/A'}
                      </p>
                    </div>

                    <div className="bg-white bg-opacity-60 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 font-semibold">{getTranslation(language, 'irrigationAction')}</p>
                      <p className="text-xl font-bold text-gray-800">
                        {prediction.irrigate_action || 'N/A'}
                      </p>
                    </div>

                    {/* Advice Section */}
                    <div className="bg-white bg-opacity-60 p-4 rounded-lg border-l-4 border-blue-500">
                      <p className="text-sm text-gray-600 font-semibold mb-2">{getTranslation(language, 'expertAdvice')}</p>
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {prediction.advice || 'No specific advice at this time'}
                      </p>
                    </div>
                  </div>

                  {/* Submitted Data Summary */}
                  {submittedData && (
                    <div className="bg-white bg-opacity-60 p-4 rounded-lg border-t-2 border-gray-200 mt-4">
                      <p className="text-xs text-gray-600 font-semibold mb-2">{getTranslation(language, 'inputSummary')}</p>
                      <div className="text-xs space-y-1 text-gray-700">
                        <p><strong>{getTranslation(language, 'location')}:</strong> {submittedData.location}</p>
                        <p><strong>{getTranslation(language, 'crop')}:</strong> {submittedData.crop_type} ({submittedData.crop_growth_stage})</p>
                        <p><strong>{getTranslation(language, 'soilTypeLabel')}:</strong> {submittedData.soil_type}</p>
                        <p><strong>{getTranslation(language, 'soilMoisture')}:</strong> {submittedData.soil_moisture}%</p>
                        <p><strong>{getTranslation(language, 'temperature')}:</strong> {submittedData.temperature_c}°C</p>
                        <p><strong>{getTranslation(language, 'time')}:</strong> {submittedData.timestamp}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IrrigationPage;
