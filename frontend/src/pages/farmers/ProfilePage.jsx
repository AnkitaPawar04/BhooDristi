import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import DistrictSelect from '../../components/DistrictSelect';
import { useApp } from '../../contexts/AppContext';
import { getTranslation, getCropTranslation, getDistrictTranslation } from '../../utils/i18n';
import { authAPI } from '../../services/api';
import dashboardBgVideo from './videos/dashboard.mp4';

const ProfilePage = ({ onNavigate }) => {
  const { language } = useApp();
  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [message, setMessage] = useState({ type: '', text: '', visible: false });

  // Fetch farmer profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        let farmerId = localStorage.getItem('farmer_id');
        
        // Fallback: Extract from JWT token if not in localStorage
        if (!farmerId) {
          const token = localStorage.getItem('access_token');
          if (token) {
            try {
              // JWT format: header.payload.signature
              const parts = token.split('.');
              if (parts.length === 3) {
                // Decode payload (add padding if needed)
                const payload = parts[1];
                const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
                const decoded = JSON.parse(atob(padded));
                farmerId = decoded.sub;
              }
            } catch (e) {
              console.error('Error decoding token:', e);
            }
          }
        }

        if (!farmerId) {
          setMessage({ type: 'error', text: 'Farmer ID not found. Please logout and log back in.', visible: true });
          setLoading(false);
          return;
        }

        // Store farmer_id in localStorage for future use
        if (!localStorage.getItem('farmer_id')) {
          localStorage.setItem('farmer_id', farmerId);
        }

        const response = await authAPI.getFarmerProfile(farmerId);
        setFarmer(response.data);
        setEditData(response.data);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setMessage({ type: 'error', text: 'Failed to fetch profile', visible: true });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    try {
      let farmerId = localStorage.getItem('farmer_id');
      
      // Fallback: Extract from JWT token if not in localStorage
      if (!farmerId) {
        const token = localStorage.getItem('access_token');
        if (token) {
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = parts[1];
              const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
              const decoded = JSON.parse(atob(padded));
              farmerId = decoded.sub;
            }
          } catch (e) {
            console.error('Error decoding token:', e);
          }
        }
      }

      if (!farmerId) {
        setMessage({ type: 'error', text: 'Farmer ID not found. Please logout and log back in.', visible: true });
        return;
      }

      console.log('Updating profile for farmer:', farmerId, 'Data:', editData);
      const response = await authAPI.updateFarmerProfile(farmerId, editData);
      console.log('Update response:', response);
      
      // Handle both direct farmer object and nested farmer object
      const updatedFarmer = response.data.farmer || response.data;
      setFarmer(updatedFarmer);
      setEditData(updatedFarmer);
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Profile updated successfully', visible: true });
      setTimeout(() => setMessage({ ...message, visible: false }), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || 'Failed to update profile';
      setMessage({ type: 'error', text: errorMsg, visible: true });
    }
  };

  const handleCancel = () => {
    setEditData(farmer);
    setIsEditing(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditData({ ...editData, [name]: value });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = () => {
    setPasswordError('');
    setPasswordMessage('');

    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      setPasswordError(getTranslation(language, 'allFieldsRequired'));
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      setPasswordError(getTranslation(language, 'passwordMismatch'));
      return;
    }

    if (passwordData.new.length < 6) {
      setPasswordError(getTranslation(language, 'passwordMinLength'));
      return;
    }

    // TODO: Call API to change password
    setPasswordMessage(getTranslation(language, 'passwordChanged'));
    setPasswordData({ current: '', new: '', confirm: '' });

    setTimeout(() => {
      setPasswordMessage('');
    }, 3000);
  };

  return (
    <div className="flex h-screen bg-transparent dark:bg-transparent">
      <Sidebar currentPage="profile" onNavigate={onNavigate} userName={farmer?.name || 'Farmer'} />
      
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
          {loading ? (
            <div className="flex items-center justify-center h-screen">
              <div className="text-center">
                <p className="text-2xl text-white mb-4">⏳ Loading your profile...</p>
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mx-auto"></div>
              </div>
            </div>
          ) : (
            <>
              <div className="page-header mb-8">
                <h1 className="page-title">Welcome back, {farmer?.first_name || farmer?.name}! 👋</h1>
                <p className="page-subtitle">Manage your profile and account settings</p>
                <div className="page-divider"></div>
              </div>

              {message.visible && (
                <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {message.text}
                </div>
              )}

          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-gray-300">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-4 px-4 font-semibold transition ${
                activeTab === 'profile'
                  ? 'border-b-2 border-green-600 text-white'
                  : 'text-white hover:text-white'
              }`}
            >
              {getTranslation(language, 'farmerInformation')}
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`pb-4 px-4 font-semibold transition ${
                activeTab === 'password'
                  ? 'border-b-2 border-green-600 text-white'
                  : 'text-white hover:text-white'
              }`}
            >
              {getTranslation(language, 'changePassword')}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="lg:col-span-2">
                <div className="card card-content">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-bold text-green-700 dark:text-green-400">
                      {getTranslation(language, 'farmerInformation')}
                    </h2>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition btn-hover"
                    >
                      {isEditing ? getTranslation(language, 'cancel') : getTranslation(language, 'editProfile')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        {getTranslation(language, 'fullName')}
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="first_name"
                          value={editData?.first_name || ''}
                          onChange={handleChange}
                          placeholder="First Name"
                          className="input-field mb-2"
                        />
                      ) : (
                        <p className="text-lg text-gray-800 dark:text-gray-100">{farmer?.name || 'Not provided'}</p>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        {getTranslation(language, 'phoneNumber')}
                      </label>
                      <p className="text-lg text-gray-800 dark:text-gray-100">{farmer?.phone_number || 'Not provided'}</p>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        {getTranslation(language, 'email')}
                      </label>
                      {isEditing ? (
                        <input
                          type="email"
                          name="email"
                          value={editData?.email || ''}
                          onChange={handleChange}
                          className="input-field"
                        />
                      ) : (
                        <p className="text-lg text-gray-800 dark:text-gray-100">{farmer?.email || 'Not provided'}</p>
                      )}
                    </div>

                    {/* District */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        {getTranslation(language, 'district')}
                      </label>
                      {isEditing ? (
                        <DistrictSelect
                          value={editData?.district || ''}
                          onChange={handleChange}
                        />
                      ) : (
                        <p className="text-lg text-gray-800 dark:text-gray-100">{farmer?.district || 'Not specified'}</p>
                      )}
                    </div>

                    {/* Village */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        {getTranslation(language, 'village')}
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="village"
                          value={editData?.village || ''}
                          onChange={handleChange}
                          className="input-field"
                        />
                      ) : (
                        <p className="text-lg text-gray-800 dark:text-gray-100">{farmer?.village || 'Not specified'}</p>
                      )}
                    </div>

                    {/* Farm Size */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        {getTranslation(language, 'farmSize')}
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="farm_size"
                          value={editData?.farm_size || ''}
                          onChange={handleChange}
                          className="input-field"
                          placeholder="e.g., 5 acres"
                        />
                      ) : (
                        <p className="text-lg text-gray-800 dark:text-gray-100">{farmer?.farm_size || 'Not specified'}</p>
                      )}
                    </div>

                    {/* Soil Type */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        {getTranslation(language, 'soilType')}
                      </label>
                      {isEditing ? (
                        <select
                          name="soil_type"
                          value={editData?.soil_type || ''}
                          onChange={handleChange}
                          className="input-field"
                        >
                          <option value="">Select Soil Type</option>
                          <option value="Black Soil">Black Soil</option>
                          <option value="Red Soil">Red Soil</option>
                          <option value="Loamy Soil">Loamy Soil</option>
                          <option value="Sandy Soil">Sandy Soil</option>
                          <option value="Clay Soil">Clay Soil</option>
                          <option value="Laterite Soil">Laterite Soil</option>
                          <option value="Alluvial Soil">Alluvial Soil</option>
                        </select>
                      ) : (
                        <p className="text-lg text-gray-800 dark:text-gray-100">{farmer?.soil_type || 'Not specified'}</p>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-8 flex gap-4">
                      <button
                        onClick={handleSave}
                        className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg transition btn-hover"
                      >
                        {getTranslation(language, 'save')}
                      </button>
                      <button
                        onClick={handleCancel}
                        className="bg-gray-400 hover:bg-gray-500 dark:bg-gray-600 dark:hover:bg-gray-500 text-white font-semibold py-2 px-6 rounded-lg transition btn-hover"
                      >
                        {getTranslation(language, 'cancel')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="lg:col-span-2">
                <div className="card card-content">
                  <h2 className="text-3xl font-bold text-green-700 dark:text-green-400 mb-8">
                    {getTranslation(language, 'changePassword')}
                  </h2>

                  {passwordMessage && (
                    <div className="info-box info-box-green mb-6">
                      {passwordMessage}
                    </div>
                  )}

                  {passwordError && (
                    <div className="info-box info-box-red mb-6">
                      {passwordError}
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Current Password */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        {getTranslation(language, 'currentPassword')}
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          name="current"
                          value={passwordData.current}
                          onChange={handlePasswordChange}
                          className="input-field pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                          className="absolute right-3 top-2.5 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            {showPasswords.current ? 'Hide' : 'Show'}
                          </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        {getTranslation(language, 'newPassword')}
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          name="new"
                          value={passwordData.new}
                          onChange={handlePasswordChange}
                          className="input-field pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                          className="absolute right-3 top-2.5 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            {showPasswords.new ? 'Hide' : 'Show'}
                          </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        {getTranslation(language, 'confirmPassword')}
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          name="confirm"
                          value={passwordData.confirm}
                          onChange={handlePasswordChange}
                          className="input-field pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                          className="absolute right-3 top-2.5 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            {showPasswords.confirm ? 'Hide' : 'Show'}
                          </button>
                      </div>
                    </div>

                    <button
                      onClick={handleChangePassword}
                      className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition btn-hover mt-4"
                    >
                      {getTranslation(language, 'changePassword')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Statistics */}
            <div>
              <div className="stat-card mb-6">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">{getTranslation(language, 'statistics')}</h3>
                <div className="space-y-4">
                  <div className="p-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-default">
                    <p className="stat-label">{getTranslation(language, 'totalPredictionsLabel')}</p>
                    <p className="stat-value">12</p>
                  </div>
                  <div className="p-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-default">
                    <p className="stat-label">{getTranslation(language, 'memberSince')}</p>
                    <p className="stat-value">Jan 2024</p>
                  </div>
                </div>
              </div>

              {/* Account Status */}
              <div className="stat-card hover:shadow-lg dark:hover:shadow-2xl">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">{getTranslation(language, 'accountStatus')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center p-3 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                    <span className="w-3 h-3 bg-green-600 rounded-full mr-3"></span>
                    <span className="text-gray-700 dark:text-gray-200">{getTranslation(language, 'active')}</span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 px-3">
                    {getTranslation(language, 'lastLogin')}: Today
                  </div>
                </div>
              </div>
            </div>
          </div>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
