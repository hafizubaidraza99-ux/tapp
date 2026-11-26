import { gatewayRpc } from '../lib/supabase';
import { getStoredSession } from './authService';

export type HalfLeaveStatus = 'pending' | 'applied' | 'approved' | 'rejected' | 'cancelled' | null;

export interface HalfLeaveInfo {
  status: HalfLeaveStatus;
  fromPeriod: number | null;
  requiresApproval: boolean;
  currentFromPeriod: number | null;
  dayOver: boolean;
  periodsLeft: number;
  canCancel: boolean;
  inSchoolTime: boolean;
}

export interface HalfLeavePeriodItem {
  periodNumber: number;
  startTime: string;
  endTime: string;
  className: string;
  subjectName: string;
  coveringForName: string | null;
}

export type ApplyHalfLeaveResultCode =
  | 'applied'
  | 'pending'
  | 'not_present'
  | 'already'
  | 'no_timetable'
  | 'day_over'
  | 'nothing_left'
  | 'too_early'
  | 'invalid';

export type CancelHalfLeaveResultCode = 'cancelled' | 'too_late' | 'none' | 'invalid';

function extractScalarText(data: unknown, fallback: string): string {
  if (typeof data === 'string') {
    return data.trim().toLowerCase();
  }
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    if (typeof first === 'string') {
      return first.trim().toLowerCase();
    }
    if (first && typeof first === 'object') {
      const vals = Object.values(first);
      if (vals.length > 0 && typeof vals[0] === 'string') {
        return vals[0].trim().toLowerCase();
      }
    }
  }
  return fallback;
}

export async function getMyHalfLeave(): Promise<{
  info: HalfLeaveInfo | null;
  error?: string;
}> {
  const session = getStoredSession();
  const phone = session?.whatsappNumber || '';
  const pin = session?.pin || '';

  if (!phone || !pin) {
    return { info: null, error: 'Please sign in again.' };
  }

  try {
    const { data, error } = await gatewayRpc('get_my_half_leave', {
      p_phone: phone,
      p_pin: pin,
    });

    if (error) {
      console.warn('Could not load half leave status:', error);
      return { info: null, error: 'Could not check half leave right now. Please try again.' };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return {
        info: {
          status: null,
          fromPeriod: null,
          requiresApproval: false,
          currentFromPeriod: null,
          dayOver: false,
          periodsLeft: 0,
          canCancel: false,
          inSchoolTime: false,
        },
      };
    }

    return {
      info: {
        status: (row.out_status as HalfLeaveStatus) ?? null,
        fromPeriod: row.out_from_period ?? null,
        requiresApproval: Boolean(row.out_requires_approval),
        currentFromPeriod: row.out_current_from_period ?? null,
        dayOver: Boolean(row.out_day_over),
        periodsLeft: Number(row.out_periods_left ?? 0),
        canCancel: Boolean(row.out_can_cancel),
        inSchoolTime: Boolean(row.out_in_school_time),
      },
    };
  } catch (err) {
    console.warn('Error loading half leave status:', err);
    return { info: null, error: 'Could not check half leave right now. Please try again.' };
  }
}

export async function getMyHalfLeavePeriods(): Promise<{
  periods: HalfLeavePeriodItem[];
  error?: string;
}> {
  const session = getStoredSession();
  const phone = session?.whatsappNumber || '';
  const pin = session?.pin || '';

  if (!phone || !pin) {
    return { periods: [], error: 'Please sign in again.' };
  }

  try {
    const { data, error } = await gatewayRpc('get_my_half_leave_periods', {
      p_phone: phone,
      p_pin: pin,
    });

    if (error) {
      console.warn('Could not load half leave periods:', error);
      return { periods: [], error: 'Could not load your remaining periods. Please try again.' };
    }

    const rows = (data as any[]) || [];
    const periods: HalfLeavePeriodItem[] = rows.map((row: any) => ({
      periodNumber: Number(row.out_period_number ?? 1),
      startTime: row.out_period_start ? String(row.out_period_start).slice(0, 5) : '--:--',
      endTime: row.out_period_end ? String(row.out_period_end).slice(0, 5) : '--:--',
      className: row.out_class_name || 'Assigned Class',
      subjectName: row.out_subject_name || 'Class Period',
      coveringForName: row.out_covering_for_name || null,
    }));

    periods.sort((a, b) => a.periodNumber - b.periodNumber || a.startTime.localeCompare(b.startTime));

    return { periods };
  } catch (err) {
    console.warn('Error loading half leave periods:', err);
    return { periods: [], error: 'Could not load your remaining periods. Please try again.' };
  }
}

export async function applyMyHalfLeave(): Promise<ApplyHalfLeaveResultCode> {
  const session = getStoredSession();
  const phone = session?.whatsappNumber || '';
  const pin = session?.pin || '';

  if (!phone || !pin) {
    return 'invalid';
  }

  try {
    const { data, error } = await gatewayRpc('apply_my_half_leave', {
      p_phone: phone,
      p_pin: pin,
    });

    if (error) {
      console.warn('Could not apply half leave:', error);
      return 'invalid';
    }

    const result = extractScalarText(data, 'invalid');
    const allowed: ApplyHalfLeaveResultCode[] = [
      'applied',
      'pending',
      'not_present',
      'already',
      'no_timetable',
      'day_over',
      'nothing_left',
      'too_early',
      'invalid',
    ];
    return allowed.includes(result as ApplyHalfLeaveResultCode)
      ? (result as ApplyHalfLeaveResultCode)
      : 'invalid';
  } catch (err) {
    console.warn('Error applying half leave:', err);
    return 'invalid';
  }
}

export async function cancelMyHalfLeave(): Promise<CancelHalfLeaveResultCode> {
  const session = getStoredSession();
  const phone = session?.whatsappNumber || '';
  const pin = session?.pin || '';

  if (!phone || !pin) {
    return 'invalid';
  }

  try {
    const { data, error } = await gatewayRpc('cancel_my_half_leave', {
      p_phone: phone,
      p_pin: pin,
    });

    if (error) {
      console.warn('Could not cancel half leave:', error);
      return 'invalid';
    }

    const result = extractScalarText(data, 'invalid');
    const allowed: CancelHalfLeaveResultCode[] = ['cancelled', 'too_late', 'none', 'invalid'];
    return allowed.includes(result as CancelHalfLeaveResultCode)
      ? (result as CancelHalfLeaveResultCode)
      : 'invalid';
  } catch (err) {
    console.warn('Error cancelling half leave:', err);
    return 'invalid';
  }
}
