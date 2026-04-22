import { useState, useEffect, useRef } from 'react';
import { Bell, Clock, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import api from '../api/axios';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch missed / upcoming reminders for notification list
  const { data: upcomingData } = useQuery({
    queryKey: ['reminders', 'upcoming'],
    queryFn: () => api.get('/reminders/upcoming?days=1').then((r) => r.data.data),
    refetchInterval: 60000, // refresh every minute
  });

  const { data: missedData } = useQuery({
    queryKey: ['reminders', 'missed'],
    queryFn: () => api.get('/reminders/missed').then((r) => r.data.data),
  });

  const notifications = [
    ...(missedData || []).map((r) => ({ ...r, notifType: 'missed' })),
    ...(upcomingData || [])
      .filter((r) => {
        const mins = (new Date(r.dueDate) - new Date()) / 60000;
        return mins > 0 && mins <= 60;
      })
      .map((r) => ({ ...r, notifType: 'upcoming' })),
  ].slice(0, 10);

  const badgeCount = notifications.length;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markCompleteMutation = useMutation({
    mutationFn: (id) => api.put(`/reminders/${id}`, { status: 'completed' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {badgeCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white dark:ring-slate-950">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 card shadow-xl z-50 animate-slide-in p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              Notifications {badgeCount > 0 && <span className="ml-1 text-primary-600">({badgeCount})</span>}
            </h3>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X size={16} />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500">
                <CheckCircle size={32} className="mb-2 text-emerald-400" />
                <p className="text-sm font-medium">All caught up!</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n._id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className={`mt-0.5 p-1.5 rounded-lg ${
                    n.notifType === 'missed'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-500'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-500'
                  }`}>
                    {n.notifType === 'missed'
                      ? <AlertTriangle size={14} />
                      : <Clock size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {n.notifType === 'missed' ? '⚠️ Missed · ' : '⏰ Due '}
                      {formatDistanceToNow(new Date(n.dueDate), { addSuffix: true })}
                    </p>
                  </div>
                  {n.notifType === 'missed' && (
                    <button
                      onClick={() => markCompleteMutation.mutate(n._id)}
                      className="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 font-medium shrink-0"
                    >
                      Done
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
