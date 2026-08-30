import { Link } from 'react-router-dom'
import { TestRunner } from '../components/TestRunner'
import { oppositionPosition } from '../content/positions'

export function Test() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pt-12 pb-10">
      <div className="flex items-center gap-3 px-1">
        <Link to="/" aria-label="Back" className="flex min-h-11 min-w-11 items-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M14.5 5.5L8 12l6.5 6.5" />
          </svg>
        </Link>
        <div className="text-sm font-extrabold uppercase tracking-wide">
          King opposition · T1
        </div>
      </div>
      <TestRunner position={oppositionPosition} />
    </div>
  )
}
