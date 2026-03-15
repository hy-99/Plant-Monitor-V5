import React, { useMemo, useState } from 'react';
import { Plant, Reminder, ReminderRecurrence } from '../types';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import ConfirmationModal from './ConfirmationModal';
import { getSmartReminderSuggestions } from '../utils/plantInsights';

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

interface ConfirmationState {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void | Promise<void>;
}

const recurrenceOptions: Array<{ value: ReminderRecurrence; label: string; description: string }> = [
  { value: 'none', label: 'One time', description: 'Runs once and completes.' },
  { value: 'daily', label: 'Daily', description: 'Repeats every day.' },
  { value: 'weekly', label: 'Weekly', description: 'Repeats every week.' },
  { value: 'monthly', label: 'Monthly', description: 'Repeats every month.' },
];

const reminderTemplates = [
  { title: 'Water plant', notes: 'Check soil first, then water thoroughly if the top layer is dry.', recurrence: 'weekly' as ReminderRecurrence },
  { title: 'Fertilize plant', notes: 'Use a balanced fertilizer at the recommended strength for the season.', recurrence: 'monthly' as ReminderRecurrence },
  { title: 'Rotate plant', notes: 'Turn the pot slightly so growth stays balanced toward the light.', recurrence: 'weekly' as ReminderRecurrence },
  { title: 'Check for pests', notes: 'Inspect leaf undersides, stems, and new growth for early pest signs.', recurrence: 'weekly' as ReminderRecurrence },
  { title: 'Prune damaged leaves', notes: 'Trim yellowing, crispy, or diseased leaves with clean scissors.', recurrence: 'monthly' as ReminderRecurrence },
  { title: 'Repot check', notes: 'Inspect roots, drainage, and soil compaction before deciding to repot.', recurrence: 'monthly' as ReminderRecurrence },
  { title: 'Humidity check', notes: 'Review air dryness and consider grouping plants or using a tray/humidifier.', recurrence: 'daily' as ReminderRecurrence },
  { title: 'Health check photo', notes: 'Take a fresh photo from the same angle to compare changes over time.', recurrence: 'weekly' as ReminderRecurrence },
] as const;

const quickDatePresets = [
  { label: 'Tonight', hours: 8 },
  { label: 'Tomorrow', hours: 24 },
  { label: 'In 3 days', hours: 72 },
  { label: 'Next week', hours: 24 * 7 },
];

const recurrenceLabel = (value: ReminderRecurrence) =>
  recurrenceOptions.find((option) => option.value === value)?.label || value;

