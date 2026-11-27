import React, { useState, useEffect, useCallback } from 'react';
import { History as HistoryIcon, Calendar, CheckCircle2, Clock, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { TeacherSession, AttendanceRecord, AttendanceStatus } from '../../types';
import { getTeacherAttendanceHistory } from '../../services/attendanceService';
import { formatFriendlyDate } from '../../utils/dateUtils';

interface HistoryScreenProps {
  session: TeacherSession;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ session }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTeacherAttendanceHistory({
        schoolId: session.schoolId,
        teacherId: session.teacherId,
        limit: 50,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setRecords(res.records);
      }
    } catch (err: any) {
      setError('Could not load your history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [session.schoolId, session.teacherId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Compute stats
  const totalDays = records.length;
  const presentCount = records.filter((r) => r.status === 'present').length;
  const lateCount = records.filter((r) => r.status === 'late').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const attendanceRate = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 100;

  const filteredRecords = records.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  return (
    <div className="flex-1 p-5 pb-8 overflow-y-auto space-y-4 bg-white dark:bg-neutral-950">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            Attendance Log
          </span>
          <h2 className="text-lg font-bold text-black dark:text-white">
            My Past Attendance
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

      {error && (
        <div className="p-3 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-950 border border-[#C9A227] text-center shadow-sm">
          <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block">Rate</span>
          <span className="text-lg font-bold text-black dark:text-white font-mono tabular-nums">
            {attendanceRate}%
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-center shadow-sm">
          <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 inline-flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Present
          </span>
          <span className="text-lg font-bold text-black dark:text-white font-mono tabular-nums block">
            {presentCount}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-center shadow-sm">
          <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 inline-flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            Late
          </span>
          <span className="text-lg font-bold text-black dark:text-white font-mono tabular-nums block">
            {lateCount}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-center shadow-sm">
          <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 inline-flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
            Absent
          </span>
          <span className="text-lg font-bold text-black dark:text-white font-mono tabular-nums block">
            {absentCount}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-x-auto text-xs font-medium">
        {['all', 'present', 'late', 'absent'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg capitalize whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-black dark:bg-white text-white dark:text-black border border-[#C9A227] shadow-sm font-semibold'
                : 'text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Records List */}
      <div className="space-y-2.5">
        {filteredRecords.length === 0 && !loading && (
          <div className="text-center py-12 px-4 bg-white dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <HistoryIcon className="w-10 h-10 text-neutral-400 mx-auto mb-2 stroke-[1.5]" />
            <p className="text-sm font-semibold text-black dark:text-white">
              No Attendance Records
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              No records found matching the selected filter.
            </p>
          </div>
        )}

        {filteredRecords.map((record) => {
          const friendly = formatFriendlyDate(record.date, session.schoolTimezone);
          return (
            <div
              key={record.id}
              className="p-3.5 rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  {record.status === 'present' && (
                    <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
                    </div>
                  )}
                  {record.status === 'late' && (
                    <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white flex items-center justify-center">
                      <Clock className="w-5 h-5 stroke-[2.2]" />
                    </div>
                  )}
                  {record.status === 'absent' && (
                    <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white flex items-center justify-center">
                      <XCircle className="w-5 h-5 stroke-[2.2]" />
                    </div>
                  )}
                  {(record.status === 'no_reply' || record.status === 'pending') && (
                    <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 flex items-center justify-center">
                      <Calendar className="w-5 h-5 stroke-[2]" />
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-black dark:text-white">
                    {friendly}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    <span className="font-mono tabular-nums">{record.date}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize font-mono">via {record.source || 'app'}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold uppercase tracking-wider inline-flex items-center justify-end gap-1.5 text-black dark:text-white">
                  <span
                    className={`w-2 h-2 rounded-full inline-block ${
                      record.status === 'present'
                        ? 'bg-emerald-500'
                        : record.status === 'late'
                        ? 'bg-amber-500'
                        : record.status === 'absent'
                        ? 'bg-rose-500'
                        : 'bg-neutral-400'
                    }`}
                  />
                  {record.status}
                </span>
                {record.updated_at && (
                  <span className="text-[10px] font-mono tabular-nums text-neutral-400 dark:text-neutral-500 mt-0.5 block">
                    {new Date(record.updated_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
