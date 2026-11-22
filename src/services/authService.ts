import { getSupabase } from '../lib/supabase';
import { TeacherSession } from '../types';
import { hashActivationCode } from '../utils/cryptoUtils';

const SESSION_STORAGE_KEY = 'teacher_app_session';
const UNIFIED_AUTH_ERROR = 'Please check code / phone / PIN.';

/**
 * Normalizes phone numbers for matching (removes spaces, dashes, parentheses, leading plus)
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\+]/g, '').trim();
}

/**
 * Join Flow:
 * Teacher enters:
 * 1. activation code (from principal)
 * 2. phone (entered by teacher)
 * 3. 4-digit PIN.
 *
 * Calls Supabase RPC: redeem_teacher_activation_code(p_code_hash, p_phone, p_pin)
 * - Hashes activation code using SHA256("act_code_v1:" + normalised code)
 * - Sends plain phone and plain PIN as RPC arguments (SQL hashes PIN with salted SHA-256)
 * - Returns 0 rows on any failure (unified error message)
 * - Never queries teachers or teacher_activation_codes tables directly
 */
export async function joinTeacherApp(params: {
  phone: string;
  pin: string;
  activationCode?: string;
}): Promise<{
  success: boolean;
  session?: TeacherSession;
  error?: string;
  activationCodeNotice?: string;
}> {
  if (!params.activationCode || !params.activationCode.trim()) {
    return { success: false, error: UNIFIED_AUTH_ERROR };
  }

  const phone = params.phone.trim();
  const pin = params.pin.trim();

  if (!phone || !/^\d{4}$/.test(pin)) {
    return { success: false, error: UNIFIED_AUTH_ERROR };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      error: 'The service is not ready. Please try again later.',
    };
  }

  try {
    // 1. Hash the activation code using SHA256("act_code_v1:" + normalised code)
    const codeHash = await hashActivationCode(params.activationCode);

    // 2. Call SECURITY DEFINER RPC
    const { data, error } = await supabase.rpc('redeem_teacher_activation_code', {
      p_code_hash: codeHash,
      p_phone: phone,
      p_pin: pin,
    });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      // Must not reveal whether phone, code, or PIN was wrong
      return { success: false, error: UNIFIED_AUTH_ERROR };
    }

    const row = data[0] as {
      teacher_id: string;
      school_id: string;
      teacher_name: string;
      school_name?: string;
      school_timezone?: string;
    };

    if (!row.teacher_id || !row.school_id) {
      return { success: false, error: UNIFIED_AUTH_ERROR };
    }

    const schoolName = row.school_name || 'School';
    const schoolTimezone = row.school_timezone || 'UTC';

    const session: TeacherSession = {
      teacherId: row.teacher_id,
      teacherName: row.teacher_name || 'Teacher',
      whatsappNumber: phone,
      schoolId: row.school_id,
      schoolName,
      schoolTimezone,
      isHeadTeacher: false,
      classId: undefined,
      loginTime: new Date().toISOString(),
      pin,
      workingDays: (row as any).working_days || 'Mon-Fri',
    };

    saveSession(session);
    saveRememberedTeacher(session);

    return {
      success: true,
      session,
    };
  } catch (err: any) {
    return {
      success: false,
      error: UNIFIED_AUTH_ERROR,
    };
  }
}

/**
 * PIN Login:
 * After Join, login is phone + PIN only.
 * Calls Supabase RPC: verify_teacher_pin(p_phone, p_pin)
 * - Returns 0 rows on any failure (unified error message)
 * - Never queries teachers table directly
 */
export async function loginWithPin(phone: string, pin: string): Promise<{
  success: boolean;
  session?: TeacherSession;
  error?: string;
}> {
  const cleanedPhone = phone.trim();
  const cleanedPin = pin.trim();

  if (!cleanedPhone || !/^\d{4}$/.test(cleanedPin)) {
    return { success: false, error: UNIFIED_AUTH_ERROR };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      error: 'The service is not ready. Please try again later.',
    };
  }

  try {
    const { data, error } = await supabase.rpc('verify_teacher_pin', {
      p_phone: cleanedPhone,
      p_pin: cleanedPin,
    });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return { success: false, error: UNIFIED_AUTH_ERROR };
    }

    const row = data[0] as {
      teacher_id: string;
      school_id: string;
      teacher_name: string;
      school_name?: string;
      school_timezone?: string;
    };

    if (!row.teacher_id || !row.school_id) {
      return { success: false, error: UNIFIED_AUTH_ERROR };
    }

    const schoolName = row.school_name || 'School';
    const schoolTimezone = row.school_timezone || 'UTC';

    const session: TeacherSession = {
      teacherId: row.teacher_id,
      teacherName: row.teacher_name || 'Teacher',
      whatsappNumber: cleanedPhone,
      schoolId: row.school_id,
      schoolName,
      schoolTimezone,
      isHeadTeacher: false,
      classId: undefined,
      loginTime: new Date().toISOString(),
      pin: cleanedPin,
      workingDays: (row as any).working_days || 'Mon-Fri',
    };

    saveSession(session);
    saveRememberedTeacher(session);

    return {
      success: true,
      session,
    };
  } catch (err: any) {
    return {
      success: false,
      error: UNIFIED_AUTH_ERROR,
    };
  }
}

