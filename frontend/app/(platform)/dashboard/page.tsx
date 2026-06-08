'use client';
import { useEffect, useState, useCallback, useRef, memo } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  ShieldAlert, AlertTriangle, Activity, TrendingUp,
  RefreshCw, Zap, CheckCircle, Clock, ChevronRight,
  Cpu, BarChart3, AlertCircle,
} from 'lucide-react';
import { apiFetch } from '@/lib/auth';
import Link from 'next/link';

// ── Dynamic imports: recharts stays OUT of the initial bundle ──────────────
const ScoreChart    = dynamic(() => import('@/components/charts/ScoreChart'),    { ssr: false, loading: () => <ChartPlaceholder h={160} /> });
const SeverityChart = dynamic(() => import('@/components/charts/SeverityChart'), { ssr: false, loading: () => <ChartPlaceholder h={140} /> });

function ChartPlaceholder({ h }: { h: number }) {
  return <div className="bg-white/[0.03] animate-pulse rounded-xl" style={{ height: h }} />;
}

// ── Types ──────────────────────────────────────────────────────────────────
interface Stats {
  total: number;
  by_severity: Record<string, number>;
  avg_score: number;
  top_processes: { name: string; count: number }[];
  unacknowledged_critical: number;
}
interface Event {
  id: number;
  process_name: string;
  command_line: string;
  user: string;
  severity: string;
  anomaly_score: number;
  mitre_technique: string | null;
  is_acknowledged: boolean;
  created_at: string;
}

