import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Signal } from 'lucide-react';
import { getCurrentSchoolTime } from '../../utils/dateUtils';

interface IPhoneFrameProps {
  children: React.ReactNode;
  schoolTimezone?: string;
}

export const IPhoneFrame: React.FC<IPhoneFrameProps> = ({ children, schoolTimezone = 'UTC' }) => {
  const [deviceTime, setDeviceTime] = useState('07:30');

  useEffect(() => {
    const updateTime = () => {
      const { timeString } = getCurrentSchoolTime(schoolTimezone);
      setDeviceTime(timeString);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [schoolTimezone]);

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center sm:py-6 sm:px-4">
      {/* iPhone container: responsive full-screen on mobile, phone frame on desktop */}
      <div className="w-full sm:max-w-[420px] h-screen sm:h-[860px] bg-white dark:bg-neutral-950 text-black dark:text-white sm:rounded-[48px] sm:shadow-[0_25px_70px_rgba(0,0,0,0.35),0_0_0_12px_#171717,0_0_0_14px_#262626] flex flex-col relative overflow-hidden transition-all duration-300">
        
        {/* Dynamic Island / Notch on Desktop Mockup */}
        <div className="hidden sm:block absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 pointer-events-none shadow-sm">
          <div className="absolute right-3 top-2 w-2.5 h-2.5 rounded-full bg-neutral-900 ring-1 ring-neutral-800" />
        </div>

        {/* iOS Native Status Bar */}
        <header className="shrink-0 h-11 px-6 pt-1 flex items-center justify-between text-xs font-semibold z-40 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800/80">
          <span className="tracking-tight text-black dark:text-white">{deviceTime}</span>
          <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
            <Signal className="w-3.5 h-3.5 stroke-[2.2]" />
            <Wifi className="w-3.5 h-3.5 stroke-[2.2]" />
            <BatteryMedium className="w-4 h-4 stroke-[2.2]" />
          </div>
        </header>

        {/* Scrollable Screen Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col relative bg-white dark:bg-neutral-950">
          {children}
        </div>

        {/* iOS Home Indicator Bar */}
        <div className="shrink-0 h-5 pb-1 flex items-center justify-center bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md pointer-events-none z-40">
          <div className="w-32 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
        </div>
      </div>
    </div>
  );
};
