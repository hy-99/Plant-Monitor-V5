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

interface DetailPageProps {
  plant: Plant;
  onBack: () => void;
  onOpenChat: () => void;
  onUpdate: (plantId: string, imageDataUrl: string) => Promise<void>;
  onUpdateFeedback: (plantId: string, snapshotId: string, feedback: { rating: 'correct' | 'incorrect'; comment?: string }) => void;
  onUpdatePlantName: (plantId: string, newName: string) => void;
  onDeleteSnapshot: (plantId: string, snapshotId: string) => void;
  isWorking: boolean;
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const selectedSnapshot = plant.snapshots.find((snapshot) => snapshot.id === selectedSnapshotId);

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
    if (editedName.trim() && editedName !== plant.name) {
      if (!window.confirm('Keep this plant name change?')) {
        setEditedName(plant.name);
        setIsEditingName(false);
        return;
      }
      onUpdatePlantName(plant.id, editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    try {
      if (!window.confirm('Keep this new snapshot and save its image to managed storage?')) {
        return;
      }
      const imageDataUrl = await fileToDataUrl(file);
      await onUpdate(plant.id, imageDataUrl);
    } catch (updateError) {
      console.error(updateError);
      setError(updateError instanceof Error ? updateError.message : 'Failed to analyze the new image. Please try again.');
    }
  };

  const handleDelete = () => {
    if (selectedSnapshot && window.confirm('Are you sure you want to delete this snapshot? This action cannot be undone.')) {
      onDeleteSnapshot(plant.id, selectedSnapshot.id);
    }
  };

  if (!selectedSnapshot) {
    return (
      <div className="mx-auto max-w-4xl p-4 text-center sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold text-white">No snapshots available for this plant.</h1>
        <button onClick={() => fileInputRef.current?.click()} className="aurora-button mx-auto mt-4 flex items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-medium text-slate-950">
          <PlusIcon className="mr-2 h-5 w-5" />
          Add Snapshot
        </button>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
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

      <div className="mb-8">
        <h2 className="mb-3 text-xl font-bold text-white">History</h2>
        <div className="flex items-center gap-4 overflow-x-auto pb-2">
          {plant.snapshots.slice().reverse().map((snapshot) => (
            <div
              key={snapshot.id}
              onClick={() => setSelectedSnapshotId(snapshot.id)}
              className={`relative flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl transition-all duration-300 ${
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

      {isWorking ? <AnalysisScanner label="Comparing fresh snapshot data" detail="The sensor buddy is checking new growth, disease clues, and anything that changed since the last photo." /> : null}

      {error && <p className="my-4 rounded-2xl border border-rose-300/20 bg-rose-500/10 p-3 text-center text-rose-100">{error}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="glass-panel rounded-[2rem] p-6 lg:col-span-3">
          <h3 className="mb-4 text-2xl font-bold text-white">Snapshot Details</h3>
          <img src={selectedSnapshot.imageUrl} alt={plant.name} className="mb-6 w-full rounded-[1.5rem] shadow-md" />

          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2 font-bold text-primary">
              <BrainIcon className="h-6 w-6" />
              <h4 className="text-lg">AI Summary</h4>
            </div>
            <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-200">{selectedSnapshot.summary || 'No summary available.'}</p>
          </div>

          <AnalysisDetailsList analysis={selectedSnapshot.analysis} />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="glass-panel rounded-[2rem] p-6">
            <h3 className="mb-4 text-2xl font-bold text-white">Care Action Plan</h3>
            <ActionPlan advice={selectedSnapshot.analysis.advice} />
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <h3 className="mb-4 text-2xl font-bold text-white">Growth Chart</h3>
            <GrowthChart snapshots={plant.snapshots} />
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
