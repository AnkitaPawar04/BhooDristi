import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { useApp } from '../../contexts/AppContext';
import { getTranslation, getCropTranslation } from '../../utils/i18n';
import { adminAPI } from '../../services/api';

const AdminCropManagementPage = () => {
  const { language } = useApp();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCrop, setEditingCrop] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    season: 'Kharif',
    tempMin: '',
    tempMax: '',
    rainfall: '',
    soilType: ''
  });
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'name' || name === 'season' || name === 'soilType' ? value : parseFloat(value)
    }));
  };

  const handleAddCrop = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.tempMin || !formData.tempMax || !formData.rainfall) {
      setMessage({ type: 'error', text: 'Please fill all fields', visible: true });
      setTimeout(() => setMessage({ ...message, visible: false }), 3000);
      return;
    }

    if (editingCrop) {
      setCrops(crops.map(c => c.id === editingCrop.id 
        ? { ...formData, id: editingCrop.id } 
        : c));
      setMessage({ type: 'success', text: `✓ ${formData.name} updated successfully`, visible: true });
      setEditingCrop(null);
    } else {
      const newCrop = {
        ...formData,
        id: Math.max(...crops.map(c => c.id), 0) + 1
      };
      setCrops([...crops, newCrop]);
      setMessage({ type: 'success', text: `✓ ${formData.name} added successfully`, visible: true });
    }

    setFormData({ name: '', season: 'Kharif', tempMin: '', tempMax: '', rainfall: '', soilType: '' });
    setShowForm(false);
    setTimeout(() => setMessage({ ...message, visible: false }), 3000);
  };

  const handleEditCrop = (crop) => {
    setEditingCrop(crop);
    setFormData(crop);
    setShowForm(true);
  };

  const handleDeleteCrop = (cropId, cropName) => {
    if (confirm(`Delete "${cropName}" from database?`)) {
      setCrops(crops.filter(c => c.id !== cropId));
      setMessage({ type: 'success', text: `✓ ${cropName} deleted successfully`, visible: true });
      setTimeout(() => setMessage({ ...message, visible: false }), 3000);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCrop(null);
    setFormData({ name: '', season: 'Kharif', tempMin: '', tempMax: '', rainfall: '', soilType: '' });
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
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition"
              >
                {getTranslation(language, 'addNewCrop')}
              </button>
            )}
          </div>

          {showForm && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border border-emerald-200">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                {editingCrop ? getTranslation(language, 'editCrop') : getTranslation(language, 'addNewCrop')}
              </h2>
              
              <form onSubmit={handleAddCrop} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-2">{getTranslation(language, 'nameLabel')}</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Sugarcane"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">{getTranslation(language, 'season')}</label>
                  <select
                    name="season"
                    value={formData.season}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option>Kharif</option>
                    <option>Rabi</option>
                    <option>Summer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">{getTranslation(language, 'temperature')} (Min °C)</label>
                  <input
                    type="number"
                    name="tempMin"
                    value={formData.tempMin}
                    onChange={handleInputChange}
                    placeholder="e.g., 20"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">{getTranslation(language, 'temperature')} (Max °C)</label>
                  <input
                    type="number"
                    name="tempMax"
                    value={formData.tempMax}
                    onChange={handleInputChange}
                    placeholder="e.g., 30"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">{getTranslation(language, 'rainfall')} (mm)</label>
                  <input
                    type="number"
                    name="rainfall"
                    value={formData.rainfall}
                    onChange={handleInputChange}
                    placeholder="e.g., 150"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">{getTranslation(language, 'soilType')}</label>
                  <select
                    name="soilType"
                    value={formData.soilType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select Soil Type</option>
                    <option>Loamy</option>
                    <option>Black Soil</option>
                    <option>Red Soil</option>
                    <option>Sandy</option>
                    <option>Clay</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    {editingCrop ? '💾 ' + getTranslation(language, 'saveChanges') : '✓ ' + getTranslation(language, 'save')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    {getTranslation(language, 'cancel')}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-lg p-6 border border-emerald-200">
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
                    <button
                      onClick={() => handleEditCrop(crop)}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded text-sm transition"
                    >
                      {getTranslation(language, 'editLabel')}
                    </button>
                    <button
                      onClick={() => handleDeleteCrop(crop.id, crop.name)}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded text-sm transition"
                    >
                      {getTranslation(language, 'deleteLabel')}
                    </button>
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
