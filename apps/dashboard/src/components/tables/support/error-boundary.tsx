"use client"

import { Component, type ReactNode } from "react"
import { QueryErrorResetBoundary } from "@tanstack/react-query"
import { Button } from "@halaalvest/ui/components/button"

type SupportDataErrorBoundaryProps = {
  children: ReactNode
}

type SupportDataErrorBoundaryState = {
  error: Error | null
}

class SupportDataErrorBoundaryInner extends Component<
  SupportDataErrorBoundaryProps & { resetQueries: () => void },
  SupportDataErrorBoundaryState
> {
  state: SupportDataErrorBoundaryState = { error: null }

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
            <p className="text-sm font-medium text-foreground">
              Support cases could not be loaded
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check your connection and try again.
            </p>
          </div>
          <Button className="h-11 md:h-9" onClick={this.retry} type="button">
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

export function SupportDataErrorBoundary({
  children,
}: SupportDataErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <SupportDataErrorBoundaryInner resetQueries={reset}>
          {children}
        </SupportDataErrorBoundaryInner>
      )}
    </QueryErrorResetBoundary>
  )
}
