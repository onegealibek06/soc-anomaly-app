'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Terminal, Download, Copy, CheckCircle, Monitor,
  Server, Shield, Cpu, Zap, ArrowRight
} from 'lucide-react';
import { apiFetch } from '@/lib/auth';

const STEPS = [
  {
    num: '01',
    title: 'Download the Agent',
    desc: 'Download agent.py — a lightweight Python script that scans your device\'s running processes and sends them to SentinelCore for ML analysis.',
    icon: Download,
  },
  {
    num: '02',
    title: 'Install Dependencies',
    desc: 'The agent requires Python 3.8+ and two packages. Run this command in your terminal:',
    code: 'pip install requests psutil',
    icon: Terminal,
  },
  {
    num: '03',
    title: 'Configure the Agent',
    desc: 'Edit agent.py and set the API_URL to point to this SentinelCore instance:',
    code: 'API_URL = "http://<this-server-ip>:8000"',
    icon: Server,
  },
  {
    num: '04',
    title: 'Run the Agent',
    desc: 'Execute the agent on the target endpoint. It will scan all running processes and stream anomaly scores back in real-time:',
    code: 'python3 agent.py',
    icon: Zap,
  },
];

const PLATFORMS = [
  { name: 'macOS', icon: Monitor,  cmd: 'python3 agent.py' },
  { name: 'Linux', icon: Server,   cmd: 'python3 agent.py' },
  { name: 'Windows', icon: Cpu,    cmd: 'python agent.py' },
];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative mt-2">
      <code className="block bg-black/50 rounded-xl p-3.5 text-xs text-emerald-300 font-mono border border-white/[0.06] pr-12">
        {code}
      </code>
      <button
        onClick={copy}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
        title="Copy"
      >
        {copied ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

export default function AgentsPage() {
  const [downloading, setDownloading] = useState(false);

  const downloadAgent = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/download/agent');
      if (!res.ok) throw new Error('Not found');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'agent.py';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('agent.py not found on server. Check that agent.py exists in the project root.');
    } finally { setDownloading(false); }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-white tracking-tight">
          Endpoint <span className="text-emerald-400">Agents</span>
        </h1>
        <p className="text-xs text-slate-500 font-mono mt-0.5">
          Deploy lightweight collectors to any device for real-time process monitoring
        </p>
      </div>

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-elevated rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-emerald-600/8 blur-3xl pointer-events-none" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Shield size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-white">SentinelCore Endpoint Agent</p>
                <p className="text-[10px] text-slate-500 font-mono">agent.py · Python 3.8+</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-lg">
              The agent collects all running processes from the endpoint — name, PID, command line, and user —
              then streams them to this SentinelCore instance where the Isolation Forest ML model assigns
              anomaly scores and MITRE ATT&amp;CK mappings in real time.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {['psutil', 'requests', 'Isolation Forest', 'Real Processes', 'Cross-Platform'].map(tag => (
                <span key={tag} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-semibold">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={downloadAgent}
            disabled={downloading}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 text-white text-xs font-bold transition-all hover:brightness-110 disabled:opacity-50 shadow-lg shadow-emerald-500/20 whitespace-nowrap shrink-0"
          >
            <Download size={14} className={downloading ? 'animate-bounce' : ''} />
            {downloading ? 'Downloading...' : 'Download agent.py'}
          </button>
        </div>
      </motion.div>

      {/* Platforms */}
      <div className="grid grid-cols-3 gap-4">
        {PLATFORMS.map(({ name, icon: Icon, cmd }) => (
          <div key={name} className="glass rounded-2xl p-4 text-center">
            <Icon size={24} className="mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-bold text-white mb-1">{name}</p>
            <code className="text-[10px] text-emerald-300 font-mono">{cmd}</code>
          </div>
        ))}
      </div>

      {/* Setup steps */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.05]">
          <h2 className="text-xs font-black text-white uppercase tracking-tight">Deployment Guide</h2>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {STEPS.map(({ num, title, desc, code, icon: Icon }, i) => (
            <motion.div
              key={num}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex gap-5 p-6"
            >
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/15 border border-emerald-500/20 flex items-center justify-center">
                  <Icon size={16} className="text-emerald-400" />
                </div>
                {i < STEPS.length - 1 && <div className="w-px flex-1 bg-white/[0.05] min-h-[20px]" />}
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-emerald-500 font-mono font-bold">{num}</span>
                  <h3 className="text-sm font-bold text-white">{title}</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                {code && <CodeBlock code={code} />}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* What the agent does */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-xs font-black text-white uppercase tracking-tight mb-4">What the Agent Collects</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { field: 'process_name', desc: 'Executable name (e.g. bash, python3)' },
            { field: 'command_line', desc: 'Full command with arguments' },
            { field: 'user',         desc: 'Owner account of the process' },
            { field: 'pid',          desc: 'Process ID on the endpoint' },
            { field: 'hostname',     desc: 'Device hostname for attribution' },
            { field: 'source_ip',    desc: 'Agent\'s IP address' },
          ].map(({ field, desc }) => (
            <div key={field} className="flex items-start gap-2.5 p-3 bg-white/[0.02] rounded-xl border border-white/[0.05]">
              <ArrowRight size={12} className="text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <code className="text-[11px] text-emerald-300 font-mono">{field}</code>
                <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
