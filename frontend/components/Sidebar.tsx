'use client';
import { useState, useEffect, useCallback, memo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  LayoutDashboard,
  ListFilter,
  BarChart3,
  Terminal,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
  Wifi,
  Globe,
} from 'lucide-react';
import { clearAuth, getUser, AuthUser } from '@/lib/auth';

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard,  desc: 'Overview & stats'     },
  { href: '/events',     label: 'Events',      icon: ListFilter,       desc: 'Anomaly feed'         },
  { href: '/analytics',  label: 'Analytics',   icon: BarChart3,        desc: 'ML insights'          },
  { href: '/agents',     label: 'Agents',      icon: Terminal,         desc: 'Endpoint connectors'  },
  { href: '/settings',   label: 'Settings',    icon: Settings,         desc: 'Platform config'      },
];

function Sidebar() {
  const pathname   = usePathname();
  const router     = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  // Defer localStorage read to client to avoid SSR/hydration mismatch
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => { setUser(getUser()); }, []);

  const handleLogout = useCallback(() => {
    clearAuth();
    router.replace('/login');
  }, [router]);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex flex-col h-screen bg-[#060a0f] border-r border-emerald-500/[0.08] shrink-0 overflow-hidden z-20"
    >
      {/* Top logo — click to go home */}
      <Link href="/" className="flex items-center gap-3 px-4 h-16 border-b border-emerald-500/[0.08] shrink-0 group hover:bg-emerald-500/[0.03] transition-colors">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 group-hover:shadow-emerald-500/50 transition-shadow">
          <ShieldAlert size={16} className="text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="min-w-0 flex-1"
            >
              <p className="text-white font-black text-sm tracking-tight leading-none font-mono">
                SENTINEL<span className="text-emerald-400">AI</span>
              </p>
              <p className="text-[9px] text-emerald-600/60 font-mono tracking-[0.2em] uppercase mt-0.5">
                SOC // v2.0
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </Link>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ x: collapsed ? 0 : 3 }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors relative group ${
                  active
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                  />
                )}
                <Icon size={18} className="shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-xs font-semibold tracking-wide whitespace-nowrap"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Tooltip on collapse */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#060a0f] border border-emerald-500/20 rounded-lg text-xs text-emerald-300 font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl shadow-black/80">
                    {label}
                  </div>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-4 space-y-1 border-t border-emerald-500/[0.08] pt-3 shrink-0">
        {/* System status */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-3 py-2 mb-1 rounded-lg border border-emerald-500/[0.08] bg-emerald-500/[0.03]"
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span className="text-[9px] text-emerald-400 font-mono tracking-[0.18em] uppercase">SYS ONLINE</span>
              <Activity size={10} className="text-emerald-600/50 ml-auto" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* User pill */}
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-600 to-blue-700 flex items-center justify-center text-[11px] font-black text-white uppercase shrink-0 shadow-md shadow-emerald-900/50">
            {user?.username?.[0] ?? 'A'}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-xs font-semibold text-white truncate">{user?.username ?? 'admin'}</p>
                <p className="text-[9px] text-emerald-600/70 font-mono tracking-[0.15em] uppercase">[{user?.role ?? 'analyst'}]</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Back to landing site */}
        <Link
          href="/"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:text-emerald-300 hover:bg-emerald-500/[0.06] border border-transparent hover:border-emerald-500/[0.12] transition-colors group relative ${collapsed ? 'justify-center' : ''}`}
        >
          <Globe size={15} className="shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-xs font-mono tracking-wide">
                Back to Site
              </motion.span>
            )}
          </AnimatePresence>
          {collapsed && (
            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#060a0f] border border-emerald-500/20 rounded-lg text-xs text-emerald-300 font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
              Back to Site
            </div>
          )}
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/[0.08] border border-transparent hover:border-red-500/[0.12] transition-colors group relative ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={16} className="shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs font-mono tracking-wide"
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
          {collapsed && (
            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#060a0f] border border-red-500/20 rounded-lg text-xs text-red-300 font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
              Sign Out
            </div>
          )}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="absolute top-[54px] -right-3 w-6 h-6 rounded-full bg-[#060a0f] border border-emerald-500/20 flex items-center justify-center text-slate-500 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors z-30 shadow-lg"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  );
}

// Memoised: Sidebar never re-renders on page navigation unless user/collapsed changes
export default memo(Sidebar);
