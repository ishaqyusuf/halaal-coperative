"use client"

import { SheetHeader, SheetTitle } from "@halaalvest/ui/components/sheet"
import { useQuery } from "@tanstack/react-query"
import { Suspense } from "react"
import { ProfitSeasonDetails } from "@/components/business/profit-season-details"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useProfitSeasonParams } from "@/hooks/use-profit-season-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"

const disabledSeasonId = "00000000-0000-4000-8000-000000000000"

/** One profit-sharing season, URL-addressed by `profitSeasonId`. */
export function ProfitSeasonSheet({ canManage }: { canManage: boolean }) {
  const { profitSeasonId, setParams } = useProfitSeasonParams()
  const isOpen = Boolean(profitSeasonId)

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("business", "season")}
      mobileFullScreen
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) void setParams(null)
      }}
    >
      {isOpen ? (
        <div className="grid gap-6 px-4 pb-8 md:px-6">
          <SeasonBody canManage={canManage} seasonId={profitSeasonId} />
        </div>
      ) : null}
    </WorkflowPresentation>
  )
}

function SeasonBody({
  canManage,
  seasonId,
}: {
  canManage: boolean
  seasonId: string | null
}) {
  const trpc = useTRPC()
  const { data: season, isError, isLoading } = useQuery(
    trpc.business.season.queryOptions(
      { seasonId: seasonId ?? disabledSeasonId },
      { enabled: Boolean(seasonId) }
    )
  )

  return (
    <>
      <SheetHeader className="px-0">
        <SheetTitle className="text-2xl font-semibold">
          {season?.name ?? "Profit sharing"}
        </SheetTitle>
      </SheetHeader>
      {isLoading ? (
        <p className="text-base text-muted-foreground">Loading…</p>
      ) : isError || !season ? (
        <p className="text-base text-muted-foreground">
          This season could not be loaded.
        </p>
      ) : (
        <Suspense
          fallback={<p className="text-base text-muted-foreground">Loading…</p>}
        >
          <ProfitSeasonDetails canManage={canManage} season={season} />
        </Suspense>
      )}
    </>
  )
}
