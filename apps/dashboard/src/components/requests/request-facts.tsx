import type { ReactNode } from "react"

export type RequestFact = {
  label: string
  value: ReactNode
}

/** Short label / value pairs, two columns from `sm`. Empty values are skipped. */
export function RequestFacts({ items }: { items: RequestFact[] }) {
  const visible = items.filter(
    (item) =>
      item.value !== null && item.value !== undefined && item.value !== ""
  )

  if (!visible.length) return null

  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {visible.map((item) => (
        <div className="min-w-0" key={item.label}>
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 text-base font-medium [overflow-wrap:anywhere] text-foreground">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function RequestSection({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <section className="grid gap-4 border-t border-border pt-5">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  )
}
