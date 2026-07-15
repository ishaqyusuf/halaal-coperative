"use client"

import { type FormEvent, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@halaalvest/ui/components/alert-dialog"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@halaalvest/ui/components/select"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { upsertMemberActivityEventAction } from "@/lib/dashboard-actions"
import { MemberBackfillFooterPortal } from "./member-backfill-footer-slot"

type ActivityWindowStatus = "active" | "inactive" | ""

type ActivityWindowInputRow = {
  effectiveMonth: string
  id: string
  notes: string
  reason: string
  rowId: string
  status: ActivityWindowStatus
}

type ActivityWindowField = "effectiveMonth" | "status"
type ActivityWindowErrorMap = Partial<
  Record<number, Partial<Record<ActivityWindowField, true>>>
>

const activityWindowRowSchema = z.object({
  effectiveMonth: z.string(),
  id: z.string(),
  notes: z.string(),
  reason: z.string(),
  rowId: z.string(),
  status: z.union([z.literal("active"), z.literal("inactive"), z.literal("")]),
})

function createActivityWindowFormSchema(minMonth: string) {
  return z
    .object({
      rows: z.array(activityWindowRowSchema).min(1),
    })
    .superRefine((values, ctx) => {
      for (const [index, row] of values.rows.entries()) {
        if (!activityWindowRowHasValue(row)) {
          continue
        }

        if (!row.effectiveMonth) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Month is required.",
            path: ["rows", index, "effectiveMonth"],
          })
        } else if (row.effectiveMonth < minMonth) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Month cannot be before joined month.",
            path: ["rows", index, "effectiveMonth"],
          })
        }

        if (!row.status) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Status is required.",
            path: ["rows", index, "status"],
          })
        }
      }
    })
}

