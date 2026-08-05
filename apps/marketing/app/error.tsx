"use client"

import { getErrorPresentation } from "@halaalvest/errors"

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const presentation = getErrorPresentation(error)

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold">{presentation.title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {presentation.description}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {presentation.reference}
      </p>
      <button
        className="mt-6 rounded-md border px-4 py-2 text-sm font-medium"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </main>
  )
}
