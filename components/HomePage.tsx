import React, { useEffect, useState } from 'react';
import { Plant, Reminder, StorageUsage } from '../types';
import PlantCard from './PlantCard';
import PlusIcon from './icons/PlusIcon';
import CameraIcon from './icons/CameraIcon';

interface HomePageProps {
  plants: Plant[];
  reminders: Reminder[];
  storageUsage: StorageUsage | null;
  userName: string;
  onAddPlant: () => void;
  onSelectPlant: (plantId: string) => void;
  onOpenChat: () => void;
  onOpenCalendar: () => void;
  dueReminderCount: number;
}

const greetings = [
  'Your plants are looking happy today.',
  'Welcome back to your digital greenhouse.',
  'Time to check on your leafy crew.',
  'Your plant history is ready for another update.',
  'Let\'s see how your collection is evolving.',
];

const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const HomePage: React.FC<HomePageProps> = ({ plants, reminders, storageUsage, userName, onAddPlant, onSelectPlant, onOpenChat, onOpenCalendar, dueReminderCount }) => {
  const width = useWindowWidth();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    setGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
  }, []);

  const columnCount = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
  const columns: Plant[][] = Array.from({ length: columnCount }, () => []);
  plants.forEach((plant, index) => {
    columns[index % columns.length].push(plant);
  });

  const upcomingReminders = reminders
    .filter((reminder) => !reminder.completedAt)
    .slice()
    .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt))
    .slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="section-grid mb-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel rounded-[2rem] p-8 text-left animate-fade-in-up">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">Dashboard</p>
          <h1 className="mt-4 font-display text-5xl font-bold tracking-tight text-white">Welcome back, {userName}.</h1>
          <p className="mt-3 text-xl font-semibold text-slate-200">{greeting}</p>
          <p className="mt-5 max-w-2xl text-slate-300">
            Snapshots now go into managed local storage with account limits, reminders are on a calendar, and every change asks for confirmation before it sticks.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={onAddPlant} className="aurora-button rounded-full bg-primary px-5 py-3 text-sm font-semibold text-slate-950">
              Add a Plant
            </button>
            <button onClick={onOpenChat} className="aurora-button rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100">
              Open AI Chat
            </button>
            <button onClick={onOpenCalendar} className="aurora-button rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100">
              Calendar
            </button>
          </div>
          {dueReminderCount > 0 ? (
            <div className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              You have {dueReminderCount} reminder{dueReminderCount === 1 ? '' : 's'} due or overdue in-app. Open Calendar to review them.
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-[2rem] p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Snapshot</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/5 p-5">
                <p className="text-sm text-slate-400">Plants tracked</p>
                <p className="mt-2 font-display text-4xl font-bold text-white">{plants.length}</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-5">
                <p className="text-sm text-slate-400">Snapshots stored</p>
                <p className="mt-2 font-display text-4xl font-bold text-white">{plants.reduce((sum, plant) => sum + plant.snapshots.length, 0)}</p>
              </div>
            </div>
            {storageUsage && (
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Storage used</span>
                  <span>{formatBytes(storageUsage.bytesUsed)} / {formatBytes(storageUsage.bytesLimit)}</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    style={{ width: `${Math.min((storageUsage.bytesUsed / storageUsage.bytesLimit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Upcoming reminders</p>
              <button onClick={onOpenCalendar} className="text-sm font-semibold text-primary">Manage</button>
            </div>
            <div className="mt-4 space-y-3">
              {upcomingReminders.length ? upcomingReminders.map((reminder) => (
                <div key={reminder.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="font-semibold text-white">{reminder.title}</p>
                  <p className="mt-1 text-sm text-slate-300">{new Date(reminder.dueAt).toLocaleString()}</p>
                </div>
              )) : <p className="text-sm text-slate-300">No reminders yet. Add one from Calendar.</p>}
            </div>
          </div>
        </div>
      </div>

      <h2 className="mb-6 font-display text-3xl font-bold text-white">Your Plant Collection</h2>

      {plants.length > 0 ? (
        <div className="flex items-start justify-center gap-6">
          {columns.map((column, index) => (
            <div key={index} className="flex w-full flex-col gap-6">
              {column.map((plant) => (
                <PlantCard key={plant.id} plant={plant} onClick={() => onSelectPlant(plant.id)} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel flex h-[50vh] flex-col items-center justify-center rounded-[2rem] p-8 text-center">
          <CameraIcon className="mb-4 h-24 w-24 text-slate-500" />
          <h2 className="text-2xl font-bold text-white">Your greenhouse is empty</h2>
          <p className="mt-2 text-slate-300">Add your first plant to start building a real timeline and AI memory.</p>
          <button
            onClick={onAddPlant}
            className="aurora-button mt-6 flex items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-medium text-slate-950"
          >
            <PlusIcon className="mr-2 h-5 w-5" />
            Add First Plant
          </button>
        </div>
      )}

      {plants.length > 0 && (
        <button
          onClick={onAddPlant}
          className="aurora-button fixed bottom-8 right-8 z-20 rounded-full bg-primary p-4 text-slate-950 shadow-lg"
          aria-label="Add new plant"
        >
          <PlusIcon className="h-8 w-8" />
        </button>
      )}
    </div>
  );
};

export default HomePage;
