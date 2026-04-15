"use client"

import { useMemo, useTransition } from "react"
import { z } from "zod"
import { useNotifications } from "@halaal-vest/notifications-react"
import { Button } from "@halaal-vest/ui/components/button"
import { Checkbox } from "@halaal-vest/ui/components/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaal-vest/ui/components/form"
import { Textarea } from "@halaal-vest/ui/components/textarea"
import { useZodForm } from "@halaal-vest/ui/hooks/use-zod-form"
import { DashboardSectionCard, DashboardSectionHeader } from "@/components/dashboard/primitives"
import { stageImportBatchAction } from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"
import {
  dashboardImportConfigs,
  getDashboardImportExistingMatches,
  getDashboardImportPrimaryValue,
  parseDashboardImportCsv,
  type DashboardImportReferenceData,
} from "@/lib/import-csv"

const memberImportSchema = z.object({
  confirmExistingMatches: z.boolean().default(false),
  confirmInFileDuplicates: z.boolean().default(false),
  csvText: z.string().min(1, "Paste CSV content to continue."),
})

type MemberImportValues = z.infer<typeof memberImportSchema>

export function MemberImportPanel({
  batches,
  devMode,
  referenceData,
}: {
  batches: Array<{
    _count: { rows: number }
    createdAt: Date
    duplicateRowCount: number
    existingMatchCount: number
    id: string
    importType: string
    status: string
    validRows: number
  }>
  devMode: boolean
  referenceData: DashboardImportReferenceData
}) {
  const config = dashboardImportConfigs.members
  const form = useZodForm<MemberImportValues>(memberImportSchema, {
    defaultValues: {
      confirmExistingMatches: false,
      confirmInFileDuplicates: false,
      csvText: "",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const csvText = form.watch("csvText")
  const latestBatch = batches.find((batch) => batch.importType === "members")

  const preview = useMemo(() => parseDashboardImportCsv("members", csvText), [csvText])
  const reconciliation = useMemo(() => {
    if (!preview.ok) {
      return { duplicateCount: 0, duplicates: [] as string[], existingMatchCount: 0 }
    }

    const seen = new Set<string>()
    const duplicates = new Set<string>()
    let existingMatchCount = 0

    preview.rows.forEach((row) => {
      const primaryValue = getDashboardImportPrimaryValue("members", row as Record<string, unknown>)
      if (primaryValue) {
        if (seen.has(primaryValue)) {
          duplicates.add(primaryValue)
        } else {
          seen.add(primaryValue)
        }
      }

      if (getDashboardImportExistingMatches("members", referenceData, row as Record<string, unknown>)) {
        existingMatchCount += 1
      }
    })

    return {
      duplicateCount: duplicates.size,
      duplicates: Array.from(duplicates).slice(0, 4),
      existingMatchCount,
    }
  }, [preview, referenceData])

  function onStage(values: MemberImportValues) {
    startTransition(async () => {
      try {
        if (preview.ok && reconciliation.existingMatchCount > 0 && !values.confirmExistingMatches) {
          throw new Error("Review the rows that will match existing members and confirm before staging.")
        }

        if (preview.ok && reconciliation.duplicateCount > 0 && !values.confirmInFileDuplicates) {
          throw new Error("Review the duplicate rows in the file and confirm before staging.")
        }

        await stageImportBatchAction(objectToFormData({ csvText: values.csvText, importKind: "members" }))
        showSuccess("Members import staged", "Batch saved for review and later apply in the import workspace.")
      } catch (error) {
        showError(
          "Could not stage members import",
          error instanceof Error ? error.message : "Something went wrong.",
        )
      }
    })
  }

  return (
    <DashboardSectionCard>
      <DashboardSectionHeader
        eyebrow="Import"
        title="Import members"
        description="Paste member CSV, validate it, then stage the batch for apply. This is the fast-path entry to the existing import pipeline."
        actions={
          devMode ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() =>
                form.reset({
                  confirmExistingMatches: false,
                  confirmInFileDuplicates: false,
                  csvText: config.sampleCsv,
                })
              }
            >
              Quick fill
            </Button>
          ) : null
        }
      />

      <Form {...form}>
        <form className="mt-5 space-y-4" onSubmit={form.handleSubmit(onStage)}>
          <FormField
            control={form.control}
            name="csvText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CSV content</FormLabel>
                <FormControl>
                  <Textarea {...field} className="min-h-[220px] font-mono text-xs" placeholder={config.sampleCsv} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="rounded-[1.25rem] border border-border/60 bg-muted/30 p-4">
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>{preview.headers.length > 0 ? `${preview.headers.length} columns` : "No headers yet"}</span>
              <span>{preview.previewRows.length > 0 ? `${preview.previewRows.length} preview rows` : "No preview rows"}</span>
              <span>{preview.ok ? `${preview.rows.length} valid rows` : `${preview.errors.length} validation issues`}</span>
              {preview.ok ? <span>{reconciliation.existingMatchCount} existing matches</span> : null}
              {preview.ok ? <span>{reconciliation.duplicateCount} in-file duplicates</span> : null}
            </div>

            {preview.headers.length > 0 ? (
              <p className="mt-3 text-xs leading-6 text-muted-foreground">Headers: {preview.headers.join(", ")}</p>
            ) : null}

            {!preview.ok && preview.errors.length > 0 ? (
              <div className="mt-3 space-y-1 text-xs text-destructive">
                {preview.errors.slice(0, 4).map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}

            {preview.ok ? (
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                <p>Existing member matches: {reconciliation.existingMatchCount}. Matching rows will update or link where the import supports idempotent upserts.</p>
                <p>
                  In-file duplicates: {reconciliation.duplicateCount}
                  {reconciliation.duplicates.length ? ` (${reconciliation.duplicates.join(", ")})` : "."}
                </p>
              </div>
            ) : null}

            {latestBatch ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Latest staged batch: {latestBatch.status} · {latestBatch.validRows}/{latestBatch._count.rows} rows · {latestBatch.createdAt.toISOString().slice(0, 10)}
              </p>
            ) : null}
          </div>

          {preview.ok && (reconciliation.existingMatchCount > 0 || reconciliation.duplicateCount > 0) ? (
            <div className="space-y-3 rounded-[1.25rem] border border-border/60 bg-background/80 p-4">
              {reconciliation.existingMatchCount > 0 ? (
                <FormField
                  control={form.control}
                  name="confirmExistingMatches"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel>I reviewed the rows that match existing members.</FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              ) : null}
              {reconciliation.duplicateCount > 0 ? (
                <FormField
                  control={form.control}
                  name="confirmInFileDuplicates"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel>I reviewed the duplicate rows inside this file.</FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={isPending} type="submit" className="rounded-full">
              Stage members import
            </Button>
            <p className="text-sm text-muted-foreground">Apply the staged batch later from `/app/settings/imports`.</p>
          </div>
        </form>
      </Form>
    </DashboardSectionCard>
  )
}
