import React, { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import DonorWorkerPanel from './components/DonorWorkerPanel';
import TaskSubmission from './components/TaskSubmission';
import CryptographicVerification from './components/CryptographicVerification';
import CommunityDashboard from './components/CommunityDashboard';

function App() {
  const [activeSection, setActiveSection] = useState(0);
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [isLightMode]);

  const toggleTheme = () => setIsLightMode(!isLightMode);

  return (
    <div className="app-container">
      <div className="heartbeat-bg" />
      
      <Sidebar 
        activeSection={activeSection} 
        onNavClick={setActiveSection} 
        isLightMode={isLightMode}
        toggleTheme={toggleTheme}
      />
      
      <main className="main-content">
        <div className="section-wrapper fade-in" key={activeSection}>
          {activeSection === 0 && <DonorWorkerPanel />}
          {activeSection === 1 && <TaskSubmission />}
          {activeSection === 2 && <CryptographicVerification />}
          {activeSection === 3 && <CommunityDashboard />}
        </div>
      </main>
    </div>
  );
}

export default App;
