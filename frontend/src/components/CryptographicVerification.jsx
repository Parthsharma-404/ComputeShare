import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Crosshair, Cpu, Terminal as TerminalIcon, ShieldAlert, Activity } from 'lucide-react';
import './CryptographicVerification.css';

const generateHash = () => Math.random().toString(16).substring(2, 10).toUpperCase();
const formatTime = () => new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });

const KpiCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="simple-kpi-card glass-panel">
    <div className="kpi-icon-wrapper">
      <Icon className={colorClass} size={28} />
    </div>
    <div className="kpi-info">
      <div className="kpi-title text-muted">{title}</div>
      <div className={`kpi-value mono-text ${colorClass}`}>{value}</div>
    </div>
  </div>
);

const StaticSecurityNetwork = () => (
  <div className="static-network-wrapper fade-in">
    <svg viewBox="0 0 500 300" className="static-svg">
      <defs>
        <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Connection Lines */}
      {/* Node 1 to Coord */}
      <path d="M 120 60 C 250 60, 300 150, 380 150" className="path-verified" />
      {/* Node 2 to Coord */}
      <path d="M 120 150 L 380 150" className="path-verified" />
      {/* Node 3 to Coord */}
      <path d="M 120 240 C 250 240, 300 150, 380 150" className="path-rejected" />

      {/* Labels on paths */}
      <text x="250" y="85" className="path-label label-verified" textAnchor="middle">VERIFIED</text>
      <text x="250" y="140" className="path-label label-verified" textAnchor="middle">VERIFIED</text>
      <text x="250" y="225" className="path-label label-rejected" textAnchor="middle">REJECTED</text>

      {/* Particles */}
      <circle r="4" className="particle-green" filter="url(#glow-green)">
         <animateMotion dur="2s" repeatCount="indefinite" path="M 120 60 C 250 60, 300 150, 380 150" />
      </circle>
      <circle r="4" className="particle-green" filter="url(#glow-green)">
         <animateMotion dur="2s" repeatCount="indefinite" path="M 120 150 L 380 150" />
      </circle>
      <circle r="4" className="particle-red" filter="url(#glow-red)">
         <animateMotion dur="2.5s" repeatCount="indefinite" path="M 120 240 C 250 240, 300 150, 380 150" />
      </circle>

      {/* Worker Nodes */}
      <g transform="translate(100, 60)">
        <circle r="20" className="static-node-worker verified" />
        <text className="node-text-small" dy=".3em" textAnchor="middle">W-01</text>
      </g>
      <g transform="translate(100, 150)">
        <circle r="20" className="static-node-worker verified" />
        <text className="node-text-small" dy=".3em" textAnchor="middle">W-02</text>
      </g>
      <g transform="translate(100, 240)">
        <circle r="20" className="static-node-worker rejected" />
        <text className="node-text-small" dy=".3em" textAnchor="middle">W-03</text>
        <text y="35" className="node-malicious-lbl" textAnchor="middle">MALICIOUS</text>
      </g>

      {/* Coordinator Node */}
      <circle cx="400" cy="150" r="30" className="static-node-coord" filter="url(#glow-cyan)" />
      <text x="400" y="150" className="node-text-small glow" dy=".3em" textAnchor="middle">COORD</text>
    </svg>
  </div>
);


