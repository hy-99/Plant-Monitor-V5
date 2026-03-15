import React, { useEffect, useRef, useState } from 'react';
import { Plant } from '../types';
import { fileToDataUrl } from '../utils/fileUtils';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import PlusIcon from './icons/PlusIcon';
import PencilIcon from './icons/PencilIcon';
import TrashIcon from './icons/TrashIcon';
import BrainIcon from './icons/BrainIcon';
import ThumbUpIcon from './icons/ThumbUpIcon';
import ThumbDownIcon from './icons/ThumbDownIcon';
import GrowthChart from './GrowthChart';
import ActionPlan from './ActionPlan';
import AnalysisDetailsList from './AnalysisDetailsList';
import AnalysisScanner from './AnalysisScanner';
import ConfirmationModal from './ConfirmationModal';
import { buildComparisonPanel, buildEducationPanel } from '../utils/analysisEducation';
import { getPlantTrend } from '../utils/plantInsights';

interface DetailPageProps {
  plant: Plant;
  onBack: () => void;
  onOpenChat: () => void;
  onUpdate: (plantId: string, imageDataUrl: string) => Promise<void>;
  onUpdateFeedback: (plantId: string, snapshotId: string, feedback: { rating: 'correct' | 'incorrect'; comment?: string }) => void;
  onUpdatePlantName: (plantId: string, newName: string) => void;
  onDeleteSnapshot: (plantId: string, snapshotId: string) => Promise<void> | void;
  isWorking: boolean;
}

interface ConfirmationState {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void | Promise<void>;
}

