import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { useApp } from '../../contexts/AppContext';
import { getTranslation } from '../../utils/i18n';
import { authAPI, weatherAPI } from '../../services/api';
import useGeolocation from '../../hooks/useGeolocation';
import dashboardBgVideo from './videos/dashboard.mp4';

const CROP_GUIDE = {
  Rice: { duration: '120-150 days', water: 'High', cost: 42000, price: 2300, sowing: 'June-July', risk: 'Flooding and blast disease' },
  Maize: { duration: '90-110 days', water: 'Medium', cost: 30000, price: 2100, sowing: 'June-July', risk: 'Fall armyworm and drought' },
  Cotton: { duration: '160-180 days', water: 'Medium', cost: 48000, price: 7000, sowing: 'June-July', risk: 'Bollworm and irregular rain' },
  Sugarcane: { duration: '10-14 months', water: 'Very high', cost: 90000, price: 3400, sowing: 'October-March', risk: 'Water stress and pests' },
  Wheat: { duration: '120-150 days', water: 'Medium', cost: 28000, price: 2275, sowing: 'October-November', risk: 'Rust and heat at grain filling' },
  Chickpea: { duration: '100-120 days', water: 'Low', cost: 24000, price: 5650, sowing: 'October-November', risk: 'Wilt and pod borer' },
  Soybean: { duration: '90-120 days', water: 'Medium', cost: 32000, price: 4892, sowing: 'June-July', risk: 'Yellow mosaic and waterlogging' },
  Groundnut: { duration: '100-120 days', water: 'Medium', cost: 35000, price: 6783, sowing: 'June-July', risk: 'Leaf spot and drought' },
  Jowar: { duration: '100-120 days', water: 'Low', cost: 22000, price: 3371, sowing: 'June-July / September', risk: 'Shoot fly and moisture stress' },
};

const initialRecord = { crop: 'Maize', area: '', seedCost: '', fertilizerCost: '', irrigationCost: '', harvest: '', sellingPrice: '' };

