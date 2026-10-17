import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// In a normal browser there's no Discord behind the map, so fake Discord's chat color while developing.
// Inside Discord (production build) the background stays transparent.
if (import.meta.env.DEV) document.body.style.background = '#313338'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
