// Where the mind map gets its data: the backend when it's set up, otherwise the demo chat.
import type { ChannelView } from './types'
import { channel, claims, messages, topics } from './mocks/mockData'

export const mockView: ChannelView = { channel, messages, topics, claims }

// Uses the backend when VITE_API_URL is set (in frontend/.env) and the page is opened with
// ?channel=<discord channel id>&name=<channel name>. Falls back to the demo chat if anything fails,
// so the demo never shows a blank screen.
export async function loadView(): Promise<ChannelView> {
  const api = import.meta.env.VITE_API_URL as string | undefined
  const params = new URLSearchParams(window.location.search)
  const channelId = params.get('channel')
  if (!api || !channelId) return mockView

  try {
    const name = params.get('name') ?? 'channel'
    const res = await fetch(`${api}/channels/${channelId}/view?name=${encodeURIComponent(name)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const view = (await res.json()) as ChannelView
    return view.topics.length > 0 ? view : mockView
  } catch (err) {
    console.warn('Accord: backend unavailable, showing demo data instead', err)
    return mockView
  }
}
