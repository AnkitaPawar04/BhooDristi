import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LogoutConfirm from './LogoutConfirm';
import { useApp } from '../contexts/AppContext';
import { getTranslation } from '../utils/i18n';
import farmerProfileImage from '../assets/farmer_profile.png';
import adminProfileImage from '../assets/admin_profile.jpg';

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
  FiClipboard,
  FiFileText,
  FiMessageCircle,
  FiCalendar,
  FiDollarSign,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';

const Sidebar = ({ userName, currentPage, onNavigate }) => {
  const navigate = useNavigate();
  const { language } = useApp();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Check if user is admin
  const isAdmin = localStorage.getItem('is_admin') === 'true';
  
  // Get user info from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userFirstName = user.firstName || user.firstname || user.name || (isAdmin ? 'Administrator' : 'Farmer');
  const userInitials = (userFirstName || 'F')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'F';

  const userAvatarUrl = user.profilePhoto || (isAdmin ? adminProfileImage : farmerProfileImage);

  const farmerMenuItems = [
    { id: 'dashboard', label: getTranslation(language, 'dashboard'), path: '/dashboard', icon: FiHome },
    { id: 'crop-recommendation', label: getTranslation(language, 'cropRecommendation'), path: '/crop-recommendation', icon: FiTrendingUp },
    { id: 'irrigation', label: getTranslation(language, 'irrigationPrediction'), path: '/irrigation', icon: FiDroplet },
    { id: 'fertilizer', label: getTranslation(language, 'fertilizerShops') || 'Nearby Fertilizer Shops', path: '/fertilizer', icon: FiMapPin },
    { id: 'soil', label: getTranslation(language, 'soilManagement'), path: '/soil', icon: FiFilter },
    { id: 'Schemes', label: getTranslation(language, 'governmentSchemes'), path: '/Schemes', icon: FiHome },
    { id: 'planner', label: getTranslation(language, 'farmPlanner'), path: '/farm-planner', icon: FiCalendar },
    { id: 'market', label: getTranslation(language, 'marketInformationPage'), path: '/market', icon: FiDollarSign },
     { id: 'weather', label: getTranslation(language, 'weatherInformation'), path: '/weather', icon: FiSun },
    { id: 'profile', label: getTranslation(language, 'profile'), path: '/profile', icon: FiUser },
    { id: 'settings', label: getTranslation(language, 'settings'), path: '/settings', icon: FiSettings },
    
  ];

  const adminMenuItems = [
    { id: 'dashboard', label: getTranslation(language, 'dashboard'), path: '/admin/dashboard', icon: FiBarChart2 },
    { id: 'analytics', label: getTranslation(language, 'adminAnalytics'), path: '/admin/analytics', icon: FiBarChart2 },
    { id: 'reports', label: getTranslation(language, 'adminReports'), path: '/admin/reports', icon: FiFileText },
    { id: 'farmers', label: getTranslation(language, 'farmerManagement'), path: '/admin/farmers', icon: FiUsers },
    { id: 'predictions', label: getTranslation(language, 'predictionMonitoring'), path: '/admin/predictions', icon: FiClipboard },
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
      <div className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Header Section - Same Color as BhooDrishti */}
        <div className="sidebar-header">
          <div className="sidebar-header-row">
            <div className="sidebar-header-text">
              <h1 className="text-2xl font-bold text-white">{getTranslation(language, 'appName')}</h1>
              <p className="text-sm mt-2 text-white font-semibold opacity-100">{getTranslation(language, 'smartFarmingPlatform')}</p>
            </div>
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={() => setIsCollapsed((value) => !value)}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
            </button>
          </div>
        </div>

        {/* User Profile Section - Clean Display */}
        <div className="sidebar-welcome">
          <div className="flex items-center gap-3 sidebar-user-row">
            <div className="sidebar-avatar">
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt={userFirstName}
                  className="sidebar-avatar-image"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement.querySelector('.sidebar-avatar-text').style.display = 'flex';
                  }}
                />
              ) : null}
              <span className="sidebar-avatar-text" style={{ display: userAvatarUrl ? 'none' : 'flex' }}>
                {userInitials}
              </span>
            </div>
            <div className="flex-1 sidebar-user-text">
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
            <span>{getTranslation(language, 'logout')}</span>
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
