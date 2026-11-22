import React from 'react';
import { Clock } from 'lucide-react';
import { getCurrentSchoolTime } from '../../utils/dateUtils';

interface HeaderProps {
  title: string;
  subtitle?: string;
  schoolName: string;
  schoolTimezone: string;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  schoolName,
  schoolTimezone,
  rightAction,
}) => {
  const schoolTime = getCurrentSchoolTime(schoolTimezone);

  return (
    <div className="shrink-0 px-4 pt-3 pb-2.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800/70">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium truncate max-w-[160px]">{schoolName}</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 font-mono tabular-nums text-slate-600 dark:text-slate-300">
              <Clock className="w-3 h-3" />
              {schoolTime.timeString}
            </span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {rightAction && (
          <div className="shrink-0 flex items-center">
            {rightAction}
          </div>
        )}
      </div>
    </div>
  );
};
