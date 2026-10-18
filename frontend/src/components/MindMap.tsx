// The mind map: overview of all conversations, open one to see its points, Esc to go back.
// Keyboard: Tab moves between conversation boxes, Enter opens one, Esc goes back.
import { useCallback, useEffect, useMemo } from 'react'
import { ReactFlow, ReactFlowProvider, Controls, Panel, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { focusLayout, overviewLayout, type TopicExtras } from '../layout'
import { LogoNode, PointsNode, TopicNode, WheelNode } from './nodes'
import FloatingEdge from './FloatingEdge'
import { brand } from '../theme'
import { useWorkspace } from '../state/workspace'
import { useI18n } from '../state/i18n'

const nodeTypes = { wheel: WheelNode, logo: LogoNode, topic: TopicNode, points: PointsNode }
const edgeTypes = { floating: FloatingEdge }
const noop = () => {}

function MapCanvas() {
  const { view, focusId, setFocusId, tasks, polls, theme } = useWorkspace()
  const { channel, claims, messages, topics } = view
  const { fitView } = useReactFlow()
  const { t } = useI18n()
  const focused = topics.find((t) => t.id === focusId) ?? null

  const extras = useCallback<TopicExtras>(
    (id) => ({
      onOpen: () => setFocusId(focusId === id ? null : id),
      taskCount: tasks.filter((t) => t.topic_id === id && t.status !== 'done').length,
      pollCount: polls.filter((p) => p.topic_id === id).length,
    }),
    [focusId, setFocusId, tasks, polls],
  )

  const { nodes, edges } = useMemo(
    () =>
      focused
        ? focusLayout(focused, claims, messages, extras)
        : overviewLayout(channel.name, topics, extras),
    [focused, channel.name, claims, messages, topics, extras],
  )

  // Frame the real boxes, not the big decorative wheel
  const fitOptions = useMemo(
    () => ({ padding: 0.15, maxZoom: 1.1, nodes: nodes.filter((n) => n.type !== 'wheel').map((n) => ({ id: n.id })) }),
    [nodes],
  )

  // After entering or leaving a topic, glide the camera so everything fits
  useEffect(() => {
    const timer = setTimeout(() => fitView({ ...fitOptions, duration: 600 }), 60)
    return () => clearTimeout(timer)
  }, [focusId, fitOptions, fitView])

  // Esc goes back to the overview (unless a dialog is open; it handles Esc itself)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[aria-modal="true"]')) setFocusId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setFocusId])

  const branches = nodes.filter((n) => n.type === 'points').length
  const announcement = focused
    ? `${t(focused.title)}: ${branches} ${t(branches === 1 ? 'branch' : 'branches')}. ${t('Press Escape to go back.')}`
    : `${t('All conversations')} (${topics.length}) · #${channel.name}`

  // The bot should not call the map for fewer than 2 conversations, but never show a broken screen
  if (topics.length < 2) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center" style={{ color: 'var(--on-bg)' }}>
        {t(topics.length === 0 ? 'No conversations found yet.' : 'One conversation is not sufficient for a mind map.')}
      </div>
    )
  }

  return (
    <>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodeOrigin={[0.5, 0.5]}
        colorMode={theme}
        fitView
        fitViewOptions={fitOptions}
        minZoom={0.2}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        // React Flow ignores mouse clicks on boxes unless a click handler exists. The button inside
        // each conversation box does the actual opening (it also handles keyboard Enter).
        onNodeClick={noop}
      >
        <Panel position="top-left">
          <nav
            aria-label={t('Breadcrumb')}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm shadow"
            style={{ background: 'var(--surface)', color: 'var(--surface-fg)', borderColor: 'var(--border)' }}
          >
            {focused ? (
              <>
                <button type="button" onClick={() => setFocusId(null)} className="cursor-pointer font-medium hover:underline">
                  {t('All conversations')}
                </button>
                <span aria-hidden style={{ color: 'var(--surface-muted)' }}>
                  ›
                </span>
                <span className="font-semibold" aria-current="page">
                  {t(focused.title)}
                </span>
                <span className="ml-2 hidden text-xs sm:inline" style={{ color: 'var(--surface-muted)' }}>
                  {t('Esc to go back')}
                </span>
              </>
            ) : (
              <span className="font-semibold" aria-current="page">
                {t('All conversations')} · #{channel.name}
              </span>
            )}
          </nav>
        </Panel>

        {!focused && (
          <Panel position="bottom-center">
            <p className="rounded px-2 py-1 text-xs" style={{ color: 'var(--on-bg)' }}>
              {t('Click or press Enter on a conversation to open it')}
            </p>
          </Panel>
        )}

        <Panel position="top-right">
          <p className="hidden font-mono text-xs tracking-wider sm:block" style={{ color: 'var(--on-bg-muted)' }}>
            {brand.tag}
          </p>
        </Panel>

        <Controls showInteractive={false} />
      </ReactFlow>
    </>
  )
}

export default function MindMap() {
  return (
    <ReactFlowProvider>
      <MapCanvas />
    </ReactFlowProvider>
  )
}
