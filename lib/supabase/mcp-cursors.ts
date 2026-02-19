/**
 * MCP Cursors Client
 * Managed Cursor Pattern for paginated Supabase queries
 */

import { supabase } from './client';

export interface MCPCursor {
  id: string;
  query: string;
  batchSize: number;
  offset: number;
  isDone: boolean;
}

export async function mcpOpen(query: string, batchSize: number = 500): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('mcp_open', {
      p_query: query,
      p_batch_size: batchSize,
    });
    
    if (error) {
      console.error('[MCP] Open cursor error:', error);
      return null;
    }
    
    return data as string;
  } catch (error) {
    console.error('[MCP] Open cursor exception:', error);
    return null;
  }
}

export async function mcpFetch(cursorId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc('mcp_fetch', {
      p_id: cursorId,
    });
    
    if (error) {
      console.error('[MCP] Fetch error:', error);
      return [];
    }
    
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[MCP] Fetch exception:', error);
    return [];
  }
}

export async function mcpClose(cursorId: string): Promise<void> {
  try {
    await supabase.rpc('mcp_close', { p_id: cursorId });
  } catch (error) {
    console.error('[MCP] Close error:', error);
  }
}

export async function mcpCleanup(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('mcp_cleanup');
    
    if (error) {
      console.error('[MCP] Cleanup error:', error);
      return 0;
    }
    
    return data as number || 0;
  } catch (error) {
    console.error('[MCP] Cleanup exception:', error);
    return 0;
  }
}
