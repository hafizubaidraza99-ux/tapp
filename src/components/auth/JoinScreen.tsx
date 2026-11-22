import React, { useState } from 'react';
import { Smartphone, KeyRound, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { joinTeacherApp } from '../../services/authService';
import { TeacherSession } from '../../types';

interface JoinScreenProps {
  onJoined: (session: TeacherSession) => void;
  onSwitchToLogin: () => void;
}

export const JoinScreen: React.FC<JoinScreenProps> = ({ onJoined, onSwitchToLogin }) => {
  const [phone, setPhone] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!phone.trim()) {
      setError('Please enter your WhatsApp phone number.');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }

    if (pin !== confirmPin) {
      setError('PINs do not match. Please verify your 4 digits.');
      return;
    }

    setLoading(true);
    try {
      const result = await joinTeacherApp({
        phone: phone.trim(),
        pin: pin.trim(),
        activationCode: activationCode.trim() || undefined,
      });

      if (result.success && result.session) {
        if (result.activationCodeNotice) {
          setNotice(result.activationCodeNotice);
        }
        onJoined(result.session);
      } else {
        setError(result.error || 'Could not verify teacher account. Please check your phone number.');
      }
    } catch (err: any) {
      setError(err?.message || 'Connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto">
      <div>
        {/* iOS App Branding */}
        <div className="text-center mt-4 mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <ShieldCheck className="w-9 h-9 stroke-[2]" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Teacher App
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Teacher Attendance · First Time Setup
          </p>
        </div>


        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              WhatsApp Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                inputMode="tel"
                placeholder="+92 300 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full h-12 pl-10 pr-4 text-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wide"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Must match your registered WhatsApp number on the Principal Dashboard
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Activation Code (From Principal)
            </label>
            <input
              type="text"
              placeholder="e.g. SCH-7890"
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value)}
              className="w-full h-12 px-4 text-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Set 4-Digit PIN
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                  className="w-full h-12 pl-9 pr-3 text-center text-lg font-mono tracking-widest bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Confirm PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
                className="w-full h-12 px-3 text-center text-lg font-mono tracking-widest bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-13 mt-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50 ios-active"
          >
            {loading ? (
              <span>Linking Teacher Account...</span>
            ) : (
              <>
                <span>Link & Enter App</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 text-center pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
        <p className="text-xs text-slate-500">
          Already joined this school?
        </p>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="mt-1 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline min-h-[44px] inline-flex items-center"
        >
          Sign in with your 4-digit PIN
        </button>
      </div>
    </div>
  );
};
