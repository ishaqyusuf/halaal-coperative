import type { StatusTone } from "@/components/ui/status-pill"

/** One lane row in the shared 02 "Brand hero lanes" layout (T21). */
export type OpsRow = {
  /** Inline action under the row, e.g. "Review" or "Record purchase". */
  actionLabel?: string
  amount: number | null
  /** Leading tile: a service icon, or initials (e.g. "Oct") for a cycle. */
  avatarText?: string
  id: string
  meta?: string
  metaTone?: "danger" | "muted"
  pill?: { label: string; tone: StatusTone }
  subtitle: string
  title: string
}

export type OpsLane<TLane extends string> = {
  count?: number
  empty: string
  label: string
  value: TLane
}

/** What a lane pane needs from its paged read. */
export type OpsLaneState = {
  error: boolean
  fetchingNext: boolean
  hasData: boolean
  hasNext: boolean
  items: OpsRow[]
  loading: boolean
  nextPage: () => void
  refetch: () => void
  refreshing: boolean
  updating: boolean
}

export type OpsDetail = {
  amount: number | null
  facts: [string, string][]
  headline: string
  meta?: string
  pill?: { label: string; tone: StatusTone }
  schedule?: {
    rows: { amount: number; sub: string; title: string; tone: "danger" | "muted" | "success" | "warning" }[]
    side: string
    title: string
  }
  stepIndex: number
  steps: string[]
  timeline: { meta: string; note?: string; title: string }[]
  who: string
}

export type OpsReviewSpec = {
  confirmLabel: string
  note?: string
  rows: [string, string][]
  title: string
}

export type OpsResult =
  | { body: string; kind: "success"; secondaryLabel?: string; title: string }
  | { kind: "conflict" | "error" }
