import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { useNavigate, useParams } from 'react-router-dom'
import { BackHeader } from '../components/BackHeader'
import { piecesFor, squareStylesFor } from '../board/theme'
import { lessons } from '../content/loader'
import { movesFromRecord, movesToPgn, parsePgn } from '../journal/pgn'
import {
  clearDraft,
  loadDraft,
  loadJournal,
  newGameId,
  saveDraft,
  suggestions,
  updateJournal,
  upsertGame,
} from '../journal/store'
import type { GameRecord, PhaseReached, WhatDecidedIt } from '../journal/types'
import { emptyNotes, resultFromLabel, resultLabel, WHAT_DECIDED_IT } from '../journal/types'
import { todayISO } from '../progress/srs'
import { useSettings } from '../settings/useSettings'

type FormState = Omit<GameRecord, 'id'> & { id?: string }

function blankForm(): FormState {
  const data = loadJournal()
  const last = [...data.games].sort((a, b) => b.date.localeCompare(a.date))[0]
  // Smart defaults (addendum §4): today, last venue/event/time control,
  // opposite colour to the previous game.
  return {
    date: todayISO(),
    event: last?.event ?? '',
    venue: last?.venue ?? '',
    timeControl: last?.timeControl ?? '',
    colour: last ? (last.colour === 'w' ? 'b' : 'w') : 'w',
    opponent: '',
    result: '*',
    opening: '',
    pgn: '',
    notes: emptyNotes(),
    phaseReached: '',
    endgameType: '',
    linkedLessons: [],
    tags: [],
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
        {label}
      </span>
      {children}
    </label>
  )
}

const inputCls =
  'min-h-[44px] border-[3px] border-ink bg-panel px-3 text-[14px] font-bold placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-red'

function Chip({
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
      type="button"
      onClick={onClick}
      className={`min-h-[40px] border-2 border-ink px-2.5 text-[11px] font-extrabold uppercase tracking-wide ${
        active ? 'bg-ink text-cream' : ''
      }`}
    >
      {children}
    </button>
  )
}

