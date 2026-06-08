'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';

const LINES = [
  'Initializing Isolation Forest engine...',
  'Loading MITRE ATT&CK knowledge base...',
  'Connecting to threat intelligence...',
  'Calibrating anomaly thresholds...',
  'SentinelCore ready.',
];

export default function Preloader() {
  const [visible,   setVisible]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [lineIdx,   setLineIdx]   = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('sc_loaded')) return;
    setVisible(true);

    // Progress bar: 0→100 in ~2400ms
    let p = 0;
    const tick = setInterval(() => {
      p += 1.8;
      if (p >= 100) { p = 100; clearInterval(tick); }
      setProgress(p);
    }, 38);

    // Cycle status lines
    const lineTimer = setInterval(() => {
      setLineIdx(i => (i < LINES.length - 1 ? i + 1 : i));
    }, 480);

    const done = setTimeout(() => {
      clearInterval(lineTimer);
      setVisible(false);
      sessionStorage.setItem('sc_loaded', '1');
    }, 2900);

    return () => { clearInterval(tick); clearInterval(lineTimer); clearTimeout(done); };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.55, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] bg-[#010b18] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Background grid */}
          <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />

          {/* Animated rings */}
          {[1, 2, 3].map(i => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-emerald-500/10"
              style={{ width: 120 * i, height: 120 * i }}
              animate={{ scale: [1, 1.06, 1], opacity: [0.08, 0.18, 0.08] }}
              transition={{ duration: 2.4, delay: i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}

          {/* Orbs */}
          <div className="absolute top-[-20%] left-[-15%] w-[500px] h-[500px] rounded-full bg-emerald-600/8 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-15%] w-[400px] h-[400px] rounded-full bg-indigo-700/10 blur-[120px] pointer-events-none" />

          {/* Center logo */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'backOut' }}
            className="relative z-10 flex flex-col items-center mb-12"
          >
            {/* Shield icon */}
            <div className="relative mb-5">
              <motion.div
                animate={{ boxShadow: ['0 0 0px rgba(59,130,246,0)', '0 0 40px rgba(59,130,246,0.4)', '0 0 0px rgba(59,130,246,0)'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                className="w-20 h-20 rounded-[1.75rem] bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 ring-1 ring-white/10"
              >
                <ShieldAlert size={36} className="text-white" />
              </motion.div>
              {/* Rotating ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-3 rounded-full border-2 border-t-emerald-500/60 border-r-emerald-500/20 border-b-transparent border-l-transparent"
              />
            </div>

            <h1 className="text-2xl font-black tracking-tighter text-white">
              SENTINEL<span className="text-emerald-400">AI</span>
            </h1>
            <p className="text-[10px] text-slate-600 font-mono tracking-[0.3em] uppercase mt-1.5">
              SOC · AI · v2.0
            </p>
          </motion.div>

          {/* Status line */}
          <motion.div
            key={lineIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="font-mono text-[11px] text-slate-500 mb-6 tracking-wider h-4 relative z-10"
          >
            <span className="text-emerald-500 mr-1">›</span>
            {LINES[lineIdx]}
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="ml-1 text-emerald-400"
            >▌</motion.span>
          </motion.div>

          {/* Progress bar */}
          <div className="relative z-10 w-64">
            <div className="h-px bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                style={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-emerald-600 to-blue-500 rounded-full relative"
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              </motion.div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[9px] text-slate-700 font-mono">BOOT</span>
              <span className="text-[9px] text-slate-600 font-mono">{Math.round(progress)}%</span>
              <span className="text-[9px] text-slate-700 font-mono">READY</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
