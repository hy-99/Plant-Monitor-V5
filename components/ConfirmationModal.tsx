import React, { useState } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  onConfirm,
  onClose,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  const confirmClassName =
    tone === 'danger'
      ? 'aurora-button rounded-2xl border border-rose-300/20 bg-rose-500/10 px-5 py-3 font-semibold text-rose-100 disabled:cursor-not-allowed disabled:opacity-60'
      : 'aurora-button rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 font-semibold text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60';

  const content = (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md" onClick={onClose}>
      <div
        className="glass-panel relative w-full max-w-lg rounded-[2rem] p-6 sm:p-7 animate-fade-in-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-primary/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Confirm</p>
        <h2 id="confirmation-modal-title" className="mt-3 font-display text-2xl font-bold text-white">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">{message}</p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-2xl px-5 py-3 font-medium text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button type="button" onClick={handleConfirm} disabled={isSubmitting} className={confirmClassName}>
            {isSubmitting ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
};

export default ConfirmationModal;
