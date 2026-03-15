import React from 'react';

interface AnalysisScannerProps {
  label?: string;
  detail?: string;
}

const AnalysisScanner: React.FC<AnalysisScannerProps> = ({
  label = 'Analyzing plant signals',
  detail = 'The app is reading structure, leaf stress, and disease clues from the uploaded photo.',
}) => {
  return (
    <div className="scanner-card glass-panel my-6 rounded-[2rem] p-8 text-center">
      <div className="scanner-stage mx-auto">
        <div className="scanner-grid" />
        <div className="scanner-ping scanner-ping-a" />
        <div className="scanner-ping scanner-ping-b" />
        <div className="scanner-orbit scanner-orbit-a" />
        <div className="scanner-orbit scanner-orbit-b" />
        <div className="scanner-spark scanner-spark-a" />
        <div className="scanner-spark scanner-spark-b" />
        <div className="scanner-spark scanner-spark-c" />
        <div className="scanner-drone scanner-drone-a">
          <div className="scanner-drone-core" />
          <div className="scanner-drone-ring" />
          <div className="scanner-ray scanner-ray-a" />
        </div>
        <div className="scanner-drone scanner-drone-b">
          <div className="scanner-drone-core" />
          <div className="scanner-drone-ring" />
          <div className="scanner-ray scanner-ray-b" />
        </div>
        <div className="scanner-drone scanner-drone-c">
          <div className="scanner-drone-core" />
          <div className="scanner-drone-ring" />
          <div className="scanner-ray scanner-ray-c" />
        </div>
        <div className="scanner-hub" />
        <div className="scanner-plant">
          <div className="scanner-plant-holo" />
          <div className="scanner-leaf scanner-leaf-left" />
          <div className="scanner-leaf scanner-leaf-right" />
          <div className="scanner-stem" />
        </div>
        <div className="scanner-glow" />
      </div>
      <p className="mt-5 text-lg font-semibold text-primary">{label}</p>
      <p className="mt-2 text-sm text-slate-300">{detail}</p>
    </div>
  );
};

export default AnalysisScanner;
