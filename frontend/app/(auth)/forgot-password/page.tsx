'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Mail, ArrowLeft, AlertCircle,
  CheckCircle, Activity, KeyRound
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [token,   setToken]   = useState(''); // demo only

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      setSent(true);
      if (data.demo_token) setToken(data.demo_token); // show in demo
    } catch {
      setError('Connection error — is the backend running?');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#010b18] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-[0.08] pointer-events-none" />
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/8 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-[110px] pointer-events-none" />

      {['top-0 left-0 border-t border-l', 'top-0 right-0 border-t border-r', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'].map((pos, i) => (
        <motion.div key={i} initial={{ width: 0, height: 0 }} animate={{ width: 60, height: 60 }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          className={`absolute ${pos} border-emerald-500/15 pointer-events-none`} />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md px-6 relative z-10"
      >
        <Link href="/login" className="inline-flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-slate-400 font-mono mb-6 transition-colors group">
          <ArrowLeft size={11} className="group-hover:-translate-x-0.5 transition-transform" />
          BACK TO SIGN IN
        </Link>

        <div className="flex flex-col items-center mb-8">
          <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.1, type: 'spring', bounce: 0.3 }}
            className="p-4 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-[1.5rem] shadow-2xl shadow-emerald-500/30 ring-1 ring-white/10 mb-5">
            <ShieldAlert className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-black tracking-tighter text-white">
            SENTINEL<span className="text-emerald-400">AI</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-mono tracking-[0.2em] uppercase mt-1.5">
            Password Recovery
          </p>
        </div>

        <div className="glass-elevated rounded-[2rem] p-8 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

          <AnimatePresence mode="wait">
            {!sent ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <KeyRound size={16} className="text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white uppercase tracking-tight">Reset Password</h2>
                    <p className="text-[10px] text-slate-500">We'll send you a secure reset link</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                      <input
                        value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                        type="email" placeholder="analyst@company.com" autoComplete="email"
                        className="w-full bg-black/40 border border-white/[0.07] focus:border-emerald-500/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white font-mono placeholder-slate-700 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-mono">
                          <AlertCircle size={13} className="shrink-0" />
                          {error}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    type="submit" disabled={loading || !email}
                    className="w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? <><Activity size={13} className="animate-spin" /> Sending...</> : 'Send Reset Link'}
                  </motion.button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, type: 'spring' }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', bounce: 0.5 }}
                  className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5"
                >
                  <CheckCircle size={28} className="text-emerald-400" />
                </motion.div>

                <h3 className="text-base font-black text-white mb-2">Check your inbox</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  If <span className="text-white font-mono">{email}</span> is registered,
                  a password reset link has been sent. Check your inbox and spam folder.
                </p>

                {/* Demo token display */}
                {token && (
                  <div className="text-left mb-5 p-4 bg-yellow-500/[0.07] border border-yellow-500/20 rounded-xl">
                    <p className="text-[9px] text-yellow-400 font-bold uppercase tracking-wider mb-2">Demo Mode — Reset Token</p>
                    <p className="text-[9px] text-slate-500 mb-2">In production this would be sent via email. Use this token on the reset page:</p>
                    <code className="block text-[10px] text-emerald-300 font-mono break-all bg-black/40 rounded-lg p-2 border border-white/[0.05]">
                      {token}
                    </code>
                    <Link
                      href={`/reset-password?token=${token}`}
                      className="inline-flex items-center gap-1.5 mt-3 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                    >
                      Use this token to reset password →
                    </Link>
                  </div>
                )}

                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-sm text-white font-bold transition-all"
                >
                  Back to Sign In
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-5 pt-5 border-t border-white/[0.05] text-center">
            <p className="text-[11px] text-slate-600">
              Don't have an account?{' '}
              <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                Sign up free
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
