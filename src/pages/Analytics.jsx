import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
  AreaChart, Area,
} from 'recharts';
import {
  TrendingUp, CheckCircle, Clock, AlertTriangle,
  Flame, Target, Zap, Award,
} from 'lucide-react';
import api from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';

const RANGES = [
  { value: '7', label: '7 Days' },
  { value: '30', label: '30 Days' },
  { value: '90', label: '90 Days' },
];

const CATEGORY_COLORS = {
  work: '#6366f1',
  personal: '#8b5cf6',
  health: '#10b981',
  finance: '#f59e0b',
  education: '#3b82f6',
  other: '#6b7280',
};

const PRIORITY_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  urgent: '#ef4444',
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Analytics() {
  const [range, setRange] = useState('30');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'summary', range],
    queryFn: () => api.get(`/analytics/summary?range=${range}`).then((r) => r.data.data),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const categoryData = Object.entries(data?.byCategory || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: CATEGORY_COLORS[name] || '#6b7280',
  }));

  const priorityData = Object.entries(data?.byPriority || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: PRIORITY_COLORS[name],
  }));

  const weekData = (data?.byDayOfWeek || []).map((d, i) => ({
    day: DAY_NAMES[i],
    created: d.created,
    completed: d.completed,
    rate: d.created > 0 ? Math.round((d.completed / d.created) * 100) : 0,
  }));

  const last7 = data?.last7Days || [];

  const statCards = [
    {
      label: 'Completion Rate',
      value: `${data?.completionRate || 0}%`,
      sub: `${data?.completed || 0} of ${data?.total || 0} done`,
      icon: <Target size={20} className="text-primary-500" />,
      bg: 'bg-primary-50 dark:bg-primary-900/20',
      color: 'text-primary-600 dark:text-primary-400',
    },
    {
      label: 'Current Streak',
      value: `${data?.streak || 0}d`,
      sub: 'consecutive completions',
      icon: <Flame size={20} className="text-orange-500" />,
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      color: 'text-orange-600 dark:text-orange-400',
    },
    {
      label: 'Total Completed',
      value: data?.completed || 0,
      sub: `${data?.missed || 0} missed`,
      icon: <CheckCircle size={20} className="text-emerald-500" />,
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Pending Now',
      value: data?.pending || 0,
      sub: 'need attention',
      icon: <Clock size={20} className="text-amber-500" />,
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      color: 'text-amber-600 dark:text-amber-400',
    },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="card shadow-xl px-3 py-2 text-xs">
        <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color || p.fill }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Insights into your reminder habits
          </p>
        </div>
        <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
          {RANGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                range === value
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="card flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.bg}`}>{s.icon}</div>
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{s.label}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Daily activity - last 7 days */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-primary-500" />
            Daily Activity (Last 7 Days)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={last7} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="created" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="completed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="created" stroke="#6366f1" fill="url(#created)" strokeWidth={2} name="Created" />
              <Area type="monotone" dataKey="completed" stroke="#10b981" fill="url(#completed)" strokeWidth={2} name="Completed" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* By category */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Award size={15} className="text-purple-500" />
            By Category
          </h3>
          {categoryData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {categoryData.map((c) => (
                  <div key={c.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ background: c.color }} />
                      <span className="text-xs text-slate-600 dark:text-slate-400">{c.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">No data yet</p>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* By priority */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-500" />
            By Priority
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={priorityData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
                {priorityData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Day of week performance */}
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Zap size={15} className="text-primary-500" />
            Completion Rate by Day
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="rate" name="Completion %" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Smart insight banner */}
      {data?.preferredHours?.length > 0 && (
        <div className="card bg-gradient-to-br from-primary-600 to-purple-700 border-0 text-white">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-white/20">
              <Zap size={22} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-base mb-1">🧠 Smart Insight</p>
              <p className="text-white/90 text-sm">
                You're most productive at{' '}
                {data.preferredHours
                  .map((h) => `${h < 12 ? h : h === 12 ? 12 : h - 12}${h < 12 ? 'am' : 'pm'}`)
                  .join(', ')}.{' '}
                Set reminders at these times for better completion rates.
              </p>
              {data.avgCompletionRate > 0 && (
                <p className="text-white/80 text-xs mt-2">
                  Your overall completion rate: <strong>{Math.round(data.avgCompletionRate)}%</strong>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
