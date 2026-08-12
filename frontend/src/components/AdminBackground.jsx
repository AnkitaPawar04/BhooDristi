import React from 'react';

const AdminBackground = ({ children, isDark = false }) => {
  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      {/* Fixed Background Layer */}
      <div className={`admin-app-wrapper ${isDark ? 'dark' : ''}`} style={{ position: 'fixed', top: 0, left: 0, zIndex: 0, width: '100%', height: '100vh', pointerEvents: 'none' }}>
        {/* Grid Background */}
        <div className="admin-grid"></div>

        {/* Animated Gradient Orbs */}
        <div className="admin-orb admin-orb-1"></div>
        <div className="admin-orb admin-orb-2"></div>
        <div className="admin-orb admin-orb-3"></div>

        {/* Data Visualization Elements */}
        <div className="admin-data-viz">
          {/* Floating Data Cards/Icons (decorative only) */}
          <div className="data-float data-float-1"></div>
          <div className="data-float data-float-2"></div>
          <div className="data-float data-float-3"></div>
          <div className="data-float data-float-4"></div>
          <div className="data-float data-float-5"></div>
          <div className="data-float data-float-6"></div>
        </div>

        {/* Animated Lines/Networks */}
        <svg className="admin-network" viewBox="0 0 1000 800" preserveAspectRatio="none">
          {/* Animated connecting lines */}
          <line x1="50" y1="100" x2="950" y2="150" strokeWidth="1" stroke="url(#lineGradient)" opacity="0.2" className="animate-line" />
          <line x1="100" y1="700" x2="900" y2="650" strokeWidth="1" stroke="url(#lineGradient)" opacity="0.15" className="animate-line" style={{animationDelay: '0.5s'}} />
          <line x1="200" y1="300" x2="800" y2="500" strokeWidth="1" stroke="url(#lineGradient)" opacity="0.18" className="animate-line" style={{animationDelay: '1s'}} />
          <line x1="150" y1="500" x2="850" y2="350" strokeWidth="1" stroke="url(#lineGradient)" opacity="0.2" className="animate-line" style={{animationDelay: '1.5s'}} />
          
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
          </defs>
        </svg>

        {/* Hexagon Grid Pattern */}
        <div className="admin-hexagons">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="hex" style={{
              left: `${(i % 4) * 25 + Math.random() * 10}%`,
              top: `${Math.floor(i / 4) * 30 + Math.random() * 15}%`,
              animationDelay: `${i * 0.1}s`
            }}></div>
          ))}
        </div>
      </div>

      {/* Content Layer - Positioned relative on top of background */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
};

export default AdminBackground;
