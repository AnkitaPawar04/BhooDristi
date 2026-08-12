import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { useApp } from '../../contexts/AppContext';
import { getTranslation, getLanguages } from '../../utils/i18n';

const AdminSettingsPage = ({ onNavigate }) => {
  const { language, changeLanguage, theme, changeTheme, notifications, updateNotifications } = useApp();
  const [activeTab, setActiveTab] = useState('preferences');

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

  const languages = getLanguages();


  return (
    <div className="flex h-screen admin-page">
      <Sidebar currentPage="settings" onNavigate={onNavigate} userName="Admin" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="page-header mb-8">
            <h1 className="page-title">
              {getTranslation(language, 'settings')}
            </h1>
            <p className="page-subtitle">Manage admin preferences and system settings</p>
            <div className="page-divider"></div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-gray-300">
            <button
              onClick={() => setActiveTab('preferences')}
              className={`pb-4 px-4 font-semibold transition ${
                activeTab === 'preferences'
                  ? 'border-b-2 border-green-600 text-green-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {getTranslation(language, 'preferences')}
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`pb-4 px-4 font-semibold transition ${
                activeTab === 'account'
                  ? 'border-b-2 border-green-600 text-green-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {getTranslation(language, 'account')}
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`pb-4 px-4 font-semibold transition ${
                activeTab === 'privacy'
                  ? 'border-b-2 border-green-600 text-green-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {getTranslation(language, 'privacy')}
            </button>
          </div>

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-8">
              {/* Language Settings */}
              <div className="card card-content">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
                  {getTranslation(language, 'language')}
                </h2>
                <div className="space-y-4">
                  {Object.entries(languages).map(([code, name]) => (
                    <label key={code} className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition dark:bg-gray-700">
                      <input
                        type="radio"
                        name="language"
                        value={code}
                        checked={language === code}
                        onChange={() => handleLanguageChange(code)}
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="ml-4 text-lg text-gray-800 dark:text-gray-100">{name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Theme Settings */}
              <div className="card card-content">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
                  {getTranslation(language, 'appearance')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {['light', 'dark', 'system'].map((themeOption) => (
                    <label
                      key={themeOption}
                      className={`p-6 border-2 rounded-lg cursor-pointer transition btn-hover ${
                        theme === themeOption
                          ? 'border-green-600 bg-green-50 dark:bg-green-900/40'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={themeOption}
                        checked={theme === themeOption}
                        onChange={() => handleThemeChange(themeOption)}
                        className="w-4 h-4 text-green-600"
                      />
                      <div className="mt-3">
                        <div className="font-semibold text-gray-800 capitalize dark:text-gray-200">
                          {getTranslation(language, themeOption === 'light' ? 'lightMode' : themeOption === 'dark' ? 'darkMode' : 'systemMode')}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          {themeOption === 'light' && getTranslation(language, 'lightTheme')}
                          {themeOption === 'dark' && getTranslation(language, 'darkTheme')}
                          {themeOption === 'system' && getTranslation(language, 'systemDefault')}
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
                <div className="p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Your theme preference is saved and will be applied across all sessions
                  </p>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="card card-content">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
                  {getTranslation(language, 'notifications')}
                </h2>
                <div className="space-y-4">
                  {[
                    { key: 'email', label: 'emailNotifications' },
                    { key: 'sms', label: 'smsNotifications' },
                    { key: 'push', label: 'pushNotifications' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition">
                      <span className="text-lg text-gray-800 dark:text-gray-100">
                        {getTranslation(language, label)}
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
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-8">
              <div className="card card-content">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
                  {getTranslation(language, 'twoFactorAuth')}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Enhance your admin account security with two-factor authentication
                </p>
                <button className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition btn-hover">
                  {getTranslation(language, 'enable')}
                </button>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-8">
              <div className="card card-content">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 dark:text-gray-100">
                  {getTranslation(language, 'dataUsage')}
                </h2>
                <p className="text-gray-600 mb-4 dark:text-gray-300">
                  We use your data to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
                  <li>Manage farmer accounts and activities</li>
                  <li>Monitor system performance and health</li>
                  <li>Send important platform updates</li>
                  <li>Ensure platform security and availability</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
