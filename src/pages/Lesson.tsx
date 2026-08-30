import { Link, useParams } from 'react-router-dom'
import { BackHeader } from '../components/BackHeader'
import { DemoPlayer } from '../components/DemoPlayer'
import { Markdown } from '../components/Markdown'
import { PrincipleCard } from '../components/PrincipleCard'
import { getLesson } from '../content/loader'

function SectionHeading({ children }: { children: string }) {
  return (
    <div className="mt-8 text-[11px] font-extrabold uppercase tracking-widest text-muted">
      {children}
    </div>
  )
}

export function Lesson() {
  const { slug } = useParams()
  const lesson = slug ? getLesson(slug) : undefined
  if (!lesson) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-6 pt-12">
        <BackHeader to="/" label="Lesson not found" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-12 pb-10">
      <BackHeader to="/" label={`Tier ${lesson.tier} · Lesson ${lesson.order}`} />

      <div className="mt-4 px-1">
        <h1 className="font-display text-4xl uppercase leading-none">
          {lesson.title}
          <span className="text-red">.</span>
        </h1>
        <div className="mt-2 text-[13px] font-bold uppercase tracking-wide text-muted">
          {lesson.tagline}
        </div>
      </div>

      <div className="mt-6 px-1">
        <Markdown text={lesson.explanation} />
      </div>

      <SectionHeading>Principles</SectionHeading>
      <div className="mt-2 flex flex-col gap-3">
        {lesson.principles.map((card) => (
          <PrincipleCard key={card.id} card={card} />
        ))}
      </div>

      {lesson.demos.map((demo, i) => (
        <div key={demo.id}>
          <SectionHeading>{`Demo ${i + 1} — ${demo.title}`}</SectionHeading>
          <div className="mt-2">
            <DemoPlayer demo={demo} />
          </div>
        </div>
      ))}

      <SectionHeading>Test yourself</SectionHeading>
      <div className="mt-2 flex flex-col gap-3">
        {lesson.tests.map((test, i) => (
          <Link
            key={test.id}
            to={`/test/${test.id}`}
            className="flex items-stretch border-[3px] border-ink bg-panel shadow-[4px_4px_0_#1a170f]"
          >
            <div className="flex w-12 items-center justify-center bg-ink font-display text-xl text-cream">
              {i + 1}
            </div>
            <div className="flex flex-1 flex-col gap-0.5 px-4 py-2.5">
              <div className="text-[15px] font-extrabold">{test.title}</div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
                {(test.playerSide === 'w' ? 'White' : 'Black') + ' to ' + test.goal}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <Link
        to={`/test/${lesson.tests[0].id}`}
        className="mt-6 flex min-h-[52px] items-center justify-center bg-ink font-extrabold uppercase tracking-wide text-cream shadow-[4px_4px_0_#c53024]"
      >
        Start test
      </Link>
    </div>
  )
}
