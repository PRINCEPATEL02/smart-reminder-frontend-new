import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, Plus, Clock,
  Calendar as CalIcon, Grid3X3, List,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, addWeeks, subMonths, subWeeks,
  isSameMonth, isSameDay, isToday, parseISO, startOfDay, endOfDay,
} from 'date-fns';
import api from '../api/axios';
import ReminderCard from '../components/ReminderCard';
import ReminderForm from '../components/ReminderForm';
import LoadingSpinner from '../components/LoadingSpinner';

const VIEWS = [
  { id: 'day', label: 'Day', icon: List },
  { id: 'week', label: 'Week', icon: Grid3X3 },
  { id: 'month', label: 'Month', icon: CalIcon },
];

const PRIORITY_DOTS = {
  low: 'bg-emerald-400',
  medium: 'bg-amber-400',
  high: 'bg-orange-400',
  urgent: 'bg-red-500',
};

export default function Calendar() {
  const [view, setView] = useState('week');
  const [current, setCurrent] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);

  // Compute date range for the current view
  const { rangeStart, rangeEnd, label } = useMemo(() => {
    if (view === 'day') {
      return {
        rangeStart: startOfDay(current),
        rangeEnd: endOfDay(current),
        label: format(current, 'EEEE, MMMM d, yyyy'),
      };
    }
    if (view === 'week') {
      const start = startOfWeek(current, { weekStartsOn: 1 });
      const end = endOfWeek(current, { weekStartsOn: 1 });
      return {
        rangeStart: start,
        rangeEnd: end,
        label: `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`,
      };
    }
    return {
      rangeStart: startOfMonth(current),
      rangeEnd: endOfMonth(current),
      label: format(current, 'MMMM yyyy'),
    };
  }, [view, current]);

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders', 'calendar', rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: () =>
      api.get('/reminders', {
        params: {
          startDate: rangeStart.toISOString(),
          endDate: rangeEnd.toISOString(),
          limit: 200,
        },
      }).then((r) => r.data.data),
    staleTime: 1000 * 60 * 2,
  });

  // Navigate
  const goBack = () => {
    if (view === 'day') setCurrent((d) => addDays(d, -1));
    else if (view === 'week') setCurrent((d) => subWeeks(d, 1));
    else setCurrent((d) => subMonths(d, 1));
  };

  const goForward = () => {
    if (view === 'day') setCurrent((d) => addDays(d, 1));
    else if (view === 'week') setCurrent((d) => addWeeks(d, 1));
    else setCurrent((d) => addMonths(d, 1));
  };

  const goToday = () => { setCurrent(new Date()); setSelectedDate(new Date()); };

  // Get reminders for a specific date
  const getRemindersForDate = (date) =>
    reminders.filter((r) => isSameDay(new Date(r.dueDate), date));

  // Selected day reminders (for day view & week click)
  const selectedDayReminders = getRemindersForDate(selectedDate);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Calendar</h1>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <Plus size={18} /> New Reminder
        </button>
      </div>

      {/* Calendar controls */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          {/* Navigation */}
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <ChevronLeft size={18} className="text-slate-600 dark:text-slate-400" />
            </button>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 min-w-[160px] text-center">
              {label}
            </h2>
            <button onClick={goForward} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <ChevronRight size={18} className="text-slate-600 dark:text-slate-400" />
            </button>
            <button onClick={goToday} className="text-xs btn-secondary px-3 py-2">
              Today
            </button>
          </div>

          {/* View switcher */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            {VIEWS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                  view === id
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : (
          <>
            {/* MONTH VIEW */}
            {view === 'month' && (
              <MonthView
                current={current}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                getRemindersForDate={getRemindersForDate}
              />
            )}

            {/* WEEK VIEW */}
            {view === 'week' && (
              <WeekView
                current={current}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                getRemindersForDate={getRemindersForDate}
              />
            )}

            {/* DAY VIEW */}
            {view === 'day' && (
              <DayView reminders={getRemindersForDate(current)} date={current} />
            )}
          </>
        )}
      </div>

      {/* Selected day reminders (month & week view) */}
      {(view === 'month' || view === 'week') && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Clock size={14} className="text-primary-500" />
            {format(selectedDate, 'EEEE, MMMM d')}
            <span className="text-slate-400 font-normal">
              · {selectedDayReminders.length} reminder{selectedDayReminders.length !== 1 ? 's' : ''}
            </span>
          </h3>
          {selectedDayReminders.length === 0 ? (
            <div className="card py-10 text-center text-slate-400 dark:text-slate-500">
              <CalIcon size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No reminders for this day</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayReminders
                .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                .map((r) => <ReminderCard key={r._id} reminder={r} />)}
            </div>
          )}
        </div>
      )}

      {showForm && <ReminderForm onClose={() => setShowForm(false)} />}
    </div>
  );
}

