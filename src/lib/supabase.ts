import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://yutnoyupoxlmxrcoqfui.supabase.co';

let clientInstance: SupabaseClient | null = null;
let cachedAnonKey: string | null = null;
let cachedUrl: string = DEFAULT_SUPABASE_URL;

// Attempt to load from Vite environment variables first
const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (import.meta as any).env?.SUPABASE_URL;
const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.SUPABASE_ANON_KEY;

if (envKey) {
  cachedUrl = envUrl || DEFAULT_SUPABASE_URL;
  cachedAnonKey = envKey;
  clientInstance = createClient(cachedUrl, envKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

/**
 * Fetch configuration from backend server if not already available
 */
export async function initSupabase(): Promise<{ client: SupabaseClient | null; configured: boolean; error?: string }> {
  if (clientInstance) {
    return { client: clientInstance, configured: true };
  }

  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data.supabaseAnonKey) {
        cachedUrl = data.supabaseUrl || DEFAULT_SUPABASE_URL;
        cachedAnonKey = data.supabaseAnonKey;
        clientInstance = createClient(cachedUrl, cachedAnonKey!, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
          },
        });
        return { client: clientInstance, configured: true };
      }
    }
  } catch (err) {
    console.warn('Could not fetch Supabase configuration from /api/config:', err);
  }

  return { client: null, configured: false, error: 'Supabase Anon Key is not yet configured in AI Studio Secrets.' };
}

/**
 * Get active Supabase client instance
 */
export function getSupabase(): SupabaseClient | null {
  return clientInstance;
}

export function isSupabaseReady(): boolean {
  return clientInstance !== null;
}

export function getProjectInfo() {
  return {
    projectId: 'yutnoyupoxlmxrcoqfui',
    url: cachedUrl,
    hasKey: Boolean(cachedAnonKey),
  };
}

export function isTransientSupabaseError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || '').toUpperCase();
  if (code === 'PGRST003') return true;
  const status = Number(err.status || err.statusCode || 0);
  if (status === 503 || status === 504 || status === 429) return true;
  const msg = String(err.message || err.details || '').toLowerCase();
  return (
    msg.includes('connection pool') ||
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    msg.includes('failed to fetch') ||
    msg.includes('network')
  );
}

export async function runWithSupabaseRetry<T extends { error: any }>(
  operation: () => PromiseLike<T>,
  maxRetries = 2
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      const result = await operation();
      if (result?.error && isTransientSupabaseError(result.error) && attempt < maxRetries) {
        attempt += 1;
        const delayMs = attempt === 1 ? 450 : 1100;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      return result;
    } catch (err) {
      if (isTransientSupabaseError(err) && attempt < maxRetries) {
        attempt += 1;
        const delayMs = attempt === 1 ? 450 : 1100;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
}

