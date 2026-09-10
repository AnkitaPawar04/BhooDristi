import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { adminAPI } from '../../services/api';

const AdminPredictionMonitoringPage = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPredictions = async () => {
      try {
        const response = await adminAPI.getAllPredictions();
        setPredictions(response.data?.predictions || []);
      } catch (requestError) {
        console.error('Failed to load prediction history:', requestError);
        setError(requestError.response?.data?.detail || 'Unable to load prediction history.');
      } finally {
        setLoading(false);
      }
    };

    loadPredictions();
  }, []);

  const filteredPredictions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return predictions.filter((prediction) => {
      const matchesSearch = !query || [
        prediction.recommended_crop,
        prediction.district,
        prediction.season,
        String(prediction.farmer_id),
      ].some((value) => String(value || '').toLowerCase().includes(query));

      const confidence = Number(prediction.confidence || 0);
      const matchesConfidence = confidenceFilter === 'low'
        ? confidence < 60
        : confidenceFilter === 'high'
          ? confidence >= 80
          : true;

      return matchesSearch && matchesConfidence;
    });
  }, [confidenceFilter, predictions, searchTerm]);

  return (
    <div className="flex h-screen admin-page">
      <Sidebar currentPage="predictions" />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="page-header mb-8">
            <h1 className="page-title">Prediction Monitoring</h1>
            <p className="page-subtitle">Review live crop recommendations and identify low-confidence results</p>
            <div className="page-divider"></div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border border-emerald-200">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search crop, district, season, or farmer ID"
                className="flex-1 px-4 py-2 border border-emerald-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <select
                value={confidenceFilter}
                onChange={(event) => setConfidenceFilter(event.target.value)}
                className="px-4 py-2 border border-emerald-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All confidence levels</option>
                <option value="low">Low confidence (&lt;60%)</option>
                <option value="high">High confidence (80%+)</option>
              </select>
            </div>

            {loading && <p className="py-8 text-center text-gray-500">Loading prediction history...</p>}
            {error && <p className="py-8 text-center text-red-600">{error}</p>}
            {!loading && !error && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-emerald-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-800">Crop</th>
                      <th className="px-4 py-3 text-left text-gray-800">Confidence</th>
                      <th className="px-4 py-3 text-left text-gray-800">District</th>
                      <th className="px-4 py-3 text-left text-gray-800">Season</th>
                      <th className="px-4 py-3 text-left text-gray-800">Farmer ID</th>
                      <th className="px-4 py-3 text-left text-gray-800">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPredictions.map((prediction) => {
                      const confidence = Number(prediction.confidence || 0);
                      return (
                        <tr key={prediction.id} className="border-t border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-800">{prediction.recommended_crop || 'Unknown'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${confidence < 60 ? 'bg-red-100 text-red-800' : confidence >= 80 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {confidence.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{prediction.district || 'Unknown'}</td>
                          <td className="px-4 py-3 text-gray-700">{prediction.season || 'Unknown'}</td>
                          <td className="px-4 py-3 text-gray-700">{prediction.farmer_id}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{prediction.created_at ? new Date(prediction.created_at).toLocaleString() : 'Unknown'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredPredictions.length === 0 && (
                  <p className="py-8 text-center text-gray-500">No predictions match these filters.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPredictionMonitoringPage;
