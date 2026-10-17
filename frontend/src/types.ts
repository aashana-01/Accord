// Shapes of the data we get from the backend (Aashana's models.py must match these).

export type TopicStatus = 'decided' | 'debating' | 'open' // what the group concluded
export type TopicActivity = 'active' | 'dormant' | 'reopened' // what happened over time
export type TopicKind = 'argument' | 'discussion' // decides how a branch expands
export type ClaimKind = 'proposal' | 'for' | 'against' | 'decision' | 'question'

export interface Message {
  id: string
  author: string
  timestamp: string
  content: string
  reply_to: string | null
  topic_id: string
}

export interface Topic {
  id: string
  title: string
  status: TopicStatus
  activity: TopicActivity
  kind: TopicKind
  message_ids: string[]
  is_off_topic: boolean
}

export interface Claim {
  id: string
  topic_id: string
  kind: ClaimKind
  text: string
  source_ids: string[] // the messages that prove this claim
  answer?: string // questions only: filled in once someone answers
  answer_source_ids?: string[]
}
