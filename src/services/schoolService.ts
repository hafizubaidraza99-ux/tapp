import { gatewayGetSchoolSettings } from '../lib/supabase';
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

  const defaultSchool: School = {
    id: schoolId,
    name: 'School',
    timezone: 'UTC',
    created_at: new Date().toISOString(),
  };

  if (!schoolId) {
    return {
      school: defaultSchool,
      settings: defaultSettings,
    };
  }

  try {
    const settingsRes = await gatewayGetSchoolSettings(schoolId);

    let settings = defaultSettings;
    if (settingsRes.data) {
      settings = {
        ...defaultSettings,
        ...(settingsRes.data as SchoolSettings),
      };
    }

    return {
      school: {
        id: schoolId,
        name: (settingsRes.data as any)?.school_name || 'School',
        timezone: (settingsRes.data as any)?.timezone || 'UTC',
        created_at: new Date().toISOString(),
      },
      settings,
    };
  } catch (err) {
    console.warn('Error fetching school details:', err);
    return {
      school: defaultSchool,
      settings: defaultSettings,
    };
  }
}
