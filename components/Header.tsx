import React from 'react';
import { User } from '../types';
import LeafIcon from './icons/LeafIcon';

interface HeaderProps {
  currentPage: 'home' | 'add' | 'detail' | 'chat' | 'calendar';
  user: User;
  onNavigate: (page: 'home' | 'add' | 'detail' | 'chat' | 'calendar') => void;
  onLogout: () => void;
  activeReminderCount: number;
}

const Header: React.FC<HeaderProps> = ({ currentPage, user, onNavigate, onLogout, activeReminderCount }) => {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <button onClick={() => onNavigate('home')} className="flex items-center gap-3">
          <div className="rounded-2xl border border-primary/30 bg-primary/10 p-2 text-primary">
            <LeafIcon className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="font-display text-xl font-bold text-white">Plant Monitor V5</p>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Neon + Gemini</p>
          </div>
        </button>

        <nav className="hidden items-center gap-2 md:flex">
          {[
            { id: 'home', label: 'Dashboard' },
            { id: 'add', label: 'Add Plant' },
            { id: 'chat', label: 'AI Chat' },
            { id: 'calendar', label: 'Calendar' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as 'home' | 'add' | 'chat' | 'calendar')}
              className={`aurora-button rounded-full px-4 py-2 text-sm font-semibold ${
                currentPage === item.id ? 'bg-primary text-slate-950' : 'text-slate-300'
              }`}
            >
              <span>{item.label}</span>
              {item.id === 'calendar' && activeReminderCount > 0 ? (
                <span className="ml-2 rounded-full bg-rose-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                  {activeReminderCount}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-white">{user.name}</p>
            <p className="text-xs text-slate-400">@{user.username}</p>
          </div>
          <button
            onClick={onLogout}
            className="aurora-button rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
