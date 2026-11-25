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

          {periods.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="p-3">Period</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Class</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {periods.map((period) => {
                    const isArrangement = period.isCovering;
                    const isUncovered = period.coverStatus === 'uncovered';

                    // Normal periods: blue box (blue background)
                    // Arrangement periods: red box (red background)
                    // Uncovered periods: grey box
                    let boxClass = 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100';
                    let statusLabel = period.isCovered ? `Covered by ${period.coveringTeacherName || 'Colleague'}` : 'Scheduled';

                    if (isArrangement) {
                      boxClass = 'bg-rose-50/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100';
                      statusLabel = `Covering for ${period.originalTeacherName || 'Colleague'}`;
                    } else if (isUncovered) {
                      boxClass = 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300';
                      statusLabel = 'Uncovered';
                    }

                    return (
                      <tr key={period.id} className={`${boxClass} transition-colors border-b border-slate-200/50 dark:border-slate-800/50`}>
                        <td className="p-3 font-bold whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-1 rounded-lg font-bold text-white shadow-sm ${
                            isArrangement ? 'bg-rose-600' :
                            isUncovered ? 'bg-slate-500' :
                            'bg-blue-600'
                          }`}>
                            P{period.periodNumber}
                          </span>
                        </td>
                        <td className="p-3 font-mono tabular-nums whitespace-nowrap">
                          {period.startTime} - {period.endTime}
                        </td>
                        <td className="p-3 font-semibold">
                          {period.subjectName}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {period.className}
                        </td>
                        <td className="p-3 font-medium">
                          {statusLabel}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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

          {classPeriods.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="p-3">Period</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Teacher</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classPeriods.map((item, idx) => (
                    <tr key={idx} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-bold whitespace-nowrap">
                        <span className="inline-block px-2.5 py-1 rounded-lg font-bold bg-slate-700 text-white shadow-sm">
                          P{item.periodNumber}
                        </span>
                      </td>
                      <td className="p-3 font-mono tabular-nums whitespace-nowrap">
                        {item.startTime} - {item.endTime}
                      </td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        {item.subjectName}
                      </td>
                      <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                        {item.teacherName}
                      </td>
                      <td className="p-3">
                        {item.isCovered ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold">
                            Covered by {item.coveringTeacherName || 'Sub'}
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Regular
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
