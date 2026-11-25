import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock3,
  Lock,
  RefreshCw,
  AlertCircle,
  Check,
  CalendarClock,
  X,
} from 'lucide-react';
import { TeacherSession, AttendanceRecord, AttendanceStatus, SchoolSettings } from '../../types';
import { getTodayAttendance, submitTodayAttendance } from '../../services/attendanceService';
import { getSchoolDetails } from '../../services/schoolService';
import {
  getMyHalfLeave,
  getMyHalfLeavePeriods,
  applyMyHalfLeave,
  cancelMyHalfLeave,
  HalfLeaveInfo,
  HalfLeavePeriodItem,
  ApplyHalfLeaveResultCode,
} from '../../services/halfLeaveService';
import {
  isCutoffPassed,
  formatFriendlyDate,
  getCurrentSchoolTime,
  getTodayDateString,
} from '../../utils/dateUtils';

interface TodayAttendanceScreenProps {
  session: TeacherSession;
}

export const TodayAttendanceScreen: React.FC<TodayAttendanceScreenProps> = ({ session }) => {
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [settings, setSettings] = useState<SchoolSettings>({
    school_id: session.schoolId,
    send_time: '07:00',
    reminder_minutes: 30,
    cutoff_time: '08:00',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [halfLeave, setHalfLeave] = useState<HalfLeaveInfo | null>(null);
  const [halfLeaveNotice, setHalfLeaveNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showHalfLeavePanel, setShowHalfLeavePanel] = useState(false);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelInfo, setPanelInfo] = useState<HalfLeaveInfo | null>(null);
  const [panelPeriods, setPanelPeriods] = useState<HalfLeavePeriodItem[]>([]);
  const [applyingHalfLeave, setApplyingHalfLeave] = useState(false);
  const [applyResultMessage, setApplyResultMessage] = useState<string | null>(null);
  const [cancellingHalfLeave, setCancellingHalfLeave] = useState(false);

  // Load school settings, today's attendance, and half leave status
  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const attData = await getTodayAttendance({
        schoolId: session.schoolId,
        teacherId: session.teacherId,
        timezone: session.schoolTimezone,
      });

      const schoolData = await getSchoolDetails(session.schoolId);

      if (schoolData.settings) {
        setSettings(schoolData.settings);
      }

      if (attData.error) {
        setErrorMessage(attData.error);
      } else if (attData.record) {
        setAttendance(attData.record);
      } else {
        setAttendance(null);
      }

      const halfLeaveRes = await getMyHalfLeave();
      if (!halfLeaveRes.error && halfLeaveRes.info) {
        setHalfLeave(halfLeaveRes.info);
      }
    } catch (err: any) {
      console.warn('Could not load attendance data:', err);
      setErrorMessage('Could not load attendance status. Please check connection.');
    } finally {
      setLoading(false);
    }
  }, [session.schoolId, session.teacherId, session.schoolTimezone]);

  useEffect(() => {
    loadData();
    // Poll every 30 seconds to update cutoff status and sync with backend apply_attendance_cutoff()
    const timer = setInterval(loadData, 30000);
    return () => clearInterval(timer);
  }, [loadData]);

  const handleOpenHalfLeavePanel = async () => {
    setHalfLeaveNotice(null);
    setApplyResultMessage(null);
    setPanelError(null);
    setShowHalfLeavePanel(true);
    setPanelLoading(true);
    try {
      const [infoRes, periodsRes] = await Promise.all([
        getMyHalfLeave(),
        getMyHalfLeavePeriods(),
      ]);
      if (infoRes.error) {
        setPanelError(infoRes.error);
      } else {
        setPanelInfo(infoRes.info);
      }
      if (periodsRes.error && !infoRes.error) {
        setPanelError(periodsRes.error);
      } else {
        setPanelPeriods(periodsRes.periods);
      }
    } catch {
      setPanelError('Could not load half leave details. Please try again.');
    } finally {
      setPanelLoading(false);
    }
  };

  const getApplyMessage = (code: ApplyHalfLeaveResultCode): string => {
    switch (code) {
      case 'applied':
        return 'Done. Your remaining periods will be covered.';
      case 'pending':
        return "Sent. Your half leave is waiting for your principal's approval.";
      case 'not_present':
        return 'You can take half leave only after you mark yourself present.';
      case 'no_timetable':
        return "Half leave opens after today's timetable is ready.";
      case 'day_over':
        return 'The school day is over. There are no periods left to hand over.';
      case 'nothing_left':
        return 'You have no periods left today to hand over.';
      case 'already':
        return 'You have already applied for half leave today.';
      case 'too_early':
        return 'Half leave opens when school starts.';
      default:
        return 'Something went wrong. Please try again.';
    }
  };

  const handleApplyHalfLeave = async () => {
    setApplyingHalfLeave(true);
    setApplyResultMessage(null);
    try {
      const code = await applyMyHalfLeave();
      const message = getApplyMessage(code);
      if (code === 'applied' || code === 'pending') {
        setShowHalfLeavePanel(false);
        setHalfLeaveNotice({ type: 'success', text: message });
        await loadData();
      } else {
        setApplyResultMessage(message);
        if (code === 'already') {
          await loadData();
        }
      }
    } catch {
      setApplyResultMessage('Something went wrong. Please try again.');
    } finally {
      setApplyingHalfLeave(false);
    }
  };

  const handleCancelHalfLeave = async () => {
    setCancellingHalfLeave(true);
    setHalfLeaveNotice(null);
    try {
      const code = await cancelMyHalfLeave();
      if (code === 'cancelled') {
        setHalfLeaveNotice({ type: 'success', text: 'Your half leave is cancelled.' });
      } else if (code === 'too_late') {
        setHalfLeaveNotice({
          type: 'error',
          text: 'It is too late to cancel now. Please talk to your principal.',
        });
      } else {
        setHalfLeaveNotice({ type: 'error', text: 'Something went wrong. Please try again.' });
      }
      await loadData();
    } catch {
      setHalfLeaveNotice({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setCancellingHalfLeave(false);
    }
  };

  // Handle clicking one of the three big buttons: PRESENT / ABSENT / LATE
  const handleSelectStatus = async (status: 'present' | 'absent' | 'late') => {
    setErrorMessage(null);
    setSuccessToast(null);

    const cutoff = isCutoffPassed(settings.cutoff_time, session.schoolTimezone);
    if (cutoff.passed) {
      setErrorMessage(`Attendance locked at ${cutoff.cutoffFormatted} in school timezone (${session.schoolTimezone}). Changes are closed.`);
      return;
    }

    setSubmitting(status);
    try {
      const result = await submitTodayAttendance({
        schoolId: session.schoolId,
        teacherId: session.teacherId,
        timezone: session.schoolTimezone,
        cutoffTime: settings.cutoff_time,
        status,
      });

      if (result.success && result.record) {
        setAttendance(result.record);
        const statusLabel = status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : 'Late';
        setSuccessToast(`Saved: Marked as ${statusLabel} for today.`);
        setTimeout(() => setSuccessToast(null), 4000);
        const halfLeaveRes = await getMyHalfLeave();
        if (!halfLeaveRes.error && halfLeaveRes.info) {
          setHalfLeave(halfLeaveRes.info);
        }
      } else if (result.locked) {
        setErrorMessage(result.error || 'Cutoff has passed. Response is locked.');
        loadData();
      } else {
        setErrorMessage(result.error || 'Failed to save attendance.');
      }
    } catch (err: any) {
      setErrorMessage('Could not save your attendance. Please try again.');
    } finally {
      setSubmitting(null);
    }
  };

  const cutoffInfo = isCutoffPassed(settings.cutoff_time, session.schoolTimezone);
  const todayDateStr = getTodayDateString(session.schoolTimezone);
  const friendlyDate = formatFriendlyDate(todayDateStr, session.schoolTimezone);
  const currentSchoolTime = getCurrentSchoolTime(session.schoolTimezone);

  // Determine effective status:
  // If cutoff has passed and no attendance record exists, effective status is 'no_reply'
  const isLocked = cutoffInfo.passed;
  const currentStatus: AttendanceStatus = attendance
    ? attendance.status
    : isLocked
    ? 'no_reply'
    : 'pending';

  return (
    <div className="flex-1 flex flex-col justify-between p-5 pb-8 overflow-y-auto">
      <div className="space-y-4">
        {/* Date & School Time Banner */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Today's Attendance
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              {friendlyDate}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setHalfLeaveNotice(null);
              loadData();
            }}
            disabled={loading}
            aria-label="Refresh attendance"
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Cutoff Status Card */}
        <div
          className={`p-3.5 rounded-2xl border transition-colors ${
            isLocked
              ? 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200/60 dark:border-blue-900/40 text-blue-900 dark:text-blue-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isLocked ? (
                <Lock className="w-4 h-4 text-slate-500 shrink-0" />
              ) : (
                <Clock3 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              )}
              <span className="text-xs font-semibold">
                {isLocked
                  ? `Cutoff Passed (${settings.cutoff_time}) · Responses Locked`
                  : `Cutoff at ${settings.cutoff_time} · ${cutoffInfo.minutesRemaining}m remaining`}
              </span>
            </div>
            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {currentSchoolTime.timeString}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {isLocked
              ? 'Attendance for today is now finalized.'
              : 'You can change your response freely until the school cutoff time.'}
          </p>
        </div>

        {/* Feedback alerts */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successToast && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successToast}</span>
          </div>
        )}

        {/* The Core Question */}
        <div className="pt-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Morning Check-in
          </p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Are you available today?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tap a button below to save your attendance
          </p>
        </div>

        {/* THREE BIG TOUCH BUTTONS: PRESENT / ABSENT / LATE */}
        <div className="space-y-3 pt-2">
          {/* PRESENT BUTTON */}
          <button
            type="button"
            disabled={isLocked || submitting !== null}
            onClick={() => handleSelectStatus('present')}
            className={`w-full min-h-[68px] px-5 rounded-2xl flex items-center justify-between transition-all duration-200 border-2 ios-active ${
              currentStatus === 'present'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/30 ring-4 ring-emerald-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-50/30'
            } ${isLocked ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'}`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                  currentStatus === 'present'
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="text-left">
                <span className="text-lg font-bold tracking-tight block">
                  PRESENT
                </span>
                <span
                  className={`text-xs block ${
                    currentStatus === 'present'
                      ? 'text-emerald-100'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  I am at school & ready to teach
                </span>
              </div>
            </div>

            {currentStatus === 'present' && (
              <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-semibold tracking-wide">
                Active
              </span>
            )}
          </button>

          {/* ABSENT BUTTON */}
          <button
            type="button"
            disabled={isLocked || submitting !== null}
            onClick={() => handleSelectStatus('absent')}
            className={`w-full min-h-[68px] px-5 rounded-2xl flex items-center justify-between transition-all duration-200 border-2 ios-active ${
              currentStatus === 'absent'
                ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-600/30 ring-4 ring-rose-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 hover:border-rose-500/50 hover:bg-rose-50/30'
            } ${isLocked ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'}`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                  currentStatus === 'absent'
                    ? 'bg-white/20 text-white'
                    : 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                }`}
              >
                <XCircle className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="text-left">
                <span className="text-lg font-bold tracking-tight block">
                  ABSENT
                </span>
                <span
                  className={`text-xs block ${
                    currentStatus === 'absent'
                      ? 'text-rose-100'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Cannot attend today (triggers cover)
                </span>
              </div>
            </div>

            {currentStatus === 'absent' && (
              <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-semibold tracking-wide">
                Active
              </span>
            )}
          </button>

          {/* LATE BUTTON */}
          <button
            type="button"
            disabled={isLocked || submitting !== null}
            onClick={() => handleSelectStatus('late')}
            className={`w-full min-h-[68px] px-5 rounded-2xl flex items-center justify-between transition-all duration-200 border-2 ios-active ${
              currentStatus === 'late'
                ? 'bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-600/30 ring-4 ring-amber-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 hover:border-amber-500/50 hover:bg-amber-50/30'
            } ${isLocked ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'}`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                  currentStatus === 'late'
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                }`}
              >
                <Clock3 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="text-left">
                <span className="text-lg font-bold tracking-tight block">
                  LATE
                </span>
                <span
                  className={`text-xs block ${
                    currentStatus === 'late'
                      ? 'text-amber-100'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  On the way · Arriving shortly
                </span>
              </div>
            </div>

            {currentStatus === 'late' && (
              <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-semibold tracking-wide">
                Active
              </span>
            )}
          </button>
        </div>

        {/* Half Leave feedback notice */}
        {halfLeaveNotice && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              halfLeaveNotice.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
            }`}
          >
            {halfLeaveNotice.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            )}
            <span>{halfLeaveNotice.text}</span>
          </div>
        )}

        {/* Half Leave Section: Status Card OR Half Leave Button */}
        {halfLeave?.status && halfLeave.status !== 'cancelled' ? (
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  halfLeave.status === 'rejected'
                    ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                    : halfLeave.status === 'pending'
                    ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                    : 'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                }`}
              >
                <CalendarClock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                  Half Leave
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                  {(halfLeave.status === 'applied' || halfLeave.status === 'approved') &&
                    `You are on half leave from Period ${halfLeave.fromPeriod ?? ''}.`}
                  {halfLeave.status === 'pending' &&
                    `Half leave from Period ${halfLeave.fromPeriod ?? ''} — waiting for your principal's approval.`}
                  {halfLeave.status === 'rejected' && 'Your half leave was not approved.'}
                </p>
              </div>
            </div>

            {halfLeave.canCancel && (
              <button
                type="button"
                onClick={handleCancelHalfLeave}
                disabled={cancellingHalfLeave}
                className="w-full h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold text-xs flex items-center justify-center transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {cancellingHalfLeave ? 'Cancelling...' : 'Cancel Half Leave'}
              </button>
            )}
          </div>
        ) : (
          (currentStatus === 'present' || currentStatus === 'late') && (
            <div className="space-y-1.5">
              <button
                type="button"
                disabled={!halfLeave?.inSchoolTime}
                onClick={handleOpenHalfLeavePanel}
                className={`w-full min-h-[48px] px-4 rounded-2xl border font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  halfLeave?.inSchoolTime
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/70 shadow-sm active:scale-[0.98] ios-active'
                    : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                <CalendarClock
                  className={`w-4 h-4 ${
                    halfLeave?.inSchoolTime
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span>Half Leave</span>
              </button>
              {halfLeave !== null && !halfLeave.inSchoolTime && (
                <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
                  Half Leave is available during school hours.
                </p>
              )}
            </div>
          )
        )}
      </div>

      {/* Saved Status Summary Card */}
      <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Recorded Response
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {currentStatus === 'present' && (
                <>
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    Marked Present
                  </span>
                </>
              )}
              {currentStatus === 'absent' && (
                <>
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-sm font-bold text-rose-700 dark:text-rose-400">
                    Marked Absent
                  </span>
                </>
              )}
              {currentStatus === 'late' && (
                <>
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                    Marked Late
                  </span>
                </>
              )}
              {currentStatus === 'no_reply' && (
                <>
                  <div className="w-3 h-3 rounded-full bg-slate-400" />
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                    No Reply (Cutoff Passed)
                  </span>
                </>
              )}
              {currentStatus === 'pending' && (
                <>
                  <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    Awaiting Response
                  </span>
                </>
              )}
            </div>

            {attendance?.updated_at && (
              <span className="text-[11px] font-mono tabular-nums text-slate-400">
                {new Date(attendance.updated_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>

          {currentStatus === 'absent' && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg">
              Check the <strong>Timetable</strong> tab to see which colleagues are covering your scheduled periods today.
            </p>
          )}
        </div>
      </div>

      {/* Half Leave Panel Modal */}
      {showHalfLeavePanel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col">
            <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden shrink-0" />
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Half Leave
              </h3>
              <button
                type="button"
                onClick={() => setShowHalfLeavePanel(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
              {panelLoading && (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                  Checking your remaining periods...
                </p>
              )}

              {!panelLoading && panelError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{panelError}</span>
                </div>
              )}

              {!panelLoading && !panelError && panelInfo && (
                <>
                  {panelInfo.dayOver ? (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      The school day is over. There are no periods left to hand over.
                    </div>
                  ) : panelPeriods.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      You have no periods left today to hand over.
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Your periods from Period {panelInfo.currentFromPeriod ?? panelPeriods[0].periodNumber} onwards will be handed over.
                      </p>

                      <div className="space-y-2">
                        {panelPeriods.map((period) => (
                          <div
                            key={`${period.periodNumber}-${period.startTime}`}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-bold text-blue-600 dark:text-blue-400">
                                  Period {period.periodNumber}
                                </span>
                                <span className="text-slate-400">·</span>
                                <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                                  {period.startTime} - {period.endTime}
                                </span>
                              </div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                                {period.subjectName}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {period.className}
                                {period.coveringForName ? ` · covering for ${period.coveringForName}` : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {panelInfo.requiresApproval && (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                          Your principal will see this and approve it.
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {applyResultMessage && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{applyResultMessage}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setShowHalfLeavePanel(false)}
                className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold min-h-[44px]"
              >
                Close
              </button>
              {!panelLoading &&
                !panelError &&
                panelInfo &&
                !panelInfo.dayOver &&
                panelPeriods.length > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyHalfLeave}
                    disabled={applyingHalfLeave}
                    className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 min-h-[44px]"
                  >
                    {applyingHalfLeave ? 'Sending...' : 'Take Half Leave'}
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
