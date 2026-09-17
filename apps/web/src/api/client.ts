export const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, init)

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    throw new ApiError(body?.message ?? 'Não foi possível concluir a solicitação.', response.status)
  }

  return response.json() as Promise<T>
}
