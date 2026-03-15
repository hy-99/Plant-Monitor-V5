import React from 'react';
import { createPortal } from 'react-dom';

interface PlantShatterSequenceProps {
  imageUrl: string;
  plantName: string;
}

const shards = [
  { clip: 'polygon(0 0, 40% 0, 34% 22%, 0 30%)', tx: '-18vw', ty: '10vh', rot: '-18deg', delay: '0ms' },
  { clip: 'polygon(40% 0, 67% 0, 64% 18%, 34% 22%)', tx: '-6vw', ty: '6vh', rot: '10deg', delay: '16ms' },
  { clip: 'polygon(67% 0, 100% 0, 100% 20%, 64% 18%)', tx: '12vw', ty: '8vh', rot: '18deg', delay: '28ms' },
  { clip: 'polygon(0 30%, 34% 22%, 27% 47%, 0 54%)', tx: '-20vw', ty: '20vh', rot: '-28deg', delay: '46ms' },
  { clip: 'polygon(34% 22%, 64% 18%, 59% 45%, 27% 47%)', tx: '-4vw', ty: '16vh', rot: '-8deg', delay: '58ms' },
  { clip: 'polygon(64% 18%, 100% 20%, 100% 46%, 59% 45%)', tx: '17vw', ty: '18vh', rot: '22deg', delay: '74ms' },
  { clip: 'polygon(0 54%, 27% 47%, 23% 70%, 0 76%)', tx: '-16vw', ty: '34vh', rot: '-24deg', delay: '90ms' },
  { clip: 'polygon(27% 47%, 59% 45%, 53% 72%, 23% 70%)', tx: '-3vw', ty: '31vh', rot: '7deg', delay: '104ms' },
  { clip: 'polygon(59% 45%, 100% 46%, 100% 69%, 74% 66%, 53% 72%)', tx: '14vw', ty: '33vh', rot: '24deg', delay: '118ms' },
  { clip: 'polygon(0 76%, 23% 70%, 18% 100%, 0 100%)', tx: '-12vw', ty: '54vh', rot: '-18deg', delay: '134ms' },
  { clip: 'polygon(23% 70%, 53% 72%, 48% 100%, 18% 100%)', tx: '-1vw', ty: '48vh', rot: '10deg', delay: '148ms' },
  { clip: 'polygon(53% 72%, 74% 66%, 82% 100%, 48% 100%)', tx: '7vw', ty: '50vh', rot: '18deg', delay: '164ms' },
  { clip: 'polygon(74% 66%, 100% 69%, 100% 100%, 82% 100%)', tx: '18vw', ty: '58vh', rot: '30deg', delay: '178ms' },
  { clip: 'polygon(14% 14%, 28% 14%, 24% 28%, 10% 27%)', tx: '-28vw', ty: '8vh', rot: '-30deg', delay: '64ms' },
  { clip: 'polygon(78% 12%, 92% 14%, 88% 30%, 76% 28%)', tx: '28vw', ty: '10vh', rot: '34deg', delay: '82ms' },
  { clip: 'polygon(8% 82%, 24% 76%, 22% 92%, 10% 100%)', tx: '-24vw', ty: '68vh', rot: '-26deg', delay: '154ms' },
  { clip: 'polygon(76% 78%, 92% 82%, 90% 100%, 78% 92%)', tx: '24vw', ty: '72vh', rot: '28deg', delay: '188ms' },
] as const;

const cracks = [
  { x: '52%', y: '18%', len: '44%', rot: '78deg', delay: '0ms' },
  { x: '48%', y: '22%', len: '38%', rot: '18deg', delay: '40ms' },
  { x: '44%', y: '50%', len: '48%', rot: '-8deg', delay: '78ms' },
  { x: '58%', y: '52%', len: '42%', rot: '-68deg', delay: '112ms' },
  { x: '28%', y: '68%', len: '30%', rot: '-34deg', delay: '148ms' },
  { x: '74%', y: '70%', len: '26%', rot: '32deg', delay: '182ms' },
  { x: '22%', y: '28%', len: '24%', rot: '-132deg', delay: '70ms' },
  { x: '76%', y: '24%', len: '20%', rot: '124deg', delay: '92ms' },
  { x: '18%', y: '52%', len: '22%', rot: '-88deg', delay: '122ms' },
  { x: '84%', y: '48%', len: '18%', rot: '84deg', delay: '144ms' },
  { x: '34%', y: '82%', len: '18%', rot: '148deg', delay: '168ms' },
  { x: '66%', y: '84%', len: '16%', rot: '28deg', delay: '196ms' },
] as const;

