import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Users, Server, Activity, Trophy, ArrowUpRight, ArrowDownRight, Minus, CheckCircle, ShieldAlert, Cpu, Network } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import './CommunityDashboard.css';

const formatTime = (d = new Date()) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

const generateInitialChartData = () => {
  const data = [];
  let currentOps = 150000;
  const now = new Date();
  for (let i = 20; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 1000);
    currentOps += Math.floor(Math.random() * 20000) - 10000;
    data.push({ time: formatTime(d), ops: Math.max(80000, currentOps) });
  }
  return data;
};

// Simulated Backend Engine
const useGridSimulation = () => {
  const [data, setData] = useState({
     throughput: 150000,
     chartData: generateInitialChartData(),
     stats: { avg: 150000, peak: 150000, min: 150000 },
     workers: Array.from({length: 45}).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const radius = 35 + Math.random() * 55; // Keeps within 100px Y bounds
        const cx = 200 + Math.cos(angle) * (radius * 1.8); // Stretched horizontally to fit 400px width
        const cy = 100 + Math.sin(angle) * radius;
        return { 
           id: `W-${100+i}`, 
           state: Math.random() > 0.65 ? 'busy' : 'idle', 
           cx, cy, 
           size: Math.random() * 2 + 2 
        };
     }),
     tasks: Array.from({length: 4}).map((_,i) => ({ id: `TSK-${Math.floor(Math.random()*1000)}`, worker: `W-${100+i}`, progress: Math.floor(Math.random()*100) })),
     contributors: [
       { id: '0x7F2A...9C1B', tasks: 41200, score: 99.2, rank: 1, trend: 'up' },
       { id: '0x3B88...4D22', tasks: 38450, score: 98.7, rank: 2, trend: 'same' },
       { id: '0x9C11...F8A1', tasks: 37100, score: 99.9, rank: 3, trend: 'up' },
       { id: '0x1A44...B2E9', tasks: 35000, score: 95.4, rank: 4, trend: 'down' },
       { id: '0x5D33...C771', tasks: 31200, score: 97.1, rank: 5, trend: 'same' }
     ],
     health: { success: 98.16, conflicts: 12, latency: 42, donors: 4821 }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        // Throughput Math
        const nextOps = prev.throughput + (Math.random() * 30000 - 14000); // Trend slightly upwards or flat
        const boundedOps = Math.max(50000, nextOps);
        
        const nextChart = [...prev.chartData.slice(1), { time: formatTime(), ops: boundedOps }];
        const avg = nextChart.reduce((a, b) => a + b.ops, 0) / nextChart.length;
        const peak = Math.max(...nextChart.map(d => d.ops));
        const min = Math.min(...nextChart.map(d => d.ops));

        // Tasks math
        const nextTasks = prev.tasks.map(t => {
           if (t.progress >= 100) return { id: `TSK-${Math.floor(Math.random()*10000)}`, worker: `W-${100 + Math.floor(Math.random()*8)}`, progress: 0 };
           return { ...t, progress: t.progress + Math.floor(Math.random()*30) };
        });

        // Workers animation state flutter
        const nextWorkers = prev.workers.map(w => ({
           ...w,
           state: Math.random() > 0.1 ? w.state : (w.state === 'busy' ? 'idle' : 'busy')
        }));

        // Contributor Rank Flutter (10% chance top 2 swap)
        let nextContribs = [...prev.contributors];
        if (Math.random() > 0.85) {
           const temp = nextContribs[0];
           nextContribs[0] = { ...nextContribs[1], rank: 1, trend: 'up' };
           nextContribs[1] = { ...temp, rank: 2, trend: 'down' };
        }
        // Increment their tasks visually
        nextContribs = nextContribs.map(c => ({...c, tasks: c.tasks + Math.floor(Math.random()*50)}));

        return {
           ...prev,
           throughput: boundedOps,
           chartData: nextChart,
           stats: { avg, peak, min },
           tasks: nextTasks,
           workers: nextWorkers,
           contributors: nextContribs,
           health: { 
              success: Math.min(99.99, prev.health.success + (Math.random()*0.02 - 0.01)),
              conflicts: prev.health.conflicts + (Math.random() > 0.95 ? 1 : 0),
              latency: Math.max(20, prev.health.latency + Math.floor(Math.random()*10 - 5)),
              donors: prev.health.donors + Math.floor(Math.random() * 7 - 3) // Fluctuates +/- 3
           }
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return data;
};

// Subcomponents
const KpiCard = ({ title, value, unit, icon: Icon, colorClass, subtitle }) => (
   <div className="glass-panel kpi-mini-card">
     <div className={`kpi-icon-pill ${colorClass}-bg`}>
        <Icon size={16} className={colorClass} />
     </div>
     <div className="kpi-content">
        <span className="kpi-mini-title text-muted">{title}</span>
        <div className="kpi-mini-value mono-text">
           {value} <span className="kpi-mini-unit">{unit}</span>
        </div>
        {subtitle && <span className="kpi-mini-subtitle">{subtitle}</span>}
     </div>
   </div>
);

const TrendIcon = ({ trend }) => {
   if (trend === 'up') return <ArrowUpRight size={14} className="neon-green-text" />;
   if (trend === 'down') return <ArrowDownRight size={14} className="neon-red-text" />;
   return <Minus size={14} className="text-muted" />;
};

export default function CommunityDashboard() {
  const sim = useGridSimulation();

  const activeCount = sim.workers.filter(w => w.state === 'busy').length;
  const idleCount = sim.workers.filter(w => w.state === 'idle').length;

  return (
    <div className="section-content fade-in community-layout">
      
      {/* Top Universal KPIs */}
      <div className="kpi-strip">
         <KpiCard title="Network Health" value={sim.health.success.toFixed(2)} unit="%" icon={ShieldAlert} colorClass="neon-green-text" subtitle={`${sim.health.conflicts} intercepted conflicts`} />
         <KpiCard title="Average Latency" value={sim.health.latency} unit="ms" icon={Activity} colorClass="neon-cyan-text" subtitle="Global node routing delay" />
         <KpiCard title="Active Donors" value={sim.health.donors.toLocaleString()} icon={Users} colorClass="neon-purple-text" subtitle="Contributing compute resources" />
      </div>

      <div className="dashboard-grid">
         
         {/* Top Left: Network Pulse */}
         <div className="glass-panel d-flex flex-col">
            <div className="panel-header-small border-dashed">
               <Network size={16} className="neon-cyan-text"/>
               <span>Live Node Topology</span>
               <div className="flex-spacer"></div>
               <span className="badge-outline busy"><span className="dot"></span>{activeCount} Busy</span>
               <span className="badge-outline idle" style={{marginLeft: '8px'}}><span className="dot"></span>{idleCount} Idle</span>
            </div>
            <div className="svg-network-container">
               <svg viewBox="0 0 400 200" className="topology-svg">
                  <defs>
                     <filter id="glow-node" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                     </filter>
                  </defs>
                  
                  {/* Constellation Mesh (Background interconnectedness) */}
                  {sim.workers.map((w, i) => {
                     if (i > 0 && i % 4 === 0) {
                        return <line key={`mesh-${i}`} x1={w.cx} y1={w.cy} x2={sim.workers[i-1].cx} y2={sim.workers[i-1].cy} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                     }
                     if (i > 2 && i % 7 === 0) {
                        return <line key={`mesh-cross-${i}`} x1={w.cx} y1={w.cy} x2={sim.workers[i-3].cx} y2={sim.workers[i-3].cy} stroke="rgba(0,242,255,0.05)" strokeWidth="0.5" strokeDasharray="2 2" />
                     }
                     return null;
                  })}
                  
                  {/* Coordinator & Orbital Rings */}
                  <circle cx="200" cy="100" r="14" className="coord-node" filter="url(#glow-node)" />
                  <circle cx="200" cy="100" r="32" className="coord-ring" />
                  <circle cx="200" cy="100" r="60" className="coord-ring" style={{animationDuration: '20s', animationDirection: 'reverse', opacity: 0.2, stroke: 'var(--neon-purple)'}} />
                  <circle cx="200" cy="100" r="95" className="coord-ring" style={{animationDuration: '30s', opacity: 0.05, strokeDasharray: '2 8'}} />
                  
                  {/* Workers and connections */}
                  {sim.workers.map((w, i) => (
                     <g key={i}>
                        {/* Dynamic Path */}
                        <path 
                           d={`M ${w.cx} ${w.cy} Q 200 ${w.cy} 200 100`} 
                           className={`topology-line ${w.state}`} 
                           style={{ opacity: w.state === 'busy' ? 0.7 : 0.15, strokeWidth: w.state === 'busy' ? 1.5 : 1 }}
                        />
                        {/* Moving packet if busy */}
                        {w.state === 'busy' && (
                           <circle r="1.5" className="packet">
                              <animateMotion dur={`${1 + (i % 2 === 0 ? 0.8 : 0.4)}s`} repeatCount="indefinite" path={`M ${w.cx} ${w.cy} Q 200 ${w.cy} 200 100`} />
                           </circle>
                        )}
                        {/* Node */}
                        <circle cx={w.cx} cy={w.cy} r={w.size} className={`worker-node ${w.state}`} filter="url(#glow-node)" />
                     </g>
                  ))}
               </svg>
            </div>
         </div>

         {/* Top Right: Throughput Chart */}
         <div className="glass-panel d-flex flex-col">
            <div className="panel-header-small border-dashed">
               <Activity size={16} className="neon-purple-text"/>
               <span>Global Network Throughput</span>
            </div>
            
            <div className="throughput-stats">
               <div className="t-stat">
                  <span className="t-lbl">CURRENT</span>
                  <span className="t-val neon-purple-text">{(sim.throughput / 1000).toFixed(1)}k</span>
               </div>
               <div className="t-stat">
                  <span className="t-lbl">AVERAGE</span>
                  <span className="t-val text-muted">{(sim.stats.avg / 1000).toFixed(1)}k</span>
               </div>
               <div className="t-stat">
                  <span className="t-lbl">PEAK</span>
                  <span className="t-val text-main">{(sim.stats.peak / 1000).toFixed(1)}k</span>
               </div>
            </div>

            <div className="chart-wrapper-full" style={{flex: 1, minHeight: '180px', marginTop: '10px'}}>
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sim.chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                     <defs>
                        <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="var(--neon-purple)" stopOpacity={0.6}/>
                           <stop offset="95%" stopColor="var(--neon-purple)" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                     <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                     <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                     <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(5,5,5,0.9)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                        itemStyle={{ color: 'var(--neon-purple)', fontWeight: 'bold' }}
                     />
                     <Area type="monotone" dataKey="ops" stroke="var(--neon-purple)" strokeWidth={3} fillOpacity={1} fill="url(#colorThroughput)" isAnimationActive={false} />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Bottom Left: Live Task Distribution */}
         <div className="glass-panel d-flex flex-col">
            <div className="panel-header-small border-dashed">
               <Server size={16} className="neon-amber-text"/>
               <span>Live Task Distribution Queue</span>
            </div>
            <div className="task-queue-wrapper custom-scrollbar">
               {sim.tasks.map(t => (
                  <div key={t.id} className="task-queue-item fade-in">
                     <div className="tq-header">
                        <span className="mono-text fw-bold">{t.id}</span>
                        <span className="mono-text text-small text-muted">{t.worker}</span>
                     </div>
                     <div className="tq-progress-bg">
                        <div className="tq-progress-fill bg-amber" style={{width: `${t.progress}%`}}></div>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* Bottom Right: Top Contributors */}
         <div className="glass-panel d-flex flex-col">
            <div className="panel-header-small border-dashed">
               <Trophy size={16} className="neon-cyan-text"/>
               <span>Top Tier Contributors</span>
            </div>
            <div className="ranking-list custom-scrollbar">
               {sim.contributors.map((user) => (
                  <div key={user.id} className="ranking-row">
                     <div className={`rank-badge mono-text ${user.rank <= 3 ? 'top-3' : ''}`}>
                        #{user.rank}
                     </div>
                     <div className="rank-info">
                        <div className="rank-header">
                           <span className="mono-text fw-bold text-main">{user.id}</span>
                           <div className="d-flex align-center gap-2">
                              <span className="mono-text text-small">{user.tasks.toLocaleString()} TSK</span>
                              <TrendIcon trend={user.trend} />
                           </div>
                        </div>
                        <div className="contribution-bar-bg">
                           <div className={`contribution-bar-fill ${user.score > 98 ? 'bg-green' : 'bg-cyan'}`} style={{width: `${user.score}%`}}></div>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>

      </div>
    </div>
  );
}
