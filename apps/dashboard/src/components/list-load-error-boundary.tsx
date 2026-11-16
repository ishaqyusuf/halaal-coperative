"use client"

import { Button } from "@halaalvest/ui/components/button"
import { QueryErrorResetBoundary } from "@tanstack/react-query"
import { Component, type ReactNode } from "react"

class Boundary extends Component<
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
        <div className="flex flex-col items-center gap-3 border-y border-border px-4 py-10 text-center">
          <p className="text-lg font-semibold">This could not be loaded.</p>
          <Button size="touch" className="text-base" onClick={this.retry}>
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

export function ListLoadErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => <Boundary resetQueries={reset}>{children}</Boundary>}
    </QueryErrorResetBoundary>
  )
}
