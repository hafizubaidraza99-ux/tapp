import { getSupabase, runWithSupabaseRetry } from '../lib/supabase';
import { getTodayDateString, getDayOfWeekInTimezone } from '../utils/dateUtils';
import { getStoredSession } from './authService';

export interface DisplayPeriodItem {
  id: string;
  periodNumber: number;
  periodName?: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  className: string;
  isCovering: boolean; // teacher is covering this period for someone else
  isCovered: boolean;  // someone else is covering this period for the teacher
  originalTeacherName?: string;
  coveringTeacherName?: string;
  notes?: string;
}

export interface ClassTimetableItem {
  periodNumber: number;
  periodName?: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName: string;
  isCovered: boolean;
  coveringTeacherName?: string;
}

/**
 * Fetch today's timetable for the current teacher using secure RPC get_my_timetable.
 */
export async function getTeacherTodayTimetable(params: {
  schoolId: string;
  teacherId: string;
  timezone: string;
}): Promise<{
  periods: DisplayPeriodItem[];
  todayDate: string;
  dayName: string;
  error?: string;
}> {
  const todayDate = getTodayDateString(params.timezone);
  const dayOfWeek = getDayOfWeekInTimezone(params.timezone);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[dayOfWeek] || 'Today';

  const session = getStoredSession();
  const pin = session?.pin || '';

  const supabase = getSupabase();
  if (!supabase) {
    return { periods: [], todayDate, dayName, error: 'The service is not ready. Please try again later.' };
  }

  try {
    // Call get_my_timetable RPC (no direct queries to periods, subjects, or classes)
    const { data: rpcData, error: rpcError } = await runWithSupabaseRetry(() =>
      supabase.rpc('get_my_timetable', {
        p_teacher_id: params.teacherId,
        p_pin: pin,
        p_date: todayDate,
      })
    );

    if (rpcError) {
      console.warn('Could not query get_my_timetable:', rpcError.message);
      return { periods: [], todayDate, dayName, error: "Could not load your timetable. Please try again." };
    }

    const rows = (rpcData as any[]) || [];
    const resultPeriods: DisplayPeriodItem[] = [];

    rows.forEach((row: any) => {
      const isCovering = row.out_cover_status === 'covered' && row.out_assigned_teacher_id === params.teacherId;
      const isCovered = row.out_cover_status === 'covered' && row.out_original_teacher_id === params.teacherId && row.out_assigned_teacher_id !== params.teacherId;
      const originalTeacherName = row.out_original_teacher_name || undefined;
      const coveringTeacherName = isCovered ? row.out_assigned_teacher_name : undefined;

      const startTime = row.out_period_start ? String(row.out_period_start).slice(0, 5) : '--:--';
      const endTime = row.out_period_end ? String(row.out_period_end).slice(0, 5) : '--:--';

      resultPeriods.push({
        id: row.out_id || `${row.out_date}-${row.out_period_number}`,
        periodNumber: row.out_period_number || 1,
        periodName: undefined,
        startTime,
        endTime,
        subjectName: row.out_subject_name || 'Class Period',
        className: row.out_class_name || 'Assigned Class',
        isCovering,
        isCovered,
        originalTeacherName,
        coveringTeacherName,
      });
    });

    // Sort by period number then start time
    resultPeriods.sort((a, b) => a.periodNumber - b.periodNumber || a.startTime.localeCompare(b.startTime));

    return {
      periods: resultPeriods,
      todayDate,
      dayName,
    };
  } catch (err: any) {
    console.error('Error in getTeacherTodayTimetable:', err);
    return {
      periods: [],
      todayDate,
      dayName,
      error: err?.message || 'Failed to load timetable.',
    };
  }
}

/**
 * For Head Teachers: fetch full class timetable for today
 */
export async function getClassTodayTimetable(params: {
  schoolId: string;
  classId: string;
  timezone: string;
}): Promise<{
  className: string;
  periods: ClassTimetableItem[];
  error?: string;
}> {
  const todayDate = getTodayDateString(params.timezone);
  const dayOfWeek = getDayOfWeekInTimezone(params.timezone);

  const supabase = getSupabase();
  if (!supabase) {
    return { className: '', periods: [], error: 'The service is not ready. Please try again later.' };
  }

  try {
    const { data: teachersData } = await supabase
      .from('teachers')
      .select('id, name')
      .eq('school_id', params.schoolId);
    const teacherMap = new Map<string, string>();
    (teachersData || []).forEach((t: { id: string; name: string }) => teacherMap.set(t.id, t.name));

    const { data: classEntries, error: entryError } = await supabase
      .from('timetable_entries')
      .select('*')
      .eq('school_id', params.schoolId)
      .eq('class_id', params.classId)
      .eq('weekday', dayOfWeek);

    if (entryError) {
      return { className: 'Class', periods: [], error: "Could not load your timetable. Please try again." };
    }

    const periods: ClassTimetableItem[] = (classEntries || []).map((entry: any) => {
      const teacherName = teacherMap.get(entry.teacher_id) || 'Assigned Teacher';

      return {
        periodNumber: entry.period_number || 1,
        periodName: undefined,
        startTime: '--:--',
        endTime: '--:--',
        subjectName: 'Subject',
        teacherName,
        isCovered: false,
        coveringTeacherName: undefined,
      };
    });

    periods.sort((a, b) => a.periodNumber - b.periodNumber);

    return {
      className: 'Class',
      periods,
    };
  } catch (err: any) {
    return {
      className: '',
      periods: [],
      error: err?.message || 'Error fetching class timetable.',
    };
  }
}
