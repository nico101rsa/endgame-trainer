import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Link } from 'react-router-dom'
import type { PositionData, Solution } from '../engine/solutionTree'
import { applyMove, startAttempt } from '../engine/solutionTree'
import type { Cursor } from '../engine/solutionTree'
import type { Grade } from '../progress/srs'
import { gradePosition, updateProgress } from '../progress/store'

type Status = 'playing' | 'replying' | 'showing' | 'solved'

type Feedback = { tone: 'wrong' | 'info'; text: string } | null

const REPLY_DELAY_MS = 450
const SOLUTION_STEP_MS = 600

// The first-authored branch at every node is the main line (CONTENT_GUIDE
// orders alternatives after it); the validator guarantees it terminates.
function mainLine(solution: Solution): string[] {
  const sans: string[] = []
  let moves = solution.moves
  for (;;) {
    const san = Object.keys(moves)[0]
    if (!san) break
    const node = moves[san]
    sans.push(san)
    if (node.result || !node.reply) break
    sans.push(node.reply)
    moves = node.moves ?? {}
  }
  return sans
}

export function TestRunner({
  position,
  nextTo,
  lessonTo,
  onGraded,
  onNext,
}: {
  position: PositionData
  nextTo?: string
  lessonTo?: string
  // Review mode: called once with the self-assigned grade, and the solved
  // panel offers an onNext button instead of route links.
  onGraded?: (grade: Grade) => void
  onNext?: () => void
}) {
  const gameRef = useRef(new Chess(position.fen))
  const [fen, setFen] = useState(position.fen)
  const [cursor, setCursor] = useState<Cursor>(() => startAttempt(position.solution))
  const [status, setStatus] = useState<Status>('playing')
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [wrongMoves, setWrongMoves] = useState(0)
  const [solutionShown, setSolutionShown] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)

  const gradedRef = useRef(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timersRef.current.forEach(clearTimeout), [])

  const hints = position.solution.hints ?? []
  const playerLabel = position.playerSide === 'w' ? 'White' : 'Black'

  function later(fn: () => void, ms: number) {
    timersRef.current.push(setTimeout(fn, ms))
  }

  // Spec §5: positions grade themselves once per visit — clean solve = Good,
  // hinted = Hard, any wrong move or the solution shown = Again. Restarting
  // doesn't wipe the slate; the first pass through is what gets scheduled.
  function recordGrade(grade: Grade) {
    if (gradedRef.current) return
    gradedRef.current = true
    updateProgress((data, today) => gradePosition(data, position.id, grade, today))
    onGraded?.(grade)
  }

  function restart() {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    gameRef.current = new Chess(position.fen)
    setFen(position.fen)
    setCursor(startAttempt(position.solution))
    setStatus('playing')
    setFeedback(null)
    setSelected(null)
    setLastMove(null)
  }

  function showSolution() {
    if (status === 'showing' || status === 'solved') return
    recordGrade('again')
    setSolutionShown(true)
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    const game = new Chess(position.fen)
    gameRef.current = game
    setFen(position.fen)
    setLastMove(null)
    setSelected(null)
    setFeedback(null)
    setStatus('showing')
    const line = mainLine(position.solution)
    line.forEach((san, i) => {
      later(() => {
        const move = game.move(san)
        setFen(game.fen())
        setLastMove({ from: move.from, to: move.to })
        if (i === line.length - 1) setStatus('solved')
      }, SOLUTION_STEP_MS * (i + 1))
    })
  }

  function tryPlayerMove(from: string, to: string): boolean {
    if (status !== 'playing') return false
    const game = gameRef.current
    let move
    try {
      move = game.move({ from, to, promotion: 'q' })
    } catch {
      return false
    }
    setSelected(null)

    const outcome = applyMove(cursor, move.san)
    if (outcome.kind === 'wrong' || outcome.kind === 'unknown') {
      game.undo()
      setWrongMoves((n) => n + 1)
      setFeedback({
        tone: 'wrong',
        text:
          outcome.kind === 'wrong'
            ? outcome.feedback
            : "That doesn't hold — try again.",
      })
      return false
    }

    setFen(game.fen())
    setLastMove({ from, to })
    setFeedback(null)

    if (outcome.kind === 'complete') {
      setStatus('solved')
      recordGrade(wrongMoves > 0 ? 'again' : hintsUsed > 0 ? 'hard' : 'good')
      return true
    }

    if (outcome.reply) {
      setStatus('replying')
      const reply = outcome.reply
      later(() => {
        const replyMove = game.move(reply)
        setFen(game.fen())
        setLastMove({ from: replyMove.from, to: replyMove.to })
        setStatus('playing')
      }, REPLY_DELAY_MS)
    }
    setCursor(outcome.next)
    return true
  }

  function onSquareClick({ square }: { piece: unknown; square: string }) {
    if (status !== 'playing') return
    const game = gameRef.current
    if (selected && selected !== square) {
      const legal = game
        .moves({ square: selected as never, verbose: true })
        .some((m) => m.to === square)
      if (legal) {
        tryPlayerMove(selected, square)
        return
      }
    }
    const piece = game.get(square as never)
    if (piece && piece.color === position.playerSide) {
      setSelected(square)
    } else {
      setSelected(null)
    }
  }

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {}
    if (lastMove) {
      styles[lastMove.from] = { boxShadow: 'inset 0 0 0 3px #1a170f' }
      styles[lastMove.to] = { boxShadow: 'inset 0 0 0 3px #1a170f' }
    }
    if (selected) {
      styles[selected] = { boxShadow: 'inset 0 0 0 3px #c53024' }
      for (const m of gameRef.current.moves({ square: selected as never, verbose: true })) {
        styles[m.to] = {
          ...styles[m.to],
          backgroundImage: 'radial-gradient(circle, rgba(197,48,36,0.55) 22%, transparent 24%)',
        }
      }
    }
    return styles
  }, [selected, lastMove, fen]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-4">
      <div className="px-1">
        <div className="font-display text-4xl uppercase leading-none">
          {playerLabel} to {position.goal}
          <span className="text-red">.</span>
        </div>
      </div>

      <div className="border-[3px] border-ink bg-ink shadow-[7px_7px_0_#1a170f]">
        <Chessboard
          options={{
            position: fen,
            boardOrientation: position.playerSide === 'w' ? 'white' : 'black',
            darkSquareStyle: { backgroundColor: '#4a4232' },
            lightSquareStyle: { backgroundColor: '#f7efdd' },
            squareStyles,
            allowDragging: status === 'playing',
            onPieceDrop: ({ sourceSquare, targetSquare }) =>
              targetSquare ? tryPlayerMove(sourceSquare, targetSquare) : false,
            onSquareClick,
            animationDurationInMs: 150,
          }}
        />
      </div>

      {status === 'solved' ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3 border-[3px] border-ink bg-panel p-4">
            <div className="mt-1 h-3 w-3 shrink-0 bg-red" />
            <div className="text-[15px] font-medium leading-snug">
              <span className="font-extrabold uppercase">
                {solutionShown ? 'The idea. ' : 'Solved. '}
              </span>
              {position.explanationAfter}
            </div>
          </div>
          {onNext ? (
            <button
              onClick={onNext}
              className="flex min-h-[52px] items-center justify-center bg-ink font-extrabold uppercase tracking-wide text-cream shadow-[4px_4px_0_#c53024]"
            >
              Next
            </button>
          ) : nextTo ? (
            <Link
              to={nextTo}
              className="flex min-h-[52px] items-center justify-center bg-ink font-extrabold uppercase tracking-wide text-cream shadow-[4px_4px_0_#c53024]"
            >
              Next position
            </Link>
          ) : lessonTo ? (
            <Link
              to={lessonTo}
              className="flex min-h-[52px] items-center justify-center bg-ink font-extrabold uppercase tracking-wide text-cream shadow-[4px_4px_0_#c53024]"
            >
              Back to lesson
            </Link>
          ) : null}
          <button
            onClick={restart}
            className="min-h-[52px] border-[3px] border-ink font-extrabold uppercase tracking-wide"
          >
            Play it again
          </button>
        </div>
      ) : status === 'showing' ? (
        <div className="flex min-h-[76px] items-start gap-3 border-[3px] border-ink bg-panel p-4">
          <div className="mt-1 h-3 w-3 shrink-0 bg-ink" />
          <div className="text-[15px] font-medium leading-snug">
            Watch — the main line plays out.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex min-h-[76px] items-start gap-3 border-[3px] border-ink bg-panel p-4">
            <div
              className={`mt-1 h-3 w-3 shrink-0 ${feedback?.tone === 'wrong' ? 'bg-red' : 'bg-ink'}`}
            />
            <div className="flex flex-col gap-2 text-[15px] font-medium leading-snug">
              <div>
                {feedback ? feedback.text : hintsUsed > 0 ? hints[hintsUsed - 1] : position.intro}
              </div>
              {feedback?.tone === 'wrong' && lessonTo && (
                <Link
                  to={lessonTo}
                  className="text-[11px] font-extrabold uppercase tracking-widest text-red underline underline-offset-2"
                >
                  Re-read the idea
                </Link>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setHintsUsed((n) => Math.min(n + 1, hints.length))}
              disabled={hintsUsed >= hints.length}
              className="min-h-[52px] flex-1 bg-ink font-extrabold uppercase tracking-wide text-cream shadow-[4px_4px_0_#c53024] disabled:opacity-40 disabled:shadow-none"
            >
              Hint {hints.length > 0 ? `${Math.min(hintsUsed + 1, hints.length)}/${hints.length}` : ''}
            </button>
            <button
              onClick={restart}
              className="min-h-[52px] flex-1 border-[3px] border-ink font-extrabold uppercase tracking-wide"
            >
              Restart
            </button>
          </div>
          <button
            onClick={showSolution}
            className="min-h-[44px] border-[3px] border-ink text-[13px] font-extrabold uppercase tracking-wide text-muted"
          >
            Show solution — counts as failed
          </button>
        </div>
      )}
    </div>
  )
}