export function JournalEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const settings = useSettings()
  const isNew = !id

  // A half-entered new game is restored from the draft (addendum §4).
  const [form, setForm] = useState<FormState>(() => {
    if (id) {
      const existing = loadJournal().games.find((g) => g.id === id)
      if (existing) return existing
    }
    return loadDraft<FormState>() ?? blankForm()
  })
  const [draftRestored, setDraftRestored] = useState(() => isNew && loadDraft() !== null)
  const [entryMode, setEntryMode] = useState<'board' | 'pgn'>('board')
  const [pgnPaste, setPgnPaste] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [tagsText, setTagsText] = useState(form.tags.join(', '))

  // Draft autosave for new games only (addendum §4).
  const mounted = useRef(false)
  useEffect(() => {
    if (!isNew) return
    if (!mounted.current) {
      mounted.current = true
      return
    }
    saveDraft(form)
  }, [form, isNew])

  const data = useMemo(() => loadJournal(), [])
  const suggest = (field: keyof GameRecord) => suggestions(data, field)

  const moves = useMemo(() => {
    try {
      return movesFromRecord({ pgn: form.pgn } as GameRecord)
    } catch {
      return []
    }
  }, [form.pgn])

  const game = useMemo(() => {
    const g = new Chess()
    for (const m of moves) g.move(m)
    return g
  }, [moves])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function playMove(from: string, to: string): boolean {
    try {
      const g = new Chess()
      for (const m of moves) g.move(m)
      g.move({ from, to, promotion: 'q' })
      set('pgn', movesToPgn(g.history()))
      return true
    } catch {
      return false
    }
  }

  function usePastedPgn() {
    try {
      const parsed = parsePgn(pgnPaste)
      const pgnDate = parsed.headers.Date?.match(/^(\d{4})\.(\d{2})\.(\d{2})$/)
      setForm((f) => ({
        ...f,
        pgn: movesToPgn(parsed.moves),
        date: pgnDate ? `${pgnDate[1]}-${pgnDate[2]}-${pgnDate[3]}` : f.date,
        event: parsed.headers.Event ?? f.event,
        venue: parsed.headers.Site ?? f.venue,
        timeControl: parsed.headers.TimeControl ?? f.timeControl,
        opening: parsed.headers.Opening ?? f.opening,
        result: parsed.result !== '*' ? parsed.result : f.result,
      }))
      setError(null)
      setEntryMode('board')
    } catch (e) {
      setError(e instanceof Error ? 'PGN not accepted: ' + e.message : 'PGN not accepted.')
    }
  }

  function save() {
    const record: GameRecord = {
      ...form,
      id: form.id ?? newGameId(loadJournal(), form.date),
      tags: tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    }
    updateJournal((d) => upsertGame(d, record))
    if (isNew) clearDraft()
    navigate(`/journal/${record.id}`, { replace: true })
  }

  const label = resultLabel(form.result, form.colour)

  // Lesson suggestions from endgameType (addendum §4): plain word matching
  // against lesson names — never by analysing the position.
  const { suggestedLessons, sortedLessons } = useMemo(() => {
    const STOP = new Set(['and', 'the', 'with', 'versus', 'ending', 'endings'])
    const words = form.endgameType
      .toLowerCase()
      .split(/[^a-z]+/)
      .map((w) => w.replace(/s$/, ''))
      .filter((w) => w.length > 2 && !STOP.has(w))
    const score = (slug: string, title: string) =>
      words.filter((w) => `${slug} ${title}`.toLowerCase().includes(w)).length
    const scores = new Map(lessons.map((l) => [l.lesson, score(l.lesson, l.title)]))
    return {
      suggestedLessons: lessons.filter((l) => scores.get(l.lesson)! > 0).map((l) => l.lesson),
      sortedLessons: [...lessons].sort(
        (a, b) => scores.get(b.lesson)! - scores.get(a.lesson)!,
      ),
    }
  }, [form.endgameType])

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-12 pb-10">
      <BackHeader to="/journal" label={isNew ? 'New game' : 'Edit game'} />

      {draftRestored && (
        <div className="mt-3 flex items-center justify-between gap-3 border-[3px] border-ink bg-panel px-3 py-2">
          <div className="text-[13px] font-medium">Draft restored.</div>
          <button
            onClick={() => {
              clearDraft()
              setForm(blankForm())
              setTagsText('')
              setDraftRestored(false)
            }}
            className="text-[11px] font-extrabold uppercase tracking-widest text-red underline underline-offset-2"
          >
            Discard
          </button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field label="Date">
          <input
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Time control">
          <input
            list="tc-list"
            value={form.timeControl}
            onChange={(e) => set('timeControl', e.target.value)}
            placeholder="90+30"
            className={inputCls}
          />
          <datalist id="tc-list">
            {suggest('timeControl').map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3">
        <Field label="Event">
          <input
            list="event-list"
            value={form.event}
            onChange={(e) => set('event', e.target.value)}
            placeholder="Club championship, round 4"
            className={inputCls}
          />
          <datalist id="event-list">
            {suggest('event').map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>
        <Field label="Venue">
          <input
            list="venue-list"
            value={form.venue}
            onChange={(e) => set('venue', e.target.value)}
            className={inputCls}
          />
          <datalist id="venue-list">
            {suggest('venue').map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>
        <Field label="Opponent">
          <input
            list="opp-list"
            value={form.opponent}
            onChange={(e) => set('opponent', e.target.value)}
            className={inputCls}
          />
          <datalist id="opp-list">
            {suggest('opponent').map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>
        <Field label="Opening">
          <input
            list="opening-list"
            value={form.opening}
            onChange={(e) => set('opening', e.target.value)}
            placeholder="Queen's Gambit Declined"
            className={inputCls}
          />
          <datalist id="opening-list">
            {suggest('opening').map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
            My colour
          </span>
          <div className="flex gap-2">
            <Chip active={form.colour === 'w'} onClick={() => set('colour', 'w')}>
              White
            </Chip>
            <Chip active={form.colour === 'b'} onClick={() => set('colour', 'b')}>
              Black
            </Chip>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
            Result
          </span>
          <div className="flex gap-2">
            {(['Win', 'Draw', 'Loss'] as const).map((r) => (
              <Chip
                key={r}
                active={label === r}
                onClick={() => set('result', resultFromLabel(r, form.colour))}
              >
                {r[0]}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 text-[11px] font-extrabold uppercase tracking-widest text-muted">
        The moves
      </div>
      <div className="mt-2 flex gap-2">
        <Chip active={entryMode === 'board'} onClick={() => setEntryMode('board')}>
          Play them in
        </Chip>
        <Chip active={entryMode === 'pgn'} onClick={() => setEntryMode('pgn')}>
          Paste PGN
        </Chip>
      </div>
      {entryMode === 'board' ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="border-[3px] border-ink bg-ink shadow-[5px_5px_0_#1a170f]">
            <Chessboard
              options={{
                position: game.fen(),
                boardOrientation: form.colour === 'w' ? 'white' : 'black',
                ...squareStylesFor(settings.boardTheme),
                pieces: piecesFor(settings.pieceSet),
                allowDragging: true,
                onPieceDrop: ({ sourceSquare, targetSquare }) =>
                  targetSquare ? playMove(sourceSquare, targetSquare) : false,
                animationDurationInMs: 120,
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => set('pgn', movesToPgn(moves.slice(0, -1)))}
              disabled={moves.length === 0}
              className="min-h-[40px] border-[3px] border-ink px-3 text-[11px] font-extrabold uppercase tracking-wide disabled:opacity-40"
            >
              Undo
            </button>
            <div className="flex-1 text-[12px] font-bold leading-snug text-muted">
              {form.pgn || 'Drag the pieces for both sides — every move is checked for legality.'}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={pgnPaste}
            onChange={(e) => setPgnPaste(e.target.value)}
            rows={6}
            placeholder="Paste PGN here. Rating tags and engine annotations are stripped on import."
            className="border-[3px] border-ink bg-panel px-3 py-2 text-[13px] font-medium placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-red"
          />
          <button
            type="button"
            onClick={usePastedPgn}
            className="min-h-[44px] bg-ink text-[12px] font-extrabold uppercase tracking-wide text-cream shadow-[4px_4px_0_#c53024]"
          >
            Use this PGN
          </button>
        </div>
      )}
      {error && <div className="mt-2 text-[13px] font-bold text-red">{error}</div>}

      <div className="mt-6 text-[11px] font-extrabold uppercase tracking-widest text-muted">
        Post-mortem — your words
      </div>
      <div className="mt-2 flex flex-col gap-3">
        <Field label="Summary">
          <textarea
            value={form.notes.summary}
            onChange={(e) => set('notes', { ...form.notes, summary: e.target.value })}
            rows={3}
            placeholder="One paragraph on how the game went."
            className="border-[3px] border-ink bg-panel px-3 py-2 text-[13px] font-medium placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-red"
          />
        </Field>
        <Field label="Turning point">
          <input
            value={form.notes.turningPoint}
            onChange={(e) => set('notes', { ...form.notes, turningPoint: e.target.value })}
            placeholder="Move 23 — I let his rook in."
            className={inputCls}
          />
        </Field>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
            What decided it
          </span>
          <div className="flex flex-wrap gap-2">
            {WHAT_DECIDED_IT.map((w) => (
              <Chip
                key={w}
                active={form.notes.whatDecidedIt === w}
                onClick={() =>
                  set('notes', {
                    ...form.notes,
                    whatDecidedIt: form.notes.whatDecidedIt === w ? '' : (w as WhatDecidedIt),
                  })
                }
              >
                {w}
              </Chip>
            ))}
          </div>
        </div>
        <Field label="Lessons">
          <textarea
            value={form.notes.lessons}
            onChange={(e) => set('notes', { ...form.notes, lessons: e.target.value })}
            rows={2}
            placeholder="What I take from this game."
            className="border-[3px] border-ink bg-panel px-3 py-2 text-[13px] font-medium placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-red"
          />
        </Field>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
            Phase reached
          </span>
          <div className="flex flex-wrap gap-2">
            {(['opening', 'middlegame', 'endgame'] as PhaseReached[]).map((p) => (
              <Chip
                key={p}
                active={form.phaseReached === p}
                onClick={() => set('phaseReached', form.phaseReached === p ? '' : p)}
              >
                {p[0].toUpperCase()}
              </Chip>
            ))}
          </div>
        </div>
        <Field label="Endgame type">
          <input
            list="egtype-list"
            value={form.endgameType}
            onChange={(e) => set('endgameType', e.target.value)}
            placeholder="rook-and-pawns"
            className={inputCls}
          />
          <datalist id="egtype-list">
            {suggest('endgameType').map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Tags (comma separated)">
          <input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="time-trouble, endgame-loss"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="mt-6 text-[11px] font-extrabold uppercase tracking-widest text-muted">
        Linked lessons
        {suggestedLessons.length > 0 && (
          <span className="ml-2 text-red">— suggested first, from your endgame type</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {sortedLessons.map((lesson) => (
          <Chip
            key={lesson.lesson}
            active={form.linkedLessons.includes(lesson.lesson)}
            onClick={() =>
              set(
                'linkedLessons',
                form.linkedLessons.includes(lesson.lesson)
                  ? form.linkedLessons.filter((l) => l !== lesson.lesson)
                  : [...form.linkedLessons, lesson.lesson],
              )
            }
          >
            {lesson.title}
          </Chip>
        ))}
      </div>

      <button
        onClick={save}
        className="mt-8 flex min-h-[52px] items-center justify-center bg-ink font-extrabold uppercase tracking-wide text-cream shadow-[4px_4px_0_#c53024]"
      >
        Save game
      </button>
    </div>
  )
}
