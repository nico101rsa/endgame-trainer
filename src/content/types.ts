import type { PositionData } from '../engine/solutionTree'

// Shapes for the lesson JSON files under /content — see CONTENT_GUIDE.md.
export type PrincipleCard = {
  id: string
  prompt: string
  answer: string
}

export type DemoStep = {
  move: string
  note: string
}

export type Demo = {
  id: string
  title: string
  fen: string
  orientation: 'w' | 'b'
  intro: string
  steps: DemoStep[]
}

export type LessonMeta = {
  lesson: string
  tier: number
  order: number
  title: string
  tagline: string
  // Tier scaffold stub (spec §9 milestone 4): fewer tests allowed, full
  // lesson arrives in a later milestone.
  scaffold?: boolean
  principles: PrincipleCard[]
  demos: Demo[]
  tests: PositionData[]
}

// A lesson as the app consumes it: JSON metadata + the markdown explanation.
export type Lesson = LessonMeta & {
  explanation: string
}
