import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Cpu, CheckCircle, Clock, Zap, Play, Activity, MousePointerClick, Moon, Layers } from 'lucide-react';
import { socket } from '../socket';
import './DonorWorkerPanel.css';

const StatCard = ({ title, value, unit, icon: Icon, colorClass, sparklinePts }) => (
  <div className="stat-card glass-panel flex-col">
    <div className="stat-header">
      <div className="stat-title">{title}</div>
      <Icon className={`stat-icon ${colorClass}`} size={18} />
    </div>
    <div className={`stat-value mono-text ${colorClass}`}>
      {value} <span className="stat-unit">{unit}</span>
    </div>
    {sparklinePts && (
      <svg width="100%" height="30" className="sparkline" viewBox="0 0 100 30" preserveAspectRatio="none">
        <polyline points={sparklinePts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={colorClass} />
        <defs>
          <linearGradient id={`spark-${colorClass}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="currentColor" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <polygon points={`0,30 ${sparklinePts} 100,30`} fill={`url(#spark-${colorClass})`} className={colorClass} />
      </svg>
    )}
  </div>
);

const TerminalConsole = ({ isComputing, logs }) => {
  const terminalRef = useRef(null);
  
  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [logs]);

  return (
    <div className="terminal-console glass-panel">
      <div className="terminal-header">
        <div className="terminal-dot red"></div>
        <div className="terminal-dot yellow"></div>
        <div className="terminal-dot green"></div>
        <span className="terminal-title mono-text">worker_node_tty</span>
      </div>
      <div className="terminal-body mono-text" ref={terminalRef}>
        {logs.map((log, i) => (
          <div key={i} className="terminal-line typing-anim">{log}</div>
        ))}
        {isComputing && <div className="terminal-cursor">_</div>}
      </div>
    </div>
  );
};

const DonorWorkerPanel = () => {
  const [isComputing, setIsComputing] = useState(false);
  const [cpuDisplay, setCpuDisplay] = useState(20);
  const [activityState, setActivityState] = useState('Active'); // Active, Idle, Background
  const [logs, setLogs] = useState(['[SYSTEM]: Worker initialized. Profiling device specs...']);
  const [opsRate, setOpsRate] = useState(0);
  
  const workerIdRef = useRef('worker-' + Math.random().toString(36).substring(2, 9));
  const heartbeatIntervalRef = useRef(null);
  const idleTimerRef = useRef(null);
  
  const targetCpuRef = useRef(20);
  const currentCpuRef = useRef(20);
  const perfFactorRef = useRef(1.0);

  const addLog = useCallback((msg) => {
    setLogs(prev => [...prev.slice(-25), msg]);
  }, []);

  // --- Device Performance Benchmarking ---
  useEffect(() => {
    const start = performance.now();
    let result = 0;
    for(let i = 0; i < 3000000; i++) {
        result += Math.sqrt(i);
    }
    const duration = performance.now() - start;
    
    // Scale factor based on JS execution speed
    let factor = 1.0;
    if (duration > 15) factor = 0.85;
    if (duration > 30) factor = 0.7;
    if (duration > 60) factor = 0.5;
    
    perfFactorRef.current = factor;
    addLog(`[HARDWARE]: Benchmark latency ${duration.toFixed(1)}ms. Power profile coefficient: x${factor}`);
    addLog(`[SYSTEM]: Device profile ready. Waiting for network engagement...`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Smooth CPU Interpolation Loop ---
  useEffect(() => {
    let animationFrameId;
    const updateMeter = () => {
      const target = targetCpuRef.current;
      const diff = target - currentCpuRef.current;
      
      if (Math.abs(diff) > 0.1) {
         currentCpuRef.current += diff * 0.05; // Smooth 5% easing towards target
      } else {
         currentCpuRef.current = target;
      }
      
      setCpuDisplay(Math.round(currentCpuRef.current));
      animationFrameId = requestAnimationFrame(updateMeter);
    };
    updateMeter();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // --- CPU Target Flutter based on State ---
  useEffect(() => {
    let baseTarget = 20;
    if (activityState === 'Background') baseTarget = 100;
    else if (activityState === 'Idle') baseTarget = 80;
    else baseTarget = 20;

    const boundedBase = baseTarget * perfFactorRef.current;

    // Simulate realistic hardware load flutter (change target wildly every 1s)
    const flutterInterval = setInterval(() => {
       const flutter = (Math.random() * 8) - 4; // +/- 4%
       const finalTarget = Math.max(5, Math.min(100, boundedBase + flutter));
       targetCpuRef.current = finalTarget;
    }, 800);

    return () => clearInterval(flutterInterval);
  }, [activityState]);

  // --- User Activity Detection ---
  const handleUserActivity = useCallback(() => {
    if (document.visibilityState === 'hidden') return;
    
    if (activityState !== 'Active') setActivityState('Active');
    
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (document.visibilityState !== 'hidden') {
         setActivityState('Idle');
      }
    }, 3000); // 3 seconds idle trigger for easy visual testing
  }, [activityState]);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'hidden') {
      setActivityState('Background');
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    } else {
      setActivityState('Active');
      handleUserActivity();
    }
  }, [handleUserActivity]);

  useEffect(() => {
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    handleUserActivity(); // Init

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [handleUserActivity, handleVisibilityChange]);

  // --- Computation Network Sandbox ---
  useEffect(() => {
    let processTimeout;

    if (isComputing) {
      if (!socket.connected) {
         addLog('[NETWORK]: Establishing secure connection to Gateway...');
         socket.connect();
      }
      
      socket.on('connect', () => {
        addLog(`[NETWORK]: Authenticated! Hash ID: ${socket.id}`);
        socket.emit('register', { workerId: workerIdRef.current, capabilities: ['js', 'wasm'] });
      });

      socket.on('registered', (data) => {
        addLog(`[SYSTEM]: Attached to grid. Threshold policy enforced.`);
      });

      socket.on('assign_chunk', (chunk) => {
        // Dynamic speed based on current instantaneous CPU throttle!
        const effectiveCpu = currentCpuRef.current;
        const computationDelay = Math.max(200, 2000 - (effectiveCpu * 18));
        
        processTimeout = setTimeout(() => {
           addLog(`[COMPUTE]: Solved job block #${chunk.id.substring(0,6)} @ ${effectiveCpu.toFixed(0)}% Util.`);
           const fakeResult = Math.random() * 1000;
           setOpsRate((effectiveCpu * 42) + Math.floor(Math.random() * 100)); // Update visual ops rate
           socket.emit('submit_result', { chunkId: chunk.id, result: fakeResult });
        }, computationDelay);
      });
      
      heartbeatIntervalRef.current = setInterval(() => {
        if (socket.connected) {
           socket.emit('heartbeat', { opsPerSec: (currentCpuRef.current * 42) });
        }
      }, 5000);
      
    } else {
      if (socket.connected) {
        socket.disconnect();
        addLog(`[NETWORK]: Terminated connection. Worker offline.`);
        setOpsRate(0);
      }
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (processTimeout) clearTimeout(processTimeout);
    }
    
    return () => {
      socket.off('connect');
      socket.off('registered');
      socket.off('assign_chunk');
      if (processTimeout) clearTimeout(processTimeout);
    };
  }, [isComputing, addLog]);


  // SVG Meter Math
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  // Offset calculated dynamically per frame via state
  const strokeDashoffset = circumference - (cpuDisplay / 100) * circumference;

  const renderActivityBadge = () => {
     if (activityState === 'Active') {
       return <div className="activity-badge badge-active"><MousePointerClick size={14}/><span>Active Mode</span></div>;
     } else if (activityState === 'Idle') {
       return <div className="activity-badge badge-idle"><Moon size={14}/><span>Idle Mode</span></div>;
     } else {
       return <div className="activity-badge badge-background"><Layers size={14}/><span>Background Mode</span></div>;
     }
  };

  return (
    <div className="section-content fade-in donor-layout">
      
      <div className="layout-left">
        <div className="worker-header">
          <h2 className="section-title">NebulaGrid Donor Node</h2>
          <div className={`status-badge ${isComputing ? 'glowing-text-cyan' : 'text-muted'}`}>
            <span className={isComputing ? 'pulse-dot-cyan' : ''} style={{width: 8, height: 8, backgroundColor: isComputing ? '' : 'gray', borderRadius: '50%'}}></span> 
            {isComputing ? 'CONNECTED (COMPUTING)' : 'OFFLINE'}
          </div>
        </div>

        <div className="meter-container glass-panel">
          
          <div className="meter-header">
             <Activity className="neon-cyan-text" size={20}/>
             <span className="mono-text fw-bold text-muted">LIVE TELEMETRY</span>
             <div className="flex-spacer"></div>
             {renderActivityBadge()}
          </div>

          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '20px 0' }}>
            <svg width="280" height="280" viewBox="0 0 280 280" className="cpu-svg" style={{ marginBottom: 0 }}>
              <defs>
                <linearGradient id="meter-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--neon-cyan)" />
                  <stop offset="100%" stopColor="var(--neon-purple)" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <circle cx="140" cy="140" r={radius} className="meter-bg" strokeWidth="12" />
              <circle
                cx="140" cy="140" r={radius}
                className="meter-fill"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                stroke="url(#meter-gradient)"
                filter="url(#glow)"
                style={{ transition: 'stroke-dashoffset 0.1s linear' }}
              />
            </svg>
            <div className="meter-center" style={{ top: '50%' }}>
              <div className="meter-value mono-text glowing-text-cyan">{cpuDisplay}%</div>
              <div className="meter-label">CPU AVAILABLE</div>
            </div>
          </div>
          
          <button 
            className={`start-compute-btn ${isComputing ? 'active' : ''}`}
            onClick={() => setIsComputing(!isComputing)}
          >
            <Play size={18} fill={isComputing ? "none" : "currentColor"} /> 
            {isComputing ? 'STOP COMPUTING' : 'START COMPUTING'}
          </button>
        </div>

        <div className="stat-row">
          <StatCard 
            title="Processing Speed" 
            value={opsRate.toFixed(0)} 
            unit="Ops/s" 
            icon={Zap} 
            colorClass="neon-cyan-text" 
            sparklinePts="0,20 20,15 40,25 60,10 80,18 100,5"
          />
          <StatCard 
            title="CPU-Hours" 
            value="42.8" 
            unit="k" 
            icon={Clock} 
            colorClass="neon-purple-text" 
            sparklinePts="0,25 20,20 40,15 60,22 80,10 100,5"
          />
        </div>
      </div>

      <div className="layout-right">
        <TerminalConsole isComputing={isComputing} logs={logs} />
      </div>

    </div>
  );
};

export default DonorWorkerPanel;
