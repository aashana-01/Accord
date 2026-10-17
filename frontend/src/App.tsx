import { useEffect, useState } from 'react'
import MindMap from './components/MindMap'
import { brand } from './theme'
import { loadView, mockView } from './data'
import type { ChannelView } from './types'

export default function App() {
  const [view, setView] = useState<ChannelView>(mockView)

  useEffect(() => {
    loadView().then(setView)
  }, [])

  return (
    <div className="h-screen w-screen" style={{ background: brand.background }}>
      <MindMap view={view} />
    </div>
  )
}
