import { Plant, PlantSnapshot, Reminder, ReminderRecurrence, StorageUsage } from '../types';

export type TrendStatus = 'improving' | 'stable' | 'declining';

export interface PlantTrend {
  status: TrendStatus;
  score: number;
  reasons: string[];
  latestSnapshot: PlantSnapshot | null;
  previousSnapshot: PlantSnapshot | null;
}

export interface CollectionInsights {
  mostImprovedPlant: { plant: Plant; trend: PlantTrend } | null;
  highestRiskPlant: { plant: Plant; trend: PlantTrend; riskScore: number } | null;
  mostOverdueReminder: Reminder | null;
  healthSummary: Record<'Healthy' | 'Stressed' | 'Unhealthy' | 'Unknown', number>;
  storageSummary: { usedLabel: string; remainingLabel: string; limitLabel: string; percentUsed: number } | null;
}

export interface SmartReminderSuggestion {
  id: string;
  plantId: string;
  title: string;
  notes: string;
  dueAt: string;
  recurrence: ReminderRecurrence;
  reason: string;
}

const healthScore = {
  Healthy: 0,
  Stressed: 1,
  Unhealthy: 2,
  Unknown: 1,
} as const;

const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const parseMeasurement = (value: string | null | undefined) => {
  if (!value) return null;
  const matches = value.match(/(\d+(\.\d+)?)/g);
  if (!matches?.length) return null;
  const nums = matches.map(Number).filter((num) => Number.isFinite(num));
  if (!nums.length) return null;
  return nums.reduce((sum, num) => sum + num, 0) / nums.length;
};

const getLatestSnapshot = (plant: Plant) => plant.snapshots[plant.snapshots.length - 1] || null;

const getPreviousSnapshot = (plant: Plant) =>
  plant.snapshots.length >= 2 ? plant.snapshots[plant.snapshots.length - 2] : null;

const normalizeName = (plant: Plant) =>
  `${plant.name} ${getLatestSnapshot(plant)?.analysis.commonName || ''} ${getLatestSnapshot(plant)?.analysis.species || ''}`.toLowerCase();

const seasonForDate = (date: Date) => {
  const month = date.getMonth();
  if (month === 11 || month <= 1) return 'winter';
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  return 'fall';
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const buildRecurringDueDate = (daysFromNow: number) => addDays(new Date(), daysFromNow).toISOString();

export const getPlantTrend = (plant: Plant): PlantTrend => {
  const latestSnapshot = getLatestSnapshot(plant);
  const previousSnapshot = getPreviousSnapshot(plant);

  if (!latestSnapshot || !previousSnapshot) {
    return {
      status: 'stable',
      score: 0,
      reasons: ['Add at least two snapshots to unlock trend analysis.'],
      latestSnapshot,
      previousSnapshot,
    };
  }

  const reasons: string[] = [];
  let score = 0;

  const latestHealth = healthScore[latestSnapshot.analysis.health];
  const previousHealth = healthScore[previousSnapshot.analysis.health];
  const healthDelta = latestHealth - previousHealth;

  if (healthDelta <= -1) {
    score -= 1.2;
    reasons.push(`Health improved from ${previousSnapshot.analysis.health.toLowerCase()} to ${latestSnapshot.analysis.health.toLowerCase()}.`);
  } else if (healthDelta >= 1) {
    score += 1.2;
    reasons.push(`Health dropped from ${previousSnapshot.analysis.health.toLowerCase()} to ${latestSnapshot.analysis.health.toLowerCase()}.`);
  }

  const previousDisease = previousSnapshot.analysis.disease?.name;
  const latestDisease = latestSnapshot.analysis.disease?.name;

  if (!previousDisease && latestDisease) {
    score += 1.3;
    reasons.push(`Disease signal appeared: ${latestDisease}.`);
  } else if (previousDisease && !latestDisease) {
    score -= 1.3;
    reasons.push(`Previous disease signal (${previousDisease}) is no longer showing.`);
  }

  const previousHeight = parseMeasurement(previousSnapshot.analysis.height);
  const latestHeight = parseMeasurement(latestSnapshot.analysis.height);
  if (previousHeight && latestHeight) {
    const delta = latestHeight - previousHeight;
    if (delta >= 3) {
      score -= 0.45;
      reasons.push(`Estimated height increased by about ${Math.round(delta)} cm.`);
    } else if (delta <= -3) {
      score += 0.55;
      reasons.push(`Estimated height appears lower by about ${Math.round(Math.abs(delta))} cm.`);
    }
  }

  const previousWidth = parseMeasurement(previousSnapshot.analysis.width);
  const latestWidth = parseMeasurement(latestSnapshot.analysis.width);
  if (previousWidth && latestWidth) {
    const delta = latestWidth - previousWidth;
    if (delta >= 3) {
      score -= 0.35;
      reasons.push(`Visible spread widened by about ${Math.round(delta)} cm.`);
    } else if (delta <= -3) {
      score += 0.4;
      reasons.push(`Visible spread narrowed by about ${Math.round(Math.abs(delta))} cm.`);
    }
  }

  if (!reasons.length) {
    reasons.push('Recent snapshots look broadly consistent with no major visible shift.');
  }

  return {
    status: score <= -0.8 ? 'improving' : score >= 0.8 ? 'declining' : 'stable',
    score,
    reasons,
    latestSnapshot,
    previousSnapshot,
  };
};

export const getCollectionInsights = (
  plants: Plant[],
  reminders: Reminder[],
  storageUsage: StorageUsage | null
): CollectionInsights => {
  const plantTrends = plants.map((plant) => ({ plant, trend: getPlantTrend(plant) }));
  const improving = plantTrends
    .filter((item) => item.trend.status === 'improving')
    .sort((a, b) => a.trend.score - b.trend.score)[0] || null;

  const riskCandidates = plantTrends
    .map((item) => {
      const latest = item.trend.latestSnapshot;
      const healthRisk = latest ? healthScore[latest.analysis.health] * 1.2 : 0;
      const diseaseRisk = latest?.analysis.disease ? 1.4 : 0;
      return { ...item, riskScore: item.trend.score + healthRisk + diseaseRisk };
    })
    .sort((a, b) => b.riskScore - a.riskScore);

  const mostOverdueReminder =
    reminders
      .filter((reminder) => !reminder.completedAt && new Date(reminder.dueAt).getTime() < Date.now())
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())[0] || null;

  const healthSummary: CollectionInsights['healthSummary'] = {
    Healthy: 0,
    Stressed: 0,
    Unhealthy: 0,
    Unknown: 0,
  };

  plants.forEach((plant) => {
    const latest = getLatestSnapshot(plant);
    healthSummary[latest?.analysis.health || 'Unknown'] += 1;
  });

  return {
    mostImprovedPlant: improving,
    highestRiskPlant: riskCandidates[0] || null,
    mostOverdueReminder,
    healthSummary,
    storageSummary: storageUsage
      ? {
          usedLabel: formatBytes(storageUsage.bytesUsed),
          remainingLabel: formatBytes(storageUsage.bytesRemaining),
          limitLabel: formatBytes(storageUsage.bytesLimit),
          percentUsed: Math.min((storageUsage.bytesUsed / storageUsage.bytesLimit) * 100, 100),
        }
      : null,
  };
};

