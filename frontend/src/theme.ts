// Every color and label in the mind map lives here, so the design can change in one place.
import type { ClaimKind, TopicActivity, TopicKind, TopicStatus } from './types'

// ---------- Brand ----------
export const brand = {
  wine: '#3B0019', // logo color, RGB (59, 0, 25)
  logoCard: '#F6F5F0', // off-white behind the logo (matches the logo image)
  card: '#EFE6E7', // conversation boxes
  cardDormant: '#D8CACD', // quiet conversations look muted (not see-through)
  text: '#2B0012',
  textMuted: '#6B5560',
  branch: '#FFFFFF', // dashed arrows
  // Deep wine maroon: lightest behind the center, darkest at the edges, with a faint dot grid.
  // Set to 'transparent' to let Discord's own background show through instead.
  background: [
    'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px) 0 0 / 22px 22px',
    'radial-gradient(circle at center, #4A0A1E 0%, #2A0612 55%, #12030A 100%)',
  ].join(', '),
  wheel: 'rgba(255,255,255,0.08)', // the faint turning wheel behind the center
  tag: 'MACS-HACKS · Reinvent the Wheel',
}

// ---------- Chip labels shown on each conversation ----------
// Change the words on the left of the colon here.
export const chipLabel = {
  activity: 'Activity',
  status: 'Status',
  kind: 'Type',
}

// Colors are darker shades so they stay readable on the light boxes.
export const activityColor: Record<TopicActivity, string> = {
  active: '#0891B2',
  dormant: '#9CA3AF',
  reopened: '#DB2777',
}

export const statusColor: Record<TopicStatus, string> = {
  decided: '#16A34A',
  debating: '#D97706',
  open: '#4F46E5',
}

export const kindColor: Record<TopicKind | 'off-topic', string> = {
  argument: '#9333EA',
  discussion: '#65A30D',
  'off-topic': '#6B7280',
}

export const claimColor: Record<ClaimKind, string> = {
  proposal: '#0284C7',
  for: '#0D9488',
  against: '#DC2626',
  decision: '#16A34A',
  question: '#EA580C',
}

// Hover a chip to see what it means (for people who don't know the color code yet)
export const meaning: Record<string, string> = {
  active: 'New messages recently',
  dormant: 'No messages for a while',
  reopened: 'Went quiet, then someone came back to it',
  decided: 'The group explicitly agreed on something',
  debating: 'Proposals with arguments on both sides, no agreement yet',
  open: 'Raised, but no real proposal or answer yet',
  argument: 'A for vs. against debate',
  discussion: 'Ideas and preferences, no clear sides',
  'off-topic': "Not about this channel's main work",
}
