import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { useApp } from '../../contexts/AppContext';
import { getTranslation } from '../../utils/i18n';

const AdminProfilePage = () => {
  const { language } = useApp();
  const [profileData, setProfileData] = useState({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin.agro@gmail.com',
    phone: '+91 98765 43210',
    organization: 'BhooDrishti Admin',
    profilePhoto: 'https://ui-avatars.com/api/?name=Admin+User&background=16a34a&color=fff&size=160',
  });

  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(profileData);
  const [tempPhotoPreview, setTempPhotoPreview] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '', visible: false });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  const handleInputChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = () => {
    if (!editData.firstName || !editData.lastName || !editData.email) {
      setMessage({ type: 'error', text: getTranslation(language, 'fillAllFields'), visible: true });
      setTimeout(() => setMessage({ ...message, visible: false }), 3000);
      return;
    }

    // Apply temp photo if one was selected
    const finalData = tempPhotoPreview 
      ? { ...editData, profilePhoto: tempPhotoPreview }
      : editData;

    setProfileData(finalData);
    setEditMode(false);
    setTempPhotoPreview(null);
    setMessage({ type: 'success', text: getTranslation(language, 'profileUpdatedSuccess'), visible: true });
    setTimeout(() => setMessage({ ...message, visible: false }), 3000);
  };

  const handleChangePassword = (e) => {
    e.preventDefault();

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setMessage({ type: 'error', text: getTranslation(language, 'fillPasswordFields'), visible: true });
      setTimeout(() => setMessage({ ...message, visible: false }), 3000);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: getTranslation(language, 'passwordsNotMatch'), visible: true });
      setTimeout(() => setMessage({ ...message, visible: false }), 3000);
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: getTranslation(language, 'passwordLengthError'), visible: true });
      setTimeout(() => setMessage({ ...message, visible: false }), 3000);
      return;
    }

    setMessage({ type: 'success', text: '✓ ' + getTranslation(language, 'passwordChangedSuccess'), visible: true });
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswordChange(false);
    setTimeout(() => setMessage({ ...message, visible: false }), 3000);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempPhotoPreview(reader.result);
        setMessage({ type: 'success', text: getTranslation(language, 'photoSelectedSuccess'), visible: true });
        setTimeout(() => setMessage({ ...message, visible: false }), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex h-screen admin-page">
      <Sidebar currentPage="profile" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {message.visible && (
            <div className={`mb-6 p-4 rounded-lg text-gray-900 dark:text-white font-semibold animate-pulse ${
              message.type === 'success' ? 'bg-green-100 dark:bg-green-500' : 'bg-red-100 dark:bg-red-500'
            }`}>
              {message.text}
            </div>
          )}

          <div className="page-header mb-12">
            <h1 className="page-title">{getTranslation(language, 'adminProfilePage')}</h1>
            <p className="page-subtitle">{getTranslation(language, 'manageAccountProfile')}</p>
            <div className="page-divider"></div>
          </div>

          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-xl p-10 mb-8 border border-emerald-200">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
              {/* Profile Photo Section */}
              <div className="flex flex-col items-center justify-start lg:col-span-1">
                <div className="relative mb-6">
                  <div className="w-40 h-40 rounded-full border-4 border-green-600 overflow-hidden shadow-xl bg-green-50 flex items-center justify-center">
                    <img 
                      src={tempPhotoPreview || (editMode ? editData.profilePhoto : profileData.profilePhoto)}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute bottom-2 right-2 bg-green-600 text-white p-2 rounded-full shadow-lg">
                    ✓
                  </div>
                </div>

                <label className="cursor-pointer bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition transform hover:scale-105 shadow-lg">
                  {getTranslation(language, 'changePhoto')}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>

                <div className="mt-8 text-center space-y-2">
                  <p className="text-gray-800 font-bold text-lg">{getTranslation(language, 'administrator')}</p>
                  <p className="text-green-600 font-semibold">BhooDrishti System</p>
                  <p className="text-gray-500 text-sm">Status: Active</p>
                </div>
              </div>

              {/* Profile Information Section */}
              <div className="lg:col-span-3">
                {editMode ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-gray-700 font-bold mb-3">{getTranslation(language, 'firstName')}</label>
                        <input
                          type="text"
                          value={editData.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 font-bold mb-3">{getTranslation(language, 'lastName')}</label>
                        <input
                          type="text"
                          value={editData.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-3">{getTranslation(language, 'emailAddress')}</label>
                      <input
                        type="email"
                        value={editData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-3">{getTranslation(language, 'phoneNumber')}</label>
                      <input
                        type="tel"
                        value={editData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-3">{getTranslation(language, 'organization')}</label>
                      <input
                        type="text"
                        value={editData.organization}
                        onChange={(e) => handleInputChange('organization', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition"
                      />
                    </div>

                    <div className="flex gap-3 pt-6">
                      <button
                        onClick={handleSaveProfile}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition transform hover:scale-105 shadow-lg"
                      >
                        💾 {getTranslation(language, 'saveChanges')}
                      </button>
                      <button
                        onClick={() => {
                          setEditMode(false);
                          setEditData(profileData);
                          setTempPhotoPreview(null);
                        }}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-4 rounded-lg transition"
                      >
                        {getTranslation(language, 'cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                        <p className="text-gray-600 text-sm font-semibold mb-2">{getTranslation(language, 'firstName')}</p>
                        <p className="text-gray-800 text-2xl font-bold">{profileData.firstName}</p>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                        <p className="text-gray-600 text-sm font-semibold mb-2">{getTranslation(language, 'lastName')}</p>
                        <p className="text-gray-800 text-2xl font-bold">{profileData.lastName}</p>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200 md:col-span-2">
                        <p className="text-gray-600 text-sm font-semibold mb-2">{getTranslation(language, 'emailAddress')}</p>
                        <p className="text-gray-800 text-lg font-bold">{profileData.email}</p>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                        <p className="text-gray-600 text-sm font-semibold mb-2">{getTranslation(language, 'phoneNumber')}</p>
                        <p className="text-gray-800 text-lg font-bold">{profileData.phone}</p>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                        <p className="text-gray-600 text-sm font-semibold mb-2">{getTranslation(language, 'organization')}</p>
                        <p className="text-gray-800 text-lg font-bold">{profileData.organization}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setEditMode(true)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition transform hover:scale-105 shadow-lg"
                    >
                      {getTranslation(language, 'editProfile')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-white rounded-2xl shadow-xl p-10 border border-gray-100">
              <h2 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
              <span className="bg-gradient-to-r from-red-500 to-red-600 text-white w-12 h-12 rounded-lg flex items-center justify-center text-xl"></span>
              {getTranslation(language, 'securityPassword')}
            </h2>
            
            {!showPasswordChange ? (
              <button
                onClick={() => setShowPasswordChange(true)}
                className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-lg transition transform hover:scale-105 shadow-lg"
              >
                {getTranslation(language, 'changePasswordBtn')}
              </button>
            ) : (
              <form onSubmit={handleChangePassword} className="w-full max-w-2xl">
                <div className="space-y-6 bg-gray-50 p-8 rounded-xl border border-gray-200">
                  <div>
                    <label className="block text-gray-700 font-bold mb-3">{getTranslation(language, 'currentPasswordLabel')}</label>
                    <div className="relative">
                      <input
                        type={showPasswords.currentPassword ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, currentPassword: !prev.currentPassword }))}
                        className="absolute right-3 top-3.5 text-gray-600 hover:text-gray-800 text-sm"
                      >
                        {showPasswords.currentPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-3">{getTranslation(language, 'newPasswordLabel')}</label>
                    <div className="relative">
                      <input
                        type={showPasswords.newPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, newPassword: !prev.newPassword }))}
                        className="absolute right-3 top-3.5 text-gray-600 hover:text-gray-800 text-sm"
                      >
                        {showPasswords.newPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">{getTranslation(language, 'passwordRequirements')}</p>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-3">{getTranslation(language, 'confirmNewPassword')}</label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirmPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirmPassword: !prev.confirmPassword }))}
                        className="absolute right-3 top-3.5 text-gray-600 hover:text-gray-800 text-sm"
                      >
                        {showPasswords.confirmPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-lg transition transform hover:scale-105 shadow-lg"
                    >
                      {getTranslation(language, 'updatePassword')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordChange(false);
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      }}
                      className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition"
                    >
                      {getTranslation(language, 'cancel')}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Account Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <p className="text-gray-600 text-sm font-semibold">{getTranslation(language, 'accountStatus')}</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{getTranslation(language, 'active')}</p>
              <p className="text-gray-500 text-xs mt-2">{getTranslation(language, 'allSystemsOperational')}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <p className="text-gray-600 text-sm font-semibold">Member Since</p>
              <p className="text-2xl font-bold text-green-600 mt-2">Jan 2024</p>
              <p className="text-gray-500 text-xs mt-2">10 months ago</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
              <p className="text-gray-600 text-sm font-semibold">{getTranslation(language, 'lastLogin')}</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">Today</p>
              <p className="text-gray-500 text-xs mt-2">Just now</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
              <p className="text-gray-600 text-sm font-semibold">{getTranslation(language, 'securityLevel')}</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">{getTranslation(language, 'highSecurity')}</p>
              <p className="text-gray-500 text-xs mt-2">{getTranslation(language, 'protectedAccount')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfilePage;