export default function CryptographicVerification() {
  const [metrics, setMetrics] = useState({ verified: 1240, conflicts: 12 });
  
  const [workers, setWorkers] = useState([
    { id: 'W-A1B2', trust: 100, status: 'Active' },
    { id: 'W-C3D4', trust: 100, status: 'Active' },
    { id: 'W-E5F6', trust: 90, status: 'Active' },
    { id: 'W-G7H8', trust: 100, status: 'Active' },
    { id: 'W-I9J0', trust: 100, status: 'Active' }
  ]);

  const [pipeline, setPipeline] = useState([]);
  const [logs, setLogs] = useState([]);
  const logsRef = useRef(null);

  // States for Simulation and Graph
  const [graphVisible, setGraphVisible] = useState(false);
  
  const simulateRef = useRef(false);
  const metricsRef = useRef({ verified: 1240, conflicts: 12 });
  const workersRef = useRef([...workers]);

  const activeWorkersCount = workers.filter(w => w.status === 'Active').length;

  const addLog = (text, type = 'info') => {
    setLogs(prev => [...prev.slice(-49), { time: formatTime(), text, type }]);
  };

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [logs]);

  // Sync refs to state for display
  useEffect(() => { workersRef.current = workers; }, [workers]);
  useEffect(() => { metricsRef.current = metrics; }, [metrics]);

  // Main Simulation Loop
  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const runCycle = async () => {
      if (!isMounted) return;

      const activeW = workersRef.current.filter(w => w.status === 'Active');
      if (activeW.length < 2) {
        addLog('Insufficient active workers to reach consensus.', 'error');
        timeoutId = setTimeout(runCycle, 5000);
        return;
      }

      // Pick two random active workers
      const shuffled = [...activeW].sort(() => 0.5 - Math.random());
      const w1 = shuffled[0];
      const w2 = shuffled[1];

      const chunkId = `CHK-${Math.random().toString(16).substr(2,6).toUpperCase()}`;
      
      // Update pipeline: WAITING -> COMPUTING
      setPipeline(prev => [{
        id: chunkId,
        status: 'WAITING',
        w1: w1.id, hash1: 'awaiting pool...',
        w2: w2.id, hash2: 'awaiting pool...'
      }, ...prev].slice(0, 25));

      await new Promise(r => setTimeout(r, 600));
      if (!isMounted) return;

      setPipeline(prev => prev.map(p => p.id === chunkId ? {
        ...p, status: 'CALCULATING', hash1: 'hashing...', hash2: 'hashing...'
      } : p));

      addLog(`Assigned ${chunkId} to ${w1.id} & ${w2.id}...`);

      await new Promise(r => setTimeout(r, 1200));
      if (!isMounted) return;

      const trueHash = generateHash();
      const isConflict = simulateRef.current;
      if (isConflict) simulateRef.current = false; // Reset trigger
      
      const hash1 = trueHash;
      const hash2 = isConflict ? generateHash() : trueHash;
      const match = hash1 === hash2;

      // Update Pipeline Result
      setPipeline(prev => prev.map(p => p.id === chunkId ? {
        ...p,
        status: match ? 'VERIFIED' : 'CONFLICT',
        hash1, hash2
      } : p));

      if (match) {
        addLog(`Match verified for ${chunkId}. Results secured.`, 'success');
        setMetrics(m => ({ ...m, verified: m.verified + 1 }));
        
        // Increase trust
        setWorkers(prev => prev.map(w => {
          if ((w.id === w1.id || w.id === w2.id) && w.trust < 100) {
            return { ...w, trust: Math.min(100, w.trust + 1) };
          }
          return w;
        }));
      } else {
        addLog(`CONFLICT in ${chunkId}! Mismatch between ${w1.id} & ${w2.id}.`, 'warning');
        
        const newConflicts = metricsRef.current.conflicts + 1;
        setMetrics(m => ({ ...m, conflicts: newConflicts }));
        
        // Penalize w2 (the simulated bad actor)
        setWorkers(prev => {
           const nextW = [...prev];
           const badIdx = nextW.findIndex(w => w.id === w2.id);
           if (badIdx > -1) {
             const newTrust = Math.max(0, nextW[badIdx].trust - 25);
             const newStatus = newTrust < 60 ? 'Blocked' : 'Active';
             nextW[badIdx] = { ...nextW[badIdx], trust: newTrust, status: newStatus };
             
             if (newStatus === 'Blocked') {
               addLog(`Worker ${w2.id} maximum threshold breached. BLOCKED.`, 'error');
             } else {
               addLog(`Worker ${w2.id} penalized. Trust dropped to ${newTrust}%.`, 'warning');
             }
           }
           return nextW;
        });
      }

      timeoutId = setTimeout(runCycle, 2000);
    };

    runCycle();
    
    return () => { isMounted = false; clearTimeout(timeoutId); };
  }, []); // Run ONCE on mount


  const handleSimulateAttack = () => {
    simulateRef.current = true;
    if (!graphVisible) setGraphVisible(true);
  };

  return (
    <div className="section-content fade-in verification-clean-layout">
      
      <div className="verification-header">
        <h2 className="section-title">Cryptographic Verification</h2>
        <button 
           className="btn-danger mono-text"
           onClick={handleSimulateAttack}
        >
          Simulate Wrong Result
        </button>
      </div>

      <div className="kpi-row">
        <KpiCard title="Verified Chunks" value={metrics.verified} icon={ShieldCheck} colorClass="neon-cyan-text" />
        <KpiCard title="Conflicts Detected" value={metrics.conflicts} icon={Crosshair} colorClass="neon-amber-text" />
        <KpiCard title="Active Workers" value={`${activeWorkersCount} / ${workers.length}`} icon={Cpu} colorClass="neon-purple-text" />
      </div>

      <div className="verification-middle-grid">
        {/* Worker Trust Table */}
        <div className="glass-panel d-flex flex-col">
          <div className="panel-header-small">
            <ShieldAlert size={16} className="neon-green-text"/>
            <span>Worker Trust Ledger</span>
          </div>
          <div className="table-scroll-wrapper custom-scrollbar">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>NODE ID</th>
                  <th>TRUST SCORE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w, i) => (
                  <tr key={i} className={w.status === 'Blocked' ? 'row-blocked' : ''}>
                    <td className="mono-text fw-bold">{w.id}</td>
                    <td>
                      <div className="trust-bar-container">
                         <div className={`trust-bar-fill ${w.trust < 60 ? 'bg-red' : w.trust < 80 ? 'bg-amber' : 'bg-green'}`} style={{width: `${w.trust}%`}}></div>
                      </div>
                      <span className="mono-text ml-2">{w.trust}%</span>
                    </td>
                    <td>
                      <span className={`status-pill ${w.status.toLowerCase()}`}>{w.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Verification Pipeline */}
        <div className="glass-panel d-flex flex-col">
          <div className="panel-header-small">
            <Cpu size={16} className="neon-cyan-text"/>
            <span>Live Verification Pipeline</span>
          </div>
          <div className="pipeline-list">
             {pipeline.map((item) => (
                <div key={item.id} className="pipeline-item fade-in">
                   <div className="pl-header">
                      <span className="mono-text pl-id">{item.id}</span>
                      <span className={`status-pill ${item.status.toLowerCase()}`}>{item.status}</span>
                   </div>
                   <div className="pl-body">
                      <div className="pl-worker">
                         <span className="text-muted">{item.w1}</span>
                         <span className="mono-text text-small">{item.hash1}</span>
                      </div>
                      <div className="pl-worker">
                         <span className="text-muted">{item.w2}</span>
                         <span className={`mono-text text-small ${item.status === 'CONFLICT' ? 'neon-red-text fw-bold blink' : ''}`}>{item.hash2}</span>
                      </div>
                   </div>
                </div>
             ))}
             {pipeline.length === 0 && <div className="text-muted text-center p-4">Awaiting network chunks...</div>}
          </div>
        </div>
      </div>

      {/* Terminal Logs & Malicious Graph Toggle Wrapper */}
      <div className={`verification-bottom-container ${graphVisible ? 'expanded' : ''}`}>
        
        {/* Terminal Logs */}
        <div className="glass-panel terminal-panel">
           <div className="terminal-header-small">
              <TerminalIcon size={14} className="neon-amber-text" /> 
              <span className="mono-text">verification_events_log</span>
            </div>
            <div className="terminal-body-small mono-text" ref={logsRef}>
               {logs.length === 0 && <div className="log-line text-muted">Listening for network verifications...</div>}
               {logs.map((log, i) => (
                 <div key={i} className={`log-line type-in log-${log.type}`}>
                   <span className="log-time">[{log.time}]</span> {log.text}
                 </div>
               ))}
            </div>
        </div>

        {/* Dynamic Malicious Activity Network Diagram */}
        {graphVisible && (
          <div className="glass-panel d-flex flex-col graph-panel fade-in" style={{padding: '0'}}>
             <div className="panel-header-small" style={{padding: '16px', marginBottom: '0'}}>
               <Activity size={16} className="neon-cyan-text"/>
               <span>Consensus Threat Detection Logic</span>
             </div>
             <StaticSecurityNetwork />
          </div>
        )}

      </div>
    </div>
  );
}
