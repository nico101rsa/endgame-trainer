import { useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { Demo } from '../content/types'
import { piecesFor, squareStylesFor } from '../board/theme'
import { useSettings } from '../settings/useSettings'

// Step-through demo board (spec §6): both sides' moves are scripted; the
// player pages through them with Prev/Next and reads the note per move.
export function DemoPlayer({ demo }: { demo: Demo }) {
  const settings = useSettings()
  const [step, setStep] = useState(0) // 0 = initial position, N = after N moves

  const frames = useMemo(() => {
    const game = new Chess(demo.fen)
    const out = [{ fen: demo.fen, lastMove: null as { from: string; to: string } | null }]
    for (const s of demo.steps) {
      const m = game.move(s.move)
      out.push({ fen: game.fen(), lastMove: { from: m.from, to: m.to } })
    }
    return out
  }, [demo])

  const frame = frames[step]
  const note = step === 0 ? demo.intro : demo.steps[step - 1].note
  const moveLabel = step === 0 ? 'Start' : demo.steps[step - 1].move

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {}
    if (frame.lastMove) {
      styles[frame.lastMove.from] = { boxShadow: 'inset 0 0 0 3px #c53024' }
      styles[frame.lastMove.to] = { boxShadow: 'inset 0 0 0 3px #c53024' }
    }
    return styles
  }, [frame])

  return (
    <div className="flex flex-col gap-3">
      <div className="border-[3px] border-ink bg-ink shadow-[5px_5px_0_#1a170f]">
        <Chessboard
          options={{
            position: frame.fen,
            boardOrientation: demo.orientation === 'w' ? 'white' : 'black',
            ...squareStylesFor(settings.boardTheme),
            pieces: piecesFor(settings.pieceSet),
            squareStyles,
            allowDragging: false,
            animationDurationInMs: 150,
          }}
        />
      </div>
      <div className="flex min-h-[76px] items-start gap-3 border-[3px] border-ink bg-panel p-4">
        <div className="mt-0.5 shrink-0 bg-ink px-2 py-0.5 font-display text-sm text-cream">
          {moveLabel}
        </div>
        <div className="text-[15px] font-medium leading-snug">{note}</div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="min-h-[48px] flex-1 border-[3px] border-ink font-extrabold uppercase tracking-wide disabled:opacity-40"
        >
          Prev
        </button>
        <div className="min-w-14 text-center text-sm font-extrabold tabular-nums">
          {step}/{demo.steps.length}
        </div>
        <button
          onClick={() => setStep((s) => Math.min(frames.length - 1, s + 1))}
          disabled={step === frames.length - 1}
          className="min-h-[48px] flex-1 bg-ink font-extrabold uppercase tracking-wide text-cream shadow-[4px_4px_0_#c53024] disabled:opacity-40 disabled:shadow-none"
        >
          Next
        </button>
      </div>
    </div>
  )
}
