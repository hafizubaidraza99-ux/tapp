import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays,
  Clock,
  UserCheck,
  UserX,
  RefreshCw,
  AlertCircle,
  GraduationCap,
  Layers,
} from 'lucide-react';
import { TeacherSession } from '../../types';
import {
  getTeacherTodayTimetable,
  getClassTodayTimetable,
  DisplayPeriodItem,
  ClassTimetableItem,
} from '../../services/timetableService';

interface TimetableScreenProps {
  session: TeacherSession;
}

export const TimetableScreen: React.FC<TimetableScreenProps> = ({ session }) => {
  const [activeView, setActiveView] = useState<'my' | 'class'>('my');
  const [periods, setPeriods] = useState<DisplayPeriodItem[]>([]);
  const [classPeriods, setClassPeriods] = useState<ClassTimetableItem[]>([]);
  const [className, setClassName] = useState<string>('');
  const [dayName, setDayName] = useState<string>('');
  const [todayDate, setTodayDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTimetable = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const myData = await getTeacherTodayTimetable({
        schoolId: session.schoolId,
        teacherId: session.teacherId,
        timezone: session.schoolTimezone,
      });

      if (myData.error) {
        setError(myData.error);
      } else {
        setPeriods(myData.periods);
        setDayName(myData.dayName);
        setTodayDate(myData.todayDate);
      }

      // If head teacher, load class timetable
      if (session.isHeadTeacher && session.classId) {
        const cData = await getClassTodayTimetable({
          schoolId: session.schoolId,
          classId: session.classId,
          timezone: session.schoolTimezone,
        });
        if (cData.periods) {
          setClassPeriods(cData.periods);
          setClassName(cData.className);
        }
      }
    } catch (err: any) {
      setError('Could not load your timetable. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [session.schoolId, session.teacherId, session.schoolTimezone, session.isHeadTeacher, session.classId]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  return (
    <div className="flex-1 p-5 pb-8 overflow-y-auto space-y-4">
      {/* Title & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {dayName || 'Today'} · {todayDate}
          </span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Daily Timetable
          </h2>
        </div>
        <button
          type="button"
          onClick={loadTimetable}
          disabled={loading}
          aria-label="Refresh timetable"
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Head Teacher Segmented Switcher */}
      {session.isHeadTeacher && (
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveView('my')}
            className={`flex-1 min-h-[38px] text-xs font-semibold rounded-lg transition-all ${
              activeView === 'my'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            My Assigned Periods
          </button>
          <button
            type="button"
            onClick={() => setActiveView('class')}
            className={`flex-1 min-h-[38px] text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeView === 'class'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
            <span>Class Timetable</span>
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* VIEW: TEACHER'S OWN PERIODS */}
      {activeView === 'my' && (
        <div className="space-y-3">
          {periods.length === 0 && !loading && (
            <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
              <CalendarDays className="w-10 h-10 text-slate-400 mx-auto mb-2 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No Periods Scheduled Today
              </p>
              <p className="text-xs text-slate-500 mt-1">
                You have no teaching periods or cover assignments for {dayName}.
              </p>
            </div>
          )}

          {periods.map((period) => (
            <div
              key={period.id}
              className={`p-4 rounded-2xl border transition-all ${
                period.isCovering
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60'
                  : period.isCovered
                  ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80'
              } shadow-sm`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Period {period.periodNumber}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="flex items-center gap-1 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      <Clock className="w-3 h-3" />
                      {period.startTime} - {period.endTime}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {period.subjectName}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Class: {period.className}
                  </p>
                </div>

                {/* Status Badges */}
                <div className="shrink-0">
                  {period.isCovering ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold">
                      <UserCheck className="w-3 h-3" />
                      Covering
                    </span>
                  ) : period.isCovered ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-[11px] font-semibold">
                      <UserX className="w-3 h-3" />
                      Covered
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800">
                      Scheduled
                    </span>
                  )}
                </div>
              </div>

              {/* Cover Details Section */}
              {period.isCovered && (
                <div className="mt-2 pt-2 border-t border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                  <span>Covered by: <strong>{period.coveringTeacherName || 'Another Colleague'}</strong></span>
                  <span className="text-[10px] uppercase font-mono">cover assignment</span>
                </div>
              )}

              {period.isCovering && (
                <div className="mt-2 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/40 text-xs text-indigo-800 dark:text-indigo-300 flex items-center justify-between">
                  <span>Covering for: <strong>{period.originalTeacherName || 'Absent Colleague'}</strong></span>
                  <span className="text-[10px] uppercase font-mono">cover assignment</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* VIEW: HEAD TEACHER CLASS TIMETABLE */}
      {activeView === 'class' && session.isHeadTeacher && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between">
            <span className="font-semibold">Full Timetable for {className || 'Your Class'}</span>
            <span className="text-[11px] font-mono">Head Teacher View</span>
          </div>

          {classPeriods.length === 0 && !loading && (
            <div className="text-center py-8 text-xs text-slate-500">
              No periods configured for this class today.
            </div>
          )}

          {classPeriods.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3 shadow-sm"
            >
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-bold">P{item.periodNumber}</span>
                  <span>·</span>
                  <span className="font-mono tabular-nums">{item.startTime} - {item.endTime}</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {item.subjectName}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Teacher: <span className="font-medium text-slate-700 dark:text-slate-300">{item.teacherName}</span>
                </div>
              </div>

              <div className="text-right">
                {item.isCovered ? (
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold">
                      Covered
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      by {item.coveringTeacherName || 'Sub'}
                    </p>
                  </div>
                ) : (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Regular
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
