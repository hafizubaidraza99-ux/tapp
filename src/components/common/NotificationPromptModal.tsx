import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { requestAndRegisterPushToken } from '../../services/pushService';
import { TeacherSession } from '../../types';

interface NotificationPromptModalProps {
  session: TeacherSession;
  onClose: () => void;
}

export const NotificationPromptModal: React.FC<NotificationPromptModalProps> = ({ session, onClose }) => {
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const success = await requestAndRegisterPushToken(session.teacherId, session.pin || '');
      if (success) {
        localStorage.setItem('teacher_app_notifications_prompted', 'true');
      }
      // If failed, do NOT set the flag so next login retries
    } catch (e) {
      console.warn('Enable reminders error:', e);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('teacher_app_notifications_prompted', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <Bell className="w-7 h-7 stroke-[2]" />
        </div>
        
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Enable Morning Reminders
        </h3>
        
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Get notified on your device for attendance check-ins and timetable updates.
        </p>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleEnable}
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-lg shadow-blue-600/25 min-h-[44px]"
          >
            {loading ? 'Enabling...' : 'Enable Reminders'}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            disabled={loading}
            className="w-full h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs transition-colors min-h-[44px]"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
};
