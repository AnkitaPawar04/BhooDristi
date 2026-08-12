import React from 'react';

const FarmBackground = ({ children, isDark = false }) => {
  return (
    <div className={`farm-app-wrapper ${isDark ? 'dark' : ''}`} style={{ position: 'fixed', top: 0, left: 0, zIndex: 1, width: '100%', height: '100%' }}>
      {/* Sky Layer */}
      <div className={`farm-sky ${isDark ? 'dark' : ''}`}></div>

      {/* Animated Sun */}
      <div className={`farm-sun ${isDark ? 'dark' : ''}`}></div>

      {/* Animated Clouds */}
      <div className="farm-clouds">
        <div className={`cloud cloud1 ${isDark ? 'dark' : ''}`}></div>
        <div className={`cloud cloud2 ${isDark ? 'dark' : ''}`}></div>
        <div className={`cloud cloud3 ${isDark ? 'dark' : ''}`}></div>
        <div className={`cloud cloud4 ${isDark ? 'dark' : ''}`}></div>
      </div>

      {/* Field Background */}
      <div className={`farm-field ${isDark ? 'dark' : ''}`}>
        {/* Animated Field Rows */}
        <div className="farm-rows"></div>

        {/* Crop Plants (decorative shapes only) */}
        <div className="farm-crops">
          <div className="crop-group" style={{fontSize: '2.5rem'}}></div>
          <div className="crop-group" style={{fontSize: '2rem'}}></div>
          <div className="crop-group" style={{fontSize: '2.5rem'}}></div>
          <div className="crop-group" style={{fontSize: '2.2rem'}}></div>
          <div className="crop-group" style={{fontSize: '2.5rem'}}></div>
          <div className="crop-group" style={{fontSize: '2rem'}}></div>
        </div>

        {/* Dust Particles */}
        <div className="farm-dust">
          <div className="dust-particle"></div>
          <div className="dust-particle"></div>
          <div className="dust-particle"></div>
          <div className="dust-particle"></div>
          <div className="dust-particle"></div>
        </div>

        {/* Trees/Boundaries */}
        <div className="farm-trees">
          <div className="tree">
            <div className="tree-foliage"></div>
            <div className="tree-trunk"></div>
          </div>
          <div className="tree">
            <div className="tree-foliage"></div>
            <div className="tree-trunk"></div>
          </div>
          <div className="tree">
            <div className="tree-foliage"></div>
            <div className="tree-trunk"></div>
          </div>
        </div>
      </div>

      {/* Content Layer */}
      <div className="farm-content" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );
};

export default FarmBackground;