const hasNearbyReminder = (
  reminders: Reminder[],
  plantId: string,
  title: string,
  targetDate: Date,
  windowDays: number
) =>
  reminders.some((reminder) => {
    if (reminder.plantId !== plantId) return false;
    if (reminder.title.toLowerCase() !== title.toLowerCase()) return false;
    const diff = Math.abs(new Date(reminder.dueAt).getTime() - targetDate.getTime());
    return diff <= windowDays * 24 * 60 * 60 * 1000;
  });

export const getSmartReminderSuggestions = (plants: Plant[], reminders: Reminder[]): SmartReminderSuggestion[] => {
  const season = seasonForDate(new Date());
  const seasonWaterModifier = season === 'summer' ? -2 : season === 'winter' ? 3 : 0;
  const seasonFeedModifier = season === 'spring' || season === 'summer' ? 0 : 14;

  return plants
    .flatMap((plant) => {
      const latest = getLatestSnapshot(plant);
      if (!latest) return [];

      const descriptor = normalizeName(plant);
      const health = latest.analysis.health;

      let wateringDays = 7;
      let fertilizingDays = 30;

      if (/fern|calathea|maranta|prayer/.test(descriptor)) wateringDays = 5;
      if (/pothos|philodendron|monstera|anthurium/.test(descriptor)) wateringDays = 7;
      if (/snake|sansevieria|zz plant|zamioculcas|succulent|aloe|cactus/.test(descriptor)) wateringDays = 14;
      if (/orchid/.test(descriptor)) wateringDays = 9;

      if (/succulent|aloe|cactus|snake|zz plant|zamioculcas/.test(descriptor)) fertilizingDays = 45;
      if (/fern|calathea|maranta/.test(descriptor)) fertilizingDays = 35;

      if (health === 'Stressed') wateringDays = Math.max(wateringDays - 1, 3);
      if (health === 'Unhealthy') wateringDays = Math.max(wateringDays - 2, 2);

      wateringDays = Math.max(wateringDays + seasonWaterModifier, 2);
      fertilizingDays = Math.max(fertilizingDays + seasonFeedModifier, 21);

      const wateringDate = addDays(new Date(), wateringDays);
      const fertilizingDate = addDays(new Date(), fertilizingDays);

      const suggestions: SmartReminderSuggestion[] = [];

      if (!hasNearbyReminder(reminders, plant.id, 'Water plant', wateringDate, 3)) {
        suggestions.push({
          id: `${plant.id}-water`,
          plantId: plant.id,
          title: 'Water plant',
          dueAt: buildRecurringDueDate(wateringDays),
          recurrence: 'weekly',
          reason: `${plant.name} is on a ${season} watering rhythm${health !== 'Healthy' ? ` and latest health is ${health.toLowerCase()}` : ''}.`,
          notes: `Smart schedule based on ${latest.analysis.commonName || latest.analysis.species || 'plant type'}, ${season} conditions, and recent photo health.`,
        });
      }

      if (!hasNearbyReminder(reminders, plant.id, 'Fertilize plant', fertilizingDate, 7)) {
        suggestions.push({
          id: `${plant.id}-feed`,
          plantId: plant.id,
          title: 'Fertilize plant',
          dueAt: buildRecurringDueDate(fertilizingDays),
          recurrence: 'monthly',
          reason: `${plant.name} fits a ${fertilizingDays}-day feeding cycle for the current season.`,
          notes: `Smart feeding schedule based on ${latest.analysis.commonName || latest.analysis.species || 'plant type'} and ${season} growth patterns.`,
        });
      }

      if (health !== 'Healthy' && !hasNearbyReminder(reminders, plant.id, 'Health check photo', addDays(new Date(), 3), 2)) {
        suggestions.push({
          id: `${plant.id}-check`,
          plantId: plant.id,
          title: 'Health check photo',
          dueAt: buildRecurringDueDate(3),
          recurrence: 'weekly',
          reason: `${plant.name} looks ${health.toLowerCase()} in the latest snapshot and should be rechecked soon.`,
          notes: 'Capture a fresh photo from the same angle to confirm whether the plant is recovering or declining.',
        });
      }

      return suggestions;
    })
    .slice(0, 8);
};
