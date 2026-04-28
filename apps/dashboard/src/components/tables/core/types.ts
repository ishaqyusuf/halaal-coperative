import type { ReactNode } from "react"

export type TableColumn<TItem> = {
  align?: "left" | "right"
  key: string
  label: string
  render: (item: TItem) => ReactNode
}

export type SkeletonType = "text" | "badge"

export type SkeletonConfig = {
  className?: string
  type?: SkeletonType
}
