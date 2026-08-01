"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  ScrollableContent,
} from "@/components/dashboard"

export default function MembershipApprovalsError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ScrollableContent>
      <DashboardSectionCard>
        <DashboardSectionHeader
          description="The membership approval queue could not be loaded. No membership requests were changed."
          eyebrow="Membership"
          title="Something went wrong"
        />
        <div className="mt-5">
          <Button onClick={reset} type="button">
            Try again
          </Button>
        </div>
      </DashboardSectionCard>
    </ScrollableContent>
  )
}
