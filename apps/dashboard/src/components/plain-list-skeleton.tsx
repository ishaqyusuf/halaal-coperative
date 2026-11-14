/** Loading rows for the plain divided lists (charges, shares). */
export function PlainListSkeleton() {
  return (
    <ul
      aria-label="Loading"
      className="divide-y divide-border border-y border-border"
    >
      {[0, 1, 2, 3].map((item) => (
        <li className="flex items-center gap-4 px-1 py-4 sm:px-3" key={item}>
          <span className="flex-1">
            <span className="block h-5 w-40 animate-pulse rounded bg-muted" />
            <span className="mt-2 block h-4 w-56 max-w-full animate-pulse rounded bg-muted" />
          </span>
          <span className="h-5 w-20 animate-pulse rounded bg-muted" />
        </li>
      ))}
    </ul>
  )
}
