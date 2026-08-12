import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { authAPI, adminAPI } from '../../services/api';
import authStorage from '../../services/authStorage';
import { getTranslation } from '../../utils/i18n';
import { AppContext } from '../../contexts/AppContext';

const ADMIN_EMAIL = 'admin.agro@gmail.com'; // Admin credentials

const LoginPage = () => {
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

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate form
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

      // Validate role-specific requirements
      if (selectedRole === 'admin' && email !== ADMIN_EMAIL) {
        setError(`Admin must use email: ${ADMIN_EMAIL}`);
        setLoading(false);
        return;
      }

      if (selectedRole === 'farmer' && email === ADMIN_EMAIL) {
        setError('This email is reserved for admin. Please use a different email for farmer role.');
        setLoading(false);
        return;
      }

      // Use selected role
      const userRole = selectedRole;

      // Register directly with backend (no Firebase for signup)
      try {
        console.log('Registering with backend:', { email, firstName, lastName, userRole, selectedRole });
        const response = await authAPI.register(email, password, firstName, lastName);
        
        if (!response.data || !response.data.access_token) {
          throw new Error('Invalid response from server');
        }

        // Store token and user info
        authStorage.setToken(response.data.access_token);
        if (response.data.farmer_id) {
          authStorage.setFarmerId(response.data.farmer_id);
        }
        authStorage.setUser({
          email: email,
          firstName: firstName,
          lastName: lastName,
          role: userRole,
        });

        // Set admin flag if admin user
        if (userRole === 'admin') {
          localStorage.setItem('is_admin', 'true');
        } else {
          localStorage.removeItem('is_admin');
        }

        console.log(`Signup successful! Redirecting to ${userRole} dashboard`);
        
        // Redirect based on role
        if (userRole === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      } catch (backendError) {
        console.error('Backend registration error:', backendError);
        const errorMsg = backendError.response?.data?.detail || 
                        backendError.response?.data?.message ||
                        backendError.message || 
                        getTranslation(language, 'failedCreateAccount');
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Signup Error:', err);
      const errorMsg = err.message || getTranslation(language, 'failedCreateAccount');
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
        setError(getTranslation(language, 'enterEmailPassword'));
        setLoading(false);
        return;
      }

      // Validate role-specific requirements for login
      if (selectedRole === 'admin' && email !== ADMIN_EMAIL) {
        setError(`Admin must use email: ${ADMIN_EMAIL}`);
        setLoading(false);
        return;
      }

      if (selectedRole === 'farmer' && email === ADMIN_EMAIL) {
        setError('To login as admin, select "Admin" role');
        setLoading(false);
        return;
      }

      // Use selected role
      const userRole = selectedRole;

      // If admin role selected, use admin login API instead
      if (userRole === 'admin') {
        try {
          console.log('Admin login with email:', email);
          const response = await adminAPI.adminLogin(email, password);
          
          if (!response.data || !response.data.access_token) {
            throw new Error('Invalid response from server');
          }

          // Store token and admin flag
          authStorage.setToken(response.data.access_token);
          localStorage.setItem('is_admin', 'true');
          authStorage.setUser({
            email: email,
            role: 'admin',
          });

          console.log('Admin login successful! Redirecting to admin dashboard');
          navigate('/admin/dashboard');
          return;
        } catch (adminError) {
          console.error('Admin login error:', adminError);
          
          let errorMsg = 'Invalid email or password';
          if (adminError.response?.status === 401) {
            errorMsg = 'Invalid admin email or password';
          } else if (adminError.response?.data?.detail) {
            errorMsg = adminError.response.data.detail;
          } else if (adminError.message === 'Network Error') {
            errorMsg = 'Network error: Backend server not responding';
          }
          
          setError(errorMsg);
          setLoading(false);
          return;
        }
      }

      // Login with backend (farmer login)
      try {
        console.log('Logging in with email:', email, 'role:', userRole, 'selectedRole:', selectedRole);
        const response = await authAPI.login(email, password);
        
        if (!response.data || !response.data.access_token) {
          throw new Error('Invalid response from server');
        }

        // Store token and user info
        authStorage.setToken(response.data.access_token);
        if (response.data.farmer_id) {
          authStorage.setFarmerId(response.data.farmer_id);
        }
        authStorage.setUser({
          email: email,
          role: userRole,
        });

        // Set admin flag if admin user
        if (userRole === 'admin') {
          localStorage.setItem('is_admin', 'true');
        } else {
          localStorage.removeItem('is_admin');
        }

        console.log(`Login successful! Redirecting to ${userRole} dashboard`);
        navigate(userRole === 'admin' ? '/admin/dashboard' : '/dashboard');
      } catch (backendError) {
        console.error('Login error:', backendError);
        
        // Better error message extraction
        let errorMsg = 'Failed to login';
        
        if (backendError.response?.status === 401) {
          errorMsg = 'Invalid email or password';
        } else if (backendError.response?.data?.detail) {
          errorMsg = backendError.response.data.detail;
        } else if (backendError.response?.data?.message) {
          errorMsg = backendError.response.data.message;
        } else if (backendError.message === 'Network Error') {
          errorMsg = 'Network error: Backend server not responding. Make sure the server is running on http://localhost:8000';
        } else if (backendError.code === 'ECONNABORTED') {
          errorMsg = 'Request timeout: Server took too long to respond';
        } else if (backendError.message) {
          errorMsg = backendError.message;
        }
        
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Login Error:', err);
      const errorMsg = err.message || 'Invalid email or password';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-overlay">
        {/* Left Side - Login/Signup Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 md:p-8">
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
                      placeholder="example@email.com"
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
                        {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
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
                        <span className="inline-block animate-spin mr-2"></span>
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
                        {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
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
                        {showConfirmPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
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

        {/* Right Side - Farm Hero Section */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-start items-center p-8 xl:p-12 text-white pt-12">
          <div className="max-w-sm w-full">
            {/* Logo & Tagline */}
            <div className="text-center animate-fadeInUp">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-6xl"></span>
                <h1 className="text-5xl xl:text-6xl font-bold">BhooDrishti</h1>
              </div>
              <p className="text-xl xl:text-2xl font-semibold text-green-100 mb-2">
                Your Digital Farmer's Assistant
              </p>
              <p className="text-green-200 text-sm xl:text-base border-l-4 border-yellow-400 pl-3 py-2">
                Using AI to help you grow better crops with less effort
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