// ── Month View ────────────────────────────────────────────────────────────────
function MonthView({ current, selectedDate, setSelectedDate, getRemindersForDate }) {
  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let d = gridStart;
  while (d <= gridEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {dayNames.map((name) => (
          <div key={name} className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-2">
            {name}
          </div>
        ))}
      </div>
      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayReminders = getRemindersForDate(day);
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, current);
          const todayDay = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={`relative min-h-[64px] p-1.5 rounded-xl text-left transition-all ${
                isSelected
                  ? 'bg-primary-100 dark:bg-primary-900/40 ring-2 ring-primary-500'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
              } ${!isCurrentMonth ? 'opacity-30' : ''}`}
            >
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                todayDay
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-700 dark:text-slate-300'
              }`}>
                {format(day, 'd')}
              </span>
              {dayReminders.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {dayReminders.slice(0, 2).map((r) => (
                    <div key={r._id} className={`w-full h-1.5 rounded-full ${PRIORITY_DOTS[r.priority]}`} />
                  ))}
                  {dayReminders.length > 2 && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">+{dayReminders.length - 2}</p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Week View ─────────────────────────────────────────────────────────────────
function WeekView({ current, selectedDate, setSelectedDate, getRemindersForDate }) {
  const weekStart = startOfWeek(current, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDays.map((day) => {
        const dayReminders = getRemindersForDate(day);
        const isSelected = isSameDay(day, selectedDate);
        const todayDay = isToday(day);

        return (
          <button
            key={day.toISOString()}
            onClick={() => setSelectedDate(day)}
            className={`flex flex-col items-center p-2 rounded-xl transition-all min-h-[100px] ${
              isSelected
                ? 'bg-primary-100 dark:bg-primary-900/40 ring-2 ring-primary-500'
                : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
          >
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {format(day, 'EEE')}
            </span>
            <span className={`text-sm font-bold h-8 w-8 flex items-center justify-center rounded-full ${
              todayDay ? 'bg-primary-600 text-white' : 'text-slate-800 dark:text-slate-200'
            }`}>
              {format(day, 'd')}
            </span>
            <div className="mt-2 flex flex-col gap-1 w-full">
              {dayReminders.slice(0, 3).map((r) => (
                <div
                  key={r._id}
                  className={`w-full h-1.5 rounded-full ${PRIORITY_DOTS[r.priority]}`}
                  title={r.title}
                />
              ))}
              {dayReminders.length > 3 && (
                <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">+{dayReminders.length - 3}</p>
              )}
              {dayReminders.length === 0 && (
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Day View ──────────────────────────────────────────────────────────────────
function DayView({ reminders, date }) {
  // Show hour slots 6am–11pm
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);

  const getReminderForHour = (hour) =>
    reminders.filter((r) => new Date(r.dueDate).getHours() === hour);

  return (
    <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
      {hours.map((hour) => {
        const hourReminders = getReminderForHour(hour);
        const timeLabel = hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
        const nowHour = new Date().getHours();
        const isCurrentHour = isSameDay(date, new Date()) && hour === nowHour;

        return (
          <div
            key={hour}
            className={`flex gap-3 min-h-[52px] ${isCurrentHour ? 'bg-primary-50 dark:bg-primary-900/10 rounded-xl px-2' : ''}`}
          >
            <span className="text-xs text-slate-400 dark:text-slate-500 w-12 shrink-0 pt-2 text-right font-medium">
              {timeLabel}
            </span>
            <div className={`flex-1 border-l-2 pl-3 pt-1.5 ${
              isCurrentHour ? 'border-primary-500' : 'border-slate-100 dark:border-slate-700'
            }`}>
              {hourReminders.map((r) => (
                <div
                  key={r._id}
                  className={`mb-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                    r.status === 'completed'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 line-through'
                      : `bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200`
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${PRIORITY_DOTS[r.priority]}`} />
                    {r.title}
                    <span className="ml-auto text-[10px] opacity-70">{format(new Date(r.dueDate), 'h:mm a')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
