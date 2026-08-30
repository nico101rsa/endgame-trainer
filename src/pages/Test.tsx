import { useParams } from 'react-router-dom'
import { BackHeader } from '../components/BackHeader'
import { TestRunner } from '../components/TestRunner'
import { getPosition } from '../content/loader'

export function Test() {
  const { id } = useParams()
  const found = id ? getPosition(id) : undefined
  if (!found) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-6 pt-12">
        <BackHeader to="/" label="Position not found" />
      </div>
    )
  }

  const { position, lesson } = found
  const index = lesson.tests.findIndex((t) => t.id === position.id)
  const next = lesson.tests[index + 1]
  const lessonTo = `/lesson/${lesson.lesson}`

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pt-12 pb-10">
      <BackHeader
        to={lessonTo}
        label={`${lesson.title} · ${index + 1}/${lesson.tests.length}`}
      />
      <TestRunner
        key={position.id}
        position={position}
        nextTo={next ? `/test/${next.id}` : undefined}
        lessonTo={lessonTo}
      />
    </div>
  )
}
