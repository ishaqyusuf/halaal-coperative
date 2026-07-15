"use client"

import { useState } from "react"
import type { TenantMigrationSetupMode } from "@halaalvest/db"
import { Button } from "@halaalvest/ui/components/button"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import { useRouter } from "next/navigation"
import type {
  CreatedMemberSummary,
  MemberCreateForm,
} from "@/components/forms/member-forms"
import { MemberContent } from "@/components/member-content"
import { MemberBackfillStartSheet } from "@/components/sheets/member-backfill-start-sheet"
import { MemberSheetFormProvider } from "@/components/member/form-context"
import { MemberSheetHeader } from "@/components/member-sheet-header"
import { useCreateMemberParams } from "@/hooks/use-create-member-params"
import {
  getMemberMigrationStartHref,
  shouldOpenMemberMigrationAfterCreate,
} from "@/lib/members/member-migration-routing"
import type { MemberCollectionSourceOption } from "@/lib/members/load-members-page"

export function MemberCreateSheet({
  canManageCollectionSources = false,
  collectionSourceOptions = [],
  cooperativeStartDate,
  description = "Add the member profile, joined date, and starting commitment.",
  devMode,
  initialValues,
  memberNumberPrefix,
  migrationSetupMode = "historical_backfill",
  onOpenChange,
  onSuccess,
  open,
  suppressBackfillPrompt = false,
  title = "Create member",
  triggerLabel = "New member",
}: {
  canManageCollectionSources?: boolean
  collectionSourceOptions?: MemberCollectionSourceOption[]
  cooperativeStartDate?: string | null
  description?: string
  devMode: boolean
  initialValues?: Parameters<typeof MemberCreateForm>[0]["initialValues"]
  memberNumberPrefix?: string | null
  migrationSetupMode?: TenantMigrationSetupMode
  onOpenChange?: (open: boolean) => void
  onSuccess?: (member: CreatedMemberSummary) => void
  open?: boolean
  suppressBackfillPrompt?: boolean
  title?: string
  triggerLabel?: string
}) {
  const { createMemberSheet, setParams } = useCreateMemberParams()
  const [pendingBackfillMember, setPendingBackfillMember] =
    useState<CreatedMemberSummary | null>(null)
  const router = useRouter()
  const isControlled = open !== undefined
  const sheetOpen = open ?? createMemberSheet === "open"

  function setSheetOpen(nextOpen: boolean) {
    if (!isControlled) {
      void setParams({
        createMemberSheet: nextOpen ? "open" : null,
      })
    }

    onOpenChange?.(nextOpen)
  }

  function handleMemberCreated(member: CreatedMemberSummary) {
    setSheetOpen(false)
    onSuccess?.(member)

    if (suppressBackfillPrompt) {
      return
    }

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
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        {!isControlled ? (
          <Button
            type="button"
            variant={sheetOpen ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setSheetOpen(true)}
          >
            {triggerLabel}
          </Button>
        ) : null}

        <SheetContent className="max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] overflow-hidden p-0 sm:w-full sm:max-w-[455px]">
          <div className="max-h-[calc(100vh-2rem)] overflow-y-auto p-4">
            <MemberSheetFormProvider
              value={{
                canManageCollectionSources,
                collectionSourceOptions,
                cooperativeStartDate,
                devMode,
                initialValues,
                memberNumberPrefix,
                migrationSetupMode,
              }}
            >
              <MemberSheetHeader
                description={description}
                sheetType="create"
                title={title}
              />
              <MemberContent
                key={`${initialValues?.fullName ?? ""}-${sheetOpen ? "open" : "closed"}`}
                onCreated={handleMemberCreated}
                sheetType="create"
              />
            </MemberSheetFormProvider>
          </div>
        </SheetContent>
      </Sheet>

      <MemberBackfillStartSheet
        member={pendingBackfillMember}
        onLater={handleBackfillLater}
        onStartBackfill={handleStartBackfill}
        open={Boolean(pendingBackfillMember)}
      />
    </>
  )
}
