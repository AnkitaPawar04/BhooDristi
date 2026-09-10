import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { useApp } from '../../contexts/AppContext';
import { getTranslation, getCropTranslation } from '../../utils/i18n';
import { adminAPI } from '../../services/api';

const AdminCropManagementPage = () => {
  const { language } = useApp();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '', visible: false });

  // Fetch crops from trained model
  useEffect(() => {
    fetchSupportedCrops();
  }, []);

  const fetchSupportedCrops = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getSupportedCrops();
      const cropList = response.data.crops.map((cropName, index) => ({
        id: index + 1,
        name: cropName.charAt(0).toUpperCase() + cropName.slice(1),
        season: 'All',
        tempMin: 15,
        tempMax: 35,
        rainfall: 100,
        soilType: 'Loamy'
      }));
      setCrops(cropList);
    } catch (error) {
      console.error('Failed to fetch supported crops:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to fetch crops from trained model', 
        visible: true 
      });
      setTimeout(() => setMessage({ ...message, visible: false }), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-transparent">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">Loading Crops from Trained Model...</p>
          <p className="text-gray-300 mt-2">Please wait while we fetch the supported crops</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen admin-page">
      <Sidebar currentPage="crops" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {message.visible && (
            <div className={`mb-6 p-4 rounded-lg text-gray-900 dark:text-white font-semibold ${
              message.type === 'success' ? 'bg-green-100 dark:bg-green-500' : 'bg-red-100 dark:bg-red-500'
            }`}>
              {message.text}
            </div>
          )}

          <div className="mb-8 flex justify-between items-center">
            <div>
              <div className="page-header mb-0">
                <h1 className="page-title">{getTranslation(language, 'cropManagementPage')}</h1>
                <p className="page-subtitle">{getTranslation(language, 'manageCropRequirements')}</p>
                <div className="page-divider"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border border-emerald-200">
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              <strong>Model-controlled catalog:</strong> These crops come directly from the trained recommendation model. Adding or removing crops requires retraining and publishing a new model version so production predictions remain reproducible.
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">{getTranslation(language, 'supportedCrops')} ({crops.length})</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {crops.map(crop => (
                <div key={crop.id} className="border border-emerald-200 dark:border-emerald-700/50 rounded-lg p-4 bg-white dark:bg-slate-700/40 hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-600/70 transition">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">{getCropTranslation(crop.name, language)}</h3>
                  
                  <div className="space-y-2 text-sm text-gray-700 dark:text-slate-300 mb-4">
                    <p><strong>{getTranslation(language, 'season')}:</strong> {crop.season}</p>
                    <p><strong>{getTranslation(language, 'temperature')}:</strong> {crop.tempMin}°C - {crop.tempMax}°C</p>
                    <p><strong>{getTranslation(language, 'rainfall')}:</strong> {crop.rainfall}mm</p>
                    <p><strong>{getTranslation(language, 'soilType')}:</strong> {crop.soilType}</p>
                  </div>

                  <div className="flex gap-2">
                    <span className="w-full text-center text-xs font-semibold text-gray-500">Managed by trained model</span>
                  </div>
                </div>
              ))}
            </div>

            {crops.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No crops added yet. Click "Add New Crop" to get started.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCropManagementPage;
