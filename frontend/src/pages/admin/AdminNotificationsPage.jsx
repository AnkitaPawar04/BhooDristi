import React, { useEffect, useRef, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { useApp } from '../../contexts/AppContext';
import { getTranslation, getDistrictTranslation } from '../../utils/i18n';
import { adminAPI } from '../../services/api';

const AdminNotificationsPage = () => {
  const { language } = useApp();
  const [notifications, setNotifications] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    message: '',
    targetType: 'all',
    district: ''
  });
  const [districtSearch, setDistrictSearch] = useState('');
  const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '', visible: false });
  const districtDropdownRef = useRef(null);

  const filteredDistricts = districts.filter((district) => {
    const query = districtSearch.trim().toLowerCase();
    if (!query) return true;

    const translatedDistrict = getDistrictTranslation(district, language).toLowerCase();
    return district.toLowerCase().includes(query) || translatedDistrict.includes(query);
  });

  useEffect(() => {
    const loadDistricts = async () => {
      try {
        const response = await adminAPI.getAllDistricts();
        const districtList = response.data?.districts || [];
        setDistricts(districtList);

        if (districtList.length > 0) {
          setNotificationForm(prev => ({
            ...prev,
            district: prev.district || districtList[0]
          }));
          setDistrictSearch(getDistrictTranslation(districtList[0], language));
        }
      } catch (error) {
        console.error('Failed to load districts:', error);
        setMessage({
          type: 'error',
          text: 'Unable to load districts from database',
          visible: true
        });
        setTimeout(() => {
          setMessage(prev => ({ ...prev, visible: false }));
        }, 3000);
      }
    };

    loadDistricts();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (districtDropdownRef.current && !districtDropdownRef.current.contains(event.target)) {
        setIsDistrictDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (notificationForm.district) {
      setDistrictSearch(getDistrictTranslation(notificationForm.district, language));
    }
  }, [notificationForm.district, language]);

  const handleInputChange = (field, value) => {
    setNotificationForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSendNotification = (e) => {
    e.preventDefault();
    
    if (!notificationForm.message.trim()) {
      setMessage({ type: 'error', text: getTranslation(language, 'enterMessage'), visible: true });
      setTimeout(() => {
        setMessage(prev => ({ ...prev, visible: false }));
      }, 3000);
      return;
    }

    if (notificationForm.targetType === 'district' && !notificationForm.district) {
      setMessage({ type: 'error', text: 'Please select a district', visible: true });
      setTimeout(() => {
        setMessage(prev => ({ ...prev, visible: false }));
      }, 3000);
      return;
    }

    const newNotification = {
      id: Math.max(...notifications.map(n => n.id), 0) + 1,
      message: notificationForm.message,
      date: new Date().toISOString().split('T')[0],
      targetType: notificationForm.targetType,
      targetUsers: notificationForm.targetType === 'all' 
        ? getTranslation(language, 'allFarmers')
        : `${notificationForm.district} District`,
      type: 'info'
    };

    setNotifications([newNotification, ...notifications]);
    setNotificationForm({
      message: '',
      targetType: 'all',
      district: districts[0] || ''
    });
    setShowForm(false);
    setMessage({ 
      type: 'success', 
      text: getTranslation(language, 'notificationSent') + ' ' + newNotification.targetUsers, 
      visible: true 
    });
    setTimeout(() => {
      setMessage(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const handleDeleteNotification = (notificationId) => {
    setNotifications(notifications.filter(n => n.id !== notificationId));
    setMessage({ type: 'success', text: getTranslation(language, 'notificationDeleted'), visible: true });
    setTimeout(() => {
      setMessage(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  return (
    <div className="flex h-screen admin-page">
      <Sidebar currentPage="notifications" />
      
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
                <h1 className="page-title">{getTranslation(language, 'adminNotificationsPage')}</h1>
                <p className="page-subtitle">{getTranslation(language, 'sendNotificationsToFarmers')}</p>
                <div className="page-divider"></div>
              </div>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition"
              >
                ➕ {getTranslation(language, 'sendNotification')}
              </button>
            )}
          </div>

          {showForm && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📤 {getTranslation(language, 'broadcastMessage')}</h2>
              
              <form onSubmit={handleSendNotification} className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">{getTranslation(language, 'targetUsers')}</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="targetType"
                        value="all"
                        checked={notificationForm.targetType === 'all'}
                        onChange={(e) => handleInputChange('targetType', e.target.value)}
                        className="mr-2"
                      />
                      <span>All Farmers</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="targetType"
                        value="district"
                        checked={notificationForm.targetType === 'district'}
                        onChange={(e) => handleInputChange('targetType', e.target.value)}
                        className="mr-2"
                      />
                      <span>Specific District</span>
                    </label>
                  </div>
                </div>

                {notificationForm.targetType === 'district' && (
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Select District</label>
                    <div className="relative" ref={districtDropdownRef}>
                      <input
                        type="text"
                        value={districtSearch}
                        onFocus={() => setIsDistrictDropdownOpen(true)}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          setDistrictSearch(inputValue);
                          setIsDistrictDropdownOpen(true);

                          const exactMatch = districts.find(
                            (district) =>
                              district.toLowerCase() === inputValue.toLowerCase() ||
                              getDistrictTranslation(district, language).toLowerCase() === inputValue.toLowerCase()
                          );

                          handleInputChange('district', exactMatch || '');
                        }}
                        placeholder="Search or select district..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />

                      {isDistrictDropdownOpen && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                          {filteredDistricts.length === 0 ? (
                            <div className="px-4 py-2 text-gray-500">No districts found</div>
                          ) : (
                            filteredDistricts.map((district) => (
                              <button
                                key={district}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleInputChange('district', district);
                                  setDistrictSearch(getDistrictTranslation(district, language));
                                  setIsDistrictDropdownOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 hover:bg-purple-50 transition ${
                                  notificationForm.district === district ? 'bg-purple-100 text-purple-800' : 'text-gray-800'
                                }`}
                              >
                                {getDistrictTranslation(district, language)}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Message</label>
                  <textarea
                    value={notificationForm.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    placeholder="Enter your notification message..."
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={notificationForm.targetType === 'district' && !notificationForm.district}
                    className="flex-1 !bg-purple-700 hover:!bg-purple-800 !text-white font-bold py-2 px-4 rounded-lg shadow-sm transition disabled:!bg-gray-400 disabled:!text-white disabled:cursor-not-allowed disabled:opacity-100"
                  >
                    📤 Send to {notificationForm.targetType === 'all' ? 'All Farmers' : notificationForm.district}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 !bg-slate-700 hover:!bg-slate-800 !text-white font-bold py-2 px-4 rounded-lg border !border-slate-700 shadow-sm transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Notification History */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 Notification History</h2>
            
            <div className="space-y-3">
              {notifications.length > 0 ? (
                notifications.map(notif => (
                  <div 
                    key={notif.id}
                    className={`border-l-4 rounded-lg p-4 ${
                      notif.type === 'warning' 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-blue-500 bg-blue-50'
                    } hover:shadow-md transition`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 text-lg">{notif.message}</h3>
                        <div className="mt-2 flex gap-4 text-sm text-gray-600">
                          <span>📍 {notif.targetUsers}</span>
                          <span>📅 {notif.date}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteNotification(notif.id)}
                        className="text-red-600 hover:text-red-700 font-semibold"
                        title="Delete notification"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No notifications sent yet</p>
              )}
            </div>
          </div>

          {/* Stats Card */}
          <div className="mt-8 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-500 dark:to-indigo-600 rounded-lg shadow-lg p-6 text-gray-800 dark:text-white">
            <h3 className="text-xl font-bold mb-4">📊 Notification Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-purple-700 dark:text-purple-100 text-sm">Total Sent</p>
                <p className="text-3xl font-bold">{notifications.length}</p>
              </div>
              <div>
                <p className="text-purple-700 dark:text-purple-100 text-sm">To All Farmers</p>
                <p className="text-3xl font-bold">{notifications.filter(n => n.targetType === 'all').length}</p>
              </div>
              <div>
                <p className="text-purple-700 dark:text-purple-100 text-sm">District-wise</p>
                <p className="text-3xl font-bold">{notifications.filter(n => n.targetType === 'district').length}</p>
              </div>
              <div>
                <p className="text-purple-700 dark:text-purple-100 text-sm">This Month</p>
                <p className="text-3xl font-bold">{notifications.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationsPage;
