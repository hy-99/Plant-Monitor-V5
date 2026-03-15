import React from 'react';
import { Plant } from '../types';
import { PlantTrend } from '../utils/plantInsights';

interface PlantCardProps {
  plant: Plant;
  trend?: PlantTrend;
  onClick: () => void;
  style?: React.CSSProperties;
}

const HealthIndicator: React.FC<{ health: 'Healthy' | 'Stressed' | 'Unhealthy' | 'Unknown' }> = ({ health }) => {
  const healthInfo = {
    Healthy: { color: 'bg-green-500', text: 'Healthy' },
    Stressed: { color: 'bg-yellow-500', text: 'Stressed' },
    Unhealthy: { color: 'bg-red-500', text: 'Unhealthy' },
    Unknown: { color: 'bg-gray-400', text: 'Unknown' },
  };
  const { color, text } = healthInfo[health] || healthInfo.Unknown;

  return (
    <div className="absolute top-3 right-3 flex items-center bg-black bg-opacity-40 text-white text-xs font-semibold px-2 py-1 rounded-full backdrop-blur-sm">
      <span className={`h-2 w-2 rounded-full ${color} mr-1.5`}></span>
      {text}
    </div>
  );
};

const PlantCard: React.FC<PlantCardProps> = ({ plant, trend, onClick, style }) => {
  if (!plant.snapshots || plant.snapshots.length === 0) {
    return null;
  }

  const latestSnapshot = plant.snapshots[plant.snapshots.length - 1];
  if (!latestSnapshot) return null;

  const analysis = latestSnapshot.analysis;
  const displayName = analysis.commonName || analysis.species || 'Plant record';
  const nextLearningLine =
    trend?.reasons[0] ||
    latestSnapshot.summary ||
    analysis.advice[0]?.description ||
    'Open this plant to review changes, care advice, and the latest learning notes.';
  const statusTone =
    trend?.status === 'improving'
      ? 'bg-emerald-400/15 text-emerald-100'
      : trend?.status === 'declining'
        ? 'bg-rose-400/15 text-rose-100'
        : 'bg-slate-400/15 text-slate-100';

  return (
    <div
      style={style}
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
    >
      <div className="relative">
        <img
          className="h-56 w-full object-cover"
          src={latestSnapshot.imageUrl}
          alt={plant.name}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>

        {analysis && <HealthIndicator health={analysis.health} />}

        <div className="absolute bottom-0 p-4 w-full">
          <h3 className="text-xl font-bold text-white tracking-wide">
            {plant.name}
          </h3>

          <p className="text-sm text-slate-200 mt-1">
            {displayName}
          </p>

          {/* V4: plant-gate result for latest snapshot */}
          {analysis?.plantGateConfidence !== undefined && (
            <p className="text-[10px] text-slate-200 mt-1">
              Last check: {analysis.isPlant ? 'Plant' : 'Not plant'} (
              {(analysis.plantGateConfidence * 100).toFixed(0)}%)
            </p>
          )}

          {latestSnapshot.summary && (
            <p className="text-xs text-slate-100 mt-2 rounded-xl bg-white/20 p-2 backdrop-blur-sm">
              {latestSnapshot.summary}
            </p>
          )}
          {trend ? (
            <p className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${statusTone}`}>
              {trend.status}
            </p>
          ) : null}
        </div>
      </div>
      <div className="space-y-3 bg-white/5 p-4">
        <div className="grid grid-cols-2 gap-3 text-left text-xs text-slate-300">
          <div className="rounded-2xl bg-white/5 px-3 py-3">
            <p className="uppercase tracking-[0.2em] text-slate-500">Last scan</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {new Date(latestSnapshot.timestamp).toLocaleDateString()}
            </p>
          </div>
          <div className="rounded-2xl bg-white/5 px-3 py-3">
            <p className="uppercase tracking-[0.2em] text-slate-500">Snapshots</p>
            <p className="mt-2 text-sm font-semibold text-white">{plant.snapshots.length}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left">
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary">What to learn next</p>
          <p className="mt-2 text-sm text-slate-200">{nextLearningLine}</p>
        </div>
        <div className="text-center text-sm font-semibold text-primary transition-colors group-hover:text-accent">
          View Details &amp; History
        </div>
      </div>
    </div>
  );
};

export default PlantCard;
