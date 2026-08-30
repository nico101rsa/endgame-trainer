// Build-time content validation (spec §5, §10). Run with: npm run validate
// Checks every lesson file pair under /content:
//   - FEN legality, SAN legality at every tree node, path termination
//     (via validateSolution from the engine — the same code the app uses)
//   - demo steps replay legally from their FEN
//   - lesson shape: counts, id conventions, id uniqueness, md pairing
// Exits non-zero on any problem so CI fails the build.
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { Chess } from 'chess.js'
import { validateSolution } from '../src/engine/solutionTree.ts'
import type { PositionData } from '../src/engine/solutionTree.ts'
import type { Demo, LessonMeta } from '../src/content/types.ts'

const contentDir = join(import.meta.dirname, '..', 'content')
const problems: string[] = []
const seenIds = new Set<string>()

function report(file: string, msg: string) {
  problems.push(`${file}: ${msg}`)
}

function claimId(file: string, id: string) {
  if (seenIds.has(id)) report(file, `duplicate id "${id}"`)
  seenIds.add(id)
}

function checkDemo(file: string, demo: Demo) {
  let game: Chess
  try {
    game = new Chess(demo.fen)
  } catch (e) {
    report(file, `demo ${demo.id}: illegal FEN (${String(e)})`)
    return
  }
  demo.steps.forEach((step, i) => {
    if (!step.note) report(file, `demo ${demo.id}: step ${i + 1} (${step.move}) has no note`)
    try {
      game.move(step.move)
    } catch {
      report(file, `demo ${demo.id}: step ${i + 1} "${step.move}" is not legal`)
    }
  })
}

function checkTest(file: string, test: PositionData, lessonSlug: string, tier: number) {
  claimId(file, test.id)
  if (test.lesson !== lessonSlug) {
    report(file, `test ${test.id}: lesson "${test.lesson}" doesn't match file lesson "${lessonSlug}"`)
  }
  if (test.tier !== tier) {
    report(file, `test ${test.id}: tier ${test.tier} doesn't match lesson tier ${tier}`)
  }
  for (const err of validateSolution(test.fen, test.solution)) {
    report(file, `test ${test.id}: ${err}`)
  }
  const wrong = test.solution.wrong ?? {}
  for (const san of Object.keys(wrong)) {
    if (test.solution.moves[san]) {
      report(file, `test ${test.id}: "${san}" is in both moves and wrong`)
    }
    if (!wrong[san] || wrong[san].length < 10) {
      report(file, `test ${test.id}: wrong-map feedback for "${san}" doesn't explain why (spec §10)`)
    }
  }
  if (test.needsReview && !test.reviewNote) {
    report(file, `test ${test.id}: needsReview without a reviewNote`)
  }
  const fenSide = test.fen.split(' ')[1]
  if (fenSide !== test.sideToMove) {
    report(file, `test ${test.id}: sideToMove "${test.sideToMove}" disagrees with FEN ("${fenSide}")`)
  }
}

function checkLesson(file: string, meta: LessonMeta, dirTier: number) {
  const slug = basename(file, '.json')
  if (meta.lesson !== slug) report(file, `lesson field "${meta.lesson}" doesn't match filename`)
  if (meta.tier !== dirTier) report(file, `tier ${meta.tier} doesn't match directory tier${dirTier}`)
  for (const field of ['title', 'tagline'] as const) {
    if (!meta[field]) report(file, `missing ${field}`)
  }
  if (!Number.isInteger(meta.order) || meta.order < 1) report(file, `order must be a positive integer`)

  const p = meta.principles ?? []
  if (p.length < 2 || p.length > 5) report(file, `${p.length} principle cards (want 2–5)`)
  for (const card of p) {
    claimId(file, card.id)
    if (!card.prompt || !card.answer) report(file, `principle ${card.id}: missing prompt or answer`)
  }

  const demos = meta.demos ?? []
  if (demos.length < 1 || demos.length > 3) report(file, `${demos.length} demos (want 1–3)`)
  for (const demo of demos) {
    claimId(file, demo.id)
    checkDemo(file, demo)
  }

  const tests = meta.tests ?? []
  if (tests.length < 4 || tests.length > 8) report(file, `${tests.length} test positions (want 4–8)`)
  for (const test of tests) checkTest(file, test, slug, meta.tier)
}

let lessonCount = 0
let testCount = 0
const orders = new Map<number, Set<number>>()

for (const tierDir of readdirSync(contentDir).filter((d) => d.startsWith('tier')).sort()) {
  const dirTier = Number(tierDir.replace('tier', ''))
  const dir = join(contentDir, tierDir)
  for (const jsonFile of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const file = `${tierDir}/${jsonFile}`
    let meta: LessonMeta
    try {
      meta = JSON.parse(readFileSync(join(dir, jsonFile), 'utf8'))
    } catch (e) {
      report(file, `unparseable JSON (${String(e)})`)
      continue
    }
    if (!existsSync(join(dir, jsonFile.replace(/\.json$/, '.md')))) {
      report(file, `no matching .md explanation file`)
    }
    const tierOrders = orders.get(meta.tier) ?? new Set()
    if (tierOrders.has(meta.order)) report(file, `duplicate order ${meta.order} in tier ${meta.tier}`)
    tierOrders.add(meta.order)
    orders.set(meta.tier, tierOrders)
    checkLesson(file, meta, dirTier)
    lessonCount++
    testCount += (meta.tests ?? []).length
  }
}

if (problems.length > 0) {
  console.error(`Content validation FAILED — ${problems.length} problem(s):\n`)
  for (const p of problems) console.error(`  ✗ ${p}`)
  process.exit(1)
}
console.log(`Content OK — ${lessonCount} lesson(s), ${testCount} test position(s), ${seenIds.size} unique ids.`)
