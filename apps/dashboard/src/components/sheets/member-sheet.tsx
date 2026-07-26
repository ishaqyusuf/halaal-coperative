"use client"

import { Suspense, useState } from "react"
import { useRouter } from "next/navigation"
import type { TenantMigrationSetupMode } from "@halaalvest/db"
import type { CreatedMemberSummary } from "@/components/forms/member-forms"
import { MemberContent } from "@/components/member-content"
import { MemberSheetFormProvider } from "@/components/member/form-context"
import { MemberSheetHeader } from "@/components/member-sheet-header"
import { MemberBackfillStartSheet } from "@/components/sheets/member-backfill-start-sheet"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useMemberParams } from "@/hooks/use-member-params"
import {
  getMemberMigrationStartHref,
  shouldOpenMemberMigrationAfterCreate,
} from "@/lib/members/member-migration-routing"
import type { MemberCollectionSourceOption } from "@/lib/members/load-members-page"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

function isMemberSheetOpen(type: string | null) {
  return type === "create" || type === "status"
}

export function MemberSheet({
  canManageCollectionSources = false,
  collectionSourceOptions = [],
  cooperativeStartDate,
  devMode,
  memberNumberPrefix,
  migrationSetupMode = "historical_backfill",
}: {
  canManageCollectionSources?: boolean
  collectionSourceOptions?: MemberCollectionSourceOption[]
  cooperativeStartDate?: string | null
  devMode: boolean
  memberNumberPrefix?: string | null
  migrationSetupMode?: TenantMigrationSetupMode
}) {
  const router = useRouter()
  const { memberSheetType, setParams } = useMemberParams()
  const [pendingBackfillMember, setPendingBackfillMember] =
    useState<CreatedMemberSummary | null>(null)
  const isOpen = isMemberSheetOpen(memberSheetType)
  const presentation = getWorkflowPresentation("member", memberSheetType)

  function closeSheet() {
    void setParams({
      memberSheetType: null,
      selectedMemberId: null,
      selectedMemberStatus: null,
    })
  }

  function handleOnOpenChange(open: boolean) {
    if (open) {
      return
    }

    closeSheet()
  }

  function handleMemberCreated(member: CreatedMemberSummary) {
    closeSheet()

    if (
      shouldOpenMemberMigrationAfterCreate({
        joinedAt: member.joinedAt,
        setupMode: migrationSetupMode,
      })
    ) {
      if (migrationSetupMode === "brought_forward") {
        router.push(getMemberMigrationStartHref(member.id, migrationSetupMode))
        return
      }

      setPendingBackfillMember(member)
    }
  }

  function handleBackfillLater() {
    setPendingBackfillMember(null)
  }

  function handleStartBackfill() {
    if (!pendingBackfillMember) {
      return
    }

    router.push(
      getMemberMigrationStartHref(pendingBackfillMember.id, migrationSetupMode)
    )
    setPendingBackfillMember(null)
  }

  return (
    <>
      <WorkflowPresentation
        config={presentation}
        open={isOpen}
        onOpenChange={handleOnOpenChange}
      >
          {isOpen ? (
            <Suspense
              fallback={
                <div className="px-6 text-sm text-muted-foreground">
                  Loading member form...
                </div>
              }
            >
              <MemberSheetFormProvider
                value={{
                  canManageCollectionSources,
                  collectionSourceOptions,
                  cooperativeStartDate,
                  devMode,
                  memberNumberPrefix,
                  migrationSetupMode,
                }}
              >
                <MemberSheetHeader
                  presentation={
                    presentation.presentation === "sheet" ? "sheet" : "dialog"
                  }
                />
                <MemberContent onCreated={handleMemberCreated} />
              </MemberSheetFormProvider>
            </Suspense>
          ) : null}
      </WorkflowPresentation>

      <MemberBackfillStartSheet
        member={pendingBackfillMember}
        onLater={handleBackfillLater}
        onStartBackfill={handleStartBackfill}
        open={Boolean(pendingBackfillMember)}
      />
    </>
  )
}
