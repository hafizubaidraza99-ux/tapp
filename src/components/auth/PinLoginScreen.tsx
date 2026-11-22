import React, { useState, useEffect } from 'react';
import { Delete, ArrowRight, AlertCircle, User, School as SchoolIcon } from 'lucide-react';
import { loginWithPinById, loginWithPin } from '../../services/authService';
import { TeacherSession } from '../../types';

interface PinLoginScreenProps {
  rememberedTeacher: TeacherSession | null;
  onLoggedIn: (session: TeacherSession) => void;
  onSwitchToJoin: () => void; // "Use a different teacher"
}

export const PinLoginScreen: React.FC<PinLoginScreenProps> = ({
  rememberedTeacher,
  onLoggedIn,
  onSwitchToJoin,
}) => {
  const [pin, setPin] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);

  const isLocked = lockedUntil ? new Date(lockedUntil).getTime() > Date.now() : false;

  useEffect(() => {
    if (!lockedUntil) return;

    const checkLockStatus = () => {
      const lockTime = new Date(lockedUntil).getTime();
      if (!isNaN(lockTime) && Date.now() >= lockTime) {
        setLockedUntil(null);
        setError(null);
      }
    };

    const interval = setInterval(checkLockStatus, 10000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkLockStatus();
      }
    };

    const handleFocus = () => {
      checkLockStatus();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [lockedUntil]);

  const handleKeypadPress = (digit: string) => {
    if (isLocked) return;
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        executeLogin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (isLocked) return;
    setPin((prev) => prev.slice(0, -1));
  };

  const executeLogin = async (pinToUse: string) => {
    setError(null);
    if (pinToUse.length !== 4) {
      setError('Please enter all 4 digits of your PIN.');
      return;
    }

    if (!rememberedTeacher && !phone.trim()) {
      setError('Please enter your WhatsApp phone number.');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (rememberedTeacher) {
        res = await loginWithPinById(rememberedTeacher.teacherId, pinToUse);
      } else {
        res = await loginWithPin(phone, pinToUse);
      }

      if (res.success && res.session) {
        onLoggedIn(res.session);
      } else {
        if ((res as any).reason === 'locked') {
          setLockedUntil((res as any).lockedUntil || null);
        }
        setError(res.error || 'Wrong PIN.');
        setPin(''); // Reset PIN on failure
      }
    } catch (err: any) {
      setError('Wrong PIN.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length === 4 && !isLocked) {
      executeLogin(pin);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto">
      <div>
        {/* Header Branding */}
        {rememberedTeacher ? (
          <div className="text-center mt-2 mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-md">
              <User className="w-8 h-8 stroke-[2]" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {rememberedTeacher.teacherName}
            </h2>
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <SchoolIcon className="w-3.5 h-3.5" />
              <span>{rememberedTeacher.schoolName}</span>
            </div>
          </div>
        ) : (
          <div className="text-center mt-2 mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-md">
              <User className="w-8 h-8 stroke-[2]" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sign in with PIN
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter your WhatsApp phone number and 4-digit PIN
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!rememberedTeacher && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                WhatsApp phone number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 03001234567"
                disabled={loading || isLocked}
                className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
              />
            </div>
          )}

          {/* 4-Digit Passcode Circles */}
          <div className="py-2 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 block">
              Enter your 4-digit PIN
            </span>
            <div className="flex items-center justify-center gap-4">
              {[0, 1, 2, 3].map((index) => {
                const isFilled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      isFilled
                        ? 'bg-blue-600 dark:bg-blue-400 scale-110 shadow-sm'
                        : 'border-2 border-slate-300 dark:border-slate-700 bg-transparent'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* iOS Style Numeric Keypad */}
          <div className={`max-w-[280px] mx-auto grid grid-cols-3 gap-3 pt-2 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                disabled={loading || isLocked}
                className="h-14 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xl font-semibold shadow-sm border border-slate-200/80 dark:border-slate-700/80 active:scale-95 active:bg-slate-100 dark:active:bg-slate-700 transition-all flex items-center justify-center min-h-[44px] min-w-[44px]"
              >
                {digit}
              </button>
            ))}
            <div /> {/* Empty bottom-left slot */}
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              disabled={loading || isLocked}
              className="h-14 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xl font-semibold shadow-sm border border-slate-200/80 dark:border-slate-700/80 active:scale-95 active:bg-slate-100 dark:active:bg-slate-700 transition-all flex items-center justify-center min-h-[44px] min-w-[44px]"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              disabled={loading || pin.length === 0 || isLocked}
              className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 active:scale-95 transition-all flex items-center justify-center disabled:opacity-30 min-h-[44px] min-w-[44px]"
            >
              <Delete className="w-5 h-5 stroke-[2]" />
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || pin.length !== 4 || isLocked}
            className="w-full h-12 mt-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50 ios-active"
          >
            {loading ? (
              <span>Verifying PIN...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-6 text-center pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
        <button
          type="button"
          onClick={onSwitchToJoin}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors min-h-[44px] inline-flex items-center"
        >
          {rememberedTeacher ? 'Use a different teacher' : 'Join with activation code'}
        </button>
      </div>
    </div>
  );
};
