import MindMap from './components/MindMap'
import { brand } from './theme'

export default function App() {
  return (
    <div className="h-screen w-screen" style={{ background: brand.background }}>
      <MindMap />
    </div>
  )
}
