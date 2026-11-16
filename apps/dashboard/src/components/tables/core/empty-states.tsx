"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
} from "@halaalvest/ui/components/empty"
import type { ReactNode } from "react"

interface EmptyStateProps {
  title: string
  description: ReactNode
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  // The shared Empty primitive (WP18), sized as the old hand-built block.
  return (
    <Empty className="mt-40 flex-none gap-6 p-0 text-wrap">
      <EmptyHeader className="max-w-none gap-2">
        <h2 className="text-lg font-medium">{title}</h2>
        <EmptyDescription className="text-sm">{description}</EmptyDescription>
      </EmptyHeader>

      {actionLabel && onAction ? (
        <Button variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Empty>
  )
}

interface NoResultsProps {
  onClear: () => void
}

export function NoResults({ onClear }: NoResultsProps) {
  return (
    <EmptyState
      title="No results"
      description="Try another search, or adjusting the filters"
      actionLabel="Clear filters"
      onAction={onClear}
    />
  )
}
