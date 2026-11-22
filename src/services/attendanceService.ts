import { getSupabase, runWithSupabaseRetry } from '../lib/supabase';
import { AttendanceRecord, AttendanceStatus } from '../types';
import { getTodayDateString } from '../utils/dateUtils';
import { getStoredSession } from './authService';

function mapRecord(row: any): AttendanceRecord {
  return {
    id: row.out_id,
    school_id: row.out_school_id,
    teacher_id: row.out_teacher_id,
    date: row.out_date,
    status: row.out_status,
    source: row.out_source,
    reply_at: row.out_reply_at,
    created_at: row.out_reply_at || row.out_updated_at,
    updated_at: row.out_updated_at,
  };
}

/**
 * Fetch today's attendance record for the logged-in teacher using secure RPC get_my_attendance
 */
export async function getTodayAttendance(params: {
  schoolId: string;
  teacherId: string;
  timezone: string;
}): Promise<{
  record: AttendanceRecord | null;
  todayDate: string;
  error?: string;
}> {
  const todayDate = getTodayDateString(params.timezone);
  const session = getStoredSession();
  const pin = session?.pin || '';
  const supabase = getSupabase();

  if (!supabase) {
    return {
      record: null,
      todayDate,
      error: 'The service is not ready. Please try again later.',
    };
  }

  try {
    const { data, error } = await runWithSupabaseRetry(() =>
      supabase.rpc('get_my_attendance', {
        p_teacher_id: params.teacherId,
        p_pin: pin,
        p_limit: 60,
      })
    );

    if (error) {
      console.warn('Could not fetch today attendance:', error);
      return { record: null, todayDate, error: "Could not load today's attendance. Please try again." };
    }

    const rows = (data as any[]) || [];
    const matched = rows.find((r) => r.out_date === todayDate);

    return {
      record: matched ? mapRecord(matched) : null,
      todayDate,
    };
  } catch (err: any) {
    return {
      record: null,
      todayDate,
      error: "Could not load today's attendance. Please try again.",
    };
  }
}

/**
 * Submit attendance for today:
 * Calls Supabase RPC: submit_today_attendance(p_phone, p_pin, p_status)
 */
export async function submitTodayAttendance(params: {
  schoolId: string;
  teacherId: string;
  timezone: string;
  cutoffTime: string;
  status: 'present' | 'absent' | 'late';
}): Promise<{
  success: boolean;
  record?: AttendanceRecord;
  error?: string;
  locked?: boolean;
}> {
  const session = getStoredSession();
  const phone = session?.whatsappNumber;
  const pin = session?.pin;

  if (!phone || !pin) {
    return {
      success: false,
      error: 'Please sign in again to submit attendance.',
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      error: 'The service is not ready. Please try again later.',
    };
  }

  try {
    const { data, error } = await runWithSupabaseRetry(() =>
      supabase.rpc('submit_today_attendance', {
        p_phone: phone,
        p_pin: pin,
        p_status: params.status,
      })
    );

    if (error) {
      console.warn('Could not submit attendance:', error);
      return {
        success: false,
        error: 'Could not save your attendance. Please try again.',
      };
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return {
        success: false,
        error: 'Please check code / phone / PIN.',
      };
    }

    const resRow = data[0] as {
      out_success: boolean;
      out_reason: string;
      out_teacher_id: string;
      out_school_id: string;
      out_saved_date: string;
      out_saved_status: string;
    };

    if (!resRow.out_success) {
      const reason = resRow.out_reason;
      if (reason === 'invalid_credentials') {
        return { success: false, error: 'Please check code / phone / PIN.' };
      }
      if (reason === 'after_cutoff') {
        return {
          success: false,
          locked: true,
          error: `Attendance submission locked. Cutoff was passed.`,
        };
      }
      if (reason === 'locked') {
        return {
          success: false,
          locked: true,
          error: 'Account is locked due to incorrect PIN attempts.',
        };
      }
      if (reason === 'invalid_status') {
        return { success: false, error: 'Invalid attendance status.' };
      }
      return { success: false, error: reason || 'Could not save attendance.' };
    }

    const attendanceRecord: AttendanceRecord = {
      id: `${resRow.out_saved_date}-${resRow.out_teacher_id}`,
      school_id: resRow.out_school_id,
      teacher_id: resRow.out_teacher_id,
      date: resRow.out_saved_date,
      status: (resRow.out_saved_status as AttendanceStatus) || params.status,
      source: 'app',
      updated_at: new Date().toISOString(),
    };

    return {
      success: true,
      record: attendanceRecord,
    };
  } catch (err: any) {
    console.warn('Error submitting attendance:', err);
    return {
      success: false,
      error: 'Could not save your attendance. Please try again.',
    };
  }
}

/**
 * Fetch past attendance days for that teacher using secure RPC get_my_attendance
 */
export async function getTeacherAttendanceHistory(params: {
  schoolId: string;
  teacherId: string;
  limit?: number;
}): Promise<{
  records: AttendanceRecord[];
  error?: string;
}> {
  const session = getStoredSession();
  const pin = session?.pin || '';
  const supabase = getSupabase();
  if (!supabase) {
    return { records: [], error: 'The service is not ready. Please try again later.' };
  }

  try {
    const { data, error } = await runWithSupabaseRetry(() =>
      supabase.rpc('get_my_attendance', {
        p_teacher_id: params.teacherId,
        p_pin: pin,
        p_limit: params.limit || 60,
      })
    );

    if (error) {
      console.warn('Could not fetch attendance history:', error);
      return { records: [], error: "Could not load your history. Please try again." };
    }

    const rows = (data as any[]) || [];
    const records = rows.map(mapRecord);

    return { records };
  } catch (err: any) {
    return { records: [], error: "Could not load your history. Please try again." };
  }
}
