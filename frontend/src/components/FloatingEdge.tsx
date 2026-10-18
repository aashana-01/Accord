// A straight dashed arrow that starts and stops at the edges of the boxes (not their centers),
// so the arrowhead is visible instead of hidden under the box.
import { BaseEdge, useInternalNode, type EdgeProps, type InternalNode } from '@xyflow/react'

function box(node: InternalNode) {
  const { x, y } = node.internals.positionAbsolute
  const w = node.measured.width ?? 0
  const h = node.measured.height ?? 0
  return { cx: x + w / 2, cy: y + h / 2, w, h }
}

// Where a line from the box's center toward (tx, ty) leaves the box, plus a small gap.
function exitPoint(b: ReturnType<typeof box>, tx: number, ty: number, gap = 8) {
  const dx = tx - b.cx
  const dy = ty - b.cy
  if (dx === 0 && dy === 0) return { x: b.cx, y: b.cy }
  const scaleX = dx === 0 ? Infinity : (b.w / 2 + gap) / Math.abs(dx)
  const scaleY = dy === 0 ? Infinity : (b.h / 2 + gap) / Math.abs(dy)
  const s = Math.min(scaleX, scaleY)
  return { x: b.cx + dx * s, y: b.cy + dy * s }
}

export default function FloatingEdge({ id, source, target, style }: EdgeProps) {
  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)
  if (!sourceNode || !targetNode) return null

  const a = box(sourceNode)
  const b = box(targetNode)
  const start = exitPoint(a, b.cx, b.cy)
  const end = exitPoint(b, a.cx, a.cy)

  // Arrowhead drawn here (not as an SVG marker) so it can use the theme color variable.
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  const size = 11
  const left = { x: end.x - size * Math.cos(angle - 0.45), y: end.y - size * Math.sin(angle - 0.45) }
  const right = { x: end.x - size * Math.cos(angle + 0.45), y: end.y - size * Math.sin(angle + 0.45) }

  return (
    <>
      <BaseEdge id={id} path={`M ${start.x},${start.y} L ${end.x},${end.y}`} style={style} />
      <path
        d={`M ${end.x},${end.y} L ${left.x},${left.y} L ${right.x},${right.y} Z`}
        style={{ fill: 'var(--branch)', stroke: 'none' }}
        aria-hidden
      />
    </>
  )
}
