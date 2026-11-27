import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, AlertCircle, Calendar } from 'lucide-react';
import { TeacherSession, AttendanceRecord, AttendanceStatus } from '../../types';
import { getTeacherAttendanceHistory } from '../../services/attendanceService';
import { getTodayDateString } from '../../utils/dateUtils';

interface HistoryScreenProps {
  session: TeacherSession;
}

function formatMonthYear(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return monthKey;
  const dateObj = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
}

function formatDayShort(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).formatToParts(dateObj);
    const weekday = parts.find((p) => p.type === 'weekday')?.value || '';
    const dayPart = parts.find((p) => p.type === 'day')?.value || '';
    const monthPart = parts.find((p) => p.type === 'month')?.value || '';
    return weekday && dayPart && monthPart ? `${weekday}, ${dayPart} ${monthPart}` : dateStr;
  } catch {
    return dateStr;
  }
}

function formatReplyTime(iso: string | undefined, timezone: string = 'UTC'): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return null;
  }
}

function getStatusMeta(status: AttendanceStatus): { label: string; dotClass: string } {
  switch (status) {
    case 'present':
      return { label: 'Present', dotClass: 'bg-emerald-500' };
    case 'late':
      return { label: 'Late', dotClass: 'bg-amber-500' };
    case 'absent':
      return { label: 'Absent', dotClass: 'bg-rose-500' };
    case 'no_reply':
      return { label: 'No Reply', dotClass: 'bg-neutral-400' };
    case 'pending':
    default:
      return { label: 'Pending', dotClass: 'bg-amber-400' };
  }
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ session }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    getTodayDateString(session.schoolTimezone).slice(0, 7)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTeacherAttendanceHistory({
        schoolId: session.schoolId,
        teacherId: session.teacherId,
        limit: 60,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setRecords(res.records);
      }
    } catch {
      setError('Could not load your history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [session.schoolId, session.teacherId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const monthsWithRecords = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.date && r.date.length >= 7) {
        set.add(r.date.slice(0, 7));
      }
    });
    return Array.from(set).sort();
  }, [records]);

  const prevMonth = useMemo(() => {
    const earlier = monthsWithRecords.filter((m) => m < selectedMonth);
    return earlier.length > 0 ? earlier[earlier.length - 1] : null;
  }, [monthsWithRecords, selectedMonth]);

  const nextMonth = useMemo(() => {
    return monthsWithRecords.find((m) => m > selectedMonth) || null;
  }, [monthsWithRecords, selectedMonth]);

  const monthRecords = useMemo(() => {
    return records
      .filter((r) => r.date && r.date.startsWith(selectedMonth))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, selectedMonth]);

  const presentCount = monthRecords.filter((r) => r.status === 'present').length;
  const lateCount = monthRecords.filter((r) => r.status === 'late').length;
  const absentCount = monthRecords.filter((r) => r.status === 'absent').length;
  const noReplyCount = monthRecords.filter((r) => r.status === 'no_reply').length;

  return (
    <div className="flex-1 p-5 pb-8 overflow-y-auto space-y-4 bg-white dark:bg-neutral-950">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Attendance Log
          </span>
          <h2 className="text-lg font-bold text-black dark:text-white">
            History
          </h2>
        </div>
        <button
          type="button"
          onClick={loadHistory}
          disabled={loading}
          aria-label="Refresh attendance history"
          className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-between px-2 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => prevMonth && setSelectedMonth(prevMonth)}
          disabled={!prevMonth}
          aria-label="Previous month"
          className="w-9 h-9 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-black dark:text-white flex items-center justify-center transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-sm font-bold text-black dark:text-white tracking-tight">
          {formatMonthYear(selectedMonth)}
        </span>

        <button
          type="button"
          onClick={() => nextMonth && setSelectedMonth(nextMonth)}
          disabled={!nextMonth}
          aria-label="Next month"
          className="w-9 h-9 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-black dark:text-white flex items-center justify-center transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Monthly Summary Card */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-950 border border-[#C9A227] shadow-sm">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 inline-flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Present
            </span>
            <span className="text-lg font-bold text-black dark:text-white font-mono tabular-nums block mt-0.5">
              {presentCount}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 inline-flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              Late
            </span>
            <span className="text-lg font-bold text-black dark:text-white font-mono tabular-nums block mt-0.5">
              {lateCount}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 inline-flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
              Absent
            </span>
            <span className="text-lg font-bold text-black dark:text-white font-mono tabular-nums block mt-0.5">
              {absentCount}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 inline-flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 inline-block" />
              No Reply
            </span>
            <span className="text-lg font-bold text-black dark:text-white font-mono tabular-nums block mt-0.5">
              {noReplyCount}
            </span>
          </div>
        </div>
      </div>

      {/* Day-by-Day List */}
      {loading && records.length === 0 ? (
        <div className="py-10 text-center text-xs text-neutral-500 dark:text-neutral-400 font-medium">
          Loading attendance records...
        </div>
      ) : monthRecords.length === 0 ? (
        <div className="text-center py-10 px-4 bg-white dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <Calendar className="w-8 h-8 text-neutral-400 mx-auto mb-2 stroke-[1.5]" />
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            No attendance records for this month.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 overflow-hidden shadow-sm">
          {monthRecords.map((record) => {
            const statusMeta = getStatusMeta(record.status);
            const replyTime = formatReplyTime(record.reply_at, session.schoolTimezone);
            return (
              <div
                key={record.id || record.date}
                className="px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-black dark:text-white">
                    {formatDayShort(record.date)}
                  </p>
                  {replyTime && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono tabular-nums mt-0.5">
                      Replied {replyTime}
                    </p>
                  )}
                </div>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-black dark:text-white whitespace-nowrap shrink-0">
                  <span className={`w-2 h-2 rounded-full ${statusMeta.dotClass}`} />
                  {statusMeta.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
