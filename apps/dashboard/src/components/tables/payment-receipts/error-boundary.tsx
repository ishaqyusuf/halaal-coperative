"use client"

import { Component, type ReactNode } from "react"
import { Button } from "@halaalvest/ui/components/button"
import { QueryErrorResetBoundary } from "@tanstack/react-query"

class ReceiptErrorBoundaryInner extends Component<
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
    if (this.state.error) {
      return (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 border-y border-border px-4 py-10 text-center md:border-y-0">
          <div>
            <p className="text-sm font-medium">
              Payment receipts could not be loaded
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check your connection and try again.
            </p>
          </div>
          <Button className="h-11 md:h-9" onClick={this.retry}>
            Try again
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}

export function PaymentReceiptsDataErrorBoundary({
  children,
}: {
  children: ReactNode
}) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ReceiptErrorBoundaryInner resetQueries={reset}>
          {children}
        </ReceiptErrorBoundaryInner>
      )}
    </QueryErrorResetBoundary>
  )
}
