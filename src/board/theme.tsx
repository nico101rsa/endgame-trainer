import type { CSSProperties, JSX } from 'react'
import type { BoardTheme, PieceSet } from '../settings/store'

// Board square palettes (spec §6: 2–3 themes). Parchment is the design
// canvas original; the others keep the same contrast ratios.
export const BOARD_THEMES: Record<BoardTheme, { label: string; dark: string; light: string }> = {
  parchment: { label: 'Parchment', dark: '#4a4232', light: '#f7efdd' },
  slate: { label: 'Slate', dark: '#40505a', light: '#e8ecec' },
  tournament: { label: 'Tournament', dark: '#5a7247', light: '#f2ecd0' },
}

export function squareStylesFor(theme: BoardTheme): {
  darkSquareStyle: CSSProperties
  lightSquareStyle: CSSProperties
} {
  const t = BOARD_THEMES[theme]
  return {
    darkSquareStyle: { backgroundColor: t.dark },
    lightSquareStyle: { backgroundColor: t.light },
  }
}

// The "poster" piece set from the settled design direction: bold filled
// glyphs, red army vs ink army, cream halo for contrast on dark squares.
// SVG text scales with the square, so no size bookkeeping is needed.
const GLYPHS: Record<string, string> = {
  K: '♚',
  Q: '♛',
  R: '♜',
  B: '♝',
  N: '♞',
  P: '♟',
}

function Glyph({ code }: { code: string }): JSX.Element {
  const side = code[0] as 'w' | 'b'
  const glyph = GLYPHS[code[1]]
  return (
    <svg viewBox="0 0 45 45" style={{ width: '100%', height: '100%' }}>
      <text
        x="22.5"
        y="36"
        textAnchor="middle"
        fontSize="34"
        paintOrder="stroke"
        stroke="#f7efdd"
        strokeWidth="2.2"
        strokeLinejoin="round"
        fill={side === 'w' ? '#c53024' : '#1a170f'}
      >
        {glyph}
      </text>
    </svg>
  )
}

const posterPieces = Object.fromEntries(
  ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'].map((code) => [
    code,
    () => <Glyph code={code} />,
  ]),
)

// react-chessboard falls back to its built-in SVG set when `pieces` is
// undefined — that's the "classic" option.
export function piecesFor(set: PieceSet) {
  return set === 'poster' ? posterPieces : undefined
}
