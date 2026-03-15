import React from 'react';

interface PlantAnalysisSequenceProps {
  plantName: string;
  imageUrl: string;
  phase: 'scanning' | 'complete';
}

const PlantAnalysisSequence: React.FC<PlantAnalysisSequenceProps> = ({ plantName, imageUrl, phase }) => {
  const headline = phase === 'complete' ? 'Analyzation complete!' : 'Scanning your new plant';
  const detail =
    phase === 'complete'
      ? 'The scan is locked in. Your new plant has been saved, and the dashboard is being updated now.'
      : 'Our cartoon greenhouse drones are reading leaf edges, texture, color balance, and stress signals before your new plant joins the collection.';
  const telemetry = phase === 'complete'
    ? [
        { label: 'Leaf contour map', value: 'Locked' },
        { label: 'Stress and color sweep', value: 'Verified' },
        { label: 'Growth baseline archive', value: 'Stored' },
      ]
    : [
        { label: 'Leaf contour map', value: 'Live' },
        { label: 'Stress and color sweep', value: 'Running' },
        { label: 'Growth baseline archive', value: 'Indexing' },
      ];
  const droneRoster = phase === 'complete'
    ? [
        { name: 'Pip', role: 'Contour scout', status: 'clear' },
        { name: 'Moss', role: 'Color reader', status: 'saved' },
        { name: 'Luma', role: 'Archive runner', status: 'done' },
      ]
    : [
        { name: 'Pip', role: 'Contour scout', status: 'sweeping' },
        { name: 'Moss', role: 'Color reader', status: 'sampling' },
        { name: 'Luma', role: 'Archive runner', status: 'tagging' },
      ];

  return (
    <div className="analysis-sequence-screen animate-fade-in">
      <div className="analysis-sequence-backdrop" />
      <div className="analysis-sequence-shell">
        <div className="analysis-sequence-copy">
          <p className="analysis-sequence-kicker">{phase === 'complete' ? 'Mission Saved' : 'Drone Scan'}</p>
          <h1 className="analysis-sequence-title">{headline}</h1>
          <p className="analysis-sequence-detail">{detail}</p>
          <div className="analysis-sequence-chip-row">
            <span className="analysis-sequence-chip">Plant: {plantName}</span>
            <span className="analysis-sequence-chip">{phase === 'complete' ? 'Archive updated' : 'Managed storage in progress'}</span>
          </div>
        </div>

        <div className={`analysis-sequence-stage ${phase === 'complete' ? 'is-complete' : ''}`}>
          <div className="analysis-sequence-frame">
            <div className="analysis-sequence-console analysis-sequence-console-left">
              <p className="analysis-sequence-console-title">Live readout</p>
              <div className="analysis-sequence-readout-list">
                {telemetry.map((item, index) => (
                  <div key={item.label} className="analysis-sequence-readout">
                    <div className="analysis-sequence-readout-meta">
                      <span>{item.label}</span>
                      <span>{item.value}</span>
                    </div>
                    <div className="analysis-sequence-readout-track">
                      <div
                        className={`analysis-sequence-readout-fill analysis-sequence-readout-fill-${index + 1} ${phase === 'complete' ? 'is-complete' : ''}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="analysis-sequence-console analysis-sequence-console-right">
              <p className="analysis-sequence-console-title">Drone squad</p>
              <div className="analysis-sequence-squad-list">
                {droneRoster.map((drone) => (
                  <div key={drone.name} className="analysis-sequence-squad-row">
                    <div>
                      <p className="analysis-sequence-squad-name">{drone.name}</p>
                      <p className="analysis-sequence-squad-role">{drone.role}</p>
                    </div>
                    <span className="analysis-sequence-squad-status">{drone.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="analysis-sequence-preview-wrap">
              <img src={imageUrl} alt={`${plantName} preview`} className="analysis-sequence-preview" />
              <div className="analysis-sequence-preview-glow" />
              <div className="analysis-sequence-scanline" />
              <div className="analysis-sequence-grid" />
              <div className="analysis-sequence-target analysis-sequence-target-a" />
              <div className="analysis-sequence-target analysis-sequence-target-b" />
              <div className="analysis-sequence-node analysis-sequence-node-a">Leaf map</div>
              <div className="analysis-sequence-node analysis-sequence-node-b">Stress read</div>
              <div className="analysis-sequence-node analysis-sequence-node-c">Growth base</div>
              <div className="analysis-sequence-corners analysis-sequence-corners-a" />
              <div className="analysis-sequence-corners analysis-sequence-corners-b" />
            </div>

            <div className="analysis-sequence-orbit analysis-sequence-orbit-a" />
            <div className="analysis-sequence-orbit analysis-sequence-orbit-b" />
            <div className="analysis-sequence-pulse analysis-sequence-pulse-a" />
            <div className="analysis-sequence-pulse analysis-sequence-pulse-b" />
            <div className="analysis-sequence-sweep analysis-sequence-sweep-a" />
            <div className="analysis-sequence-sweep analysis-sequence-sweep-b" />

            <div className="analysis-sequence-drone analysis-sequence-drone-a">
              <span className="analysis-sequence-drone-core" />
              <span className="analysis-sequence-drone-ring" />
              <span className="analysis-sequence-drone-wing analysis-sequence-drone-wing-a" />
              <span className="analysis-sequence-drone-wing analysis-sequence-drone-wing-b" />
              <span className="analysis-sequence-drone-face">
                <span className="analysis-sequence-drone-eye analysis-sequence-drone-eye-left" />
                <span className="analysis-sequence-drone-eye analysis-sequence-drone-eye-right" />
                <span className="analysis-sequence-drone-smile" />
              </span>
              <span className="analysis-sequence-drone-tag">Pip</span>
              <span className="analysis-sequence-drone-beam analysis-sequence-drone-beam-a" />
            </div>

            <div className="analysis-sequence-drone analysis-sequence-drone-b">
              <span className="analysis-sequence-drone-core" />
              <span className="analysis-sequence-drone-ring" />
              <span className="analysis-sequence-drone-wing analysis-sequence-drone-wing-a" />
              <span className="analysis-sequence-drone-wing analysis-sequence-drone-wing-b" />
              <span className="analysis-sequence-drone-face">
                <span className="analysis-sequence-drone-eye analysis-sequence-drone-eye-left" />
                <span className="analysis-sequence-drone-eye analysis-sequence-drone-eye-right" />
                <span className="analysis-sequence-drone-smile" />
              </span>
              <span className="analysis-sequence-drone-tag">Moss</span>
              <span className="analysis-sequence-drone-beam analysis-sequence-drone-beam-b" />
            </div>

            <div className="analysis-sequence-drone analysis-sequence-drone-c">
              <span className="analysis-sequence-drone-core" />
              <span className="analysis-sequence-drone-ring" />
              <span className="analysis-sequence-drone-wing analysis-sequence-drone-wing-a" />
              <span className="analysis-sequence-drone-wing analysis-sequence-drone-wing-b" />
              <span className="analysis-sequence-drone-face">
                <span className="analysis-sequence-drone-eye analysis-sequence-drone-eye-left" />
                <span className="analysis-sequence-drone-eye analysis-sequence-drone-eye-right" />
                <span className="analysis-sequence-drone-smile" />
              </span>
              <span className="analysis-sequence-drone-tag">Luma</span>
              <span className="analysis-sequence-drone-beam analysis-sequence-drone-beam-c" />
            </div>

            <div className="analysis-sequence-spark analysis-sequence-spark-a" />
            <div className="analysis-sequence-spark analysis-sequence-spark-b" />
            <div className="analysis-sequence-spark analysis-sequence-spark-c" />
            <div className="analysis-sequence-spark analysis-sequence-spark-d" />
            <div className="analysis-sequence-complete-glow" />
          </div>

          <div className="analysis-sequence-meter">
            <div className="analysis-sequence-meter-track">
              <div className={`analysis-sequence-meter-fill ${phase === 'complete' ? 'is-complete' : ''}`} />
            </div>
            <div className="analysis-sequence-meter-labels">
              <span>{phase === 'complete' ? 'Scan complete' : 'Reading leaf signals'}</span>
              <span>{phase === 'complete' ? 'Returning to dashboard' : 'Building diagnosis'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlantAnalysisSequence;
