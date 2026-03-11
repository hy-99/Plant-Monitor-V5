import React, { useState } from 'react';

const facts = [
  'Some plants can hear running water and grow roots toward it.',
  'A sunflower is actually a whole crowd of tiny flowers working together.',
  'Plants trade nutrients through underground fungal networks often called the wood wide web.',
  'Leaves can cool themselves by sweating water vapor into the air.',
  'Many houseplants move slowly during the day to follow light.',
  'Some seeds only wake up after fire, smoke, or long dry periods.',
  'Mosses can survive being almost completely dried out and then revive.',
  'Purple undersides on leaves can help some plants reflect light back through the leaf tissue.',
];

const PlantFactRobot: React.FC = () => {
  const [index, setIndex] = useState(0);

  const nextFact = () => {
    setIndex((current) => (current + 1 + Math.floor(Math.random() * (facts.length - 1))) % facts.length);
  };

  return (
    <button
      type="button"
      onClick={nextFact}
      className="factbot-wrap group fixed bottom-6 left-6 z-20 hidden w-72 text-left xl:block"
      aria-label="Show another plant fact"
    >
      <div className="factbot-bubble glass-panel rounded-[1.75rem] px-4 py-4 text-sm text-slate-100 transition-transform duration-300 group-hover:-translate-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Plant Bot Fact</p>
        <p className="mt-2 leading-6">{facts[index]}</p>
        <p className="mt-3 text-xs text-slate-400">Click the robot for another fact.</p>
      </div>
      <div className="factbot-character mt-3 flex items-end gap-3">
        <div className="factbot-spark factbot-spark-a" />
        <div className="factbot-spark factbot-spark-b" />
        <div className="factbot-shadow" />
        <div className="factbot">
          <div className="factbot-antenna" />
          <div className="factbot-head">
            <span className="factbot-eye factbot-eye-left" />
            <span className="factbot-eye factbot-eye-right" />
            <span className="factbot-mouth" />
          </div>
          <div className="factbot-body">
            <span className="factbot-heart" />
          </div>
          <div className="factbot-arm factbot-arm-left" />
          <div className="factbot-arm factbot-arm-right" />
        </div>
        <div className="factbot-leaf-buddy">
          <span className="factbot-leaf factbot-leaf-a" />
          <span className="factbot-leaf factbot-leaf-b" />
        </div>
      </div>
    </button>
  );
};

export default PlantFactRobot;
