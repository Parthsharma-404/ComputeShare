import React from 'react';
import { Hexagon, Activity, LayoutDashboard, Share2, ShieldCheck, Globe, Moon, Sun, Settings } from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { name: 'Donor Worker', icon: LayoutDashboard },
  { name: 'Task Submission', icon: Share2 },
  { name: 'Verification', icon: ShieldCheck },
  { name: 'Global Network', icon: Globe }
];

const Sidebar = ({ activeSection, onNavClick, isLightMode, toggleTheme }) => {
  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-top">
        <div className="logo-container">
          <Hexagon className="logo-icon animate-pulse-glow" size={32} />
          <span className="logo-text">ComputeShare</span>
        </div>
        
        <div className="nav-menu">
          {navItems.map((item, idx) => (
            <button
              key={item.name}
              className={`nav-btn ${activeSection === idx ? 'active' : ''}`}
              onClick={() => onNavClick(idx)}
            >
              <item.icon className="nav-icon" size={20} />
              {item.name}
            </button>
          ))}
        </div>
      </div>
      
      <div className="sidebar-bottom">
        <div className="status-pill">
          <Activity className="status-icon" size={16} />
          <div className="status-text-stack">
            <span className="mono-text fw-bold">Network Active</span>
            <span className="mono-text text-muted">24 Workers</span>
          </div>
          <div className="status-dot"></div>
        </div>

        <div className="donor-identity">
          <div className="avatar-placeholder"></div>
          <div className="identity-info">
            <span className="mono-text text-small text-muted">Node ID</span>
            <span className="hash-text mono-text glowing-text-cyan">0xf3a9...c821</span>
          </div>
        </div>

        <div className="sidebar-actions">
          <button className="action-btn" onClick={toggleTheme} title="Toggle Theme">
            {isLightMode ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button className="action-btn" title="Settings">
            <Settings size={20} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
