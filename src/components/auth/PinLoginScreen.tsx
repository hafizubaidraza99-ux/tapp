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
      setError('Please enter your phone number.');
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
        // Do NOT clear PIN on failure so entered digits stay on the 4th digit and remain usable
      }
    } catch (err: any) {
      setError('Wrong PIN.');
      // Do NOT clear PIN on failure
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
    <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto bg-white dark:bg-neutral-950">
      <div>
        {/* Header Branding */}
        {rememberedTeacher ? (
          <div className="text-center mt-2 mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-black dark:bg-white text-white dark:text-black border border-[#C9A227] flex items-center justify-center shadow-sm">
              <User className="w-8 h-8 stroke-[2]" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
              {rememberedTeacher.teacherName}
            </h2>
            <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              <SchoolIcon className="w-3.5 h-3.5" />
              <span>{rememberedTeacher.schoolName}</span>
            </div>
          </div>
        ) : (
          <div className="text-center mt-2 mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-black dark:bg-white text-white dark:text-black border border-[#C9A227] flex items-center justify-center shadow-sm">
              <User className="w-8 h-8 stroke-[2]" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
              Sign in with PIN
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Enter your phone number and 4-digit PIN
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!rememberedTeacher && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Phone number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 03001234567"
                disabled={isLocked}
                className="w-full h-12 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white shadow-sm"
              />
            </div>
          )}

          {/* 4-Digit Passcode Circles */}
          <div className="py-2 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3 block">
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
                        ? 'bg-black dark:bg-white scale-110 shadow-sm'
                        : 'border-2 border-neutral-300 dark:border-neutral-700 bg-transparent'
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
                disabled={isLocked}
                className="h-14 rounded-2xl bg-white dark:bg-neutral-900 text-black dark:text-white text-xl font-semibold shadow-sm border border-neutral-200 dark:border-neutral-800 active:scale-95 active:bg-neutral-100 dark:active:bg-neutral-800 transition-all flex items-center justify-center min-h-[44px] min-w-[44px]"
              >
                {digit}
              </button>
            ))}
            <div /> {/* Empty bottom-left slot */}
            <button
              key="0"
              type="button"
              onClick={() => handleKeypadPress('0')}
              disabled={isLocked}
              className="h-14 rounded-2xl bg-white dark:bg-neutral-900 text-black dark:text-white text-xl font-semibold shadow-sm border border-neutral-200 dark:border-neutral-800 active:scale-95 active:bg-neutral-100 dark:active:bg-neutral-800 transition-all flex items-center justify-center min-h-[44px] min-w-[44px]"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              disabled={pin.length === 0 || isLocked}
              className="h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 active:scale-95 transition-all flex items-center justify-center disabled:opacity-30 min-h-[44px] min-w-[44px]"
            >
              <Delete className="w-5 h-5 stroke-[2]" />
            </button>
          </div>

          <button
            type="submit"
            disabled={pin.length !== 4 || isLocked}
            className="w-full h-12 mt-2 rounded-2xl bg-black hover:bg-neutral-900 dark:bg-white dark:hover:bg-neutral-100 active:scale-[0.98] text-white dark:text-black border border-[#C9A227] font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 ios-active"
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

      <div className="mt-6 text-center pt-3 border-t border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={onSwitchToJoin}
          className="text-xs font-semibold text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white transition-colors min-h-[44px] inline-flex items-center"
        >
          {rememberedTeacher ? 'Use a different teacher' : 'Join with activation code'}
        </button>
      </div>
    </div>
  );
};
