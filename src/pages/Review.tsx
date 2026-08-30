import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BackHeader } from '../components/BackHeader'
import { PrincipleCard } from '../components/PrincipleCard'
import { TestRunner } from '../components/TestRunner'
import { getPosition, getPrincipleCard } from '../content/loader'
import type { Grade } from '../progress/srs'
import { todayISO } from '../progress/srs'
import { dueItemIds, gradeCard, loadProgress, updateProgress } from '../progress/store'

function shuffle<T>(input: T[]): T[] {
  const arr = [...input]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const GRADE_LABELS: { grade: Grade; label: string }[] = [
  { grade: 'again', label: 'Again' },
  { grade: 'hard', label: 'Hard' },
  { grade: 'good', label: 'Good' },
  { grade: 'easy', label: 'Easy' },
]

// Review mode (spec §6): everything due today — principle cards and test
// positions, shuffled, mixed across tiers. The queue is a snapshot taken at
// mount; grading reschedules items but the session works through the snapshot,
// then ends on a summary instead of dumping back to Home (spec §7).
export function Review() {
  const [queue] = useState<string[]>(() => {
    const data = loadProgress()
    return shuffle(
      dueItemIds(data, todayISO()).filter(
        (id) => getPosition(id) !== undefined || getPrincipleCard(id) !== undefined,
      ),
    )
  })
  const [index, setIndex] = useState(0)
  const [tally, setTally] = useState<Record<Grade, number>>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  })

  const reviewed = index
  const done = index >= queue.length

  function count(grade: Grade) {
    setTally((t) => ({ ...t, [grade]: t[grade] + 1 }))
  }

  if (queue.length === 0) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pt-12 pb-10">
        <BackHeader to="/" label="Review" />
        <div className="flex items-start gap-3 border-[3px] border-ink bg-panel p-4">
          <div className="mt-1 h-3 w-3 shrink-0 bg-ink" />
          <div className="text-[15px] font-medium leading-snug">
            Nothing due today. Read a lesson or solve a test to feed the queue.
          </div>
        </div>
        <Link
          to="/"
          className="flex min-h-[52px] items-center justify-center bg-ink font-extrabold uppercase tracking-wide text-cream shadow-[4px_4px_0_#c53024]"
        >
          Back home
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pt-12 pb-10">
        <BackHeader to="/" label="Review" />
        <div className="px-1">
          <h1 className="font-display text-4xl uppercase leading-none">
            Session done<span className="text-red">.</span>
          </h1>
          <div className="mt-2 text-[13px] font-bold uppercase tracking-wide text-muted">
            {reviewed} item{reviewed === 1 ? '' : 's'} reviewed
          </div>
        </div>
        <div className="flex gap-3">
          {GRADE_LABELS.map(({ grade, label }) => (
            <div
              key={grade}
              className="flex flex-1 flex-col items-center gap-1 border-[3px] border-ink bg-panel py-3"
            >
              <div className={`font-display text-2xl ${grade === 'again' ? 'text-red' : ''}`}>
                {tally[grade]}
              </div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
                {label}
              </div>
            </div>
          ))}
        </div>
        <Link
          to="/"
          className="flex min-h-[52px] items-center justify-center bg-ink font-extrabold uppercase tracking-wide text-cream shadow-[4px_4px_0_#c53024]"
        >
          Done
        </Link>
      </div>
    )
  }

  const id = queue[index]
  const asPosition = getPosition(id)
  const asCard = asPosition ? undefined : getPrincipleCard(id)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pt-12 pb-10 md:max-w-3xl">
      <BackHeader to="/" label={`Review · ${index + 1}/${queue.length}`} />
      {asPosition ? (
        <TestRunner
          key={id}
          position={asPosition.position}
          lessonTo={`/lesson/${asPosition.lesson.lesson}`}
          onGraded={count}
          onNext={() => setIndex((i) => i + 1)}
        />
      ) : asCard ? (
        <div className="flex flex-col gap-3">
          <div className="px-1 text-[11px] font-extrabold uppercase tracking-widest text-muted">
            {asCard.lesson.title}
          </div>
          <PrincipleCard
            key={id}
            card={asCard.card}
            onGrade={(grade) => {
              updateProgress((data, today) => gradeCard(data, id, grade, today))
              count(grade)
              setIndex((i) => i + 1)
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
