// Where the mind map gets its data: the backend when the page was opened from the bot's link,
// otherwise the demo chat (so the page never shows a blank screen).
import type { ChannelView } from './types'
import { channel, claims, messages, topics } from './mocks/mockData'
import { api, backendEnabled, channelId, channelNameParam } from './api'

export const mockView: ChannelView = { channel, messages, topics, claims }

export async function loadView(): Promise<ChannelView> {
  if (!backendEnabled || !channelId) return mockView
  try {
    const view = await api.get<ChannelView>(`/channels/${channelId}/view?name=${encodeURIComponent(channelNameParam)}`)
    return view.topics.length > 0 ? view : mockView
  } catch (err) {
    console.warn('Accord: backend unavailable, showing demo data instead', err)
    return mockView
  }
}
