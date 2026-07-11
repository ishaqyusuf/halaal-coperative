"use client"

import { useState } from "react"
import type { TenantMigrationSetupMode } from "@halaalvest/db"
import { Button } from "@halaalvest/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import { useRouter } from "next/navigation"
import {
  MemberCreateForm,
  type CreatedMemberSummary,
} from "@/components/forms/member-forms"
import { MemberBackfillStartModal } from "@/components/modals/member-backfill-start-modal"
import {
  getMemberMigrationStartHref,
  shouldOpenMemberMigrationAfterCreate,
} from "@/lib/members/member-migration-routing"

export function MemberCreateModal({
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
  const [internalOpen, setInternalOpen] = useState(false)
  const [pendingBackfillMember, setPendingBackfillMember] =
    useState<CreatedMemberSummary | null>(null)
  const router = useRouter()
  const dialogOpen = open ?? internalOpen
  const isControlled = open !== undefined

  function setDialogOpen(nextOpen: boolean) {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }

    onOpenChange?.(nextOpen)
  }

  function handleMemberCreated(member: CreatedMemberSummary) {
    setDialogOpen(false)
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {!isControlled ? (
          <Button
            type="button"
            variant={dialogOpen ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setDialogOpen(true)}
          >
            {triggerLabel}
          </Button>
        ) : null}

        <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] overflow-hidden p-0 sm:w-full sm:max-w-[455px]">
          <div className="max-h-[calc(100vh-2rem)] overflow-y-auto p-4">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            <MemberCreateForm
              cooperativeStartDate={cooperativeStartDate}
              devMode={devMode}
              initialValues={initialValues}
              inModal
              key={`${initialValues?.fullName ?? ""}-${dialogOpen ? "open" : "closed"}`}
              memberNumberPrefix={memberNumberPrefix}
              onSuccess={handleMemberCreated}
            />
          </div>
        </DialogContent>
      </Dialog>

      <MemberBackfillStartModal
        member={pendingBackfillMember}
        onLater={handleBackfillLater}
        onStartBackfill={handleStartBackfill}
        open={Boolean(pendingBackfillMember)}
      />
    </>
  )
}
