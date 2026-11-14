"use client"

import { Button } from "@halaalvest/ui/components/button"
import { FinanceSettingsFrame } from "@/components/finance-settings/finance-settings-frame"

export default function FinanceSettingsError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <FinanceSettingsFrame>
      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">This page didn't load</h2>
        <p className="text-lg text-muted-foreground">
          Nothing was changed. Please try again.
        </p>
        <div>
          <Button className="h-12 text-base" onClick={reset} type="button">
            Try again
          </Button>
        </div>
      </section>
    </FinanceSettingsFrame>
  )
}
