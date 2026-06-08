'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  ShieldAlert, Brain, Target, Zap, Terminal, Bell,
  BarChart3, ArrowRight, ChevronRight, Shield, Lock,
  Activity, Globe, Menu, X, CheckCircle, ExternalLink,
  Cpu, Eye, AlertTriangle, Wifi
} from 'lucide-react';
import { isAuthenticated } from '@/lib/auth';

/* ─── Data ──────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: Brain,
    color: 'from-blue-500 to-indigo-600',
    glow: 'shadow-blue-500/20',
    title: 'Isolation Forest ML',
    desc: 'Unsupervised anomaly detection trained on real process telemetry. No labeled data required — the model learns your baseline and flags deviations automatically.',
    tags: ['200 Estimators', '25 Features', 'scikit-learn'],
  },
  {
    icon: Target,
    color: 'from-red-500 to-rose-600',
    glow: 'shadow-red-500/20',
    title: 'MITRE ATT&CK Mapping',
    desc: 'Every event is automatically mapped to 35+ attack techniques. Lateral movement, privilege escalation, persistence — classified in milliseconds.',
    tags: ['35+ Techniques', 'Auto-mapping', 'TTP Coverage'],
  },
  {
    icon: Zap,
    color: 'from-yellow-500 to-orange-500',
    glow: 'shadow-yellow-500/20',
    title: 'Real-Time Detection',
    desc: 'Process-level telemetry streamed from any endpoint. Every running process scored by the ML engine the moment it appears.',
    tags: ['< 50ms', 'Live Streaming', 'Process-Level'],
  },
  {
    icon: Eye,
    color: 'from-purple-500 to-violet-600',
    glow: 'shadow-purple-500/20',
    title: 'AI Forensic Reports',
    desc: 'Gemini-powered incident analysis generates detailed forensic reports with attack chain reconstruction and remediation recommendations.',
    tags: ['Gemini AI', 'Auto-Report', 'Remediation'],
  },
  {
    icon: Terminal,
    color: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-500/20',
    title: 'Endpoint Agents',
    desc: 'Lightweight Python collectors deployable on macOS, Linux, and Windows. Install in seconds — requires only Python 3.8+ and two packages.',
    tags: ['macOS', 'Linux', 'Windows'],
  },
  {
    icon: Bell,
    color: 'from-cyan-500 to-blue-500',
    glow: 'shadow-cyan-500/20',
    title: 'Instant Alerts',
    desc: 'Automatic Telegram notifications for critical and high-severity incidents. Your SOC team gets alerted before the attacker completes their objective.',
    tags: ['Telegram', 'Webhooks', 'Auto-Escalation'],
  },
];

const STEPS = [
  {
    num: '01',
    icon: Terminal,
    title: 'Deploy the Agent',
    desc: 'Run a single Python script on any endpoint. The agent scans all running processes and streams telemetry to SentinelCore.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    num: '02',
    icon: Brain,
    title: 'ML Scores Each Event',
    desc: 'The Isolation Forest model assigns an anomaly score (0–1) to every process. MITRE ATT&CK techniques are mapped simultaneously.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    num: '03',
    icon: ShieldAlert,
    title: 'Respond & Remediate',
    desc: 'Critical events trigger Telegram alerts and AI forensic reports. Acknowledge incidents from the dashboard with full audit trail.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
];

const STATS = [
  { value: '200',   label: 'IF Estimators',     color: 'text-blue-400'    },
  { value: '35+',   label: 'MITRE Techniques',  color: 'text-red-400'     },
  { value: '25',    label: 'ML Feature Vectors', color: 'text-purple-400'  },
  { value: '< 50ms',label: 'Detection Latency', color: 'text-emerald-400' },
];

const TECH = ['FastAPI', 'Next.js 16', 'scikit-learn', 'MITRE ATT&CK', 'Gemini AI', 'SQLite', 'JWT Auth', 'psutil'];

/* ─── Animated event ticker ─────────────────────────────────────────────── */
const FAKE_EVENTS = [
  { proc: 'mimikatz.exe',    sev: 'CRITICAL', score: '0.921' },
  { proc: 'powershell.exe',  sev: 'HIGH',     score: '0.748' },
  { proc: 'cmd.exe',         sev: 'MEDIUM',   score: '0.512' },
  { proc: 'python3',         sev: 'LOW',      score: '0.201' },
  { proc: 'nc -e /bin/bash', sev: 'CRITICAL', score: '0.975' },
  { proc: 'svchost.exe',     sev: 'HIGH',     score: '0.680' },
];

