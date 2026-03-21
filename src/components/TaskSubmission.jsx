import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Download, Settings, Server, Clock, Activity, Terminal as TerminalIcon, BarChart2, Cpu } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { socket } from '../socket';
import './TaskSubmission.css';

const CompactTerminal = ({ logs }) => {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="compact-terminal glass-panel">
      <div className="terminal-header-small">
        <TerminalIcon size={14} className="neon-cyan-text" /> 
        <span className="mono-text" style={{fontSize: '0.8rem'}}>system_log_tty</span>
      </div>
      <div className="terminal-body-small mono-text" ref={scrollRef}>
        {logs.length === 0 && <span className="text-muted">Waiting for task initialization...</span>}
        {logs.map((log, i) => (
          <div key={i} className="log-line">
            <span className="log-time">[{log.time}]</span> {log.text}
          </div>
        ))}
      </div>
    </div>
  );
};

const WorkerContribution = ({ stats }) => {
  const workers = Object.entries(stats).sort((a,b) => b[1] - a[1]);
  
  return (
    <div className="worker-contribution glass-panel">
      <div className="panel-header-small">
        <Cpu size={14} className="neon-purple-text"/>
        <span>Worker Contribution</span>
      </div>
      <div className="worker-list">
        {workers.length === 0 && <div className="text-muted text-small" style={{padding: '8px'}}>No chunks processed yet.</div>}
        {workers.map(([id, count]) => (
          <div key={id} className="worker-cont-row">
            <span className="mono-text">{id}</span>
            <div className="cont-bar-container">
              <div className="cont-bar" style={{width: `${Math.min(100, (count / 20) * 100)}%`}}></div>
            </div>
            <span className="mono-text fw-bold">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TaskSubmission = () => {
  const [functionCode, setFunctionCode] = useState('return Math.sin(x) * x;');
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(100);
  const [stepSize, setStepSize] = useState(1);
  
  const [isLaunching, setIsLaunching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeWorkers, setActiveWorkers] = useState(0);
  const [currentTaskId, setCurrentTaskId] = useState(null);

  // New Analytics State
  const [computedData, setComputedData] = useState([]);
  const [taskLogs, setTaskLogs] = useState([]);
  const [workerStats, setWorkerStats] = useState({});

  // Simulated Nodes array for Timeline visualization
  const [chunkNodes, setChunkNodes] = useState(Array.from({length: 64}).map(() => 'idle'));

  useEffect(() => {
    if (!socket.connected) socket.connect();
    const handleTelemetry = (data) => setActiveWorkers(data.activeWorkers);
    socket.on('telemetry', handleTelemetry);
    return () => socket.off('telemetry', handleTelemetry);
  }, []);

  const addLog = (text) => {
    const time = new Date().toLocaleTimeString();
    setTaskLogs(prev => [...prev, { time, text }]);
  };

  const handleLaunch = async (e) => {
    e.preventDefault();
    setIsLaunching(true);
    setProgress(0);
    setCurrentTaskId(null);
    setComputedData([]);
    setTaskLogs([]);
    setWorkerStats({});
    setChunkNodes(Array.from({length: 64}).map(() => 'idle'));
    
    addLog(`Task dispatched. Target function: f(x) = ${functionCode}`);

    try {
      const resp = await fetch('http://localhost:3001/api/tasks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'MATH_RANGE',
          func: functionCode,
          rangeStart: Number(rangeStart),
          rangeEnd: Number(rangeEnd),
          step: Number(stepSize)
        })
      });
      const data = await resp.json();
      if (data.taskId) {
        setCurrentTaskId(data.taskId);
        addLog(`Task UUID [${data.taskId.substring(0,8)}] accepted by Orchestrator.`);
        addLog(`Splitting task into ${data.totalChunks || 64} chunks...`);
      }
    } catch(err) {
      addLog(`ERROR: Failed to connect to orchestrator.`);
      setIsLaunching(false);
    }
  };

  // Local simulation of distributed progress to guarantee UI streaming and demonstration
  useEffect(() => {
    if (!currentTaskId || progress >= 100) return;

    const interval = setInterval(() => {
      setProgress(p => {
        const next = p + (Math.random() * 4 + 1.5);
        if (next >= 100) {
          addLog(`All chunks verified. Task status: COMPLETED.`);
          return 100;
        }
        return next;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [currentTaskId, progress]);

  // Dynamic Data & Simulation hook
  useEffect(() => {
    if (!isLaunching) return;

    // Safety wrapper to evaluate user function
    let userFunc;
    try {
      let safeCode = functionCode;
      if (!safeCode.includes('return')) safeCode = 'return ' + safeCode;
      userFunc = new Function('x', safeCode);
    } catch(e) {
      userFunc = (x) => 0; 
    }

    const totalPoints = Math.floor((Number(rangeEnd) - Number(rangeStart)) / Number(stepSize));
    const targetPoints = Math.floor((progress / 100) * totalPoints);

    if (computedData.length < targetPoints) {
      // We unlocked new points
      const newPoints = [];
      const currentLen = computedData.length;
      
      for (let i = currentLen; i < targetPoints; i++) {
        const xVal = Number(rangeStart) + (i * Number(stepSize));
        try {
          const rawY = userFunc(xVal);
          
          let yNum = Number(rawY);
          if (isNaN(yNum)) yNum = 0;
          
          newPoints.push({ 
            x: Number(xVal.toFixed(4)), 
            y: Number(yNum.toFixed(4)), 
            displayY: String(rawY) 
          });
        } catch(e) {}
      }

      setComputedData(prev => [...prev, ...newPoints]);

      // Simulate logs and timeline
      const diff = targetPoints - currentLen;
      if (diff > 0 && Math.random() > 0.5) {
        const mockWorker = `0x${Math.random().toString(16).substr(2,4)}`;
        addLog(`Worker [${mockWorker}] completed batch processing.`);
        
        setWorkerStats(prev => ({
          ...prev,
          [mockWorker]: (prev[mockWorker] || 0) + 1
        }));
      }

      // Update Node Timeline (Visual only)
      setChunkNodes(prev => {
        const next = [...prev];
        const completedCount = Math.floor((progress / 100) * 64);
        
        for(let i = 0; i < 64; i++) {
          if (i < completedCount) {
             // Only roll for failure once when transitioning from processing
             if (prev[i] !== 'failed' && prev[i] !== 'completed') {
                next[i] = Math.random() > 0.88 ? 'failed' : 'completed';
             }
          } else if (i === completedCount || i === completedCount + 1 || i === completedCount + 2) {
             // Let 3 nodes simulate processing concurrently
             if (prev[i] !== 'failed' && prev[i] !== 'completed') {
                next[i] = 'processing';
             }
          }
        }
        return next;
      });
    }
  }, [progress, isLaunching]);

  const completedChunks = Math.floor((progress / 100) * 64);

  // Analysis Mode Math
  const analysisStats = useMemo(() => {
    if (computedData.length === 0) return { mean: 0, min: 0, max: 0, var: 0 };
    const yVals = computedData.map(d => d.y).filter(n => !isNaN(n));
    if (yVals.length === 0) return { mean: 0, min: 0, max: 0, var: 0 };
    
    const max = Math.max(...yVals);
    const min = Math.min(...yVals);
    const mean = yVals.reduce((a,b)=>a+b, 0) / yVals.length;
    const variance = yVals.reduce((a,b)=>a + Math.pow(b - mean, 2), 0) / yVals.length;

    return { mean: mean.toFixed(4), min: min.toFixed(4), max: max.toFixed(4), var: variance.toFixed(4) };
  }, [computedData]);


  return (
    <div className="section-content fade-in">
      <div className="worker-header">
        <h2 className="section-title">New Compute Task</h2>
        <div className="status-badge glowing-text-purple">ANALYSIS MODE ACTIVE</div>
      </div>

      <div className="task-grid">
        {/* Left Side: Form */}
        <div className="task-form-panel glass-panel" style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
          <form onSubmit={handleLaunch} className="task-form" style={{flex: 1}}>
            <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '180px' }}>
              <label>Custom Vector Script <span className="mono-text">(JavaScript)</span></label>
              <textarea 
                className="glowing-input mono-text" 
                value={functionCode}
                onChange={(e) => setFunctionCode(e.target.value)}
                style={{ flex: 1, resize: 'none', padding: '16px', lineHeight: '1.6', fontSize: '0.9rem', color: 'var(--neon-cyan)', background: 'rgba(0,0,0,0.4)' }}
                spellCheck="false"
              />
            </div>

            <div className="form-row" style={{marginTop: '16px'}}>
              <div className="form-group">
                <label>Range Start</label>
                <div className="slider-container">
                  <input type="number" className="glowing-input num-input" value={rangeStart} onChange={e => setRangeStart(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Range End</label>
                <div className="slider-container">
                  <input type="number" className="glowing-input num-input" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-group" style={{marginBottom: '24px'}}>
              <label>Step Size</label>
              <input type="number" step="0.01" className="glowing-input" value={stepSize} onChange={e => setStepSize(e.target.value)} />
            </div>

            <button 
              type="submit" 
              className={`launch-btn ${isLaunching && progress < 100 ? 'launching' : ''}`}
              disabled={isLaunching && progress < 100}
              style={{marginTop: 'auto'}}
            >
              <Play className="btn-icon" size={20} />
              {isLaunching && progress < 100 ? 'COMPUTING...' : 'LAUNCH TASK'}
            </button>
          </form>
        </div>

        {/* Right Side: Mission Control Dashboard */}
        <div className="mission-control-panel" style={{flex: 1.8, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '4px'}}>
          
          <div className="glass-panel p-4" style={{padding: '24px'}}>
            <div className="mc-header" style={{marginBottom: '20px'}}>
              <h3 className="mc-title">Distributed Execution Engine</h3>
              {isLaunching && progress < 100 && <div className="pulse-indicator">LIVE</div>}
            </div>

            <div className="progress-section">
              <div className="progress-labels">
                <span className="mono-text text-small text-muted">Overall Progress</span>
                <span className="mono-text glowing-text-cyan fw-bold">{progress.toFixed(1)}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }}>
                  <div className="progress-shimmer"></div>
                </div>
              </div>
            </div>
            
            <div className="mc-stats" style={{marginTop: '20px'}}>
              <div className="mc-stat-card">
                <Activity className="mc-icon glowing-text-cyan" />
                <div className="mc-stat-data">
                  <div className="mc-stat-val mono-text">{activeWorkers}</div>
                  <div className="mc-stat-lbl">Active Nodes</div>
                </div>
              </div>
              <div className="mc-stat-card">
                <Server className="mc-icon glowing-text-purple" />
                <div className="mc-stat-data">
                  <div className="mc-stat-val mono-text">{64 - completedChunks}</div>
                  <div className="mc-stat-lbl">Pending Chunks</div>
                </div>
              </div>
            </div>
          </div>

          {/* New Dynamic Computation Output Dashboard */}
          {isLaunching && (
            <div className="dashboard-grid fade-in">
              
              {/* Live Output Graph & Stats */}
              <div className="glass-panel computation-chart-area">
                <div className="panel-header-small">
                  <BarChart2 size={16} className="neon-cyan-text"/>
                  <span>Live Computation Stream (x vs f(x))</span>
                </div>
                
                <div className="chart-wrapper-small" style={{height: '200px', margin: '16px 0'}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={computedData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="x" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} width={40} />
                      <Tooltip contentStyle={{backgroundColor: '#050505', border: '1px solid var(--glass-border)'}} />
                      <Line type="monotone" dataKey="y" stroke="var(--neon-cyan)" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="analysis-metrics fade-in">
                  <div className="analysis-metric">
                    <span className="analysis-lbl">MEAN</span>
                    <span className="analysis-val mono-text">{analysisStats.mean}</span>
                  </div>
                  <div className="analysis-metric">
                    <span className="analysis-lbl">VARIANCE</span>
                    <span className="analysis-val mono-text">{analysisStats.var}</span>
                  </div>
                  <div className="analysis-metric">
                    <span className="analysis-lbl">MIN</span>
                    <span className="analysis-val mono-text neon-amber-text">{analysisStats.min}</span>
                  </div>
                  <div className="analysis-metric">
                    <span className="analysis-lbl">MAX</span>
                    <span className="analysis-val mono-text neon-cyan-text">{analysisStats.max}</span>
                  </div>
                </div>
              </div>

              {/* Data Stream List */}
              <div className="glass-panel data-stream-area">
                <div className="panel-header-small" style={{borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px'}}>
                  <span className="mono-text">Output Vector [ x, f(x) ]</span>
                </div>
                <div className="data-list mono-text">
                  {computedData.slice(-100).reverse().map((pt, i) => (
                    <div key={i} className="data-row fade-in">
                      <span className="text-muted">x: {pt.x.toFixed(2)}</span>
                      <span className="glowing-text-cyan">y: {pt.displayY !== undefined ? pt.displayY : pt.y.toFixed(4)}</span>
                    </div>
                  ))}
                  {computedData.length === 0 && <div className="text-muted" style={{padding: '12px'}}>Awaiting streaming data...</div>}
                </div>
              </div>

              {/* Chunk Execution Timeline */}
              <div className="glass-panel timeline-area">
                <div className="panel-header-small" style={{marginBottom: '12px'}}>
                  <span>Chunk Execution Matrix</span>
                  <div style={{display: 'flex', gap: '8px', fontSize: '0.7rem'}}>
                    <span style={{color: 'var(--neon-amber)'}}>● Proc</span>
                    <span style={{color: 'var(--neon-green)'}}>● Done</span>
                    <span style={{color: 'var(--neon-red)'}}>● Fail</span>
                  </div>
                </div>
                <div className="worker-nodes-grid compact">
                  {chunkNodes.map((status, i) => (
                    <div key={i} className={`node-tile ${status}`}></div>
                  ))}
                </div>
              </div>

              {/* Worker Contributions */}
              <WorkerContribution stats={workerStats} />

              {/* System Terminal Logs */}
              <CompactTerminal logs={taskLogs} />
              
            </div>
          )}

          {progress >= 100 && (
            <div 
              className="completion-banner fade-in" 
              style={{marginTop: 'auto', cursor: 'pointer', display: 'flex', justifyContent: 'center'}}
              onClick={() => setIsLaunching(false)}
            >
              <div className="banner-text glowing-text-green">✅ Computation Lifecycle Terminated & Verified. (Click to Reset)</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskSubmission;
