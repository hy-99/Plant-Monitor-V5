import React, { useMemo, useState } from 'react';
import { Plant, Reminder, ReminderRecurrence } from '../types';
import ArrowLeftIcon from './icons/ArrowLeftIcon';

interface CalendarPageProps {
  plants: Plant[];
  reminders: Reminder[];
  onBack: () => void;
  onCreateReminder: (payload: { plantId: string | null; title: string; notes?: string; dueAt: string; recurrence: ReminderRecurrence }) => Promise<void>;
  onUpdateReminder: (reminderId: string, payload: { plantId: string | null; title: string; notes?: string; dueAt: string; recurrence: ReminderRecurrence }) => Promise<void>;
  onCompleteReminder: (reminderId: string) => Promise<void>;
  onDeleteReminder: (reminderId: string) => Promise<void>;
  isWorking: boolean;
}

const recurrenceOptions: ReminderRecurrence[] = ['none', 'daily', 'weekly', 'monthly'];

const startOfMonthGrid = (cursor: Date) => {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  first.setDate(first.getDate() - offset);
  return first;
};

const CalendarPage: React.FC<CalendarPageProps> = ({
  plants,
  reminders,
  onBack,
  onCreateReminder,
  onUpdateReminder,
  onCompleteReminder,
  onDeleteReminder,
  isWorking,
}) => {
  const [cursor, setCursor] = useState(() => new Date());
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const editingReminder = reminders.find((item) => item.id === editingReminderId) || null;
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [plantId, setPlantId] = useState<string>('');
  const [dueAt, setDueAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>('none');

  const resetForm = () => {
    setEditingReminderId(null);
    setTitle('');
    setNotes('');
    setPlantId('');
    setDueAt(new Date().toISOString().slice(0, 16));
    setRecurrence('none');
  };

  const dayCells = useMemo(() => {
    const first = startOfMonthGrid(cursor);
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(first);
      day.setDate(first.getDate() + index);
      return day;
    });
  }, [cursor]);

  const remindersByDay = useMemo(() => {
    const map = new Map<string, Reminder[]>();
    for (const reminder of reminders) {
      const key = new Date(reminder.dueAt).toISOString().slice(0, 10);
      const list = map.get(key) || [];
      list.push(reminder);
      map.set(key, list);
    }
    return map;
  }, [reminders]);

  const upcoming = useMemo(
    () => reminders.slice().sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt)),
    [reminders]
  );

  const handleEdit = (reminder: Reminder) => {
    setEditingReminderId(reminder.id);
    setTitle(reminder.title);
    setNotes(reminder.notes || '');
    setPlantId(reminder.plantId || '');
    setDueAt(new Date(reminder.dueAt).toISOString().slice(0, 16));
    setRecurrence(reminder.recurrence);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      notes: notes.trim() || undefined,
      plantId: plantId || null,
      dueAt: new Date(dueAt).toISOString(),
      recurrence,
    };

    const confirmed = window.confirm(
      editingReminderId
        ? 'Keep these reminder changes?'
        : 'Create this reminder and keep it on your calendar?'
    );
    if (!confirmed) return;

    if (editingReminderId) {
      await onUpdateReminder(editingReminderId, payload);
    } else {
      await onCreateReminder(payload);
    }
    resetForm();
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-primary">
          <ArrowLeftIcon className="h-5 w-5" />
          Back to dashboard
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="glass-panel rounded-[2rem] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Calendar</p>
              <h1 className="mt-2 font-display text-3xl font-bold text-white">
                {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h1>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="aurora-button rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200">Prev</button>
              <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="aurora-button rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200">Next</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.24em] text-slate-400">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day}>{day}</div>)}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-2">
            {dayCells.map((day) => {
              const key = day.toISOString().slice(0, 10);
              const dayReminders = remindersByDay.get(key) || [];
              const inMonth = day.getMonth() === cursor.getMonth();
              return (
                <div key={key} className={`min-h-28 rounded-2xl border p-3 ${inMonth ? 'border-white/10 bg-white/5' : 'border-white/5 bg-white/[0.03]'}`}>
                  <div className={`text-sm font-semibold ${inMonth ? 'text-white' : 'text-slate-500'}`}>{day.getDate()}</div>
                  <div className="mt-2 space-y-2">
                    {dayReminders.slice(0, 3).map((reminder) => (
                      <button
                        key={reminder.id}
                        onClick={() => handleEdit(reminder)}
                        className={`block w-full rounded-xl px-2 py-1 text-left text-xs ${reminder.completedAt ? 'bg-emerald-500/15 text-emerald-200' : 'bg-primary/15 text-cyan-100'}`}
                      >
                        {reminder.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          <div className="glass-panel rounded-[2rem] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{editingReminder ? 'Edit reminder' : 'New reminder'}</p>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Water monstera" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" />
              <select value={plantId} onChange={(event) => setPlantId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none">
                <option value="">General reminder</option>
                {plants.map((plant) => <option key={plant.id} value={plant.id}>{plant.name}</option>)}
              </select>
              <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" />
              <select value={recurrence} onChange={(event) => setRecurrence(event.target.value as ReminderRecurrence)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none">
                {recurrenceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Optional notes" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" />
              <div className="flex gap-3">
                <button type="submit" disabled={isWorking} className="aurora-button rounded-2xl bg-primary px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">
                  {editingReminder ? 'Update Reminder' : 'Create Reminder'}
                </button>
                {editingReminder && (
                  <button type="button" onClick={resetForm} className="aurora-button rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-200">
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Upcoming</p>
            <div className="mt-4 space-y-3">
              {upcoming.length ? upcoming.map((reminder) => (
                <div key={reminder.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{reminder.title}</p>
                      <p className="mt-1 text-sm text-slate-300">{new Date(reminder.dueAt).toLocaleString()}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">{reminder.recurrence}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(reminder)} className="aurora-button rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">Edit</button>
                      <button
                        onClick={async () => {
                          if (window.confirm('Keep this reminder completion?')) {
                            await onCompleteReminder(reminder.id);
                          }
                        }}
                        className="aurora-button rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-slate-950"
                      >
                        Complete
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm('Delete this reminder and keep that change?')) {
                            await onDeleteReminder(reminder.id);
                            if (editingReminderId === reminder.id) resetForm();
                          }
                        }}
                        className="aurora-button rounded-xl border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )) : <p className="text-sm text-slate-300">No reminders yet.</p>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CalendarPage;
