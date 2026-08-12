import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { useApp } from '../../contexts/AppContext';
import { getTranslation, getDistrictTranslation } from '../../utils/i18n';
import { cropAPI, soilAPI } from '../../services/api';

const MAHARASHTRA_DISTRICTS = [
  'Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara',
  'Buldhana', 'Chandrapur', 'Chhatrapati Sambhaji Nagar', 'Dhule', 'Dindori',
  'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur',
  'Latur', 'Mumbai', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Navi Mumbai',
  'Osmananad', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli',
  'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'
];

const AdminSoilManagementPage = () => {
  const { language } = useApp();
  const [selectedDistrict, setSelectedDistrict] = useState('Pune');
  const [districtCrops, setDistrictCrops] = useState(null);
  const [soilData, setSoilData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '', visible: false });

  // Fetch district crops and soil insights
  const fetchDistrictInsights = async (district) => {
    setLoading(true);
    try {
      // Get crop recommendations for Kharif and Rabi
      const cropsResponse = await cropAPI.getDistrictCrops(district);
      console.log('Crops response for', district, ':', cropsResponse.data);
      setDistrictCrops(cropsResponse.data);

      // Get soil data
      const soilResponse = await soilAPI.getSoilData(district);
      console.log('Soil response for', district, ':', soilResponse.data);
      setSoilData(soilResponse.data);
    } catch (error) {
      console.error('Error fetching district insights:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to fetch data for ${district}. Check API connection.`, 
        visible: true 
      });
      setTimeout(() => setMessage({ ...message, visible: false }), 3000);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDistrictInsights(selectedDistrict);
  }, [selectedDistrict]);

  const handleDistrictChange = (district) => {
    setSelectedDistrict(district);
  };

  const getKeyInsights = () => {
    if (!soilData) return { strength: 'No data', health: 'No data' };
    
    // Determine primary strength
    let strength = '';
    let strengthEmoji = ''; // Removed emoji
    if (soilData.nitrogen > 40) {
      strength = 'High Nitrogen';
      strengthEmoji = ''; // Removed emoji
    } else if (soilData.phosphorus > 30) {
      strength = 'Good Phosphorus';
      strengthEmoji = ''; // Removed emoji
    } else if (soilData.potassium > 150) {
      strength = 'Excellent Potassium';
      strengthEmoji = ''; // Removed emoji
    } else if (soilData.ph >= 6.0 && soilData.ph <= 7.5) {
      strength = 'Balanced pH';
      strengthEmoji = ''; // Removed emoji
    } else {
      strength = 'Needs Improvement';
      strengthEmoji = ''; // Removed emoji
    }

    // Determine soil health status
    let health = '';
    let healthEmoji = ''; // Removed emoji
    const nStatus = soilData.nitrogen >= 30 && soilData.nitrogen <= 50 ? 1 : 0;
    const pStatus = soilData.phosphorus >= 20 && soilData.phosphorus <= 40 ? 1 : 0;
    const kStatus = soilData.potassium >= 20 && soilData.potassium <= 150 ? 1 : 0;
    const phStatus = soilData.ph >= 6.0 && soilData.ph <= 7.5 ? 1 : 0;
    const totalStatus = nStatus + pStatus + kStatus + phStatus;

    if (totalStatus === 4) {
      health = 'Excellent Condition';
      healthEmoji = ''; // Removed emoji
    } else if (totalStatus >= 3) {
      health = 'Good Condition';
      healthEmoji = ''; // Removed emoji
    } else if (totalStatus >= 2) {
      health = 'Fair Condition';
      healthEmoji = ''; // Removed emoji
    } else {
      health = 'Poor Condition';
      healthEmoji = ''; // Removed emoji
    }

    return { 
      strength: strength,
      health: health,
      nStatus,
      pStatus,
      kStatus,
      phStatus,
      totalStatus
    };
  };

  return (
    <div className="flex h-screen admin-page">
      <Sidebar currentPage="soil" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {message.visible && (
            <div className={`mb-6 p-4 rounded-lg text-gray-900 dark:text-white font-semibold ${
              message.type === 'success' ? 'bg-green-100 dark:bg-green-500' : 'bg-red-100 dark:bg-red-500'
            }`}>
              {message.text}
            </div>
          )}

          <div className="page-header mb-8">
              <h1 className="page-title">Soil Management & Insights</h1>
            <p className="page-subtitle">AI-powered soil analysis and crop recommendations by district</p>
            <div className="page-divider"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Districts Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-6 border border-emerald-200 sticky top-8 h-[calc(100vh-50px)]">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Districts</h2>
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Districts</h2>
                <div className="space-y-2 h-[calc(100%-60px)] overflow-y-auto">
                  {MAHARASHTRA_DISTRICTS.map(district => (
                    <button
                      key={district}
                      onClick={() => handleDistrictChange(district)}
                      className={`w-full text-left px-4 py-2 rounded-lg transition text-sm ${
                        selectedDistrict === district
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {getDistrictTranslation(district, language)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {loading ? (
                <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-800 mb-2">Loading District Insights...</p>
                    <p className="text-gray-500">Analyzing soil and crop data for {selectedDistrict}</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Current Soil Status */}
                  {soilData && (
                    <div className="bg-white rounded-lg shadow-lg p-6 border border-emerald-200">
                      <h2 className="text-2xl font-bold text-gray-800 mb-6">Soil Status - {selectedDistrict}</h2>
                                            <h2 className="text-2xl font-bold text-gray-800 mb-6">Soil Status - {selectedDistrict}</h2>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-l-4 border-green-600">
                          <p className="text-gray-600 text-xs font-semibold uppercase">Nitrogen (N)</p>
                          <p className="text-3xl font-bold text-green-600 mt-2">{soilData.nitrogen}</p>
                          <p className="text-gray-500 text-xs mt-1">ppm (Optimal: 30-50)</p>
                        </div>

                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-l-4 border-blue-600">
                          <p className="text-gray-600 text-xs font-semibold uppercase">Phosphorus (P)</p>
                          <p className="text-3xl font-bold text-blue-600 mt-2">{soilData.phosphorus}</p>
                          <p className="text-gray-500 text-xs mt-1">ppm (Optimal: 20-40)</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border-l-4 border-purple-600">
                          <p className="text-gray-600 text-xs font-semibold uppercase">Potassium (K)</p>
                          <p className="text-3xl font-bold text-purple-600 mt-2">{soilData.potassium}</p>
                          <p className="text-gray-500 text-xs mt-1">ppm (Optimal: 20-30)</p>
                        </div>

                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border-l-4 border-orange-600">
                          <p className="text-gray-600 text-xs font-semibold uppercase">pH Level</p>
                          <p className="text-3xl font-bold text-orange-600 mt-2">{soilData.ph}</p>
                          <p className="text-gray-500 text-xs mt-1">Optimal: 6.0-7.5</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Crop Recommendations */}
                  {districtCrops ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Kharif Season */}
                      <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-green-600">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Kharif Season (June-September)</h3>
                                                <h3 className="text-xl font-bold text-gray-800 mb-4">Kharif Season (June-September)</h3>
                        {districtCrops.kharif && districtCrops.kharif.top_crops && districtCrops.kharif.top_crops.length > 0 ? (
                          <div className="space-y-3">
                            {districtCrops.kharif.top_crops.map((crop, idx) => (
                              <div key={idx} className="bg-green-50 rounded-lg p-3 border-l-4 border-green-500">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl">{idx === 0 ? '⭐' : '✓'}</span>
                                  <div>
                                    <p className="font-bold text-gray-800 capitalize">{crop}</p>
                                    <p className="text-xs text-gray-500">{idx === 0 ? 'Highly Recommended' : 'Recommended'}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-center py-4">No Kharif crop data available</p>
                        )}
                      </div>

                      {/* Rabi Season */}
                      <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-blue-600">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">❄️ Rabi Season (October-March)</h3>
                                                <h3 className="text-xl font-bold text-gray-800 mb-4">Rabi Season (October-March)</h3>
                                                    <p className="text-gray-600 text-center">Crop recommendations loading...</p>
                                              <h3 className="text-xl font-bold text-gray-800 mb-4">Soil Status - {selectedDistrict}</h3>
                        {districtCrops.rabi && districtCrops.rabi.top_crops && districtCrops.rabi.top_crops.length > 0 ? (
                          <div className="space-y-3">
                            {districtCrops.rabi.top_crops.map((crop, idx) => (
                              <div key={idx} className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl">{idx === 0 ? '⭐' : '✓'}</span>
                                  <div>
                                    <p className="font-bold text-gray-800 capitalize">{crop}</p>
                                    <p className="text-xs text-gray-500">{idx === 0 ? 'Highly Recommended' : 'Recommended'}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-center py-4">No Rabi crop data available</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg shadow-lg p-6 border border-yellow-300 text-center">
                      <p className="text-gray-600">Crop recommendations loading...</p>
                    </div>
                  )}

                  {/* Key Insights - Dynamic based on soil data */}
                  {soilData && (() => {
                    const insights = getKeyInsights();
                    return (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow-lg p-6 border-l-4 border-green-700">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Key Insights for {selectedDistrict}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white rounded p-3 border border-green-200">
                            <p className="text-sm font-semibold text-gray-600">Primary Strength</p>
                            <p className="text-lg font-bold text-green-600 mt-1">{insights.strength}</p>
                          </div>
                          <div className="bg-white rounded p-3 border border-green-200">
                            <p className="text-sm font-semibold text-gray-600">Overall Soil Health</p>
                            <p className="text-lg font-bold text-green-600 mt-1">{insights.health}</p>
                          </div>
                          <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded p-3 border border-green-300">
                            <p className="text-sm font-semibold text-gray-700">Nutrient Balance</p>
                            <div className="mt-2 flex gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${insights.nStatus ? 'bg-green-400 text-white' : 'bg-red-200 text-gray-800'}`}>N: {soilData.nitrogen} ppm</span>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${insights.pStatus ? 'bg-green-400 text-white' : 'bg-red-200 text-gray-800'}`}>P: {soilData.phosphorus} ppm</span>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${insights.kStatus ? 'bg-green-400 text-white' : 'bg-red-200 text-gray-800'}`}>K: {soilData.potassium} ppm</span>
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-orange-100 to-yellow-100 rounded p-3 border border-orange-300">
                            <p className="text-sm font-semibold text-gray-700">pH Assessment</p>
                            <p className="mt-2 text-sm text-gray-800">
                              {soilData.ph >= 6.0 && soilData.ph <= 7.5 
                                ? `✓ Optimal (${soilData.ph})` 
                                : soilData.ph < 6.0 
                                ? `Acidic (${soilData.ph}) - Add Lime`
                                : `Alkaline (${soilData.ph}) - Monitor`}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Best Crop Recommendation - Only show if we have valid data from model */}
                  {districtCrops && (() => {
                    const bestKharifCrop = districtCrops.kharif?.top_crops?.[0];
                    const bestRabiCrop = districtCrops.rabi?.top_crops?.[0];
                    const bestCrop = bestKharifCrop || bestRabiCrop;
                    
                    // Only render if we have actual crop data from model
                    return bestCrop ? (
                      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg shadow-lg p-6 border-t-4 border-yellow-500">
                        <h3 className="text-2xl font-bold text-gray-800 mb-6">Best Crop for Current Soil Conditions</h3>
                        
                        <div className="space-y-4">
                          <div className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg p-6 border-2 border-yellow-400">
                            <p className="text-sm text-gray-600 font-semibold mb-2">Recommended for {selectedDistrict}</p>
                            <p className="text-4xl font-bold text-yellow-700 mt-2 capitalize">{bestCrop}</p>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              <div className="bg-white rounded p-2 border border-yellow-300">
                                <p className="text-gray-600 font-semibold">Nitrogen Match</p>
                                <p className="text-lg font-bold text-green-600 mt-1">
                                  {soilData && soilData.nitrogen >= 30 && soilData.nitrogen <= 50 ? 'Excellent' : soilData && soilData.nitrogen > 20 ? 'Good' : 'Low'}
                                </p>
                              </div>
                              <div className="bg-white rounded p-2 border border-yellow-300">
                                <p className="text-gray-600 font-semibold">Phosphorus Match</p>
                                <p className="text-lg font-bold text-green-600 mt-1">
                                  {soilData && soilData.phosphorus >= 20 && soilData.phosphorus <= 40 ? 'Excellent' : soilData && soilData.phosphorus > 15 ? 'Good' : 'Low'}
                                </p>
                              </div>
                              <div className="bg-white rounded p-2 border border-yellow-300">
                                <p className="text-gray-600 font-semibold">pH Suitability</p>
                                <p className="text-lg font-bold text-green-600 mt-1">
                                  {soilData && soilData.ph >= 6.0 && soilData.ph <= 7.5 ? 'Perfect' : soilData && soilData.ph >= 5.5 && soilData.ph <= 8.0 ? 'Suitable' : 'Needs Work'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Comparison with other crops */}
                          <div className="mt-4">
                            <p className="text-sm font-semibold text-gray-700 mb-3">Alternative Crops (If Current Conditions Change):</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Show other Kharif crops */}
                              {districtCrops.kharif?.top_crops?.slice(1, 3).map((crop, idx) => (
                                <div key={`kharif-${idx}`} className="bg-green-50 rounded-lg p-3 border-l-4 border-green-500">
                                  <p className="text-xs text-gray-600 font-semibold">Kharif Alternative {idx + 1}</p>
                                  <p className="text-lg font-bold text-gray-800 capitalize mt-1">{crop}</p>
                                </div>
                              ))}
                              {/* Show other Rabi crops */}
                              {districtCrops.rabi?.top_crops?.slice(1, 3).map((crop, idx) => (
                                <div key={`rabi-${idx}`} className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
                                  <p className="text-xs text-gray-600 font-semibold">Rabi Alternative {idx + 1}</p>
                                  <p className="text-lg font-bold text-gray-800 capitalize mt-1">{crop}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Soil Optimization Tips */}
                          <div className="mt-4 bg-white rounded-lg p-4 border border-yellow-300">
                            <p className="text-sm font-semibold text-gray-700 mb-2">To Maximize Yield:</p>
                            <ul className="space-y-1 text-sm text-gray-600">
                              {soilData && soilData.nitrogen < 30 && <li>• Increase nitrogen fertilizer application</li>}
                              {soilData && soilData.phosphorus < 20 && <li>• Add phosphate-rich fertilizers</li>}
                              {soilData && soilData.potassium < 20 && <li>• Apply potash fertilizers</li>}
                              {soilData && (soilData.ph < 6.0 || soilData.ph > 7.5) && <li>• Adjust soil pH before planting</li>}
                              {soilData && soilData.nitrogen >= 30 && soilData.phosphorus >= 20 && soilData.potassium >= 20 && <li>• Soil nutrients are well-balanced for optimal growth</li>}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSoilManagementPage;
