import React from 'react';
import { CalendarCheck, CalendarDays, History, User } from 'lucide-react';
import { TabKey } from '../../types';

interface TabBarProps {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  pendingAttention?: boolean;
}

export const TabBar: React.FC<TabBarProps> = ({ currentTab, onTabChange, pendingAttention }) => {
  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'today', label: 'Today', icon: CalendarCheck },
    { key: 'timetable', label: 'Timetable', icon: CalendarDays },
    { key: 'history', label: 'History', icon: History },
    { key: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 z-30">
      <div className="grid grid-cols-4 items-center h-16 px-1">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 transition-all duration-150 relative ios-active ${
                isActive ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                {tab.key === 'today' && pendingAttention && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight leading-none whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
