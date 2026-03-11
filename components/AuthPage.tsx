import React, { useMemo, useState } from 'react';
import { GuestAnalysisResult } from '../types';
import { fileToDataUrl } from '../utils/fileUtils';
import LeafIcon from './icons/LeafIcon';
import AnalysisScanner from './AnalysisScanner';

interface AuthPageProps {
  mode: 'login' | 'register';
  onModeChange: (mode: 'login' | 'register') => void;
  onSubmit: (payload: { name?: string; username: string; password: string }) => Promise<void>;
  onGuestAnalyze: (imageDataUrl: string) => Promise<GuestAnalysisResult>;
  isWorking: boolean;
  error: string | null;
}

const usernamePattern = /^[a-z0-9_]{3,20}$/;

const passwordChecks = (password: string) => [
  { label: 'At least 8 characters', passed: password.length >= 8 },
  { label: 'One uppercase letter', passed: /[A-Z]/.test(password) },
  { label: 'One lowercase letter', passed: /[a-z]/.test(password) },
  { label: 'One number', passed: /\d/.test(password) },
];

const AuthMascot: React.FC<{ mood: 'idle' | 'happy' | 'shy' | 'sad' }> = ({ mood }) => (
  <div className={`auth-mascot auth-mascot-${mood}`} aria-hidden="true">
    <span className="auth-mascot-aura auth-mascot-aura-a" />
    <span className="auth-mascot-aura auth-mascot-aura-b" />
    <div className="auth-mascot-sprout">
      <span className="auth-mascot-leaf auth-mascot-leaf-left" />
      <span className="auth-mascot-leaf auth-mascot-leaf-right" />
    </div>
    <div className="auth-mascot-head">
      <span className="auth-mascot-eye auth-mascot-eye-left" />
      <span className="auth-mascot-eye auth-mascot-eye-right" />
      <span className="auth-mascot-mouth" />
      <span className="auth-mascot-cheek auth-mascot-cheek-left" />
      <span className="auth-mascot-cheek auth-mascot-cheek-right" />
    </div>
    <div className="auth-mascot-body">
      <span className="auth-mascot-core" />
    </div>
    <span className="auth-mascot-arm auth-mascot-arm-left" />
    <span className="auth-mascot-arm auth-mascot-arm-right" />
  </div>
);

