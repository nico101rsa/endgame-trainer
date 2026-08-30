import { useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BackHeader } from '../components/BackHeader'
import { piecesFor, squareStylesFor } from '../board/theme'
import { getLesson } from '../content/loader'
import { movesFromRecord } from '../journal/pgn'
import { removeGame, updateJournal, upsertGame } from '../journal/store'
import { useJournal } from '../journal/useJournal'
import { resultLabel } from '../journal/types'
import { useSettings } from '../settings/useSettings'

export function JournalGame() {
  const { id } = useParams()
  const navigate = useNavigate()
  const settings = useSettings()
  const data = useJournal()
  const game = data.games.find((g) => g.id === id)

  const [step, setStep] = useState(0) // half-moves played
  const [noteDraft, setNoteDraft] = useState('')

  const frames = useMemo(() => {
    if (!game) return []
    const g = new Chess()
    const out = [{ fen: g.fen(), lastMove: null as { from: string; to: string } | null, san: '' }]
    try {
      for (const san of movesFromRecord(game)) {
        const m = g.move(san)
        out.push({ fen: g.fen(), lastMove: { from: m.from, to: m.to }, san: m.san })
      }
    } catch {
      // Malformed stored PGN — show what replayed.
    }
    return out
  }, [game])

  if (!game) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pt-12">
        <BackHeader to="/journal" label="Game not found" />
      </div>
    )
  }

  const frame = frames[Math.min(step, frames.length - 1)]
  const label = resultLabel(game.result, game.colour)
  const comment = step > 0 ? game.notes.moveComments[String(step)] : undefined
  const moveLabel = step === 0 ? 'Start' : `${Math.ceil(step / 2)}${step % 2 ? '.' : '…'} ${frame.san}`

  function saveNote() {
    const text = noteDraft.trim()
    const moveComments = { ...game!.notes.moveComments }
    if (text) moveComments[String(step)] = text
    else delete moveComments[String(step)]
    updateJournal((d) => upsertGame(d, { ...game!, notes: { ...game!.notes, moveComments } }))
    setNoteDraft('')
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-12 pb-10">
      <BackHeader to="/journal" label={game.date} />

      <div className="mt-4 px-1">
        <h1 className="font-display text-3xl uppercase leading-none">
          {label}
          <span className="text-red">.</span>{' '}
          <span className="text-muted">vs {game.opponent || 'Unknown'}</span>
        </h1>
        <div className="mt-2 text-[11px] font-bold uppercase tracking-wide text-muted">
          {game.colour === 'w' ? 'White' : 'Black'} · {game.result}
          {game.opening ? ` · ${game.opening}` : ''}
          {game.event ? ` · ${game.event}` : ''}
          {game.timeControl ? ` · ${game.timeControl}` : ''}
        </div>
      </div>

      {frames.length > 1 ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="border-[3px] border-ink bg-ink shadow-[5px_5px_0_#1a170f]">
            <Chessboard
              options={{
                position: frame.fen,
                boardOrientation: game.colour === 'w' ? 'white' : 'black',
                ...squareStylesFor(settings.boardTheme),
                pieces: piecesFor(settings.pieceSet),
                squareStyles: frame.lastMove
                  ? {
                      [frame.lastMove.from]: { boxShadow: 'inset 0 0 0 3px #c53024' },
                      [frame.lastMove.to]: { boxShadow: 'inset 0 0 0 3px #c53024' },
                    }
                  : {},
                allowDragging: false,
                animationDurationInMs: 120,
              }}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="min-h-[44px] flex-1 border-[3px] border-ink font-extrabold uppercase tracking-wide disabled:opacity-40"
            >
              Prev
            </button>
            <div className="min-w-20 text-center text-[13px] font-extrabold tabular-nums">
              {moveLabel}
            </div>
            <button
              onClick={() => setStep((s) => Math.min(frames.length - 1, s + 1))}
              disabled={step === frames.length - 1}
              className="min-h-[44px] flex-1 bg-ink font-extrabold uppercase tracking-wide text-cream shadow-[3px_3px_0_#c53024] disabled:opacity-40 disabled:shadow-none"
            >
              Next
            </button>
          </div>
          {comment && (
            <div className="flex items-start gap-3 border-[3px] border-ink bg-panel p-3">
              <div className="mt-1 h-3 w-3 shrink-0 bg-red" />
              <div className="text-[14px] font-medium leading-snug">{comment}</div>
            </div>
          )}
          {step > 0 && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                saveNote()
              }}
            >
              <input
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder={comment ? 'Replace note for this move…' : 'Note for this move…'}
                className="min-h-[40px] min-w-0 flex-1 border-[3px] border-ink bg-panel px-3 text-[13px] font-bold placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-red"
              />
              <button
                type="submit"
                className="min-h-[40px] border-[3px] border-ink px-3 text-[11px] font-extrabold uppercase tracking-wide"
              >
                Save
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-3 border-[3px] border-ink bg-panel p-4">
          <div className="mt-1 h-3 w-3 shrink-0 bg-ink" />
          <div className="text-[15px] font-medium leading-snug">
            No moves recorded for this game — edit it to play them in or paste PGN.
          </div>
        </div>
      )}

      {(game.notes.summary ||
        game.notes.turningPoint ||
        game.notes.whatDecidedIt ||
        game.notes.lessons) && (
        <div className="mt-6 flex flex-col gap-3">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted">
            Post-mortem
          </div>
          {game.notes.summary && (
            <div className="text-[15px] font-medium leading-snug">{game.notes.summary}</div>
          )}
          {game.notes.turningPoint && (
            <div className="text-[14px] leading-snug">
              <span className="font-extrabold uppercase text-[11px] tracking-widest">
                Turning point:{' '}
              </span>
              {game.notes.turningPoint}
            </div>
          )}
          {game.notes.whatDecidedIt && (
            <div className="text-[14px] leading-snug">
              <span className="font-extrabold uppercase text-[11px] tracking-widest">
                Decided by:{' '}
              </span>
              {game.notes.whatDecidedIt}
            </div>
          )}
          {game.notes.lessons && (
            <div className="text-[14px] leading-snug">
              <span className="font-extrabold uppercase text-[11px] tracking-widest">
                Lessons:{' '}
              </span>
              {game.notes.lessons}
            </div>
          )}
        </div>
      )}

      {(game.tags.length > 0 || game.endgameType || game.phaseReached) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {game.phaseReached && (
            <span className="border-2 border-ink px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest">
              reached {game.phaseReached}
            </span>
          )}
          {game.endgameType && (
            <span className="border-2 border-ink px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest">
              {game.endgameType}
            </span>
          )}
          {game.tags.map((t) => (
            <span
              key={t}
              className="border-2 border-ink px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-muted"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {game.linkedLessons.length > 0 && (
        <div className="mt-6 flex flex-col gap-2">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted">
            Study material
          </div>
          {game.linkedLessons.map((slug) => {
            const lesson = getLesson(slug)
            return lesson ? (
              <Link
                key={slug}
                to={`/lesson/${slug}`}
                className="flex min-h-[44px] items-center border-[3px] border-ink bg-panel px-4 text-[14px] font-extrabold"
              >
                {lesson.title} →
              </Link>
            ) : null
          })}
        </div>
      )}

      <div className="mt-8 flex gap-3">
        <Link
          to={`/journal/${game.id}/edit`}
          className="flex min-h-[48px] flex-1 items-center justify-center border-[3px] border-ink font-extrabold uppercase tracking-wide"
        >
          Edit
        </Link>
        <button
          onClick={() => {
            if (!window.confirm('Delete this game from the journal?')) return
            updateJournal((d) => removeGame(d, game.id))
            navigate('/journal', { replace: true })
          }}
          className="min-h-[48px] flex-1 border-[3px] border-red font-extrabold uppercase tracking-wide text-red"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
