import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { useApp } from '../../contexts/AppContext';
import { getTranslation } from '../../utils/i18n';
import { adminAPI } from '../../services/api';
import { CropDistributionChart, FarmerActivityChart, DistrictCropChart } from '../../charts/Charts';

const AdminDashboardPage = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { language } = useApp();
  const [statistics, setStatistics] = useState(null);
  const [farmers, setFarmers] = useState([]);
  const [districtData, setDistrictData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, farmer: null });
  const [message, setMessage] = useState({ type: '', text: '', visible: false });

  // Get user info
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = user.firstName || 'Administrator';

  // System health status
  const systemHealth = {
    status: 'Operational',
    uptime: '99.9%'
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, farmersRes, districtRes] = await Promise.all([
        adminAPI.getStatistics(),
        adminAPI.getAllFarmers(),
        adminAPI.getDistrictAnalysis(),
      ]);

      setStatistics(statsRes.data);
      setFarmers(farmersRes.data.farmers.slice(0, 10));
      
      const chartData = districtRes.data.districts.map((d) => ({
        district: d.district,
        count: d.total_predictions,
      }));
      setDistrictData(chartData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setStatistics(null);
      setFarmers([]);
      setDistrictData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyFarmer = (farmerId) => {
    console.log('Verify farmer:', farmerId);
    // Will connect to API later
  };

  const handleSuspendFarmer = (farmerId) => {
    console.log('Suspend farmer:', farmerId);
    // Will connect to API later
  };

  const handleDeleteClick = (farmer) => {
    setDeleteModal({ isOpen: true, farmer });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.farmer) return;

    try {
      const response = await adminAPI.deleteFarmer(deleteModal.farmer.id);
      
      // Show success message
      setMessage({
        type: 'success',
        text: `✓ Farmer '${deleteModal.farmer.name}' deleted successfully`,
        visible: true
      });

      // Remove farmer from list
      setFarmers(farmers.filter(f => f.id !== deleteModal.farmer.id));
      setDeleteModal({ isOpen: false, farmer: null });

      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '', visible: false });
      }, 3000);

      // Refresh statistics
      fetchDashboardData();
    } catch (error) {
      setMessage({
        type: 'error',
        text: `✗ Error deleting farmer: ${error.response?.data?.detail || error.message}`,
        visible: true
      });

      setTimeout(() => {
        setMessage({ type: '', text: '', visible: false });
      }, 3000);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, farmer: null });
  };

  const handleNavigate = (page) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  const filteredFarmers = farmers.filter((farmer) => {
    const matchesSearch = 
      (farmer.name && farmer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (farmer.phone && farmer.phone.includes(searchTerm));
    
    if (activeTab === 'verified') return matchesSearch && farmer.verified;
    if (activeTab === 'pending') return matchesSearch && !farmer.verified;
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-transparent backdrop-blur-sm">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">Loading Dashboard...</p>
          <p className="text-gray-300 mt-2">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen admin-page">
      <Sidebar currentPage="admin" onNavigate={handleNavigate} userName={userName} />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Success/Error Message */}
          {message.visible && (
            <div className={`mb-6 p-4 rounded-lg font-semibold text-white ${
              message.type === 'success' 
                ? 'bg-green-500' 
                : 'bg-red-500'
            }`}>
              {message.text}
            </div>
          )}

          {/* Header */}
          <div className="page-header mb-8">
            <h1 className="page-title">{getTranslation(language, 'adminDashboard')}</h1>
            <p className="page-subtitle">
              {getTranslation(language, 'welcome')}, {userName}! {getTranslation(language, 'monitorSystem')}
            </p>
            <div className="page-divider"></div>
          </div>

          {/* Key Statistics Cards */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card card-content hover:shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <p className="stat-label">{getTranslation(language, 'totalFarmers')}</p>
                </div>
                <p className="stat-value text-green-600 dark:text-green-400">{statistics.total_farmers}</p>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {statistics.verified_farmers} {getTranslation(language, 'verified')} • {statistics.total_farmers - statistics.verified_farmers} {getTranslation(language, 'pending')}
                  </p>
                </div>
              </div>

              <div className="card card-content hover:shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <p className="stat-label">{getTranslation(language, 'totalPredictions')}</p>
                </div>
                <p className="stat-value text-blue-600 dark:text-blue-400">{statistics.total_predictions}</p>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {Math.round((statistics.total_predictions / statistics.total_farmers) * 10) / 10} {getTranslation(language, 'averageFarmer')}
                  </p>
                </div>
              </div>

              <div className="card card-content hover:shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <p className="stat-label">{getTranslation(language, 'systemHealth')}</p>
                </div>
                <p className="stat-value text-emerald-600 dark:text-emerald-400">{getTranslation(language, 'operational')}</p>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {systemHealth.uptime} {getTranslation(language, 'uptime')}
                  </p>
                </div>
              </div>

              <div className="card card-content hover:shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <p className="stat-label">{getTranslation(language, 'topCrop')}</p>
                </div>
                <p className="stat-value text-purple-600 dark:text-purple-400">
                  {statistics.top_crops[0]?.crop || 'N/A'}
                </p>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {statistics.top_crops[0]?.count || 0} predictions
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Charts - 2 columns */}
            <div className="lg:col-span-2 space-y-8">
              {/* Crop Distribution */}
              <div className="card card-content hover:shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{getTranslation(language, 'cropDistributionAnalysis')}</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{getTranslation(language, 'distributionAcrossRegion')}</p>
                {statistics?.top_crops && statistics.top_crops.length > 0 ? (
                  <div style={{ position: 'relative', height: '300px' }}>
                    <CropDistributionChart data={statistics.top_crops} />
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">{getTranslation(language, 'noDataAvailable')}</p>
                )}
              </div>

              {/* District-wise Analysis */}
              <div className="card card-content hover:shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{getTranslation(language, 'districtWisePredictions')}</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{getTranslation(language, 'systemActivityAcrossDistricts')}</p>
                {districtData.length > 0 ? (
                  <div style={{ position: 'relative', height: '300px' }}>
                    <DistrictCropChart data={districtData} />
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">{getTranslation(language, 'noDataAvailable')}</p>
                )}
              </div>
            </div>

            {/* Right Sidebar - empty for now, can be used for future real-time metrics */}
            <div className="space-y-6">
            </div>
          </div>

          {/* Farmer Management Section */}
          <div className="card card-content hover:shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Farmer Management</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Manage and monitor all registered farmers</p>
              </div>
              <div className="mt-4 md:mt-0 flex gap-3">
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 font-semibold ${
                  activeTab === 'all'
                    ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                All ({farmers.length})
              </button>
              <button
                onClick={() => setActiveTab('verified')}
                className={`px-4 py-2 font-semibold ${
                  activeTab === 'verified'
                    ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Verified ({farmers.filter(f => f.verified).length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 font-semibold ${
                  activeTab === 'pending'
                    ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Pending ({farmers.filter(f => !f.verified).length})
              </button>
            </div>

            {/* Farmers Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-gray-800 dark:text-gray-200 font-semibold">Name</th>
                    <th className="px-6 py-3 text-left text-gray-800 dark:text-gray-200 font-semibold">Contact</th>
                    <th className="px-6 py-3 text-left text-gray-800 dark:text-gray-200 font-semibold">District</th>
                    <th className="px-6 py-3 text-left text-gray-800 dark:text-gray-200 font-semibold">Status</th>
                    <th className="px-6 py-3 text-left text-gray-800 dark:text-gray-200 font-semibold">Joined</th>
                    <th className="px-6 py-3 text-center text-gray-800 dark:text-gray-200 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFarmers.length > 0 ? (
                    filteredFarmers.map((farmer) => (
                      <tr key={farmer.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        <td className="px-6 py-4 text-gray-800 dark:text-gray-200 font-medium">{farmer.name}</td>
                        <td className="px-6 py-4 text-gray-800 dark:text-gray-200">
                          <a href={`tel:${farmer.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                            {farmer.phone}
                          </a>
                        </td>
                        <td className="px-6 py-4 text-gray-800 dark:text-gray-200">{farmer.district || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                            farmer.verified
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                          }`}>
                            {farmer.verified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(farmer.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 justify-center">
                            {!farmer.verified && (
                              <button
                                onClick={() => handleVerifyFarmer(farmer.id)}
                                className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition"
                                title="Verify Farmer"
                              >
                                Verify
                              </button>
                            )}
                            <button
                              onClick={() => handleSuspendFarmer(farmer.id)}
                              className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition"
                              title="Suspend Farmer"
                            >
                              Suspend
                            </button>
                            <button
                              onClick={() => handleDeleteClick(farmer)}
                              className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition"
                              title="Delete Farmer"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        No farmers found matching your search criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* Delete Confirmation Modal */}
        {deleteModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
                  Delete Farmer?
                </h3>
                
                <p className="text-gray-600 dark:text-gray-400 text-center mb-2">
                  Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-gray-100">{deleteModal.farmer?.name}</span>?
                </p>
                
                <p className="text-sm text-orange-600 dark:text-orange-400 text-center mb-6 p-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                  This action is permanent and will remove:
                  <br/>• Farmer account
                  <br/>• All crop predictions
                  <br/>• All associated data
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteCancel}
                    className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-400 dark:hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}      </div>
    </div>
  );
};

export default AdminDashboardPage;
