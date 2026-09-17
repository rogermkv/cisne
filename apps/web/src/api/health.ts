import { apiRequest } from './client'

export type HealthResponse = {
  status: 'OK'
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/api/health', { signal })
}
