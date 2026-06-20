"use client"

import { useMemo, useTransition } from "react"
import { z } from "zod"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaalvest/ui/components/form"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import {
  importChargesCsvAction,
  importContributionsCsvAction,
  importDeductionSourcesCsvAction,
  importLoanMigrationsCsvAction,
  importLoanProductsCsvAction,
  importMembersCsvAction,
  importRepaymentMigrationsCsvAction,
  stageImportBatchAction,
} from "@/lib/dashboard-actions"
import {
  dashboardImportConfigs,
  getDashboardImportExistingMatches,
  getDashboardImportPrimaryValue,
  parseDashboardImportCsv,
  type DashboardImportKind,
  type DashboardImportReferenceData,
} from "@/lib/import-csv"
import { objectToFormData } from "@/lib/form-submit"

const csvImportSchema = z.object({
  confirmExistingMatches: z.boolean().default(false),
  confirmInFileDuplicates: z.boolean().default(false),
  csvText: z.string().min(1, "Paste CSV content to continue."),
})

type CsvImportValues = z.infer<typeof csvImportSchema>

const importActionMap = {
  charges: importChargesCsvAction,
  contributions: importContributionsCsvAction,
  deduction_sources: importDeductionSourcesCsvAction,
  loan_migrations: importLoanMigrationsCsvAction,
  loan_products: importLoanProductsCsvAction,
  members: importMembersCsvAction,
  repayment_migrations: importRepaymentMigrationsCsvAction,
} satisfies Record<DashboardImportKind, (formData: FormData) => Promise<void>>

