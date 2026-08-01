"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  DashboardPageShell,
  DashboardSectionCard,
  DashboardSectionHeader,
} from "@/components/dashboard"
import { financeMenuItems } from "@/components/finance-menu"
import { SecondaryMenu } from "@/components/secondary-menu"

export default function FinanceSettingsError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <DashboardPageShell>
      <div className="w-full max-w-[980px]">
        <SecondaryMenu items={financeMenuItems} />
        <main className="mt-4 min-w-0">
          <DashboardSectionCard>
            <DashboardSectionHeader
              description="The finance configuration could not be loaded. No settings were changed."
              eyebrow="Finance settings"
              title="Something went wrong"
            />
            <div className="mt-5">
              <Button onClick={reset} type="button">
                Try again
              </Button>
            </div>
          </DashboardSectionCard>
        </main>
      </div>
    </DashboardPageShell>
  )
}
