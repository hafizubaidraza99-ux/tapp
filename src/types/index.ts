export type AttendanceStatus = 'present' | 'absent' | 'late' | 'pending' | 'no_reply';
export type AttendanceSource = 'app' | 'whatsapp' | 'admin' | 'system';
export type CoverStatus = 'uncovered' | 'covered';

export interface School {
  id: string;
  name: string;
  timezone: string; // e.g. "Asia/Karachi", "UTC"
  created_at?: string;
}

export interface SchoolSettings {
  id?: string;
  school_id: string;
  send_time: string; // e.g. "07:00"
  reminder_minutes?: number; // e.g. 30
  cutoff_time: string; // e.g. "08:00"
  vacation_start: string | null;
  vacation_end: string | null;
  created_at?: string;
}

export interface Teacher {
  id: string;
  school_id: string;
  name: string;
  whatsapp_number: string;
  pin_hash?: string;
  is_head_teacher?: boolean;
  class_id?: string;
  created_at?: string;
  school?: School;
}

export interface TeacherActivationCode {
  id: string;
  school_id: string;
  teacher_id: string;
  code_hash: string;
  is_used: boolean;
  used_at?: string | null;
  created_at: string;
}

export interface ClassItem {
  id: string;
  school_id: string;
  name: string;
  head_teacher_id?: string;
}

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  code?: string;
}

export interface Period {
  id: string;
  school_id: string;
  period_number: number;
  name?: string;
  start_time: string; // "08:15"
  end_time: string;   // "09:00"
}

export interface TimetableEntry {
  id: string;
  school_id: string;
  class_id: string;
  teacher_id: string;
  subject_id: string;
  period_id: string;
  weekday: number; // 0=Sunday, 1=Monday, etc.
  class?: ClassItem;
  subject?: Subject;
  period?: Period;
  teacher?: Teacher;
}

export interface DailyTimetableItem {
  id: string;
  school_id: string;
  date: string; // YYYY-MM-DD
  timetable_entry_id: string;
  original_teacher_id: string;
  covering_teacher_id?: string | null;
  cover_status: CoverStatus;
  status?: string;
  timetable_entry?: TimetableEntry;
  covering_teacher?: Teacher;
  original_teacher?: Teacher;
}

export interface AttendanceRecord {
  id: string;
  school_id: string;
  teacher_id: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  source: AttendanceSource;
  created_at?: string;
  updated_at?: string;
  reply_at?: string;
}

export interface TeacherSession {
  teacherId: string;
  teacherName: string;
  whatsappNumber: string;
  schoolId: string;
  schoolName: string;
  schoolTimezone: string;
  workingDays?: string;
  isHeadTeacher: boolean;
  classId?: string;
  loginTime: string;
  pin?: string;
}

export type TabKey = 'today' | 'timetable' | 'history' | 'profile';