const DetailPage: React.FC<DetailPageProps> = ({
  plant,
  onBack,
  onOpenChat,
  onUpdate,
  onUpdateFeedback,
  onUpdatePlantName,
  onDeleteSnapshot,
  isWorking,
}) => {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(
    plant.snapshots.length ? plant.snapshots[plant.snapshots.length - 1].id : null
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(plant.name);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const selectedSnapshot = plant.snapshots.find((snapshot) => snapshot.id === selectedSnapshotId);
  const selectedSnapshotIndex = plant.snapshots.findIndex((snapshot) => snapshot.id === selectedSnapshotId);
  const previousSnapshot =
    selectedSnapshotIndex > 0 ? plant.snapshots[selectedSnapshotIndex - 1] : null;
  const educationPanel = selectedSnapshot ? buildEducationPanel(selectedSnapshot.analysis) : null;
  const comparisonPanel =
    selectedSnapshot && previousSnapshot ? buildComparisonPanel(selectedSnapshot, previousSnapshot) : null;
  const trend = getPlantTrend(plant);
  const plantLabel =
    selectedSnapshot?.analysis.commonName || selectedSnapshot?.analysis.species || 'Saved plant';
  const trendCopy =
    trend.status === 'improving'
      ? 'This plant is showing signs of improvement across recent snapshots.'
      : trend.status === 'declining'
        ? 'Recent snapshots suggest the plant may need closer attention.'
        : 'Recent snapshots look relatively stable so far.';

  useEffect(() => {
    if (!selectedSnapshot && plant.snapshots.length > 0) {
      setSelectedSnapshotId(plant.snapshots[plant.snapshots.length - 1].id);
    } else if (plant.snapshots.length === 0) {
      onBack();
    }
  }, [onBack, plant.snapshots, selectedSnapshot]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditingName]);

  const handleNameSave = () => {
    const nextName = editedName.trim();

    if (nextName && nextName !== plant.name) {
      setEditedName(plant.name);
      setIsEditingName(false);
      setConfirmation({
        title: 'Save this plant name change?',
        message: `This plant will be renamed to "${nextName}" across your collection and history.`,
        confirmLabel: 'Save Name',
        onConfirm: () => onUpdatePlantName(plant.id, nextName),
      });
      return;
    }

    setEditedName(plant.name);
    setIsEditingName(false);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    setError(null);
    setConfirmation({
      title: 'Save this new snapshot?',
      message: 'This will upload the image into managed storage, analyze it, and add a fresh comparison point to this plant history.',
      confirmLabel: 'Save Snapshot',
      onConfirm: async () => {
        try {
          const imageDataUrl = await fileToDataUrl(file);
          await onUpdate(plant.id, imageDataUrl);
        } catch (updateError) {
          console.error(updateError);
          setError(updateError instanceof Error ? updateError.message : 'Failed to analyze the new image. Please try again.');
          throw updateError;
        }
      },
    });
  };

  const handleDelete = () => {
    if (!selectedSnapshot) return;

    setConfirmation({
      title: plant.snapshots.length === 1 ? 'Delete this final snapshot?' : 'Delete this snapshot?',
      message: plant.snapshots.length === 1
        ? 'This is the last saved screenshot for this plant. The app will return home, then remove the plant record after a short delay.'
        : 'This action cannot be undone. The selected image, analysis result, and comparison point will be removed from this plant history.',
      confirmLabel: plant.snapshots.length === 1 ? 'Delete Plant Record' : 'Delete Snapshot',
      tone: 'danger',
      onConfirm: () => onDeleteSnapshot(plant.id, selectedSnapshot.id),
    });
  };

  if (!selectedSnapshot) {
    return (
      <div className="mx-auto max-w-4xl p-4 text-center sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-white">No snapshots available for this plant.</h1>
        <button onClick={() => fileInputRef.current?.click()} className="aurora-button mx-auto mt-4 flex items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 px-6 py-3 text-base font-medium text-cyan-300">
          <PlusIcon className="mr-2 h-5 w-5" />
          Add Snapshot
        </button>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
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
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="-ml-2 flex items-center p-2 text-sm font-semibold text-slate-300 transition-colors hover:text-primary">
          <ArrowLeftIcon className="mr-1 h-5 w-5" />
          Back to Collection
        </button>
        <button onClick={onOpenChat} className="aurora-button rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100">
          Ask AI about this plant
        </button>
      </div>

      <div className="mb-6 flex items-center gap-3">
        {isEditingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={editedName}
            onChange={(event) => setEditedName(event.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(event) => event.key === 'Enter' && handleNameSave()}
            className="border-b-2 border-primary/50 bg-transparent font-display text-4xl font-bold tracking-tight text-primary focus:outline-none"
          />
        ) : (
          <h1 className="font-display text-4xl font-bold tracking-tight text-primary">{plant.name}</h1>
        )}
        <button onClick={() => setIsEditingName((value) => !value)} className="rounded-full p-2 text-slate-300 transition hover:bg-white/10 hover:text-primary">
          <PencilIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-4">
        <div className="glass-panel detail-stat-card rounded-[1.75rem] p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Latest status</p>
          <p className="mt-2 text-2xl font-semibold text-white">{selectedSnapshot.analysis.health}</p>
          <p className="mt-2 text-sm text-slate-300">{trendCopy}</p>
        </div>
        <div className="glass-panel detail-stat-card rounded-[1.75rem] p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Plant identified</p>
          <p className="mt-2 text-2xl font-semibold text-white">{plantLabel}</p>
          <p className="mt-2 text-sm text-slate-300">Latest analysis name for this plant record.</p>
        </div>
        <div className="glass-panel detail-stat-card rounded-[1.75rem] p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Snapshots saved</p>
          <p className="mt-2 text-2xl font-semibold text-white">{plant.snapshots.length}</p>
          <p className="mt-2 text-sm text-slate-300">More check-ins make trend detection and care learning stronger.</p>
        </div>
        <div className="glass-panel detail-stat-card rounded-[1.75rem] p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Latest capture</p>
          <p className="mt-2 text-2xl font-semibold text-white">{new Date(selectedSnapshot.timestamp).toLocaleDateString()}</p>
          <p className="mt-2 text-sm text-slate-300">Use similar framing next time for better comparison accuracy.</p>
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">History</h2>
            <p className="mt-1 text-sm text-slate-300">Review past snapshots in order, compare visible changes, and keep a real progression record for this plant.</p>
          </div>
        </div>
        <div className="detail-history-strip flex items-center gap-4 overflow-x-auto pb-2">
          {plant.snapshots.slice().reverse().map((snapshot) => (
            <div
              key={snapshot.id}
              onClick={() => setSelectedSnapshotId(snapshot.id)}
              className={`detail-history-thumb relative flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl transition-all duration-300 ${
                selectedSnapshotId === snapshot.id ? 'ring-4 ring-primary ring-offset-2 ring-offset-slate-950' : 'hover:scale-105'
              }`}
            >
              <img src={snapshot.imageUrl} alt={`Snapshot from ${new Date(snapshot.timestamp).toLocaleDateString()}`} className="h-24 w-24 object-cover" />
              <div className="absolute inset-0 bg-black/30"></div>
              <p className="absolute bottom-1 right-1 rounded bg-black/50 px-1 text-[10px] font-bold text-white">
                {new Date(snapshot.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          ))}
          <button onClick={() => fileInputRef.current?.click()} className="flex h-24 w-24 flex-shrink-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-primary transition-colors hover:bg-white/10">
            <PlusIcon className="h-8 w-8" />
            <span className="mt-1 text-xs font-semibold">Add New</span>
          </button>
        </div>
      </div>

      {isWorking ? <AnalysisScanner label="Comparing fresh snapshot data" detail="Autonomous drones are checking new growth, disease clues, and anything that changed since the last photo." /> : null}

      {error && <p className="my-4 rounded-2xl border border-rose-300/20 bg-rose-500/10 p-3 text-center text-rose-100">{error}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="glass-panel detail-main-panel rounded-[2rem] p-6 lg:col-span-3">
          <h3 className="mb-4 text-2xl font-bold text-white">Snapshot Details</h3>
          <img src={selectedSnapshot.imageUrl} alt={plant.name} className="detail-main-image mb-6 w-full rounded-[1.5rem] shadow-md" />

          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2 font-bold text-primary">
              <BrainIcon className="h-6 w-6" />
              <h4 className="text-lg">AI Summary</h4>
            </div>
            <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">{selectedSnapshot.summary || 'No summary available.'}</p>
          </div>

          {educationPanel ? (
            <div className="mb-6 rounded-[1.75rem] border border-sky-300/18 bg-sky-400/8 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-200">Learning Panel</p>
              <h4 className="mt-2 text-lg font-bold text-white">{educationPanel.title}</h4>
              <p className="mt-3 text-sm leading-7 text-slate-200">{educationPanel.summary}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                {educationPanel.bullets.map((bullet) => (
                  <li key={bullet} className="rounded-2xl bg-white/5 px-4 py-3">
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {comparisonPanel ? (
            <div
              className={`mb-6 rounded-[1.75rem] p-5 ${
                comparisonPanel.tone === 'positive'
                  ? 'border border-emerald-300/18 bg-emerald-400/8'
                  : comparisonPanel.tone === 'warning'
                    ? 'border border-amber-300/18 bg-amber-400/8'
                    : 'border border-white/10 bg-white/5'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary">Change Over Time</p>
              <h4 className="mt-2 text-lg font-bold text-white">{comparisonPanel.title}</h4>
              <p className="mt-3 text-sm leading-7 text-slate-200">{comparisonPanel.summary}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                {comparisonPanel.bullets.map((bullet) => (
                  <li key={bullet} className="rounded-2xl bg-white/5 px-4 py-3">
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <AnalysisDetailsList analysis={selectedSnapshot.analysis} />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="glass-panel rounded-[2rem] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Snapshot takeaways</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Trend read</p>
                <p className="mt-2 text-sm text-slate-200">{trend.reasons[0]}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Best next observation</p>
                <p className="mt-2 text-sm text-slate-200">
                  {selectedSnapshot.analysis.advice[0]?.description || 'Capture a similar follow-up image after the next care change to see whether the plant responds.'}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <h3 className="mb-4 text-2xl font-bold text-white">Care Action Plan</h3>
            <ActionPlan advice={selectedSnapshot.analysis.advice} />
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <h3 className="mb-4 text-2xl font-bold text-white">Growth Chart</h3>
            <GrowthChart plant={plant} snapshots={plant.snapshots} />
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <h3 className="mb-3 text-lg font-bold text-white">Was this analysis helpful?</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => onUpdateFeedback(plant.id, selectedSnapshot.id, { rating: 'correct' })}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${
                  selectedSnapshot.analysis.feedback?.rating === 'correct' ? 'bg-emerald-400/20 text-emerald-200' : 'bg-white/5 text-slate-300 hover:bg-emerald-400/10'
                }`}
              >
                <ThumbUpIcon className="h-5 w-5" /> Yes
              </button>
              <button
                onClick={() => onUpdateFeedback(plant.id, selectedSnapshot.id, { rating: 'incorrect' })}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${
                  selectedSnapshot.analysis.feedback?.rating === 'incorrect' ? 'bg-rose-400/20 text-rose-200' : 'bg-white/5 text-slate-300 hover:bg-rose-400/10'
                }`}
              >
                <ThumbDownIcon className="h-5 w-5" /> No
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-rose-300/20 bg-rose-500/10 p-4">
            <h3 className="text-lg font-bold text-rose-100">Danger Zone</h3>
            <p className="mb-3 mt-1 text-sm text-rose-200">Deleting a snapshot is permanent and cannot be recovered.</p>
            <button onClick={handleDelete} className="flex items-center gap-2 rounded-2xl border border-rose-300/20 bg-white/10 px-4 py-2 text-sm font-semibold text-rose-100 transition-colors hover:bg-rose-400/20">
              <TrashIcon className="h-5 w-5" /> Delete This Snapshot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailPage;
