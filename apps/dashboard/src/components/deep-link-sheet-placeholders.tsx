"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { LoanSheetHeader } from "@/components/loan-sheet-header"
import { MemberDetailSheetHeader } from "@/components/member-detail-sheet-header"
import { TenantFinanceSettingsSheetHeader } from "@/components/tenant-finance-settings-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useLoanParams } from "@/hooks/use-loan-params"
import { useMemberDetailParams } from "@/hooks/use-member-detail-params"
import { useTenantFinanceSettingsParams } from "@/hooks/use-tenant-finance-settings-params"
import {
  matchDeepLinkSheetRoute,
  routeLoadingMarkerAttribute,
} from "@/lib/navigation/deep-link-sheets"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

// A deep link such as `/loans?loanSheetType=request` names a sheet whose
// form needs the page's data. While the route's loading state is on screen
// (its `loading.tsx` renders the marker), the shell opens the same sheet frame
// (real title, skeleton body) so the link visibly lands at once. When the
// page renders, the marker goes and the page's own sheet takes over. This
// lives in the shell because a streamed `loading.tsx` is not hydrated.
// Each sheet param is an enum whose every value opens its sheet, so a set
// param means open. The real sheets are not imported, to keep this light.

function SheetBodySkeleton() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="flex flex-col gap-4 px-4 pb-6 sm:px-6"
    >
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-4 w-2/3" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
      <Skeleton className="h-24" />
      <Skeleton className="h-10 w-32 self-end" />
    </div>
  )
}

function useRouteLoadingMarker() {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const selector = `[${routeLoadingMarkerAttribute}]`
    // MutationObserver callbacks already batch per microtask; no rAF, which
    // background tabs pause.
    const check = () => setLoading(Boolean(document.querySelector(selector)))
    const observer = new MutationObserver(check)

    check()
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  return loading
}

function LoanSheetPlaceholderInner() {
  const { loanSheetType, setParams } = useLoanParams()
  const isOpen = Boolean(loanSheetType)

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("loan", loanSheetType)}
      mobileFullScreen
      open={isOpen}
      onOpenChange={(open) => !open && void setParams(null)}
    >
      {isOpen ? (
        <>
          <LoanSheetHeader />
          <SheetBodySkeleton />
        </>
      ) : null}
    </WorkflowPresentation>
  )
}


function MemberDetailSheetPlaceholderInner() {
  const { memberDetailSheetType, setParams } = useMemberDetailParams()
  const isOpen = Boolean(memberDetailSheetType)
  const presentation = getWorkflowPresentation(
    "memberDetail",
    memberDetailSheetType
  )

  return (
    <WorkflowPresentation
      config={presentation}
      open={isOpen}
      onOpenChange={(open) =>
        !open &&
        void setParams({
          memberDetailDocumentId: null,
          memberDetailSheetType: null,
        })
      }
    >
      {isOpen ? (
        <>
          <MemberDetailSheetHeader
            presentation={
              presentation.presentation === "sheet" ? "sheet" : "dialog"
            }
          />
          <SheetBodySkeleton />
        </>
      ) : null}
    </WorkflowPresentation>
  )
}


function TenantFinanceSettingsSheetPlaceholderInner() {
  const { setParams, tenantFinanceSettingsSheetType } =
    useTenantFinanceSettingsParams()
  const isOpen = Boolean(tenantFinanceSettingsSheetType)

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation(
        "tenantFinance",
        tenantFinanceSettingsSheetType
      )}
      open={isOpen}
      onOpenChange={(open) => !open && void setParams(null)}
    >
      {isOpen ? (
        <>
          <TenantFinanceSettingsSheetHeader />
          <SheetBodySkeleton />
        </>
      ) : null}
    </WorkflowPresentation>
  )
}

export function DeepLinkSheetPlaceholder() {
  const pathname = usePathname()
  const routeLoading = useRouteLoadingMarker()
  const kind = matchDeepLinkSheetRoute(pathname)

  if (!routeLoading || !kind) {
    return null
  }

  if (kind === "loan") {
    return <LoanSheetPlaceholderInner />
  }

  if (kind === "memberDetail") {
    return <MemberDetailSheetPlaceholderInner />
  }

  return <TenantFinanceSettingsSheetPlaceholderInner />
}
