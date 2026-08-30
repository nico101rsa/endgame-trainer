import { Link } from 'react-router-dom'
import { lessons, lessonsForTier, TIER_NAMES, tiers } from '../content/loader'
import { todayISO } from '../progress/srs'
import { dueItemIds, isPositionSolved } from '../progress/store'
import type { ProgressData } from '../progress/store'
import { useProgressData } from '../progress/useProgress'

// One tap resumes the next thing (spec §7 frictionless UI): due reviews if
// any, else the first unread lesson, else the first unsolved test.
function continueTarget(data: ProgressData, dueCount: number) {
  if (dueCount > 0) {
    return {
      to: '/review',
      kicker: 'Review',
      title: `${dueCount} item${dueCount === 1 ? '' : 's'} due today`,
    }
  }
  for (const lesson of lessons) {
    if (!data.lessons[lesson.lesson]) {
      return { to: `/lesson/${lesson.lesson}`, kicker: 'Next lesson', title: lesson.title }
    }
    const unsolved = lesson.tests.find((t) => !isPositionSolved(data, t.id))
    if (unsolved) {
      return { to: `/test/${unsolved.id}`, kicker: lesson.title, title: unsolved.title }
    }
  }
  return null
}

export function Home() {
  const data = useProgressData()
  const dueCount = dueItemIds(data, todayISO()).length
  const target = continueTarget(data, dueCount)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-14 pb-10">
      <div className="flex items-end gap-3">
        <h1 className="font-display text-5xl uppercase leading-none">Endgame</h1>
        <div className="mb-1 h-8 w-8 bg-red" />
      </div>
      <div className="mt-2 text-sm font-bold uppercase tracking-widest">
        School of the last phase
      </div>

      {target && (
        <Link
          to={target.to}
          className="mt-8 flex items-stretch border-[3px] border-ink bg-ink text-cream shadow-[5px_5px_0_#c53024]"
        >
          <div className="flex w-14 items-center justify-center bg-red font-display text-2xl">
            →
          </div>
          <div className="flex flex-1 flex-col gap-1 px-4 py-3">
            <div className="text-[11px] font-extrabold uppercase tracking-widest opacity-70">
              Continue — {target.kicker}
            </div>
            <div className="font-extrabold">{target.title}</div>
          </div>
        </Link>
      )}

      <div className="mt-3 flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-widest text-muted">
        <span>{dueCount > 0 ? `${dueCount} due today` : 'No reviews due'}</span>
        <Link to="/review" className="text-red underline underline-offset-2">
          Review
        </Link>
      </div>

      {tiers.map((tier) => (
        <div key={tier}>
          <div className="mt-8 text-[11px] font-extrabold uppercase tracking-widest text-muted">
            Tier {tier} — {TIER_NAMES[tier] ?? ''}
          </div>
          <div className="mt-2 flex flex-col gap-4">
            {lessonsForTier(tier).map((lesson) => {
              const solved = lesson.tests.filter((t) => isPositionSolved(data, t.id)).length
              return (
                <Link
                  key={lesson.lesson}
                  to={`/lesson/${lesson.lesson}`}
                  className="flex items-stretch border-[3px] border-ink bg-panel shadow-[5px_5px_0_#1a170f]"
                >
                  <div className="flex w-14 items-center justify-center bg-ink font-display text-2xl text-cream">
                    {lesson.order}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 px-4 py-3">
                    <div className="flex items-baseline gap-2">
                      <div className="font-extrabold">{lesson.title}</div>
                      {lesson.scaffold && (
                        <div className="border-2 border-red px-1 text-[9px] font-extrabold uppercase tracking-widest text-red">
                          Preview
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                      {lesson.tagline}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-2 flex-1 border-2 border-ink bg-cream">
                        <div
                          className="h-full bg-red"
                          style={{ width: `${(solved / lesson.tests.length) * 100}%` }}
                        />
                      </div>
                      <div className="text-[10px] font-extrabold tracking-widest text-muted">
                        {solved}/{lesson.tests.length}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ))}

      <div className="mt-10 flex justify-center">
        <Link
          to="/settings"
          className="text-[11px] font-extrabold uppercase tracking-widest text-muted underline underline-offset-2"
        >
          Settings
        </Link>
      </div>
    </div>
  )
}
