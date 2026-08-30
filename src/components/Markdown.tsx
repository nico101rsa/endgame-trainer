import type { ReactNode } from 'react'

// Just enough markdown for lesson explanations (CONTENT_GUIDE.md caps them at
// paragraphs, ## sub-headings, **bold**, and - lists) — no dependency needed.
function inline(text: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-extrabold">
        {part}
      </strong>
    ) : (
      part
    ),
  )
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/)
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => {
        const lines = block.split('\n').map((l) => l.trim())
        if (lines[0].startsWith('## ')) {
          return (
            <h3 key={i} className="mt-2 font-display text-2xl uppercase leading-none">
              {lines[0].slice(3)}
            </h3>
          )
        }
        if (lines.every((l) => l.startsWith('- '))) {
          return (
            <ul key={i} className="flex flex-col gap-2">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-3 text-[15px] leading-snug">
                  <span className="mt-[7px] h-2 w-2 shrink-0 bg-red" />
                  <span>{inline(l.slice(2))}</span>
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i} className="text-[15px] leading-snug">
            {inline(lines.join(' '))}
          </p>
        )
      })}
    </div>
  )
}