/**
 * Profile > Change PIN:
 * Calls Supabase RPC: change_teacher_pin(p_phone, p_old_pin, p_new_pin)
 */
export async function changeTeacherPin(params: {
  teacherId?: string;
  phone?: string;
  oldPin: string;
  newPin: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  const cleanedOldPin = params.oldPin.trim();
  const cleanedNewPin = params.newPin.trim();

  if (!/^\d{4}$/.test(cleanedOldPin) || !/^\d{4}$/.test(cleanedNewPin)) {
    return { success: false, error: 'PIN must be exactly 4 digits.' };
  }

  const phone = (params.phone || getStoredSession()?.whatsappNumber || '').trim();
  if (!phone) {
    return { success: false, error: 'Could not resolve phone number for teacher.' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase client is not ready.' };
  }

  try {
    const { data, error } = await supabase.rpc('change_teacher_pin', {
      p_phone: phone,
      p_old_pin: cleanedOldPin,
      p_new_pin: cleanedNewPin,
    });

    if (error || data !== true) {
      return {
        success: false,
        error: 'Current PIN is incorrect or could not be updated.',
      };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Error updating PIN.',
    };
  }
}

/**
 * PIN-only login for returning teachers by teacher_id:
 * Calls Supabase RPC: verify_teacher_pin_by_id(p_teacher_id, p_pin)
 */
export async function loginWithPinById(teacherId: string, pin: string): Promise<{
  success: boolean;
  session?: TeacherSession;
  error?: string;
  reason?: string;
  attemptsLeft?: number;
  lockedUntil?: string;
}> {
  const cleanedPin = pin.trim();
  if (!/^\d{4}$/.test(cleanedPin)) {
    return { success: false, error: 'Please enter a 4-digit PIN.' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'The service is not ready. Please try again later.' };
  }

  try {
    const { data, error } = await supabase.rpc('verify_teacher_pin_by_id', {
      p_teacher_id: teacherId,
      p_pin: cleanedPin,
    });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return { success: false, error: 'Wrong PIN.' };
    }

    const row = data[0] as {
      out_success: boolean;
      out_reason: string;
      out_teacher_id: string;
      out_school_id: string;
      out_teacher_name: string;
      out_school_name: string;
      out_school_timezone: string;
      out_attempts_left?: number;
      out_locked_until?: string;
    };

    if (!row.out_success) {
      const reason = row.out_reason;
      if (reason === 'invalid_credentials') {
        const tries = row.out_attempts_left;
        const msg = tries !== undefined && tries !== null
          ? `Wrong PIN. ${tries} ${tries === 1 ? 'try' : 'tries'} left.`
          : 'Wrong PIN.';
        return { success: false, error: msg, reason, attemptsLeft: tries };
      }
      if (reason === 'locked') {
        const lockedUntil = row.out_locked_until;
        const timeStr = lockedUntil ? new Date(lockedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const msg = timeStr ? `Account locked until ${timeStr}. Too many incorrect PIN attempts.` : 'Account locked due to too many incorrect PIN attempts.';
        return { success: false, error: msg, reason, lockedUntil };
      }
      return { success: false, error: 'Wrong PIN.', reason };
    }

    const remembered = getRememberedTeacher();
    const phone = remembered?.whatsappNumber || '';

    const session: TeacherSession = {
      teacherId: row.out_teacher_id,
      teacherName: row.out_teacher_name || 'Teacher',
      whatsappNumber: phone,
      schoolId: row.out_school_id,
      schoolName: row.out_school_name || 'School',
      schoolTimezone: row.out_school_timezone || 'UTC',
      isHeadTeacher: remembered?.isHeadTeacher || false,
      classId: remembered?.classId,
      loginTime: new Date().toISOString(),
      pin: cleanedPin,
      workingDays: remembered?.workingDays || 'Mon-Fri',
    };

    saveSession(session);
    saveRememberedTeacher(session);

    return { success: true, session };
  } catch (err: any) {
    return { success: false, error: 'Wrong PIN.' };
  }
}

const REMEMBERED_TEACHER_KEY = 'teacher_app_remembered_teacher';

export function saveRememberedTeacher(session: TeacherSession): void {
  try {
    localStorage.setItem(REMEMBERED_TEACHER_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Could not save remembered teacher to localStorage', e);
  }
}

export function getRememberedTeacher(): TeacherSession | null {
  try {
    const data = localStorage.getItem(REMEMBERED_TEACHER_KEY);
    if (data) {
      return JSON.parse(data);
    }
    const sessionData = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      saveRememberedTeacher(parsed);
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearRememberedTeacher(): void {
  try {
    localStorage.removeItem(REMEMBERED_TEACHER_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    console.warn('Could not clear remembered teacher', e);
  }
}

export function saveSession(session: TeacherSession): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Could not save session to sessionStorage', e);
  }
}

export function getStoredSession(): TeacherSession | null {
  try {
    const data = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    console.warn('Could not clear session', e);
  }
}
