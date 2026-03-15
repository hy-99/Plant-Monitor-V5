import React from 'react';
import { AchievementSummary } from '../utils/achievements';
import ArrowLeftIcon from './icons/ArrowLeftIcon';

interface AchievementsPageProps {
  summary: AchievementSummary;
  equippedTitle: string;
  onEquipTitle: (title: string) => void;
  onBack: () => void;
}

const categoryLabels = {
  analysis: 'Analysis',
  tracking: 'Tracking',
  collection: 'Collection',
  care: 'Care',
} as const;

const AchievementsPage: React.FC<AchievementsPageProps> = ({ summary, equippedTitle, onEquipTitle, onBack }) => {
  const grouped = Object.entries(categoryLabels).map(([key, label]) => ({
    key,
    label,
    items: summary.achievements.filter((achievement) => achievement.definition.category === key),
  }));
  const unlockedCount = summary.achievements.filter((achievement) => achievement.unlocked).length;
  const completionPercent = summary.achievements.length ? Math.round((unlockedCount / summary.achievements.length) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-primary">
          <ArrowLeftIcon className="h-5 w-5" />
          Back to dashboard
        </button>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-panel rounded-[2rem] p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Achievements</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-white">Your plant learning journey</h1>
          <p className="mt-3 text-sm text-slate-300">These milestones turn consistent diagnosis, tracking, and care into visible progress. The titles are fun, but the real value is seeing your routine become more deliberate over time.</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Images analyzed</p>
              <p className="mt-2 font-display text-3xl text-white">{summary.stats.totalSnapshots}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Longest tracking</p>
              <p className="mt-2 font-display text-3xl text-white">{summary.stats.longestTrackingDays} days</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Plants</p>
              <p className="mt-2 font-display text-3xl text-white">{summary.stats.totalPlants}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Care actions</p>
              <p className="mt-2 font-display text-3xl text-white">{summary.stats.completedReminders}</p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Milestones unlocked</span>
              <span>{unlockedCount} / {summary.achievements.length}</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${completionPercent}%` }} />
            </div>
            <p className="mt-3 text-sm text-slate-300">{completionPercent}% of the journey is unlocked so far.</p>
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Profile Titles</p>
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
            {summary.unlockedTitles.map((title) => (
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
          <p className="mt-4 text-sm text-slate-300">Equipped title: <span className="font-semibold text-white">{equippedTitle}</span></p>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">How to use this well</p>
            <p className="mt-2 text-sm text-slate-200">Treat achievements as a reflection of consistent plant care and observation, not just a collection screen. The strongest progress usually comes from regular snapshots and follow-through on reminders.</p>
          </div>
        </section>
      </div>

      <div className="space-y-8">
        {grouped.map((group) => (
          <section key={group.key} className="glass-panel rounded-[2rem] p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{group.label}</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {group.items.map((achievement) => (
                <div key={achievement.definition.id} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">{achievement.definition.title}</p>
                      <p className="mt-1 text-sm text-slate-300">{achievement.definition.description}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                      achievement.unlocked ? 'bg-emerald-400/15 text-emerald-200' : 'bg-slate-400/15 text-slate-200'
                    }`}>
                      {achievement.unlocked ? 'Unlocked' : 'Locked'}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{achievement.definition.titleReward ? `Title reward: ${achievement.definition.titleReward}` : 'No title reward'}</span>
                      <span>{achievement.progressLabel}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                        style={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                      />
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                      {achievement.unlocked ? 'Unlocked and ready to equip if it includes a title reward.' : 'Keep going. This milestone is tracking your real usage and care habits.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default AchievementsPage;
