import React from 'react';

interface AnalysisScannerProps {
  label?: string;
  detail?: string;
}

const AnalysisScanner: React.FC<AnalysisScannerProps> = ({
  label = 'Analyzing plant signals',
  detail = 'Cute greenhouse sensors are checking color, shape, and leaf health.',
}) => {
  return (
    <div className="scanner-card glass-panel my-6 rounded-[2rem] p-8 text-center">
      <div className="scanner-stage mx-auto">
        <div className="scanner-ping scanner-ping-a" />
        <div className="scanner-ping scanner-ping-b" />
        <div className="scanner-orbit scanner-orbit-a" />
        <div className="scanner-orbit scanner-orbit-b" />
        <div className="scanner-spark scanner-spark-a" />
        <div className="scanner-spark scanner-spark-b" />
        <div className="scanner-spark scanner-spark-c" />
        <div className="scanner-bot">
          <div className="scanner-eye scanner-eye-left" />
          <div className="scanner-eye scanner-eye-right" />
          <div className="scanner-smile" />
          <div className="scanner-antenna" />
        </div>
        <div className="scanner-plant">
          <div className="scanner-leaf scanner-leaf-left" />
          <div className="scanner-leaf scanner-leaf-right" />
          <div className="scanner-stem" />
        </div>
        <div className="scanner-beam" />
        <div className="scanner-glow" />
      </div>
      <p className="mt-5 text-lg font-semibold text-primary">{label}</p>
      <p className="mt-2 text-sm text-slate-300">{detail}</p>
    </div>
  );
};

export default AnalysisScanner;