function createActivityWindowRow(id?: string): ActivityWindowInputRow {
  return {
    effectiveMonth: "",
    id:
      id ??
      `activity-window-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    notes: "",
    reason: "",
    rowId: "",
    status: "",
  }
}

function normalizeActivityWindowStatus(status: string): ActivityWindowStatus {
  return status === "inactive" ? "inactive" : "active"
}

function buildActivityWindowRows(
  initialRows:
    | Array<{
        effectiveMonth: string
        id: string
        notes: string | null
        reason: string | null
        status: string
      }>
    | undefined
): ActivityWindowInputRow[] {
  if (!initialRows?.length) {
    return [createActivityWindowRow("activity-window-initial")]
  }

  return [
    ...initialRows.map((row) => ({
      ...createActivityWindowRow(`activity-window-${row.id}`),
      effectiveMonth: row.effectiveMonth,
      notes: row.notes ?? "",
      reason: row.reason ?? "",
      rowId: row.id,
      status: normalizeActivityWindowStatus(row.status),
    })),
    createActivityWindowRow(),
  ]
}

function activityWindowRowHasValue(row: ActivityWindowInputRow) {
  return Boolean(row.effectiveMonth || row.reason || row.status)
}

function normalizeActivityWindowRows(rows: ActivityWindowInputRow[]) {
  const compactRows = rows.filter(
    (row, index) => activityWindowRowHasValue(row) || index === rows.length - 1
  )

  return compactRows.length > 0 ? compactRows : [createActivityWindowRow()]
}

function AddInlineRowButton({
  disabled,
  label,
  onAdd,
}: {
  disabled?: boolean
  label: string
  onAdd: () => void
}) {
  return (
    <Button
      className="w-full"
      disabled={disabled}
      onClick={onAdd}
      type="button"
      variant="outline"
    >
      <PlusIcon className="size-4" />
      {label}
    </Button>
  )
}

function hasActivityWindowFieldError(
  errors: ActivityWindowErrorMap,
  rowIndex: number,
  fieldName: ActivityWindowField
) {
  return Boolean(errors[rowIndex]?.[fieldName])
}

function DeleteActivityWindowRowButton({
  disabled,
  onDelete,
}: {
  disabled: boolean
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            aria-label="Delete activity row"
            className="size-8"
            disabled={disabled}
            size="icon-sm"
            type="button"
            variant="ghost"
          />
        }
      >
        <Trash2Icon className="size-3.5" />
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete activity row?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the row from the form before it is saved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onDelete()
              setOpen(false)
            }}
            type="button"
            variant="destructive"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function MemberBackfillActivityWindowsForm({
  disabled,
  formId,
  initialRows,
  memberId,
  memberJoinedAt,
  redirectTo,
  showSubmitButton = true,
}: {
  disabled: boolean
  formId?: string
  initialRows?: Array<{
    effectiveMonth: string
    id: string
    notes: string | null
    reason: string | null
    status: string
  }>
  memberId: string
  memberJoinedAt: string
  redirectTo?: string
  showSubmitButton?: boolean
}) {
  const router = useRouter()
  const minMonth = memberJoinedAt.slice(0, 7)
  const [rows, setRows] = useState<ActivityWindowInputRow[]>(
    buildActivityWindowRows(initialRows)
  )
  const [errors, setErrors] = useState<ActivityWindowErrorMap>({})

  function updateRow(rowId: string, patch: Partial<ActivityWindowInputRow>) {
    setErrors({})
    setRows((currentRows) =>
      normalizeActivityWindowRows(
        currentRows.map((row) =>
          row.id === rowId ? { ...row, ...patch } : row
        )
      )
    )
  }

  function deleteRow(rowId: string) {
    setErrors({})
    setRows((currentRows) =>
      normalizeActivityWindowRows(currentRows.filter((row) => row.id !== rowId))
    )
  }

  function addActivityWindowRow() {
    setErrors({})
    setRows((currentRows) => [
      ...normalizeActivityWindowRows(currentRows),
      createActivityWindowRow(),
    ])
  }

  function validateBeforeSubmit(event: FormEvent<HTMLFormElement>) {
    const result = createActivityWindowFormSchema(minMonth).safeParse({ rows })

    if (result.success) {
      setErrors({})
      return
    }

    event.preventDefault()

    const nextErrors: ActivityWindowErrorMap = {}

    for (const issue of result.error.issues) {
      const [, rowIndex, fieldName] = issue.path

      if (typeof rowIndex !== "number" || typeof fieldName !== "string") {
        continue
      }

      if (fieldName !== "effectiveMonth" && fieldName !== "status") {
        continue
      }

      const fieldErrors = nextErrors[rowIndex] ?? {}
      fieldErrors[fieldName] = true
      nextErrors[rowIndex] = fieldErrors
    }

    setErrors(nextErrors)
  }

  async function saveActivityWindows(formData: FormData) {
    await upsertMemberActivityEventAction(formData)

    const redirectTo = formData.get("redirectTo")

    if (typeof redirectTo === "string" && redirectTo.startsWith("/")) {
      router.push(redirectTo)
      return
    }

    router.refresh()
  }

  return (
    <form
      action={saveActivityWindows}
      className="space-y-3"
      id={formId}
      onSubmit={validateBeforeSubmit}
    >
      <input name="memberId" type="hidden" value={memberId} />
      {redirectTo ? (
        <input name="redirectTo" type="hidden" value={redirectTo} />
      ) : null}
      <div className="flex items-center gap-3">
        <h3 className="shrink-0 text-sm font-medium">Activity Windows</h3>
        <div className="min-w-10 flex-1 border-t border-border/70" />
        {showSubmitButton ? (
          <Button disabled={disabled} size="sm" type="submit" variant="ghost">
            Save activity
          </Button>
        ) : null}
      </div>
      <div className="grid gap-3">
        {rows.map((row, rowIndex) => {
          const monthError = hasActivityWindowFieldError(
            errors,
            rowIndex,
            "effectiveMonth"
          )
          const statusError = hasActivityWindowFieldError(
            errors,
            rowIndex,
            "status"
          )

          return (
            <div
              className="grid gap-3 border-t border-border/70 pt-3 sm:grid-cols-[9.5rem_9.5rem_minmax(0,1fr)_2rem] sm:items-start"
              key={row.id}
            >
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Month
                <input name="rowId" type="hidden" value={row.rowId} />
                <input name="notes" type="hidden" value={row.notes} />
                <Input
                  aria-invalid={monthError}
                  aria-label="Activity month"
                  disabled={disabled}
                  min={minMonth}
                  name="effectiveMonth"
                  onChange={(event) =>
                    updateRow(row.id, {
                      effectiveMonth: event.target.value,
                    })
                  }
                  type="month"
                  value={row.effectiveMonth}
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Status
                <Select
                  disabled={disabled}
                  onValueChange={(status) =>
                    updateRow(row.id, {
                      status: status as ActivityWindowStatus,
                    })
                  }
                  value={row.status}
                >
                  <SelectTrigger aria-invalid={statusError} className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="active">Active again</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <input name="status" type="hidden" value={row.status} />
              </label>
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Reason
                <Input
                  disabled={disabled}
                  name="reason"
                  onChange={(event) =>
                    updateRow(row.id, { reason: event.target.value })
                  }
                  placeholder="Leave, defaulting, transfer"
                  type="text"
                  value={row.reason}
                />
              </label>
              <div className="pt-6">
                <DeleteActivityWindowRowButton
                  disabled={
                    disabled ||
                    (rows.length === 1 && !activityWindowRowHasValue(row))
                  }
                  onDelete={() => deleteRow(row.id)}
                />
              </div>
            </div>
          )
        })}
        <AddInlineRowButton
          disabled={disabled}
          label="Add Activity Window"
          onAdd={addActivityWindowRow}
        />
      </div>
      {redirectTo && formId ? (
        <MemberBackfillFooterPortal>
          <Button disabled={disabled} form={formId} type="submit">
            Next
          </Button>
        </MemberBackfillFooterPortal>
      ) : null}
    </form>
  )
}
