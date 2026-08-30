import type { PositionData } from '../engine/solutionTree'
import type { Lesson, LessonMeta, PrincipleCard } from './types'

// Build-time content loading (spec §8): every lesson is a JSON + MD pair in
// /content/tier<N>/. import.meta.glob with eager:true turns them into static
// imports, so the content ships in the bundle — no fetching, works offline.
const jsonFiles = import.meta.glob('../../content/*/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, LessonMeta>

const mdFiles = import.meta.glob('../../content/*/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

function buildLessons(): Lesson[] {
  const lessons: Lesson[] = []
  for (const [path, meta] of Object.entries(jsonFiles)) {
    const mdPath = path.replace(/\.json$/, '.md')
    const explanation = mdFiles[mdPath]
    if (explanation === undefined) {
      // The validator catches this at build time; guard anyway.
      throw new Error(`Missing explanation file for ${path}`)
    }
    lessons.push({ ...meta, explanation })
  }
  lessons.sort((a, b) => a.tier - b.tier || a.order - b.order)
  return lessons
}

export const lessons: Lesson[] = buildLessons()

export function lessonsForTier(tier: number): Lesson[] {
  return lessons.filter((l) => l.tier === tier)
}

export function getLesson(slug: string): Lesson | undefined {
  return lessons.find((l) => l.lesson === slug)
}

export function getPosition(id: string): { position: PositionData; lesson: Lesson } | undefined {
  for (const lesson of lessons) {
    const position = lesson.tests.find((t) => t.id === id)
    if (position) return { position, lesson }
  }
  return undefined
}

export function getPrincipleCard(
  id: string,
): { card: PrincipleCard; lesson: Lesson } | undefined {
  for (const lesson of lessons) {
    const card = lesson.principles.find((c) => c.id === id)
    if (card) return { card, lesson }
  }
  return undefined
}
