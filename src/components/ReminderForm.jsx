import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Sparkles, Calendar, Clock, Tag, AlignLeft, Zap } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../api/axios';

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400' },
  { value: 'medium', label: 'Medium', color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400' },
  { value: 'high', label: 'High', color: 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-400' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400' },
];

const CATEGORIES = ['work', 'personal', 'health', 'finance', 'education', 'other'];
const RECURRENCES = ['none', 'daily', 'weekly', 'monthly'];

const defaultForm = {
  title: '',
  description: '',
  dueDate: '',
  dueTime: '',
  priority: 'medium',
  category: 'other',
  tags: '',
  recurrence: 'none',
};

export default function ReminderForm({ reminder = null, onClose }) {
  const [form, setForm] = useState(() => {
    if (reminder) {
      const d = new Date(reminder.dueDate);
      return {
        title: reminder.title || '',
        description: reminder.description || '',
        dueDate: format(d, 'yyyy-MM-dd'),
        dueTime: format(d, 'HH:mm'),
        priority: reminder.priority || 'medium',
        category: reminder.category || 'other',
        tags: (reminder.tags || []).join(', '),
        recurrence: reminder.recurrence || 'none',
      };
    }
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    return {
      ...defaultForm,
      dueDate: format(now, 'yyyy-MM-dd'),
      dueTime: format(now, 'HH:mm'),
    };
  });

  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();

  // Smart suggestions
  const { data: suggestions } = useQuery({
    queryKey: ['smart-suggestions'],
    queryFn: () => api.get('/reminders/smart-suggestions').then((r) => r.data.data),
    staleTime: 1000 * 60 * 5,
    enabled: !reminder,
  });

  const isEditing = Boolean(reminder);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEditing
        ? api.put(`/reminders/${reminder._id}`, payload)
        : api.post('/reminders', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success(isEditing ? 'Reminder updated!' : 'Reminder created!');
      onClose();
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Something went wrong';
      toast.error(msg);
    },
  });

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.dueDate) errs.dueDate = 'Date is required';
    if (!form.dueTime) errs.dueTime = 'Time is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const dueDate = new Date(`${form.dueDate}T${form.dueTime}`);
    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    mutation.mutate({ ...form, dueDate: dueDate.toISOString(), tags });
  };

  const applySuggestion = (suggestion) => {
    const d = new Date(suggestion.datetime);
    setForm((f) => ({
      ...f,
      dueDate: format(d, 'yyyy-MM-dd'),
      dueTime: format(d, 'HH:mm'),
    }));
    toast.success('Smart time applied!');
  };

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg card shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
              <Zap size={15} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isEditing ? 'Edit Reminder' : 'New Reminder'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Smart suggestions */}
        {!isEditing && suggestions?.length > 0 && (
          <div className="mb-5 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-700 dark:text-primary-400 mb-2">
              <Sparkles size={13} />
              Smart Time Suggestions
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applySuggestion(s)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-all font-medium"
                >
                  {format(new Date(s.datetime), 'EEE, MMM d · h:mm a')}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="label">Title *</label>
            <input
              type="text"
              className={`input ${errors.title ? 'border-red-400 focus:ring-red-400' : ''}`}
              placeholder="What do you need to remember?"
              value={form.title}
              onChange={set('title')}
              maxLength={100}
              autoFocus
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="label">
              <AlignLeft size={13} className="inline mr-1" />
              Description
            </label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Add more details..."
              value={form.description}
              onChange={set('description')}
              maxLength={500}
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">
                <Calendar size={13} className="inline mr-1" />
                Date *
              </label>
              <input
                type="date"
                className={`input ${errors.dueDate ? 'border-red-400' : ''}`}
                value={form.dueDate}
                onChange={set('dueDate')}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
              {errors.dueDate && <p className="mt-1 text-xs text-red-500">{errors.dueDate}</p>}
            </div>
            <div>
              <label className="label">
                <Clock size={13} className="inline mr-1" />
                Time *
              </label>
              <input
                type="time"
                className={`input ${errors.dueTime ? 'border-red-400' : ''}`}
                value={form.dueTime}
                onChange={set('dueTime')}
              />
              {errors.dueTime && <p className="mt-1 text-xs text-red-500">{errors.dueTime}</p>}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="label">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, priority: value }))}
                  className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                    form.priority === value ? color + ' border-current' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Category & Recurrence */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select className="input capitalize" value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Repeat</label>
              <select className="input capitalize" value={form.recurrence} onChange={set('recurrence')}>
                {RECURRENCES.map((r) => (
                  <option key={r} value={r} className="capitalize">{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="label">
              <Tag size={13} className="inline mr-1" />
              Tags <span className="font-normal text-slate-400">(comma separated)</span>
            </label>
            <input
              type="text"
              className="input"
              placeholder="work, urgent, review"
              value={form.tags}
              onChange={set('tags')}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {mutation.isPending ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Zap size={15} />
              )}
              {isEditing ? 'Save Changes' : 'Create Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
