import React from 'react';
import { User } from '../types';
import LeafIcon from './icons/LeafIcon';

interface HeaderProps {
  currentPage: 'home' | 'add' | 'detail' | 'chat' | 'calendar' | 'achievements' | 'profile';
  user: User;
  equippedTitle: string;
  onNavigate: (page: 'home' | 'add' | 'detail' | 'chat' | 'calendar' | 'achievements' | 'profile') => void;
  onLogout: () => void;
  activeReminderCount: number;
}

const Header: React.FC<HeaderProps> = ({ currentPage, user, equippedTitle, onNavigate, onLogout, activeReminderCount }) => {
  const navItems = [
    { id: 'home', label: 'Dashboard' },
    { id: 'add', label: 'Add Plant' },
    { id: 'chat', label: 'AI Chat' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'achievements', label: 'Achievements' },
  ] as const;

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6">
        <button onClick={() => onNavigate('home')} className="flex items-center gap-3">
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-2 text-primary">
            <LeafIcon className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="font-display text-xl font-bold text-white">Plant Guard</p>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Plant care, tracking, and learning</p>
          </div>
        </button>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as 'home' | 'add' | 'chat' | 'calendar' | 'achievements')}
              className={`aurora-button rounded-full px-4 py-2 text-sm font-semibold ${
                currentPage === item.id ? 'border border-cyan-300/30 bg-cyan-400/10 text-cyan-300' : 'text-slate-300'
              }`}
            >
              <span>{item.label}</span>
              {item.id === 'calendar' && activeReminderCount > 0 ? (
                <span className="ml-2 rounded-full border border-rose-300/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                  {activeReminderCount}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right transition hover:border-primary/40 sm:block"
          >
            <p className="text-sm font-semibold text-white">{user.name}</p>
            <p className="text-[10px] uppercase tracking-[0.24em] text-primary">{equippedTitle}</p>
            <p className="text-xs text-slate-400">@{user.username}</p>
          </button>
          <button
            onClick={onLogout}
            className="aurora-button rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200"
          >
            Sign Out
          </button>
        </div>
      </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 md:hidden">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`aurora-button whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
                currentPage === item.id ? 'border border-cyan-300/30 bg-cyan-400/10 text-cyan-300' : 'border border-white/10 bg-white/5 text-slate-300'
              }`}
            >
              {item.label}
              {item.id === 'calendar' && activeReminderCount > 0 ? (
                <span className="ml-2 rounded-full border border-rose-300/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                  {activeReminderCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};

export default Header;
