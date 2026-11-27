import { gatewayRpc } from '../lib/supabase';
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
  coverStatus?: string;
}

export interface DefaultPeriodItem {
  id: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  className: string;
}

export interface ArrangementPeriodItem {
  id: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  className: string;
  coveringForName: string;
}

export interface ClassTimetableDetailItem {
  id: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName: string;
  className: string;
}

export interface ClassArrangementItem {
  id: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  className: string;
  absentTeacherName: string;
  coveringTeacherName: string;
  coverStatus: string;
}

export interface PaperDutyItem {
  id: string;
  className: string;
  periodNumber: number;
}

/**
 * Fetch default timetable for the current teacher using secure RPC get_my_default_timetable (phone + PIN)
 */
export async function getTeacherDefaultTimetable(params: {
  schoolId: string;
  teacherId: string;
  timezone: string;
}): Promise<{
  periods: DefaultPeriodItem[];
  todayDate: string;
  dayName: string;
  error?: string;
}> {
  const todayDate = getTodayDateString(params.timezone);
  const dayOfWeek = getDayOfWeekInTimezone(params.timezone);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[dayOfWeek] || 'Today';

  const session = getStoredSession();
  const phone = session?.whatsappNumber || '';
  const pin = session?.pin || '';

  if (!phone || !pin) {
    return { periods: [], todayDate, dayName, error: 'Please sign in again to view timetable.' };
  }

  try {
    const { data: rpcData, error: rpcError } = await gatewayRpc('get_my_default_timetable', {
      p_phone: phone,
      p_pin: pin,
    });

    if (rpcError) {
      console.warn('Could not query get_my_default_timetable:', rpcError.message);
      return { periods: [], todayDate, dayName, error: "Could not load your timetable. Please try again." };
    }

    const rows = (rpcData as any[]) || [];
    const resultPeriods: DefaultPeriodItem[] = [];

    rows.forEach((row: any) => {
      const startTime = row.out_period_start ? String(row.out_period_start).slice(0, 5) : '--:--';
      const endTime = row.out_period_end ? String(row.out_period_end).slice(0, 5) : '--:--';

      resultPeriods.push({
        id: row.out_id || `${row.out_period_number}`,
        periodNumber: row.out_period_number || 1,
        startTime,
        endTime,
        subjectName: row.out_subject_name || 'Class Period',
        className: row.out_class_name || 'Assigned Class',
      });
    });

    resultPeriods.sort((a, b) => a.periodNumber - b.periodNumber || a.startTime.localeCompare(b.startTime));

    return { periods: resultPeriods, todayDate, dayName };
  } catch (err: any) {
    console.warn('Error in getTeacherDefaultTimetable:', err);
    return { periods: [], todayDate, dayName, error: err?.message || 'Failed to load timetable.' };
  }
}

/**
 * Fetch today's arrangement (cover) periods for the current teacher using secure RPC get_my_arrangements (phone + PIN)
 */
export async function getTeacherArrangements(params: {
  schoolId: string;
  teacherId: string;
  timezone: string;
}): Promise<{
  arrangements: ArrangementPeriodItem[];
  error?: string;
}> {
  const session = getStoredSession();
  const phone = session?.whatsappNumber || '';
  const pin = session?.pin || '';

  if (!phone || !pin) {
    return { arrangements: [], error: 'Please sign in again to view arrangements.' };
  }

  try {
    const { data: rpcData, error: rpcError } = await gatewayRpc('get_my_arrangements', {
      p_phone: phone,
      p_pin: pin,
    });

    if (rpcError) {
      console.warn('Could not query get_my_arrangements:', rpcError.message);
      return { arrangements: [], error: "Could not load arrangement periods. Please try again." };
    }

    const rows = (rpcData as any[]) || [];
    const resultArrangements: ArrangementPeriodItem[] = [];

    rows.forEach((row: any) => {
      const startTime = row.out_period_start ? String(row.out_period_start).slice(0, 5) : '--:--';
      const endTime = row.out_period_end ? String(row.out_period_end).slice(0, 5) : '--:--';
      const coveringForName = row.out_original_teacher_name || row.out_teacher_name || row.out_original_teacher || 'Absent Teacher';

      resultArrangements.push({
        id: row.out_id || `${row.out_period_number}`,
        periodNumber: row.out_period_number || 1,
        startTime,
        endTime,
        subjectName: row.out_subject_name || 'Class Period',
        className: row.out_class_name || 'Assigned Class',
        coveringForName,
      });
    });

    resultArrangements.sort((a, b) => a.periodNumber - b.periodNumber || a.startTime.localeCompare(b.startTime));

    return { arrangements: resultArrangements };
  } catch (err: any) {
    console.warn('Error in getTeacherArrangements:', err);
    return { arrangements: [], error: err?.message || 'Failed to load arrangements.' };
  }
}

