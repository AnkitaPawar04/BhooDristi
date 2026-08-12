import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import authStorage from '../../services/authStorage';
import { getTranslation } from '../../utils/i18n';
import { AppContext } from '../../contexts/AppContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { language } = useContext(AppContext);
  const [isSignup, setIsSignup] = useState(false);
  const [selectedRole, setSelectedRole] = useState('farmer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password || !firstName) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        setLoading(false);
        return;
      }

      const response = await authAPI.register(email, password, firstName, lastName);
      
      if (!response.data || !response.data.access_token) {
        throw new Error('Invalid response from server');
      }

      authStorage.setToken(response.data.access_token);
      if (response.data.farmer_id) {
        authStorage.setFarmerId(response.data.farmer_id);
      }
      authStorage.setUser({
        email: email,
        firstName: firstName,
        lastName: lastName,
        role: selectedRole,
      });

      if (selectedRole === 'admin') {
        localStorage.setItem('is_admin', 'true');
      } else {
        localStorage.removeItem('is_admin');
      }

      navigate(selectedRole === 'admin' ? '/admin/dashboard' : '/dashboard');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to create account';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        setError('Please enter email and password');
        setLoading(false);
        return;
      }

      const response = await authAPI.login(email, password);
      
      if (!response.data || !response.data.access_token) {
        throw new Error('Invalid response from server');
      }

      authStorage.setToken(response.data.access_token);
      if (response.data.farmer_id) {
        authStorage.setFarmerId(response.data.farmer_id);
      }
      authStorage.setUser({
        email: email,
        role: selectedRole,
      });

      if (selectedRole === 'admin') {
        localStorage.setItem('is_admin', 'true');
      } else {
        localStorage.removeItem('is_admin');
      }

      navigate(selectedRole === 'admin' ? '/admin/dashboard' : '/dashboard');
    } catch (err) {
      let errorMsg = 'Failed to login';
      if (err.response?.status === 401) {
        errorMsg = 'Invalid email or password';
      } else if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message === 'Network Error') {
        errorMsg = 'Network error: Backend server not responding';
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col lg:flex-row">
      {/* Left Side - Background */}
      <div className="hidden lg:block lg:w-1/2 soil-gradient text-white min-h-screen overflow-hidden">
        <div className="p-12 h-full flex flex-col">
          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4 mb-12">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 border border-white border-opacity-20 hover:bg-opacity-20 transition">
              <p className="text-3xl mb-2"></p>
              <p className="font-bold text-green-100 text-sm">Find Best Crops</p>
              <p className="text-xs text-green-200 mt-1">Based on soil and weather</p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 border border-white border-opacity-20 hover:bg-opacity-20 transition">
              <p className="text-3xl mb-2"></p>
              <p className="font-bold text-green-100 text-sm">Real-Time Weather</p>
              <p className="text-xs text-green-200 mt-1">Plan farming days better</p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 border border-white border-opacity-20 hover:bg-opacity-20 transition">
              <p className="text-3xl mb-2"></p>
              <p className="font-bold text-green-100 text-sm">Soil Analysis</p>
              <p className="text-xs text-green-200 mt-1">Understand your farm</p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4 border border-white border-opacity-20 hover:bg-opacity-20 transition">
              <p className="text-3xl mb-2"></p>
              <p className="font-bold text-green-100 text-sm">Farm Dashboard</p>
              <p className="text-xs text-green-200 mt-1">Track everything</p>
            </div>
          </div>

          {/* Bottom Content */}
          <div className="space-y-3 mb-8">
            <div className="flex items-start gap-3 bg-white bg-opacity-10 rounded-lg p-3 backdrop-blur-sm">
              <span className="text-2xl flex-shrink-0"></span>
              <div>
                <p className="font-bold text-white text-sm">AI Crop Recommendations</p>
                <p className="text-green-100 text-xs">Smart suggestions for your farm</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white bg-opacity-10 rounded-lg p-3 backdrop-blur-sm">
              <span className="text-2xl flex-shrink-0"></span>
              <div>
                <p className="font-bold text-white text-sm">Simple & Easy to Use</p>
                <p className="text-green-100 text-xs">Designed for all farmers</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white bg-opacity-10 rounded-lg p-3 backdrop-blur-sm">
              <span className="text-2xl flex-shrink-0"></span>
              <div>
                <p className="font-bold text-white text-sm">Increase Your Yield</p>
                <p className="text-green-100 text-xs">Grow more, earn more</p>
              </div>
            </div>
          </div>

          <p className="text-green-200 text-sm text-center border-t border-green-500 pt-4">
            Helping thousands of Maharashtra farmers improve their harvests
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 login-form-container flex flex-col justify-center items-center p-6 md:p-12 min-h-screen">
        <div className="w-full max-w-md animate-fadeInUp">
          <div className="mb-6 flex justify-center">
            <div className="bg-white/95 border-2 border-gray-300 rounded-full p-1 flex shadow-md backdrop-blur-sm">
              <button
                onClick={() => {
                  setSelectedRole('admin');
                  setError('');
                  setEmail('');
                  setPassword('');
                }}
                className={`px-5 py-2 rounded-full font-bold transition text-sm md:text-base ${
                  selectedRole === 'admin' ? 'bg-green-600 text-white' : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Admin
              </button>
              <button
                onClick={() => {
                  setSelectedRole('farmer');
                  setError('');
                  setEmail('');
                  setPassword('');
                }}
                className={`px-5 py-2 rounded-full font-bold transition text-sm md:text-base ${
                  selectedRole === 'farmer' ? 'bg-green-600 text-white' : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Farmer
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg shadow-sm text-sm">
              <p className="font-bold">Error</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          )}

          <form onSubmit={isSignup ? handleEmailSignup : handleEmailLogin}>
            <div className="login-box">
              {!isSignup ? (
                <>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">
                    {selectedRole === 'admin' ? 'Admin Login' : 'Farmer Login'}
                  </h2>
                  <p className="text-gray-600 text-sm mb-8">
                    Login to access your farm dashboard and insights
                  </p>

                  <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                      required
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition pr-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-600 hover:text-gray-800"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md mb-4"
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">
                    {selectedRole === 'admin' ? 'Create Admin Account' : 'Create Farmer Account'}
                  </h2>
                  <p className="text-gray-600 text-sm mb-8">
                    {getTranslation(language, 'joinGetRecommendations')}
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First Name"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last Name"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                      required
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition pr-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-600 hover:text-gray-800"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Use at least 8 characters
                    </p>
                  </div>

                  <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition pr-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-gray-600 hover:text-gray-800"
                      >
                        {showConfirmPassword ? 'Hide' : 'Show'}
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-600 hover:text-gray-800"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md mb-4"
                  >
                    {loading ? 'Creating Account...' : '✓ Create Account'}
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-gray-600 hover:text-gray-800"
                      >
                        {showConfirmPassword ? 'Hide' : 'Show'}
                      </button>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignup(true);
                        setError('');
                      }}
                      className="text-green-600 hover:text-green-700 font-semibold"
                    >
                      Register
                    </button>
                  </p>
                ) : (
                  <p className="text-gray-700 text-sm">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignup(false);
                        setError('');
                      }}
                      className="text-green-600 hover:text-green-700 font-semibold"
                    >
                      Login
                    </button>
                  </p>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

  const navigate = useNavigate();
  const { language } = useContext(AppContext);
  const [isSignup, setIsSignup] = useState(false);
  const [selectedRole, setSelectedRole] = useState('farmer'); // 'admin' or 'farmer'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="min-h-screen bg-transparent flex flex-col lg:flex-row">
      {/* Left Side - Farm Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 soil-gradient flex-col justify-between p-12 text-white min-h-screen relative overflow-hidden" style={{backdropFilter: 'blur(1px)'}}>
        {/* Top Section */}
        <div className="relative z-10">
          {/* Logo & Tagline */}
          <div className="mb-12 animate-fadeInUp">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-7xl"></span>
              <h1 className="text-6xl font-bold">BhooDrishti</h1>
            </div>
            <p className="text-2xl font-semibold text-green-100 mb-3">
              Your Digital Farmer's Assistant
            </p>
            <p className="text-green-200 text-lg border-l-4 border-yellow-400 pl-4 py-2">
              Using AI to help you grow better crops with less effort
            </p>
          </div>

          {/* Key Benefits Cards */}
          <div className="grid grid-cols-2 gap-4 mb-12">
            {/* Crop Selection Card */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-5 border border-white border-opacity-20 hover:bg-opacity-20 transition transform hover:scale-105">
              <p className="text-3xl mb-2"></p>
              <p className="font-bold text-green-100">Find Best Crops</p>
              <p className="text-xs text-green-200 mt-1">Based on your soil and weather</p>
            </div>

            {/* Weather Card */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-5 border border-white border-opacity-20 hover:bg-opacity-20 transition transform hover:scale-105">
              <p className="text-3xl mb-2"></p>
              <p className="font-bold text-green-100">Real-Time Weather</p>
              <p className="text-xs text-green-200 mt-1">Plan your farming days better</p>
            </div>

            {/* Soil Health Card */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-5 border border-white border-opacity-20 hover:bg-opacity-20 transition transform hover:scale-105">
              <p className="text-3xl mb-2"></p>
              <p className="font-bold text-green-100">Soil Analysis</p>
              <p className="text-xs text-green-200 mt-1">Understand your farm better</p>
            </div>

            {/* Dashboard Card */}
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-5 border border-white border-opacity-20 hover:bg-opacity-20 transition transform hover:scale-105">
              <p className="text-3xl mb-2"></p>
              <p className="font-bold text-green-100">Farm Dashboard</p>
              <p className="text-xs text-green-200 mt-1">Track everything at a glance</p>
            </div>
          </div>
        </div>

        {/* Bottom Section - Why BhooDrishti? */}
        <div className="relative z-10">
          {/* Key Features */}
          <div className="mb-8 space-y-3">
            <div className="flex items-start gap-3 bg-white bg-opacity-10 rounded-lg p-3 backdrop-blur-sm">
              <span className="text-2xl flex-shrink-0">✓</span>
              <div>
                <p className="font-bold text-white">AI Crop Recommendations</p>
                <p className="text-green-100 text-sm">Smart suggestions based on your farm conditions</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white bg-opacity-10 rounded-lg p-3 backdrop-blur-sm">
              <span className="text-2xl flex-shrink-0">✓</span>
              <div>
                <p className="font-bold text-white">Simple & Easy to Use</p>
                <p className="text-green-100 text-sm">Designed for farmers, not tech experts</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white bg-opacity-10 rounded-lg p-3 backdrop-blur-sm">
              <span className="text-2xl flex-shrink-0">✓</span>
              <div>
                <p className="font-bold text-white">Increase Your Yield</p>
                <p className="text-green-100 text-sm">Make better decisions, grow more crops, earn more</p>
              </div>
            </div>
          </div>

          {/* Footer Message */}
          <p className="text-green-200 text-center text-sm border-t border-green-500 pt-4">
            Helping thousands of Maharashtra farmers improve their harvests
          </p>
        </div>
      </div>

      {/* Right Side - Login/Signup Form */}
      <div className="w-full lg:w-1/2 login-form-container flex flex-col justify-center items-center p-6 md:p-8">
        <div className="w-full max-w-sm animate-fadeInUp">
          {/* Mobile Hero Section */}
          <div className="lg:hidden bg-black/40 backdrop-blur-md rounded-2xl p-6 mb-6 text-white border border-white/20">
              <h1 className="text-3xl font-bold mb-2">BhooDrishti</h1>
            <p className="text-base font-semibold text-green-100 mb-3">
              Your Smart Farming Assistant
            </p>
            <p className="text-green-100 text-sm">
              Get AI-powered crop recommendations based on your farm conditions
            </p>
          </div>

          {/* Role Selection Toggle - Switch Style */}
          <div className="mb-6 flex justify-center">
            <div className="bg-white/95 border-2 border-gray-300 rounded-full p-1 flex shadow-md backdrop-blur-sm">
              <button
                onClick={() => {
                  setSelectedRole('admin');
                  setError('');
                  setEmail('');
                  setPassword('');
                }}
                className={`px-5 py-2 rounded-full font-bold transition text-sm md:text-base ${
                  selectedRole === 'admin'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Admin
              </button>
              <button
                onClick={() => {
                  setSelectedRole('farmer');
                  setError('');
                  setEmail('');
                  setPassword('');
                }}
                className={`px-5 py-2 rounded-full font-bold transition text-sm md:text-base ${
                  selectedRole === 'farmer'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Farmer
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg shadow-sm animate-slideInLeft text-sm">
              <p className="font-bold">Oops! Something went wrong</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={isSignup ? handleEmailSignup : handleEmailLogin}>
            <div className="login-box">
              {!isSignup ? (
                <>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">
                    {selectedRole === 'admin' ? 'Admin Login' : 'Farmer Login'}
                  </h2>
                  <p className="text-gray-600 text-sm mb-8">
                    Login to access your farm dashboard and insights
                  </p>

                  <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                      required
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition pr-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-600 hover:text-gray-800 transition"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div className="text-right mb-6">
                    <a href="#forgot" className="text-green-600 hover:text-green-700 text-sm font-semibold">
                      Forgot password?
                    </a>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md mb-4"
                  >
                    {loading ? (
                      <>
                        <span className="inline-block animate-spin mr-2">⏳</span>
                        Logging in...
                      </>
                      ) : (
                      'Login'
                    )}
                  </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">
                        {selectedRole === 'admin' ? 'Create Admin Account' : 'Create Farmer Account'}
                    </h2>
                    <p className="text-gray-600 text-sm mb-8">
                      {getTranslation(language, 'joinGetRecommendations')}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="First Name"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Last Name"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                        />
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                        required
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition pr-12"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-gray-600 hover:text-gray-800 transition"
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Use at least 8 characters with uppercase, lowercase, and numbers
                      </p>
                    </div>

                    <div className="mb-6">
                      <label className="block text-gray-700 text-sm font-bold mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition pr-12"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-3 text-gray-600 hover:text-gray-800 transition"
                        >
                          {showConfirmPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md mb-4"
                    >
                      {loading ? (
                        <>
                          <span className="inline-block animate-spin mr-2"></span>
                          Creating Account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </button>
                </>
              )}

              {/* Register/Login Links */}
              <div className="mt-6 text-center border-t pt-6">
                {!isSignup ? (
                  <p className="text-gray-700 text-sm">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignup(true);
                        setError('');
                      }}
                      className="text-green-600 hover:text-green-700 font-semibold transition"
                    >
                      Register
                    </button>
                  </p>
                ) : (
                  <p className="text-gray-700 text-sm">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignup(false);
                        setError('');
                      }}
                      className="text-green-600 hover:text-green-700 font-semibold transition"
                    >
                      Login
                    </button>
                  </p>
                )}
              </div>
            </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
