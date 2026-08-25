import React, { useState } from 'react';
import ChatbotPage from './pages/farmers/ChatbotPage';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import FarmBackground from './components/FarmBackground';
import AdminBackground from './components/AdminBackground';
import LoginPage from './pages/farmers/LoginPage';
import DashboardPage from './pages/farmers/DashboardPage';
import CropRecommendationPage from './pages/farmers/CropRecommendationPage';
import IrrigationPage from './pages/farmers/IrrigationPage';
import FertilizerShopsPage from './pages/farmers/FertilizerShopsPage';
import SoilManagementPage from './pages/farmers/SoilManagementPage';
import WeatherPage from './pages/farmers/WeatherPage';
import ProfilePage from './pages/farmers/ProfilePage';
import SettingsPage from './pages/farmers/SettingsPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminFarmerManagementPage from './pages/admin/AdminFarmerManagementPage';
import AdminCropManagementPage from './pages/admin/AdminCropManagementPage';
import AdminSoilManagementPage from './pages/admin/AdminSoilManagementPage';
import AdminWeatherAlertsPage from './pages/admin/AdminWeatherAlertsPage';
import AdminNotificationsPage from './pages/admin/AdminNotificationsPage';
import AdminProfilePage from './pages/admin/AdminProfilePage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import authStorage from './services/authStorage';
import './index.css';
import './admin-cards.css';
import Schemes from './pages/farmers/Schemes';


const ProtectedRoute = ({ children }) => {
  if (!authStorage.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AdminRoute = ({ children }) => {
  const isAdmin = localStorage.getItem('is_admin') === 'true';
  const hasToken = authStorage.isAuthenticated();
  
  if (!isAdmin || !hasToken) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
};

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="*" element={<BackgroundWrappedApp handleNavigate={handleNavigate} />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

// Separate component to wrap routes with appropriate background
function BackgroundWrappedApp({ handleNavigate }) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLoginRoute = location.pathname === '/login' || location.pathname === '/admin/login';
  const isDashboardRoute = location.pathname === '/dashboard';

  const content = (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Farmer Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/crop-recommendation"
        element={
          <ProtectedRoute>
            <CropRecommendationPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/irrigation"
        element={
          <ProtectedRoute>
            <IrrigationPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/fertilizer"
        element={
          <ProtectedRoute>
            <FertilizerShopsPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        }
      />

<Route
  path="/Schemes"
  element={
    <ProtectedRoute>
      <Schemes onNavigate={handleNavigate} />
    </ProtectedRoute>
  }
/>
      <Route
        path="/soil"
        element={
          <ProtectedRoute>
            <SoilManagementPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/weather"
        element={
          <ProtectedRoute>
            <WeatherPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chatbot"
        element={
          <ProtectedRoute>
            <ChatbotPage onNavigate={handleNavigate} />
          </ProtectedRoute>
      }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage onNavigate={handleNavigate} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage onNavigate={handleNavigate} />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/farmers"
        element={
          <AdminRoute>
            <AdminFarmerManagementPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/crops"
        element={
          <AdminRoute>
            <AdminCropManagementPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/soil"
        element={
          <AdminRoute>
            <AdminSoilManagementPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/weather"
        element={
          <AdminRoute>
            <AdminWeatherAlertsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/notifications"
        element={
          <AdminRoute>
            <AdminNotificationsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/profile"
        element={
          <AdminRoute>
            <AdminProfilePage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <AdminRoute>
            <AdminSettingsPage />
          </AdminRoute>
        }
      />

      {/* Default Redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );

  if (isLoginRoute) {
    return content;
  }

  if (isDashboardRoute) {
    return content;
  }

  return isAdminRoute ? 
    <AdminBackground>{content}</AdminBackground> : 
    <FarmBackground>{content}</FarmBackground>;
}

export default App;
