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
    <nav className="shrink-0 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-lg border-t border-neutral-200 dark:border-neutral-800 z-30">
      <div className="grid grid-cols-4 items-center gap-1 h-16 px-2 py-1.5">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] h-full rounded-xl py-1 transition-all duration-150 relative ios-active ${
                isActive
                  ? 'bg-black text-white dark:bg-white dark:text-black font-semibold shadow-sm'
                  : 'text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-105 stroke-[2.2]' : 'stroke-[1.8]'}`} />
                {tab.key === 'today' && pendingAttention && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white dark:ring-neutral-950 animate-pulse" />
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
