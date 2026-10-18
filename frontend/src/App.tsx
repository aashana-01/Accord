import { WorkspaceProvider, useWorkspace } from './state/workspace'
import Header from './components/Header'
import MindMap from './components/MindMap'
import ListView from './components/ListView'
import PollPanel from './components/PollPanel'
import ActionsPanel from './components/ActionsPanel'
import ConfirmLeave from './components/ui/ConfirmLeave'
import Toasts from './components/ui/Toasts'
import ChatBot from './components/ChatBot'
import { I18nProvider, useI18n } from './state/i18n'

function Shell() {
  const { viewMode } = useWorkspace()
  const { t } = useI18n()
  return (
    <>
      <a href="#main" className="skip-link">
        {t(viewMode === 'map' ? 'Skip to mind map' : 'Skip to list')}
      </a>
      <div className="flex h-screen flex-col">
        <Header />
        <main id="main" tabIndex={-1} className="relative min-h-0 flex-1 outline-none" style={{ background: 'var(--app-bg)', color: 'var(--on-bg)' }}>
          {viewMode === 'map' ? <MindMap /> : <ListView />}
        </main>
      </div>
      <PollPanel />
      <ActionsPanel />
      <ChatBot />
      <ConfirmLeave />
      <Toasts />
    </>
  )
}

export default function App() {
  return (
    <WorkspaceProvider>
      <I18nProvider>
        <Shell />
      </I18nProvider>
    </WorkspaceProvider>
  )
}
