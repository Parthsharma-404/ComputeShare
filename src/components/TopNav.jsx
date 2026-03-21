import React from 'react';
import { Hexagon, Activity } from 'lucide-react';
import './TopNav.css';

const navItems = [
  'Donor Worker',
  'Task Submission',
  'Verification',
  'Global Network'
];

const TopNav = ({ activeSection, onNavClick }) => {
  return (
    <nav className="top-nav glass-panel">
      <div className="nav-left">
        <div className="logo-container">
          <Hexagon className="logo-icon animate-pulse-glow" size={28} />
          <span className="logo-text">ComputeShare</span>
        </div>
      </div>
      
      <div className="nav-center">
        <div className="tabs-container">
          {navItems.map((item, idx) => (
            <button
              key={item}
              className={`nav-btn ${activeSection === idx ? 'active' : ''}`}
              onClick={() => onNavClick(idx)}
            >
              {item}
            </button>
          ))}
        </div>
        
        <div className="status-pill">
          <Activity className="status-icon" size={16} />
          <span className="status-text mono-text">Network Active — 24 Workers Online</span>
          <div className="status-dot"></div>
        </div>
      </div>
      
      <div className="nav-right">
        <div className="donor-identity glass-panel">
          <span className="hash-text mono-text glowing-text-cyan">0xf3a9...c821</span>
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
