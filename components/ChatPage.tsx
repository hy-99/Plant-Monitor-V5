import React, { useMemo, useState } from 'react';
import { ChatMessage, ChatMode, Plant } from '../types';
import ArrowLeftIcon from './icons/ArrowLeftIcon';

interface ChatPageProps {
  plants: Plant[];
  messages: ChatMessage[];
  selectedPlantId: string | null;
  onChangePlant: (plantId: string | null) => void;
  onBack: () => void;
  onSend: (question: string, mode: ChatMode, plantId: string | null) => Promise<void>;
  isWorking: boolean;
}

const modes: { value: ChatMode; label: string; description: string }[] = [
  { value: 'plant', label: 'Plant Coach', description: 'Uses your saved plant history and recent photos.' },
  { value: 'casual', label: 'Casual Chat', description: 'General conversation without pushing every answer into plant care.' },
  { value: 'web', label: 'Web Answers', description: 'Uses live web search for current information.' },
];

const buildPromptSuggestions = (selectedPlantName: string | null) => {
  if (selectedPlantName) {
    return [
      `What changed between the last two snapshots of ${selectedPlantName}?`,
      `Teach me what the latest stress signals on ${selectedPlantName} usually mean.`,
      `What care routine should I try next for ${selectedPlantName}?`,
      `What should I watch for in the next photo of ${selectedPlantName}?`,
    ];
  }

  return [
    'Which plant in my collection needs the most attention right now?',
    'Teach me how to tell overwatering from underwatering.',
    'What are the best follow-up questions after an unhealthy result?',
    'How should I use snapshots to track improvement over time?',
  ];
};

const ChatPage: React.FC<ChatPageProps> = ({ plants, messages, selectedPlantId, onChangePlant, onBack, onSend, isWorking }) => {
  const [mode, setMode] = useState<ChatMode>('plant');
  const [question, setQuestion] = useState('');

  const selectedPlant = useMemo(
    () => plants.find((plant) => plant.id === selectedPlantId) || null,
    [plants, selectedPlantId]
  );
  const promptSuggestions = useMemo(
    () => buildPromptSuggestions(selectedPlant?.name || null),
    [selectedPlant]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    const currentQuestion = question.trim();
    setQuestion('');
    await onSend(currentQuestion, mode, selectedPlantId);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-primary">
          <ArrowLeftIcon className="h-5 w-5" />
          Back to dashboard
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
        <aside className="glass-panel rounded-[2rem] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-primary">AI Hub</p>
          <h1 className="mt-3 font-display text-4xl font-bold text-white">Plant threads plus one assistant that can diagnose, explain, and teach.</h1>
          <p className="mt-3 text-sm text-slate-300">
            Pick one plant for a focused care conversation, or keep the scope wide to ask bigger questions across your collection. This is where the app becomes both a coach and a learning tool.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Best for</p>
              <p className="mt-2 text-sm text-slate-200">Follow-up diagnosis, care planning, and quick explanations of symptoms or snapshot changes.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Educational use</p>
              <p className="mt-2 text-sm text-slate-200">Ask why a symptom happens, what to monitor next, or how to tell similar plant problems apart.</p>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            {modes.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setMode(item.value)}
                className={`aurora-button w-full rounded-2xl border px-4 py-4 text-left transition ${
                  mode === item.value
                    ? 'border-primary/60 bg-primary/15 text-white'
                    : 'border-white/10 bg-white/5 text-slate-300'
                }`}
              >
                <div className="font-semibold">{item.label}</div>
                <div className="mt-1 text-sm text-slate-300">{item.description}</div>
              </button>
            ))}
          </div>

          <div className="mt-8">
            <label className="mb-2 block text-sm font-semibold text-slate-300">Plant scope</label>
            <select
              value={selectedPlantId || ''}
              onChange={(event) => onChangePlant(event.target.value || null)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-primary"
            >
              <option value="">All saved plants</option>
              {plants.map((plant) => (
                <option key={plant.id} value={plant.id}>
                  {plant.name}
                </option>
              ))}
            </select>
            <p className="mt-3 text-sm text-slate-400">
              {selectedPlant ? `Focused on ${selectedPlant.name}. This conversation is saved to that plant.` : 'Global assistant mode. This conversation can use context across your full collection.'}
            </p>
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold text-slate-200">Starter prompts</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {promptSuggestions.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setQuestion(prompt)}
                  className="aurora-button rounded-full border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-slate-200 transition hover:border-primary/40 hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="glass-panel rounded-[2rem] p-4 sm:p-6">
          <div className="chat-scroll flex h-[70vh] flex-col overflow-y-auto rounded-[1.5rem] border border-white/10 bg-slate-950/20 p-4">
            {messages.length ? (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 ${
                        message.role === 'assistant'
                          ? 'bg-white/8 text-slate-100'
                          : 'border border-cyan-300/25 bg-cyan-400/10 text-cyan-300'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      {message.sources?.length ? (
                        <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-xs">
                          {message.sources.map((source) => (
                            <a
                              key={source.url}
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-primary transition hover:text-accent"
                            >
                              {source.title}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="max-w-xl rounded-[1.75rem] border border-dashed border-white/10 bg-white/[0.03] px-6 py-8">
                  <p className="text-xs uppercase tracking-[0.28em] text-primary">Conversation ready</p>
                  <h2 className="mt-3 font-display text-3xl font-bold text-white">Start with a question that teaches you something useful.</h2>
                  <p className="mt-3 text-sm text-slate-300">
                    Ask about one plant, compare symptom patterns, or use web mode for current care information. The best prompts are specific and tied to what you want to learn next.
                  </p>
                  <div className="mt-5 grid gap-2 text-left text-sm text-slate-200">
                    {promptSuggestions.slice(0, 3).map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setQuestion(prompt)}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-primary/40 hover:text-white"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-3">
            <textarea
              rows={4}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about a saved plant, compare two snapshots, or switch to web mode for current plant-care info."
              className="w-full resize-none bg-transparent px-3 py-2 text-white outline-none placeholder:text-slate-500"
            />
            <div className="mt-3 flex items-center justify-between gap-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                {mode === 'web'
                  ? 'Live web context'
                  : mode === 'casual'
                    ? 'Open conversation'
                    : selectedPlant
                      ? `Saved context: ${selectedPlant.name}`
                      : 'Saved plant context'}
              </p>
              <button
                type="submit"
                disabled={isWorking || !question.trim()}
                className="aurora-button rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 text-sm font-semibold text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isWorking ? 'Thinking...' : 'Send'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default ChatPage;
