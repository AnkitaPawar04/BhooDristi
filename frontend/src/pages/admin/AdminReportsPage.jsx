import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { useApp } from '../../contexts/AppContext';
import { getTranslation } from '../../utils/i18n';
import { adminAPI } from '../../services/api';
import { DistrictCropChart } from '../../charts/Charts';

const AdminReportsPage = () => {
  const { language } = useApp();
  const [predictions, setPredictions] = useState([]);
  const [reportType, setReportType] = useState('predictions');
  const [district, setDistrict] = useState('all');
  const [season, setSeason] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getAllPredictions()
      .then((response) => setPredictions(response.data?.predictions || []))
      .catch(() => setPredictions([]))
      .finally(() => setLoading(false));
  }, []);

  const districts = useMemo(() => [...new Set(predictions.map((item) => item.district).filter(Boolean))].sort(), [predictions]);
  const filtered = useMemo(() => predictions.filter((item) => (district === 'all' || item.district === district) && (season === 'all' || item.season === season)), [district, predictions, season]);
  const reportRows = useMemo(() => {
    if (reportType === 'district') {
      const counts = filtered.reduce((result, item) => {
        const key = item.district || 'Unknown';
        result[key] = (result[key] || 0) + 1;
        return result;
      }, {});
      return Object.entries(counts).map(([name, count]) => ({ name, count }));
    }
    if (reportType === 'crop') {
      const counts = filtered.reduce((result, item) => {
        const key = item.recommended_crop || 'Unknown';
        result[key] = (result[key] || 0) + 1;
        return result;
      }, {});
      return Object.entries(counts).map(([name, count]) => ({ name, count }));
    }
    return filtered.map((item) => ({
      name: item.recommended_crop || 'Unknown',
      count: Number(item.confidence || 0).toFixed(1),
      district: item.district || 'Unknown',
      season: item.season || 'Unknown',
    }));
  }, [filtered, reportType]);

  const visualData = useMemo(() => {
    if (reportType === 'predictions') {
      return [
        { district: 'High (80%+)', count: filtered.filter((item) => Number(item.confidence || 0) >= 80).length },
        { district: 'Medium (60-79%)', count: filtered.filter((item) => Number(item.confidence || 0) >= 60 && Number(item.confidence || 0) < 80).length },
        { district: 'Low (<60%)', count: filtered.filter((item) => Number(item.confidence || 0) < 60).length },
      ];
    }
    return reportRows.map((row) => ({
      crop: row.name,
      district: row.name,
      count: Number(row.count) || 0,
    }));
  }, [filtered, reportRows, reportType]);

  const downloadReport = () => {
    const headers = reportType === 'predictions' ? ['Crop', 'Suitability', 'District', 'Season'] : ['Name', 'Count'];
    const rows = reportRows.map((row) => reportType === 'predictions' ? [row.name, row.count, row.district, row.season] : [row.name, row.count]);
    const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `agrosahyadri-${reportType}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="reports-page flex h-screen admin-page">
      <Sidebar currentPage="reports" />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="page-header mb-8"><h1 className="page-title">{getTranslation(language, 'adminReports')}</h1><p className="page-subtitle">{getTranslation(language, 'adminReportsSubtitle')}</p><div className="page-divider" /></div>
          <section className="card card-content mb-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="text-sm font-semibold">Report type<select value={reportType} onChange={(event) => setReportType(event.target.value)} className="select-field mt-2"><option value="predictions">Prediction detail</option><option value="district">District summary</option><option value="crop">Crop summary</option></select></label>
              <label className="text-sm font-semibold">District<select value={district} onChange={(event) => setDistrict(event.target.value)} className="select-field mt-2"><option value="all">All districts</option>{districts.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="text-sm font-semibold">Season<select value={season} onChange={(event) => setSeason(event.target.value)} className="select-field mt-2"><option value="all">All seasons</option><option value="Kharif">Kharif</option><option value="Rabi">Rabi</option><option value="Zaid">Zaid</option></select></label>
            </div>
            <div className="report-actions mt-6 flex flex-wrap gap-3"><button type="button" onClick={downloadReport} className="btn-primary">Download CSV</button><button type="button" onClick={() => window.print()} className="btn-secondary">Print Report</button></div>
          </section>
          {visualData.length > 0 && (
            <section className="report-visual card card-content mb-8">
              <h2 className="card-title">{reportType === 'predictions' ? 'Prediction Confidence' : 'Visual Summary'}</h2>
              <p className="card-muted mb-6 mt-2">A visual view of the selected report grouping.</p>
              <div className="h-72"><DistrictCropChart data={visualData} /></div>
            </section>
          )}
          <section className="card card-content">
            <div className="mb-6 flex items-center justify-between"><div><h2 className="card-title">Report Preview</h2><p className="card-muted mt-2">{filtered.length} records match the selected filters.</p></div></div>
            {loading ? <p className="card-muted">Loading report data...</p> : <div className="report-table overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-gray-200 dark:border-gray-700"><th className="py-3">{reportType === 'predictions' ? 'Crop' : 'Name'}</th><th className="py-3">{reportType === 'predictions' ? 'Suitability' : 'Count'}</th>{reportType === 'predictions' && <><th className="py-3">District</th><th className="py-3">Season</th></>}</tr></thead><tbody>{reportRows.map((row, index) => <tr key={`${row.name}-${index}`} className="border-b border-gray-100 dark:border-gray-700"><td className="py-3 font-semibold">{row.name}</td><td className="py-3">{row.count}{reportType === 'predictions' ? '%' : ''}</td>{reportType === 'predictions' && <><td className="py-3">{row.district}</td><td className="py-3">{row.season}</td></>}</tr>)}</tbody></table></div>}
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminReportsPage;