const chips = [
  { x: '16%', y: '22%', tx: '-22vw', ty: '18vh', rot: '-46deg', delay: '56ms', size: '0.78rem', clip: 'polygon(0 10%, 78% 0, 100% 42%, 66% 100%, 8% 88%)' },
  { x: '36%', y: '18%', tx: '-8vw', ty: '12vh', rot: '34deg', delay: '74ms', size: '0.66rem', clip: 'polygon(12% 0, 100% 12%, 86% 100%, 0 74%)' },
  { x: '64%', y: '20%', tx: '10vw', ty: '10vh', rot: '-36deg', delay: '90ms', size: '0.7rem', clip: 'polygon(0 0, 84% 14%, 100% 76%, 24% 100%)' },
  { x: '82%', y: '26%', tx: '24vw', ty: '16vh', rot: '42deg', delay: '108ms', size: '0.82rem', clip: 'polygon(10% 0, 100% 24%, 72% 100%, 0 66%)' },
  { x: '20%', y: '48%', tx: '-26vw', ty: '30vh', rot: '-40deg', delay: '124ms', size: '0.74rem', clip: 'polygon(0 18%, 90% 0, 100% 68%, 24% 100%)' },
  { x: '44%', y: '42%', tx: '-6vw', ty: '24vh', rot: '30deg', delay: '138ms', size: '0.62rem', clip: 'polygon(0 8%, 100% 0, 78% 100%, 12% 82%)' },
  { x: '58%', y: '50%', tx: '8vw', ty: '28vh', rot: '-32deg', delay: '154ms', size: '0.86rem', clip: 'polygon(18% 0, 100% 22%, 76% 100%, 0 86%)' },
  { x: '78%', y: '52%', tx: '22vw', ty: '34vh', rot: '38deg', delay: '172ms', size: '0.68rem', clip: 'polygon(0 10%, 84% 0, 100% 52%, 30% 100%)' },
  { x: '26%', y: '76%', tx: '-16vw', ty: '58vh', rot: '-28deg', delay: '184ms', size: '0.76rem', clip: 'polygon(0 0, 88% 18%, 70% 100%, 10% 82%)' },
  { x: '70%', y: '80%', tx: '18vw', ty: '62vh', rot: '34deg', delay: '206ms', size: '0.72rem', clip: 'polygon(12% 0, 100% 16%, 86% 100%, 0 72%)' },
] as const;

const glints = [
  { x: '20%', y: '18%', len: '7rem', rot: '-24deg', delay: '24ms' },
  { x: '70%', y: '22%', len: '6.4rem', rot: '18deg', delay: '54ms' },
  { x: '34%', y: '56%', len: '5.8rem', rot: '-14deg', delay: '92ms' },
  { x: '62%', y: '62%', len: '6.2rem', rot: '22deg', delay: '120ms' },
] as const;

const sparks = [
  { x: '12%', y: '18%', tx: '-24vw', ty: '-8vh', rot: '-32deg', delay: '42ms', size: '0.9rem' },
  { x: '22%', y: '10%', tx: '-16vw', ty: '-12vh', rot: '-12deg', delay: '56ms', size: '0.7rem' },
  { x: '78%', y: '12%', tx: '18vw', ty: '-10vh', rot: '18deg', delay: '72ms', size: '0.8rem' },
  { x: '88%', y: '24%', tx: '26vw', ty: '-4vh', rot: '34deg', delay: '88ms', size: '1rem' },
  { x: '8%', y: '54%', tx: '-28vw', ty: '8vh', rot: '-38deg', delay: '102ms', size: '0.86rem' },
  { x: '92%', y: '50%', tx: '30vw', ty: '10vh', rot: '42deg', delay: '118ms', size: '0.82rem' },
  { x: '18%', y: '84%', tx: '-18vw', ty: '24vh', rot: '-24deg', delay: '136ms', size: '0.76rem' },
  { x: '78%', y: '86%', tx: '18vw', ty: '26vh', rot: '24deg', delay: '156ms', size: '0.9rem' },
] as const;

const trails = [
  { x: '18%', y: '26%', tx: '-34vw', ty: '10vh', rot: '-26deg', delay: '120ms', len: '10rem' },
  { x: '32%', y: '16%', tx: '-18vw', ty: '-2vh', rot: '-12deg', delay: '150ms', len: '8rem' },
  { x: '50%', y: '12%', tx: '0vw', ty: '-8vh', rot: '0deg', delay: '176ms', len: '9rem' },
  { x: '72%', y: '18%', tx: '20vw', ty: '-2vh', rot: '14deg', delay: '204ms', len: '8.4rem' },
  { x: '84%', y: '30%', tx: '34vw', ty: '10vh', rot: '28deg', delay: '232ms', len: '10rem' },
  { x: '20%', y: '72%', tx: '-30vw', ty: '26vh', rot: '-20deg', delay: '260ms', len: '9rem' },
  { x: '50%', y: '82%', tx: '0vw', ty: '34vh', rot: '0deg', delay: '286ms', len: '11rem' },
  { x: '80%', y: '72%', tx: '30vw', ty: '26vh', rot: '20deg', delay: '314ms', len: '9rem' },
] as const;

