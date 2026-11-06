"use client"

import type { ReactNode } from "react"
import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { WorkflowPresentationHeader } from "@/components/workflow-presentation-header"
import {
  type InitialMigrationSheetType,
  useInitialMigrationParams,
} from "@/hooks/use-initial-migration-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

type MigrationActionTarget = {
  mode: InitialMigrationSheetType
  // The legacy loan draft a `legacyLoanEdit` overlay edits.
  targetId?: string | null
}

export function MigrationActionTrigger({
  className,
  disabled,
  label,
  mode,
  targetId = null,
  variant = "outline",
}: MigrationActionTarget & {
  className?: string
  disabled?: boolean
  label: string
  variant?: "default" | "outline"
}) {
  const { setParams } = useInitialMigrationParams()

  return (
    <Button
      className={className}
      disabled={disabled}
      onClick={() =>
        void setParams({
          initialMigrationSheetType: mode,
          legacyLoanDraftId: targetId,
        })
      }
      size="sm"
      type="button"
      variant={variant}
    >
      {label}
    </Button>
  )
}

// Render one overlay per mode and target; a trigger may appear more than once.
export function MigrationActionOverlay({
  bodyClassName,
  children,
  description,
  eyebrow,
  mode,
  targetId = null,
  title,
}: MigrationActionTarget & {
  bodyClassName?: string
  children: ReactNode
  description: string
  eyebrow?: string
  title: ReactNode
}) {
  const { initialMigrationSheetType, legacyLoanDraftId, setParams } =
    useInitialMigrationParams()
  const config = getWorkflowPresentation("memberBackfill", mode)
  const isOpen =
    initialMigrationSheetType === mode && legacyLoanDraftId === targetId

  return (
    <WorkflowPresentation
      config={config}
      contentClassName={
        config.presentation === "sheet" ? undefined : "grid gap-4"
      }
      open={isOpen}
      onOpenChange={(open) =>
        !open &&
        void setParams({
          initialMigrationSheetType: null,
          legacyLoanDraftId: null,
        })
      }
    >
      <WorkflowPresentationHeader
        description={description}
        eyebrow={eyebrow}
        presentation={config.presentation}
        title={title}
      />
      <div
        className={cn(
          config.presentation === "sheet" && "px-6 pb-6",
          bodyClassName
        )}
      >
        {children}
      </div>
    </WorkflowPresentation>
  )
}

export function MigrationActionSheet({
  bodyClassName,
  children,
  description,
  disabled,
  eyebrow,
  mode,
  targetId = null,
  title,
  triggerClassName,
  triggerLabel,
  variant = "outline",
}: MigrationActionTarget & {
  bodyClassName?: string
  children: ReactNode
  description: string
  disabled?: boolean
  eyebrow?: string
  title: ReactNode
  triggerClassName?: string
  triggerLabel: string
  variant?: "default" | "outline"
}) {
  return (
    <>
      <MigrationActionTrigger
        className={triggerClassName}
        disabled={disabled}
        label={triggerLabel}
        mode={mode}
        targetId={targetId}
        variant={variant}
      />
      <MigrationActionOverlay
        bodyClassName={bodyClassName}
        description={description}
        eyebrow={eyebrow}
        mode={mode}
        targetId={targetId}
        title={title}
      >
        {children}
      </MigrationActionOverlay>
    </>
  )
}
