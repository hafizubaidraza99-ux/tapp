import React, { useState, useEffect } from 'react';
import {
  User,
  School as SchoolIcon,
  Globe,
  KeyRound,
  LogOut,
  Check,
  AlertCircle,
  GraduationCap,
  Calendar,
  Bell,
} from 'lucide-react';
import { TeacherSession } from '../../types';
import { clearSession, changeTeacherPin } from '../../services/authService';
import { requestAndRegisterPushToken, disablePushNotifications } from '../../services/pushService';

interface ProfileScreenProps {
  session: TeacherSession;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ session, onLogout }) => {
  const [showPinModal, setShowPinModal] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinMessage, setPinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [notifState, setNotifState] = useState<'on' | 'off' | 'blocked'>('off');
  const [actionLoading, setActionLoading] = useState<'enabling' | 'disabling' | null>(null);
  const [blockedRetryMessage, setBlockedRetryMessage] = useState<string | null>(null);

  const schoolName = session.schoolName || 'School';
  const schoolTimezone = session.schoolTimezone || 'UTC';

  const refreshNotifStatus = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifState('off');
      return;
    }
    const perm = Notification.permission;
    const hasToken = !!localStorage.getItem('teacher_app_push_token');
    if (perm === 'granted' && hasToken) {
      setNotifState('on');
    } else if (perm === 'denied') {
      setNotifState('blocked');
    } else {
      setNotifState('off');
    }
  };

  useEffect(() => {
    refreshNotifStatus();
    setBlockedRetryMessage(null);
  }, []);

  const handleToggleNotifications = async () => {
    setBlockedRetryMessage(null);
    if (notifState === 'on') {
      setActionLoading('disabling');
      try {
        await disablePushNotifications(session.teacherId, session.pin || '');
        refreshNotifStatus();
      } catch (e) {
        refreshNotifStatus();
      } finally {
        setActionLoading(null);
      }
    } else {
      setActionLoading('enabling');
      try {
        await requestAndRegisterPushToken(session.teacherId, session.pin || '');
        refreshNotifStatus();
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied') {
          setBlockedRetryMessage('Still blocked — allow notifications for this site in your browser settings first, then tap Enable notifications again.');
        }
      } catch (e) {
        refreshNotifStatus();
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied') {
          setBlockedRetryMessage('Still blocked — allow notifications for this site in your browser settings first, then tap Enable notifications again.');
        }
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleLogout = () => {
    clearSession();
    onLogout();
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage(null);

    if (!/^\d{4}$/.test(oldPin)) {
      setPinMessage({ type: 'error', text: 'Current PIN must be 4 digits.' });
      return;
    }

    if (!/^\d{4}$/.test(newPin)) {
      setPinMessage({ type: 'error', text: 'New PIN must be exactly 4 digits.' });
      return;
    }

    if (newPin !== confirmPin) {
      setPinMessage({ type: 'error', text: 'New PINs do not match.' });
      return;
    }

    setPinLoading(true);

    try {
      const result = await changeTeacherPin({
        teacherId: session.teacherId,
        oldPin,
        newPin,
      });

      if (!result.success) {
        setPinMessage({
          type: 'error',
          text: result.error || 'Failed to update PIN. Please verify your current PIN.',
        });
      } else {
        setPinMessage({ type: 'success', text: 'PIN updated securely.' });
        setTimeout(() => {
          setShowPinModal(false);
          setOldPin('');
          setNewPin('');
          setConfirmPin('');
          setPinMessage(null);
        }, 1500);
      }
    } catch (err: any) {
      setPinMessage({ type: 'error', text: err?.message || 'Failed to update PIN.' });
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <div className="flex-1 p-5 pb-8 overflow-y-auto space-y-5 bg-white dark:bg-neutral-950">
      {/* Teacher Profile Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-950 border border-[#C9A227] shadow-sm text-center">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-2xl">
          {session.teacherName.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-xl font-bold text-black dark:text-white">
          {session.teacherName}
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
          {session.whatsappNumber}
        </p>

        {session.isHeadTeacher && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-black dark:text-white text-xs font-semibold">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Head Teacher</span>
          </div>
        )}
      </div>

      {/* School Information Section */}
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 px-1">
          School Information
        </span>
        <div className="rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 overflow-hidden shadow-sm">
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SchoolIcon className="w-4 h-4 text-neutral-400" />
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">School Name</span>
            </div>
            <span className="text-xs font-bold text-black dark:text-white max-w-[200px] truncate text-right">
              {schoolName}
            </span>
          </div>

          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-neutral-400" />
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Timezone</span>
            </div>
            <span className="text-xs font-mono font-medium text-neutral-700 dark:text-neutral-300">
              {schoolTimezone}
            </span>
          </div>

          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-neutral-400" />
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Working Days</span>
            </div>
            <span className="text-xs font-bold text-black dark:text-white">
              {session.workingDays || 'Mon-Fri'}
            </span>
          </div>

        </div>
      </div>

      {/* Notifications Setting Section */}
      <div className="space-y-2 pt-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 px-1">
          Notifications
        </span>
        <div className="rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-black dark:text-white">
                {notifState === 'on' && 'Notifications are on'}
                {notifState === 'off' && 'Notifications are off'}
                {notifState === 'blocked' && 'Notifications are blocked for this app'}
              </p>
              {notifState === 'blocked' && (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  Notifications are blocked for this app. Allow notifications for this site in your browser settings, then come back here and tap Enable notifications.
                </p>
              )}
              {blockedRetryMessage && (
                <p className="text-[11px] text-neutral-700 dark:text-neutral-300 mt-1.5 leading-relaxed">
                  {blockedRetryMessage}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleNotifications}
            disabled={actionLoading !== null}
            className={`w-full h-11 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 min-h-[44px] ${
              notifState === 'on'
                ? 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-black dark:text-white border border-neutral-300 dark:border-neutral-700'
                : 'bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black border border-[#C9A227]'
            }`}
          >
            {actionLoading === 'enabling' && 'Turning on…'}
            {actionLoading === 'disabling' && 'Turning off…'}
            {actionLoading === null && (notifState === 'on' ? 'Disable notifications' : 'Enable notifications')}
          </button>
        </div>
      </div>

      {/* Account Actions */}
      <div className="space-y-2.5 pt-2">
        <button
          type="button"
          onClick={() => setShowPinModal(true)}
          className="w-full min-h-[48px] px-4 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-black dark:text-white font-semibold text-xs flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors shadow-sm ios-active"
        >
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            <span>Change 4-Digit PIN</span>
          </div>
          <span className="text-neutral-400">&rarr;</span>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full min-h-[48px] px-4 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors ios-active"
        >
          <LogOut className="w-4 h-4 text-rose-600" />
          <span>Sign Out / Switch Teacher</span>
        </button>
      </div>

      {/* Change PIN Modal Sheet */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-neutral-950 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-[#C9A227]">
            <div className="w-12 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto mb-4 sm:hidden" />
            <h3 className="text-base font-bold text-black dark:text-white">
              Change Your 4-Digit PIN
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 mb-4">
              Enter a new 4-digit numeric passcode to secure your account.
            </p>

            {pinMessage && (
              <div className="p-3 rounded-xl mb-3 text-xs flex items-center gap-2 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200">
                {pinMessage.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{pinMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Current 4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                  className="w-full h-11 text-center text-lg font-mono tracking-widest bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white rounded-xl border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  New 4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                  className="w-full h-11 text-center text-lg font-mono tracking-widest bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white rounded-xl border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  Confirm New PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                  className="w-full h-11 text-center text-lg font-mono tracking-widest bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white rounded-xl border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setOldPin('');
                    setNewPin('');
                    setConfirmPin('');
                    setPinMessage(null);
                  }}
                  className="flex-1 h-11 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 text-xs font-semibold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinLoading || oldPin.length !== 4 || newPin.length !== 4}
                  className="flex-1 h-11 rounded-xl bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black border border-[#C9A227] text-xs font-semibold disabled:opacity-50 min-h-[44px]"
                >
                  {pinLoading ? 'Saving...' : 'Update PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
