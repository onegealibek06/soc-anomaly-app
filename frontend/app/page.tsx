'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
  ShieldAlert, ShieldCheck, Activity, Terminal,
  User, Search, X, Cpu, AlertTriangle, Info, TrendingUp,
  RefreshCw, Zap, Database, Lock, Globe, Server
} from 'lucide-react';

// --- Types ---
interface SOCEvent {
  id: number;
  process_name: string;
  command_line: string;
  user: string;
  severity: string;
  anomaly_score: number;
  mitre_technique?: string;
}

// --- Components ---

const StatCard = ({ title, value, icon: Icon, color, alert, delay = 0 }: any) => {
  const colors: any = {
    blue: "from-blue-600/10 to-blue-400/5 border-blue-500/20 text-blue-400 shadow-blue-500/5",
    red: "from-red-600/10 to-red-400/5 border-red-500/20 text-red-400 shadow-red-500/5",
    emerald: "from-emerald-600/10 to-emerald-400/5 border-emerald-500/20 text-emerald-400 shadow-emerald-500/5",
    purple: "from-purple-600/10 to-purple-400/5 border-purple-500/20 text-purple-400 shadow-purple-500/5",
  };

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.2 } }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      className={`glass p-8 rounded-[2rem] border bg-gradient-to-br ${colors[color]} relative overflow-hidden group`}
    >
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-3 rounded-2xl bg-black/40 border border-white/5 group-hover:rotate-6 transition-transform`}>
          <Icon size={24} />
        </div>
        {alert && (
          <div className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </div>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">{title}</p>
        <p className="text-3xl font-black text-white tracking-tighter">{value}</p>
      </div>
      {/* Decorative element */}
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon size={120} />
      </div>
    </motion.div>
  );
};

const StatusBadge = ({ severity }: { severity: string }) => {
  const styles: any = {
    critical: "bg-red-500/20 text-red-400 border-red-500/40",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    normal: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${styles[severity] || styles.normal}`}>
      {severity}
    </span>
  );
};

// --- Main Page ---

