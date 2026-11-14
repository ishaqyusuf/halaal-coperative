import type { ReactNode } from "react"

/** The summary cards row on a request page: two per row on phones, four wide. */
export function RequestSummaryGrid({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Summary"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      {children}
    </section>
  )
}

/** A money card: a full row on phones so large amounts never overflow. */
export function RequestSummaryWide({ children }: { children: ReactNode }) {
  return <div className="col-span-2 lg:col-span-1">{children}</div>
}

/** One plain line when new requests can't be made here. */
export function RequestClosedNotice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-(--ui-radius-surface) border border-border bg-card px-4 py-3 text-base text-foreground">
      {children}
    </p>
  )
}

/** The member may ask once their membership checks are done. */
export const memberNeedsVerificationNotice =
  "You can ask once the cooperative has finished checking your details. Contact the office if you are waiting."
