import React from 'react';
import { Plant, PlantSnapshot } from '../types';
import { getPlantTrend } from '../utils/plantInsights';

interface GrowthChartProps {
  plant?: Plant;
  snapshots: PlantSnapshot[];
}

const parseMeasurement = (value: string | null): number => {
    if (!value) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
};

const GrowthChart: React.FC<GrowthChartProps> = ({ plant, snapshots }) => {
    const trend = plant ? getPlantTrend(plant) : null;
    const latestSnapshot = snapshots[snapshots.length - 1] || null;
    const previousSnapshot = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null;

    if (snapshots.length < 2) {
        return (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6 text-center">
                <p className="text-xs uppercase tracking-[0.22em] text-primary">Timeline locked</p>
                <p className="mt-3 text-lg font-semibold text-white">Add one more snapshot to unlock change-over-time visuals.</p>
                <p className="mt-2 text-sm text-slate-300">
                    Growth charts become more useful when photos are taken from a similar angle and distance, so the next check-in is already educational.
                </p>
            </div>
        );
    }
    
    const data = snapshots.map(s => ({
        date: new Date(s.timestamp),
        height: parseMeasurement(s.analysis.height),
        width: parseMeasurement(s.analysis.width),
    })).sort((a,b) => a.date.getTime() - b.date.getTime()); // Ensure data is sorted by date

    const width = 500;
    const height = 250;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };

    const minDate = data[0].date.getTime();
    const maxDate = data[data.length - 1].date.getTime();
    const rangeDate = maxDate - minDate || 1;

    const allValues = data.flatMap(d => [d.height, d.width]);
    const maxValue = Math.max(...allValues, 1); // Use 1 as minimum to avoid division by zero

    const getX = (date: Date) => margin.left + (date.getTime() - minDate) / rangeDate * (width - margin.left - margin.right);
    const getY = (value: number) => height - margin.bottom - (value / maxValue) * (height - margin.top - margin.bottom);

    const heightPath = data.map(d => `${getX(d.date)},${getY(d.height)}`).join(' L');
    const widthPath = data.map(d => `${getX(d.date)},${getY(d.width)}`).join(' L');

    const yAxisLabels = Array.from({ length: 4 }, (_, i) => {
        const value = (maxValue / 3) * i;
        return { value: value.toFixed(0), y: getY(value) };
    });
    
    const xAxisLabels = data.length > 5 
        ? [data[0], data[Math.floor(data.length / 2)], data[data.length - 1]]
        : data;

    return (
        <div className="relative">
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Latest measurement read</p>
                    <p className="mt-2 text-sm text-slate-200">
                        Height: <span className="font-semibold text-white">{latestSnapshot?.analysis.height || 'Unknown'}</span> | Width:{' '}
                        <span className="font-semibold text-white">{latestSnapshot?.analysis.width || 'Unknown'}</span>
                    </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Comparison use</p>
                    <p className="mt-2 text-sm text-slate-200">
                        {previousSnapshot
                            ? `Compare this chart with the snapshot from ${new Date(previousSnapshot.timestamp).toLocaleDateString()} to see whether visible size and health are moving together.`
                            : 'Add more snapshots over time to make changes easier to interpret.'}
                    </p>
                </div>
            </div>
            {trend ? (
                <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Progress timeline</p>
                            <p className="mt-1 text-lg font-semibold text-white">
                                {trend.status === 'improving' ? 'Improving' : trend.status === 'declining' ? 'Declining' : 'Stable'}
                            </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                            trend.status === 'improving'
                                ? 'bg-emerald-400/15 text-emerald-200'
                                : trend.status === 'declining'
                                    ? 'bg-rose-400/15 text-rose-200'
                                    : 'bg-slate-400/15 text-slate-200'
                        }`}>
                            {trend.status}
                        </span>
                    </div>
                    <div className="mt-3 space-y-2">
                        {trend.reasons.slice(0, 3).map((reason) => (
                            <p key={reason} className="text-sm text-slate-300">{reason}</p>
                        ))}
                    </div>
                </div>
            ) : null}
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" aria-label="Plant growth chart over time">
                <line x1={margin.left} y1={height - margin.bottom} x2={width - margin.right} y2={height - margin.bottom} stroke="#cbd5e1" />

                {/* Y Axis Labels */}
                {yAxisLabels.map(label => (
                    <g key={`y-${label.value}`}>
                        <line
                          x1={margin.left}
                          y1={label.y}
                          x2={width - margin.right}
                          y2={label.y}
                          stroke="rgba(148,163,184,0.14)"
                          strokeDasharray="4 6"
                        />
                        <text x={margin.left - 8} y={label.y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{label.value} cm</text>
                    </g>
                ))}
                
                {/* X Axis Labels */}
                {xAxisLabels.map(d => (
                     <text key={d.date.toISOString()} x={getX(d.date)} y={height - margin.bottom + 15} textAnchor="middle" fontSize="10" fill="#94a3b8">{d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</text>
                ))}
                
                {/* Height Path */}
                <path d={`M${heightPath}`} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {data.map((d, i) => (
                    <circle key={`h-${i}`} cx={getX(d.date)} cy={getY(d.height)} r="4" fill="#fff" stroke="#22c55e" strokeWidth="2" />
                ))}

                {/* Width Path */}
                <path d={`M${widthPath}`} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {data.map((d, i) => (
                    <circle key={`w-${i}`} cx={getX(d.date)} cy={getY(d.width)} r="4" fill="#fff" stroke="#f97316" strokeWidth="2" />
                ))}
            </svg>
            <div className="mt-2 flex items-center justify-center space-x-4 text-sm text-slate-300">
                <div className="flex items-center">
                    <span className="mr-2 h-2 w-4 rounded-full bg-green-500"></span> Height
                </div>
                <div className="flex items-center">
                    <span className="mr-2 h-2 w-4 rounded-full bg-orange-500"></span> Width
                </div>
            </div>
        </div>
    );
};

export default GrowthChart;
