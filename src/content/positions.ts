import type { PositionData } from '../engine/solutionTree'

// Milestone 1: one hand-authored position, straight from the spec (§5).
// The full content pipeline (/content JSON + markdown) lands in Milestone 2.
export const oppositionPosition: PositionData = {
  id: 't1-opposition-03',
  tier: 1,
  lesson: 'king-opposition',
  title: 'Take the opposition',
  fen: '8/8/4k3/8/4K3/4P3/8/8 w - - 0 1',
  sideToMove: 'w',
  goal: 'win',
  playerSide: 'w',
  intro: 'White to play. Use the opposition to escort the pawn.',
  solution: {
    moves: {
      Kd4: {
        reply: 'Kd6',
        moves: {
          e4: { reply: 'Ke6', moves: { Kc5: { result: 'win' } } },
        },
      },
      Kf4: {
        reply: 'Kf6',
        moves: {
          e4: { reply: 'Ke6', moves: { Kg5: { result: 'win' } } },
        },
      },
    },
    wrong: {
      Kd3: 'Retreating gives up the opposition.',
      Kf3: "Retreating gives up the opposition — Black's king walks forward.",
    },
    hints: [
      "Which square puts your king directly in front of Black's king with one square between?",
      'Kd4 or Kf4 both take the opposition.',
    ],
  },
  explanationAfter:
    'Whenever the kings face each other with one square between, the side NOT to move has the opposition.',
}
