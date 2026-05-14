'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
  ShieldAlert, ShieldCheck, Activity, Terminal,
  User, Search, X, Cpu, AlertTriangle, Info, TrendingUp
} from 'lucide-react';

interface SOCEvent {
  id: number;
  process_name: string;
  command_line: string;
  user: string;
  severity: string;
  anomaly_score: number;
  mitre_technique?: string;
}

export default function Dashboard() {
  const [events, setEvents] = useState<SOCEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SOCEvent | null>(null);
  const [aiReport, setAiReport] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/events');
      const data = await res.json();
      setEvents([...data].reverse());
    } catch (err) {
      console.error("Ошибка API:", err);
    }
  };

  const startSimulation = async () => {
  setIsSimulating(true);
  try {
    const res = await fetch('http://127.0.0.1:8000/simulate', { method: 'POST' });
    if (res.ok) {
      // Можно добавить уведомление или просто ждать появления логов
      console.log("Simulation started");
    }
  } catch (err) {
    console.error("Ошибка запуска симуляции:", err);
  } finally {
    // Выключаем статус загрузки через пару секунд
    setTimeout(() => setIsSimulating(false), 2000);
  }
};

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 3000);
    return () => clearInterval(interval);
  }, []);

  // Данные для графика (последние 15 событий)
  const chartData = useMemo(() => {
    return [...events].reverse().slice(-15).map(e => ({
      name: `#${e.id}`,
      score: parseFloat(e.anomaly_score.toFixed(3)),
      severity: e.severity
    }));
  }, [events]);

  const openReport = async (event: SOCEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
    setAiReport("🤖 Sentinel AI анализирует вектор атаки и контекст процесса...");

    try {
      // Добавляем небольшую искусственную задержку для эффекта "работы мысли" ИИ
      const res = await fetch(`http://127.0.0.1:8000/events/${event.id}/report`);
      const data = await res.json();

      // Если отчет пришел с маркдауном (звездочками), просто выводим его.
      // Для полноценного рендеринга ** лучше использовать библиотеку react-markdown,
      // но пока оставим как текст для стабильности.
      setAiReport(data.report);
    } catch (err) {
      setAiReport("❌ Системный сбой: Не удалось связаться с нейронным модулем анализа.");
    }
  };

  const criticalCount = useMemo(() => events.filter(e => e.severity === 'critical' || e.severity === 'high').length, [events]);

  return (
    <main className="min-h-screen bg-[#020617] text-slate-200 font-sans p-4 md:p-8 relative overflow-x-hidden">
      {/* Background Glow */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/5 blur-[120px] rounded-full"></div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg shadow-blue-900/20">
              <ShieldAlert className="w-8 h-8 text-white"/>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
                Sentinel<span className="text-blue-500 underline decoration-blue-500/30">Core</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-mono tracking-widest uppercase mt-1">
                Neural Threat Detection Unit // Ver 2.6.4
              </p>
            </div>
          </div>

          <div
              className="hidden lg:flex items-center gap-6 px-6 py-3 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-md">
            <div className="text-center">
              <p className="text-[10px] text-slate-500 uppercase font-bold">API Status</p>
              <p className="text-xs text-green-400 font-mono tracking-tighter">CONNECTED</p>
            </div>
            <div className="w-px h-8 bg-slate-800"></div>
            <div className="text-center">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Model</p>
              <p className="text-xs text-blue-400 font-mono tracking-tighter">ISOLATION_FOREST_V2</p>
            </div>

            {/* Вертикальный разделитель перед кнопкой */}
            <div className="w-px h-8 bg-slate-800"></div>

            {/* Кнопка симуляции */}
            <button
                onClick={startSimulation}
                disabled={isSimulating}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${
                    isSimulating
                        ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                        : 'bg-blue-600/10 border-blue-500/50 text-blue-400 hover:bg-blue-600 hover:text-white shadow-lg shadow-blue-900/20 active:scale-95'
                }`}
            >
              {isSimulating ? 'Starting Engine...' : 'Run Attack Simulation'}
            </button>
          </div>
        </header>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard title="Events Scanned" value={events.length} icon={<Search size={20}/>} color="blue"/>
          <StatCard title="High Alerts" value={criticalCount} icon={<AlertTriangle size={20}/>} color="red"
                    alert={criticalCount > 0}/>
          <StatCard title="System Integrity" value="98.1%" icon={<ShieldCheck size={20}/>} color="emerald"/>
          <StatCard title="Avg Latency" value="12ms" icon={<Activity size={20}/>} color="purple"/>
        </div>

        {/* Top Section: Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-500"/> Anomaly Score Timeline
              </h3>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                  <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false}/>
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']}/>
                  <Tooltip
                      contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px'}}
                      itemStyle={{color: '#3b82f6', fontSize: '12px'}}
                  />
                  <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900/40 border border-slate-800 rounded-3xl p-6 flex flex-col justify-center">
             <div className="text-center space-y-4">
                <div className="relative inline-block">
                  <Cpu className="w-16 h-16 text-blue-500/50" />
                  <div className="absolute inset-0 animate-pulse bg-blue-500/20 blur-2xl rounded-full"></div>
                </div>
                <h4 className="text-lg font-bold text-white uppercase tracking-tighter">AI Core Active</h4>
                <p className="text-xs text-slate-400 leading-relaxed px-4">
                  Neural engine is processing incoming telemetry strings and mapping to MITRE ATT&CK framework automatically.
                </p>
                <div className="pt-4">
                  <span className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                    Heuristic + ML Enabled
                  </span>
                </div>
             </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-slate-950/40 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-500" />
              Incident Forensics
            </h2>
            <div className="flex gap-2">
               <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
               <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse delay-75"></div>
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse delay-150"></div>
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-950 z-10 border-b border-slate-800">
                <tr className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                  <th className="p-5">Process Identity</th>
                  <th className="p-5">Payload Path</th>
                  <th className="p-5">MITRE Technique</th>
                  <th className="p-5 text-center">Threat</th>
                  <th className="p-5 text-right">Anomaly</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {events.slice(0, 100).map((event) => (
                  <tr
                    key={event.id}
                    onClick={() => openReport(event)}
                    className="group hover:bg-blue-600/[0.04] transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-600"
                  >
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-900 p-2 rounded-xl group-hover:scale-110 transition-transform">
                          <Activity size={14} className={event.severity === 'normal' ? 'text-slate-500' : 'text-red-500'} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-100 text-sm">{event.process_name}</div>
                          <div className="text-[9px] text-slate-500 font-mono tracking-tighter uppercase">{event.user}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="max-w-xs truncate font-mono text-[10px] text-slate-400 bg-black/20 p-2 rounded-lg border border-slate-800/50">
                        {event.command_line}
                      </div>
                    </td>
                    <td className="p-5">
                      {event.mitre_technique ? (
                        <span className="text-[9px] text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20 font-bold uppercase tracking-tighter">
                          {event.mitre_technique}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-600 italic">No specific technique</span>
                      )}
                    </td>
                    <td className="p-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg ${
                        event.severity === 'critical' ? 'bg-red-500 text-white shadow-red-900/40' :
                        event.severity === 'high' ? 'bg-orange-500/20 text-orange-500 border border-orange-500/40' :
                        'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      }`}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="p-5 text-right font-mono text-xs text-slate-400 group-hover:text-blue-500">
                      {event.anomaly_score.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL (как в прошлом коде) */}
      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-black/70 animate-in fade-in duration-300">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-blue-600/10 via-transparent to-transparent">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-2xl">
                  <Cpu className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Forensic Report</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-5 rounded-3xl border border-slate-800">
                  <p className="text-slate-500 text-[10px] uppercase font-black mb-1">Process ID</p>
                  <p className="font-mono text-blue-400 text-lg">#{selectedEvent.id}</p>
                </div>
                <div className="bg-slate-900/50 p-5 rounded-3xl border border-slate-800">
                  <p className="text-slate-500 text-[10px] uppercase font-black mb-1">ML Confidence</p>
                  <p className={`font-mono text-lg font-bold ${selectedEvent.anomaly_score < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {selectedEvent.anomaly_score.toFixed(5)}
                  </p>
                </div>
              </div>

              <div
                  className="bg-blue-600/5 p-8 rounded-3xl border border-blue-500/20 shadow-inner relative overflow-hidden">
                {/* Анимированный фон для процесса анализа */}
                {aiReport.includes("анализирует") && (
                    <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent animate-shimmer"></div>
                )}

                <div className="flex items-start gap-5 relative z-10">
                  <Info className={`w-6 h-6 mt-1 ${aiReport.includes("❌") ? 'text-red-500' : 'text-blue-500'}`}/>
                  <div className="space-y-2">
                    <p className="text-slate-200 leading-relaxed font-medium text-lg italic">
                      {aiReport}
                    </p>
                    {!aiReport.includes("анализирует") && !aiReport.includes("❌") && (
                        <div
                            className="flex items-center gap-2 text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-4">
                          <ShieldCheck size={12}/> Analysis Verified by Sentinel Core
                        </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                  className="pt-6 flex justify-between items-center text-slate-500 text-[10px] font-mono uppercase tracking-[0.3em]">
                <span>Unit: Sentinel AI v2.6.4</span>
                <button
                    onClick={() => setIsModalOpen(false)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl text-xs font-black transition-all shadow-xl shadow-blue-900/20 hover:scale-105 active:scale-95"
                >
                  Confirm Awareness
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({title, value, icon, color, alert}: any) {
  const themes: any = {
    blue: "border-blue-500/10 text-blue-400 bg-blue-500/[0.02] hover:border-blue-500/30 shadow-blue-900/5",
    red: "border-red-500/10 text-red-400 bg-red-500/[0.02] hover:border-red-500/30 shadow-red-900/5",
    emerald: "border-emerald-500/10 text-emerald-400 bg-emerald-500/[0.02] hover:border-emerald-500/30 shadow-emerald-900/5",
    purple: "border-purple-500/10 text-purple-400 bg-purple-500/[0.02] hover:border-purple-500/30 shadow-purple-900/5",
  };

  return (
    <div className={`p-6 rounded-3xl border backdrop-blur-xl transition-all duration-500 group shadow-lg ${themes[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-slate-950/80 rounded-2xl border border-white/5 group-hover:rotate-12 transition-transform">{icon}</div>
        {alert && <div className="flex h-2 w-2 rounded-full bg-red-500 animate-ping shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>}
      </div>
      <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{title}</h3>
      <p className="text-2xl font-bold mt-1 text-slate-100 tracking-tighter">{value}</p>
    </div>
  );
}
