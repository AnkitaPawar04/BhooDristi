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

function ChatbotFloatingWidget() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAuthRoute = location.pathname !== '/login' && location.pathname !== '/admin/login';

  if (!isAuthRoute || isAdminRoute) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open Farmer Assistant"
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          zIndex: 9999,
          width: '62px',
          height: '62px',
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#fff',
          boxShadow: '0 18px 36px rgba(16, 185, 129, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            right: '24px',
            bottom: '96px',
            width: '390px',
            maxWidth: 'calc(100vw - 24px)',
            height: '560px',
            maxHeight: 'calc(100vh - 120px)',
            zIndex: 9998,
            borderRadius: '22px',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.28)',
            overflow: 'hidden',
            background: '#fff',
          }}
        >
          <ChatbotPage compact onClose={() => setOpen(false)} />
        </div>
      )}
    </>
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

  const wrappedContent = isLoginRoute ? content : isDashboardRoute ? content : isAdminRoute ? (
    <AdminBackground>{content}</AdminBackground>
  ) : (
    <FarmBackground>{content}</FarmBackground>
  );

  return (
    <>
      {wrappedContent}
      <ChatbotFloatingWidget />
    </>
  );
}

export default App;