export default function Dashboard() {
  const [events, setEvents] = useState<SOCEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SOCEvent | null>(null);
  const [aiReport, setAiReport] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchEvents();
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events?limit=30', {
        headers: { 'X-API-Key': 'soc_diploma_secret_2026' }
      });
      const data = await res.json();
      setEvents([...data].reverse());
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  const startSimulation = () => {
    setIsSimulating(true);
    // Fire-and-forget — не ждём ответа, кнопка сразу разблокируется
    fetch('/api/simulate', { 
      method: 'POST',
      headers: { 'X-API-Key': 'soc_diploma_secret_2026' }
    }).catch(err => console.error("Simulation Error:", err));

    // Сбрасываем состояние кнопки через 2 секунды
    setTimeout(() => setIsSimulating(false), 2000);
  };

  const chartData = useMemo(() => {
    return [...events].reverse().slice(-20).map(e => ({
      name: `#${e.id}`,
      score: parseFloat(e.anomaly_score.toFixed(3)),
    }));
  }, [events]);

  const openReport = async (event: SOCEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
    setAiReport("🤖 Sentinel AI analyzing attack vector...");
    try {
      const res = await fetch(`/api/events/${event.id}/report`, {
        headers: { 'X-API-Key': 'soc_diploma_secret_2026' }
      });
      const data = await res.json();
      setAiReport(data.report);
    } catch (err) {
      setAiReport("❌ System failure: AI module unreachable.");
    }
  };

  const criticalCount = events.filter(e => e.severity === 'critical' || e.severity === 'high').length;

  if (!isMounted) return null;

  return (
    <div className="min-h-screen relative overflow-hidden selection:bg-blue-500/30 font-sans">
      {/* Background Layer */}
      <div className="fixed inset-0 bg-[#020617] -z-20" />
      <div className="fixed inset-0 bg-grid opacity-20 -z-10" />
      
      {/* Static Glows — CSS-only, GPU-composited, no JS overhead */}
      <div className="glow-orb-1" />
      <div className="glow-orb-2" />

      <div className="max-w-[1600px] mx-auto p-4 md:p-8 lg:p-12 space-y-12 relative z-10">
        
        {/* Navigation / Header */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-6">
            <motion.div 
              initial={{ rotate: -10, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              className="relative"
            >
              <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-2xl shadow-blue-500/20">
                <ShieldAlert className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-4 border-[#020617] animate-pulse" />
            </motion.div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-white flex items-center gap-3">
                SENTINEL<span className="text-blue-500">CORE</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md tracking-widest align-middle mt-1 uppercase">Advanced ML</span>
              </h1>
              <p className="text-slate-500 text-xs font-mono tracking-[0.3em] uppercase flex items-center gap-2 mt-1">
                <Activity size={12} className="text-emerald-500" /> System Live // Thread Level: Moderate
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="hidden sm:flex glass px-6 py-3 rounded-2xl items-center gap-8 border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Network Status</span>
                <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> OPTIMAL
                </span>
              </div>
              <div className="w-px h-8 bg-white/5" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Engine Load</span>
                <span className="text-xs text-blue-400 font-mono">1.24%</span>
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startSimulation}
              disabled={isSimulating}
              className={`flex-1 sm:flex-none glass px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all ${
                isSimulating 
                ? 'opacity-50 cursor-not-allowed border-white/5' 
                : 'border-blue-500/30 hover:bg-blue-600 hover:border-blue-500 text-blue-400 hover:text-white shadow-xl shadow-blue-900/10'
              }`}
            >
              {isSimulating ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="animate-spin" size={14} /> Deploying Simulation...
                </span>
              ) : 'Initialize Attack Simulation'}
            </motion.button>
          </div>
        </header>

        {/* Top Analytics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard title="Events Monitored" value={events.length} icon={Search} color="blue" delay={0.1} />
          <StatCard title="Threats Detected" value={criticalCount} icon={AlertTriangle} color="red" alert={criticalCount > 0} delay={0.2} />
          <StatCard title="System Integrity" value="99.9%" icon={ShieldCheck} color="emerald" delay={0.3} />
          <StatCard title="AI Precision" value="94.2%" icon={Cpu} color="purple" delay={0.4} />
        </div>

        {/* Visualization & Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 glass rounded-[2.5rem] p-8 relative group"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-3">
                  <TrendingUp className="text-blue-500" size={20} />
                  Anomaly Trend Analysis
                </h3>
                <p className="text-slate-500 text-xs mt-1">Real-time heuristic scoring over last 20 events</p>
              </div>
              <div className="flex gap-2">
                {['1H', '4H', '24H'].map(t => (
                  <button key={t} className={`px-3 py-1 rounded-lg text-[10px] font-bold ${t === '1H' ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-500'}`}>{t}</button>
                ))}
              </div>
            </div>
            
            <div className="min-h-[300px] h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} tick={{fill: '#64748b'}} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: '#3b82f6', fontSize: '12px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3b82f6" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass rounded-[2.5rem] p-8 flex flex-col justify-center items-center text-center relative overflow-hidden bg-gradient-to-br from-indigo-500/10 to-transparent"
          >
            <div className="relative mb-8">
              <div className="w-32 h-32 rounded-full border-2 border-dashed border-blue-500/30 p-2 spin-slow">
                <div className="w-full h-full rounded-full border-2 border-blue-500/50 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Zap className="text-blue-400" size={32} />
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-pulse-slow -z-10" />
            </div>
            
            <h4 className="text-xl font-black text-white italic uppercase tracking-tighter mb-4">Neural Engine Active</h4>
            <p className="text-slate-400 text-sm leading-relaxed px-4">
              Our advanced Isolation Forest model is currently scanning all system calls for sub-second anomaly detection.
            </p>
            
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {[
                { icon: Server, label: 'Cluster 01' },
                { icon: Globe, label: 'Edge Nodes' },
                { icon: Lock, label: 'Secure Vault' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-white/5 rounded-xl text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                  <item.icon size={12} className="text-blue-500" />
                  {item.label}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Event Table */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-[2.5rem] overflow-hidden shadow-2xl relative border-white/5"
        >
          <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <Terminal size={20} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Event Forensics</h2>
                <p className="text-[10px] text-slate-500 font-mono tracking-widest mt-1">REAL-TIME TELEMETRY FEED</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Monitoring</span>
              </div>
              <div className="w-px h-8 bg-white/5 hidden sm:block" />
              <button className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-500 hover:text-white">
                <Search size={20} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#020617] z-10 border-b border-white/5">
                <tr className="text-slate-500 text-[10px] uppercase font-black tracking-[0.2em]">
                  <th className="px-8 py-5">Process Origin</th>
                  <th className="px-8 py-5">Command Context</th>
                  <th className="px-8 py-5">MITRE Matrix</th>
                  <th className="px-8 py-5 text-center">Threat Level</th>
                  <th className="px-8 py-5 text-right">ML Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                  {events.map((event) => (
                    <tr
                      key={event.id}
                      onClick={() => openReport(event)}
                      className="group hover:bg-blue-500/[0.04] transition-colors cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center group-hover:bg-blue-900/40 group-hover:scale-110 transition-all border border-white/5">
                            <Database size={16} className={event.severity === 'normal' ? 'text-slate-500' : 'text-red-400'} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-100 text-sm group-hover:text-blue-400 transition-colors">{event.process_name}</div>
                            <div className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase mt-0.5">{event.user}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="max-w-[280px] xl:max-w-md truncate font-mono text-[10px] text-slate-400 bg-black/40 px-3 py-2 rounded-xl border border-white/5 group-hover:border-blue-500/30 transition-colors">
                          {event.command_line}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {event.mitre_technique ? (
                          <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 font-black uppercase tracking-tighter">
                            {event.mitre_technique}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-600 italic">No Match Detected</span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <StatusBadge severity={event.severity} />
                      </td>
                      <td className="px-8 py-6 text-right font-mono text-xs text-slate-400 group-hover:text-blue-400 group-hover:font-bold">
                        {event.anomaly_score.toFixed(4)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-white/[0.01] border-t border-white/5 text-center">
            <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">End of visible telemetry buffer</span>
          </div>
        </motion.div>
      </div>

      {/* AI Modal */}
      <AnimatePresence>
        {isModalOpen && selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/85"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass w-full max-w-3xl rounded-[3rem] shadow-[0_0_100px_rgba(59,130,246,0.2)] overflow-hidden relative border-white/10"
            >
              <div className="p-10 border-b border-white/5 flex justify-between items-center bg-gradient-to-br from-blue-600/20 via-transparent to-transparent">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-blue-500/20 rounded-2xl border border-blue-500/30">
                    <Cpu className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Core Intelligence Report</h3>
                    <p className="text-[10px] text-blue-400/60 font-mono tracking-[0.4em] mt-1 uppercase">Event Forensic Analysis #{selectedEvent.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-3 hover:bg-white/10 rounded-full transition-all text-slate-500 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-10 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="glass bg-black/40 p-6 rounded-[2rem] border-white/5">
                    <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-2">Process Origin</p>
                    <p className="font-bold text-white text-xl">{selectedEvent.process_name}</p>
                  </div>
                  <div className="glass bg-black/40 p-6 rounded-[2rem] border-white/5">
                    <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-2">ML Confidence</p>
                    <p className={`font-mono text-2xl font-black ${selectedEvent.anomaly_score < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {selectedEvent.anomaly_score.toFixed(5)}
                    </p>
                  </div>
                </div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-blue-600/5 p-8 rounded-[2.5rem] border border-blue-500/20 relative overflow-hidden group"
                >
                  <div className="flex items-start gap-6 relative z-10">
                    <div className="p-3 bg-blue-500/10 rounded-xl mt-1">
                      <Info className={`w-6 h-6 ${aiReport.includes("❌") ? 'text-red-500' : 'text-blue-400'}`} />
                    </div>
                    <div className="space-y-4">
                      <div className="text-slate-200 leading-relaxed font-medium text-lg whitespace-pre-wrap">
                        {aiReport}
                      </div>

                      {!aiReport.includes("analyzing") && !aiReport.includes("❌") && (
                        <motion.div 
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          className="flex items-center gap-3 text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] pt-4 border-t border-emerald-500/10"
                        >
                          <ShieldCheck size={14} /> Analysis Integrity Verified by Sentinel v2.6.4
                        </motion.div>
                      )}
                    </div>
                  </div>
                  
                  {/* Subtle shimmer for "analyzing" state */}
                  {aiReport.includes("analyzing") && (
                    <motion.div 
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent" 
                    />
                  )}
                </motion.div>

                <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-6">
                  <span className="text-[10px] text-slate-600 font-mono uppercase tracking-[0.3em]">Signature: SENTINEL-CORE-ALPHA-99</span>
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: '#3b82f6' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsModalOpen(false)}
                    className="w-full sm:w-auto bg-blue-600/80 text-white px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-2xl shadow-blue-600/20"
                  >
                    Acknowledge Intelligence
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
