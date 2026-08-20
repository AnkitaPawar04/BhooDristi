import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LogoutConfirm from './LogoutConfirm';
import { useApp } from '../contexts/AppContext';
import { getTranslation } from '../utils/i18n';

import {
  FiHome,
  FiTrendingUp,
  FiDroplet,
  FiMapPin,
  FiSun,
  FiUser,
  FiSettings,
  FiLogOut,
  FiUsers,
  FiFilter,
  FiAlertCircle,
  FiBell,
  FiBarChart2,
  FiFileText,
  FiMessageCircle
} from 'react-icons/fi';

const Sidebar = ({ userName, currentPage, onNavigate }) => {
  const navigate = useNavigate();
  const { language } = useApp();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Check if user is admin
  const isAdmin = localStorage.getItem('is_admin') === 'true';
  
  // Get user info from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userFirstName = user.firstName || (isAdmin ? 'Administrator' : 'Farmer');

  const farmerMenuItems = [
    { id: 'dashboard', label: getTranslation(language, 'dashboard'), path: '/dashboard', icon: FiHome },
    { id: 'crop-recommendation', label: getTranslation(language, 'cropRecommendation'), path: '/crop-recommendation', icon: FiTrendingUp },
    { id: 'irrigation', label: getTranslation(language, 'irrigationPrediction'), path: '/irrigation', icon: FiDroplet },
    { id: 'fertilizer', label: getTranslation(language, 'fertilizerShops') || 'Nearby Fertilizer Shops', path: '/fertilizer', icon: FiMapPin },
    { id: 'soil', label: getTranslation(language, 'soilManagement'), path: '/soil', icon: FiFilter },
    { id: 'Schemes', label: getTranslation(language, 'governmentSchemes'), path: '/Schemes', icon: FiFileText },
    { id: 'weather', label: getTranslation(language, 'weatherInformation'), path: '/weather', icon: FiSun },
    { id: 'chatbot', label: 'Farmer Chatbot', path: '/chatbot', icon: FiMessageCircle },
    { id: 'profile', label: getTranslation(language, 'profile'), path: '/profile', icon: FiUser },
    { id: 'settings', label: getTranslation(language, 'settings'), path: '/settings', icon: FiSettings },
    
  ];

  const adminMenuItems = [
    { id: 'dashboard', label: getTranslation(language, 'dashboard'), path: '/admin/dashboard', icon: FiBarChart2 },
    { id: 'farmers', label: getTranslation(language, 'farmerManagement'), path: '/admin/farmers', icon: FiUsers },
    { id: 'crops', label: getTranslation(language, 'cropManagement'), path: '/admin/crops', icon: FiTrendingUp },
    { id: 'soil', label: getTranslation(language, 'soilManagement'), path: '/admin/soil', icon: FiFilter },
    { id: 'weather', label: getTranslation(language, 'weatherAlerts'), path: '/admin/weather', icon: FiAlertCircle },
    { id: 'notifications', label: getTranslation(language, 'notifications'), path: '/admin/notifications', icon: FiBell },
    { id: 'profile', label: getTranslation(language, 'adminProfile'), path: '/admin/profile', icon: FiUser },
    { id: 'settings', label: getTranslation(language, 'adminSettings'), path: '/admin/settings', icon: FiSettings },
  ];

  const menuItems = isAdmin ? adminMenuItems : farmerMenuItems;

  const handleNavigateClick = (item) => {
    navigate(item.path);
    if (onNavigate) onNavigate(item.id);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <>
      <div className="sidebar">
        {/* Header Section - Same Color as BhooDrishti */}
        <div className="sidebar-header">
          <h1 className="text-2xl font-bold text-white">{getTranslation(language, 'appName')}</h1>
          <p className="text-sm mt-2 text-white font-semibold opacity-100">Smart Farming Platform</p>
        </div>

        {/* User Profile Section - Clean Display */}
        <div className="sidebar-welcome">
          <div className="flex items-center gap-3">
            <div className="sidebar-avatar">
              {isAdmin ? <FiUser size={32} /> : <FiUser size={32} />}
            </div>
            <div className="flex-1">
              <p className="text-xs text-white">{getTranslation(language, 'welcomeBack')}</p>
              <p className="text-lg font-bold text-white">{userFirstName}</p>
            </div>
          </div>
        </div>

        {/* Menu Items - Clean Design */}
        <nav className="sidebar-menu">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigateClick(item)}
                className={`menu-item ${currentPage === item.id ? 'active' : ''}`}
              >
                <IconComponent className="menu-icon" />
                <span className="menu-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="sidebar-logout">
          <button
            onClick={handleLogoutClick}
            className="logout-btn"
          >
            <FiLogOut size={18} />
            {getTranslation(language, 'logout')}
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirm
        isOpen={showLogoutConfirm}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
};

export default Sidebar;
