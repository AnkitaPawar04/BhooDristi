import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { useApp } from '../../contexts/AppContext';
import { getTranslation } from '../../utils/i18n';
import { adminAPI } from '../../services/api';

const EMPTY_DATA = { farmers: [], predictions: [], districts: [] };

const AdminAnalyticsPage = () => {
  const { language } = useApp();
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadAnalytics = async () => {
      try {
        const [farmersResponse, predictionsResponse, districtsResponse] = await Promise.all([
          adminAPI.getAllFarmers(),
          adminAPI.getAllPredictions(),
          adminAPI.getDistrictAnalysis(),
        ]);

        if (active) {
          setData({
            farmers: farmersResponse.data?.farmers || [],
            predictions: predictionsResponse.data?.predictions || [],
            districts: districtsResponse.data?.districts || [],
          });
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.response?.data?.detail || 'Unable to load analytics.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadAnalytics();
    return () => { active = false; };
  }, []);

  const analytics = useMemo(() => {
    const predictions = data.predictions;
    const confidenceValues = predictions
      .map((prediction) => Number(prediction.confidence))
      .filter((confidence) => Number.isFinite(confidence));
    const confidenceBands = [
      { label: 'High (80%+)', count: confidenceValues.filter((value) => value >= 80).length },
      { label: 'Medium (60-79%)', count: confidenceValues.filter((value) => value >= 60 && value < 80).length },
      { label: 'Low (<60%)', count: confidenceValues.filter((value) => value < 60).length },
    ];
    const seasonStats = ['Kharif', 'Rabi', 'Zaid'].map((season) => {
      const values = predictions
        .filter((prediction) => String(prediction.season || '').toLowerCase() === season.toLowerCase())
        .map((prediction) => Number(prediction.confidence))
        .filter((value) => Number.isFinite(value));
      return { season, count: values.length, average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0 };
    });
    const reviewQueue = predictions
      .filter((prediction) => Number(prediction.confidence || 0) < 60)
      .sort((a, b) => Number(a.confidence || 0) - Number(b.confidence || 0))
      .slice(0, 8);

    return {
      averageConfidence: confidenceValues.length
        ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
        : 0,
      lowConfidence: confidenceValues.filter((value) => value < 60).length,
      verifiedRate: data.farmers.length
        ? (data.farmers.filter((farmer) => farmer.verified).length / data.farmers.length) * 100
        : 0,
      confidenceBands,
      seasonStats,
      reviewQueue,
    };
  }, [data]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center admin-page text-white">Loading analytics...</div>;
  }

  return (
    <div className="flex h-screen admin-page">
      <Sidebar currentPage="analytics" />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="page-header mb-8">
            <h1 className="page-title">{getTranslation(language, 'adminAnalytics')}</h1>
            <p className="page-subtitle">{getTranslation(language, 'adminAnalyticsSubtitle')}</p>
            <div className="page-divider" />
          </div>

          {error && <div className="mb-6 rounded-lg bg-red-100 p-4 text-red-800">{error}</div>}

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [getTranslation(language, 'totalFarmers'), data.farmers.length, `${analytics.verifiedRate.toFixed(1)}% ${getTranslation(language, 'verifiedRate')}`],
              [getTranslation(language, 'totalPredictions'), data.predictions.length, `${analytics.averageConfidence.toFixed(1)}% ${getTranslation(language, 'averageConfidence')}`],
              [getTranslation(language, 'lowConfidencePredictions'), analytics.lowConfidence, getTranslation(language, 'needsReview')],
              [getTranslation(language, 'activeDistricts'), data.districts.length, getTranslation(language, 'districtActivity')],
            ].map(([label, value, detail]) => (
              <div key={label} className="card card-content">
                <p className="stat-label">{label}</p>
                <p className="stat-value">{value}</p>
                <p className="card-muted mt-2 text-sm">{detail}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
            <section className="card card-content">
              <h2 className="card-title">{getTranslation(language, 'confidenceAnalysis')}</h2>
              <p className="card-muted mb-6 mt-2">{getTranslation(language, 'confidenceAnalysisDescription')}</p>
              <div className="space-y-4">
                {analytics.confidenceBands.map((band) => (
                  <div key={band.label}>
                    <div className="mb-1 flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-200"><span>{band.label}</span><span>{band.count}</span></div>
                    <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700"><div className="h-3 rounded-full bg-emerald-500" style={{ width: `${data.predictions.length ? (band.count / data.predictions.length) * 100 : 0}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card card-content">
              <h2 className="card-title">{getTranslation(language, 'seasonPerformance')}</h2>
              <p className="card-muted mb-6 mt-2">{getTranslation(language, 'seasonPerformanceDescription')}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm"><thead><tr className="border-b border-gray-200 dark:border-gray-700"><th className="py-3">Season</th><th className="py-3">Predictions</th><th className="py-3">Average suitability</th></tr></thead><tbody>{analytics.seasonStats.map((item) => <tr key={item.season} className="border-b border-gray-100 dark:border-gray-700"><td className="py-3 font-semibold">{item.season}</td><td className="py-3">{item.count}</td><td className="py-3">{item.average.toFixed(1)}%</td></tr>)}</tbody></table>
              </div>
            </section>

            <section className="card card-content xl:col-span-2">
              <h2 className="card-title">{getTranslation(language, 'reviewQueue')}</h2>
              <p className="card-muted mb-6 mt-2">{getTranslation(language, 'reviewQueueDescription')}</p>
              {analytics.reviewQueue.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-gray-200 dark:border-gray-700"><th className="py-3">Crop</th><th className="py-3">District</th><th className="py-3">Season</th><th className="py-3">Suitability</th></tr></thead><tbody>{analytics.reviewQueue.map((item) => <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700"><td className="py-3 font-semibold">{item.recommended_crop || 'Unknown'}</td><td className="py-3">{item.district || 'Unknown'}</td><td className="py-3">{item.season || 'Unknown'}</td><td className="py-3 text-amber-600">{Number(item.confidence || 0).toFixed(1)}%</td></tr>)}</tbody></table></div> : <p className="card-muted">{getTranslation(language, 'noReviewItems')}</p>}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAnalyticsPage;
