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
    <div className="flex-1 p-5 pb-8 overflow-y-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Attendance Log
          </span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            My Past Attendance
          </h2>
        </div>
        <button
          type="button"
          onClick={loadHistory}
          disabled={loading}
          aria-label="Refresh attendance history"
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-center shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Rate</span>
          <span className="text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {attendanceRate}%
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-center shadow-sm">
          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Present</span>
          <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono tabular-nums">
            {presentCount}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-center shadow-sm">
          <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">Late</span>
          <span className="text-lg font-bold text-amber-700 dark:text-amber-300 font-mono tabular-nums">
            {lateCount}
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40 text-center shadow-sm">
          <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">Absent</span>
          <span className="text-lg font-bold text-rose-700 dark:text-rose-300 font-mono tabular-nums">
            {absentCount}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-x-auto text-xs font-medium">
        {['all', 'present', 'late', 'absent'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg capitalize whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Records List */}
      <div className="space-y-2.5">
        {filteredRecords.length === 0 && !loading && (
          <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
            <HistoryIcon className="w-10 h-10 text-slate-400 mx-auto mb-2 stroke-[1.5]" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No Attendance Records
            </p>
            <p className="text-xs text-slate-500 mt-1">
              No records found matching the selected filter.
            </p>
          </div>
        )}

        {filteredRecords.map((record) => {
          const friendly = formatFriendlyDate(record.date, session.schoolTimezone);
          return (
            <div
              key={record.id}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  {record.status === 'present' && (
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
                    </div>
                  )}
                  {record.status === 'late' && (
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Clock className="w-5 h-5 stroke-[2.2]" />
                    </div>
                  )}
                  {record.status === 'absent' && (
                    <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <XCircle className="w-5 h-5 stroke-[2.2]" />
                    </div>
                  )}
                  {(record.status === 'no_reply' || record.status === 'pending') && (
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                      <Calendar className="w-5 h-5 stroke-[2]" />
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {friendly}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="font-mono tabular-nums">{record.date}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize font-mono">via {record.source || 'app'}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`text-xs font-bold uppercase tracking-wider block ${
                    record.status === 'present'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : record.status === 'late'
                      ? 'text-amber-600 dark:text-amber-400'
                      : record.status === 'absent'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-500'
                  }`}
                >
                  {record.status}
                </span>
                {record.updated_at && (
                  <span className="text-[10px] font-mono tabular-nums text-slate-400 mt-0.5 block">
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
