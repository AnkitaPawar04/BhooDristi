import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import MaharashtraMap from '../../maps/MaharashtraMap';
import { useApp } from '../../contexts/AppContext';
import { getTranslation, getDistrictTranslation } from '../../utils/i18n';
import { irrigationAPI } from '../../services/api';
import useGeolocation from '../../hooks/useGeolocation';
import dashboardBgVideo from './videos/dashboard.mp4';

const normalizeIrrigationError = (error) => {
  const detail = error?.response?.data?.detail;

  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    if ('land_cover' in detail || 'class_id' in detail) {
      const className = typeof detail.land_cover === 'string' ? detail.land_cover : '';
      const classId = typeof detail.class_id === 'number' || typeof detail.class_id === 'string' ? String(detail.class_id) : '';
      const detectedClass = className || classId ? ` Detected land-cover class: ${className || classId}${className && classId ? ` (class ${classId})` : ''}.` : '';
      return `Irrigation prediction is available only for agricultural/cropland locations. Please select a farm location.${detectedClass}`;
    }

    if (typeof detail.message === 'string' && detail.message.trim()) {
      return detail.message;
    }

    try {
      return JSON.stringify(detail);
    } catch {
      return 'The request failed. Please try again.';
    }
  }

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'The request failed. Please try again.';
};

