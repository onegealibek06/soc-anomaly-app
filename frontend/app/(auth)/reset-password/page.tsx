'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Lock, Eye, EyeOff, ArrowLeft,
  AlertCircle, CheckCircle, Activity, KeyRound
} from 'lucide-react';

function ResetForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [token,    setToken]   = useState('');
  const [password, setPass]    = useState('');
  const [confirm,  setConfirm] = useState('');
  const [showPass, setShow]    = useState(false);
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState('');
  const [done,     setDone]    = useState(false);

  useEffect(() => {
    const t = searchParams.get('token');
    if (t) setToken(t);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return; }
    if (!token)                { setError('No reset token found — use the link from your email'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Reset failed'); return; }
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('Connection error — is the backend running?');
    } finally { setLoading(false); }
  };

  return (
    <div className="glass-elevated rounded-[2rem] p-8 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <KeyRound size={16} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-tight">Set New Password</h2>
                <p className="text-[10px] text-slate-500">Choose a strong password</p>
              </div>
            </div>

            {/* Token field (editable in case URL didn't carry it) */}
            {!token && (
              <div className="mb-4">
                <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-2">Reset Token</label>
                <input
                  value={token} onChange={e => setToken(e.target.value)}
                  placeholder="Paste your reset token..."
                  className="w-full bg-black/40 border border-white/[0.07] focus:border-emerald-500/50 rounded-xl px-4 py-3 text-xs text-white font-mono placeholder-slate-700 outline-none transition-colors"
                />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-2">New Password</label>
                <div className="relative">
                  <Lock size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    value={password} onChange={e => { setPass(e.target.value); setError(''); }}
                    type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className="w-full bg-black/40 border border-white/[0.07] focus:border-emerald-500/50 rounded-xl pl-10 pr-11 py-3 text-sm text-white font-mono placeholder-slate-700 outline-none transition-colors"
                  />
                  <button type="button" onClick={() => setShow(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    value={confirm} onChange={e => { setConfirm(e.target.value); setError(''); }}
                    type="password" placeholder="Repeat password"
                    autoComplete="new-password"
                    className={`w-full bg-black/40 border rounded-xl pl-10 pr-4 py-3 text-sm text-white font-mono placeholder-slate-700 outline-none transition-colors ${
                      confirm && confirm !== password ? 'border-red-500/40' : 'border-white/[0.07] focus:border-emerald-500/50'
                    }`}
                  />
                  {confirm && confirm === password && (
                    <CheckCircle size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400" />
                  )}
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-mono">
                      <AlertCircle size={13} className="shrink-0" /> {error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                type="submit" disabled={loading || !password || !confirm}
                className="w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <><Activity size={13} className="animate-spin" /> Updating...</> : 'Update Password'}
              </motion.button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, type: 'spring' }}
            className="text-center py-4"
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', bounce: 0.5 }}
              className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={28} className="text-emerald-400" />
            </motion.div>
            <h3 className="text-base font-black text-white mb-2">Password Updated!</h3>
            <p className="text-xs text-slate-400 mb-4">Your password has been reset. Redirecting to sign in...</p>
            <div className="flex justify-center">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-5 pt-5 border-t border-white/[0.05] text-center">
        <Link href="/login" className="text-[11px] text-slate-600 hover:text-slate-400 font-mono transition-colors">
          ← Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#010b18] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-[0.08] pointer-events-none" />
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/8 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-[110px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }} className="w-full max-w-md px-6 relative z-10">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-slate-400 font-mono mb-6 transition-colors group">
          <ArrowLeft size={11} className="group-hover:-translate-x-0.5 transition-transform" />
          BACK TO SIGN IN
        </Link>

        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-[1.5rem] shadow-2xl shadow-emerald-500/30 ring-1 ring-white/10 mb-5">
            <ShieldAlert className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-white">
            SENTINEL<span className="text-emerald-400">AI</span>
          </h1>
        </div>

        <Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>}>
          <ResetForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
