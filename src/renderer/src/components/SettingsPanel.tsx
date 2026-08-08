import type { RenderMode, Settings, Theme } from '../types'

interface SettingsPanelProps {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  onReset: () => void
  onClose: () => void
  onCheckForUpdates: () => void
  checkingForUpdates: boolean
  /** Result message from the last manual "Check for updates" click - null
   * before the first click, or once a newer Version is found (the Update
   * Prompt takes over from there instead). See CONTEXT.md. */
  updateCheckMessage: string | null
}

const THEMES: Theme[] = ['system', 'light', 'dark']
const RENDER_MODES: RenderMode[] = ['shaded', 'wireframe', 'xray']

export function SettingsPanel({
  settings,
  onChange,
  onReset,
  onClose,
  onCheckForUpdates,
  checkingForUpdates,
  updateCheckMessage
}: SettingsPanelProps): React.JSX.Element {
  function handleReset(): void {
    const confirmed = window.confirm(
      'Reset configuration? This clears your favorites, last-opened folder, and settings back to defaults. This cannot be undone.'
    )
    if (confirmed) onReset()
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(event) => event.stopPropagation()}>
        <div className="settings-panel__header">
          <span>Settings</span>
          <button type="button" onClick={onClose} aria-label="Close settings">
            ×
          </button>
        </div>

        <label className="settings-panel__field">
          <span>Theme</span>
          <select
            value={settings.theme}
            onChange={(event) => onChange({ theme: event.target.value as Theme })}
          >
            {THEMES.map((theme) => (
              <option key={theme} value={theme}>
                {theme[0].toUpperCase() + theme.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label className="settings-panel__field">
          <span>Default render mode</span>
          <select
            value={settings.defaultRenderMode}
            onChange={(event) => onChange({ defaultRenderMode: event.target.value as RenderMode })}
          >
            {RENDER_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode[0].toUpperCase() + mode.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label className="settings-panel__field settings-panel__field--checkbox">
          <input
            type="checkbox"
            checked={settings.checkForUpdatesOnStartup}
            onChange={(event) => onChange({ checkForUpdatesOnStartup: event.target.checked })}
          />
          <span>Check for updates on startup</span>
        </label>

        <div className="settings-panel__field">
          <button
            type="button"
            className="settings-panel__action"
            onClick={onCheckForUpdates}
            disabled={checkingForUpdates}
          >
            {checkingForUpdates ? 'Checking…' : 'Check for updates'}
          </button>
          {updateCheckMessage && (
            <span className="settings-panel__update-message">{updateCheckMessage}</span>
          )}
        </div>

        <div className="settings-panel__danger-zone">
          <button type="button" className="settings-panel__reset" onClick={handleReset}>
            Reset configuration
          </button>
        </div>
      </div>
    </div>
  )
}
