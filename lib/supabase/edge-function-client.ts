/**
 * Supabase Edge Function Client
 * Helper for invoking Supabase Edge Functions
 */

import { supabase } from './client';

export interface EdgeFunctionResponse<T = unknown> {
  data: T | null;
  error: Error | null;
}

export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>,
  options?: { headers?: Record<string, string> }
): Promise<EdgeFunctionResponse<T>> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
      headers: options?.headers,
    });

    if (error) {
      return { data: null, error };
    }

    return { data: data as T, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

export async function invokeWithRetry<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>,
  options?: { retries?: number; delayMs?: number }
): Promise<EdgeFunctionResponse<T>> {
  const maxRetries = options?.retries ?? 3;
  const delay = options?.delayMs ?? 1000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await invokeEdgeFunction<T>(functionName, body);
    
    if (!result.error) {
      return result;
    }

    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
    }
  }

  return { data: null, error: new Error(`Failed after ${maxRetries} retries`) };
}