/**
 * Fetch arrangement (cover) periods for a specific date using secure RPC get_my_arrangements_by_date (phone + PIN + date)
 */
export async function getTeacherArrangementsByDate(params: {
  schoolId: string;
  teacherId: string;
  timezone: string;
  date: string;
}): Promise<{
  arrangements: ArrangementPeriodItem[];
  error?: string;
}> {
  const session = getStoredSession();
  const phone = session?.whatsappNumber || '';
  const pin = session?.pin || '';
  const targetDate = params.date || getTodayDateString(params.timezone);

  if (!phone || !pin) {
    return { arrangements: [], error: 'Please sign in again to view arrangement periods.' };
  }

  try {
    const { data: rpcData, error: rpcError } = await gatewayRpc('get_my_arrangements_by_date', {
      p_phone: phone,
      p_pin: pin,
      p_date: targetDate,
    });

    if (rpcError) {
      console.warn('Could not query get_my_arrangements_by_date:', rpcError.message);
      return { arrangements: [], error: 'Could not load arrangement periods. Please try again.' };
    }

    const rows = (rpcData as any[]) || [];
    const resultArrangements: ArrangementPeriodItem[] = [];

    rows.forEach((row: any) => {
      const startTime = row.out_period_start ? String(row.out_period_start).slice(0, 5) : '--:--';
      const endTime = row.out_period_end ? String(row.out_period_end).slice(0, 5) : '--:--';
      const coveringForName =
        row.out_original_teacher_name || row.out_teacher_name || row.out_original_teacher || 'Absent Teacher';

      resultArrangements.push({
        id: row.out_id || `${targetDate}-${row.out_period_number}`,
        periodNumber: row.out_period_number || 1,
        startTime,
        endTime,
        subjectName: row.out_subject_name || 'Class Period',
        className: row.out_class_name || 'Assigned Class',
        coveringForName,
      });
    });

    resultArrangements.sort((a, b) => a.periodNumber - b.periodNumber || a.startTime.localeCompare(b.startTime));

    return { arrangements: resultArrangements };
  } catch (err: any) {
    console.warn('Error in getTeacherArrangementsByDate:', err);
    return { arrangements: [], error: 'Could not load arrangement periods. Please try again.' };
  }
}

/**
 * Fetch head teacher's class timetable for today using secure RPC get_my_class_timetable (phone + PIN)
 */
export async function getTeacherClassTimetable(params: {
  schoolId: string;
  teacherId: string;
  timezone: string;
}): Promise<{
  className: string;
  periods: ClassTimetableDetailItem[];
  error?: string;
}> {
  const session = getStoredSession();
  const phone = session?.whatsappNumber || '';
  const pin = session?.pin || '';

  if (!phone || !pin) {
    return { className: '', periods: [], error: 'Please sign in again to view class timetable.' };
  }

  try {
    const { data: rpcData, error: rpcError } = await gatewayRpc('get_my_class_timetable', {
      p_phone: phone,
      p_pin: pin,
    });

    if (rpcError) {
      console.warn('Could not query get_my_class_timetable:', rpcError.message);
      return { className: '', periods: [], error: "Could not load class timetable. Please try again." };
    }

    const rows = (rpcData as any[]) || [];
    let className = 'Class Timetable';
    const resultPeriods: ClassTimetableDetailItem[] = [];

    rows.forEach((row: any) => {
      if (row.out_class_name) {
        className = row.out_class_name;
      }
      const startTime = row.out_period_start ? String(row.out_period_start).slice(0, 5) : '--:--';
      const endTime = row.out_period_end ? String(row.out_period_end).slice(0, 5) : '--:--';

      resultPeriods.push({
        id: row.out_id || `${row.out_period_number}`,
        periodNumber: row.out_period_number || 1,
        startTime,
        endTime,
        subjectName: row.out_subject_name || 'Subject',
        teacherName: row.out_teacher_name || 'Teacher',
        className: row.out_class_name || className,
      });
    });

    resultPeriods.sort((a, b) => a.periodNumber - b.periodNumber || a.startTime.localeCompare(b.startTime));

    return { className, periods: resultPeriods };
  } catch (err: any) {
    console.warn('Error in getTeacherClassTimetable:', err);
    return { className: '', periods: [], error: err?.message || 'Failed to load class timetable.' };
  }
}

