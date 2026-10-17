// The mind map: overview of all conversations, click one to enter it, Esc to go back.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ReactFlow, ReactFlowProvider, Controls, Panel, useReactFlow, type NodeMouseHandler } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { focusLayout, overviewLayout } from '../layout'
import { LogoNode, PointsNode, TopicNode, WheelNode } from './nodes'
import FloatingEdge from './FloatingEdge'
import { brand } from '../theme'
import type { ChannelView } from '../types'
import samurai from '../assets/samurai.png'

const nodeTypes = { wheel: WheelNode, logo: LogoNode, topic: TopicNode, points: PointsNode }
const edgeTypes = { floating: FloatingEdge }

function MapCanvas({ view }: { view: ChannelView }) {
  const { channel, claims, messages, topics } = view
  const [focusId, setFocusId] = useState<string | null>(null)
  const { fitView } = useReactFlow()
  const focused = topics.find((t) => t.id === focusId) ?? null

  const { nodes, edges } = useMemo(
    () => (focused ? focusLayout(focused, claims, messages) : overviewLayout(channel.name, topics)),
    [focused, channel.name, claims, messages, topics],
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
  }, [fitOptions, fitView])

  // Esc goes back to the overview
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocusId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      if (node.type !== 'topic') return
      if (focusId) {
        if (node.id === focusId) setFocusId(null) // clicking the center box goes back
        return
      }
      setFocusId(node.id)
    },
    [focusId],
  )

  // The bot should not call the map for fewer than 2 conversations, but never show a broken screen
  if (topics.length < 2) {
    return (
      <div className="flex h-full items-center justify-center text-gray-300">
        {topics.length === 0 ? 'No conversations found yet.' : 'One conversation is not sufficient for a mind map.'}
      </div>
    )
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodeOrigin={[0.5, 0.5]}
      colorMode="dark"
      fitView
      fitViewOptions={fitOptions}
      minZoom={0.2}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      onNodeClick={onNodeClick}
    >
      <Panel position="top-left">
        <div
          className="flex items-center gap-2 rounded-lg py-1 pr-3 pl-1 text-sm shadow"
          style={{ backgroundColor: brand.logoCard, color: brand.text }}
        >
          {/* Team logo; click it to go back to all conversations */}
          <button
            onClick={() => setFocusId(null)}
            title={`#${channel.name}`}
            className={focused ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
          >
            <img src={samurai} alt="SAMURAI" className="h-14 w-auto select-none" draggable={false} />
          </button>
          {focused && (
            <>
              <span style={{ color: brand.textMuted }}>›</span>
              <span className="font-semibold">{focused.title}</span>
              <span className="ml-2 text-xs" style={{ color: brand.textMuted }}>Esc to go back</span>
            </>
          )}
        </div>
      </Panel>

      {!focused && (
        <Panel position="bottom-center">
          <div className="rounded px-2 py-1 text-xs text-white/90">Click a conversation to enter it</div>
        </Panel>
      )}

      <Panel position="top-right">
        <div className="font-mono text-xs tracking-wider text-white/60">{brand.tag}</div>
      </Panel>

      <Controls showInteractive={false} />
    </ReactFlow>
  )
}

export default function MindMap({ view }: { view: ChannelView }) {
  return (
    <ReactFlowProvider>
      <MapCanvas view={view} />
    </ReactFlowProvider>
  )
}
