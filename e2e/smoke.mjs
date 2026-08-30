// Playwright smoke tests (spec §9 milestone 5). Runs against the built app:
//   npm run build && npm run e2e
// Uses playwright-core; install a browser once with:
//   npx playwright-core install chromium
// (or set PW_CHROMIUM to an existing Chromium binary).
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'

const PORT = 4517
const BASE = `http://localhost:${PORT}`
const results = []
const check = (name, ok, extra = '') =>
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`)

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
})
try {
  // Wait for the preview server.
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(BASE)
      break
    } catch {
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  const browser = await chromium.launch(
    process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  )
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } })

  // Home: masthead, all six tiers, no reviews due on a fresh profile.
  await page.goto(BASE + '/#/')
  await page.waitForSelector('text=School of the last phase')
  const home = await page.textContent('body')
  check('home renders masthead', home.includes('Endgame'))
  for (let t = 1; t <= 6; t++) check(`home lists tier ${t}`, home.includes(`Tier ${t} —`))
  check('fresh profile: nothing due', home.includes('No reviews due'))

  // Reading a lesson seeds its principle cards as due.
  await page.click('text=The square rule')
  await page.waitForSelector('text=Principles')
  await page.goto(BASE + '/#/')
  await page.waitForTimeout(500)
  check(
    'lesson read seeds cards',
    (await page.textContent('body')).includes('due today'),
  )

  // A clean tap-tap solve grades Good (1-day learning step).
  await page.goto(BASE + '/#/test/t1-square-01')
  await page.waitForTimeout(600)
  await page.click('[data-square="d5"]')
  await page.waitForTimeout(250)
  await page.click('[data-square="e5"]')
  await page.waitForTimeout(600)
  check('clean solve reaches Solved', (await page.textContent('body')).includes('Solved.'))
  const item = await page.evaluate(
    () => JSON.parse(localStorage.getItem('endgame-trainer:progress')).items['t1-square-01'],
  )
  check('clean solve graded Good', item?.solved === 1 && item?.intervalDays === 1, JSON.stringify(item))

  // Keyboard SAN entry solves a position too.
  await page.goto(BASE + '/#/test/t2-wbishop-03')
  await page.waitForTimeout(600)
  await page.fill('input[aria-label="Type a move in algebraic notation"]', 'Bc3')
  await page.click('button:has-text("Play")')
  await page.waitForTimeout(600)
  check('SAN entry solves', (await page.textContent('body')).includes('Solved.'))

  // Review queue runs to the summary.
  await page.goto(BASE + '/#/review')
  await page.waitForTimeout(600)
  for (let i = 0; i < 12; i++) {
    const body = await page.textContent('body')
    if (body.includes('Session done')) break
    if (body.includes('Tap to reveal')) {
      await page.click('text=Tap to reveal')
      await page.waitForTimeout(250)
      await page.click('button:has-text("Good")')
      await page.waitForTimeout(400)
    } else {
      await page.click('text=Show solution')
      await page.waitForSelector('button:has-text("Next")', { timeout: 15000 })
      await page.click('button:has-text("Next")')
      await page.waitForTimeout(400)
    }
  }
  check('review reaches summary', (await page.textContent('body')).includes('Session done'))

  // Settings: switching the board theme restyles the board.
  await page.goto(BASE + '/#/settings')
  await page.waitForSelector('text=Board theme')
  await page.click('button:has-text("Slate")')
  await page.goto(BASE + '/#/test/t1-square-02')
  await page.waitForTimeout(600)
  const slate = await page.evaluate(() => {
    const sq = document.querySelector('[data-square="a1"]')
    return sq ? getComputedStyle(sq).backgroundColor : ''
  })
  check('board theme applies', slate === 'rgb(64, 80, 90)', slate)

  await browser.close()
} finally {
  server.kill()
}

console.log(results.join('\n'))
if (results.some((r) => r.startsWith('FAIL'))) process.exit(1)