const PlantShatterSequence: React.FC<PlantShatterSequenceProps> = ({ imageUrl, plantName }) => {
  const backgroundImage = `url(${imageUrl})`;
  const content = (
    <div className="plant-shatter-screen">
      <div className="plant-shatter-backdrop" />
      <div className="plant-shatter-afterglow" />
      <div className="plant-shatter-aura" />
      <div className="plant-shatter-speedlines" />
      <div className="plant-shatter-sigil" />
      <div className="plant-shatter-shockwave" />
      <div className="plant-shatter-crossflare" />
      <div className="plant-shatter-prism-bloom" />
      <div className="plant-shatter-finisher-ring" />
      {trails.map((trail, index) => (
        <span
          key={`${trail.x}-${trail.y}-${index}`}
          className="plant-shatter-trail"
          style={
            {
              '--trail-x': trail.x,
              '--trail-y': trail.y,
              '--trail-tx': trail.tx,
              '--trail-ty': trail.ty,
              '--trail-rot': trail.rot,
              '--trail-delay': trail.delay,
              '--trail-len': trail.len,
            } as React.CSSProperties
          }
        />
      ))}
      <div className="plant-shatter-shell">
        <p className="plant-shatter-kicker">Final Snapshot Removed</p>
        <h1 className="plant-shatter-title">{plantName} is breaking away.</h1>
        <p className="plant-shatter-detail">
          This plant has no saved screenshots left, so its record is falling out of the collection.
        </p>

        <div className="plant-shatter-stage">
          <div className="plant-shatter-frame">
            <div className="plant-shatter-void" />
            <div className="plant-shatter-image-base" style={{ backgroundImage }} />
            <div className="plant-shatter-texture" />
            <div className="plant-shatter-impact-ring" />
            <div className="plant-shatter-flash" />
            <div className="plant-shatter-lens-sweep" />
            <div className="plant-shatter-core-bloom" />
            {glints.map((glint, index) => (
              <span
                key={`${glint.x}-${glint.y}-${index}`}
                className="plant-shatter-glint"
                style={
                  {
                    '--glint-x': glint.x,
                    '--glint-y': glint.y,
                    '--glint-len': glint.len,
                    '--glint-rot': glint.rot,
                    '--glint-delay': glint.delay,
                  } as React.CSSProperties
                }
              />
            ))}
            {sparks.map((spark, index) => (
              <span
                key={`${spark.x}-${spark.y}-${index}`}
                className="plant-shatter-spark"
                style={
                  {
                    '--spark-x': spark.x,
                    '--spark-y': spark.y,
                    '--spark-tx': spark.tx,
                    '--spark-ty': spark.ty,
                    '--spark-rot': spark.rot,
                    '--spark-delay': spark.delay,
                    '--spark-size': spark.size,
                  } as React.CSSProperties
                }
              />
            ))}
            {cracks.map((crack, index) => (
              <span
                key={`${crack.x}-${crack.rot}-${index}`}
                className="plant-shatter-crack"
                style={
                  {
                    '--crack-x': crack.x,
                    '--crack-y': crack.y,
                    '--crack-len': crack.len,
                    '--crack-rot': crack.rot,
                    '--crack-delay': crack.delay,
                  } as React.CSSProperties
                }
              />
            ))}
            {shards.map((shard, index) => (
              <div
                key={`${shard.clip}-${index}`}
                className="plant-shatter-piece"
                style={
                  {
                    '--piece-clip': shard.clip,
                    '--piece-tx': shard.tx,
                    '--piece-ty': shard.ty,
                    '--piece-rot': shard.rot,
                    '--piece-delay': shard.delay,
                    backgroundImage,
                  } as React.CSSProperties
                }
              />
            ))}
            {chips.map((chip, index) => (
              <span
                key={`${chip.x}-${chip.y}-${index}`}
                className="plant-shatter-chip"
                style={
                  {
                    '--chip-x': chip.x,
                    '--chip-y': chip.y,
                    '--chip-tx': chip.tx,
                    '--chip-ty': chip.ty,
                    '--chip-rot': chip.rot,
                    '--chip-delay': chip.delay,
                    '--chip-size': chip.size,
                    '--chip-clip': chip.clip,
                  } as React.CSSProperties
                }
              />
            ))}
            <div className="plant-shatter-dust" />
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
};

export default PlantShatterSequence;
