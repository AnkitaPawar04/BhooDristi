import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import MaharashtraMap from '../../maps/MaharashtraMap';
import { useApp } from '../../contexts/AppContext';
import { getCropTranslation, getDistrictTranslation } from '../../utils/i18n';
import { cropAPI } from '../../services/api';
import LandCoverValidationCard from '../../components/LandCoverValidationCard';
import useGeolocation from '../../hooks/useGeolocation';
import dashboardBgVideo from './videos/dashboard.mp4';

const CropRecommendationPage = ({ onNavigate }) => {
  const { language } = useApp();
  const { location } = useGeolocation();

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [season, setSeason] = useState('Kharif');
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showAdvanced, setShowAdvanced] = useState(false);

  const [validation, setValidation] = useState(null);
  const [serviceUnavailable, setServiceUnavailable] = useState('');

  // Soil and weather parameters
  const [soilParams, setSoilParams] = useState({
    nitrogen: 50,
    phosphorus: 50,
    potassium: 50,
    ph: 6.5,
    temperature: 25,
    humidity: 60,
    rainfall: 100,
  });

  // Clear recommendation when season changes
  useEffect(() => {
    setRecommendation(null);
    setValidation(null);
    setServiceUnavailable('');
    setError('');
  }, [season]);

  // Handle location selected from Maharashtra map
  const handleMapClick = (lat, lon, district) => {
    setSelectedLocation({
      latitude: lat,
      longitude: lon,
      district: district || null,
    });

    // Clear previous recommendation and validation
    setRecommendation(null);
    setValidation(null);
    setServiceUnavailable('');
    setError('');
  };

  // Handle soil/weather parameter changes
  const handleParameterChange = (param, value) => {
    setSoilParams((prev) => ({
      ...prev,
      [param]: parseFloat(value) || 0,
    }));
  };

  // Get crop recommendation
  const handleGetRecommendation = async () => {
    if (!selectedLocation) {
      setError('Please select a location on the map');
      return;
    }

    setLoading(true);
    setError('');
    setValidation(null);
    setServiceUnavailable('');

    try {
      const farmerId = localStorage.getItem('farmer_id') || 1;

      const resp = await cropAPI.predictCrop(
        selectedLocation.latitude,
        selectedLocation.longitude,
        season,
        farmerId,
        soilParams.nitrogen,
        soilParams.phosphorus,
        soilParams.potassium,
        soilParams.temperature,
        soilParams.humidity,
        soilParams.ph,
        soilParams.rainfall
      );

      // Successful recommendation
      if (resp.ok && resp.data) {
        setRecommendation(resp.data);

        // Synchronize district returned by backend
        if (resp.data.district) {
          setSelectedLocation((prev) => ({
            ...prev,
            district: resp.data.district,
          }));
        }

        setValidation(null);
        setServiceUnavailable('');
        return;
      }

      // Land-cover validation failed
      if (resp.status === 400 && resp.validation) {
        setValidation(resp.validation);
        setRecommendation(null);
        return;
      }

      // Land-cover service unavailable
      if (resp.status === 503) {
        setServiceUnavailable(
          resp.detail ||
            'Land-cover validation temporarily unavailable.'
        );
        setRecommendation(null);
        return;
      }

      // Generic backend error
      setError(
        resp.detail ||
          resp.data?.detail ||
          'Unable to get crop recommendation.'
      );
    } catch (err) {
      console.error('Crop Recommendation Error:', err);

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'Failed to get recommendation'
      );
    } finally {
      setLoading(false);
    }
  };

  // Calculate display confidence
  let displayConfidence = 0;

  if (recommendation) {
    const raw = recommendation.confidence;

    const numeric =
      typeof raw === 'number'
        ? raw
        : parseFloat(raw) || 0;

    displayConfidence =
      numeric > 1
        ? numeric
        : Math.round(numeric * 100);

    // Keep confidence between 0 and 100
    displayConfidence = Math.max(
      0,
      Math.min(100, displayConfidence)
    );
  }

  return (
    <div className="flex h-screen bg-transparent dark:bg-transparent">
      <Sidebar
        currentPage="crop-recommendation"
        onNavigate={onNavigate}
        userName="Farmer"
      />

      <div className="flex-1 overflow-auto farm-dashboard relative">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="dashboard-bg-video"
          ref={(video) => {
            if (video) {
              video.playbackRate = 0.5;
            }
          }}
        >
          <source src={dashboardBgVideo} type="video/mp4" />
        </video>

        <div className="dashboard-content relative z-10">
          <div className="p-8 relative z-10">

            {/* Page Header */}
            <div className="page-header animate-fadeInUp">
              <h1 className="page-title">
                Smart Recommendation
              </h1>

              <p className="page-subtitle">
                Input your soil data to discover the most
                profitable and sustainable crops.
              </p>

              <div className="page-divider"></div>
            </div>

            {/* Service Unavailable */}
            {serviceUnavailable && (
              <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-600 rounded-lg p-4 text-yellow-700 dark:text-yellow-200 font-semibold">
                {serviceUnavailable}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-6 bg-red-100 dark:bg-red-900/30 border-l-4 border-red-600 rounded-lg p-4 text-red-700 dark:text-red-200 font-semibold">
                {error}
              </div>
            )}

            {/* Land Cover Validation */}
            {validation && (
              <LandCoverValidationCard
                validation={validation}
                selectedLocation={selectedLocation}
                onChangeLocation={() => {
                  setValidation(null);
                  setSelectedLocation(null);
                  setRecommendation(null);
                }}
                language={language}
              />
            )}

            {/* Main Grid */}
            <section
              className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10 animate-fadeInUp"
              style={{ animationDelay: '0.1s' }}
            >

              {/* Map Section */}
              <div className="lg:col-span-2 farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-green-200 dark:border-green-700 overflow-hidden transition-shadow duration-300">

                <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
                  <h2 className="text-3xl font-bold flex items-center gap-3">
                    Farm Location & Context
                  </h2>

                  <p className="text-green-100 mt-2 text-lg">
                    Click on your farm location to select your
                    farm location.
                  </p>
                </div>

                <div className="p-6">

                  <MaharashtraMap
                    onLocationSelect={handleMapClick}
                    selectedLocation={selectedLocation}
                  />

                  {/* Selected Location */}
                  {selectedLocation && (
                    <div className="mt-6 p-4 bg-green-100 dark:bg-green-900/30 rounded-xl border-l-4 border-green-600">

                      <p className="text-sm text-green-700 dark:text-green-300 font-semibold mb-3">
                        Selected Location:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">

                        <div>
                          <p className="text-xs text-green-700 dark:text-green-300">
                            Latitude
                          </p>

                          <p className="text-lg font-bold text-green-800 dark:text-green-200">
                            {selectedLocation.latitude.toFixed(4)}°
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-green-700 dark:text-green-300">
                            Longitude
                          </p>

                          <p className="text-lg font-bold text-green-800 dark:text-green-200">
                            {selectedLocation.longitude.toFixed(4)}°
                          </p>
                        </div>

                      </div>

                      <div className="mt-4 pt-4 border-t border-green-300 dark:border-green-600">

                        <p className="text-xs text-green-700 dark:text-green-300">
                          District
                        </p>

                        <p className="text-lg font-bold text-green-800 dark:text-green-200">
                          {selectedLocation.district
                            ? getDistrictTranslation(
                                selectedLocation.district,
                                language
                              )
                            : recommendation?.district
                            ? getDistrictTranslation(
                                recommendation.district,
                                language
                              )
                            : 'District not detected.'}
                        </p>

                      </div>

                    </div>
                  )}

                </div>
              </div>

              {/* Form Section */}
              <div className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-green-200 dark:border-green-700 overflow-hidden transition-shadow duration-300">

                <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">

                  <h2 className="text-3xl font-bold flex items-center gap-3">
                    Planting Season
                  </h2>

                  <p className="text-green-100 mt-2 text-lg">
                    Select your planting season
                  </p>

                </div>

                <div className="p-6 space-y-4">

                  {/* Season */}
                  {['Kharif', 'Rabi'].map((s) => (
                    <label
                      key={s}
                      className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition ${
                        season === s
                          ? 'bg-green-100 dark:bg-green-900/30 border-green-600 dark:border-green-500'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-green-600 dark:hover:border-green-500'
                      }`}
                    >

                      <input
                        type="radio"
                        value={s}
                        checked={season === s}
                        onChange={(e) =>
                          setSeason(e.target.value)
                        }
                        className="mr-3 w-4 h-4 accent-green-600"
                      />

                      <div className="flex-1">

                        <p className="font-semibold text-gray-900 dark:text-white">
                          {s}
                        </p>

                        <p className="text-xs text-gray-700 dark:text-gray-300">
                          {s === 'Kharif'
                            ? 'Monsoon'
                            : 'Winter'}
                        </p>

                      </div>

                    </label>
                  ))}

                  {/* Advanced Parameters */}
                  <div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowAdvanced(!showAdvanced)
                      }
                      className="w-full py-3 rounded-xl bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 hover:border-green-600 dark:hover:border-green-500 transition font-semibold text-gray-900 dark:text-white flex items-center justify-between px-4"
                    >
                      {showAdvanced
                        ? 'Hide'
                        : 'Show'}{' '}
                      Soil Parameters

                      <span className="text-sm">
                        {showAdvanced ? '−' : '+'}
                      </span>
                    </button>

                    {showAdvanced && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl space-y-4 max-h-96 overflow-y-auto">

                        {[
                          {
                            name: 'nitrogen',
                            label: 'Nitrogen (N)',
                            min: 0,
                            max: 140,
                          },
                          {
                            name: 'phosphorus',
                            label: 'Phosphorus (P)',
                            min: 5,
                            max: 145,
                          },
                          {
                            name: 'potassium',
                            label: 'Potassium (K)',
                            min: 5,
                            max: 205,
                          },
                          {
                            name: 'temperature',
                            label: 'Temperature (°C)',
                            min: 10,
                            max: 45,
                          },
                          {
                            name: 'humidity',
                            label: 'Humidity (%)',
                            min: 10,
                            max: 100,
                          },
                          {
                            name: 'ph',
                            label: 'pH Level',
                            min: 3.5,
                            max: 9.9,
                            step: 0.1,
                          },
                          {
                            name: 'rainfall',
                            label: 'Rainfall (mm)',
                            min: 20,
                            max: 300,
                          },
                        ].map((param) => (
                          <div key={param.name}>

                            <div className="flex justify-between items-center mb-2">

                              <label className="text-xs font-bold text-gray-900 dark:text-white">
                                {param.label}
                              </label>

                              <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                {soilParams[param.name]}
                                {param.name === 'ph'
                                  ? ''
                                  : param.label.includes('%')
                                  ? '%'
                                  : param.label.includes('°C')
                                  ? '°'
                                  : ''}
                              </span>

                            </div>

                            <input
                              type="range"
                              min={param.min}
                              max={param.max}
                              step={param.step || 1}
                              value={soilParams[param.name]}
                              onChange={(e) =>
                                handleParameterChange(
                                  param.name,
                                  e.target.value
                                )
                              }
                              className="w-full accent-green-600 dark:accent-green-500 rounded-lg"
                            />

                          </div>
                        ))}

                      </div>
                    )}

                  </div>

                  {/* Recommendation Button */}
                  <button
                    type="button"
                    onClick={handleGetRecommendation}
                    disabled={
                      loading || !selectedLocation
                    }
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-lg"
                  >
                    {loading
                      ? 'Getting Recommendation...'
                      : 'Get Recommendation'}
                  </button>

                </div>
              </div>

            </section>

            {/* Recommendation Card */}
            {recommendation && (
              <section className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-green-200 dark:border-green-700 mb-10 animate-fadeInUp overflow-hidden transition-shadow duration-300">

                <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">

                  <p className="text-sm font-bold text-green-100">
                    TOP RECOMMENDATIONS
                  </p>

                  <h3 className="text-3xl font-bold mt-2">
                    Most Suitable Crop
                  </h3>

                  <p className="text-green-100 text-lg mt-1">
                    Based on your soil conditions and location
                  </p>

                </div>

                <div className="p-8">

                  {/* Main Recommendation */}
                  <div className="mb-8 p-8 bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-3xl text-white shadow-lg">

                    <div className="flex items-start justify-between mb-6">

                      <div>

                        <p className="text-green-100 text-sm font-bold mb-2">
                          BEST CHOICE FOR YOU
                        </p>

                        <p className="text-5xl font-bold">
                          {getCropTranslation(
                            recommendation.recommended_crop,
                            language
                          )}
                        </p>

                        <p className="text-green-100 text-lg mt-3">
                          Peak Planting Window
                        </p>

                      </div>

                      <div className="text-right">

                        <p className="text-6xl font-bold">
                          {displayConfidence}%
                        </p>

                        <p className="text-green-100 text-sm">
                          Match
                        </p>

                      </div>

                    </div>

                    <div className="h-2 bg-white/30 rounded-full overflow-hidden">

                      <div
                        className="h-full bg-white rounded-full transition-all"
                        style={{
                          width: `${displayConfidence}%`,
                        }}
                      />

                    </div>

                  </div>

                  {/* Alternative Crops */}
                  {recommendation.top_crops &&
                    recommendation.top_crops.length > 0 && (
                      <div>

                        <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-4">
                          Other Good Options
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                          {recommendation.top_crops
                            .slice(0, 4)
                            .map((crop, idx) => {

                              const confidence =
                                typeof crop === 'string'
                                  ? 85 - idx * 5
                                  : crop.confidence ||
                                    85 - idx * 5;

                              return (
                                <div
                                  key={idx}
                                  className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-700 border-l-4 border-green-600"
                                >

                                  <div className="flex items-start justify-between mb-3">

                                    <div>

                                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {getCropTranslation(
                                          typeof crop === 'string'
                                            ? crop
                                            : crop.crop || crop,
                                          language
                                        )}
                                      </p>

                                    </div>

                                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                      {confidence.toFixed(0)}%
                                    </p>

                                  </div>

                                  <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">

                                    <div
                                      className="h-full bg-green-600 dark:bg-green-500 rounded-full transition-all"
                                      style={{
                                        width: `${Math.min(
                                          100,
                                          Math.max(
                                            0,
                                            confidence
                                          )
                                        )}%`,
                                      }}
                                    />

                                  </div>

                                </div>
                              );
                            })}

                        </div>

                      </div>
                    )}

                </div>

              </section>
            )}

            {/* Additional Crop Options */}
            {recommendation?.top_crops &&
              recommendation.top_crops.length > 4 && (
                <section className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-green-200 dark:border-green-700 mb-10 animate-fadeInUp overflow-hidden transition-shadow duration-300">

                  <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">

                    <h3 className="text-3xl font-bold">
                      🌾 More Crop Options
                    </h3>

                    <p className="text-green-100 mt-2 text-lg">
                      Additional crops returned by the model
                    </p>

                  </div>

                  <div className="p-8">

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                      {recommendation.top_crops
                        .slice(4)
                        .map((crop, idx) => {

                          const name =
                            typeof crop === 'string'
                              ? crop
                              : crop.crop ||
                                crop.name ||
                                JSON.stringify(crop);

                          const conf =
                            typeof crop === 'object' &&
                            (crop.confidence ||
                              crop.confidence === 0)
                              ? crop.confidence
                              : null;

                          const displayConf =
                            conf == null
                              ? null
                              : conf > 1
                              ? conf
                              : Math.round(
                                  conf * 100
                                );

                          return (
                            <div
                              key={idx}
                              className="bg-gradient-to-br from-green-50 dark:from-gray-700 to-white dark:to-gray-800 rounded-2xl p-6 border-l-4 border-green-600"
                            >

                              <p className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                                {getCropTranslation(
                                  name,
                                  language
                                )}
                              </p>

                              {displayConf != null && (
                                <p className="text-sm text-gray-700 dark:text-gray-300">

                                  <span className="font-semibold">
                                    Confidence:
                                  </span>{' '}

                                  <span className="font-bold text-green-600 dark:text-green-400">
                                    {displayConf}%
                                  </span>

                                </p>
                              )}

                            </div>
                          );
                        })}

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

export default CropRecommendationPage;