/**
 * Fetch head teacher's class arrangement periods for today using secure RPC get_my_class_arrangements (phone + PIN)
 */
export async function getTeacherClassArrangements(params: {
  schoolId: string;
  teacherId: string;
  timezone: string;
}): Promise<{
  arrangements: ClassArrangementItem[];
  error?: string;
}> {
  const session = getStoredSession();
  const phone = session?.whatsappNumber || '';
  const pin = session?.pin || '';

  if (!phone || !pin) {
    return { arrangements: [], error: 'Please sign in again to view class arrangements.' };
  }

  try {
    const { data: rpcData, error: rpcError } = await gatewayRpc('get_my_class_arrangements', {
      p_phone: phone,
      p_pin: pin,
    });

    if (rpcError) {
      console.warn('Could not query get_my_class_arrangements:', rpcError.message);
      return { arrangements: [], error: "Could not load class arrangements. Please try again." };
    }

    const rows = (rpcData as any[]) || [];
    const resultArrangements: ClassArrangementItem[] = [];

    rows.forEach((row: any) => {
      const startTime = row.out_period_start ? String(row.out_period_start).slice(0, 5) : '--:--';
      const endTime = row.out_period_end ? String(row.out_period_end).slice(0, 5) : '--:--';
      const coverStatus = row.out_cover_status || 'uncovered';
      const coveringTeacherName = coverStatus === 'covered' && row.out_assigned_teacher_name ? row.out_assigned_teacher_name : 'Uncovered';

      resultArrangements.push({
        id: row.out_id || `${row.out_period_number}`,
        periodNumber: row.out_period_number || 1,
        startTime,
        endTime,
        subjectName: row.out_subject_name || 'Subject',
        className: row.out_class_name || 'Class',
        absentTeacherName: row.out_original_teacher_name || 'Teacher',
        coveringTeacherName,
        coverStatus,
      });
    });

    resultArrangements.sort((a, b) => a.periodNumber - b.periodNumber || a.startTime.localeCompare(b.startTime));

    return { arrangements: resultArrangements };
  } catch (err: any) {
    console.warn('Error in getTeacherClassArrangements:', err);
    return { arrangements: [], error: err?.message || 'Failed to load class arrangements.' };
  }
}

/**
 * Fetch head teacher's class arrangement periods for a specific date using secure RPC get_my_class_arrangements_by_date (phone + PIN + date)
 */
