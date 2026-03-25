import fetch, { FormData } from 'node-fetch';

export interface MaverickConfig {
  apiKey: string;
  apiUrl?: string;
}

export class MaverickAPI {
  private apiKey: string;
  private apiUrl: string;

  constructor(config: MaverickConfig) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || 'https://api.maverick.com';
  }

  private async request(endpoint: string, options: any = {}) {
    const url = `${this.apiUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: this.apiKey,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API Error (${response.status}): ${error}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  async createPost(data: any) {
    return this.request('/public/v1/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listPosts(filters: any = {}) {
    const queryString = new URLSearchParams(
      Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString();

    const endpoint = queryString
      ? `/public/v1/posts?${queryString}`
      : '/public/v1/posts';

    return this.request(endpoint, {
      method: 'GET',
    });
  }

  async deletePost(id: string) {
    return this.request(`/public/v1/posts/${id}`, {
      method: 'DELETE',
    });
  }

  async upload(file: Buffer, filename: string) {
    const formData = new FormData();
    const extension = filename.split('.').pop()?.toLowerCase() || '';

    // Determine MIME type based on file extension
    const mimeTypes: Record<string, string> = {
      // Images
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'bmp': 'image/bmp',
      'ico': 'image/x-icon',

      // Videos
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mkv': 'video/x-matroska',
      'webm': 'video/webm',
      'flv': 'video/x-flv',
      'wmv': 'video/x-ms-wmv',
      'm4v': 'video/x-m4v',
      'mpeg': 'video/mpeg',
      'mpg': 'video/mpeg',
      '3gp': 'video/3gpp',

      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'aac': 'audio/aac',
      'flac': 'audio/flac',
      'm4a': 'audio/mp4',

      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    const type = mimeTypes[extension] || 'application/octet-stream';

    const blob = new Blob([file], { type });
    formData.append('file', blob, filename);

    const url = `${this.apiUrl}/public/v1/upload`;
    const response = await fetch(url, {
      method: 'POST',
      // @ts-ignore
      body: formData,
      headers: {
        Authorization: this.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed (${response.status}): ${error}`);
    }

    return await response.json();
  }

  async listIntegrations() {
    return this.request('/public/v1/integrations', {
      method: 'GET',
    });
  }

  async getIntegrationSettings(integrationId: string) {
    return this.request(`/public/v1/integration-settings/${integrationId}`, {
      method: 'GET',
    });
  }

  async triggerIntegrationTool(
    integrationId: string,
    methodName: string,
    data: Record<string, string>
  ) {
    return this.request(`/public/v1/integration-trigger/${integrationId}`, {
      method: 'POST',
      body: JSON.stringify({ methodName, data }),
    });
  }
}

// ---------------------------------------------------------------------------
// Standalone API functions (new pattern, mirrors MCP server api-client)
// ---------------------------------------------------------------------------

function getEnvConfig() {
  const apiUrl = process.env.MAVERICK_API_URL || 'https://api.maverick.com';
  const apiKey = process.env.MAVERICK_API_KEY || '';
  return { apiUrl, apiKey };
}

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
  const { apiUrl, apiKey } = getEnvConfig();
  const url = `${apiUrl}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: apiKey,
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Maverick API error ${response.status}: ${body}`);
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
// Brain
// ---------------------------------------------------------------------------

export async function triggerBrain(goal?: string, timeHorizon?: string) {
  return request('/public/v1/brain/trigger', {
    method: 'POST',
    body: JSON.stringify({ goal, timeHorizon }),
  });
}

export async function getBrainStatus() {
  return request('/public/v1/brain/status', { method: 'GET' });
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export async function getPendingApprovals(type?: string) {
  const qs = type ? `?type=${encodeURIComponent(type)}` : '';
  return request(`/public/v1/approvals/pending${qs}`, { method: 'GET' });
}

export async function decideApproval(
  id: string,
  approved: boolean,
  feedback?: string
) {
  return request(`/public/v1/approvals/${id}/decide`, {
    method: 'POST',
    body: JSON.stringify({ approved, feedback }),
  });
}

export async function getApprovalHistory(limit = 20) {
  return request(`/public/v1/approvals/history?limit=${limit}`, {
    method: 'GET',
  });
}

// ---------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------

export async function listPersonas() {
  return request('/public/v1/personas', { method: 'GET' });
}

export async function getActivePersona() {
  return request('/public/v1/personas/active', { method: 'GET' });
}

export async function setActivePersona(id: string) {
  return request('/public/v1/personas/active', {
    method: 'POST',
    body: JSON.stringify({ personaId: id }),
  });
}

// ---------------------------------------------------------------------------
// Compliance
// ---------------------------------------------------------------------------

export async function getComplianceAudit(from?: string, to?: string) {
  const params: Record<string, unknown> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const qs = toQueryString(params);
  const endpoint = qs
    ? `/public/v1/compliance/audit?${qs}`
    : '/public/v1/compliance/audit';
  return request(endpoint, { method: 'GET' });
}

// ---------------------------------------------------------------------------
// Health (standalone)
// ---------------------------------------------------------------------------

export async function checkConnection() {
  return request('/public/v1/is-connected', { method: 'GET' });
}
