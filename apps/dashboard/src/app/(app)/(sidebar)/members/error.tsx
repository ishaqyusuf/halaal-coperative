"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  ScrollableContent,
} from "@/components/dashboard"

export default function MembersError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ScrollableContent>
      <DashboardSectionCard>
        <DashboardSectionHeader
          description="The member directory could not be loaded. No member records were changed."
          eyebrow="Members"
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
