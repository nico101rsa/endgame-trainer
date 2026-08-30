import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BackHeader } from '../components/BackHeader'
import { journalToPgn } from '../journal/pgn'
import { exportJournal, importJournal, loadJournal, tallies } from '../journal/store'
import { reconcileImport } from '../sync/engine'
import { useJournal } from '../journal/useJournal'
import type { GameRecord } from '../journal/types'
import { resultLabel } from '../journal/types'

type ResultFilter = 'all' | 'Win' | 'Loss' | 'Draw'
type ColourFilter = 'all' | 'w' | 'b'

function download(name: string, text: string, type: string) {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

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
      onClick={onClick}
      className={`min-h-[36px] border-2 border-ink px-2.5 text-[11px] font-extrabold uppercase tracking-wide ${
        active ? 'bg-ink text-cream' : ''
      }`}
    >
      {children}
    </button>
  )
}

export function Journal() {
  const data = useJournal()
  const [result, setResult] = useState<ResultFilter>('all')
  const [colour, setColour] = useState<ColourFilter>('all')
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const games = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...data.games]
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
      .filter((g) => result === 'all' || resultLabel(g.result, g.colour) === result)
      .filter((g) => colour === 'all' || g.colour === colour)
      .filter(
        (g) =>
          !q ||
          [g.opponent, g.event, g.venue, g.opening, g.endgameType, g.notes.whatDecidedIt, ...g.tags]
            .join(' ')
            .toLowerCase()
            .includes(q),
      )
  }, [data, result, colour, query])

  const t = useMemo(() => tallies(data.games), [data])

  function row(g: GameRecord) {
    const label = resultLabel(g.result, g.colour)
    return (
      <Link
        key={g.id}
        to={`/journal/${g.id}`}
        className="flex items-stretch border-[3px] border-ink bg-panel shadow-[4px_4px_0_#1a170f]"
      >
        <div
          className={`flex w-14 items-center justify-center font-display text-lg ${
            label === 'Win'
              ? 'bg-red text-cream'
              : label === 'Loss'
                ? 'bg-ink text-cream'
                : 'border-r-[3px] border-ink bg-panel text-ink'
          }`}
        >
          {label === '—' ? '·' : label[0]}
        </div>
        <div className="flex flex-1 flex-col gap-0.5 px-4 py-2.5">
          <div className="text-[15px] font-extrabold">
            {g.colour === 'w' ? '⬤' : '◯'} vs {g.opponent || 'Unknown'}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
            {g.date}
            {g.opening ? ` · ${g.opening}` : ''}
            {g.event ? ` · ${g.event}` : ''}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-12 pb-10">
      <BackHeader to="/" label="Journal" />

      <div className="mt-4 px-1">
        <h1 className="font-display text-4xl uppercase leading-none">
          Game journal<span className="text-red">.</span>
        </h1>
        <div className="mt-2 text-[13px] font-bold uppercase tracking-wide text-muted">
          Your games, your words — no engines, no numbers
        </div>
      </div>

      <Link
        to="/journal/new"
        className="mt-5 flex min-h-[52px] items-center justify-center bg-ink font-extrabold uppercase tracking-wide text-cream shadow-[4px_4px_0_#c53024]"
      >
        New game
      </Link>

      {data.games.length > 0 && (
        <>
          <div className="mt-6 flex gap-3">
            {(
              [
                ['Played', t.played],
                ['Wins', t.wins],
                ['Draws', t.draws],
                ['Losses', t.losses],
              ] as const
            ).map(([label, n]) => (
              <div
                key={label}
                className="flex flex-1 flex-col items-center gap-1 border-[3px] border-ink bg-panel py-2.5"
              >
                <div className="font-display text-2xl">{n}</div>
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-muted">
                  {label}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 px-1 text-[11px] font-bold uppercase tracking-wide text-muted">
            White {t.asWhite.wins}-{t.asWhite.draws}-{t.asWhite.losses} · Black {t.asBlack.wins}-
            {t.asBlack.draws}-{t.asBlack.losses}
            {t.byDecider.length > 0 &&
              ` · decided by ${t.byDecider.map(([k, n]) => `${k} ×${n}`).join(', ')}`}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(['all', 'Win', 'Loss', 'Draw'] as const).map((r) => (
              <Chip key={r} active={result === r} onClick={() => setResult(r)}>
                {r === 'all' ? 'All results' : r + 's'}
              </Chip>
            ))}
            {(['all', 'w', 'b'] as const).map((c) => (
              <Chip key={c} active={colour === c} onClick={() => setColour(c)}>
                {c === 'all' ? 'Both colours' : c === 'w' ? 'White' : 'Black'}
              </Chip>
            ))}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search opponent, event, opening, tags…"
            className="mt-3 min-h-[44px] border-[3px] border-ink bg-panel px-3 text-[14px] font-bold placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-red"
          />
        </>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {games.map(row)}
        {games.length === 0 && (
          <div className="flex items-start gap-3 border-[3px] border-ink bg-panel p-4">
            <div className="mt-1 h-3 w-3 shrink-0 bg-ink" />
            <div className="text-[15px] font-medium leading-snug">
              {data.games.length === 0
                ? 'No games yet. Play one over the board, then write it down here.'
                : 'Nothing matches those filters.'}
            </div>
          </div>
        )}
      </div>

      {data.games.length > 0 && (
        <div className="mt-8 flex flex-col gap-2">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted">
            Export / import
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => download('endgame-journal.json', exportJournal(), 'application/json')}
              className="min-h-[44px] flex-1 border-[3px] border-ink text-[12px] font-extrabold uppercase tracking-wide"
            >
              JSON
            </button>
            <button
              onClick={() =>
                download('endgame-journal.pgn', journalToPgn(data.games), 'application/x-chess-pgn')
              }
              className="min-h-[44px] flex-1 border-[3px] border-ink text-[12px] font-extrabold uppercase tracking-wide"
            >
              PGN
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="min-h-[44px] flex-1 border-[3px] border-ink text-[12px] font-extrabold uppercase tracking-wide"
            >
              Import
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const previousIds = loadJournal().games.map((g) => g.id)
                importJournal(await file.text())
                // The import is the desired journal: dropped games become
                // sync deletions, re-imported ones must not stay tombstoned.
                reconcileImport(previousIds, loadJournal().games.map((g) => g.id))
                setMessage('Journal imported.')
              } catch (err) {
                setMessage(err instanceof Error ? err.message : 'Import failed.')
              }
              if (fileRef.current) fileRef.current.value = ''
            }}
          />
          {message && <div className="text-[13px] font-medium">{message}</div>}
        </div>
      )}
    </div>
  )
}
