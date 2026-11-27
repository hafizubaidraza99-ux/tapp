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
  Sun,
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
  formatVacationDate,
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
    vacation_start: null,
    vacation_end: null,
  });
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
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
      setInitialLoading(false);
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

  const vacStart = settings.vacation_start ? String(settings.vacation_start).slice(0, 10) : null;
  const vacEnd = settings.vacation_end ? String(settings.vacation_end).slice(0, 10) : null;
  const isOnVacation = Boolean(
    vacStart &&
      vacEnd &&
      /^\d{4}-\d{2}-\d{2}$/.test(vacStart) &&
      /^\d{4}-\d{2}-\d{2}$/.test(vacEnd) &&
      todayDateStr >= vacStart &&
      todayDateStr <= vacEnd
  );

  // Determine effective status:
  // If cutoff has passed and no attendance record exists, effective status is 'no_reply'
  const isLocked = cutoffInfo.passed;
  const currentStatus: AttendanceStatus = attendance
    ? attendance.status
    : isLocked
    ? 'no_reply'
    : 'pending';

  if (initialLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="w-6 h-6 text-black dark:text-white animate-spin mb-2.5" />
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
          Loading…
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between p-5 pb-8 overflow-y-auto">
      <div className="space-y-4">
        {/* Date & School Time Banner */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Today's Attendance
            </span>
            <h2 className="text-lg font-bold text-black dark:text-white leading-tight">
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
            className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isOnVacation ? (
          <div className="mt-2 p-6 rounded-2xl bg-white dark:bg-neutral-950 border border-[#C9A227] text-center shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white flex items-center justify-center mx-auto">
              <Sun className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-black dark:text-white">
                School is on vacation
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Vacation: {formatVacationDate(vacStart!, session.schoolTimezone)} to{' '}
                {formatVacationDate(vacEnd!, session.schoolTimezone)}. No attendance is needed.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Cutoff Status Card */}
            <div
              className={`p-3.5 rounded-2xl border border-[#C9A227] transition-colors ${
                isLocked
                  ? 'bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200'
                  : 'bg-white dark:bg-neutral-950 text-black dark:text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isLocked ? (
                    <Lock className="w-4 h-4 text-neutral-500 shrink-0" />
                  ) : (
                    <Clock3 className="w-4 h-4 text-black dark:text-white shrink-0" />
                  )}
                  <span className="text-xs font-semibold">
                    {isLocked
                      ? `Cutoff Passed (${settings.cutoff_time}) · Responses Locked`
                      : `Cutoff at ${settings.cutoff_time} · ${cutoffInfo.minutesRemaining}m remaining`}
                  </span>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                  {currentSchoolTime.timeString}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                {isLocked
                  ? 'Attendance for today is now finalized.'
                  : 'You can change your response freely until the school cutoff time.'}
              </p>
            </div>

            {successToast && (
              <div className="p-3 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successToast}</span>
              </div>
            )}

        {/* The Core Question */}
        <div className="pt-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
            Morning Check-in
          </p>
          <h3 className="text-2xl font-bold text-black dark:text-white tracking-tight">
            Are you available today?
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
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
            className={`w-full min-h-[68px] px-5 rounded-2xl flex items-center justify-between transition-all duration-200 border ios-active ${
              currentStatus === 'present'
                ? 'bg-black dark:bg-white text-white dark:text-black border-[#C9A227] shadow-sm'
                : 'bg-white dark:bg-neutral-950 text-black dark:text-white border-neutral-200 dark:border-neutral-800 hover:border-[#C9A227]'
            } ${isLocked ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'}`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                  currentStatus === 'present'
                    ? 'bg-white/15 dark:bg-black/10 text-white dark:text-black'
                    : 'bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white'
                }`}
              >
                <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="text-left">
                <span className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  PRESENT
                </span>
                <span
                  className={`text-xs block ${
                    currentStatus === 'present'
                      ? 'text-neutral-300 dark:text-neutral-600'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  I am at school & ready to teach
                </span>
              </div>
            </div>

            {currentStatus === 'present' && (
              <span className="px-2.5 py-1 rounded-full bg-white/15 dark:bg-black/10 text-xs font-semibold tracking-wide">
                Active
              </span>
            )}
          </button>

          {/* ABSENT BUTTON */}
          <button
            type="button"
            disabled={isLocked || submitting !== null}
            onClick={() => handleSelectStatus('absent')}
            className={`w-full min-h-[68px] px-5 rounded-2xl flex items-center justify-between transition-all duration-200 border ios-active ${
              currentStatus === 'absent'
                ? 'bg-black dark:bg-white text-white dark:text-black border-[#C9A227] shadow-sm'
                : 'bg-white dark:bg-neutral-950 text-black dark:text-white border-neutral-200 dark:border-neutral-800 hover:border-[#C9A227]'
            } ${isLocked ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'}`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                  currentStatus === 'absent'
                    ? 'bg-white/15 dark:bg-black/10 text-white dark:text-black'
                    : 'bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white'
                }`}
              >
                <XCircle className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="text-left">
                <span className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  ABSENT
                </span>
                <span
                  className={`text-xs block ${
                    currentStatus === 'absent'
                      ? 'text-neutral-300 dark:text-neutral-600'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  Cannot attend today (triggers cover)
                </span>
              </div>
            </div>

            {currentStatus === 'absent' && (
              <span className="px-2.5 py-1 rounded-full bg-white/15 dark:bg-black/10 text-xs font-semibold tracking-wide">
                Active
              </span>
            )}
          </button>

          {/* LATE BUTTON */}
          <button
            type="button"
            disabled={isLocked || submitting !== null}
            onClick={() => handleSelectStatus('late')}
            className={`w-full min-h-[68px] px-5 rounded-2xl flex items-center justify-between transition-all duration-200 border ios-active ${
              currentStatus === 'late'
                ? 'bg-black dark:bg-white text-white dark:text-black border-[#C9A227] shadow-sm'
                : 'bg-white dark:bg-neutral-950 text-black dark:text-white border-neutral-200 dark:border-neutral-800 hover:border-[#C9A227]'
            } ${isLocked ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'}`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                  currentStatus === 'late'
                    ? 'bg-white/15 dark:bg-black/10 text-white dark:text-black'
                    : 'bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white'
                }`}
              >
                <Clock3 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="text-left">
                <span className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  LATE
                </span>
                <span
                  className={`text-xs block ${
                    currentStatus === 'late'
                      ? 'text-neutral-300 dark:text-neutral-600'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  On the way · Arriving shortly
                </span>
              </div>
            </div>

            {currentStatus === 'late' && (
              <span className="px-2.5 py-1 rounded-full bg-white/15 dark:bg-black/10 text-xs font-semibold tracking-wide">
                Active
              </span>
            )}
          </button>
        </div>

        {/* Half Leave feedback notice */}
        {halfLeaveNotice && (
          <div className="p-3 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 flex items-start gap-2">
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
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-950 border border-[#C9A227] shadow-sm space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white flex items-center justify-center shrink-0">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-0.5 flex items-center gap-1.5">
                  <span>Half Leave</span>
                  {halfLeave.status === 'pending' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                  {halfLeave.status === 'rejected' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  )}
                  {(halfLeave.status === 'applied' || halfLeave.status === 'approved') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </p>
                <p className="text-sm font-semibold text-black dark:text-white leading-snug">
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
                className="w-full h-11 rounded-xl bg-white dark:bg-neutral-950 hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-black dark:text-white font-semibold text-xs flex items-center justify-center transition-colors disabled:opacity-50 min-h-[44px]"
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
                    ? 'bg-black dark:bg-white border-[#C9A227] text-white dark:text-black hover:bg-neutral-900 dark:hover:bg-neutral-100 shadow-sm active:scale-[0.98] ios-active'
                    : 'bg-neutral-100 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                }`}
              >
                <CalendarClock
                  className={`w-4 h-4 ${
                    halfLeave?.inSchoolTime
                      ? 'text-white dark:text-black'
                      : 'text-neutral-400 dark:text-neutral-500'
                  }`}
                />
                <span>Half Leave</span>
              </button>
              {halfLeave !== null && (
                <p className="text-[11px] text-center text-neutral-500 dark:text-neutral-400">
                  {halfLeave.inSchoolTime
                    ? 'Hands over your periods from the current period onwards.'
                    : 'Half Leave is available during school hours.'}
                </p>
              )}
              </div>
            )
          )}
          </>
        )}
      </div>

      {/* Saved Status Summary Card */}
      {!isOnVacation && (
        <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-950 border border-[#C9A227] shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Recorded Response
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {currentStatus === 'present' && (
                  <>
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm font-bold text-black dark:text-white">
                      Marked Present
                    </span>
                  </>
                )}
                {currentStatus === 'absent' && (
                  <>
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-sm font-bold text-black dark:text-white">
                      Marked Absent
                    </span>
                  </>
                )}
                {currentStatus === 'late' && (
                  <>
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-sm font-bold text-black dark:text-white">
                      Marked Late
                    </span>
                  </>
                )}
                {currentStatus === 'no_reply' && (
                  <>
                    <div className="w-3 h-3 rounded-full bg-neutral-400" />
                    <span className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
                      No Reply (Cutoff Passed)
                    </span>
                  </>
                )}
                {currentStatus === 'pending' && (
                  <>
                    <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-sm font-bold text-black dark:text-white">
                      Awaiting Response
                    </span>
                  </>
                )}
              </div>

              {attendance?.updated_at && (
                <span className="text-[11px] font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                  {new Date(attendance.updated_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>

            {currentStatus === 'absent' && (
              <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-2 rounded-lg">
                Check the <strong>Timetable</strong> tab to see which colleagues are covering your scheduled periods today.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Half Leave Panel Modal */}
      {showHalfLeavePanel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-neutral-950 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-[#C9A227] max-h-[85vh] flex flex-col">
            <div className="w-12 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto mb-4 sm:hidden shrink-0" />
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h3 className="text-base font-bold text-black dark:text-white">
                Half Leave
              </h3>
              <button
                type="button"
                onClick={() => setShowHalfLeavePanel(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
              {panelLoading && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 py-4 text-center">
                  Checking your remaining periods...
                </p>
              )}

              {!panelLoading && panelError && (
                <div className="p-3 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{panelError}</span>
                </div>
              )}

              {!panelLoading && !panelError && panelInfo && (
                <>
                  {panelInfo.dayOver ? (
                    <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      The school day is over. There are no periods left to hand over.
                    </div>
                  ) : panelPeriods.length === 0 ? (
                    <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      You have no periods left today to hand over.
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Your periods from Period {panelInfo.currentFromPeriod ?? panelPeriods[0].periodNumber} onwards will be handed over.
                      </p>

                      <div className="space-y-2">
                        {panelPeriods.map((period) => (
                          <div
                            key={`${period.periodNumber}-${period.startTime}`}
                            className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-bold text-black dark:text-white">
                                  Period {period.periodNumber}
                                </span>
                                <span className="text-neutral-400">·</span>
                                <span className="font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                                  {period.startTime} - {period.endTime}
                                </span>
                              </div>
                              <p className="text-sm font-bold text-black dark:text-white mt-0.5">
                                {period.subjectName}
                              </p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {period.className}
                                {period.coveringForName ? ` · covering for ${period.coveringForName}` : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {panelInfo.requiresApproval && (
                        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-300">
                          Your principal will see this and approve it.
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {applyResultMessage && (
                <div className="p-3 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{applyResultMessage}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 mt-2 border-t border-neutral-200 dark:border-neutral-800 shrink-0">
              <button
                type="button"
                onClick={() => setShowHalfLeavePanel(false)}
                className="flex-1 h-11 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-xs font-semibold min-h-[44px]"
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
                    className="flex-1 h-11 rounded-xl bg-black dark:bg-white hover:bg-neutral-900 dark:hover:bg-neutral-100 text-white dark:text-black border border-[#C9A227] text-xs font-semibold disabled:opacity-50 min-h-[44px]"
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
