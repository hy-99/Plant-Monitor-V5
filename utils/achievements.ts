import { Plant, Reminder } from '../types';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  category: 'analysis' | 'tracking' | 'collection' | 'care';
  titleReward?: string;
}

export interface AchievementProgress {
  definition: AchievementDefinition;
  unlocked: boolean;
  progress: number;
  target: number;
  progressLabel: string;
  unlockedAtLabel?: string;
}

export interface AchievementSummary {
  achievements: AchievementProgress[];
  unlockedTitles: string[];
  stats: {
    totalSnapshots: number;
    totalPlants: number;
    longestTrackingDays: number;
    completedReminders: number;
    overdueReminders: number;
  };
}

const daysBetween = (start: string, end: string) =>
  Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)));

const totalSnapshots = (plants: Plant[]) => plants.reduce((sum, plant) => sum + plant.snapshots.length, 0);

const longestTrackingDays = (plants: Plant[]) =>
  plants.reduce((best, plant) => {
    if (plant.snapshots.length < 2) return best;
    const sorted = plant.snapshots.slice().sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
    return Math.max(best, daysBetween(sorted[0].timestamp, sorted[sorted.length - 1].timestamp));
  }, 0);

const completedReminders = (reminders: Reminder[]) => reminders.filter((reminder) => Boolean(reminder.lastCompletedAt || reminder.completedAt)).length;
const overdueReminders = (reminders: Reminder[]) =>
  reminders.filter((reminder) => !reminder.completedAt && new Date(reminder.dueAt).getTime() < Date.now()).length;

const achievementSpecs: Array<AchievementDefinition & { target: number; metric: (plants: Plant[], reminders: Reminder[]) => number }> = [
  {
    id: 'analyze-10',
    title: 'First Field Scanner',
    description: 'Analyze 10 plant images.',
    category: 'analysis',
    target: 10,
    metric: (plants) => totalSnapshots(plants),
    titleReward: 'Field Scanner',
  },
  {
    id: 'analyze-50',
    title: 'Canopy Cartographer',
    description: 'Analyze 50 plant images.',
    category: 'analysis',
    target: 50,
    metric: (plants) => totalSnapshots(plants),
    titleReward: 'Canopy Cartographer',
  },
  {
    id: 'analyze-100',
    title: 'Greenhouse Oracle',
    description: 'Analyze 100 plant images.',
    category: 'analysis',
    target: 100,
    metric: (plants) => totalSnapshots(plants),
    titleReward: 'Greenhouse Oracle',
  },
  {
    id: 'analyze-200',
    title: 'Mythic Leaf Archivist',
    description: 'Analyze 200 plant images.',
    category: 'analysis',
    target: 200,
    metric: (plants) => totalSnapshots(plants),
    titleReward: 'Leaf Archivist',
  },
  {
    id: 'track-30',
    title: 'Steady Sprout Keeper',
    description: 'Keep tracking one plant for 30 days.',
    category: 'tracking',
    target: 30,
    metric: (plants) => longestTrackingDays(plants),
    titleReward: 'Sprout Keeper',
  },
  {
    id: 'track-100',
    title: 'Century Root Watcher',
    description: 'Keep tracking one plant for 100 days total.',
    category: 'tracking',
    target: 100,
    metric: (plants) => longestTrackingDays(plants),
    titleReward: 'Root Watcher',
  },
  {
    id: 'garden-5',
    title: 'Shelf Builder',
    description: 'Build a collection of 5 plants.',
    category: 'collection',
    target: 5,
    metric: (plants) => plants.length,
    titleReward: 'Shelf Builder',
  },
  {
    id: 'garden-12',
    title: 'Indoor Jungle Curator',
    description: 'Build a collection of 12 plants.',
    category: 'collection',
    target: 12,
    metric: (plants) => plants.length,
    titleReward: 'Jungle Curator',
  },
  {
    id: 'care-10',
    title: 'Routine Whisperer',
    description: 'Complete 10 reminders.',
    category: 'care',
    target: 10,
    metric: (_plants, reminders) => completedReminders(reminders),
    titleReward: 'Routine Whisperer',
  },
  {
    id: 'care-40',
    title: 'Caretaker Supreme',
    description: 'Complete 40 reminders.',
    category: 'care',
    target: 40,
    metric: (_plants, reminders) => completedReminders(reminders),
    titleReward: 'Caretaker Supreme',
  },
];

export const getAchievementSummary = (plants: Plant[], reminders: Reminder[]): AchievementSummary => {
  const total = totalSnapshots(plants);
  const tracking = longestTrackingDays(plants);
  const completed = completedReminders(reminders);
  const overdue = overdueReminders(reminders);

  const achievements = achievementSpecs.map((spec) => {
    const value = spec.metric(plants, reminders);
    const unlocked = value >= spec.target;

    return {
      definition: spec,
      unlocked,
      progress: Math.min(value, spec.target),
      target: spec.target,
      progressLabel: `${Math.min(value, spec.target)} / ${spec.target}`,
      unlockedAtLabel: unlocked ? 'Unlocked' : undefined,
    };
  });

  const unlockedTitles = achievements
    .filter((item) => item.unlocked && item.definition.titleReward)
    .map((item) => item.definition.titleReward as string);

  return {
    achievements,
    unlockedTitles,
    stats: {
      totalSnapshots: total,
      totalPlants: plants.length,
      longestTrackingDays: tracking,
      completedReminders: completed,
      overdueReminders: overdue,
    },
  };
};
