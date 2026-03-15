import { AnalysisResult, PlantSnapshot } from '../types';

interface EducationPanel {
  title: string;
  summary: string;
  bullets: string[];
}

interface ComparisonPanel {
  title: string;
  summary: string;
  bullets: string[];
  tone: 'positive' | 'neutral' | 'warning';
}

const healthRank: Record<AnalysisResult['health'], number> = {
  Healthy: 3,
  Stressed: 2,
  Unhealthy: 1,
  Unknown: 0,
};

const normalizeAdvice = (analysis: AnalysisResult) =>
  analysis.advice
    .map((item) => item.title || item.description)
    .map((item) => item.trim())
    .filter(Boolean);

export const buildEducationPanel = (analysis: AnalysisResult): EducationPanel => {
  const displayName = analysis.commonName || analysis.species || 'this plant';
  const advice = normalizeAdvice(analysis);

  if (analysis.health === 'Healthy') {
    return {
      title: 'Why This Looks Healthy',
      summary: `${displayName} looks stable right now. The current snapshot does not show strong disease or stress signals, which usually means the environment and care routine are working together.`,
      bullets: [
        'Keep the same light and watering rhythm if new growth continues to look strong.',
        'Healthy plants still benefit from regular check-ins so you can catch stress early.',
        advice[0] ? `Best next habit: ${advice[0]}.` : 'Use future snapshots to confirm the plant stays on the same trend.',
      ],
    };
  }

  if (analysis.health === 'Stressed') {
    return {
      title: 'What “Stressed” Usually Means',
      summary: `${displayName} is showing signs that something in its environment or routine may be off, but it may still recover well if you adjust care soon.`,
      bullets: [
        analysis.disease
          ? `The analysis noticed signs related to ${analysis.disease.name.toLowerCase()}, so watch the affected leaves closely.`
          : 'Stress often comes from watering balance, light mismatch, or sudden environmental changes.',
        advice[0] ? `First thing to try: ${advice[0]}.` : 'Start with the most obvious symptom and adjust one care variable at a time.',
        'Take another snapshot after your change so you can see whether the plant starts improving.',
      ],
    };
  }

  if (analysis.health === 'Unhealthy') {
    return {
      title: 'What Needs Attention First',
      summary: `${displayName} looks like it needs more urgent support. This does not always mean the plant is beyond saving, but it does mean the current issue should be addressed soon.`,
      bullets: [
        analysis.disease
          ? `Possible issue detected: ${analysis.disease.name} (${analysis.disease.severity.toLowerCase()}).`
          : 'When a plant looks unhealthy, start with the most visible symptom and reduce extra stress while you assess care conditions.',
        advice[0] ? `Priority action: ${advice[0]}.` : 'Choose one corrective action first instead of changing everything at once.',
        'Save a follow-up snapshot after treatment so you can compare whether the damage is spreading or stabilizing.',
      ],
    };
  }

  return {
    title: 'How To Read This Result',
    summary: `The model could not strongly classify ${displayName}'s health from this image alone, so use this as a clue rather than a final diagnosis.`,
    bullets: [
      'Take a brighter, closer photo with one plant filling most of the frame.',
      'Compare this result with any previous snapshots before making a big care change.',
      advice[0] ? `A cautious next step: ${advice[0]}.` : 'If you are unsure, start with the lowest-risk care adjustment first.',
    ],
  };
};

export const buildComparisonPanel = (
  currentSnapshot: PlantSnapshot,
  previousSnapshot: PlantSnapshot | null,
): ComparisonPanel | null => {
  if (!previousSnapshot) return null;

  const current = currentSnapshot.analysis;
  const previous = previousSnapshot.analysis;
  const currentRank = healthRank[current.health];
  const previousRank = healthRank[previous.health];
  const healthDelta = currentRank - previousRank;
  const currentAdvice = normalizeAdvice(current);

  if (healthDelta > 0) {
    return {
      title: 'Improvement Since Last Snapshot',
      summary: `This plant looks healthier than it did on ${new Date(previousSnapshot.timestamp).toLocaleDateString()}. That suggests your recent care changes may be helping.`,
      bullets: [
        `Previous status: ${previous.health}. Current status: ${current.health}.`,
        'Keep the helpful parts of the routine steady so the recovery trend has time to continue.',
        currentAdvice[0] ? `Best next check: ${currentAdvice[0]}.` : 'Take another snapshot after the next care cycle to confirm the trend.',
      ],
      tone: 'positive',
    };
  }

  if (healthDelta < 0) {
    return {
      title: 'More Stress Than Before',
      summary: `This snapshot looks worse than the one from ${new Date(previousSnapshot.timestamp).toLocaleDateString()}, so something in the environment or routine may be pushing the plant the wrong way.`,
      bullets: [
        `Previous status: ${previous.health}. Current status: ${current.health}.`,
        current.disease
          ? `The new image shows a stronger issue around ${current.disease.name.toLowerCase()}.`
          : 'Try to identify one recent change such as watering, light, temperature, or draft exposure.',
        currentAdvice[0] ? `Start here: ${currentAdvice[0]}.` : 'Make one careful correction first, then monitor the response.',
      ],
      tone: 'warning',
    };
  }

  return {
    title: 'Similar To The Last Check-In',
    summary: `This snapshot looks broadly similar to the one from ${new Date(previousSnapshot.timestamp).toLocaleDateString()}, which suggests the plant is staying on the same track for now.`,
    bullets: [
      `Both snapshots read as ${current.health}.`,
      'Stable results are useful because they show whether your routine is keeping conditions consistent.',
      currentAdvice[0] ? `A useful next check: ${currentAdvice[0]}.` : 'More snapshots over time will make the trend easier to interpret.',
    ],
    tone: 'neutral',
  };
};
