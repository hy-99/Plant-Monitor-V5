import React from 'react';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';

interface PhotoTipsModalProps {
  onClose: () => void;
}

const PhotoTipsModal: React.FC<PhotoTipsModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="glass-panel relative w-full max-w-2xl rounded-[2rem] p-6 sm:p-8 animate-fade-in-up">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-primary/40 hover:text-white"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Photo Guide</p>
        <h2 className="mt-3 font-display text-3xl font-bold text-white">How to get the strongest analysis and comparison results</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
          A good plant photo does more than improve one diagnosis. It also makes future comparisons, learning notes, and care decisions much more reliable.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.5rem] border border-emerald-300/15 bg-emerald-400/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">Do this</p>
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="mt-0.5 h-6 w-6 flex-shrink-0 text-emerald-300" />
                <div>
                  <h3 className="font-semibold text-white">Use good lighting</h3>
                  <p className="text-sm text-slate-200">Bright indirect light helps the model read leaf color, texture, and damage more accurately.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="mt-0.5 h-6 w-6 flex-shrink-0 text-emerald-300" />
                <div>
                  <h3 className="font-semibold text-white">Keep the plant in focus</h3>
                  <p className="text-sm text-slate-200">Sharp detail matters, especially around edges, discoloration, and suspicious spots.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="mt-0.5 h-6 w-6 flex-shrink-0 text-emerald-300" />
                <div>
                  <h3 className="font-semibold text-white">Use a simple background</h3>
                  <p className="text-sm text-slate-200">A cleaner frame makes it easier to isolate one plant and understand what changed over time.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-rose-300/15 bg-rose-500/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-200">Avoid this</p>
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <XCircleIcon className="mt-0.5 h-6 w-6 flex-shrink-0 text-rose-300" />
                <div>
                  <h3 className="font-semibold text-white">Blurry photos</h3>
                  <p className="text-sm text-slate-200">Blur hides the signs that separate stress, disease, and normal variation.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <XCircleIcon className="mt-0.5 h-6 w-6 flex-shrink-0 text-rose-300" />
                <div>
                  <h3 className="font-semibold text-white">Multiple plants in one image</h3>
                  <p className="text-sm text-slate-200">If the frame contains several plants, the result can become less specific and less useful for history.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <XCircleIcon className="mt-0.5 h-6 w-6 flex-shrink-0 text-rose-300" />
                <div>
                  <h3 className="font-semibold text-white">Changing the angle every time</h3>
                  <p className="text-sm text-slate-200">Consistency is what turns snapshots into a real monitoring system instead of unrelated photos.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Best habit for learning</p>
          <p className="mt-2 text-sm text-slate-200">
            Try to capture the same plant from a similar distance and angle each time. That makes the app better at teaching whether your care changes are actually helping.
          </p>
        </div>

        <button
          onClick={onClose}
          className="aurora-button mt-6 w-full rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 font-semibold text-cyan-300"
        >
          Got It
        </button>
      </div>
    </div>
  );
};

export default PhotoTipsModal;