const AuthPage: React.FC<AuthPageProps> = ({ mode, onModeChange, onSubmit, onGuestAnalyze, isWorking, error }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [guestImage, setGuestImage] = useState<{ file: File; url: string } | null>(null);
  const [guestResult, setGuestResult] = useState<GuestAnalysisResult | null>(null);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [isGuestWorking, setIsGuestWorking] = useState(false);

  const normalizedUsername = username.trim().toLowerCase();
  const usernameIsValid = usernamePattern.test(normalizedUsername);
  const passwordRules = useMemo(() => passwordChecks(password), [password]);
  const passwordIsValid = passwordRules.every((rule) => rule.passed);
  const authErrorIsCredential = Boolean(error && /invalid|incorrect|required|must/i.test(error));

  const mascotMood = useMemo<'idle' | 'happy' | 'shy' | 'sad'>(() => {
    if (showPassword) return 'shy';
    if (authErrorIsCredential) return 'sad';
    if (mode === 'register' && username.length > 0 && password.length > 0 && usernameIsValid && passwordIsValid) return 'happy';
    if (mode === 'login' && username.length > 0 && password.length > 0) return 'happy';
    return 'idle';
  }, [authErrorIsCredential, mode, password.length, passwordIsValid, showPassword, username.length, usernameIsValid]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (mode === 'register' && !usernameIsValid) {
      return;
    }

    if (mode === 'register' && !passwordIsValid) {
      return;
    }

    await onSubmit({ name, username: normalizedUsername, password });
  };

  const handleGuestChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setGuestImage({ file, url: URL.createObjectURL(file) });
    setGuestResult(null);
    setGuestError(null);
  };

  const handleGuestAnalyze = async () => {
    if (!guestImage) return;
    setIsGuestWorking(true);
    setGuestError(null);
    try {
      const imageDataUrl = await fileToDataUrl(guestImage.file);
      const result = await onGuestAnalyze(imageDataUrl);
      setGuestResult(result);
    } catch (guestAnalysisError) {
      console.error(guestAnalysisError);
      setGuestError(guestAnalysisError instanceof Error ? guestAnalysisError.message : 'Guest analysis failed.');
    } finally {
      setIsGuestWorking(false);
    }
  };

  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-7xl gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="glass-panel relative overflow-hidden rounded-[2rem] p-8 sm:p-12">
          <div className="leaf-film absolute inset-0 opacity-40" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-3 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-primary">
              <LeafIcon className="h-4 w-4" />
              Plant Monitor V5
            </div>
            <h1 className="mt-8 font-display text-5xl font-bold tracking-tight text-white sm:text-6xl">
              Diagnose, remember, and manage every plant from one living dashboard.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-300">
              Sign in with a simple username and password, or try one guest analysis that never saves anything. The saved experience includes Neon accounts, reminders, persistent AI chat, and photo history.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                'Username + password only',
                'Persistent plant and global AI chats',
                'Guest try mode with zero saved data',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/20 p-4 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </div>

            <div className="leaf-marquee mt-10">
              <div className="leaf-track">
                {['Monstera', 'Philodendron', 'Pothos', 'Calathea', 'Ficus', 'Anthurium', 'Fern', 'Alocasia'].map((label) => (
                  <div key={label} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                    {label}
                  </div>
                ))}
                {['Monstera', 'Philodendron', 'Pothos', 'Calathea', 'Ficus', 'Anthurium', 'Fern', 'Alocasia'].map((label) => (
                  <div key={`${label}-dup`} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="glass-panel rounded-[2rem] p-8 sm:p-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
                {(['login', 'register'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onModeChange(value)}
                    className={`aurora-button rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                      mode === value ? 'bg-primary text-slate-950' : 'text-slate-300'
                    }`}
                  >
                    {value === 'login' ? 'Log In' : 'Sign Up'}
                  </button>
                ))}
              </div>
              <div className="auth-coach rounded-[1.75rem] border border-white/10 bg-slate-950/25 px-4 py-4">
                <div className="flex items-center gap-4">
                  <AuthMascot mood={mascotMood} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Plant Buddy</p>
                    <p className="mt-2 max-w-xs text-sm text-slate-200">
                      {showPassword
                        ? 'I will politely look away while the password is visible.'
                        : authErrorIsCredential
                          ? 'That login looks off. I am frowning until the details match.'
                          : mascotMood === 'happy'
                            ? 'Nice. These details look ready.'
                            : 'Pick a clean username and a stronger password to make me nod.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {mode === 'register' && (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Display name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-primary focus:bg-white/10"
                    placeholder="Leaf House"
                    required
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-300">Username</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value.replace(/\s+/g, '').toLowerCase())}
                  className={`w-full rounded-2xl border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-primary focus:bg-white/10 ${
                    username.length === 0
                      ? 'border-white/10'
                      : usernameIsValid
                        ? 'border-emerald-300/35'
                        : 'border-rose-300/35'
                  }`}
                  placeholder="plantlover99"
                  required
                />
                <p className={`mt-2 text-xs ${username.length === 0 ? 'text-slate-400' : usernameIsValid ? 'text-emerald-200' : 'text-rose-200'}`}>
                  Use 3-20 lowercase letters, numbers, or underscores.
                </p>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-300">Password</span>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={`w-full rounded-2xl border bg-white/5 px-4 py-3 pr-28 text-white outline-none transition focus:border-primary focus:bg-white/10 ${
                      password.length === 0
                        ? 'border-white/10'
                        : mode === 'login' || passwordIsValid
                          ? 'border-emerald-300/35'
                          : 'border-rose-300/35'
                    }`}
                    placeholder="Your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {mode === 'register' ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {passwordRules.map((rule) => (
                      <div
                        key={rule.label}
                        className={`rounded-xl border px-3 py-2 text-xs ${
                          password.length === 0
                            ? 'border-white/10 bg-white/5 text-slate-400'
                            : rule.passed
                              ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100'
                              : 'border-rose-300/20 bg-rose-500/10 text-rose-100'
                        }`}
                      >
                        {rule.passed ? '[ok]' : '[ ]'} {rule.label}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">Toggle show password if you need to check what you typed.</p>
                )}
              </label>

              {error && <p className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p>}

              <button
                type="submit"
                disabled={isWorking || (mode === 'register' && (!usernameIsValid || !passwordIsValid))}
                className="aurora-button w-full rounded-2xl bg-primary px-5 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isWorking ? 'Working...' : mode === 'login' ? 'Log In' : 'Create Account'}
              </button>
            </form>
          </div>

          <div className="glass-panel rounded-[2rem] p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Guest Try</p>
                <h2 className="mt-2 font-display text-2xl font-bold text-white">One photo. One AI answer. Nothing saved.</h2>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <input type="file" accept="image/*" onChange={handleGuestChange} className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:font-semibold file:text-slate-950" />
              {guestImage ? <img src={guestImage.url} alt="Guest preview" className="h-56 w-full rounded-[1.5rem] object-cover" /> : null}
              {guestError ? <p className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{guestError}</p> : null}
              <button
                type="button"
                onClick={handleGuestAnalyze}
                disabled={!guestImage || isGuestWorking}
                className="aurora-button rounded-2xl bg-white/10 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGuestWorking ? 'Analyzing...' : 'Try as Guest'}
              </button>
              {isGuestWorking ? (
                <AnalysisScanner
                  label="Running a one-time guest scan"
                  detail="This quick demo reads the photo once, returns the result, and saves nothing."
                />
              ) : null}
              {guestResult ? (
                <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/20 p-5">
                  <p className="text-sm uppercase tracking-[0.24em] text-primary">One-time result</p>
                  <p className="mt-3 text-slate-100">{guestResult.summary}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Health</p>
                      <p className="mt-2 font-semibold text-white">{guestResult.analysis.health}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Species</p>
                      <p className="mt-2 font-semibold text-white">{guestResult.analysis.commonName || guestResult.analysis.species || 'Unknown'}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuthPage;
