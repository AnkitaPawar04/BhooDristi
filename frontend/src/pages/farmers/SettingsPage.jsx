import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { useApp } from '../../contexts/AppContext';
import { getTranslation, getLanguages } from '../../utils/i18n';
import dashboardBgVideo from './videos/dashboard.mp4';

const SettingsPage = ({ onNavigate }) => {
  const { language, changeLanguage, theme, changeTheme, notifications, updateNotifications } = useApp();
  const [activeTab, setActiveTab] = useState('preferences');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const handleLanguageChange = (newLang) => {
    changeLanguage(newLang);
  };

  const handleThemeChange = (newTheme) => {
    changeTheme(newTheme);
  };

  const handleNotificationChange = (type) => {
    updateNotifications({
      ...notifications,
      [type]: !notifications[type],
    });
  };

  const handleTwoFactorToggle = () => {
    if (!twoFactorEnabled) {
      setShowTwoFactorSetup(true);
    } else {
      setTwoFactorEnabled(false);
      setShowTwoFactorSetup(false);
      setVerificationCode('');
    }
  };

  const handleVerifyCode = () => {
      if (verificationCode.trim().length === 6) {
      setTwoFactorEnabled(true);
      setShowTwoFactorSetup(false);
      setVerificationCode('');
      alert('Two-Factor Authentication enabled successfully!');
    } else {
      alert('Please enter a valid 6-digit code');
    }
  };

  const languages = getLanguages();

  return (
    <div className="flex h-screen bg-transparent dark:bg-transparent">
      <Sidebar currentPage="settings" onNavigate={onNavigate} userName="Farmer" />
      
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
          <div className="page-header animate-fadeInUp">
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Manage your account preferences and security</p>
            <div className="page-divider"></div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b-2 border-green-200 dark:border-green-700">
            <button
              onClick={() => setActiveTab('preferences')}
              className={`pb-3 px-1 font-semibold text-white border-b-2 border-green-600 dark:border-green-400`}
            >
              Preferences
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`pb-3 px-1 font-semibold transition ${
                activeTab === 'account'
                  ? 'text-white border-b-2 border-green-600 dark:border-green-400'
                  : 'text-white hover:text-white'
              }`}
              >
              Account
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`pb-3 px-1 font-semibold transition ${
                activeTab === 'privacy'
                  ? 'text-white border-b-2 border-green-600 dark:border-green-400'
                  : 'text-white hover:text-white'
              }`}
              >
              Privacy
            </button>
          </div>

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-8">
              {/* Language Settings */}
              <div className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-green-200 dark:border-green-700 overflow-hidden hover:shadow-lg transition duration-300">
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
                  <h2 className="text-3xl font-bold flex items-center gap-3">Language & Localization</h2>
                </div>
                <div className="p-8">
                  <div className="space-y-4">
                    {Object.entries(languages).map(([code, name]) => (
                      <label key={code} className="flex items-center p-4 border-2 border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-green-50 dark:hover:bg-gray-700 transition" style={{backgroundColor: language === code ? '#dcfce7' : 'transparent', borderColor: language === code ? '#22c55e' : undefined}}>
                        <input
                          type="radio"
                          name="language"
                          value={code}
                          checked={language === code}
                          onChange={() => handleLanguageChange(code)}
                          className="w-4 h-4 text-green-600"
                        />
                        <span className="ml-4 text-lg text-gray-800 dark:text-gray-100 font-semibold">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Theme Settings */}
              <div className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-blue-200 dark:border-blue-700 overflow-hidden hover:shadow-lg transition duration-300">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
                  <h2 className="text-3xl font-bold flex items-center gap-3">Appearance & Theme</h2>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {['light', 'dark', 'system'].map((themeOption) => (
                      <label
                        key={themeOption}
                        className={`p-6 border-2 rounded-lg cursor-pointer transition btn-hover ${
                          theme === themeOption
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/40'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <input
                          type="radio"
                          name="theme"
                          value={themeOption}
                          checked={theme === themeOption}
                          onChange={() => handleThemeChange(themeOption)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div className="mt-3">
                          <div className="font-semibold text-gray-800 capitalize dark:text-gray-200">
                            {themeOption === 'light' ? 'Light Mode' : themeOption === 'dark' ? 'Dark Mode' : 'System Default'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            {themeOption === 'light' && 'Bright and clean interface'}
                            {themeOption === 'dark' && 'Easy on the eyes'}
                            {themeOption === 'system' && 'Follow your system settings'}
                          </div>
                          {/* Theme Preview */}
                          <div className={`mt-4 p-3 rounded border ${
                            themeOption === 'light' ? 'bg-white border-gray-300' :
                            themeOption === 'dark' ? 'bg-gray-900 border-gray-700 text-white' :
                            'bg-gray-100 border-gray-300'
                          }`}>
                            <p className={`text-xs ${
                              themeOption === 'light' ? 'text-gray-600' :
                              themeOption === 'dark' ? 'text-gray-300' :
                              'text-gray-600'
                            }`}>
                              Preview
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-yellow-200 dark:border-yellow-700 overflow-hidden hover:shadow-lg transition duration-300">
                <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 text-white">
                  <h2 className="text-3xl font-bold flex items-center gap-3">Notifications</h2>
                </div>
                <div className="p-8">
                  <div className="space-y-4">
                    {[
                      { key: 'email', label: 'Email Notifications' },
                      { key: 'sms', label: 'SMS Notifications' },
                      { key: 'push', label: 'Push Notifications' },
                    ].map(({ key, label, icon }) => (
                      <div key={key} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 hover:bg-yellow-50 dark:hover:bg-gray-600 transition">
                        <span className="text-lg text-gray-800 dark:text-gray-100 font-semibold">
                            {label}
                          </span>
                        <button
                          onClick={() => handleNotificationChange(key)}
                          className={`relative inline-flex h-8 w-14 items-center rounded-full transition btn-hover ${
                            notifications[key] ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-500'
                          }`}
                        >
                          <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                              notifications[key] ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-8">
              <div className="card card-content">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
                  {getTranslation(language, 'twoFactorAuth')}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Enhance your account security with two-factor authentication
                </p>

                {/* 2FA Status */}
                {!showTwoFactorSetup && (
                  <div className="mb-6 p-4 rounded-lg" style={{backgroundColor: twoFactorEnabled ? '#dcfce7' : '#fef3c7', borderLeft: '4px solid ' + (twoFactorEnabled ? '#16a34a' : '#ea580c')}}>
                    <p style={{color: twoFactorEnabled ? '#166534' : '#92400e'}} className="font-semibold flex items-center gap-2">
                      {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                    <p style={{color: twoFactorEnabled ? '#15803d' : '#b45309'}} className="text-sm mt-1">
                      {twoFactorEnabled ? 'Your account is protected with two-factor authentication.' : 'Enable 2FA to add an extra layer of security to your account.'}
                    </p>
                  </div>
                )}

                {/* 2FA Setup Form */}
                {showTwoFactorSetup && !twoFactorEnabled && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-400 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-4">Set Up Two-Factor Authentication</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-blue-800 dark:text-blue-300 font-semibold mb-2">Step 1: Scan QR Code with Authenticator App</p>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded border-2 border-dashed border-blue-300 text-center">
                            <div className="w-40 h-40 mx-auto bg-gray-200 rounded flex items-center justify-center text-gray-600 text-sm">
                            QR Code
                            <br />
                            (Use Google Authenticator, Authy, or Microsoft Authenticator)
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm text-blue-800 dark:text-blue-300 font-semibold block mb-2">Step 2: Enter 6-digit verification code</label>
                        <input
                          type="text"
                          maxLength="6"
                          placeholder="000000"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-4 py-3 text-center text-2xl tracking-widest border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 dark:bg-gray-700 dark:text-white dark:border-blue-600"
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                          <button
                          onClick={handleVerifyCode}
                          disabled={verificationCode.length !== 6}
                          className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          Verify & Enable
                        </button>
                        <button
                          onClick={() => {
                            setShowTwoFactorSetup(false);
                            setVerificationCode('');
                          }}
                          className="flex-1 px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white font-semibold rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={handleTwoFactorToggle}
                  className={`px-6 py-3 font-semibold rounded-lg transition btn-hover text-white ${
                    twoFactorEnabled
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </button>
              </div>

              {/* Password Settings */}
              <div className="card card-content">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
                  Change Password
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Update your password regularly to keep your account secure
                </p>
                <button className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition btn-hover">
                  Change Password
                </button>
              </div>

              {/* Active Sessions */}
              <div className="card card-content">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
                  Active Sessions
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">Current Device</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Windows • Chrome • Active now</p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-semibold">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-8">
              {/* Privacy Controls */}
              <div className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-purple-200 dark:border-purple-700 overflow-hidden hover:shadow-2xl transition duration-300 transform hover:-translate-y-1">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 text-white">
                  <h2 className="text-3xl font-bold flex items-center gap-3">Privacy Controls</h2>
                </div>
                <div className="p-8">
                  <div className="space-y-4">
                    {[
                        { 
                        key: 'profileVisibility', 
                        label: 'Profile Visibility', 
                        description: 'Control who can view your farm profile and location data',
                        icon: '🌍'
                      },
                      { 
                        key: 'dataCollection', 
                        label: 'Data Collection', 
                        description: 'Allow system to collect usage analytics for service improvement',
                        icon: ''
                      },
                      { 
                        key: 'personalizedRecommendations', 
                        label: 'Personalized Recommendations', 
                        description: 'Receive tailored crop and weather recommendations',
                        icon: '🎯'
                      },
                    ].map(({ key, label, description, icon }) => (
                      <div key={key} className="p-5 border-2 border-purple-100 dark:border-purple-800 rounded-lg dark:bg-gray-700 hover:bg-purple-50 dark:hover:bg-gray-600 transition">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">{label}</span>
                          <button
                            onClick={() => handlePrivacyChange(key)}
                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition btn-hover ${
                              privacy[key] ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-500'
                            }`}
                          >
                            <span
                              className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                                privacy[key] ? 'translate-x-7' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Data Download & Export */}
              <div className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-indigo-200 dark:border-indigo-700 overflow-hidden hover:shadow-2xl transition duration-300 transform hover:-translate-y-1">
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-6 text-white">
                  <h2 className="text-3xl font-bold flex items-center gap-3">Data Export & Download</h2>
                </div>
                <div className="p-8">
                  <div className="space-y-4">
                    <button className="w-full px-6 py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition shadow-lg btn-hover">
                      Download My Data (CSV)
                    </button>
                    <button className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition shadow-lg btn-hover">
                      Request Account Report
                    </button>
                  </div>
                  <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900 border border-indigo-200 dark:border-indigo-700 rounded-lg">
                    <p className="text-sm text-indigo-800 dark:text-indigo-200">
                      Your data will be compiled and ready for download within 24 hours.
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Deletion */}
              <div className="farm-card bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-4 border-red-200 dark:border-red-700 overflow-hidden hover:shadow-2xl transition duration-300 transform hover:-translate-y-1">
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
                  <h2 className="text-3xl font-bold flex items-center gap-3">Danger Zone</h2>
                </div>
                <div className="p-8">
                  <div className="p-6 bg-red-50 dark:bg-red-900 border-2 border-red-200 dark:border-red-800 rounded-lg">
                    <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-3">Delete Account</h3>
                    <p className="text-red-700 dark:text-red-300 mb-6 text-sm">
                      Once you delete your account, there is no going back. All your data, recommendations, and settings will be permanently removed.
                    </p>
                    <button className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition shadow-lg btn-hover">
                      Delete Account Permanently
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
