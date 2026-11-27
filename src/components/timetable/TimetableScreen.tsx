import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CalendarDays,
  Clock,
  RefreshCw,
  AlertCircle,
  GraduationCap,
  FileText,
} from 'lucide-react';
import { TeacherSession } from '../../types';
import {
  getTeacherDefaultTimetable,
  getTeacherArrangementsByDate,
  getTeacherClassTimetable,
  getTeacherClassArrangements,
  getTeacherPaperDuty,
  DefaultPeriodItem,
  ArrangementPeriodItem,
  ClassTimetableDetailItem,
  ClassArrangementItem,
  PaperDutyItem,
} from '../../services/timetableService';
import { getTodayDateString } from '../../utils/dateUtils';

interface TimetableScreenProps {
  session: TeacherSession;
}

export const TimetableScreen: React.FC<TimetableScreenProps> = ({ session }) => {
  const [activeView, setActiveView] = useState<'my' | 'class'>('my');
  const [defaultPeriods, setDefaultPeriods] = useState<DefaultPeriodItem[]>([]);
  const [arrangements, setArrangements] = useState<ArrangementPeriodItem[]>([]);
  const [classPeriods, setClassPeriods] = useState<ClassTimetableDetailItem[]>([]);
  const [classArrangements, setClassArrangements] = useState<ClassArrangementItem[]>([]);
  const [paperDuties, setPaperDuties] = useState<PaperDutyItem[]>([]);
  const [className, setClassName] = useState<string>('');
  const [dayName, setDayName] = useState<string>('');
  const [todayDate, setTodayDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [arrangementDate, setArrangementDate] = useState<string>(() =>
    getTodayDateString(session.schoolTimezone)
  );
  const [arrangementsLoading, setArrangementsLoading] = useState(false);
  const [arrangementsError, setArrangementsError] = useState<string | null>(null);
  const arrangementDateRef = useRef<string>(arrangementDate);
  const arrangementsReqIdRef = useRef<number>(0);

  const loadArrangementsForDate = useCallback(
    async (targetDate: string) => {
      const reqId = ++arrangementsReqIdRef.current;
      setArrangementsLoading(true);
      setArrangementsError(null);
      try {
        const arrangeData = await getTeacherArrangementsByDate({
          schoolId: session.schoolId,
          teacherId: session.teacherId,
          timezone: session.schoolTimezone,
          date: targetDate,
        });
        if (reqId !== arrangementsReqIdRef.current) return;
        if (arrangeData.error) {
          setArrangementsError(arrangeData.error);
          setArrangements([]);
        } else {
          setArrangements(arrangeData.arrangements);
        }
      } catch {
        if (reqId !== arrangementsReqIdRef.current) return;
        setArrangementsError('Could not load arrangement periods. Please try again.');
        setArrangements([]);
      } finally {
        if (reqId === arrangementsReqIdRef.current) {
          setArrangementsLoading(false);
        }
      }
    },
    [session.schoolId, session.teacherId, session.schoolTimezone]
  );

  const handleArrangementDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextDate = e.target.value || getTodayDateString(session.schoolTimezone);
    setArrangementDate(nextDate);
    arrangementDateRef.current = nextDate;
    loadArrangementsForDate(nextDate);
  };

  const loadTimetable = useCallback(async () => {
    setLoading(true);
    setError(null);
    setArrangementsError(null);
    const reqId = ++arrangementsReqIdRef.current;
    const targetDate = arrangementDateRef.current || getTodayDateString(session.schoolTimezone);
    try {
      const [defaultData, arrangeData, classData, classArrangeData, paperDutyData] = await Promise.all([
        getTeacherDefaultTimetable({
          schoolId: session.schoolId,
          teacherId: session.teacherId,
          timezone: session.schoolTimezone,
        }),
        getTeacherArrangementsByDate({
          schoolId: session.schoolId,
          teacherId: session.teacherId,
          timezone: session.schoolTimezone,
          date: targetDate,
        }),
        getTeacherClassTimetable({
          schoolId: session.schoolId,
          teacherId: session.teacherId,
          timezone: session.schoolTimezone,
        }),
        getTeacherClassArrangements({
          schoolId: session.schoolId,
          teacherId: session.teacherId,
          timezone: session.schoolTimezone,
        }),
        getTeacherPaperDuty(),
      ]);

      if (defaultData.error) {
        setError(defaultData.error);
      } else {
        setDefaultPeriods(defaultData.periods);
        setDayName(defaultData.dayName);
        setTodayDate(defaultData.todayDate);
      }

      if (reqId === arrangementsReqIdRef.current) {
        if (arrangeData.error) {
          setArrangementsError(arrangeData.error);
          setArrangements([]);
        } else {
          setArrangements(arrangeData.arrangements);
        }
      }

      if (classData.periods && classData.periods.length > 0) {
        setClassPeriods(classData.periods);
        setClassName(classData.className);
      } else {
        setClassPeriods([]);
      }

      if (classArrangeData.arrangements) {
        setClassArrangements(classArrangeData.arrangements);
      }

      setPaperDuties(paperDutyData.duties || []);
    } catch (err: any) {
      setError('Could not load your timetable. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [session.schoolId, session.teacherId, session.schoolTimezone]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  const hasClassTimetable = classPeriods.length > 0;

  return (
    <div className="flex-1 p-5 pb-8 overflow-y-auto space-y-4">
      {/* Title & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
            {dayName || 'Today'} · {todayDate}
          </span>
          <h2 className="text-lg font-bold text-black dark:text-white">
            Daily Timetable
          </h2>
        </div>
        <button
          type="button"
          onClick={loadTimetable}
          disabled={loading}
          aria-label="Refresh timetable"
          className="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Segmented Switcher for My Timetable and My Class (shown ONLY when get_my_class_timetable returns rows) */}
      {hasClassTimetable && (
        <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveView('my')}
            className={`flex-1 min-h-[38px] text-xs font-semibold rounded-lg transition-all ${
              activeView === 'my'
                ? 'bg-black dark:bg-white text-white dark:text-black border border-[#C9A227] shadow-sm'
                : 'text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            My Timetable
          </button>
          <button
            type="button"
            onClick={() => setActiveView('class')}
            className={`flex-1 min-h-[38px] text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeView === 'class'
                ? 'bg-black dark:bg-white text-white dark:text-black border border-[#C9A227] shadow-sm'
                : 'text-neutral-500 hover:text-black dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>My Class</span>
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* VIEW: MY TIMETABLE & ARRANGEMENTS */}
      {activeView === 'my' && (
        <div className="space-y-6">
          {/* Paper Duty Today (rendered ONLY when rows exist) */}
          {paperDuties.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 px-1">
                Paper Duty Today
              </h3>
              <div className="rounded-2xl border border-[#C9A227] bg-white dark:bg-neutral-950 shadow-sm divide-y divide-neutral-200 dark:divide-neutral-800 overflow-hidden">
                {paperDuties.map((duty) => (
                  <div
                    key={duty.id}
                    className="px-4 py-3 flex items-center gap-3 text-sm font-semibold text-black dark:text-white"
                  >
                    <FileText className="w-4 h-4 text-black dark:text-white shrink-0" />
                    <span>
                      {duty.className} — Period {duty.periodNumber}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Section: My Timetable (Default Timetable) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 px-1">
              My Timetable
            </h3>

            {defaultPeriods.length === 0 && !loading && (
              <div className="text-center py-8 px-4 bg-white dark:bg-neutral-950 rounded-2xl border border-[#C9A227]">
                <CalendarDays className="w-8 h-8 text-neutral-400 mx-auto mb-2 stroke-[1.5]" />
                <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  No Default Timetable Scheduled
                </p>
              </div>
            )}

            {defaultPeriods.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-[#C9A227] bg-white dark:bg-neutral-950 shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">
                      <th className="p-3">Period</th>
                      <th className="p-3">Time</th>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Class</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {defaultPeriods.map((period) => (
                      <tr key={period.id} className="bg-white dark:bg-neutral-950 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900">
                        <td className="p-3 font-bold whitespace-nowrap">
                          <span className="inline-block px-2.5 py-1 rounded-lg font-bold bg-black dark:bg-white text-white dark:text-black shadow-sm">
                            P{period.periodNumber}
                          </span>
                        </td>
                        <td className="p-3 font-mono tabular-nums whitespace-nowrap text-neutral-700 dark:text-neutral-300">
                          {period.startTime} - {period.endTime}
                        </td>
                        <td className="p-3 font-semibold text-black dark:text-white">
                          {period.subjectName}
                        </td>
                        <td className="p-3 whitespace-nowrap text-neutral-700 dark:text-neutral-300">
                          {period.className}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Separate Section Below: Arrangement Periods */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                Arrangement Periods
              </h3>
              <input
                type="date"
                aria-label="Arrangement date"
                value={arrangementDate}
                onChange={handleArrangementDateChange}
                className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black/30 dark:focus:ring-white/30"
              />
            </div>

            {arrangementsError && !arrangementsLoading && (
              <div className="p-3 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{arrangementsError}</span>
              </div>
            )}

            {arrangementsLoading && (
              <div className="p-4 bg-white dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Loading arrangement periods...
              </div>
            )}

            {!arrangementsLoading && !arrangementsError && arrangements.length === 0 && !loading && (
              <div className="p-4 bg-white dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                No arrangement periods on this day.
              </div>
            )}

            {!arrangementsLoading && arrangements.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-[#C9A227] bg-white dark:bg-neutral-950 shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">
                      <th className="p-3">Period</th>
                      <th className="p-3">Time</th>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Class</th>
                      <th className="p-3">Covering for</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {arrangements.map((item) => (
                      <tr key={item.id} className="bg-white dark:bg-neutral-950 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900">
                        <td className="p-3 font-bold whitespace-nowrap border-l-2 border-l-[#C9A227]">
                          <span className="inline-block px-2.5 py-1 rounded-lg font-bold bg-black dark:bg-white text-white dark:text-black shadow-sm">
                            P{item.periodNumber}
                          </span>
                          <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                            Cover
                          </span>
                        </td>
                        <td className="p-3 font-mono tabular-nums whitespace-nowrap text-neutral-700 dark:text-neutral-300">
                          {item.startTime} - {item.endTime}
                        </td>
                        <td className="p-3 font-semibold text-black dark:text-white">
                          {item.subjectName}
                        </td>
                        <td className="p-3 whitespace-nowrap text-neutral-700 dark:text-neutral-300">
                          {item.className}
                        </td>
                        <td className="p-3 font-bold text-black dark:text-white">
                          {item.coveringForName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: MY CLASS (HEAD TEACHER CLASS TIMETABLE & ARRANGEMENTS) */}
      {activeView === 'class' && hasClassTimetable && (
        <div className="space-y-6">
          {/* Top Section: Class Timetable */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 px-1">
              Class Timetable — {className || 'Class'}
            </h3>

            {classPeriods.length === 0 && !loading && (
              <div className="text-center py-8 px-4 bg-white dark:bg-neutral-950 rounded-2xl border border-[#C9A227]">
                <CalendarDays className="w-8 h-8 text-neutral-400 mx-auto mb-2 stroke-[1.5]" />
                <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  No Class Timetable Available
                </p>
              </div>
            )}

            {classPeriods.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-[#C9A227] bg-white dark:bg-neutral-950 shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">
                      <th className="p-3">Period</th>
                      <th className="p-3">Time</th>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Teacher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {classPeriods.map((item) => (
                      <tr key={item.id} className="bg-white dark:bg-neutral-950 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900">
                        <td className="p-3 font-bold whitespace-nowrap">
                          <span className="inline-block px-2.5 py-1 rounded-lg font-bold bg-black dark:bg-white text-white dark:text-black shadow-sm">
                            P{item.periodNumber}
                          </span>
                        </td>
                        <td className="p-3 font-mono tabular-nums whitespace-nowrap text-neutral-700 dark:text-neutral-300">
                          {item.startTime} - {item.endTime}
                        </td>
                        <td className="p-3 font-semibold text-black dark:text-white">
                          {item.subjectName}
                        </td>
                        <td className="p-3 font-medium text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                          {item.teacherName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom Section: Arrangements Today */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 px-1">
              Arrangements Today
            </h3>

            {classArrangements.length === 0 && !loading && (
              <div className="p-4 bg-white dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                No arrangements today.
              </div>
            )}

            {classArrangements.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-[#C9A227] bg-white dark:bg-neutral-950 shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">
                      <th className="p-3">Period</th>
                      <th className="p-3">Time</th>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Absent Teacher</th>
                      <th className="p-3">Covering Teacher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {classArrangements.map((item) => {
                      const isUncovered = item.coverStatus === 'uncovered' || item.coveringTeacherName === 'Uncovered';
                      return (
                        <tr
                          key={item.id}
                          className={`bg-white dark:bg-neutral-950 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900 ${
                            isUncovered ? 'text-neutral-400 dark:text-neutral-500' : ''
                          }`}
                        >
                          <td
                            className={`p-3 font-bold whitespace-nowrap ${
                              !isUncovered ? 'border-l-2 border-l-[#C9A227]' : ''
                            }`}
                          >
                            <span
                              className={`inline-block px-2.5 py-1 rounded-lg font-bold shadow-sm ${
                                isUncovered
                                  ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                                  : 'bg-black dark:bg-white text-white dark:text-black'
                              }`}
                            >
                              P{item.periodNumber}
                            </span>
                            {!isUncovered && (
                              <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                                Cover
                              </span>
                            )}
                          </td>
                          <td
                            className={`p-3 font-mono tabular-nums whitespace-nowrap ${
                              isUncovered
                                ? 'text-neutral-400 dark:text-neutral-500'
                                : 'text-neutral-700 dark:text-neutral-300'
                            }`}
                          >
                            {item.startTime} - {item.endTime}
                          </td>
                          <td
                            className={`p-3 font-semibold ${
                              isUncovered
                                ? 'text-neutral-400 dark:text-neutral-500'
                                : 'text-black dark:text-white'
                            }`}
                          >
                            {item.subjectName}
                          </td>
                          <td
                            className={`p-3 font-medium whitespace-nowrap ${
                              isUncovered
                                ? 'text-neutral-400 dark:text-neutral-500'
                                : 'text-neutral-700 dark:text-neutral-300'
                            }`}
                          >
                            {item.absentTeacherName}
                          </td>
                          <td className="p-3 font-bold">
                            {isUncovered ? (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 text-[11px] font-bold">
                                Uncovered
                              </span>
                            ) : (
                              <span className="text-black dark:text-white whitespace-nowrap">
                                {item.coveringTeacherName}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
