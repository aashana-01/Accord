// Small wrapper around the Accord backend. The page only talks to the backend when it was
// opened from the bot's link (?channel=...) and VITE_API_URL is set.

const API = import.meta.env.VITE_API_URL as string | undefined
const params = new URLSearchParams(window.location.search)

export const channelId = params.get('channel')
export const channelNameParam = params.get('name') ?? 'channel'
export const backendEnabled = Boolean(API && channelId)
export const apiAvailable = Boolean(API)

export class ApiError extends Error {}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!API) throw new ApiError('The Accord backend is not connected.')
  let res: Response
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError("Can't reach the Accord backend. Is it running?")
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (typeof data?.detail === 'string') detail = data.detail
    } catch {
      /* keep the generic message */
    }
    throw new ApiError(detail)
  }
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.')
