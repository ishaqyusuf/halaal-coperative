"use client"

import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { NativeSelect } from "@halaalvest/ui/components/native-select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { ShareStructureVersionForm } from "@/components/forms/tenant-finance-forms"
import { useShareParams } from "@/hooks/use-share-params"
import { updateTenantShareStructureVersionAction } from "@/lib/dashboard-actions"
import type { Share } from "@/components/tables/shares/columns"

export function ShareSheet({
  isLocked,
  rows,
}: {
  isLocked: boolean
  rows: Share[]
}) {
  const { setParams, shareId, shareType } = useShareParams()
  const isCreate = shareType === "create"
  const isEdit = shareType === "edit"
  const isOpen = isCreate || isEdit
  const version = rows.find((row) => row.id === shareId)
  const title = isCreate ? "Create share rule" : "Edit share rule"

  const handleOnOpenChange = (open: boolean) => {
    if (!open) {
      setParams(null)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOnOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {isCreate
              ? "Add a dated fixed or percentage share capital rule for historical migration."
              : "Update the dated share rule used by historical member ledger generation."}
          </SheetDescription>
        </SheetHeader>

        {isCreate ? (
          <div className="px-6">
            <ShareStructureVersionForm />
          </div>
        ) : version ? (
          <form
            action={updateTenantShareStructureVersionAction}
            className="grid gap-4 px-6"
          >
            <input
              name="shareStructureVersionId"
              type="hidden"
              value={version.id}
            />
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Effective date
              <Input
                defaultValue={version.effectiveFrom}
                disabled={isLocked}
                name="effectiveFrom"
                required
                type="date"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Rule
              <NativeSelect
                defaultValue={version.valueType}
                disabled={isLocked}
                name="valueType"
              >
                <option value="fixed_amount">Fixed amount</option>
                <option value="percentage">Percentage after charges</option>
              </NativeSelect>
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Value
              <Input
                defaultValue={version.amount}
                disabled={isLocked}
                min="0"
                name="amount"
                required
                step="0.01"
                type="number"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Notes
              <Textarea
                defaultValue={version.notes ?? ""}
                disabled={isLocked}
                name="notes"
                placeholder="Reason or board reference"
              />
            </label>
            <Button disabled={isLocked} type="submit">
              Save changes
            </Button>
          </form>
        ) : (
          <div className="px-6 text-sm text-muted-foreground">
            Select a share rule to edit.
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
