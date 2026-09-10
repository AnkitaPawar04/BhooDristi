import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { useApp } from '../../contexts/AppContext';
import { getTranslation, getDistrictTranslation } from '../../utils/i18n';
import { soilAPI, cropAPI } from '../../services/api';
import soilBgVideo from './videos/dashboard.mp4';

const MAHARASHTRA_DISTRICTS = [
  'Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara',
  'Buldhana', 'Chandrapur', 'Chhatrapati Sambhaji Nagar', 'Dhule', 'Dindori',
  'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur',
  'Latur', 'Mumbai', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Navi Mumbai',
  'Osmananad', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli',
  'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'
];

const SoilManagementPage = ({ onNavigate }) => {
  const { language } = useApp();
  const [selectedDistrict, setSelectedDistrict] = useState('Pune');
  const [soilData, setSoilData] = useState({});
  const [message, setMessage] = useState({ type: '', text: '', visible: false });
  const [loading, setLoading] = useState(false);
  const [cropInsights, setCropInsights] = useState(null);
  const fetchRequestId = React.useRef(0); // Track latest request

  // Get user's default district
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userDistrict = user.district || 'Pune';

  useEffect(() => {
    setSelectedDistrict(userDistrict);
  }, [userDistrict]);

  const currentSoil = soilData[selectedDistrict] || { nitrogen: 0, phosphorus: 0, potassium: 0, ph: 0 };

  // Fetch soil data for a district
  const fetchSoilData = async (district) => {
    setLoading(true);
    
    // Increment request ID to track this request
    const currentRequestId = ++fetchRequestId.current;
    
    try {
      const [response, cropResponse] = await Promise.all([
        soilAPI.getSoilData(district),
        cropAPI.getDistrictCrops(district),
      ]);
      
      // Only update state if this is the latest request
      if (currentRequestId === fetchRequestId.current) {
        setSoilData(prev => ({
          ...prev,
          [district]: response.data
        }));
        setCropInsights(prev => ({
          ...prev,
          [district]: cropResponse.data,
        }));
        setLoading(false);
      }
    } catch (error) {
      // Only show error if this is the latest request
      if (currentRequestId === fetchRequestId.current) {
        console.error('Error fetching soil data:', error);
        setMessage({ type: 'error', text: 'Failed to fetch soil data', visible: true });
        setTimeout(() => setMessage({ type: '', text: '', visible: false }), 3000);
        setLoading(false);
      }
    }
  };

  // Load district data when selected district changes
  useEffect(() => {
    fetchSoilData(selectedDistrict);
  }, [selectedDistrict]);

  const handleDistrictChange = (district) => {
    setSelectedDistrict(district);
  };

  const currentCropInsights = cropInsights?.[selectedDistrict];

  const getSoilHealthStatus = (nutrient, value) => {
    const optimalRanges = {
      nitrogen: { min: 30, max: 50 },
      phosphorus: { min: 20, max: 40 },
      potassium: { min: 20, max: 30 },
      ph: { min: 6.0, max: 7.5 }
    };

    const range = optimalRanges[nutrient];
    if (value >= range.min && value <= range.max) {
      return { status: 'Optimal', color: 'green' };
    } else if (value < range.min) {
      return { status: 'Low', color: 'red' };
    } else {
      return { status: 'High', color: 'orange' };
    }
  };

  return (
    <div className="flex h-screen farm-page">
      <Sidebar currentPage="soil" onNavigate={onNavigate} />
      
      {/* Background Video */}
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
        <source src={soilBgVideo} type="video/mp4" />
      </video>

      <div className="flex-1">
        <div className="p-8 relative z-10 h-full overflow-y-auto">
          {message.visible && (
            <div className={`mb-6 p-4 rounded-lg text-white font-semibold relative z-10 ${
              message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}>
              {message.text}
            </div>
          )}

          <div className="page-header mb-8 animate-fadeInUp">
            <h1 className="page-title text-white">{getTranslation(language, 'soilManagement') || 'Soil Management'}</h1>
            <p className="page-subtitle text-white">View soil nutrients for your district and others</p>
            <div className="page-divider"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* District List */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 border-4 border-emerald-200 relative z-10 flex flex-col h-full lg:max-h-[900px]">
              <h2 className="text-xl font-bold text-gray-800 mb-6">{getTranslation(language, 'districts')}</h2>
              <div className="space-y-2 overflow-y-auto pr-2 flex-1 district-list-scroll">
                {MAHARASHTRA_DISTRICTS.map(district => (
                  <button
                    key={district}
                    onClick={() => handleDistrictChange(district)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition text-sm font-medium ${
                      selectedDistrict === district
                        ? 'bg-emerald-600 text-white font-semibold shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200 hover:shadow-md'
                    }`}
                  >
                    {soilData[district] ? '✓' : '○'} {getDistrictTranslation(district, language)}
                  </button>
                ))}
              </div>
            </div>

            {/* Soil Data Display */}
            <div className="lg:col-span-2 space-y-6 relative z-10">
              {/* Current Data Card */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-0 border-4 border-green-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-white">
                  <h2 className="text-3xl font-bold">{getDistrictTranslation(selectedDistrict, language)}</h2>
                </div>
                <div className="p-8">

                <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <strong>Data source:</strong> Current values are district-level demo estimates. They will be replaced with verified ESA or laboratory data when available.
                </div>

                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="text-gray-500">Loading soil data...</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Nitrogen */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-l-4 border-green-600 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">{getTranslation(language, 'nitrogen2')} (N)</p>
                      <p className="text-5xl font-bold text-green-600 mt-4">{currentSoil.nitrogen || 0}</p>
                      <p className="text-gray-500 text-sm mt-2 font-medium">{getTranslation(language, 'ppm')}</p>
                      <div className="mt-4">
                        <span className={`text-xs font-bold px-3 py-2 rounded-full inline-block ${
                          getSoilHealthStatus('nitrogen', currentSoil.nitrogen).color === 'green' 
                            ? 'bg-green-200 text-green-800' 
                            : getSoilHealthStatus('nitrogen', currentSoil.nitrogen).color === 'red'
                            ? 'bg-red-200 text-red-800'
                            : 'bg-orange-200 text-orange-800'
                        }`}>
                          {getSoilHealthStatus('nitrogen', currentSoil.nitrogen).status}
                        </span>
                      </div>
                    </div>

                    {/* Phosphorus */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-l-4 border-blue-600 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">{getTranslation(language, 'phosphorus2')} (P)</p>
                      <p className="text-5xl font-bold text-blue-600 mt-4">{currentSoil.phosphorus || 0}</p>
                      <p className="text-gray-500 text-sm mt-2 font-medium">{getTranslation(language, 'ppm')}</p>
                      <div className="mt-4">
                        <span className={`text-xs font-bold px-3 py-2 rounded-full inline-block ${
                          getSoilHealthStatus('phosphorus', currentSoil.phosphorus).color === 'green' 
                            ? 'bg-green-200 text-green-800' 
                            : getSoilHealthStatus('phosphorus', currentSoil.phosphorus).color === 'red'
                            ? 'bg-red-200 text-red-800'
                            : 'bg-orange-200 text-orange-800'
                        }`}>
                          {getSoilHealthStatus('phosphorus', currentSoil.phosphorus).status}
                        </span>
                      </div>
                    </div>

                    {/* Potassium */}
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border-l-4 border-yellow-600 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">{getTranslation(language, 'potassium2')} (K)</p>
                      <p className="text-5xl font-bold text-yellow-600 mt-4">{currentSoil.potassium || 0}</p>
                      <p className="text-gray-500 text-sm mt-2 font-medium">{getTranslation(language, 'ppm')}</p>
                      <div className="mt-4">
                        <span className={`text-xs font-bold px-3 py-2 rounded-full inline-block ${
                          getSoilHealthStatus('potassium', currentSoil.potassium).color === 'green' 
                            ? 'bg-green-200 text-green-800' 
                            : getSoilHealthStatus('potassium', currentSoil.potassium).color === 'red'
                            ? 'bg-red-200 text-red-800'
                            : 'bg-orange-200 text-orange-800'
                        }`}>
                          {getSoilHealthStatus('potassium', currentSoil.potassium).status}
                        </span>
                      </div>
                    </div>

                    {/* pH Level */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-l-4 border-purple-600 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">{getTranslation(language, 'phLevel')}</p>
                      <p className="text-5xl font-bold text-purple-600 mt-4">{currentSoil.ph || 0}</p>
                      <p className="text-gray-500 text-sm mt-2 font-medium">{getTranslation(language, 'phRange')}</p>
                      <div className="mt-4">
                        <span className={`text-xs font-bold px-3 py-2 rounded-full inline-block ${
                          getSoilHealthStatus('ph', currentSoil.ph).color === 'green' 
                            ? 'bg-green-200 text-green-800' 
                            : getSoilHealthStatus('ph', currentSoil.ph).color === 'red'
                            ? 'bg-red-200 text-red-800'
                            : 'bg-orange-200 text-orange-800'
                        }`}>
                          {getSoilHealthStatus('ph', currentSoil.ph).status}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                </div>
              </div>

              {/* Crop guidance from current soil profile */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-0 border-4 border-emerald-200 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white">
                  <h3 className="text-2xl font-bold">Crops suited to this soil</h3>
                  <p className="text-emerald-100 mt-1 text-sm">Model suggestions based on the current district profile</p>
                </div>
                <div className="p-6">
                  {currentCropInsights ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                        <p className="text-sm font-semibold text-green-800">Kharif</p>
                        <p className="mt-2 text-lg font-bold text-green-900">
                          {(currentCropInsights.kharif_crops || []).join(', ') || 'No suggestion available'}
                        </p>
                      </div>
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                        <p className="text-sm font-semibold text-blue-800">Rabi</p>
                        <p className="mt-2 text-lg font-bold text-blue-900">
                          {(currentCropInsights.rabi_crops || []).join(', ') || 'No suggestion available'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600">Select a district to calculate crop suggestions.</p>
                  )}
                  <p className="mt-4 text-xs text-gray-500">
                    These are suitability suggestions, not guaranteed yields. Verify the final choice with local agronomy advice.
                  </p>
                </div>
              </div>

              {/* Soil Health Info */}
              <div className="bg-green-50 rounded-2xl shadow-xl p-0 border-4 border-green-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-white">
                  <h3 className="text-2xl font-bold">{getTranslation(language, 'soilHealthGuide')}</h3>
                </div>
                <div className="p-8">
                  <ul className="space-y-4 text-sm text-gray-700">
                    <li className="flex gap-3">
                      <span className="text-xl">✓</span>
                      <div>
                        <strong>{getTranslation(language, 'nitrogen2')}:</strong> Essential for plant growth (30-50 ppm)
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-xl">✓</span>
                      <div>
                        <strong>{getTranslation(language, 'phosphorus2')}:</strong> Supports root development (20-40 ppm)
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-xl">✓</span>
                      <div>
                        <strong>{getTranslation(language, 'potassium2')}:</strong> Improves crop quality (20-30 ppm)
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-xl">✓</span>
                      <div>
                        <strong>pH:</strong> Most crops prefer 6.0-7.5
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoilManagementPage;