const reminderEducationCopy = (title: string) => {
  const normalized = title.toLowerCase();
  if (normalized.includes('water')) {
    return {
      title: 'Why this matters',
      summary: 'Watering reminders are most useful when they trigger a check-in, not blind watering. Use them to confirm soil moisture and leaf turgor before acting.',
    };
  }
  if (normalized.includes('fertilize')) {
    return {
      title: 'Why this matters',
      summary: 'Fertilizer timing teaches growth rhythms. Feeding too often can stress roots, while seasonal timing helps support active growth more safely.',
    };
  }
  if (normalized.includes('photo') || normalized.includes('health check')) {
    return {
      title: 'Why this matters',
      summary: 'Repeat photos from a similar angle are one of the easiest ways to learn whether a plant is recovering, holding steady, or getting worse.',
    };
  }
  if (normalized.includes('pest')) {
    return {
      title: 'Why this matters',
      summary: 'Pest checks work best when they are preventive. Catching an issue early teaches pattern recognition and prevents heavier damage later.',
    };
  }
  return {
    title: 'Why this matters',
    summary: 'A good reminder system turns plant care into an observable routine. Over time, it helps users connect actions with plant outcomes.',
  };
};

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
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [plantId, setPlantId] = useState<string>('');
  const [dueAt, setDueAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>('none');
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);

  const resetForm = () => {
    setEditingReminderId(null);
    setSelectedTemplate('');
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
  const smartSuggestions = useMemo(() => getSmartReminderSuggestions(plants, reminders), [plants, reminders]);
  const dueTodayCount = useMemo(
    () => reminders.filter((reminder) => !reminder.completedAt && new Date(reminder.dueAt).toDateString() === new Date().toDateString()).length,
    [reminders]
  );
  const overdueCount = useMemo(
    () => reminders.filter((reminder) => !reminder.completedAt && new Date(reminder.dueAt).getTime() < Date.now()).length,
    [reminders]
  );
  const completedCount = useMemo(
    () => reminders.filter((reminder) => Boolean(reminder.completedAt)).length,
    [reminders]
  );
  const activeEducation = reminderEducationCopy(title || selectedTemplate || 'reminder');

  const handleEdit = (reminder: Reminder) => {
    setEditingReminderId(reminder.id);
    setSelectedTemplate('');
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

    setConfirmation({
      title: editingReminderId ? 'Save these reminder changes?' : 'Create this reminder?',
      message: editingReminderId
        ? 'This will update the reminder details and keep the new schedule on your calendar.'
        : 'This reminder will be added to your calendar and included in your plant care routine.',
      confirmLabel: editingReminderId ? 'Save Reminder' : 'Create Reminder',
      onConfirm: async () => {
        if (editingReminderId) {
          await onUpdateReminder(editingReminderId, payload);
        } else {
          await onCreateReminder(payload);
        }
        resetForm();
      },
    });
  };

  const applyTemplate = (templateTitle: string) => {
    const template = reminderTemplates.find((item) => item.title === templateTitle);
    if (!template) return;
    setSelectedTemplate(templateTitle);
    setTitle(template.title);
    setNotes(template.notes);
    setRecurrence(template.recurrence);
  };

  const applyQuickDate = (hours: number) => {
    const next = new Date(Date.now() + hours * 60 * 60 * 1000);
    setDueAt(next.toISOString().slice(0, 16));
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {confirmation && (
        <ConfirmationModal
          title={confirmation.title}
          message={confirmation.message}
          confirmLabel={confirmation.confirmLabel}
          tone={confirmation.tone}
          onConfirm={confirmation.onConfirm}
          onClose={() => setConfirmation(null)}
        />
      )}
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
              <p className="mt-2 text-sm text-slate-300">Build a care rhythm, keep actions visible, and turn reminders into a plant-learning routine instead of a loose checklist.</p>
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
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="glass-panel rounded-[2rem] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Due today</p>
              <p className="mt-2 font-display text-3xl text-white">{dueTodayCount}</p>
              <p className="mt-2 text-sm text-slate-300">Actions waiting for today&apos;s care window.</p>
            </div>
            <div className="glass-panel rounded-[2rem] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Overdue</p>
              <p className="mt-2 font-display text-3xl text-white">{overdueCount}</p>
              <p className="mt-2 text-sm text-slate-300">Older reminders that may need a reset or a fresh plan.</p>
            </div>
            <div className="glass-panel rounded-[2rem] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Completed</p>
              <p className="mt-2 font-display text-3xl text-white">{completedCount}</p>
              <p className="mt-2 text-sm text-slate-300">Finished care actions already logged in the app.</p>
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Smart reminders</p>
                <p className="mt-2 text-sm text-slate-300">Suggested watering, fertilizing, and check-in schedules based on plant type, season, and recent photo health.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {smartSuggestions.length ? smartSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{suggestion.title}</p>
                      <p className="mt-1 text-sm text-slate-300">{suggestion.reason}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-400">
                        {new Date(suggestion.dueAt).toLocaleDateString()} | {recurrenceLabel(suggestion.recurrence)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await onCreateReminder({
                          plantId: suggestion.plantId,
                          title: suggestion.title,
                          notes: suggestion.notes,
                          dueAt: suggestion.dueAt,
                          recurrence: suggestion.recurrence,
                        });
                      }}
                      className="aurora-button rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-300"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )) : <p className="text-sm text-slate-300">No smart suggestions right now. Your existing reminder schedule already covers the current needs.</p>}
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{editingReminder ? 'Edit reminder' : 'New reminder'}</p>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">Reminder type</label>
                <select
                  value={selectedTemplate}
                  onChange={(event) => applyTemplate(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                >
                  <option value="">Custom reminder</option>
                  {reminderTemplates.map((template) => (
                    <option key={template.title} value={template.title}>{template.title}</option>
                  ))}
                </select>
              </div>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Water monstera" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" />
              <select value={plantId} onChange={(event) => setPlantId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none">
                <option value="">General reminder</option>
                {plants.map((plant) => <option key={plant.id} value={plant.id}>{plant.name}</option>)}
              </select>
              <input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" />
              <div className="flex flex-wrap gap-2">
                {quickDatePresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyQuickDate(preset.hours)}
                    className="aurora-button rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <select value={recurrence} onChange={(event) => setRecurrence(event.target.value as ReminderRecurrence)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none">
                {recurrenceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <p className="text-xs text-slate-400">{recurrenceOptions.find((option) => option.value === recurrence)?.description}</p>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Optional notes" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" />
              <div className="flex gap-3">
                <button type="submit" disabled={isWorking} className="aurora-button rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 font-semibold text-cyan-300 disabled:opacity-50">
                  {editingReminder ? 'Update Reminder' : 'Create Reminder'}
                </button>
                {editingReminder && (
                  <button type="button" onClick={resetForm} className="aurora-button rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-200">
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-primary">{activeEducation.title}</p>
              <p className="mt-2 text-sm text-slate-300">{activeEducation.summary}</p>
            </div>
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
                      <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">{recurrenceLabel(reminder.recurrence)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(reminder)} className="aurora-button rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">Edit</button>
                      <button
                        onClick={() =>
                          setConfirmation({
                            title: 'Complete this reminder?',
                            message: 'This will mark the reminder as completed and keep that care action in your record.',
                            confirmLabel: 'Complete Reminder',
                            onConfirm: () => onCompleteReminder(reminder.id),
                          })
                        }
                        className="aurora-button rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-300"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() =>
                          setConfirmation({
                            title: 'Delete this reminder?',
                            message: 'This reminder will be removed from the calendar. This is useful when the care plan has changed and the reminder no longer fits.',
                            confirmLabel: 'Delete Reminder',
                            tone: 'danger',
                            onConfirm: async () => {
                              await onDeleteReminder(reminder.id);
                              if (editingReminderId === reminder.id) resetForm();
                            },
                          })
                        }
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
