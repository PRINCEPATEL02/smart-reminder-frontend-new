import { useState, lazy, Suspense } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, CheckCircle, Clock, AlertTriangle, Zap,
  Search, Sparkles, Flame,
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ReminderCard from '../components/ReminderCard';
import ReminderForm from '../components/ReminderForm';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'missed', label: 'Missed' },
  { value: 'snoozed', label: 'Snoozed' },
];

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest' },
  { value: 'dueDate', label: 'Due Soon' },
  { value: '-priority', label: 'Priority' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [page, setPage] = useState(1);

  // Today's reminders
  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['reminders', 'today'],
    queryFn: () => api.get('/reminders/today').then((r) => r.data.data),
    refetchInterval: 60000,
  });

  // All reminders (paginated + filtered)
  const { data: allData, isLoading: allLoading, isFetching } = useQuery({
    queryKey: ['reminders', { status: statusFilter, search, sort, page }],
    queryFn: () =>
      api.get('/reminders', {
        params: { status: statusFilter, search, sort, page, limit: 10 },
      }).then((r) => r.data),
    keepPreviousData: true,
  });

  // Upcoming reminders for smart banner
  const { data: upcomingData } = useQuery({
    queryKey: ['reminders', 'upcoming'],
    queryFn: () => api.get('/reminders/upcoming?days=3').then((r) => r.data.data),
    staleTime: 1000 * 60 * 5,
  });

  // Analytics summary for stat cards
  const { data: analyticsData } = useQuery({
    queryKey: ['analytics', 'summary', '7'],
    queryFn: () => api.get('/analytics/summary?range=7').then((r) => r.data.data),
    staleTime: 1000 * 60 * 5,
  });

  const reminders = allData?.data || [];
  const pagination = allData?.pagination;
  const todayReminders = todayData || [];
  const todayDailyHabits = todayReminders.filter((r) => r.isHabit && r.recurrence === 'daily');
  const dailyHabitsDone = todayDailyHabits.filter((r) => r.status === 'completed').length;
  const todayPending = todayReminders.filter((r) => r.status === 'pending').length;
  const todayCompleted = todayReminders.filter((r) => r.status === 'completed').length;
  const upcoming7 = upcomingData?.length || 0;
  const activeHabits = reminders.filter((r) => r.isHabit).length;
  const dailyStreak = analyticsData?.dailyHabitStreak || 0;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['reminders'] });
    qc.invalidateQueries({ queryKey: ['reminders', 'today'] });
    qc.invalidateQueries({ queryKey: ['reminders', 'upcoming'] });
    qc.invalidateQueries({ queryKey: ['analytics'] });
  };

  const completeTodayMutation = useMutation({
    mutationFn: (id) => api.put(`/reminders/${id}`, { status: 'completed' }),
    onSuccess: () => {
      invalidate();
      toast.success('Habit checked for today');
    },
    onError: () => toast.error('Could not mark habit complete'),
  });

  const stats = [
    {
      label: "Today's Tasks",
      value: todayReminders.length,
      sub: `${todayPending} pending`,
      icon: <Clock size={20} className="text-blue-500" />,
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Completed',
      value: analyticsData?.completed || 0,
      sub: `${analyticsData?.completionRate || 0}% rate`,
      icon: <CheckCircle size={20} className="text-emerald-500" />,
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: 'Active Habits',
      value: activeHabits,
      sub: `${dailyStreak} day daily streak`,
      icon: <Flame size={20} className="text-amber-500" />,
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: 'Missed',
      value: analyticsData?.missed || 0,
      sub: 'this week',
      icon: <AlertTriangle size={20} className="text-red-500" />,
      bg: 'bg-red-50 dark:bg-red-900/20',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Good {getGreeting()}, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} ·{' '}
            {todayPending > 0
              ? `${todayPending} task${todayPending > 1 ? 's' : ''} remaining today`
              : 'All caught up today 🎉'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <Plus size={18} />
          New Reminder / Habit
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.bg}`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{s.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{s.label}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Today's schedule */}
      {todayReminders.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Clock size={15} className="text-primary-500" />
              Today's Schedule
            </h2>
            {todayDailyHabits.length > 0 && (
              <span className="text-xs px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                Daily habits {dailyHabitsDone}/{todayDailyHabits.length}
              </span>
            )}
          </div>
          {todayLoading ? (
            <div className="flex justify-center py-4"><LoadingSpinner /></div>
          ) : (
            <div className="space-y-1">
              {todayReminders
                .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                .map((r) => (
                  <div key={r._id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    r.status === 'completed'
                      ? 'opacity-50'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}>
                    {r.isHabit ? (
                      <button
                        type="button"
                        disabled={r.status === 'completed' || completeTodayMutation.isPending}
                        onClick={() => completeTodayMutation.mutate(r._id)}
                        className={`h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                          r.status === 'completed'
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                        }`}
                        title="Mark today's habit done"
                      >
                        <CheckCircle size={12} />
                      </button>
                    ) : (
                    <div className={`h-2 w-2 rounded-full shrink-0 ${
                      r.status === 'completed' ? 'bg-emerald-400' :
                      r.priority === 'urgent' ? 'bg-red-500' :
                      r.priority === 'high' ? 'bg-orange-400' : 'bg-primary-500'
                    }`} />
                    )}
                    <p className={`text-sm flex-1 ${r.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {r.title}
                    </p>
                    {r.isHabit && (
                      <span className="text-[11px] px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 shrink-0">
                        {r.streakCurrent || 0} streak
                      </span>
                    )}
                    <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                      {format(new Date(r.dueDate), 'h:mm a')}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* All Reminders with filters */}
      <div>
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reminders..."
              className="input pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          {/* Status filter */}
          <select
            className="input sm:w-36"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            {FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {/* Sort */}
          <select
            className="input sm:w-36"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* List */}
        {allLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : reminders.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-4">
              <Sparkles size={28} className="text-primary-500" />
            </div>
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">No reminders found</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-5">
              {search || statusFilter ? 'Try adjusting your filters' : 'Create your first smart reminder!'}
            </p>
            {!search && !statusFilter && (
              <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                <Plus size={16} /> Create Reminder
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={`space-y-3 transition-opacity ${isFetching ? 'opacity-70' : 'opacity-100'}`}>
              {reminders.map((r) => (
                <ReminderCard key={r._id} reminder={r} />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  disabled={!pagination.hasPrev}
                  onClick={() => setPage((p) => p - 1)}
                  className="btn-secondary px-4 py-2 text-sm disabled:opacity-40"
                >
                  ← Prev
                </button>
                <span className="text-sm text-slate-500 dark:text-slate-400 px-2">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  disabled={!pagination.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn-secondary px-4 py-2 text-sm disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Form modal */}
      {showForm && <ReminderForm onClose={() => setShowForm(false)} />}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
