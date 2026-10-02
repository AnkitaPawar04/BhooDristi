import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { useApp } from '../../contexts/AppContext';
import { getTranslation } from '../../utils/i18n';
import dashboardBgVideo from './videos/dashboard.mp4';
import { marketAPI } from '../../services/api';

const FALLBACK_COMMODITIES = [
  'Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 'Soybean',
  'Groundnut', 'Onion', 'Potato', 'Tomato', 'Chickpea', 'Jowar',
];

const MarketInformationPage = ({ onNavigate }) => {
  const { language } = useApp();
  const t = (key) => getTranslation(language, key);
  const [commodities, setCommodities] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [district, setDistrict] = useState('Pune');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    marketAPI.getCommodities()
      .then(({ data }) => {
        const available = data.commodities?.length ? data.commodities : FALLBACK_COMMODITIES;
        setCommodities(available);
        setSelectedCrop((current) => current || available[0] || '');
      })
      .catch((requestError) => {
        const fallback = FALLBACK_COMMODITIES;
        setCommodities(fallback);
        setSelectedCrop((current) => current || fallback[0]);
        setError(requestError.response?.data?.detail || 'Live market prices are temporarily unavailable. Crop selection remains available.');
      });
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    if (!selectedCrop) {
      setRecords([]);
      setLoading(false);
      return undefined;
    }
    marketAPI.getPrices({ crop: selectedCrop, district, limit: 10 })
      .then(({ data }) => {
        if (active) {
          setRecords(data.records || []);
          setIsStale(Boolean(data.stale));
        }
      })
      .catch((requestError) => {
        if (active) {
          setRecords([]);
          setIsStale(false);
          setError(requestError.response?.data?.detail || 'Market data is temporarily unavailable. Please try again later.');
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [district, selectedCrop]);

  const modalRecords = records.filter((record) => Number.isFinite(record.modal_price));
  const latestRecord = modalRecords[0];
  const trendRecords = [...modalRecords].sort((a, b) => {
    const [dayA, monthA, yearA] = (a.arrival_date || '').split('/').map(Number);
    const [dayB, monthB, yearB] = (b.arrival_date || '').split('/').map(Number);
    return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
  }).slice(-7);
  const change = useMemo(() => {
    if (trendRecords.length < 2 || !trendRecords[0].modal_price) return null;
    return ((trendRecords.at(-1).modal_price - trendRecords[0].modal_price) / trendRecords[0].modal_price * 100).toFixed(1);
  }, [trendRecords]);

  return (
    <div className="flex h-screen farm-page">
      <Sidebar currentPage="market" onNavigate={onNavigate} />
      <video autoPlay loop muted playsInline className="dashboard-bg-video"><source src={dashboardBgVideo} type="video/mp4" /></video>
      <main className="flex-1 overflow-auto relative z-10">
        <div className="p-8">
          <div className="page-header mb-8">
            <h1 className="page-title text-white">{t('marketInformationPage')}</h1>
            <p className="page-subtitle text-white">{t('compareCropPrices')}</p>
            <div className="page-divider"></div>
          </div>

          <section className="bg-white/95 rounded-2xl shadow-xl p-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <label className="font-semibold text-gray-700">{t('selectCrop')}
                <select value={selectedCrop} onChange={(event) => setSelectedCrop(event.target.value)} className="block mt-2 px-4 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {commodities.map((crop) => <option key={crop}>{crop}</option>)}
                </select>
              </label>
              <label className="font-semibold text-gray-700">{t('district')}
                <input value={district} onChange={(event) => setDistrict(event.target.value)} className="block mt-2 px-4 py-2 border border-emerald-200 rounded-lg" />
              </label>
            </div>

                <span className="rounded-full bg-green-100 px-3 py-2 text-xs font-semibold text-green-900">{t('latestGovernmentData')}</span>
              {isStale && <p className="mt-4 rounded-lg bg-amber-100 p-3 text-sm text-amber-900">Showing the last cached government prices because live market data is temporarily unavailable.</p>}
            {loading && <p className="py-10 text-center text-gray-600">{t('loadingMandiPrices')}</p>}
              {error && <p className="rounded-lg bg-red-50 p-4 text-red-800">{error || t('marketUnavailable')}</p>}
              {!loading && !error && records.length === 0 && <p className="rounded-lg bg-amber-50 p-4 text-amber-900">{t('noMandiRecords')}</p>}
            {!loading && !error && records.length > 0 && <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-5"><p className="text-sm text-gray-600">{t('latestModalPrice')}</p><p className="text-3xl font-bold text-blue-900 mt-1">Rs {latestRecord?.modal_price?.toLocaleString()}</p><p className="text-xs text-gray-500">per quintal</p></div>
              <div className="rounded-xl bg-green-50 border border-green-200 p-5"><p className="text-sm text-gray-600">{t('priceRange')}</p><p className="text-xl font-bold text-green-900 mt-2">Rs {latestRecord?.min_price?.toLocaleString()} - Rs {latestRecord?.max_price?.toLocaleString()}</p><p className="text-xs text-gray-500 mt-1">{t('minimum')} - {t('maximum')}</p></div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-5"><p className="text-sm text-gray-600">{t('governmentTrend')}</p><p className="text-3xl font-bold text-amber-900 mt-1">{change === null ? t('unavailable') : `${change > 0 ? '+' : ''}${change}%`}</p><p className="text-xs text-gray-500">Only when dated records are available</p></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">{t('priceTrend')}</h2>
                <div className="h-56 flex items-end gap-3 border-b border-l border-gray-200 px-4 pb-2">
                  {trendRecords.length < 2 ? <p className="self-center text-gray-500">Trend data unavailable</p> : trendRecords.map((record) => <div key={`${record.market}-${record.arrival_date}`} className="flex-1 flex flex-col items-center justify-end gap-2 h-full"><span className="text-xs text-gray-500">{record.modal_price}</span><div className="w-full max-w-12 rounded-t bg-emerald-500" style={{ height: `${(record.modal_price / Math.max(...trendRecords.map((item) => item.modal_price)) * 80)}%` }} /><span className="text-xs text-gray-500">{record.arrival_date}</span></div>)}
                </div>
                <p className="text-xs text-gray-500 mt-3">Based on dated modal prices returned by data.gov.in.</p>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm text-gray-600">Latest market record</p><p className="font-bold text-gray-900 mt-1">{latestRecord?.market} - {latestRecord?.commodity}</p><p className="text-sm text-gray-600 mt-1">{latestRecord?.variety || 'Variety not reported'} | {latestRecord?.grade || 'Grade not reported'}</p></div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-sm text-gray-600">Reported</p><p className="font-bold text-gray-900 mt-1">{latestRecord?.arrival_date || 'Date not reported'}</p><p className="text-sm text-gray-600 mt-1">Source: Government of India data.gov.in</p></div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm text-gray-600">MSP</p><p className="font-bold text-gray-900 mt-1">Not provided by this mandi dataset</p><p className="text-sm text-gray-600 mt-1">No MSP value is fabricated here.</p></div>
              </div>
            </div>
            <div className="mt-8 overflow-x-auto"><h2 className="text-xl font-bold text-gray-800 mb-3">Mandi records</h2><table className="w-full text-sm"><thead className="bg-emerald-50"><tr>{['Market', 'Commodity', 'Variety', 'Grade', 'Min', 'Max', 'Modal', 'Reported'].map((heading) => <th key={heading} className="px-3 py-2 text-left">{heading}</th>)}</tr></thead><tbody>{records.map((record, index) => <tr key={`${record.market}-${record.arrival_date}-${index}`} className="border-t"><td className="px-3 py-2">{record.market}</td><td className="px-3 py-2">{record.commodity}</td><td className="px-3 py-2">{record.variety || '-'}</td><td className="px-3 py-2">{record.grade || '-'}</td><td className="px-3 py-2">Rs {record.min_price ?? '-'}</td><td className="px-3 py-2">Rs {record.max_price ?? '-'}</td><td className="px-3 py-2 font-semibold">Rs {record.modal_price ?? '-'}</td><td className="px-3 py-2">{record.arrival_date || '-'}</td></tr>)}</tbody></table></div>
            </>}
          </section>
        </div>
      </main>
    </div>
  );
};

export default MarketInformationPage;