const IrrigationPage = ({ onNavigate }) => {
  const { language } = useApp();
  const { location, getLocation, loading: geolocationLoading, error: geolocationError } = useGeolocation();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [district, setDistrict] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [submittedData, setSubmittedData] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [fetchingConditions, setFetchingConditions] = useState(false);
  const [farmPolygon, setFarmPolygon] = useState(null);
  const [farmAreaHectares, setFarmAreaHectares] = useState(null);
  const [showBoundaryDrawing, setShowBoundaryDrawing] = useState(false);

  // Irrigation parameters
  const [irrigationParams, setIrrigationParams] = useState({
    soil_moisture: null,
    temperature_c: null,
    humidity: null,
    rainfall_mm: null,
    crop_type: 'Sugarcane',
    soil_type: '',
    crop_growth_stage: 'Vegetative',
    previous_irrigation_mm: 0,
    soil_ph: null,
    organic_carbon: null,
    electrical_conductivity: null,
    sunlight_hours: null,
    wind_speed_kmh: null,
    field_area_hectare: null,
    season: '',
    irrigation_type: 'Drip',
    water_source: 'Groundwater',
    mulching_used: 'No',
    region: '',
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
    setLocationData(null);
    setFarmPolygon(null);
    setFarmAreaHectares(null);
    setShowBoundaryDrawing(false);
  };

  const handleLocationSelect = (lat, lon, selectedDistrict) => {
    handleMapClick(lat, lon);
    if (selectedDistrict) setDistrict(selectedDistrict);
  };

  const handlePolygonChange = (polygon, area) => {
    setFarmPolygon(polygon);
    setFarmAreaHectares(area);
    setShowBoundaryDrawing(Boolean(polygon));
  };

  useEffect(() => {
    if (location) {
      handleMapClick(location.latitude, location.longitude);
    }
  }, [location]);

  useEffect(() => {
    if (!selectedLocation) return undefined;
    let cancelled = false;
    const fetchConditions = async () => {
      setFetchingConditions(true);
      setError('');
      try {
        const response = await irrigationAPI.getLocationData({ ...selectedLocation, polygon: farmPolygon });
        if (cancelled) return;
        const data = response.data;
        const soil = data.soil?.soil || {};
        const weather = data.weather?.current || {};
        const moisture = data.soil_moisture?.surface_moisture_percent;
        setLocationData(data);
        setDistrict(data.location?.district || district);
        setIrrigationParams((prev) => ({
          ...prev,
          soil_moisture: moisture ?? null,
          temperature_c: weather.temperature ?? null,
          humidity: weather.humidity ?? null,
          rainfall_mm: weather.rainfall ?? null,
          wind_speed_kmh: weather.wind_speed_kmh ?? null,
          soil_ph: soil.ph ?? null,
          organic_carbon: soil.organic_carbon ?? null,
          soil_type: soil.clay != null && soil.sand != null ? (soil.sand > soil.clay ? 'Sandy' : 'Clay') : '',
          season: data.season || '',
          region: data.location?.region || '',
        }));
      } catch (err) {
        if (!cancelled) setError(normalizeIrrigationError(err));
      } finally {
        if (!cancelled) setFetchingConditions(false);
      }
    };
    fetchConditions();
    return () => { cancelled = true; };
  }, [selectedLocation, farmPolygon]);

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
    const fieldArea = farmPolygon ? farmAreaHectares : irrigationParams.field_area_hectare;
    if (!Number.isFinite(fieldArea) || fieldArea < 0.1 || fieldArea > 1000) {
      setError('Enter a farm area between 0.1 and 1000 hectares, or draw a farm boundary.');
      return;
    }
    if (!locationData || irrigationParams.soil_moisture == null || irrigationParams.temperature_c == null) {
      setError('Farm conditions are not available yet. Please wait for the location data to load.');
      return;
    }
    setLoading(true);
    setError('');
    setPrediction(null);

    try {
      const farmerId = localStorage.getItem('farmer_id') || 1;
      const {
        electrical_conductivity: electricalConductivity,
        sunlight_hours: sunlightHours,
        ...predictionParams
      } = irrigationParams;
      const response = await irrigationAPI.predictIrrigation({
        farmer_id: farmerId,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        ...predictionParams,
        ...(electricalConductivity != null && electricalConductivity !== ''
          ? { electrical_conductivity: electricalConductivity }
          : {}),
        ...(sunlightHours != null && sunlightHours !== ''
          ? { sunlight_hours: sunlightHours }
          : {}),
        field_area_hectare: fieldArea,
        ...(farmPolygon ? { polygon: farmPolygon } : {}),
      });

      setPrediction(response.data);
      setSubmittedData({
        location: district,
        timestamp: new Date().toLocaleString(),
        ...irrigationParams,
        field_area_hectare: fieldArea,
      });
    } catch (err) {
      setError(normalizeIrrigationError(err));
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
          <div className="p-4 sm:p-6 lg:p-8">
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h2>{getTranslation(language, 'selectYourFarmLocation')}</h2>
                  <button
                    type="button"
                    onClick={getLocation}
                    disabled={geolocationLoading}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg border border-blue-600 text-blue-700 font-semibold hover:bg-blue-50 disabled:opacity-60"
                  >
                    {geolocationLoading ? 'Finding your location...' : 'Use my current location'}
                  </button>
                </div>
                {geolocationError && <p className="mt-2 text-sm text-red-700">Unable to get your location: {geolocationError}</p>}

                <div className="mt-4 mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h3 className="font-semibold text-gray-800">Farm Boundary (Optional)</h3>
                  <p className="mt-1 text-sm text-gray-700">You can skip drawing the boundary and enter your farm area manually.</p>
                  <label className="mt-3 flex items-start gap-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={showBoundaryDrawing || Boolean(farmPolygon)}
                      disabled={Boolean(farmPolygon)}
                      onChange={(event) => setShowBoundaryDrawing(event.target.checked)}
                      className="mt-1 h-4 w-4 accent-blue-600 disabled:opacity-60"
                    />
                    <span>Draw a boundary for a more precise farm area (optional)</span>
                  </label>
                </div>

                <div className="map-card-inner">
                    <MaharashtraMap
                      onLocationSelect={handleLocationSelect}
                      selectedLocation={selectedLocation}
                      enablePolygonDrawing={showBoundaryDrawing || Boolean(farmPolygon)}
                      polygon={farmPolygon}
                      onPolygonChange={handlePolygonChange}
                    />
                </div>
                {selectedLocation && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-700">
                      <strong>Selected Location:</strong> {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
                    </p>
                    <p className="text-sm text-gray-700 mt-2">
                      <strong>Detected District:</strong> {district}
                    </p>
                    <p className="text-sm text-gray-700 mt-2">
                      <strong>Farm Area:</strong> {farmPolygon && farmAreaHectares != null ? `${farmAreaHectares.toFixed(2)} hectares (boundary estimate; server recalculates)` : irrigationParams.field_area_hectare != null ? `${irrigationParams.field_area_hectare} hectares (manual)` : 'Enter manually below or draw an optional boundary'}
                    </p>
                    {fetchingConditions && <p className="text-sm text-blue-700 mt-2">Fetching farm conditions...</p>}
                    {locationData && !fetchingConditions && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                        <span>Soil moisture: {irrigationParams.soil_moisture ?? 'Unavailable'}% · NASA SMAP / Earth Engine</span>
                        <span>Weather: {irrigationParams.temperature_c ?? 'Unavailable'}°C · Open-Meteo</span>
                        <span>Soil pH: {irrigationParams.soil_ph ?? 'Unavailable'} · SoilGrids estimated</span>
                        <span>Organic carbon: {irrigationParams.organic_carbon ?? 'Unavailable'}% · SoilGrids estimated</span>
                        <span>Wind: {irrigationParams.wind_speed_kmh ?? 'Unavailable'} km/h · Open-Meteo</span>
                        <span>Season: {irrigationParams.season || 'Unavailable'} · calendar-derived</span>
                      </div>
                    )}
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
                      {getTranslation(language, 'soilMoisture')} (%) - {irrigationParams.soil_moisture ?? 'Unavailable'}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={irrigationParams.soil_moisture ?? ''}
                      disabled
                      onChange={(e) => handleParameterChange('soil_moisture', e.target.value)}
                      className="w-full h-2 bg-gradient-to-r from-red-400 to-green-400 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">0% = {getTranslation(language, 'dry')}, 100% = {getTranslation(language, 'saturated')}</p>
                  </div>

                  {/* Temperature */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {getTranslation(language, 'temperature')} (°C) - {irrigationParams.temperature_c ?? 'Unavailable'}°C
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="45"
                      value={irrigationParams.temperature_c ?? ''}
                      disabled
                      onChange={(e) => handleParameterChange('temperature_c', e.target.value)}
                      className="w-full h-2 bg-gradient-to-r from-blue-400 to-orange-400 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">{getTranslation(language, 'typicalRange')}: 15-35°C</p>
                  </div>

                  {/* Humidity */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {getTranslation(language, 'humidity')} (%) - {irrigationParams.humidity ?? 'Unavailable'}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={irrigationParams.humidity ?? ''}
                      disabled
                      onChange={(e) => handleParameterChange('humidity', e.target.value)}
                      className="w-full h-2 bg-gradient-to-r from-orange-400 to-blue-400 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">0% = {getTranslation(language, 'dry')}, 100% = {getTranslation(language, 'saturated')}</p>
                  </div>

                  {/* Rainfall */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {getTranslation(language, 'recentRainfall')} (mm) - {irrigationParams.rainfall_mm ?? 'Unavailable'}mm
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={irrigationParams.rainfall_mm ?? ''}
                      disabled
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
                      value={irrigationParams.soil_type ?? ''}
                      onChange={(e) => handleParameterChange('soil_type', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select soil type</option>
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
                      Soil pH - {irrigationParams.soil_ph == null ? 'Unavailable' : irrigationParams.soil_ph.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="4.5"
                      max="8.5"
                      step="0.1"
                      value={irrigationParams.soil_ph ?? ''}
                      disabled
                      onChange={(e) => handleParameterChange('soil_ph', e.target.value)}
                      className="w-full h-2 bg-gradient-to-r from-red-400 to-blue-400 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">4.5 = Acidic, 7 = Neutral, 8.5 = Alkaline</p>
                  </div>

                  {/* Organic Carbon */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Organic Carbon (%) - {irrigationParams.organic_carbon == null ? 'Unavailable' : irrigationParams.organic_carbon.toFixed(1)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="3"
                      step="0.1"
                      value={irrigationParams.organic_carbon ?? ''}
                      disabled
                      onChange={(e) => handleParameterChange('organic_carbon', e.target.value)}
                      className="w-full h-2 bg-gradient-to-r from-orange-600 to-green-400 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">Soil organic matter content</p>
                  </div>

                  {/* Electrical Conductivity */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {getTranslation(language, 'electricalConductivity')} (dS/m) - {irrigationParams.electrical_conductivity == null || irrigationParams.electrical_conductivity === '' ? 'Optional' : Number(irrigationParams.electrical_conductivity).toFixed(2)}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.05"
                      value={irrigationParams.electrical_conductivity ?? ''}
                      onChange={(e) => handleParameterChange('electrical_conductivity', e.target.value)}
                      placeholder="Optional"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Optional. Enter the value from a soil-test report if available.</p>
                  </div>

                  {/* Season */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{getTranslation(language, 'season')}</label>
                    <select
                      value={irrigationParams.season ?? ''}
                      disabled
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
                      {getTranslation(language, 'sunlightHours')} - {irrigationParams.sunlight_hours == null || irrigationParams.sunlight_hours === '' ? 'Optional' : `${irrigationParams.sunlight_hours}h`}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={irrigationParams.sunlight_hours ?? ''}
                      onChange={(e) => handleParameterChange('sunlight_hours', e.target.value)}
                      placeholder="Optional"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Optional. Leave blank if unknown.</p>
                  </div>

                  {/* Wind Speed */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {getTranslation(language, 'windSpeedKmh')} - {irrigationParams.wind_speed_kmh ?? 'Unavailable'}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="0.5"
                      value={irrigationParams.wind_speed_kmh ?? ''}
                      disabled
                      onChange={(e) => handleParameterChange('wind_speed_kmh', e.target.value)}
                      className="w-full h-2 bg-gradient-to-r from-slate-400 to-blue-400 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">{getTranslation(language, 'windSpeedKmh')}</p>
                  </div>

                  {/* Field Area */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {getTranslation(language, 'fieldAreaHectare')} (hectares)
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      max="1000"
                      step="0.01"
                      value={farmPolygon ? farmAreaHectares ?? '' : irrigationParams.field_area_hectare ?? ''}
                      disabled={Boolean(farmPolygon)}
                      onChange={(e) => handleParameterChange('field_area_hectare', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">{farmPolygon ? 'Area is calculated from your boundary; the server-side polygon area is authoritative.' : 'Enter your total farm area. Allowed range: 0.1–1000 hectares.'}</p>
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
                      value={irrigationParams.region ?? ''}
                      disabled
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
                {typeof error === 'string' && error && (
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
                        <p><strong>{getTranslation(language, 'fieldAreaHectare')}:</strong> {submittedData.field_area_hectare} hectares</p>
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
