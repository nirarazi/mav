const API_BASE_URL =
  process.env.MAV_API_URL || 'http://localhost:3000';
const API_KEY = process.env.MAV_API_KEY || '';

function toQueryString(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      qs.append(key, String(value));
    }
  }
  return qs.toString();
}

async function request<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: API_KEY,
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mav API error ${response.status}: ${body}`);
  }

  const text = await response.text();
  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export async function createPost(body: Record<string, unknown>) {
  return request('/public/v1/posts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function listPosts(filters: Record<string, unknown> = {}) {
  const qs = toQueryString(filters);
  const endpoint = qs ? `/public/v1/posts?${qs}` : '/public/v1/posts';
  return request(endpoint, { method: 'GET' });
}

export async function deletePost(id: string) {
  return request(`/public/v1/posts/${id}`, { method: 'DELETE' });
}

export async function deletePostGroup(group: string) {
  return request(`/public/v1/posts/group/${group}`, { method: 'DELETE' });
}

export async function getPostMissing(id: string) {
  return request(`/public/v1/posts/${id}/missing`, { method: 'GET' });
}

export async function updateReleaseId(id: string, releaseId: string) {
  return request(`/public/v1/posts/${id}/release-id`, {
    method: 'PUT',
    body: JSON.stringify({ releaseId }),
  });
}

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

export async function listIntegrations() {
  return request('/public/v1/integrations', { method: 'GET' });
}

export async function getIntegrationSettings(integrationId: string) {
  return request(`/public/v1/integration-settings/${integrationId}`, {
    method: 'GET',
  });
}

export async function deleteIntegration(id: string) {
  return request(`/public/v1/integrations/${id}`, { method: 'DELETE' });
}

export async function triggerIntegrationTool(
  integrationId: string,
  methodName: string,
  data: Record<string, string>
) {
  return request(`/public/v1/integration-trigger/${integrationId}`, {
    method: 'POST',
    body: JSON.stringify({ methodName, data }),
  });
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export async function getIntegrationAnalytics(
  integrationId: string,
  date?: string
) {
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
  return request(`/public/v1/analytics/${integrationId}${qs}`, {
    method: 'GET',
  });
}

export async function getPostAnalytics(postId: string, date?: string) {
  const qs = date ? `?date=${encodeURIComponent(date)}` : '';
  return request(`/public/v1/analytics/post/${postId}${qs}`, {
    method: 'GET',
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function getNotifications(page = 0) {
  return request(`/public/v1/notifications?page=${page}`, { method: 'GET' });
}

// ---------------------------------------------------------------------------
// Misc / Health
// ---------------------------------------------------------------------------

export async function isConnected() {
  return request('/public/v1/is-connected', { method: 'GET' });
}

export async function findSlot(integrationId?: string) {
  const path = integrationId
    ? `/public/v1/find-slot/${integrationId}`
    : '/public/v1/find-slot/default';
  return request(path, { method: 'GET' });
}

// ---------------------------------------------------------------------------
// Upload (URL-based, since MCP tools work with URLs not raw buffers)
// ---------------------------------------------------------------------------

export async function uploadFromUrl(url: string) {
  return request('/public/v1/upload-from-url', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

// ---------------------------------------------------------------------------
// Forward-looking endpoints (personas, approvals, brain, sentiment)
// These call backend routes that may be added in the future.
// They will return the backend response or a structured error.
// ---------------------------------------------------------------------------

export async function genericGet(path: string) {
  return request(path, { method: 'GET' });
}

export async function genericPost(path: string, body: Record<string, unknown>) {
  return request(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function genericPut(path: string, body: Record<string, unknown>) {
  return request(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