const FarmPlannerPage = ({ onNavigate }) => {
  const { language } = useApp();
  const t = (key) => getTranslation(language, key);
  const { location, getLocation } = useGeolocation();
  const [activeTab, setActiveTab] = useState('report');
  const [selectedCrop, setSelectedCrop] = useState('Maize');
  const [usualCrops, setUsualCrops] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [records, setRecords] = useState(() => JSON.parse(localStorage.getItem('farm_records') || '[]'));
  const [record, setRecord] = useState(initialRecord);
  const [voiceText, setVoiceText] = useState('');
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');

  const guide = CROP_GUIDE[selectedCrop];

  useEffect(() => {
    const farmerId = localStorage.getItem('farmer_id');
    if (farmerId) {
      authAPI.getFarmerProfile(farmerId).then(({ data }) => {
        setUsualCrops(data.usual_crops || []);
        if (data.usual_crops?.length && CROP_GUIDE[data.usual_crops[0]]) {
          const alternative = Object.keys(CROP_GUIDE).find((crop) => !data.usual_crops.includes(crop));
          if (alternative) setSelectedCrop(alternative);
        }
        if (data.latitude && data.longitude) getWeather(data.latitude, data.longitude);
      }).catch(() => {});
    }
  }, []);

  const getWeather = async (latitude, longitude) => {
    try {
      const response = await weatherAPI.getForecast(latitude, longitude);
      setForecast(response.data.forecast || []);
    } catch {
      setForecast([]);
    }
  };

  useEffect(() => {
    if (location) getWeather(location.latitude, location.longitude);
  }, [location]);

  const alerts = useMemo(() => {
    const generated = [];
    forecast.forEach((day) => {
      if (day.rainfall >= 30) generated.push(`Heavy rainfall expected on ${day.day}. Check drainage and postpone spraying.`);
      if (day.temp_max >= 38) generated.push(`Heat risk on ${day.day}. Irrigate early morning and inspect for heat stress.`);
    });
    if (guide.water === 'High' || guide.water === 'Very high') generated.push(`${selectedCrop} has ${guide.water.toLowerCase()} water demand. Check irrigation availability before planting.`);
    return generated.length ? generated : ['No live weather alerts available. Refresh location to check current conditions.'];
  }, [forecast, guide.water, selectedCrop]);

  const saveRecord = (event) => {
    event.preventDefault();
    const totalCost = ['seedCost', 'fertilizerCost', 'irrigationCost'].reduce((sum, key) => sum + Number(record[key] || 0), 0);
    const income = Number(record.harvest || 0) * Number(record.sellingPrice || 0);
    const next = [{ ...record, id: Date.now(), totalCost, income, profit: income - totalCost }, ...records];
    setRecords(next);
    localStorage.setItem('farm_records', JSON.stringify(next));
    setRecord(initialRecord);
    setMessage('Farm record saved on this device.');
  };

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessage('Voice input is not supported by this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setMessage('Could not understand voice input. Please try again.');
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setVoiceText(text);
      const speech = new SpeechSynthesisUtterance(`You said: ${text}. Selected crop is ${selectedCrop}. Water requirement is ${guide.water}.`);
      speech.lang = recognition.lang;
      window.speechSynthesis.speak(speech);
    };
    recognition.start();
  };

  const tabs = [['report', t('suitabilityReport')], ['calendar', t('cropCalendar')], ['records', t('farmRecords')], ['alerts', t('alerts')], ['voice', t('voiceAssistant')]];

  return (
    <div className="flex h-screen farm-page">
      <Sidebar currentPage="planner" onNavigate={onNavigate} />
      <video autoPlay loop muted playsInline className="dashboard-bg-video"><source src={dashboardBgVideo} type="video/mp4" /></video>
      <main className="flex-1 overflow-auto relative z-10">
        <div className="p-8">
          <div className="page-header mb-8">
            <h1 className="page-title text-white">{t('farmPlanner')}</h1>
            <p className="page-subtitle text-white">{t('planFarmConditions')}</p>
            <div className="page-divider"></div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {tabs.map(([id, label]) => <button key={id} onClick={() => setActiveTab(id)} className={`px-4 py-2 rounded-lg font-semibold ${activeTab === id ? 'bg-emerald-600 text-white' : 'bg-white/90 text-gray-700'}`}>{label}</button>)}
          </div>

          {message && <div className="mb-6 rounded-lg bg-emerald-100 px-4 py-3 text-emerald-900">{message}</div>}

          <section className="bg-white/95 rounded-2xl shadow-xl p-6">
            {(activeTab === 'report' || activeTab === 'calendar' || activeTab === 'market') && (
              <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
                <label className="font-semibold text-gray-700">Crop
                  <select value={selectedCrop} onChange={(event) => setSelectedCrop(event.target.value)} className="block mt-2 px-4 py-2 border rounded-lg">
                    {Object.keys(CROP_GUIDE).map((crop) => <option key={crop}>{crop}</option>)}
                  </select>
                </label>
                <p className="text-sm text-gray-600">Usual crops: {usualCrops.length ? usualCrops.join(', ') : 'Not recorded yet'}</p>
              </div>
            )}

            {activeTab === 'report' && <div><h2 className="text-2xl font-bold text-gray-800 mb-4">Crop Suitability Report</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[['Suitability', usualCrops.includes(selectedCrop) ? 'Rotation crop' : 'New crop option'], ['Water requirement', guide.water], ['Growing duration', guide.duration], ['Estimated input cost', `Rs ${guide.cost.toLocaleString()} / hectare`], ['Reference market value', `Rs ${guide.price.toLocaleString()} / quintal`], ['Best sowing period', guide.sowing], ['Main risks', guide.risk]].map(([label, value]) => <div key={label} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm text-gray-600">{label}</p><p className="mt-1 font-bold text-gray-900">{value}</p></div>)}</div><p className="mt-5 text-xs text-gray-500">Costs and market values are reference estimates until a verified local market provider is connected. Suitability is not a guaranteed yield.</p></div>}

            {activeTab === 'calendar' && <div><h2 className="text-2xl font-bold text-gray-800 mb-4">{selectedCrop} Crop Calendar</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[['Sowing', guide.sowing], ['Fertilizer', 'Basal dose at sowing; split nitrogen during vegetative growth'], ['Irrigation', `Monitor soil moisture; this crop has ${guide.water.toLowerCase()} demand`], ['Pest monitoring', guide.risk], ['Harvest estimate', guide.duration]].map(([label, value]) => <div key={label} className="border-l-4 border-emerald-500 bg-gray-50 p-4"><p className="font-bold text-gray-800">{label}</p><p className="text-gray-600 mt-1">{value}</p></div>)}</div><p className="mt-5 text-xs text-gray-500">Calendar guidance is a planning baseline. Confirm dates with local agriculture officers and current weather.</p></div>}

            {activeTab === 'market' && <div><h2 className="text-2xl font-bold text-gray-800 mb-4">Market Reference</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="rounded-xl bg-blue-50 p-4"><p className="text-sm text-gray-600">Reference price</p><p className="text-2xl font-bold text-blue-900">Rs {guide.price.toLocaleString()}</p><p className="text-xs text-gray-500">per quintal</p></div><div className="rounded-xl bg-green-50 p-4"><p className="text-sm text-gray-600">Nearby mandi</p><p className="font-bold text-green-900">Select location to connect</p><p className="text-xs text-gray-500">Live mandi integration pending</p></div><div className="rounded-xl bg-amber-50 p-4"><p className="text-sm text-gray-600">Best selling period</p><p className="font-bold text-amber-900">Near harvest, compare 3 markets</p></div></div><p className="mt-5 text-xs text-gray-500">Prices shown are reference values, not live mandi quotes or a guarantee. MSP availability depends on crop and government notification.</p></div>}

            {activeTab === 'records' && <div><h2 className="text-2xl font-bold text-gray-800 mb-4">Farm Records</h2><form onSubmit={saveRecord} className="grid grid-cols-1 md:grid-cols-3 gap-3">{Object.keys(initialRecord).map((key) => <input key={key} required={['crop', 'area'].includes(key)} type={key === 'crop' ? 'text' : 'number'} placeholder={key.replace(/([A-Z])/g, ' $1')} value={record[key]} onChange={(event) => setRecord({ ...record, [key]: event.target.value })} className="px-3 py-2 border rounded-lg" />)}<button className="bg-emerald-600 text-white rounded-lg px-4 py-2 font-semibold">Save Record</button></form><div className="mt-6 space-y-3">{records.map((item) => <div key={item.id} className="border rounded-lg p-4 flex flex-wrap justify-between gap-3"><span className="font-bold">{item.crop} - {item.area} hectares</span><span>Cost: Rs {item.totalCost} | Income: Rs {item.income} | <strong className={item.profit >= 0 ? 'text-green-700' : 'text-red-700'}>Profit/Loss: Rs {item.profit}</strong></span></div>)}</div></div>}

            {activeTab === 'alerts' && <div><div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold text-gray-800">Farm Alerts</h2><button onClick={getLocation} className="bg-emerald-600 text-white rounded-lg px-4 py-2">Refresh live weather</button></div><div className="space-y-3">{alerts.map((alert, index) => <div key={index} className="border-l-4 border-orange-500 bg-orange-50 p-4 text-gray-800">{alert}</div>)}</div><p className="mt-5 text-xs text-gray-500">Alerts are generated from the live forecast when a location is available. Disease and irrigation reminders are advisory only.</p></div>}

            {activeTab === 'voice' && <div><h2 className="text-2xl font-bold text-gray-800 mb-4">Marathi, Hindi, and English Voice Assistant</h2><p className="text-gray-600 mb-5">Use your browser microphone to ask a question. The assistant repeats what it heard and gives a basic crop summary.</p><button onClick={startVoice} className="bg-emerald-600 text-white rounded-lg px-5 py-3 font-semibold">{listening ? 'Listening...' : 'Start voice input'}</button>{voiceText && <div className="mt-5 rounded-lg bg-gray-50 p-4"><p className="text-sm text-gray-500">Recognized text</p><p className="font-semibold text-gray-800 mt-1">{voiceText}</p></div>}<p className="mt-5 text-xs text-gray-500">Voice recognition depends on browser support and microphone permission. Audio responses use the browser speech engine.</p></div>}
          </section>
        </div>
      </main>
    </div>
  );
};

export default FarmPlannerPage;
