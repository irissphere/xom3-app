/**
 * API Client
 * Handles frontend → backend communication
 * Routes to api.* subdomain based on current hostname
 */

/**
 * Get API base URL
 * 
 * Simplified strategy: All frontend domains call api.xom3.io
 * Backend is tenant-aware via X-Hostname header
 */
export function getApiBaseUrl(): string {
  // Use environment variable if set, otherwise default to primary backend
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'https://api.xom3.io';
  }
  
  // Client-side: Always use primary backend domain
  // Backend resolves tenant from X-Hostname header
  return 'https://api.xom3.io';
}

/**
 * Get hostname for tenant resolution
 */
export function getHostname(): string {
  if (typeof window === 'undefined') {
    return 'xom3.io'; // Default for server-side
  }
  return window.location.hostname;
}

/**
 * API client with automatic hostname injection
 */
async function requestApi<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api${endpoint}`;
  const hostname = getHostname();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Hostname": hostname, // Pass hostname for tenant resolution
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new Error(error.error || error.message || "API request failed");
  }

  return response.json();
}

export const apiClient = {
  request: requestApi,
  
  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return requestApi<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  },
  
  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    return requestApi<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
  
  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    return requestApi<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
  
  /**
   * DELETE request
   */
  async delete<T = any>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    return requestApi<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  },
};

/**
 * Export convenience functions
 */
export const api = {
  health: () => apiClient.get('/health'),
  // HPE routes
  hpe: {
    sync: (params?: any) => apiClient.post('/hpe/sync', params),
    compliance: (params?: any) => apiClient.get('/hpe/compliance/query', params),
  },
  // HSE routes
  hse: {
    state: () => apiClient.get('/hse/state'),
    signals: () => apiClient.get('/hse/signals'),
  },
  // UOI routes
  uoi: {
    heartbeat: () => apiClient.get('/uoi/heartbeat'),
    unified: (context?: any) => apiClient.post('/uoi/unified', { context }),
  },
  // Pipeline routes
  pipelines: {
    list: () => apiClient.get('/pipelines'),
    execute: (id: string, data?: any) => apiClient.post(`/pipelines/execute`, { pipelineId: id, ...data }),
  },
};