export function DashboardImportForms({
  devMode,
  referenceData,
  batches,
}: {
  batches: Array<{
    _count: { rows: number }
    createdAt: Date
    createdByUser: { email: string; fullName: string; id: string }
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
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Foundation imports</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Start with cooperative records that other migrations depend on.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <CsvImportCard batches={batches} devMode={devMode} importKind="members" referenceData={referenceData} />
          <CsvImportCard batches={batches} devMode={devMode} importKind="deduction_sources" referenceData={referenceData} />
          <CsvImportCard batches={batches} devMode={devMode} importKind="loan_products" referenceData={referenceData} />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Record imports</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Bring in historical savings and charge activity after the base registry is ready.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <CsvImportCard batches={batches} devMode={devMode} importKind="contributions" referenceData={referenceData} />
          <CsvImportCard batches={batches} devMode={devMode} importKind="charges" referenceData={referenceData} />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Migration imports</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Use these when moving an existing cooperative loan book into the platform.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <CsvImportCard batches={batches} devMode={devMode} importKind="loan_migrations" referenceData={referenceData} />
          <CsvImportCard batches={batches} devMode={devMode} importKind="repayment_migrations" referenceData={referenceData} />
        </div>
      </section>
    </div>
  )
}

function CsvImportCard({
  batches,
  devMode,
  importKind,
  referenceData,
}: {
  batches: Array<{
    _count: { rows: number }
    createdAt: Date
    createdByUser: { email: string; fullName: string; id: string }
    duplicateRowCount: number
    existingMatchCount: number
    id: string
    importType: string
    status: string
    validRows: number
  }>
  devMode: boolean
  importKind: DashboardImportKind
  referenceData: DashboardImportReferenceData
}) {
  const config = dashboardImportConfigs[importKind]
  const form = useZodForm<CsvImportValues>(csvImportSchema, {
    defaultValues: {
      confirmExistingMatches: false,
      confirmInFileDuplicates: false,
      csvText: "",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [isStaging, startStagingTransition] = useTransition()
  const csvText = form.watch("csvText")
  const latestBatch = batches.find((batch) => batch.importType === importKind)

  const preview = useMemo(() => parseDashboardImportCsv(importKind, csvText), [csvText, importKind])
  const reconciliation = useMemo(() => {
    if (!preview.ok) {
      return {
        duplicateCount: 0,
        existingMatchCount: 0,
        duplicates: [] as string[],
      }
    }

    const seen = new Set<string>()
    const duplicates = new Set<string>()
    let existingMatchCount = 0

    preview.rows.forEach((row) => {
      const primaryValue = getDashboardImportPrimaryValue(importKind, row as Record<string, unknown>)
      if (primaryValue) {
        if (seen.has(primaryValue)) {
          duplicates.add(primaryValue)
        } else {
          seen.add(primaryValue)
        }
      }

      if (getDashboardImportExistingMatches(importKind, referenceData, row as Record<string, unknown>)) {
        existingMatchCount += 1
      }
    })

    return {
      duplicateCount: duplicates.size,
      duplicates: Array.from(duplicates).slice(0, 4),
      existingMatchCount,
    }
  }, [importKind, preview, referenceData])

  function onSubmit(values: CsvImportValues) {
    startTransition(async () => {
      try {
        if (preview.ok && reconciliation.existingMatchCount > 0 && !values.confirmExistingMatches) {
          throw new Error("Review the rows that will update existing workspace records and confirm before importing.")
        }

        if (preview.ok && reconciliation.duplicateCount > 0 && !values.confirmInFileDuplicates) {
          throw new Error("Remove or intentionally confirm in-file duplicates before importing.")
        }

        const action = importActionMap[importKind]
        await action(objectToFormData({ csvText: values.csvText }))
        showSuccess(`${config.title} imported`, `${preview.ok ? preview.rows.length : 0} rows processed successfully.`)
        form.reset({
          confirmExistingMatches: false,
          confirmInFileDuplicates: false,
          csvText: "",
        })
      } catch (error) {
        showError(
          `Could not import ${config.title.toLowerCase()}`,
          error instanceof Error ? error.message : "Something went wrong.",
        )
      }
    })
  }

  function onStageBatch(values: CsvImportValues) {
    startStagingTransition(async () => {
      try {
        await stageImportBatchAction(objectToFormData({ csvText: values.csvText, importKind }))
        showSuccess(`${config.title} staged`, "Import batch saved for later review and apply.")
      } catch (error) {
        showError(
          `Could not stage ${config.title.toLowerCase()}`,
          error instanceof Error ? error.message : "Something went wrong.",
        )
      }
    })
  }

  return (
    <article className="rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm">
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-lg font-semibold tracking-tight text-foreground">{config.title}</h4>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{config.description}</p>
            </div>
            {devMode ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset({ csvText: config.sampleCsv })}
              >
                Quick fill
              </Button>
            ) : null}
          </div>

          <FormField
            control={form.control}
            name="csvText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CSV content</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    className="min-h-[220px] font-mono text-xs"
                    placeholder={config.sampleCsv}
                  />
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
              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                Headers: {preview.headers.join(", ")}
              </p>
            ) : null}

            {preview.previewRows.length > 0 ? (
              <div className="mt-3 space-y-2">
                {preview.previewRows.map((row, index) => (
                  <pre
                    key={`${importKind}-row-${index}`}
                    className="overflow-x-auto rounded-xl border border-border/60 bg-background/80 p-3 text-xs text-muted-foreground"
                  >
                    {JSON.stringify(row, null, 2)}
                  </pre>
                ))}
              </div>
            ) : null}

            {!preview.ok && preview.errors.length > 0 ? (
              <div className="mt-3 space-y-1 text-xs text-destructive">
                {preview.errors.slice(0, 4).map((error) => (
                  <p key={error}>{error}</p>
                ))}
                {preview.errors.length > 4 ? (
                  <p>+{preview.errors.length - 4} more validation issues</p>
                ) : null}
              </div>
            ) : null}

            {preview.ok ? (
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                <p>
                  Existing matches in workspace: {reconciliation.existingMatchCount}. Matching keys will be updated or linked where the import path supports idempotent upserts.
                </p>
                <p>
                  In-file duplicates: {reconciliation.duplicateCount}
                  {reconciliation.duplicates.length
                    ? ` (${reconciliation.duplicates.join(", ")})`
                    : "."}
                </p>
              </div>
            ) : null}
          </div>

          {preview.ok && (reconciliation.existingMatchCount > 0 || reconciliation.duplicateCount > 0) ? (
            <div className="space-y-3 rounded-[1.25rem] border border-border/60 bg-background/80 p-4">
              <p className="text-sm font-medium text-foreground">Import review gate</p>
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
                        <FormLabel>I reviewed the {reconciliation.existingMatchCount} rows that will match existing workspace records.</FormLabel>
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
                        <FormLabel>I understand this file contains duplicate keys and want to continue anyway.</FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              ) : null}
            </div>
          ) : null}

          {latestBatch ? (
            <div className="rounded-[1.25rem] border border-border/60 bg-background/80 p-4 text-xs text-muted-foreground">
              Latest staged batch: {latestBatch.status} · {latestBatch.validRows}/{latestBatch._count.rows} rows ·{" "}
              {latestBatch.createdAt.toISOString().slice(0, 10)}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs leading-6 text-muted-foreground">
              Use the sample format as the template. Imports are idempotent where matching keys already exist.
            </p>
            <div className="flex gap-2">
              <StageBatchButton
                disabled={
                  isPending ||
                  isStaging ||
                  !preview.ok ||
                  preview.rows.length === 0 ||
                  (reconciliation.existingMatchCount > 0 && !form.watch("confirmExistingMatches")) ||
                  (reconciliation.duplicateCount > 0 && !form.watch("confirmInFileDuplicates"))
                }
                onStage={() => onStageBatch(form.getValues())}
              />
              <Button
                disabled={
                  isPending ||
                  isStaging ||
                  !preview.ok ||
                  preview.rows.length === 0 ||
                  (reconciliation.existingMatchCount > 0 && !form.watch("confirmExistingMatches")) ||
                  (reconciliation.duplicateCount > 0 && !form.watch("confirmInFileDuplicates"))
                }
                type="submit"
              >
                Import now
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </article>
  )
}

function StageBatchButton({
  disabled,
  onStage,
}: {
  disabled: boolean
  onStage: () => void
}) {
  return (
    <Button disabled={disabled} onClick={onStage} type="button" variant="outline">
      Stage batch
    </Button>
  )
}
