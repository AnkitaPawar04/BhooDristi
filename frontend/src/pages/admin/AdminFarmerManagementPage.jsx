import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { useApp } from '../../contexts/AppContext';
import { getTranslation } from '../../utils/i18n';
import { adminAPI } from '../../services/api';

const AdminFarmerManagementPage = () => {
  const { language } = useApp();
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewModal, setViewModal] = useState({ isOpen: false, farmer: null });
  const [editModal, setEditModal] = useState({ isOpen: false, farmer: null });
  const [message, setMessage] = useState({ type: '', text: '', visible: false });

  useEffect(() => {
    fetchFarmers();
  }, []);

  const fetchFarmers = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getAllFarmers();
      setFarmers(response.data.farmers);
    } catch (error) {
      console.error('Failed to fetch farmers:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load farmers',
        visible: true
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredFarmers = farmers.filter((farmer) => {
    const matchesSearch = 
      farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (farmer.phone && farmer.phone.includes(searchTerm));
    
    if (filterStatus === 'verified') return matchesSearch && farmer.verified;
    if (filterStatus === 'pending') return matchesSearch && !farmer.verified;
    return matchesSearch;
  });

  const handleDelete = async (farmerId, farmerName) => {
    if (confirm(`Delete farmer "${farmerName}"? This action cannot be undone.`)) {
      try {
        await adminAPI.deleteFarmer(farmerId);
        setFarmers(farmers.filter(f => f.id !== farmerId));
        setMessage({
          type: 'success',
          text: `Farmer "${farmerName}" deleted successfully`,
          visible: true
        });
        setTimeout(() => setMessage({ ...message, visible: false }), 3000);
      } catch (error) {
        setMessage({
          type: 'error',
          text: `Failed to delete farmer: ${error.response?.data?.detail || error.message}`,
          visible: true
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center admin-page">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{getTranslation(language, 'loadingFarmers')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen admin-page">
      <Sidebar currentPage="farmers" />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {message.visible && (
            <div className={`mb-6 p-4 rounded-lg text-gray-900 dark:text-white font-semibold ${
              message.type === 'success' ? 'bg-green-100 dark:bg-green-500' : 'bg-red-100 dark:bg-red-500'
            }`}>
              {message.text}
            </div>
          )}

          <div className="page-header mb-8">
            <h1 className="page-title">{getTranslation(language, 'farmerManagementPage')}</h1>
            <p className="page-subtitle">{getTranslation(language, 'manageMonitorFarmers')}</p>
            <div className="page-divider"></div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border border-emerald-200">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <input
                type="text"
                placeholder={getTranslation(language, 'searchByNamePhone')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 border border-emerald-200 dark:border-emerald-600/50 rounded-lg bg-white dark:bg-slate-700/60 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-emerald-200 dark:border-emerald-600/50 rounded-lg bg-white dark:bg-slate-700/60 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">{getTranslation(language, 'allFarmers')} ({farmers.length})</option>
                <option value="verified">{getTranslation(language, 'verifiedLabel')} ({farmers.filter(f => f.verified).length})</option>
                <option value="pending">{getTranslation(language, 'pendingLabel')} ({farmers.filter(f => !f.verified).length})</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-emerald-50 dark:bg-slate-700/60">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-800 dark:text-white">{getTranslation(language, 'nameLabel')}</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-800 dark:text-white">{getTranslation(language, 'phoneLabel')}</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-800 dark:text-white">{getTranslation(language, 'districtLabel')}</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-800 dark:text-white">{getTranslation(language, 'statusLabel')}</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-800 dark:text-white">{getTranslation(language, 'joinedLabel')}</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-800 dark:text-white">{getTranslation(language, 'actionsLabel')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFarmers.map((farmer) => (
                    <tr key={farmer.id} className="border-t border-gray-200 dark:border-emerald-700/30 hover:bg-gray-50 dark:hover:bg-slate-700/40">
                      <td className="px-6 py-4 text-gray-800 dark:text-white font-medium">{farmer.name}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-slate-300">
                        <a href={`tel:${farmer.phone}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">
                          {farmer.phone}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-slate-300">{farmer.district || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                          farmer.verified
                            ? 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-500/30 dark:text-green-200 dark:border-green-500/50'
                            : 'bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-500/30 dark:text-yellow-200 dark:border-yellow-500/50'
                        }`}>
                          {farmer.verified ? getTranslation(language, 'verifiedLabel') : getTranslation(language, 'pendingLabel')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">
                        {new Date(farmer.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setViewModal({ isOpen: true, farmer })}
                            className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          >
                            👁 View
                          </button>
                          <button
                            onClick={() => handleDelete(farmer.id, farmer.name)}
                            className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredFarmers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No farmers found matching your criteria
                </div>
              )}
            </div>
          </div>
        </div>

        {/* View Farmer Modal */}
        {viewModal.isOpen && viewModal.farmer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">👤 Farmer Profile</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Name</label>
                    <p className="text-gray-800">{viewModal.farmer.name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Phone</label>
                    <p className="text-gray-800">{viewModal.farmer.phone}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-600">District</label>
                    <p className="text-gray-800">{viewModal.farmer.district || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Status</label>
                    <p className="text-gray-800">
                      {viewModal.farmer.verified ? 'Verified' : 'Pending Verification'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Member Since</label>
                    <p className="text-gray-800">{new Date(viewModal.farmer.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setViewModal({ isOpen: false, farmer: null })}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-400"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFarmerManagementPage;
