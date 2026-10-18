// Shared state for the whole page: the channel's data, polls, tasks, theme, panels and messages to the user.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ChannelInfo, ChannelView, Poll, Task } from '../types'
import { api, backendEnabled, channelId, errorMessage } from '../api'
import { loadView, mockView } from '../data'

export type ThemePref = 'system' | 'light' | 'dark'
export type PanelName = 'poll' | 'actions' | null
export type ViewMode = 'map' | 'list'
export interface Toast {
  id: number
  text: string
  kind: 'info' | 'success' | 'error'
}

interface Workspace {
  backend: boolean
  view: ChannelView
  info: ChannelInfo | null
  serverName: string
  polls: Poll[]
  tasks: Task[]
  refreshView: () => Promise<void>
  refreshPolls: () => Promise<void>
  refreshTasks: () => Promise<void>
  setTasks: (update: (tasks: Task[]) => Task[]) => void
  setPolls: (update: (polls: Poll[]) => Poll[]) => void
  focusId: string | null
  setFocusId: (id: string | null) => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  themePref: ThemePref
  setThemePref: (pref: ThemePref) => void
  theme: 'light' | 'dark'
  panel: PanelName
  openPanel: (panel: PanelName) => void
  toasts: Toast[]
  toast: (text: string, kind?: Toast['kind']) => void
  dismissToast: (id: number) => void
  leaveUrl: string | null
  confirmLeave: (url: string) => void
  cancelLeave: () => void
}

const Ctx = createContext<Workspace | null>(null)

// localStorage can be blocked (private windows); never let that break the page
const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ChannelView>(mockView)
  const [info, setInfo] = useState<ChannelInfo | null>(null)
  const [polls, setPollsState] = useState<Poll[]>([])
  const [tasks, setTasksState] = useState<Task[]>([])
  const [focusId, setFocusId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [panel, setPanel] = useState<PanelName>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [leaveUrl, setLeaveUrl] = useState<string | null>(null)
  const [themePref, setThemePrefState] = useState<ThemePref>(() => (read('accord-theme') as ThemePref) || 'system')
  const [prefersDark, setPrefersDark] = useState(systemDark)

  const toast = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text, kind }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000)
  }, [])
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const refreshView = useCallback(async () => setView(await loadView()), [])
  const refreshPolls = useCallback(async () => {
    if (!backendEnabled) return
    try {
      const data = await api.get<{ polls: Poll[]; sync_errors: string[] }>(`/channels/${channelId}/polls`)
      setPollsState(data.polls)
      if (data.polls.some((p) => p.decision_claim_id)) setView(await loadView()) // poll winners appear on the map
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }, [toast])
  const refreshTasks = useCallback(async () => {
    if (!backendEnabled) return
    try {
      setTasksState((await api.get<{ tasks: Task[] }>(`/channels/${channelId}/tasks`)).tasks)
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }, [toast])

  useEffect(() => {
    refreshView()
    if (!backendEnabled) return
    api.get<ChannelInfo>(`/channels/${channelId}/info`).then(setInfo).catch(() => setInfo(null))
    refreshPolls()
    refreshTasks()
  }, [refreshView, refreshPolls, refreshTasks])

  // Theme: follow the computer until the person picks one, then remember it.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    const onChange = () => setPrefersDark(mq.matches)
    mq?.addEventListener('change', onChange)
    return () => mq?.removeEventListener('change', onChange)
  }, [])
  const theme: 'light' | 'dark' = themePref === 'system' ? (prefersDark ? 'dark' : 'light') : themePref
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  const setThemePref = useCallback((pref: ThemePref) => {
    setThemePrefState(pref)
    write('accord-theme', pref)
  }, [])

  const serverName = info?.guild_name || view.channel.guild || 'Demo server'

  const value = useMemo<Workspace>(
    () => ({
      backend: backendEnabled,
      view,
      info,
      serverName,
      polls,
      tasks,
      refreshView,
      refreshPolls,
      refreshTasks,
      setTasks: (u) => setTasksState(u),
      setPolls: (u) => setPollsState(u),
      focusId,
      setFocusId,
      viewMode,
      setViewMode,
      themePref,
      setThemePref,
      theme,
      panel,
      openPanel: setPanel,
      toasts,
      toast,
      dismissToast,
      leaveUrl,
      confirmLeave: setLeaveUrl,
      cancelLeave: () => setLeaveUrl(null),
    }),
    [view, info, serverName, polls, tasks, refreshView, refreshPolls, refreshTasks, focusId, viewMode, themePref,
      setThemePref, theme, panel, toasts, toast, dismissToast, leaveUrl],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useWorkspace() {
  const ws = useContext(Ctx)
  if (!ws) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ws
}
