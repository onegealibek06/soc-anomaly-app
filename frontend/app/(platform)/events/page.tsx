'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, CheckCircle, Clock, RefreshCw,
  FileText, ChevronDown, ChevronUp, X, Loader2, AlertTriangle,
  Calendar, Shield, SlidersHorizontal, ChevronLeft, ChevronRight
} from 'lucide-react';
import { apiFetch } from '@/lib/auth';

interface Event {
  id: number;
  process_name: string;
  command_line: string;
  user: string;
  severity: string;
  anomaly_score: number;
  mitre_technique: string | null;
  is_acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
  source_ip?: string;
  hostname?: string;
}

const SEV_CFG: Record<string, { color: string; bg: string; dot: string }> = {
  critical: { color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/25',       dot: 'bg-red-400'    },
  high:     { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/25', dot: 'bg-orange-400' },
  medium:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/25', dot: 'bg-yellow-400' },
  low:      { color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/25',     dot: 'bg-blue-400'   },
  normal:   { color: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/20',   dot: 'bg-slate-500'  },
};

function Badge({ severity }: { severity: string }) {
  const c = SEV_CFG[severity] ?? SEV_CFG.normal;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${c.bg} ${c.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${severity === 'critical' ? 'animate-pulse' : ''}`} />
      {severity}
    </span>
  );
}

// Quick date presets
const DATE_PRESETS = [
  { label: 'All time', value: '' },
  { label: 'Today',    value: 'today' },
  { label: '24 h',     value: '24h' },
  { label: '7 days',   value: '7d' },
  { label: '30 days',  value: '30d' },
];

function getDateRange(preset: string): { date_from: string; date_to: string } {
  if (!preset) return { date_from: '', date_to: '' };
  const now = new Date();
  const date_to = now.toISOString();
  if (preset === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return { date_from: start.toISOString(), date_to };
  }
  const hours: Record<string, number> = { '24h': 24, '7d': 168, '30d': 720 };
  const h = hours[preset] ?? 24;
  const date_from = new Date(now.getTime() - h * 3600 * 1000).toISOString();
  return { date_from, date_to };
}

export default function EventsPage() {
  const [events, setEvents]               = useState<Event[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [search, setSearch]               = useState('');
  const [debouncedSearch, setDebounced]   = useState('');
  const [severityFilter, setSeverity]     = useState('');
  const [ackFilter, setAckFilter]         = useState('');
  const [datePreset, setDatePreset]       = useState('');
  const [mitreFilter, setMitreFilter]     = useState('');
  const [minScore, setMinScore]           = useState('');
  const [showAdvanced, setShowAdvanced]   = useState(false);
  const [page, setPage]                   = useState(1);
  const [pageSize, setPageSize]           = useState(50);
  const [total, setTotal]                 = useState(0);
  const [expandedId, setExpandedId]       = useState<number | null>(null);
  const [report, setReport]               = useState<{ id: number; text: string } | null>(null);
  const [reportLoading, setReportLoading] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef    = useRef<AbortController | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebounced(search), 320);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const buildParams = useCallback((p: number) => {
    const params = new URLSearchParams({
      limit:  String(pageSize),
      offset: String((p - 1) * pageSize),
    });
    if (severityFilter)  params.set('severity',    severityFilter);
    if (debouncedSearch) params.set('search',       debouncedSearch);
    if (ackFilter)       params.set('acknowledged', ackFilter);
    if (mitreFilter)     params.set('mitre',        mitreFilter);
    if (minScore)        params.set('min_score',    minScore);
    if (datePreset) {
      const { date_from, date_to } = getDateRange(datePreset);
      if (date_from) params.set('date_from', date_from);
      if (date_to)   params.set('date_to',   date_to);
    }
    return params;
  }, [severityFilter, debouncedSearch, ackFilter, datePreset, mitreFilter, minScore, pageSize]);

  const loadEvents = useCallback(async (showRefresh = false, targetPage = page) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    if (showRefresh) setRefreshing(true);
    try {
      const params = buildParams(targetPage);
      const [eventsRes, countRes] = await Promise.all([
        apiFetch(`/api/events?${params.toString()}`,       { signal: abortRef.current.signal }),
        apiFetch(`/api/events/count?${params.toString()}`, { signal: abortRef.current.signal }),
      ]);
      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (countRes.ok)  { const d = await countRes.json(); setTotal(d.total); }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildParams, page]);

  useEffect(() => { setPage(1); }, [severityFilter, debouncedSearch, ackFilter, datePreset, mitreFilter, minScore, pageSize]);
  useEffect(() => { loadEvents(false, page); }, [page, buildParams]); // eslint-disable-line

  const acknowledge = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await apiFetch(`/api/events/${id}/acknowledge`, { method: 'PATCH' });
    setEvents(prev => prev.map(ev => ev.id === id ? { ...ev, is_acknowledged: true } : ev));
  };

  const loadReport = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (report?.id === id) { setReport(null); return; }
    setReportLoading(id);
    try {
      const res = await apiFetch(`/api/events/${id}/report`);
      if (res.ok) {
        const data = await res.json();
        setReport({ id, text: data.report });
      }
    } finally { setReportLoading(null); }
  };

  const clearAll = () => {
    setSearch(''); setSeverity(''); setAckFilter('');
    setDatePreset(''); setMitreFilter(''); setMinScore('');
    setPage(1);
  };

  const totalPages  = Math.max(1, Math.ceil(total / pageSize));
  const pageFrom    = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageTo      = Math.min(page * pageSize, total);

  const goTo = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    setExpandedId(null);
  };

  const hasFilters = !!(search || severityFilter || ackFilter || datePreset || mitreFilter || minScore);

  const totalCritical = events.filter(e => e.severity === 'critical').length;
  const totalHigh     = events.filter(e => e.severity === 'high').length;
  const unacked       = events.filter(e => !e.is_acknowledged && (e.severity === 'critical' || e.severity === 'high')).length;

  // Page number buttons to show (window of 5)
  const pageButtons = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  if (loading) return null;

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Anomaly <span className="text-emerald-400">Events</span>
          </h1>
          <p className="text-xs text-slate-600 font-mono mt-0.5">
            {total > 0 ? `${pageFrom}–${pageTo} of ${total} events` : 'No events'}
          </p>
        </div>
        <button
          onClick={() => loadEvents(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] text-slate-400 hover:text-white text-xs font-semibold transition-all disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Quick stats */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Critical',  value: totalCritical, color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20'       },
          { label: 'High',      value: totalHigh,     color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
          { label: 'Needs ACK', value: unacked,       color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Total',     value: events.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20'  },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${bg} ${color}`}>
            <AlertTriangle size={11} />
            {value} {label}
          </div>
        ))}
      </div>

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="space-y-3">

        {/* Row 1: search + severity + ack + advanced toggle */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search process, command, user..."
              className="w-full bg-black/30 border border-white/[0.07] focus:border-emerald-500/40 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white font-mono placeholder-slate-700 outline-none transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                <X size={13} />
              </button>
            )}
          </div>

          <select
            value={severityFilter}
            onChange={e => setSeverity(e.target.value)}
            className="bg-black/30 border border-white/[0.07] focus:border-emerald-500/40 rounded-xl px-3 py-2.5 text-xs text-slate-400 outline-none transition-colors"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
          </select>

          <select
            value={ackFilter}
            onChange={e => setAckFilter(e.target.value)}
            className="bg-black/30 border border-white/[0.07] focus:border-emerald-500/40 rounded-xl px-3 py-2.5 text-xs text-slate-400 outline-none transition-colors"
          >
            <option value="">All Status</option>
            <option value="false">Unacknowledged</option>
            <option value="true">Acknowledged</option>
          </select>

          <button
            onClick={() => setShowAdvanced(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
              showAdvanced
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-white/[0.04] border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.07]'
            }`}
          >
            <SlidersHorizontal size={13} />
            Filters {showAdvanced ? '▲' : '▼'}
          </button>

          {hasFilters && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] text-slate-400 hover:text-red-400 text-xs font-semibold transition-all border border-white/[0.06]"
            >
              <X size={12} /> Clear all
            </button>
          )}
        </div>

        {/* Row 2: advanced filters (collapsible) */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex gap-3 flex-wrap pt-1">

                {/* Date presets */}
                <div className="flex items-center gap-1.5 bg-black/30 border border-white/[0.07] rounded-xl px-3 py-2">
                  <Calendar size={12} className="text-slate-500 shrink-0" />
                  <span className="text-[10px] text-slate-600 mr-1">Period:</span>
                  {DATE_PRESETS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setDatePreset(p.value)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                        datePreset === p.value
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* MITRE filter */}
                <div className="relative">
                  <Shield size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    value={mitreFilter}
                    onChange={e => setMitreFilter(e.target.value)}
                    placeholder="MITRE technique (e.g. T1059)"
                    className="bg-black/30 border border-white/[0.07] focus:border-emerald-500/40 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white font-mono placeholder-slate-700 outline-none transition-colors w-56"
                  />
                  {mitreFilter && (
                    <button onClick={() => setMitreFilter('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400">
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Min score */}
                <div className="flex items-center gap-2 bg-black/30 border border-white/[0.07] rounded-xl px-3 py-2">
                  <span className="text-[10px] text-slate-600 shrink-0">Min score:</span>
                  <input
                    type="range"
                    min="0" max="1" step="0.05"
                    value={minScore || '0'}
                    onChange={e => setMinScore(e.target.value === '0' ? '' : e.target.value)}
                    className="w-24 accent-emerald-500"
                  />
                  <span className="text-[11px] text-emerald-400 font-mono w-8">
                    {minScore ? parseFloat(minScore).toFixed(2) : '0.00'}
                  </span>
                  {minScore && (
                    <button onClick={() => setMinScore('')} className="text-slate-600 hover:text-slate-400">
                      <X size={11} />
                    </button>
                  )}
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active filter chips */}
        {hasFilters && (
          <div className="flex gap-2 flex-wrap">
            {severityFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-semibold">
                Severity: {severityFilter} <button onClick={() => setSeverity('')}><X size={10} /></button>
              </span>
            )}
            {ackFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400 text-[10px] font-semibold">
                Status: {ackFilter === 'true' ? 'Acknowledged' : 'Unacknowledged'} <button onClick={() => setAckFilter('')}><X size={10} /></button>
              </span>
            )}
            {datePreset && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                <Calendar size={9} /> {DATE_PRESETS.find(p => p.value === datePreset)?.label} <button onClick={() => setDatePreset('')}><X size={10} /></button>
              </span>
            )}
            {mitreFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-semibold">
                <Shield size={9} /> MITRE: {mitreFilter} <button onClick={() => setMitreFilter('')}><X size={10} /></button>
              </span>
            )}
            {minScore && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-semibold">
                Score ≥ {parseFloat(minScore).toFixed(2)} <button onClick={() => setMinScore('')}><X size={10} /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_80px_80px_120px] gap-0 px-5 py-3 border-b border-white/[0.05] bg-white/[0.02]">
          {['Process / Command', 'User', 'MITRE ATT&CK', 'Score', 'Severity', 'Actions'].map(h => (
            <span key={h} className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">{h}</span>
          ))}
        </div>

        <div className="divide-y divide-white/[0.04] max-h-[calc(100vh-420px)] overflow-y-auto">
          {events.length === 0 ? (
            <div className="py-16 text-center text-slate-600 text-xs">
              <Filter size={28} className="mx-auto mb-3 opacity-30" />
              No events match your filters
            </div>
          ) : events.map((ev) => (
            <div key={ev.id}>
              <div
                className="grid grid-cols-[2fr_1fr_1fr_80px_80px_120px] gap-0 px-5 py-3.5 table-row-premium cursor-pointer"
                onClick={() => setExpandedId(expandedId === ev.id ? null : ev.id)}
              >
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white font-mono truncate">{ev.process_name}</span>
                    {ev.is_acknowledged && <CheckCircle size={11} className="text-emerald-500 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-600 font-mono truncate mt-0.5">{ev.command_line || '—'}</p>
                </div>
                <div className="flex items-center">
                  <span className="text-[11px] text-slate-400 font-mono truncate">{ev.user || '—'}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-[10px] text-slate-500 truncate">{ev.mitre_technique?.split('\n')[0] || '—'}</span>
                </div>
                <div className="flex items-center">
                  <span className={`text-xs font-bold font-mono ${ev.anomaly_score >= 0.6 ? 'text-red-400' : ev.anomaly_score >= 0.3 ? 'text-orange-400' : 'text-slate-400'}`}>
                    {ev.anomaly_score.toFixed(3)}
                  </span>
                </div>
                <div className="flex items-center">
                  <Badge severity={ev.severity} />
                </div>
                <div className="flex items-center gap-2">
                  {!ev.is_acknowledged && (ev.severity === 'critical' || ev.severity === 'high') && (
                    <button
                      onClick={(e) => acknowledge(ev.id, e)}
                      title="Acknowledge"
                      className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors border border-emerald-500/20"
                    >
                      <CheckCircle size={12} />
                    </button>
                  )}
                  <button
                    onClick={(e) => loadReport(ev.id, e)}
                    title="AI Report"
                    disabled={reportLoading === ev.id}
                    className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors border border-emerald-500/20 disabled:opacity-50"
                  >
                    {reportLoading === ev.id ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                  </button>
                  <button className="p-1.5 text-slate-600 hover:text-slate-400 transition-colors">
                    {expandedId === ev.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expandedId === ev.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 py-4 bg-white/[0.02] border-t border-white/[0.04] space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
                        <div>
                          <span className="text-slate-600 uppercase tracking-wider block mb-1">Event ID</span>
                          <span className="text-white font-mono">#{ev.id}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 uppercase tracking-wider block mb-1">Timestamp</span>
                          <span className="text-white font-mono flex items-center gap-1"><Clock size={10} /> {new Date(ev.created_at).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 uppercase tracking-wider block mb-1">Status</span>
                          <span className={`font-semibold ${ev.is_acknowledged ? 'text-emerald-400' : 'text-orange-400'}`}>
                            {ev.is_acknowledged ? 'Acknowledged' : 'Pending Response'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-600 uppercase tracking-wider block mb-1">ML Score</span>
                          <span className="text-white font-mono">{ev.anomaly_score.toFixed(6)}</span>
                        </div>
                      </div>

                      {ev.mitre_technique && (
                        <div>
                          <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-1">MITRE ATT&CK Techniques</span>
                          <pre className="text-[10px] text-slate-300 font-mono bg-black/30 rounded-lg p-3 whitespace-pre-wrap border border-white/[0.05]">{ev.mitre_technique}</pre>
                        </div>
                      )}

                      {ev.command_line && (
                        <div>
                          <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-1">Full Command Line</span>
                          <code className="block text-[10px] text-emerald-300 font-mono bg-black/40 rounded-lg p-3 break-all border border-white/[0.05]">{ev.command_line}</code>
                        </div>
                      )}

                      {report?.id === ev.id && (
                        <div>
                          <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-1">Sentinel-AI Forensic Report</span>
                          <pre className="text-[10px] text-slate-300 font-mono bg-black/30 rounded-lg p-3 whitespace-pre-wrap border border-emerald-500/10 max-h-64 overflow-y-auto">{report.text}</pre>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-600">Rows per page:</span>
            {[25, 50, 100].map(s => (
              <button
                key={s}
                onClick={() => setPageSize(s)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  pageSize === s
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/[0.04] text-slate-500 hover:text-white border border-white/[0.06]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Page buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => goTo(page - 1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={14} />
            </button>

            {pageButtons().map((p, i) =>
              p === '...' ? (
                <span key={`dots-${i}`} className="px-2 text-slate-600 text-xs">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => goTo(p as number)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                    page === p
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => goTo(page + 1)}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Total info */}
          <span className="text-[11px] text-slate-600 font-mono">
            Page {page} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}
