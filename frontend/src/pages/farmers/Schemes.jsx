import React from 'react';
import Sidebar from '../../components/Sidebar';
import dashboardBgVideo from './videos/dashboard.mp4';

const schemes = [
  {
    title: 'Kisan Credit Card (KCC)',
    category: 'Finance',
    description: 'Easy crop loans and credit support for farmers to meet seasonal production and working capital needs.',
  },
  {
    title: 'PM-Kisan Samman Nidhi',
    category: 'Support',
    description: 'Direct income support to eligible farmer families through periodic financial assistance.',
  },
  {
    title: 'Soil Health Card Scheme',
    category: 'Soil',
    description: 'Helps farmers monitor soil fertility and apply the right nutrients for better crop productivity.',
  },
  {
    title: 'Pradhan Mantri Fasal Bima Yojana',
    category: 'Insurance',
    description: 'Crop insurance support to reduce risk from natural calamities, pests, and weather-related losses.',
  },
];

const Schemes = ({ onNavigate }) => {
  return (
    <div className="flex h-screen bg-transparent dark:bg-transparent">
      <Sidebar currentPage="Schemes" onNavigate={onNavigate} userName="Farmer" />

      <div className="flex-1 overflow-auto farm-dashboard relative">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="dashboard-bg-video"
          ref={(video) => {
            if (video) video.playbackRate = 0.5;
          }}
        >
          <source src={dashboardBgVideo} type="video/mp4" />
        </video>

        <div className="dashboard-content relative z-10">
          <div className="p-8 relative z-10">
            <div className="page-header mb-8 animate-fadeInUp">
              <h1 className="page-title">Government Schemes</h1>
              <p className="page-subtitle">Explore crop, finance, and soil support programs designed for farmers.</p>
              <div className="page-divider"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {schemes.map((scheme) => (
                <div
                  key={scheme.title}
                  className="rounded-2xl p-6 shadow-xl border border-emerald-200/50 bg-white/70 backdrop-blur-sm text-slate-800"
                  style={{
                    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.18)',
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  <div className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-4">
                    {scheme.category}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-3">{scheme.title}</h2>
                  <p className="text-slate-700 leading-relaxed">{scheme.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schemes;
