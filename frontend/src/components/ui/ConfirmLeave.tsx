// "This opens Discord and closes the mind map." Stay is the safe default.
import { useWorkspace } from '../../state/workspace'
import Dialog from './Dialog'
import { useI18n } from '../../state/i18n'

export default function ConfirmLeave() {
  const { leaveUrl, cancelLeave } = useWorkspace()
  const { t } = useI18n()
  return (
    <Dialog
      open={leaveUrl !== null}
      onClose={cancelLeave}
      variant="modal"
      title="Open in Discord?"
      description="This opens Discord and closes the mind map."
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={cancelLeave} data-autofocus>
            {t('Stay here')}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => leaveUrl && window.location.assign(leaveUrl)}>
            {t('Open Discord')}
          </button>
        </>
      }
    >
      <p className="text-sm">{t("You can come back with the map link from the bot's message.")}</p>
    </Dialog>
  )
}
