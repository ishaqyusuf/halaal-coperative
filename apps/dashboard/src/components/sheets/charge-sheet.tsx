"use client"

import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { ChargeDefinitionVersionForm } from "@/components/forms/tenant-finance-forms"
import { useChargeParams } from "@/hooks/use-charge-params"
import {
  createChargeDefinitionVersionAction,
  updateChargeDefinitionVersionAction,
} from "@/lib/dashboard-actions"
import type { Charge } from "@/components/tables/charges/columns"

export function ChargeSheet({
  financeStartDate,
  isLocked,
  rows,
}: {
  financeStartDate?: string | null
  isLocked: boolean
  rows: Charge[]
}) {
  const { chargeId, chargeType, chargeVersionId, setParams } = useChargeParams()
  const isUpdate = chargeType === "update"
  const isEdit = chargeType === "edit"
  const isOpen = isUpdate || isEdit
  const charge = rows.find((row) => row.id === chargeId)
  const version =
    charge?.versions.find((item) => item.id === chargeVersionId) ??
    charge?.currentVersion ??
    null
  const chargeOptions = rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    label: `${row.name} (${row.code})`,
  }))
  const title = isUpdate ? "Add charge update" : "Edit charge update"

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
            Charge schedules are dated migration inputs. Once member backfill
            starts, this history is locked for ledger accuracy.
          </SheetDescription>
        </SheetHeader>

        {isUpdate && charge ? (
          <form
            action={createChargeDefinitionVersionAction}
            className="grid gap-4 px-6"
          >
            <input name="chargeDefinitionId" type="hidden" value={charge.id} />
            <input name="kind" type="hidden" value={charge.kind} />
            <input
              name="chargeValueType"
              type="hidden"
              value={charge.chargeValueType}
            />
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Charge
              <Input disabled value={`${charge.name} (${charge.code})`} />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Effective date
              <Input
                disabled={isLocked}
                min={financeStartDate ?? undefined}
                name="effectiveFrom"
                required
                type="date"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Amount
              <Input
                disabled={isLocked}
                min="0"
                name="amount"
                placeholder="0.00"
                required
                step="0.01"
                type="number"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Notes
              <Textarea
                disabled={isLocked}
                name="notes"
                placeholder="Reason or board reference"
              />
            </label>
            <Button disabled={isLocked} type="submit">
              Save update
            </Button>
          </form>
        ) : isUpdate ? (
          <div className="px-6">
            <ChargeDefinitionVersionForm
              chargeDefinitions={chargeOptions}
              financeStartDate={financeStartDate}
            />
          </div>
        ) : version ? (
          <form
            action={updateChargeDefinitionVersionAction}
            className="grid gap-4 px-6"
          >
            <input
              name="chargeDefinitionVersionId"
              type="hidden"
              value={version.id}
            />
            <input
              name="chargeValueType"
              type="hidden"
              value={version.chargeValueType}
            />
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Effective date
              <Input
                defaultValue={version.effectiveFrom}
                disabled={isLocked}
                min={financeStartDate ?? undefined}
                name="effectiveFrom"
                required
                type="date"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Amount
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
            Select a charge update to edit.
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