export async function getClassArrangementsByDate(date: string): Promise<{
  arrangements: ClassArrangementItem[];
  error?: string;
}> {
  const session = getStoredSession();
  const phone = session?.whatsappNumber || '';
  const pin = session?.pin || '';
  const targetDate = date || getTodayDateString(session?.schoolTimezone || 'UTC');

  if (!phone || !pin) {
    return { arrangements: [], error: 'Please sign in again to view class arrangements.' };
  }

  try {
    const { data: rpcData, error: rpcError } = await gatewayRpc('get_my_class_arrangements_by_date', {
      p_phone: phone,
      p_pin: pin,
      p_date: targetDate,
    });

    if (rpcError) {
      console.warn('Could not query get_my_class_arrangements_by_date:', rpcError.message);
      return { arrangements: [], error: 'Could not load class arrangements. Please try again.' };
    }

    const rows = (rpcData as any[]) || [];
    const resultArrangements: ClassArrangementItem[] = [];

    rows.forEach((row: any) => {
      const startTime = row.out_period_start ? String(row.out_period_start).slice(0, 5) : '--:--';
      const endTime = row.out_period_end ? String(row.out_period_end).slice(0, 5) : '--:--';
      const coverStatus = row.out_cover_status || 'uncovered';
      const coveringTeacherName =
        coverStatus === 'covered' && row.out_assigned_teacher_name
          ? row.out_assigned_teacher_name
          : 'Uncovered';

      resultArrangements.push({
        id: row.out_id || `${targetDate}-${row.out_period_number}`,
        periodNumber: row.out_period_number || 1,
        startTime,
        endTime,
        subjectName: row.out_subject_name || 'Subject',
        className: row.out_class_name || 'Class',
        absentTeacherName: row.out_original_teacher_name || 'Teacher',
        coveringTeacherName,
        coverStatus,
      });
    });

    resultArrangements.sort((a, b) => a.periodNumber - b.periodNumber || a.startTime.localeCompare(b.startTime));

    return { arrangements: resultArrangements };
  } catch (err: any) {
    console.warn('Error in getClassArrangementsByDate:', err);
    return { arrangements: [], error: 'Could not load class arrangements. Please try again.' };
  }
}

/**
 * Fetch today's timetable for the current teacher using secure RPC get_my_timetable.
 * (Retained for backward compatibility if needed)
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

  try {
    const { data: rpcData, error: rpcError } = await gatewayRpc('get_my_timetable', {
      p_teacher_id: params.teacherId,
      p_pin: pin,
      p_date: todayDate,
    });

    if (rpcError) {
      return { periods: [], todayDate, dayName, error: "Could not load your timetable. Please try again." };
    }

    const rows = (rpcData as any[]) || [];
    const resultPeriods: DisplayPeriodItem[] = [];

    rows.forEach((row: any) => {
      const coverStatus = row.out_cover_status || 'regular';
      const isCovering = coverStatus === 'covered' && row.out_assigned_teacher_id === params.teacherId;
      const isCovered = coverStatus === 'covered' && row.out_original_teacher_id === params.teacherId && row.out_assigned_teacher_id !== params.teacherId;
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
        coverStatus,
      });
    });

    resultPeriods.sort((a, b) => a.periodNumber - b.periodNumber || a.startTime.localeCompare(b.startTime));

    return {
      periods: resultPeriods,
      todayDate,
      dayName,
    };
  } catch (err: any) {
    return {
      periods: [],
      todayDate,
      dayName,
      error: err?.message || 'Failed to load timetable.',
    };
  }
}

/**
 * Fetch today's paper duty assignments for the current teacher using secure RPC get_my_paper_duty (phone + PIN)
 */
export async function getTeacherPaperDuty(): Promise<{
  duties: PaperDutyItem[];
  error?: string;
}> {
  const session = getStoredSession();
  const phone = session?.whatsappNumber || '';
  const pin = session?.pin || '';

  if (!phone || !pin) {
    return { duties: [] };
  }

  try {
    const { data: rpcData, error: rpcError } = await gatewayRpc('get_my_paper_duty', {
      p_phone: phone,
      p_pin: pin,
    });

    if (rpcError) {
      console.warn('Could not query get_my_paper_duty:', rpcError.message);
      return { duties: [], error: 'Could not load paper duty.' };
    }

    const rows = Array.isArray(rpcData) ? rpcData : [];
    const duties: PaperDutyItem[] = rows.map((row: any, idx: number) => ({
      id: `${row.out_class_name || 'class'}-${row.out_period_number ?? idx}-${idx}`,
      className: row.out_class_name || 'Class',
      periodNumber: Number(row.out_period_number ?? 1),
    }));

    duties.sort((a, b) => a.periodNumber - b.periodNumber || a.className.localeCompare(b.className));

    return { duties };
  } catch (err: any) {
    console.warn('Error in getTeacherPaperDuty:', err);
    return { duties: [], error: 'Could not load paper duty.' };
  }
}
