export const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly field?: string) {
    super(message)
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (typeof init?.body === 'string' && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const response = await fetch(apiUrl + path, { ...init, headers }).catch(() => {
    throw new ApiError('Não foi possível conectar ao sistema. Tente novamente.', 0)
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string; field?: string } | null
    const message = response.status >= 500 ? 'O sistema não conseguiu concluir a solicitação. Tente novamente.' : body?.message ?? 'Não foi possível concluir a solicitação.'
    throw new ApiError(message, response.status, body?.field)
  }
  return response.json() as Promise<T>
}
