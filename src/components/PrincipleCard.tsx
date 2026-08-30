import { useState } from 'react'
import type { PrincipleCard as PrincipleCardData } from '../content/types'
import type { Grade } from '../progress/srs'

const GRADES: { grade: Grade; label: string }[] = [
  { grade: 'again', label: 'Again' },
  { grade: 'hard', label: 'Hard' },
  { grade: 'good', label: 'Good' },
  { grade: 'easy', label: 'Easy' },
]

// Tap-to-reveal flip card. On the lesson page it just flips; in the review
// queue the parent passes onGrade and the four Anki buttons appear after the
// reveal (spec §6 review mode).
export function PrincipleCard({
  card,
  onGrade,
}: {
  card: PrincipleCardData
  onGrade?: (grade: Grade) => void
}) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div className="flex w-full flex-col border-[3px] border-ink bg-panel">
      <button
        onClick={() => setRevealed((r) => !r)}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <div className={`mt-1 h-3 w-3 shrink-0 ${revealed ? 'bg-ink' : 'bg-red'}`} />
        <div className="flex flex-col gap-2 text-[15px] leading-snug">
          <div className="font-extrabold">{card.prompt}</div>
          {revealed ? (
            <div>{card.answer}</div>
          ) : (
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted">
              Tap to reveal
            </div>
          )}
        </div>
      </button>
      {onGrade && revealed && (
        <div className="flex gap-2 border-t-[3px] border-ink p-3">
          {GRADES.map(({ grade, label }) => (
            <button
              key={grade}
              onClick={() => onGrade(grade)}
              className={`min-h-[44px] flex-1 text-[12px] font-extrabold uppercase tracking-wide ${
                grade === 'again'
                  ? 'bg-red text-cream'
                  : 'border-[3px] border-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
