import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check, Trash2, Edit2, Clock, RefreshCw, Bell,
  ChevronDown, Tag, Repeat, MoreHorizontal,
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../api/axios';
import ReminderForm from './ReminderForm';

const PRIORITY_STYLES = {
  low: 'priority-low',
  medium: 'priority-medium',
  high: 'priority-high',
  urgent: 'priority-urgent',
};

const STATUS_STYLES = {
  pending: 'status-pending',
  completed: 'status-completed',
  missed: 'status-missed',
  snoozed: 'status-snoozed',
};

const PRIORITY_BORDERS = {
  low: 'border-l-emerald-400',
  medium: 'border-l-amber-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-500',
};

export default function ReminderCard({ reminder, compact = false }) {
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['reminders'] });
    qc.invalidateQueries({ queryKey: ['reminders', 'today'] });
    qc.invalidateQueries({ queryKey: ['reminders', 'upcoming'] });
    qc.invalidateQueries({ queryKey: ['analytics'] });
  };

  const completeMutation = useMutation({
    mutationFn: () => api.put(`/reminders/${reminder._id}`, { status: 'completed' }),
    onSuccess: () => { invalidate(); toast.success('Marked as complete! 🎉'); },
    onError: () => toast.error('Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/reminders/${reminder._id}`),
    onSuccess: () => { invalidate(); toast.success('Reminder deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  const snoozeMutation = useMutation({
    mutationFn: (minutes) => api.post(`/reminders/${reminder._id}/snooze`, { minutes }),
    onSuccess: (_, mins) => { invalidate(); toast.success(`Snoozed for ${mins} minutes`); },
    onError: () => toast.error('Failed to snooze'),
  });

  const rescheduleMutation = useMutation({
    mutationFn: () => api.post(`/reminders/${reminder._id}/reschedule`),
    onSuccess: () => { invalidate(); toast.success('Rescheduled to next optimal time'); },
    onError: () => toast.error('Failed to reschedule'),
  });

  const isOverdue = isPast(new Date(reminder.dueDate)) && reminder.status === 'pending';
  const isDone = reminder.status === 'completed';

  return (
    <>
      {editing && (
        <ReminderForm reminder={reminder} onClose={() => setEditing(false)} />
      )}

      <div
        className={`card border-l-4 ${PRIORITY_BORDERS[reminder.priority]} transition-all duration-200 hover:shadow-md group animate-fade-in ${
          isDone ? 'opacity-70' : ''
        } ${isOverdue ? 'ring-1 ring-red-200 dark:ring-red-900/50' : ''}`}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          {/* Complete button */}
          {!isDone && (
            <button
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all flex items-center justify-center group-hover:border-emerald-400"
            >
              {completeMutation.isPending && (
                <div className="h-3 w-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          )}
          {isDone && (
            <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check size={11} className="text-white" strokeWidth={3} />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm text-slate-900 dark:text-slate-100 ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
              {reminder.title}
            </p>
            {!compact && reminder.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                {reminder.description}
              </p>
            )}
          </div>

          {/* Menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all"
            >
              <MoreHorizontal size={15} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 w-44 card p-1 shadow-xl z-10 animate-slide-in">
                <button onClick={() => { setEditing(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                  <Edit2 size={14} /> Edit
                </button>
                {reminder.status !== 'completed' && (
                  <>
                    <button onClick={() => { snoozeMutation.mutate(30); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                      <Bell size={14} /> Snooze 30 min
                    </button>
                    <button onClick={() => { rescheduleMutation.mutate(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                      <RefreshCw size={14} /> Auto-reschedule
                    </button>
                  </>
                )}
                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                <button
                  onClick={() => {
                    if (confirm('Delete this reminder?')) {
                      deleteMutation.mutate();
                      setMenuOpen(false);
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span className={`badge ${STATUS_STYLES[reminder.status]}`}>
            {reminder.status}
          </span>
          <span className={`badge ${PRIORITY_STYLES[reminder.priority]}`}>
            {reminder.priority}
          </span>
          <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
            {reminder.category}
          </span>
          {reminder.recurrence !== 'none' && (
            <span className="badge bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 flex items-center gap-1">
              <Repeat size={9} />
              {reminder.recurrence}
            </span>
          )}
          {isOverdue && (
            <span className="badge bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold">
              Overdue
            </span>
          )}
        </div>

        {/* Due date */}
        <div className="flex items-center justify-between mt-3">
          <div className={`flex items-center gap-1.5 text-xs ${
            isOverdue
              ? 'text-red-500 dark:text-red-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}>
            <Clock size={11} />
            <span>{format(new Date(reminder.dueDate), 'MMM d, yyyy · h:mm a')}</span>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {formatDistanceToNow(new Date(reminder.dueDate), { addSuffix: true })}
          </span>
        </div>

        {/* Tags */}
        {!compact && reminder.tags?.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <Tag size={10} className="text-slate-400" />
            {reminder.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
