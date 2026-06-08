'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Eye, EyeOff, Lock, Mail, User,
  ArrowLeft, Activity, CheckCircle, AlertCircle, Fingerprint
} from 'lucide-react';
import { saveAuth, isAuthenticated } from '@/lib/auth';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Uppercase letter',       ok: /[A-Z]/.test(password) },
    { label: 'Number or symbol',       ok: /[0-9!@#$%^&*]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['bg-red-500', 'bg-yellow-500', 'bg-emerald-500'];
  const labels = ['Weak', 'Fair', 'Strong'];

  if (!password) return null;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className={`flex-1 h-0.5 rounded-full transition-colors duration-300 ${i < score ? colors[score - 1] : 'bg-white/10'}`} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {checks.map(({ label, ok }) => (
            <span key={label} className={`text-[9px] font-mono flex items-center gap-1 ${ok ? 'text-emerald-500' : 'text-slate-700'}`}>
              <CheckCircle size={9} /> {label}
            </span>
          ))}
        </div>
        <span className={`text-[10px] font-bold ${colors[score - 1]?.replace('bg-', 'text-') ?? 'text-slate-600'}`}>
          {password ? labels[score - 1] ?? 'Weak' : ''}
        </span>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm]       = useState({ username: '', email: '', password: '', confirm: '' });
  const [showPass, setShow]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => { if (isAuthenticated()) router.replace('/dashboard'); }, [router]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username.trim(), email: form.email.trim(), password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Registration failed'); return; }
      saveAuth(data.access_token, { username: data.username, role: data.role });
      router.replace('/dashboard');
    } catch {
      setError('Connection error — is the backend running?');
    } finally { setLoading(false); }
  };

  const ready = form.username && form.email && form.password && form.confirm;

  return (
    <div className="min-h-screen bg-[#010b18] flex items-center justify-center relative overflow-hidden py-8">
      <div className="absolute inset-0 bg-grid opacity-[0.08] pointer-events-none" />
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/8 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-[110px] pointer-events-none" />

      {/* Corner brackets */}
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

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.1, type: 'spring', bounce: 0.3 }}
            className="p-4 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-[1.5rem] shadow-2xl shadow-emerald-500/30 ring-1 ring-white/10 mb-5">
            <ShieldAlert className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-black tracking-tighter text-white font-mono">
            SENTINEL<span className="text-emerald-400">AI</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-mono tracking-[0.2em] uppercase mt-1.5">
            Create your analyst account
          </p>
        </div>

        {/* Card */}
        <div className="glass-elevated rounded-[2rem] p-8 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Fingerprint size={16} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-tight">Create Account</h2>
              <p className="text-[10px] text-slate-500">Free · Secure · Instant access</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-2">Username</label>
              <div className="relative">
                <User size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  value={form.username} onChange={set('username')}
                  placeholder="johndoe" autoComplete="username"
                  className="w-full bg-black/40 border border-white/[0.07] focus:border-emerald-500/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white font-mono placeholder-slate-700 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-2">Email Address</label>
              <div className="relative">
                <Mail size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  value={form.email} onChange={set('email')}
                  type="email" placeholder="analyst@company.com" autoComplete="email"
                  className="w-full bg-black/40 border border-white/[0.07] focus:border-emerald-500/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white font-mono placeholder-slate-700 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-2">Password</label>
              <div className="relative">
                <Lock size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  value={form.password} onChange={set('password')}
                  type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  className="w-full bg-black/40 border border-white/[0.07] focus:border-emerald-500/50 rounded-xl pl-10 pr-11 py-3 text-sm text-white font-mono placeholder-slate-700 outline-none transition-colors"
                />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </div>

            {/* Confirm password */}
            <div>
              <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-2">Confirm Password</label>
              <div className="relative">
                <Lock size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  value={form.confirm} onChange={set('confirm')}
                  type="password" placeholder="Repeat password"
                  autoComplete="new-password"
                  className={`w-full bg-black/40 border rounded-xl pl-10 pr-4 py-3 text-sm text-white font-mono placeholder-slate-700 outline-none transition-colors ${
                    form.confirm && form.confirm !== form.password
                      ? 'border-red-500/40 focus:border-red-500/60'
                      : 'border-white/[0.07] focus:border-emerald-500/50'
                  }`}
                />
                {form.confirm && form.confirm === form.password && (
                  <CheckCircle size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400" />
                )}
              </div>
            </div>

            {/* Error */}
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

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              type="submit" disabled={loading || !ready}
              className="w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {loading ? <><Activity size={13} className="animate-spin" /> Creating account...</> : 'Create Account'}
            </motion.button>
          </form>

          <div className="mt-5 pt-5 border-t border-white/[0.05] text-center">
            <p className="text-[11px] text-slate-600">
              Already have an account?{' '}
              <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
