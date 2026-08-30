import { useState } from 'react'
import type { PrincipleCard as PrincipleCardData } from '../content/types'

// Tap-to-reveal flip card. The SRS grading buttons arrive in Milestone 3;
// for now the card just flips.
export function PrincipleCard({ card }: { card: PrincipleCardData }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <button
      onClick={() => setRevealed((r) => !r)}
      className="flex w-full items-start gap-3 border-[3px] border-ink bg-panel p-4 text-left"
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
  )
}
