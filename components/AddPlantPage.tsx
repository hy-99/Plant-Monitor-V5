import React, { useRef, useState } from 'react';
import { fileToDataUrl } from '../utils/fileUtils';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import CameraIcon from './icons/CameraIcon';
import SparklesIcon from './icons/SparklesIcon';
import PhotoTipsModal from './PhotoTipsModal';
import AnalysisScanner from './AnalysisScanner';

interface AddPlantPageProps {
  onSave: (payload: { name: string; imageDataUrl: string }) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

const AddPlantPage: React.FC<AddPlantPageProps> = ({ onSave, onCancel, isSaving }) => {
  const [plantName, setPlantName] = useState('');
  const [image, setImage] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage({ file, url: URL.createObjectURL(file) });
      setError(null);
    }
  };

  const handleSave = async () => {
    if (!plantName.trim() || !image) {
      setError('Please provide a name and an image for your plant.');
      return;
    }

    if (!window.confirm('Keep this new plant and save its image to managed storage?')) {
      return;
    }

    setError(null);
    try {
      const imageDataUrl = await fileToDataUrl(image.file);
      await onSave({ name: plantName.trim(), imageDataUrl });
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : 'Failed to analyze the plant image. Please try again.');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
      {showTips && <PhotoTipsModal onClose={() => setShowTips(false)} />}
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

        {error && <p className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p>}
        {isSaving ? <AnalysisScanner label="Scanning your new plant" detail="Our tiny greenhouse bot is reading leaf edges, color balance, and possible stress signals." /> : null}

        <div className="flex justify-end gap-4">
          <button onClick={onCancel} className="rounded-2xl px-6 py-3 font-medium text-slate-300 transition hover:bg-white/10">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !plantName || !image}
            className="aurora-button flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-base font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <svg className="-ml-1 mr-3 h-5 w-5 animate-spin text-slate-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <SparklesIcon className="mr-2 h-5 w-5" />
                Analyze & Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPlantPage;