const SEV_CFG: Record<string, { color: string; bg: string; dot: string; hex: string }> = {
  critical: { color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',    dot: 'bg-red-400',    hex: '#f87171' },
  high:     { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', dot: 'bg-orange-400', hex: '#fb923c' },
  medium:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', dot: 'bg-yellow-400', hex: '#facc15' },
  low:      { color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   dot: 'bg-blue-400',   hex: '#60a5fa' },
  normal:   { color: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/20', dot: 'bg-slate-500',  hex: '#64748b' },
};

// ── Memoised badge ─────────────────────────────────────────────────────────
const SeverityBadge = memo(function SeverityBadge({ severity }: { severity: string }) {
  const c = SEV_CFG[severity] ?? SEV_CFG.normal;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${c.bg} ${c.color} uppercase`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${severity === 'critical' ? 'animate-pulse' : ''}`} />
      {severity}
    </span>
  );
});

// ── Page ───────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats,     setStats]   = useState<Stats | null>(null);
  const [events,    setEvents]  = useState<Event[]>([]);
  const [allEvts,   setAllEvts] = useState<Event[]>([]);
  const [loading,   setLoading] = useState(true);
  const [simulating, setSim]    = useState(false);
  const [refreshing, setRef]    = useState(false);
  const [lastUpdate, setLast]   = useState(new Date());
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (showRef = false) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    if (showRef) setRef(true);
    try {
      // One request for "all 60" — split client-side into recent-8 and chart data
      const [sRes, eRes] = await Promise.all([
        apiFetch('/api/stats',          { signal }),
        apiFetch('/api/events?limit=60', { signal }),
      ]);
      if (signal.aborted) return;
      if (sRes.ok) setStats(await sRes.json());
      if (eRes.ok) {
        const all: Event[] = await eRes.json();
        setAllEvts(all);
        setEvents(all.slice(0, 8));
      }
      setLast(new Date());
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return;
    } finally {
      if (!signal.aborted) { setLoading(false); setRef(false); }
    }
  }, []);

  useEffect(() => {
    loadData();

    // Pause polling when tab is hidden — saves CPU and network
    const INTERVAL = 15_000;
    let timer: ReturnType<typeof setInterval>;
    const start = () => { timer = setInterval(() => { if (!document.hidden) loadData(); }, INTERVAL); };
    const onVis  = () => { if (!document.hidden) loadData(); };

    start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
      abortRef.current?.abort();
    };
  }, [loadData]);

  const runSim = useCallback(async () => {
    setSim(true);
    try {
      await apiFetch('/api/simulate', { method: 'POST' });
      setTimeout(() => { loadData(); setSim(false); }, 3500);
    } catch { setSim(false); }
  }, [loadData]);

  const ack = useCallback(async (id: number) => {
    await apiFetch(`/api/events/${id}/acknowledge`, { method: 'PATCH' });
    setEvents(p => p.map(e => e.id === id ? { ...e, is_acknowledged: true } : e));
  }, []);

  // Chart data — memoised derivations
  const scoreData = allEvts.slice().reverse().map(ev => ({ label: `#${ev.id}`, score: ev.anomaly_score }));
  const pieData   = ['critical','high','medium','low','normal']
    .map(s => ({ name: s, value: stats?.by_severity?.[s] ?? 0, hex: SEV_CFG[s].hex }))
    .filter(d => d.value > 0);

  if (loading) return null; // loading.tsx handles skeleton

  const critical = stats?.by_severity?.critical ?? 0;
  const high     = stats?.by_severity?.high     ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Operations <span className="text-emerald-400">Dashboard</span>
          </h1>
          <p className="text-xs text-slate-600 font-mono mt-0.5 flex items-center gap-2">
            <Clock size={11} />
            Updated {lastUpdate.toLocaleTimeString()}
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Live
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => loadData(true)} disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] text-slate-400 hover:text-white text-xs font-semibold transition-all disabled:opacity-50">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={runSim} disabled={simulating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20">
            <Zap size={13} className={simulating ? 'animate-pulse' : ''} />
            {simulating ? 'Simulating...' : 'Simulate Attack'}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { label: 'Total Events',    value: stats?.total ?? 0,                   icon: Activity,      c: 'text-emerald-400',   glow: 'stat-card-glow-green',   sub: 'All ingested events'   },
          { label: 'Critical / High', value: `${critical} / ${high}`,            icon: AlertTriangle, c: 'text-red-400',    glow: 'stat-card-glow-red',    sub: 'Active threat levels'  },
          { label: 'Avg ML Score',    value: stats?.avg_score?.toFixed(3) ?? '—', icon: TrendingUp,    c: 'text-purple-400', glow: 'stat-card-glow-purple', sub: 'Isolation Forest'      },
          { label: 'Needs Action',    value: stats?.unacknowledged_critical ?? 0, icon: ShieldAlert,   c: 'text-orange-400', glow: 'stat-card-glow-orange', sub: 'Unacknowledged C/H'   },
        ] as const).map(({ label, value, icon: Icon, c, glow, sub }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`glass rounded-2xl p-5 glass-hover ${glow} transition-all`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</span>
              <Icon size={16} className={`${c} opacity-60`} />
            </div>
            <p className={`text-2xl font-black ${c}`}>{value}</p>
            <p className="text-[10px] text-slate-600 mt-1">{sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-2">
              <BarChart3 size={13} className="text-emerald-400" />
              Anomaly Score Timeline
            </h2>
            <span className="text-[10px] text-slate-600 font-mono">last {allEvts.length} events</span>
          </div>
          <ScoreChart data={scoreData} />
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-2 mb-4">
            <AlertCircle size={13} className="text-red-400" />
            Severity Split
          </h2>
          <SeverityChart data={pieData} />
        </div>
      </div>

      {/* Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent events */}
        <div className="lg:col-span-2 glass rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
            <h2 className="text-xs font-black text-white uppercase tracking-tight">Recent Events</h2>
            <Link href="/events" className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {events.length === 0 ? (
              <div className="py-10 text-center text-slate-600 text-xs">
                No events — run a simulation or connect an agent
              </div>
            ) : events.map(ev => (
              <div key={ev.id} className="flex items-center gap-4 px-5 py-3 table-row-premium">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-white font-mono truncate max-w-[160px]">{ev.process_name}</span>
                    <SeverityBadge severity={ev.severity} />
                    {ev.is_acknowledged && <CheckCircle size={11} className="text-emerald-500 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-600 font-mono truncate">{ev.command_line || ev.user}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-slate-300 font-mono">{ev.anomaly_score.toFixed(3)}</p>
                  {!ev.is_acknowledged && (ev.severity === 'critical' || ev.severity === 'high') && (
                    <button onClick={() => ack(ev.id)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold mt-0.5 transition-colors">
                      ACK
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Top processes */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-black text-white uppercase tracking-tight mb-4">Top Processes</h3>
            <div className="space-y-2.5">
              {(stats?.top_processes ?? []).slice(0, 6).map((p, i) => {
                const max = stats?.top_processes?.[0]?.count ?? 1;
                return (
                  <div key={p.name}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] text-slate-700 font-mono w-3">{i + 1}</span>
                      <span className="flex-1 text-[11px] text-slate-300 font-mono truncate">{p.name}</span>
                      <span className="text-[10px] text-emerald-400 font-bold font-mono">{p.count}</span>
                    </div>
                    <div className="h-0.5 bg-white/[0.04] rounded-full overflow-hidden ml-5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(p.count / max) * 100}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        className="h-full bg-emerald-500/50 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
              {(stats?.top_processes ?? []).length === 0 && (
                <p className="text-[10px] text-slate-600">No data yet</p>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-xs font-black text-white uppercase tracking-tight mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {([
                { href: '/agents',    icon: Cpu,       color: 'text-emerald-400', label: 'Connect Endpoint Agent' },
                { href: '/analytics', icon: TrendingUp, color: 'text-purple-400',  label: 'View ML Analytics'      },
                { href: '/events',    icon: Activity,   color: 'text-emerald-400', label: 'Browse All Events'      },
              ] as const).map(({ href, icon: Icon, color, label }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all group">
                  <Icon size={14} className={`${color} group-hover:scale-110 transition-transform`} />
                  <span className="text-xs text-slate-400 group-hover:text-white font-medium transition-colors">{label}</span>
                  <ChevronRight size={12} className="text-slate-700 ml-auto group-hover:text-slate-400" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
