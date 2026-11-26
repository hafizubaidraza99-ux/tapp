export const GATEWAY_URL = 'https://yutnoyupoxlmxrcoqfui.supabase.co/functions/v1/api';

export interface GatewayResponse<T = any> {
  data: T | null;
  error: any;
}

/**
 * Gateway is always ready; no client-side key or /api/config fetch required.
 */
export async function initSupabase(): Promise<{ client: null; configured: boolean; error?: string }> {
  return { client: null, configured: true };
}

export function getSupabase(): null {
  return null;
}

export function isSupabaseReady(): boolean {
  return true;
}

export function getProjectInfo() {
  return {
    projectId: 'yutnoyupoxlmxrcoqfui',
    url: GATEWAY_URL,
    hasKey: true,
  };
}

export function isTransientSupabaseError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || '').toUpperCase();
  if (code === 'PGRST003') return true;
  const status = Number(err.status || err.statusCode || 0);
  if (status >= 500 || status === 429) return true;
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

async function postGateway<T = any>(payload: Record<string, any>): Promise<GatewayResponse<T>> {
  try {
    return await runWithSupabaseRetry<GatewayResponse<T>>(async () => {
      const res = await fetch(GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        const message =
          body?.error?.message ||
          body?.message ||
          `Request failed with status ${res.status}`;
        return {
          data: null,
          error: {
            ...(body?.error && typeof body.error === 'object' ? body.error : {}),
            message,
            status: res.status,
          },
        };
      }

      if (body && typeof body === 'object' && ('data' in body || 'error' in body)) {
        return {
          data: body.data ?? null,
          error: body.error ?? null,
        };
      }

      return {
        data: body ?? null,
        error: null,
      };
    });
  } catch (err: any) {
    return {
      data: null,
      error: {
        message: err?.message || 'Network request failed',
      },
    };
  }
}

export async function gatewayRpc<T = any>(
  name: string,
  args: Record<string, any> = {}
): Promise<GatewayResponse<T>> {
  return postGateway<T>({
    action: 'rpc',
    name,
    args,
  });
}

export async function gatewayGetSchoolSettings<T = any>(
  schoolId: string
): Promise<GatewayResponse<T>> {
  return postGateway<T>({
    action: 'get_school_settings',
    args: { school_id: schoolId },
  });
}
