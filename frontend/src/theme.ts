// Every color and label in the mind map lives here, so the design can change in one place.
import type { ClaimKind, TopicActivity, TopicKind, TopicStatus } from './types'

// ---------- Brand ----------
// Theme colors (backgrounds, arrows, panels) are CSS variables in index.css so light/dark
// is one switch. Values here are the ones that stay the same in both themes.
export const brand = {
  wine: '#3B0019', // logo color, RGB (59, 0, 25)
  logoCard: '#F6F5F0', // off-white behind the logo (matches the logo image)
  card: 'var(--card)', // conversation boxes
  cardDormant: 'var(--card-dormant)', // quiet conversations look muted (not see-through)
  cardBorder: 'var(--card-border)',
  text: '#2B0012', // text on cards (cards are light in both themes)
  textMuted: '#6B5560',
  branch: 'var(--branch)', // dashed arrows
  background: 'var(--app-bg)',
  wheel: 'var(--wheel)', // the faint turning wheel behind the center
  tag: 'MACS-HACKS · Reinvent the Wheel',
}

// Below this AI confidence, a point gets a "Not sure" tag (matches the backend's NOT_SURE_BELOW)
export const NOT_SURE_BELOW = 60

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
  reopened: '#C2410C', // burnt orange (no pink in this design)
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
  'not sure': "The AI isn't confident about this one. Check the source messages.",
  'decided by poll': 'The winning option of a Discord poll',
}
