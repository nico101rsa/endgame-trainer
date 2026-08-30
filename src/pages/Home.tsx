import { Link } from 'react-router-dom'
import { lessonsForTier } from '../content/loader'

export function Home() {
  const tier1 = lessonsForTier(1)
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-14 pb-10">
      <div className="flex items-end gap-3">
        <h1 className="font-display text-5xl uppercase leading-none">Endgame</h1>
        <div className="mb-1 h-8 w-8 bg-red" />
      </div>
      <div className="mt-2 text-sm font-bold uppercase tracking-widest">
        School of the last phase
      </div>

      <div className="mt-10 text-[11px] font-extrabold uppercase tracking-widest text-muted">
        Tier 1 — Foundations
      </div>
      <div className="mt-2 flex flex-col gap-4">
        {tier1.map((lesson) => (
          <Link
            key={lesson.lesson}
            to={`/lesson/${lesson.lesson}`}
            className="flex items-stretch border-[3px] border-ink bg-panel shadow-[5px_5px_0_#1a170f]"
          >
            <div className="flex w-14 items-center justify-center bg-ink font-display text-2xl text-cream">
              {lesson.order}
            </div>
            <div className="flex flex-1 flex-col gap-1 px-4 py-3">
              <div className="font-extrabold">{lesson.title}</div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                {lesson.tagline}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
