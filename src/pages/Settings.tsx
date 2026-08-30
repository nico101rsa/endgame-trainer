import { useRef, useState } from 'react'
import { BackHeader } from '../components/BackHeader'
import { BOARD_THEMES } from '../board/theme'
import { exportProgress, importProgress, resetProgress } from '../progress/store'
import type { BoardTheme, PieceSet } from '../settings/store'
import { saveSettings } from '../settings/store'
import { useSettings } from '../settings/useSettings'

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[44px] flex-1 border-[3px] border-ink px-2 text-[12px] font-extrabold uppercase tracking-wide ${
        active ? 'bg-ink text-cream' : ''
      }`}
    >
      {children}
    </button>
  )
}

// Milestone 3 scope: the progress-data controls (export / import / reset).
// Board themes, piece sets and sound land with the polish milestone.
export function Settings() {
  const settings = useSettings()
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function download() {
    const blob = new Blob([exportProgress()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'endgame-trainer-progress.json'
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ tone: 'ok', text: 'Progress exported.' })
  }

  async function onImportFile(file: File | undefined) {
    if (!file) return
    try {
      importProgress(await file.text())
      setMessage({ tone: 'ok', text: 'Progress imported — schedule restored.' })
    } catch (e) {
      setMessage({ tone: 'error', text: e instanceof Error ? e.message : 'Import failed.' })
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  function reset() {
    if (!window.confirm('Reset ALL progress? The review schedule cannot be recovered.')) return
    resetProgress()
    setMessage({ tone: 'ok', text: 'Progress reset.' })
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-12 pb-10">
      <BackHeader to="/" label="Settings" />

      <div className="mt-4 px-1">
        <h1 className="font-display text-4xl uppercase leading-none">
          Settings<span className="text-red">.</span>
        </h1>
      </div>

      <div className="mt-8 text-[11px] font-extrabold uppercase tracking-widest text-muted">
        Board theme
      </div>
      <div className="mt-2 flex gap-2">
        {(Object.keys(BOARD_THEMES) as BoardTheme[]).map((theme) => (
          <Choice
            key={theme}
            active={settings.boardTheme === theme}
            onClick={() => saveSettings({ boardTheme: theme })}
          >
            <span className="flex items-center justify-center gap-2">
              <span
                className="inline-block h-3 w-3 border border-ink"
                style={{ backgroundColor: BOARD_THEMES[theme].dark }}
              />
              {BOARD_THEMES[theme].label}
            </span>
          </Choice>
        ))}
      </div>

      <div className="mt-6 text-[11px] font-extrabold uppercase tracking-widest text-muted">
        Pieces
      </div>
      <div className="mt-2 flex gap-2">
        {(['poster', 'classic'] as PieceSet[]).map((set) => (
          <Choice
            key={set}
            active={settings.pieceSet === set}
            onClick={() => saveSettings({ pieceSet: set })}
          >
            {set === 'poster' ? 'Poster (red)' : 'Classic'}
          </Choice>
        ))}
      </div>

      <div className="mt-6 text-[11px] font-extrabold uppercase tracking-widest text-muted">
        Sound
      </div>
      <div className="mt-2 flex gap-2">
        <Choice active={settings.sound} onClick={() => saveSettings({ sound: true })}>
          On
        </Choice>
        <Choice active={!settings.sound} onClick={() => saveSettings({ sound: false })}>
          Off
        </Choice>
      </div>

      <div className="mt-8 text-[11px] font-extrabold uppercase tracking-widest text-muted">
        Progress data
      </div>
      <div className="mt-2 flex flex-col gap-3">
        <button
          onClick={download}
          className="min-h-[52px] bg-ink font-extrabold uppercase tracking-wide text-cream shadow-[4px_4px_0_#c53024]"
        >
          Export as JSON
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="min-h-[52px] border-[3px] border-ink font-extrabold uppercase tracking-wide"
        >
          Import from JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => onImportFile(e.target.files?.[0])}
        />
        <button
          onClick={reset}
          className="min-h-[52px] border-[3px] border-red font-extrabold uppercase tracking-wide text-red"
        >
          Reset progress
        </button>
      </div>

      {message && (
        <div className="mt-4 flex items-start gap-3 border-[3px] border-ink bg-panel p-4">
          <div
            className={`mt-1 h-3 w-3 shrink-0 ${message.tone === 'error' ? 'bg-red' : 'bg-ink'}`}
          />
          <div className="text-[15px] font-medium leading-snug">{message.text}</div>
        </div>
      )}

      <div className="mt-8 text-[13px] leading-snug text-muted">
        Importing replaces the stored review schedule with the file's. Appearance and
        sound settings live on this device and aren't part of the export.
      </div>
    </div>
  )
}
