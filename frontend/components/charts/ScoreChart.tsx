'use client';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

interface Point { label: string; score: number }

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { value: number; payload: Point }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1b2e] border border-white/10 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 font-mono mb-0.5">{payload[0]?.payload?.label}</p>
      <p className="text-emerald-400 font-bold font-mono">Score: {payload[0]?.value?.toFixed(3)}</p>
    </div>
  );
}

export default function ScoreChart({ data }: { data: Point[] }) {
  if (!data.length) return (
    <div className="h-40 flex items-center justify-center text-slate-600 text-xs">
      No events yet — run a simulation
    </div>
  );
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="label" tick={false} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 1]}
          tick={{ fill: '#475569', fontSize: 10, fontFamily: 'monospace' }}
          axisLine={false} tickLine={false} tickCount={4} />
        <Tooltip content={<CustomTooltip />}
          cursor={{ stroke: 'rgba(59,130,246,0.2)', strokeWidth: 1 }} />
        <Area type="monotone" dataKey="score"
          stroke="#3b82f6" strokeWidth={1.5}
          fill="url(#scoreGrad)" dot={false}
          activeDot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
