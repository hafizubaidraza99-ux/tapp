import React, { useState } from 'react';
import { Database, RefreshCw, ShieldAlert } from 'lucide-react';
import { initSupabase } from '../../lib/supabase';

interface SupabaseMissingBannerProps {
  onRetrySuccess: () => void;
}

export const SupabaseMissingBanner: React.FC<SupabaseMissingBannerProps> = ({ onRetrySuccess }) => {
  const [retrying, setRetrying] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleRetry = async () => {
    setRetrying(true);
    setErrorText(null);
    try {
      const res = await initSupabase();
      if (res.configured) {
        onRetrySuccess();
      } else {
        setErrorText('Could not connect. Please try again.');
      }
    } catch (err: any) {
      setErrorText('Could not connect. Please try again.');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="p-4 mx-4 my-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Database className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold flex items-center gap-1.5">
            <span>Service Not Available</span>
          </h4>
          <p className="text-xs text-amber-800/90 dark:text-amber-200/90 mt-1 leading-relaxed">
            The service could not be reached. Please check your connection and try again.
          </p>

          {errorText && (
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-2 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{errorText}</span>
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all min-h-[36px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
              <span>{retrying ? 'Checking...' : 'Check Connection'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
