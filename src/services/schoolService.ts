import { getSupabase, runWithSupabaseRetry } from '../lib/supabase';
import { School, SchoolSettings } from '../types';

export async function getSchoolDetails(schoolId: string): Promise<{
  school: School | null;
  settings: SchoolSettings;
}> {
  const defaultSettings: SchoolSettings = {
    school_id: schoolId,
    send_time: '07:00',
    reminder_minutes: 30,
    cutoff_time: '08:00',
  };

  const supabase = getSupabase();
  if (!supabase || !schoolId) {
    return {
      school: null,
      settings: defaultSettings,
    };
  }

  try {
    const schoolRes = await runWithSupabaseRetry(() =>
      supabase.from('schools').select('*').eq('id', schoolId).single()
    );
    const settingsRes = await runWithSupabaseRetry(() =>
      supabase.from('school_settings').select('*').eq('school_id', schoolId).maybeSingle()
    );

    const school: School | null = schoolRes.data ? (schoolRes.data as School) : null;
    let settings = defaultSettings;

    if (settingsRes.data) {
      settings = {
        ...defaultSettings,
        ...(settingsRes.data as SchoolSettings),
      };
    }

    return { school, settings };
  } catch (err) {
    console.warn('Error fetching school details:', err);
    return {
      school: null,
      settings: defaultSettings,
    };
  }
}
