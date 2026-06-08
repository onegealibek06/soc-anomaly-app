'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Bell, Key, Brain, Shield, CheckCircle,
  AlertCircle, Copy, RefreshCw, Lock, Eye, EyeOff,
  ShieldOff, Crown, UserX, Send, Wifi, WifiOff, Save
} from 'lucide-react';
import { apiFetch, getUser, AuthUser } from '@/lib/auth';

/* ── helpers ── */
function useMountedUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => { setUser(getUser()); }, []);
  return user;
}

function CopyField({
  label, value, secret = false, reveal = false,
}: {
  label: string; value: string; secret?: boolean; reveal?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [shown,  setShown]  = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const display = secret && !shown ? value.replace(/./g, '•') : value;

  return (
    <div>
      <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-2">{label}</label>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-black/40 border border-white/[0.07] rounded-xl px-4 py-2.5 text-xs font-mono text-slate-300 truncate">
          {display}
        </code>
        {secret && reveal && (
          <button onClick={() => setShown(v => !v)}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white transition-colors"
            title={shown ? 'Hide' : 'Reveal'}>
            {shown ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
        <button onClick={copy}
          className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white transition-colors"
          title="Copy">
          {copied ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  );
}

/* ── Locked overlay for non-admins ── */
function AdminOnly({ children }: { children: React.ReactNode }) {
  const user = useMountedUser();

  if (!user) return null; // still mounting

  if (user.role !== 'admin') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl overflow-hidden"
      >
        <div className="relative p-8 text-center">
          {/* Blurred ghost of children */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none select-none opacity-20 blur-sm">
            {children}
          </div>
          {/* Lock overlay */}
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <ShieldOff size={24} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-black text-white mb-1">Admin Access Required</p>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                This section contains sensitive platform secrets.<br />
                Only users with the <span className="text-red-400 font-semibold">admin</span> role can view this content.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/[0.07] border border-red-500/15">
              <UserX size={13} className="text-red-400" />
              <span className="text-[11px] text-red-400 font-semibold">
                Signed in as <span className="font-black">{user.username}</span> · role: {user.role}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return <>{children}</>;
}

/* ── Sensitive section (fetched from server) ── */
function SensitiveSection() {
  const user = useMountedUser();
  const [data,    setData]    = useState<Record<string, string | boolean> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') return;
    setLoading(true);
    apiFetch('/api/settings/sensitive')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setError('Failed to load sensitive settings'))
      .finally(() => setLoading(false));
  }, [user]);

  if (user?.role !== 'admin') return null;

  return (
    <div className="space-y-5">
      {/* Admin badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/15 w-fit">
        <Crown size={13} className="text-emerald-400" />
        <span className="text-[11px] text-emerald-400 font-bold">Admin view — sensitive data visible</span>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Loading secrets...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {data && (
        <>
          <CopyField label="X-API-Key" value={String(data.api_key)} secret reveal />
          <CopyField label="JWT Secret" value={String(data.jwt_secret)} secret reveal />
          <CopyField label="JWT Algorithm" value={String(data.jwt_algorithm)} />
          <CopyField label="Backend Base URL" value={String(data.backend_url)} />
          <CopyField label="Admin Email" value={String(data.admin_email)} />

          <div className="grid grid-cols-2 gap-3 pt-1">
            {[
              { label: 'Telegram',   ok: Boolean(data.telegram_configured) },
              { label: 'Webhook',    ok: Boolean(data.webhook_configured)  },
            ].map(({ label, ok }) => (
              <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${ok ? 'bg-emerald-500/[0.07] border-emerald-500/15 text-emerald-400' : 'bg-white/[0.03] border-white/[0.06] text-slate-600'}`}>
                {ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                {label} {ok ? 'configured' : 'not set'}
              </div>
            ))}
          </div>

          <div className="p-4 bg-emerald-500/[0.06] border border-emerald-500/15 rounded-xl">
            <p className="text-[10px] text-emerald-400 font-semibold mb-1">Authentication Flow</p>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Frontend authenticates via <code className="font-mono bg-white/10 px-1 rounded">POST /api/auth/login</code> and stores a 24-hour JWT.
              All API calls include both a <code className="font-mono bg-white/10 px-1 rounded">Bearer</code> token and the X-API-Key as fallback.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Telegram configuration form ── */
function TelegramSection() {
  const [botToken,    setBotToken]    = useState('');
  const [chatId,      setChatId]      = useState('');
  const [webhookUrl,  setWebhookUrl]  = useState('');
  const [showToken,   setShowToken]   = useState(false);
  const [configured,  setConfigured]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [testing,     setTesting]     = useState(false);
  const [saveStatus,  setSaveStatus]  = useState<'idle'|'ok'|'err'>('idle');
  const [testStatus,  setTestStatus]  = useState<'idle'|'ok'|'err'>('idle');
  const [testMsg,     setTestMsg]     = useState('');

  // Load current config on mount
  const loadConfig = useCallback(async () => {
    try {
      const res = await apiFetch('/api/settings/telegram');
      if (res.ok) {
        const d = await res.json();
        setConfigured(d.configured);
        setBotToken(d.bot_token || '');
        setChatId(d.chat_id || '');
        setWebhookUrl(d.webhook_url || '');
      }
    } catch {}
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const save = async () => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      const res = await apiFetch('/api/settings/telegram', {
        method: 'POST',
        body: JSON.stringify({ bot_token: botToken, chat_id: chatId, webhook_url: webhookUrl }),
      });
      const d = await res.json();
      if (res.ok) {
        setSaveStatus('ok');
        setConfigured(d.configured);
      } else {
        setSaveStatus('err');
      }
    } catch { setSaveStatus('err'); }
    finally { setSaving(false); }
    setTimeout(() => setSaveStatus('idle'), 4000);
  };

  const test = async () => {
    setTesting(true);
    setTestStatus('idle');
    setTestMsg('');
    try {
      const res = await apiFetch('/api/settings/telegram/test', { method: 'POST' });
      const d = await res.json();
      if (res.ok) { setTestStatus('ok'); setTestMsg('Тест-сообщение отправлено!'); }
      else         { setTestStatus('err'); setTestMsg(d.detail || 'Ошибка Telegram'); }
    } catch (e: unknown) {
      setTestStatus('err');
      setTestMsg(e instanceof Error ? e.message : 'Ошибка соединения');
    }
    finally { setTesting(false); }
    setTimeout(() => { setTestStatus('idle'); setTestMsg(''); }, 6000);
  };

  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      {/* Status banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
        configured
          ? 'bg-emerald-500/[0.08] border-emerald-500/20'
          : 'bg-slate-500/[0.06] border-white/[0.07]'
      }`}>
        {configured
          ? <Wifi size={15} className="text-emerald-400 shrink-0" />
          : <WifiOff size={15} className="text-slate-500 shrink-0" />}
        <div className="flex-1">
          <p className={`text-xs font-bold ${configured ? 'text-emerald-400' : 'text-slate-500'}`}>
            {configured ? 'Telegram подключён — алерты активны' : 'Telegram не настроен'}
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            Уведомления отправляются при каждом 🔴 CRITICAL / 🟠 HIGH событии
          </p>
        </div>
        {configured && (
          <button
            onClick={test}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/[0.12] hover:bg-emerald-500/[0.2] border border-emerald-500/20 text-emerald-400 text-[10px] font-bold transition-all disabled:opacity-50"
          >
            <Send size={11} className={testing ? 'animate-pulse' : ''} />
            {testing ? 'Отправка...' : 'Тест'}
          </button>
        )}
      </div>

      {/* Test result */}
      <AnimatePresence>
        {testMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold ${
              testStatus === 'ok'
                ? 'bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/[0.08] border-red-500/20 text-red-400'
            }`}
          >
            {testStatus === 'ok' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
            {testMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <div className="space-y-4">
        {/* Bot Token */}
        <div>
          <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-2">
            Bot Token <span className="text-slate-600 normal-case tracking-normal font-normal">· получить у @BotFather</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type={showToken ? 'text' : 'password'}
              value={botToken}
              onChange={e => setBotToken(e.target.value)}
              placeholder="1234567890:AABBccDDeeFF..."
              className="flex-1 bg-black/40 border border-white/[0.07] rounded-xl px-4 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-700 outline-none focus:border-emerald-500/40 focus:bg-black/60 transition-colors"
            />
            <button
              onClick={() => setShowToken(v => !v)}
              className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white transition-colors"
              title={showToken ? 'Скрыть' : 'Показать'}
            >
              {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </div>

        {/* Chat ID */}
        <div>
          <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-2">
            Chat ID <span className="text-slate-600 normal-case tracking-normal font-normal">· ID чата, канала или группы</span>
          </label>
          <input
            type="text"
            value={chatId}
            onChange={e => setChatId(e.target.value)}
            placeholder="-1001234567890 или 123456789"
            className="w-full bg-black/40 border border-white/[0.07] rounded-xl px-4 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-700 outline-none focus:border-emerald-500/40 focus:bg-black/60 transition-colors"
          />
        </div>

        {/* Webhook (optional) */}
        <div>
          <label className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-2">
            Webhook URL <span className="text-slate-600 normal-case tracking-normal font-normal">· опционально (Slack, Discord, n8n...)</span>
          </label>
          <input
            type="url"
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            className="w-full bg-black/40 border border-white/[0.07] rounded-xl px-4 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-700 outline-none focus:border-emerald-500/40 focus:bg-black/60 transition-colors"
          />
        </div>
      </div>

      {/* Save button + status */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={save}
          disabled={saving || (!botToken && !chatId)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold transition-all disabled:opacity-40 shadow-lg shadow-emerald-500/20"
        >
          <Save size={13} className={saving ? 'animate-pulse' : ''} />
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>

        <AnimatePresence>
          {saveStatus === 'ok' && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <CheckCircle size={13} /> Сохранено — перезапуск не нужен
            </motion.span>
          )}
          {saveStatus === 'err' && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-xs text-red-400 font-semibold">
              <AlertCircle size={13} /> Ошибка сохранения
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* How-to guide */}
      <div className="pt-2 border-t border-white/[0.05]">
        <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold mb-3">Как настроить</p>
        <ol className="space-y-2">
          {[
            <>Напиши <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">@BotFather</a> в Telegram → <code className="font-mono bg-white/10 px-1 rounded">/newbot</code> → скопируй токен</>,
            <>Напиши любое сообщение своему боту, затем открой{' '}<code className="font-mono bg-white/10 px-1 rounded text-[9px]">api.telegram.org/bot{'<TOKEN>'}/getUpdates</code> — найди <code className="font-mono bg-white/10 px-1 rounded">chat.id</code></>,
            <>Для канала: добавь бота как администратора, используй ID канала (начинается с <code className="font-mono bg-white/10 px-1 rounded">-100</code>)</>,
            <>Вставь токен и chat ID выше, нажми <b>Сохранить</b>, затем <b>Тест</b> — получишь сообщение в Telegram</>,
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="w-4 h-4 rounded-full bg-emerald-600/15 border border-emerald-500/20 flex items-center justify-center text-[9px] font-bold text-emerald-400 shrink-0 mt-0.5">{i + 1}</span>
              <span className="text-[10px] text-slate-400 leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}


/* ── Main page ── */
export default function SettingsPage() {
  const user = useMountedUser();
  const [retraining, setRetraining] = useState(false);
  const [retrainStatus, setRetrainStatus] = useState<'idle' | 'ok' | 'err'>('idle');

  const retrain = async () => {
    setRetraining(true);
    setRetrainStatus('idle');
    try {
      const res = await apiFetch('/api/train', { method: 'POST' });
      setRetrainStatus(res.ok ? 'ok' : 'err');
    } catch { setRetrainStatus('err'); }
    finally { setRetraining(false); }
    setTimeout(() => setRetrainStatus('idle'), 4000);
  };

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-white tracking-tight">
          Platform <span className="text-emerald-400">Settings</span>
        </h1>
        <p className="text-xs text-slate-500 font-mono mt-0.5">
          Configuration, secrets, and model management
          {user && (
            <span className={`ml-3 px-2 py-0.5 rounded-full text-[9px] font-bold border ${user.role === 'admin' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.08]' : 'text-slate-500 border-white/[0.06] bg-white/[0.03]'}`}>
              {user.role === 'admin' ? '👑 Admin' : '🔒 Analyst'}
            </span>
          )}
        </p>
      </div>

      {/* ── API Security (admin only) ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-3">
          <Key size={15} className="text-blue-400" />
          <h2 className="text-xs font-black text-white uppercase tracking-tight">API Security</h2>
          <span className="text-[9px] px-2 py-0.5 rounded-full border border-red-500/20 bg-red-500/[0.07] text-red-400 font-bold">Admin Only</span>
        </div>
        <AdminOnly>
          <div className="glass rounded-2xl p-6">
            <SensitiveSection />
          </div>
        </AdminOnly>
      </motion.div>

      {/* ── Telegram Alerts (admin only) ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
        <div className="flex items-center gap-3 mb-3">
          <Bell size={15} className="text-blue-400" />
          <h2 className="text-xs font-black text-white uppercase tracking-tight">Telegram Alerts</h2>
          <span className="text-[9px] px-2 py-0.5 rounded-full border border-red-500/20 bg-red-500/[0.07] text-red-400 font-bold">Admin Only</span>
        </div>
        <AdminOnly>
          <TelegramSection />
        </AdminOnly>
      </motion.div>

      {/* ── ML Model (all users) ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.05]">
          <Brain size={15} className="text-purple-400" />
          <h2 className="text-xs font-black text-white uppercase tracking-tight">ML Model Management</h2>
          <span className="text-[9px] px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-400 font-bold">All Users</span>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Algorithm',  value: 'Isolation Forest' },
              { label: 'Estimators', value: '200'              },
              { label: 'Features',   value: '25'               },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.05] text-center">
                <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-2">{label}</p>
                <p className="text-sm font-bold text-white font-mono">{value}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={retrain} disabled={retraining}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20">
              <RefreshCw size={13} className={retraining ? 'animate-spin' : ''} />
              {retraining ? 'Retraining...' : 'Retrain Isolation Forest'}
            </button>
            <AnimatePresence>
              {retrainStatus === 'ok' && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                  <CheckCircle size={13} /> Retrained successfully
                </motion.span>
              )}
              {retrainStatus === 'err' && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-red-400 font-semibold">
                  <AlertCircle size={13} /> Retraining failed
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ── System Info (all users) ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.05]">
          <Shield size={15} className="text-emerald-400" />
          <h2 className="text-xs font-black text-white uppercase tracking-tight">System Information</h2>
          <span className="text-[9px] px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-400 font-bold">All Users</span>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-5">
          {[
            { label: 'Platform',  value: 'SentinelCore v2.0'     },
            { label: 'ML Engine', value: 'scikit-learn 1.x'      },
            { label: 'MITRE KB',  value: '35+ ATT&CK Techniques' },
            { label: 'Database',  value: 'SQLite (soc.db)'       },
            { label: 'Backend',   value: 'FastAPI + Uvicorn'     },
            { label: 'Frontend',  value: 'Next.js 16 + Tailwind' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">{label}</p>
              <p className="text-xs font-semibold text-slate-300 font-mono">{value}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
