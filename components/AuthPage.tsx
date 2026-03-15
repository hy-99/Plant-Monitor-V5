import React, { useEffect, useMemo, useState } from 'react';
import { GuestAnalysisResult } from '../types';
import { fileToDataUrl } from '../utils/fileUtils';
import LeafIcon from './icons/LeafIcon';
import AnalysisScanner from './AnalysisScanner';
import PlantFactRobot from './PlantFactRobot';

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
  const loginLikelyInvalid = mode === 'login' && username.length > 0 && password.length > 0 && !usernameIsValid;
  const registerLikelyInvalid =
    mode === 'register' &&
    ((username.length > 0 && !usernameIsValid) || (password.length > 0 && !passwordIsValid));
  const formLooksInvalid = loginLikelyInvalid || registerLikelyInvalid;

  useEffect(() => {
    return () => {
      if (guestImage?.url) {
        URL.revokeObjectURL(guestImage.url);
      }
    };
  }, [guestImage]);

  const mascotMood = useMemo<'idle' | 'happy' | 'shy' | 'sad'>(() => {
    if (showPassword) return 'shy';
    if (authErrorIsCredential || formLooksInvalid) return 'sad';
    if (mode === 'register' && username.length > 0 && password.length > 0 && usernameIsValid && passwordIsValid) return 'happy';
    if (mode === 'login' && username.length > 0 && password.length > 0) return 'happy';
    return 'idle';
  }, [authErrorIsCredential, formLooksInvalid, mode, password.length, passwordIsValid, showPassword, username.length, usernameIsValid]);

  const coachMood = useMemo<'warm' | 'curious' | 'excited' | 'sad'>(() => {
    if (authErrorIsCredential || formLooksInvalid) return 'sad';
    if (showPassword) return 'curious';
    if (mascotMood === 'happy') return 'excited';
    return 'curious';
  }, [authErrorIsCredential, formLooksInvalid, mascotMood, showPassword]);

  const coachTitle = mode === 'login' ? 'Login Buddy' : 'Signup Buddy';
  const coachText = showPassword
    ? 'I will politely look away while the password is visible.'
    : authErrorIsCredential
      ? 'That login looks off. I am frowning until the details match.'
      : formLooksInvalid
        ? mode === 'login'
          ? 'Oh no... that username format looks wrong already.'
          : username.length > 0 && !usernameIsValid
            ? 'Oh no... that username will not work yet.'
            : 'Oh no... the password still needs work.'
      : mascotMood === 'happy'
        ? 'Nice. These details look ready.'
        : 'Pick a clean username and a stronger password to make me nod.';
  const coachFooter = mode === 'login' ? 'Simple username and password only.' : 'Lowercase username, stronger password, smoother signup.';

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
    if (guestImage?.url) {
      URL.revokeObjectURL(guestImage.url);
    }
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
    <div className="app-shell flex min-h-screen items-center justify-center px-4 py-8 xl:px-8">
      <div className="grid w-full max-w-[96rem] gap-8 xl:grid-cols-[1.08fr_0.92fr] xl:gap-10">
        <section className="glass-panel auth-hero-panel relative overflow-hidden rounded-[2rem] p-8 sm:p-12">
          <div className="leaf-film absolute inset-0 opacity-40" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-3 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-primary">
              <LeafIcon className="h-4 w-4" />
              Plant Guard
            </div>
            <h1 className="mt-8 font-display text-5xl font-bold tracking-tight text-white sm:text-6xl">
              Diagnose, learn, and manage every plant from one living dashboard.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-300">
              Sign in with a simple username and password, or try one guest analysis that never saves anything. The full workspace combines diagnosis, history, reminders, AI guidance, and short learning moments that help users understand what symptoms mean.
            </p>

            <div className="auth-hero-grid mt-10 grid gap-4 sm:grid-cols-3">
              {[
                'Username + password only',
                'Persistent plant and global AI chats',
                'Guest try mode with zero saved data',
              ].map((item) => (
                <div key={item} className="auth-feature-card auth-feature-float rounded-[1.6rem] border border-white/10 bg-slate-950/20 p-4 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
              <div className="auth-callout rounded-[1.75rem] border border-primary/15 bg-slate-950/25 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Why this flow works</p>
                <div className="mt-4 grid gap-3 text-sm text-slate-200">
                  <div className="auth-feature-float rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Create an account once, then keep a persistent record of every plant and reminder.</div>
                  <div className="auth-feature-float rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Use guest mode when you only want a quick scan and no account storage.</div>
                  <div className="auth-feature-float rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Educational explanations appear after saved analyses so the product helps users improve, not just react.</div>
                </div>
              </div>
              <div className="auth-metrics rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Workspace</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Saved</p>
                    <p className="mt-2 font-display text-3xl text-white">Plants</p>
                    <p className="mt-1 text-sm text-slate-300">Track change over time with image history.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">AI</p>
                    <p className="mt-2 font-display text-3xl text-white">Chats</p>
                    <p className="mt-1 text-sm text-slate-300">Keep a global assistant and plant-specific memory.</p>
                  </div>
                </div>
              </div>
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
          <div className="auth-panel-grid grid gap-6">
          <div className="glass-panel auth-panel-card rounded-[2rem] p-8 sm:p-10">
            <div className="flex flex-col gap-6">
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
                {(['login', 'register'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onModeChange(value)}
                    className={`aurora-button rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                      mode === value ? 'border border-cyan-300/30 bg-cyan-400/10 text-cyan-300' : 'text-slate-300'
                    }`}
                  >
                    {value === 'login' ? 'Log In' : 'Sign Up'}
                  </button>
                ))}
              </div>
              <div className="auth-coach rounded-[1.75rem] border border-white/10 bg-slate-950/25 px-4 py-4 sm:px-5">
                <PlantFactRobot
                  placement="inline"
                  title={coachTitle}
                  text={coachText}
                  footer={coachFooter}
                  moodOverride={coachMood}
                />
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
                    className={`w-full rounded-2xl border bg-white/5 px-4 py-3 pr-32 text-white outline-none transition focus:border-primary focus:bg-white/10 ${
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
                    className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 shadow-lg"
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
                className="aurora-button w-full rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 font-semibold text-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mode === 'login' ? 'Log In' : 'Create Account'}
              </button>
            </form>
          </div>

          <div className="glass-panel auth-panel-card rounded-[2rem] p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Guest Try</p>
                <h2 className="mt-2 font-display text-2xl font-bold text-white">One photo. One AI answer. Nothing saved.</h2>
                <p className="mt-2 text-sm text-slate-300">This is the quick demo lane. It shows the diagnosis experience, but the educational history, reminders, and comparison tools stay in the saved workspace.</p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <input type="file" accept="image/*" onChange={handleGuestChange} className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border file:border-cyan-300/30 file:bg-cyan-400/10 file:px-4 file:py-2 file:font-semibold file:text-cyan-300" />
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
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">What the full app adds</p>
                    <p className="mt-2 text-sm text-slate-200">Saved accounts can compare future snapshots, set reminders, keep chat memory, and learn why these symptoms matter over time.</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuthPage;
