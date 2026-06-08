'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Brain, Target, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/auth';

interface Stats {
  total: number;
  by_severity: Record<string, number>;
  avg_score: number;
  top_processes: { name: string; count: number }[];
  unacknowledged_critical: number;
}

interface Metrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  roc_auc?: number;
  n_estimators?: number;
  contamination?: number;
  total_samples?: number;
  anomaly_samples?: number;
  normal_samples?: number;
}

const SEV_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#3b82f6',
  normal:   '#64748b',
};

const SEV_LABELS: Record<string, string> = {
  critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW', normal: 'NORMAL',
};

export default function AnalyticsPage() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsError, setMetricsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;
    try {
      const [sRes, mRes] = await Promise.all([
        apiFetch('/api/stats',   { signal }),
        apiFetch('/api/metrics', { signal }),
      ]);
      if (signal.aborted) return;
      if (sRes.ok) setStats(await sRes.json());
      if (mRes.ok) { setMetrics(await mRes.json()); setMetricsError(false); }
      else          setMetricsError(true);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return;
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    return () => { abortRef.current?.abort(); };
  }, [loadData]);

  const retrain = async () => {
    setRetraining(true);
    try {
      await apiFetch('/api/train', { method: 'POST' });
      await loadData();
    } finally { setRetraining(false); }
  };

  if (loading) return null; // loading.tsx handles the skeleton

  const total = stats?.total ?? 1;
  const bySevm = stats?.by_severity ?? {};

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">
            ML <span className="text-emerald-400">Analytics</span>
          </h1>
          <p className="text-xs text-slate-600 font-mono mt-0.5">Isolation Forest model performance &amp; event distribution</p>
        </div>
        <button
          onClick={retrain}
          disabled={retraining}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20"
        >
          <Brain size={13} className={retraining ? 'animate-pulse' : ''} />
          {retraining ? 'Retraining...' : 'Retrain Model'}
        </button>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Events',  value: stats?.total ?? 0,             icon: BarChart3,   color: 'text-emerald-400'   },
          { label: 'Avg ML Score',  value: stats?.avg_score?.toFixed(4) ?? '—', icon: TrendingUp, color: 'text-purple-400' },
          { label: 'Critical',      value: bySevm.critical ?? 0,          icon: AlertCircle, color: 'text-red-400'    },
          { label: 'High',          value: bySevm.high ?? 0,              icon: Target,      color: 'text-orange-400' },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</span>
              <Icon size={15} className={`${color} opacity-60`} />
            </div>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity distribution bar chart */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xs font-black text-white uppercase tracking-tight mb-5">Severity Distribution</h2>
          <div className="space-y-4">
            {['critical','high','medium','low','normal'].map(sev => {
              const count = bySevm[sev] ?? 0;
              const pct   = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={sev}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: SEV_COLORS[sev] }}>
                      {SEV_LABELS[sev]}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500 font-mono">{pct.toFixed(1)}%</span>
                      <span className="text-xs font-bold text-slate-300 font-mono w-8 text-right">{count}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                      style={{ background: SEV_COLORS[sev] }}
                      className="h-full rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mini pie legend */}
          <div className="mt-6 pt-4 border-t border-white/[0.05]">
            <div className="flex flex-wrap gap-3">
              {Object.entries(bySevm).map(([sev, count]) => (
                <div key={sev} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: SEV_COLORS[sev] ?? '#64748b' }} />
                  <span className="text-[10px] text-slate-500">{sev} ({count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Processes */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xs font-black text-white uppercase tracking-tight mb-5">Top Suspicious Processes</h2>
          <div className="space-y-3">
            {(stats?.top_processes ?? []).slice(0, 10).map((p, i) => {
              const maxCount = stats?.top_processes?.[0]?.count ?? 1;
              const pct = (p.count / maxCount) * 100;
              return (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-700 font-mono w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-slate-200 font-mono truncate max-w-[200px]">{p.name}</span>
                      <span className="text-[11px] font-bold text-emerald-400 font-mono ml-2">{p.count}</span>
                    </div>
                    <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.05 }}
                        className="h-full rounded-full bg-emerald-500/60"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {(stats?.top_processes ?? []).length === 0 && (
              <p className="text-xs text-slate-600">No process data. Ingest some events first.</p>
            )}
          </div>
        </div>
      </div>

      {/* ML Model Metrics */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xs font-black text-white uppercase tracking-tight">Model Performance Metrics</h2>
          <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono">
            <Brain size={11} />
            Isolation Forest v2
          </div>
        </div>

        {metricsError ? (
          <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <AlertCircle size={16} className="text-yellow-400 shrink-0" />
            <div>
              <p className="text-xs text-yellow-400 font-semibold">Metrics not yet generated</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Run <code className="font-mono bg-white/10 px-1 rounded">python3 evaluate_model.py</code> in the backend to generate metrics.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: 'Accuracy',     value: metrics?.accuracy,     color: 'text-emerald-400', fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
              { label: 'Precision',    value: metrics?.precision,    color: 'text-blue-400',    fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
              { label: 'Recall',       value: metrics?.recall,       color: 'text-purple-400',  fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
              { label: 'F1 Score',     value: metrics?.f1,           color: 'text-indigo-400',  fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
              { label: 'ROC AUC',      value: metrics?.roc_auc,      color: 'text-cyan-400',    fmt: (v: number) => v.toFixed(4) },
            ].map(({ label, value, color, fmt }) => (
              <div key={label} className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                <span className="text-[9px] text-slate-600 uppercase tracking-widest font-bold block mb-2">{label}</span>
                <span className={`text-xl font-black font-mono ${color}`}>
                  {value != null ? fmt(value) : '—'}
                </span>
              </div>
            ))}
          </div>
        )}

        {metrics && (
          <div className="mt-4 pt-4 border-t border-white/[0.05] grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Estimators',      value: metrics.n_estimators },
              { label: 'Contamination',   value: metrics.contamination?.toFixed(3) },
              { label: 'Total Samples',   value: metrics.total_samples },
              { label: 'Anomaly Samples', value: metrics.anomaly_samples },
            ].map(({ label, value }) => (
              <div key={label}>
                <span className="text-[9px] text-slate-600 uppercase tracking-wider block mb-1">{label}</span>
                <span className="text-sm font-bold text-slate-300 font-mono">{value ?? '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