const SEV_COLOR: Record<string, string> = {
  CRITICAL: 'text-red-400 border-red-500/30 bg-red-500/10',
  HIGH:     'text-orange-400 border-orange-500/30 bg-orange-500/10',
  MEDIUM:   'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  LOW:      'text-blue-400 border-blue-500/30 bg-blue-500/10',
};

function HeroVisual() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(i => (i + 1) % FAKE_EVENTS.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto lg:mx-0">
      {/* Glow behind card */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/15 to-blue-700/15 rounded-3xl blur-2xl scale-110" />

      <div className="relative glass-elevated rounded-3xl p-5 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
              <Activity size={12} className="text-white" />
            </div>
            <span className="text-xs font-black text-white">Live Threat Feed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-mono">SCANNING</span>
          </div>
        </div>

        {/* Event rows */}
        {FAKE_EVENTS.map((ev, i) => (
          <motion.div
            key={ev.proc}
            animate={{
              opacity: i === active ? 1 : 0.35,
              scale: i === active ? 1 : 0.98,
            }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <div className={`px-2 py-0.5 rounded-md border text-[9px] font-bold ${SEV_COLOR[ev.sev]} shrink-0`}>
              {ev.sev}
            </div>
            <span className="flex-1 text-[11px] font-mono text-slate-300 truncate">{ev.proc}</span>
            <span className="text-[11px] font-bold font-mono text-slate-500">{ev.score}</span>
          </motion.div>
        ))}

        {/* ML score bar */}
        <div className="pt-2 border-t border-white/[0.06]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] text-slate-600 font-mono uppercase tracking-wider">ML Score</span>
            <span className="text-[10px] font-bold text-emerald-400 font-mono">
              {FAKE_EVENTS[active].score}
            </span>
          </div>
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              key={active}
              initial={{ width: 0 }}
              animate={{ width: `${parseFloat(FAKE_EVENTS[active].score) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-red-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Section fade-in wrapper ────────────────────────────────────────────── */
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const router    = useRouter();
  const [authed, setAuthed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setAuthed(isAuthenticated()); }, []);

  return (
    <div className="min-h-screen bg-[#010b18] text-white overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-grid opacity-[0.08] pointer-events-none z-0" />
      <div className="glow-orb-1" />
      <div className="glow-orb-2" />

      {/* ── Navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 border-b border-white/[0.05] bg-[#010b18]/80 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <ShieldAlert size={16} className="text-white" />
          </div>
          <span className="font-black text-sm tracking-tight font-mono">
            SENTINEL<span className="text-emerald-400">AI</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[['#features','Features'], ['#how-it-works','How It Works'], ['#technology','Technology']].map(([href, label]) => (
            <a key={href} href={href} className="text-xs text-slate-400 hover:text-white font-semibold transition-colors tracking-wide">
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {authed ? (
            <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-500/20">
              <BarChart3 size={13} /> Open Dashboard
            </Link>
          ) : (
            <>
              <Link href="/register" className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.07] text-white text-xs font-bold transition-all">
                Sign Up
              </Link>
              <Link href="/login" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 text-white text-xs font-bold hover:brightness-110 transition-all shadow-lg shadow-emerald-500/20">
                <Lock size={13} /> Log In
              </Link>
            </>
          )}
          {/* Mobile burger */}
          <button className="md:hidden p-2 text-slate-400 hover:text-white" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-16 left-0 right-0 z-40 bg-[#080f1e] border-b border-white/[0.06] px-6 py-4 space-y-3 md:hidden"
        >
          {[['#features','Features'], ['#how-it-works','How It Works'], ['#technology','Technology']].map(([href, label]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}
              className="block text-sm text-slate-300 hover:text-white font-semibold py-1">
              {label}
            </a>
          ))}
          {!authed && (
            <div className="pt-2 border-t border-white/[0.06] flex gap-2">
              <Link href="/register" onClick={() => setMenuOpen(false)}
                className="flex-1 text-center py-2 rounded-xl bg-white/[0.05] border border-white/[0.07] text-sm text-white font-bold">
                Sign Up
              </Link>
              <Link href="/login" onClick={() => setMenuOpen(false)}
                className="flex-1 text-center py-2 rounded-xl bg-emerald-600 text-sm text-white font-bold">
                Log In
              </Link>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center pt-16">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-bold tracking-widest uppercase mb-6"
            >
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              AI-Powered SOC Platform
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18 }}
              className="text-5xl md:text-6xl font-black tracking-tighter leading-[1.05] mb-6"
            >
              Detect Threats
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Before They Strike
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.26 }}
              className="text-slate-400 text-base leading-relaxed max-w-lg mb-10"
            >
              SentinelCore uses Isolation Forest machine learning and the MITRE ATT&amp;CK framework
              to detect endpoint anomalies in real time — before attackers complete their objectives.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.34 }}
              className="flex flex-wrap gap-3"
            >
              <Link
                href={authed ? '/dashboard' : '/login'}
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-blue-600 text-white text-sm font-black tracking-wide hover:brightness-110 transition-all shadow-xl shadow-emerald-500/25"
              >
                {authed ? 'Open Dashboard' : 'Start Detection'}
                <ArrowRight size={15} />
              </Link>
              <a
                href="#features"
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white text-sm font-bold transition-all"
              >
                Learn More
                <ChevronRight size={15} />
              </a>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap items-center gap-4 mt-10"
            >
              {[
                { icon: Shield,    label: 'Zero-config ML'     },
                { icon: Lock,      label: 'JWT secured'        },
                { icon: Wifi,      label: 'Real-time alerts'   },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <Icon size={12} className="text-slate-500" />
                  {label}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: animated visual */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <HeroVisual />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-slate-700"
        >
          <div className="w-px h-10 bg-gradient-to-b from-transparent to-white/10" />
          <div className="w-4 h-7 rounded-full border border-white/10 flex items-start justify-center pt-1.5">
            <div className="w-0.5 h-2 bg-white/20 rounded-full" />
          </div>
        </motion.div>
      </section>

      {/* ── Stats bar ── */}
      <section className="relative z-10 border-y border-white/[0.05] bg-white/[0.015] py-8">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-white/[0.07]">
          {STATS.map(({ value, label, color }) => (
            <FadeIn key={label} className="text-center px-6">
              <p className={`text-3xl font-black font-mono ${color} mb-1`}>{value}</p>
              <p className="text-[11px] text-slate-600 uppercase tracking-widest font-bold">{label}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <FadeIn className="text-center mb-16">
          <span className="text-[10px] text-emerald-400 font-bold tracking-[0.3em] uppercase mb-3 block">Platform Capabilities</span>
          <h2 className="text-4xl font-black tracking-tighter">
            Everything a Modern <span className="text-emerald-400">SOC Needs</span>
          </h2>
          <p className="text-slate-500 text-sm mt-4 max-w-lg mx-auto">
            From ML-driven detection to AI-generated forensics — SentinelCore covers the full incident response lifecycle.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, color, glow, title, desc, tags }, i) => (
            <FadeIn key={title} delay={i * 0.07}>
              <div className="glass rounded-2xl p-6 h-full glass-hover group transition-all">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg ${glow} group-hover:scale-105 transition-transform`}>
                  <Icon size={20} className="text-white" />
                </div>
                <h3 className="text-sm font-black text-white mb-2 tracking-tight">{title}</h3>
                <p className="text-[12px] text-slate-500 leading-relaxed mb-4">{desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.07] text-[10px] text-slate-500 font-mono">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 px-6 md:px-12 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-16">
            <span className="text-[10px] text-purple-400 font-bold tracking-[0.3em] uppercase mb-3 block">Workflow</span>
            <h2 className="text-4xl font-black tracking-tighter">
              From Deploy to <span className="text-purple-400">Detected</span>
            </h2>
            <p className="text-slate-500 text-sm mt-4 max-w-md mx-auto">
              Three steps from zero to real-time threat coverage across your entire endpoint fleet.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connector lines */}
            <div className="hidden md:block absolute top-12 left-[33%] right-[33%] h-px bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-emerald-500/30" />

            {STEPS.map(({ num, icon: Icon, title, desc, color, bg }, i) => (
              <FadeIn key={num} delay={i * 0.12}>
                <div className="glass rounded-2xl p-6 relative text-center">
                  <div className={`inline-flex w-14 h-14 rounded-2xl ${bg} border items-center justify-center mb-4`}>
                    <Icon size={24} className={color} />
                  </div>
                  <div className={`absolute top-4 right-4 text-[11px] font-black font-mono ${color} opacity-40`}>{num}</div>
                  <h3 className="text-sm font-black text-white mb-2">{title}</h3>
                  <p className="text-[12px] text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security Architecture ── */}
      <section className="py-24 px-6 md:px-12 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <FadeIn>
            <span className="text-[10px] text-emerald-400 font-bold tracking-[0.3em] uppercase mb-3 block">Security</span>
            <h2 className="text-4xl font-black tracking-tighter mb-6">
              Built Secure <span className="text-emerald-400">By Design</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Every API call is authenticated with dual-layer security — JWT Bearer tokens for the frontend
              and static API keys for programmatic agent access. All tokens are scoped and expire automatically.
            </p>
            <div className="space-y-3">
              {[
                { label: 'JWT Bearer Tokens',        desc: '24-hour expiry, HS256 signed, role-scoped' },
                { label: 'API Key Authentication',   desc: 'Static key fallback for headless agent access' },
                { label: 'Auto-Logout on 401/403',   desc: 'Frontend clears token and redirects to login' },
                { label: 'CORS Hardened Backend',    desc: 'FastAPI CORS configured per deployment' },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-white">{label}</p>
                    <p className="text-[11px] text-slate-600">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="glass-elevated rounded-2xl p-6 space-y-4">
              {[
                { method: 'POST', path: '/auth/login',     badge: 'Public',   color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'   },
                { method: 'GET',  path: '/auth/me',        badge: 'JWT',      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20'             },
                { method: 'POST', path: '/ingest',         badge: 'JWT/Key',  color: 'text-purple-400 bg-purple-500/10 border-purple-500/20'       },
                { method: 'GET',  path: '/events',         badge: 'JWT/Key',  color: 'text-purple-400 bg-purple-500/10 border-purple-500/20'       },
                { method: 'GET',  path: '/stats',          badge: 'JWT/Key',  color: 'text-purple-400 bg-purple-500/10 border-purple-500/20'       },
                { method: 'POST', path: '/simulate',       badge: 'JWT/Key',  color: 'text-purple-400 bg-purple-500/10 border-purple-500/20'       },
              ].map(({ method, path, badge, color }) => (
                <div key={path} className="flex items-center gap-3 font-mono text-xs">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${method === 'POST' ? 'text-yellow-400 bg-yellow-500/10' : 'text-blue-400 bg-blue-500/10'}`}>
                    {method}
                  </span>
                  <span className="text-slate-300 flex-1">{path}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${color}`}>{badge}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Technology ── */}
      <section id="technology" className="py-24 px-6 md:px-12 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn>
            <span className="text-[10px] text-slate-500 font-bold tracking-[0.3em] uppercase mb-3 block">Stack</span>
            <h2 className="text-4xl font-black tracking-tighter mb-12">
              Powered by <span className="text-emerald-400">Modern Technology</span>
            </h2>
          </FadeIn>
          <FadeIn delay={0.1} className="flex flex-wrap justify-center gap-3">
            {TECH.map((t, i) => (
              <motion.span
                key={t}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="px-4 py-2 rounded-xl glass border border-white/[0.07] text-sm text-slate-300 font-semibold hover:border-emerald-500/30 hover:text-white transition-colors cursor-default"
              >
                {t}
              </motion.span>
            ))}
          </FadeIn>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 md:px-12 border-t border-white/[0.04]">
        <FadeIn>
          <div className="max-w-3xl mx-auto text-center glass-elevated rounded-3xl p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-blue-700/10 rounded-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/30">
                <ShieldAlert size={28} className="text-white" />
              </div>
              <h2 className="text-3xl font-black tracking-tighter mb-4">
                Ready to Secure <span className="text-emerald-400">Your Endpoints?</span>
              </h2>
              <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto leading-relaxed">
                Sign in to access the full SOC platform — deploy agents, monitor threats, and respond to incidents in real time.
              </p>
              <Link
                href={authed ? '/dashboard' : '/login'}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-blue-600 text-white text-sm font-black tracking-wide hover:brightness-110 transition-all shadow-xl shadow-emerald-500/25"
              >
                {authed ? 'Open Dashboard' : 'Sign In to SentinelCore'}
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.05] py-10 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
              <ShieldAlert size={12} className="text-white" />
            </div>
            <span className="text-xs font-black tracking-tight text-slate-400 font-mono">
              SENTINEL<span className="text-emerald-400">AI</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-700 font-mono text-center">
            Isolation Forest ML · MITRE ATT&amp;CK · FastAPI · Next.js 16 · v2.0
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-700 font-mono">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            All systems operational
          </div>
        </div>
      </footer>
    </div>
  );
}
