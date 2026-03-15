import React, { useEffect, useState } from 'react';
import { Plant, Reminder, StorageUsage } from '../types';
import PlantCard from './PlantCard';
import PlusIcon from './icons/PlusIcon';
import CameraIcon from './icons/CameraIcon';
import { getCollectionInsights, getPlantTrend } from '../utils/plantInsights';

interface PendingPlantCollapse {
  plant: Plant;
  phase: 'waiting' | 'shattering';
}

interface HomePageProps {
  plants: Plant[];
  pendingPlantCollapse: PendingPlantCollapse | null;
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

const HomePage: React.FC<HomePageProps> = ({ plants, pendingPlantCollapse, reminders, storageUsage, userName, onAddPlant, onSelectPlant, onOpenChat, onOpenCalendar, dueReminderCount }) => {
  const width = useWindowWidth();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    setGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
  }, []);

  const columnCount = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
  const visiblePlants =
    pendingPlantCollapse?.phase === 'shattering'
      ? plants.filter((plant) => plant.id !== pendingPlantCollapse.plant.id)
      : plants;
  const columns: Plant[][] = Array.from({ length: columnCount }, () => []);
  visiblePlants.forEach((plant, index) => {
    columns[index % columns.length].push(plant);
  });

  const upcomingReminders = reminders
    .filter((reminder) => !reminder.completedAt)
    .slice()
    .sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt))
    .slice(0, 4);
  const insights = getCollectionInsights(plants, reminders, storageUsage);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="section-grid mb-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel dashboard-hero rounded-[2rem] p-8 text-left animate-fade-in-up">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">Dashboard</p>
          <h1 className="mt-4 font-display text-5xl font-bold tracking-tight text-white">Welcome back, {userName}.</h1>
          <p className="mt-3 text-xl font-semibold text-slate-200">{greeting}</p>
          <p className="mt-5 max-w-2xl text-slate-300">
            Track plant health over time, learn why leaves change, and turn each snapshot into a clearer next step instead of a guess.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={onAddPlant} className="aurora-button rounded-full border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-300">
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
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="dashboard-mini-card rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Diagnose</p>
              <p className="mt-2 text-sm text-slate-200">Get a fast read on plant health, disease clues, and likely care priorities.</p>
            </div>
            <div className="dashboard-mini-card rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Compare</p>
              <p className="mt-2 text-sm text-slate-200">Use snapshot history to see whether a plant is recovering, stable, or declining.</p>
            </div>
            <div className="dashboard-mini-card rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Learn</p>
              <p className="mt-2 text-sm text-slate-200">Turn each result into a short explanation so users learn what the symptoms actually mean.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel dashboard-side-card rounded-[2rem] p-8">
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
                  <span>{insights.storageSummary?.usedLabel} / {insights.storageSummary?.limitLabel}</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    style={{ width: `${insights.storageSummary?.percentUsed || 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel dashboard-side-card rounded-[2rem] p-6">
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

      {plants.length > 0 ? (
        <div className="mb-8 grid gap-6 lg:grid-cols-4">
          <div className="glass-panel dashboard-stat-card rounded-[2rem] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Most improved</p>
            <p className="mt-2 text-xl font-semibold text-white">{insights.mostImprovedPlant?.plant.name || 'No clear leader yet'}</p>
            <p className="mt-2 text-sm text-slate-300">{insights.mostImprovedPlant?.trend.reasons[0] || 'Add more snapshots to surface progress.'}</p>
          </div>
          <div className="glass-panel dashboard-stat-card rounded-[2rem] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Most overdue care</p>
            <p className="mt-2 text-xl font-semibold text-white">{insights.mostOverdueReminder?.title || 'Nothing overdue'}</p>
            <p className="mt-2 text-sm text-slate-300">
              {insights.mostOverdueReminder
                ? `${new Date(insights.mostOverdueReminder.dueAt).toLocaleString()}`
                : 'Your reminders are under control right now.'}
            </p>
          </div>
          <div className="glass-panel dashboard-stat-card rounded-[2rem] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Highest risk plant</p>
            <p className="mt-2 text-xl font-semibold text-white">{insights.highestRiskPlant?.plant.name || 'No urgent risk detected'}</p>
            <p className="mt-2 text-sm text-slate-300">{insights.highestRiskPlant?.trend.reasons[0] || 'Recent snapshots look manageable overall.'}</p>
          </div>
          <div className="glass-panel dashboard-stat-card rounded-[2rem] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Health summary</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {Object.entries(insights.healthSummary).map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white/5 px-3 py-3">
                  <p className="text-slate-400">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <h2 className="dashboard-collection-title mb-6 font-display text-3xl font-bold text-white">Your Plant Collection</h2>

      {visiblePlants.length > 0 ? (
        <div className="dashboard-plant-grid flex items-start justify-center gap-6">
          {columns.map((column, index) => (
            <div key={index} className="flex w-full flex-col gap-6">
              {column.map((plant) => (
                <PlantCard
                  key={plant.id}
                  plant={plant}
                  trend={getPlantTrend(plant)}
                  onClick={() => {
                    if (pendingPlantCollapse?.plant.id === plant.id) return;
                    onSelectPlant(plant.id);
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel flex h-[50vh] flex-col items-center justify-center rounded-[2rem] p-8 text-center">
          <CameraIcon className="mb-4 h-24 w-24 text-slate-500" />
          <h2 className="text-2xl font-bold text-white">Your greenhouse is empty</h2>
          <p className="mt-2 max-w-xl text-slate-300">Add your first plant to start building a real timeline, AI care record, and plant-learning journal.</p>
          <div className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">1. Scan</p>
              <p className="mt-2 text-sm text-slate-200">Upload one plant photo and let the app detect health, disease, and care signals.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">2. Learn</p>
              <p className="mt-2 text-sm text-slate-200">Read a short explanation of what those visual signs usually mean for plant care.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">3. Track</p>
              <p className="mt-2 text-sm text-slate-200">Save new snapshots later to compare progress and spot trends over time.</p>
            </div>
          </div>
          <button
            onClick={onAddPlant}
            className="aurora-button mt-6 flex items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 px-6 py-3 text-base font-medium text-cyan-300"
          >
            <PlusIcon className="mr-2 h-5 w-5" />
            Add First Plant
          </button>
        </div>
      )}

      {visiblePlants.length > 0 && (
        <button
          onClick={onAddPlant}
          className="aurora-button fixed bottom-8 right-8 z-20 rounded-full border border-cyan-300/30 bg-cyan-400/10 p-4 text-cyan-300 shadow-lg"
          aria-label="Add new plant"
        >
          <PlusIcon className="h-8 w-8" />
        </button>
      )}
    </div>
  );
};

export default HomePage;
