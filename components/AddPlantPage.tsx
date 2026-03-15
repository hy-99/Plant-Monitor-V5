import React, { useEffect, useRef, useState } from 'react';
import { fileToDataUrl } from '../utils/fileUtils';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import CameraIcon from './icons/CameraIcon';
import SparklesIcon from './icons/SparklesIcon';
import PhotoTipsModal from './PhotoTipsModal';
import ConfirmationModal from './ConfirmationModal';
import PlantAnalysisSequence from './PlantAnalysisSequence';

interface AddPlantPageProps {
  onSave: (payload: { name: string; imageDataUrl: string }) => Promise<void>;
  onCancel: () => void;
  onSaved: () => void;
  isSaving: boolean;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const AddPlantPage: React.FC<AddPlantPageProps> = ({ onSave, onCancel, onSaved, isSaving }) => {
  const [plantName, setPlantName] = useState('');
  const [image, setImage] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState<'idle' | 'scanning' | 'complete'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (image?.url) {
        URL.revokeObjectURL(image.url);
      }
    };
  }, [image]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (image?.url) {
        URL.revokeObjectURL(image.url);
      }
      setImage({ file, url: URL.createObjectURL(file) });
      setError(null);
    }
  };

  const performSave = async () => {
    if (!plantName.trim() || !image) {
      setError('Please provide a name and an image for your plant.');
      return;
    }

    setError(null);
    setShowSaveConfirmation(false);
    setAnalysisPhase('scanning');

    try {
      const imageDataUrl = await fileToDataUrl(image.file);
      const minimumScanTime = wait(2600);
      await Promise.all([onSave({ name: plantName.trim(), imageDataUrl }), minimumScanTime]);
      setAnalysisPhase('complete');
      await wait(1400);
      onSaved();
    } catch (saveError) {
      console.error(saveError);
      setAnalysisPhase('idle');
      setError(saveError instanceof Error ? saveError.message : 'Failed to analyze the plant image. Please try again.');
    }
  };

  const handleSave = () => {
    if (!plantName.trim() || !image) {
      setError('Please provide a name and an image for your plant.');
      return;
    }

    setShowSaveConfirmation(true);
  };

  if (analysisPhase !== 'idle' && image) {
    return <PlantAnalysisSequence plantName={plantName.trim() || 'New plant'} imageUrl={image.url} phase={analysisPhase} />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
      {showTips && <PhotoTipsModal onClose={() => setShowTips(false)} />}
      {showSaveConfirmation && (
        <ConfirmationModal
          title="Save this new plant?"
          message="This will keep the plant in your collection, upload the image into managed storage, and use it as the baseline snapshot for future comparisons."
          confirmLabel="Save Plant"
          onConfirm={() => {
            void performSave();
          }}
          onClose={() => setShowSaveConfirmation(false)}
        />
      )}
      <div className="mb-6 flex items-center">
        <button onClick={onCancel} className="mr-2 rounded-full p-2 text-slate-300 transition hover:bg-white/10 hover:text-white">
          <ArrowLeftIcon className="h-6 w-6" />
        </button>
        <h1 className="font-display text-3xl font-bold text-white">Add a New Plant</h1>
      </div>

      <div className="glass-panel space-y-6 rounded-[2rem] p-8">
        <div>
          <label htmlFor="plant-name" className="mb-1 block text-sm font-medium text-slate-300">
            Plant&apos;s Name
          </label>
          <input
            type="text"
            id="plant-name"
            value={plantName}
            onChange={(event) => setPlantName(event.target.value)}
            placeholder="e.g., My Fiddle Leaf Fig"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-primary"
          />
          <p className="mt-2 text-sm text-slate-400">
            Use a simple name like <span className="text-slate-200">Monstera by the window</span> so it is easy to recognize in your history later.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">Photo</label>
          <div
            className="group flex h-72 w-full cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed border-white/15 bg-white/5 text-center transition hover:border-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            {image ? (
              <img src={image.url} alt="Plant preview" className="h-full w-full rounded-[1.6rem] object-cover" />
            ) : (
              <>
                <CameraIcon className="h-12 w-12 text-slate-500 group-hover:text-primary" />
                <p className="mt-2 text-sm text-slate-300">Click to upload an image</p>
              </>
            )}
          </div>
          <button onClick={() => setShowTips(true)} className="mt-2 text-sm text-primary hover:underline">
            Photo tips for best results
          </button>
        </div>

        <div className="grid gap-3 rounded-[1.75rem] border border-white/10 bg-white/5 p-5 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">What you get</p>
            <p className="mt-2 text-sm text-slate-300">A health read, likely stress or disease clues, and a saved baseline snapshot.</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">What you learn</p>
            <p className="mt-2 text-sm text-slate-300">The app explains why symptoms matter so each analysis also teaches better plant care.</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Why save it</p>
            <p className="mt-2 text-sm text-slate-300">Future snapshots can be compared against this one to show improvement or decline over time.</p>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-primary/15 bg-primary/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Best first habit</p>
          <p className="mt-2 text-sm text-slate-200">
            Start with a clear baseline photo. The more similar your future check-ins are in angle and lighting, the more useful the app becomes for comparison and learning.
          </p>
        </div>

        {error && <p className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p>}

        <div className="flex justify-end gap-4">
          <button onClick={onCancel} className="rounded-2xl px-6 py-3 font-medium text-slate-300 transition hover:bg-white/10">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || analysisPhase !== 'idle' || !plantName || !image}
            className="aurora-button flex items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-6 py-3 text-base font-semibold text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <>
              <SparklesIcon className="mr-2 h-5 w-5" />
              Analyze & Save
            </>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPlantPage;
