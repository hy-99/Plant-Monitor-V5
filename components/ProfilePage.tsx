import React, { useState } from 'react';
import { User, Plant, Reminder, StorageUsage } from '../types';
import { AchievementSummary } from '../utils/achievements';
import { getCollectionInsights } from '../utils/plantInsights';
import ArrowLeftIcon from './icons/ArrowLeftIcon';

interface ProfilePageProps {
  user: User;
  plants: Plant[];
  reminders: Reminder[];
  storageUsage: StorageUsage | null;
  achievementSummary: AchievementSummary;
  equippedTitle: string;
  onBack: () => void;
  onEquipTitle: (title: string) => void;
  onUpdateDisplayName: (name: string) => Promise<void>;
}

const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  plants,
  reminders,
  storageUsage,
  achievementSummary,
  equippedTitle,
  onBack,
  onEquipTitle,
  onUpdateDisplayName,
}) => {
  const [draftName, setDraftName] = useState(user.name);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insights = getCollectionInsights(plants, reminders, storageUsage);
  const totalHealthy = plants.filter((plant) => plant.snapshots[plant.snapshots.length - 1]?.analysis.health === 'Healthy').length;
  const totalSpeciesSeen = new Set(
    plants
      .map((plant) => plant.snapshots[plant.snapshots.length - 1]?.analysis.commonName || plant.snapshots[plant.snapshots.length - 1]?.analysis.species)
      .filter(Boolean)
  ).size;
  const completionRate = reminders.length ? Math.round((achievementSummary.stats.completedReminders / reminders.length) * 100) : 0;
  const nextGrowthFocus =
    insights.highestRiskPlant?.trend.reasons[0] ||
    insights.mostImprovedPlant?.trend.reasons[0] ||
    'Keep adding consistent snapshots so the app can surface stronger patterns across your collection.';

  const handleSave = async () => {
    const nextName = draftName.trim();
    if (!nextName || nextName === user.name) return;
    setIsSaving(true);
    setError(null);
    try {
      await onUpdateDisplayName(nextName);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update display name.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-primary">
          <ArrowLeftIcon className="h-5 w-5" />
          Back to dashboard
        </button>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="glass-panel rounded-[2rem] p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Profile</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-white">{user.name}</h1>
          <p className="mt-2 text-sm text-slate-400">@{user.username}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.24em] text-primary">{equippedTitle}</p>
          <p className="mt-3 text-sm text-slate-300">Account created {new Date(user.createdAt).toLocaleDateString()}.</p>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Learning profile</p>
            <p className="mt-2 text-sm text-slate-200">
              You&apos;re building a living plant journal, not just saving diagnoses. Each new snapshot gives you stronger comparison data and clearer care lessons over time.
            </p>
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold text-slate-300">Display name</label>
            <div className="flex gap-3">
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-primary"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || draftName.trim() === user.name}
                className="aurora-button rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 font-semibold text-cyan-300 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
            {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Numbers</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Images analyzed</p>
              <p className="mt-2 font-display text-3xl text-white">{achievementSummary.stats.totalSnapshots}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Plants tracked</p>
              <p className="mt-2 font-display text-3xl text-white">{achievementSummary.stats.totalPlants}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Longest streak</p>
              <p className="mt-2 font-display text-3xl text-white">{achievementSummary.stats.longestTrackingDays}d</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Care actions</p>
              <p className="mt-2 font-display text-3xl text-white">{achievementSummary.stats.completedReminders}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Unlocked titles</p>
              <p className="mt-2 font-display text-3xl text-white">{achievementSummary.unlockedTitles.length}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Overdue care</p>
              <p className="mt-2 font-display text-3xl text-white">{achievementSummary.stats.overdueReminders}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <section className="glass-panel rounded-[2rem] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Collection</p>
          <p className="mt-3 text-lg font-semibold text-white">{insights.mostImprovedPlant?.plant.name || 'No leader yet'}</p>
          <p className="mt-2 text-sm text-slate-300">Most improved plant</p>
        </section>
        <section className="glass-panel rounded-[2rem] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Risk watch</p>
          <p className="mt-3 text-lg font-semibold text-white">{insights.highestRiskPlant?.plant.name || 'No urgent risk'}</p>
          <p className="mt-2 text-sm text-slate-300">Highest risk plant right now</p>
        </section>
        <section className="glass-panel rounded-[2rem] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Storage</p>
          <p className="mt-3 text-lg font-semibold text-white">{insights.storageSummary?.usedLabel || '0 KB'} used</p>
          <p className="mt-2 text-sm text-slate-300">{insights.storageSummary?.remainingLabel || '0 KB'} remaining</p>
        </section>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <section className="glass-panel rounded-[2rem] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Learning reach</p>
          <p className="mt-3 text-3xl font-display text-white">{totalSpeciesSeen}</p>
          <p className="mt-2 text-sm text-slate-300">Distinct plant types identified across your saved collection.</p>
        </section>
        <section className="glass-panel rounded-[2rem] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Healthy now</p>
          <p className="mt-3 text-3xl font-display text-white">{totalHealthy}</p>
          <p className="mt-2 text-sm text-slate-300">Plants currently reading as healthy in their latest snapshot.</p>
        </section>
        <section className="glass-panel rounded-[2rem] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Care follow-through</p>
          <p className="mt-3 text-3xl font-display text-white">{completionRate}%</p>
          <p className="mt-2 text-sm text-slate-300">Reminder completion rate based on recorded care actions.</p>
        </section>
      </div>

      <section className="glass-panel mb-8 rounded-[2rem] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Next growth focus</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Where your collection can improve next</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-300">{nextGrowthFocus}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Track</p>
            <p className="mt-2 text-sm text-slate-200">Keep taking follow-up photos from a similar angle so comparisons stay meaningful.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Learn</p>
            <p className="mt-2 text-sm text-slate-200">Use the educational notes after each analysis to connect symptoms with likely causes.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Act</p>
            <p className="mt-2 text-sm text-slate-200">Turn advice into reminders so care changes become visible habits instead of one-off guesses.</p>
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Equip Title</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onEquipTitle('Grower')}
            className={`aurora-button rounded-full px-4 py-2 text-sm font-semibold ${
              equippedTitle === 'Grower' ? 'border border-cyan-300/30 bg-cyan-400/10 text-cyan-300' : 'border border-white/10 bg-white/5 text-slate-200'
            }`}
          >
            Grower
          </button>
          {achievementSummary.unlockedTitles.map((title) => (
            <button
              key={title}
              type="button"
              onClick={() => onEquipTitle(title)}
              className={`aurora-button rounded-full px-4 py-2 text-sm font-semibold ${
                equippedTitle === title ? 'border border-cyan-300/30 bg-cyan-400/10 text-cyan-300' : 'border border-white/10 bg-white/5 text-slate-200'
              }`}
            >
              {title}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ProfilePage;
