import { ACCENT_COLOR_PRESETS, type Settings, type Theme } from '../types'

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

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

  function handleAccentColorInput(value: string): void {
    if (HEX_COLOR_PATTERN.test(value)) onChange({ accentColor: value })
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

        <div className="settings-panel__field">
          <span>Accent color</span>
          <div className="accent-color-picker">
            <div className="accent-color-swatches">
              {ACCENT_COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={
                    'accent-color-swatch' +
                    (settings.accentColor.toLowerCase() === color.toLowerCase()
                      ? ' is-selected'
                      : '')
                  }
                  style={{ background: color }}
                  aria-label={`Use ${color} as the accent color`}
                  onClick={() => onChange({ accentColor: color })}
                />
              ))}
            </div>
            <div className="accent-color-custom">
              <input
                type="color"
                value={settings.accentColor}
                onChange={(event) => onChange({ accentColor: event.target.value })}
                aria-label="Pick a custom accent color"
              />
              <input
                type="text"
                className="accent-color-hex"
                // Uncontrolled, keyed to the committed color: free typing
                // (e.g. a partial "#f5a" mid-edit) isn't fought by a
                // controlled value snapping back every keystroke, and the
                // field still remounts to show the latest committed color
                // whenever it changes from elsewhere (a preset click, the
                // color picker, or a config reset) - without setState-in-
                // effect syncing.
                key={settings.accentColor}
                defaultValue={settings.accentColor}
                onChange={(event) => handleAccentColorInput(event.target.value)}
                placeholder="#f5a623"
                spellCheck={false}
                aria-label="Accent color hex code"
              />
            </div>
          </div>
        </div>

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
            {checkingForUpdates ? 'Checking…' : 'Check now for updates'}
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
