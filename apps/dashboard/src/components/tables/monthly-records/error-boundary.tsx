"use client"

import { Component, type ReactNode } from "react"
import { Button } from "@halaalvest/ui/components/button"
import { QueryErrorResetBoundary } from "@tanstack/react-query"

class MonthlyRecordsErrorBoundaryInner extends Component<
  { children: ReactNode; resetQueries: () => void },
  { error: Error | null }
> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  retry = () => {
    this.props.resetQueries()
    this.setState({ error: null })
  }
  render() {
    if (this.state.error)
      return (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 border-y border-border px-4 py-10 text-center">
          <div>
            <p className="text-sm font-medium">
              Monthly record rows could not load
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check your connection and try again.
            </p>
          </div>
          <Button onClick={this.retry} size="sm" variant="outline">
            Try again
          </Button>
        </div>
      )
    return this.props.children
  }
}

export function MonthlyRecordsDataErrorBoundary({
  children,
}: {
  children: ReactNode
}) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <MonthlyRecordsErrorBoundaryInner resetQueries={reset}>
          {children}
        </MonthlyRecordsErrorBoundaryInner>
      )}
    </QueryErrorResetBoundary>
  )
}
