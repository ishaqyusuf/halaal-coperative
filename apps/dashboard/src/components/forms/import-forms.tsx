"use client"

import { useMemo, useTransition } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
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
import { cn } from "@halaalvest/ui/lib/utils"
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
import { useTRPC } from "@/trpc/client"

const csvImportSchema = z.object({
  confirmExistingMatches: z.boolean().default(false),
  confirmInFileDuplicates: z.boolean().default(false),
  csvText: z.string().min(1, "Paste CSV content to continue."),
  importConfirmation: z.string().optional(),
})

type CsvImportValues = z.infer<typeof csvImportSchema>

function formatPreviewValue(value: unknown) {
  if (value == null || value === "") {
    return "-"
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value)
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No"
  }

  return JSON.stringify(value)
}

function ImportPreviewTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: Array<Record<string, unknown>>
}) {
  if (headers.length === 0 || rows.length === 0) {
    return null
  }

  return (
    <div className="mt-3 max-w-full overflow-x-auto border-y border-border/60 bg-background/80">
      <div
        className="grid min-w-max text-xs"
        style={{
          gridTemplateColumns: `repeat(${headers.length}, 10rem)`,
        }}
      >
        {headers.map((header) => (
          <div
            className="border-r border-border/60 bg-muted/35 px-2 py-2 font-medium text-muted-foreground last:border-r-0"
            key={header}
          >
            {header}
          </div>
        ))}
        {rows.map((row, rowIndex) => (
          <div className="contents" key={`preview-row-${rowIndex}`}>
            {headers.map((header) => (
              <div
                className="truncate border-r border-b border-border/50 px-2 py-2 last:border-r-0"
                key={header}
              >
                {formatPreviewValue(row[header])}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

const importActionMap = {
  charges: importChargesCsvAction,
  contributions: importContributionsCsvAction,
  deduction_sources: importDeductionSourcesCsvAction,
  loan_migrations: importLoanMigrationsCsvAction,
  loan_products: importLoanProductsCsvAction,
  members: importMembersCsvAction,
  repayment_migrations: importRepaymentMigrationsCsvAction,
} satisfies Record<DashboardImportKind, (formData: FormData) => Promise<void>>

export type ImportAvailability = Record<
  DashboardImportKind,
  {
    blockedReason?: string
    isAvailable: boolean
  }
>

export type ImportBatchSummary = {
  _count: { rows: number }
  createdAt: Date
  createdByUser: { email: string; fullName: string; id: string }
  duplicateRowCount: number
  existingMatchCount: number
  id: string
  importType: string
  status: string
  validRows: number
}

export function DashboardImportForms({
  devMode,
  importAvailability,
  referenceData,
  batches,
}: {
  batches: ImportBatchSummary[]
  devMode: boolean
  importAvailability: ImportAvailability
  referenceData: DashboardImportReferenceData
}) {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Foundation imports
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Start with cooperative records that other migrations depend on.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <DashboardImportForm
            availability={importAvailability.members}
            batches={batches}
            devMode={devMode}
            importKind="members"
            referenceData={referenceData}
          />
          <DashboardImportForm
            availability={importAvailability.deduction_sources}
            batches={batches}
            devMode={devMode}
            importKind="deduction_sources"
            referenceData={referenceData}
          />
          <DashboardImportForm
            availability={importAvailability.loan_products}
            batches={batches}
            devMode={devMode}
            importKind="loan_products"
            referenceData={referenceData}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Record imports
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Bring in historical savings and charge activity after the base
            registry is ready.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <DashboardImportForm
            availability={importAvailability.contributions}
            batches={batches}
            devMode={devMode}
            importKind="contributions"
            referenceData={referenceData}
          />
          <DashboardImportForm
            availability={importAvailability.charges}
            batches={batches}
            devMode={devMode}
            importKind="charges"
            referenceData={referenceData}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Migration imports
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Use these when moving an existing cooperative loan book into the
            platform.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <DashboardImportForm
            availability={importAvailability.loan_migrations}
            batches={batches}
            devMode={devMode}
            importKind="loan_migrations"
            referenceData={referenceData}
          />
          <DashboardImportForm
            availability={importAvailability.repayment_migrations}
            batches={batches}
            devMode={devMode}
            importKind="repayment_migrations"
            referenceData={referenceData}
          />
        </div>
      </section>
    </div>
  )
}

export function DashboardImportForm({
  availability,
  batches,
  devMode,
  importKind,
  onSuccess,
  referenceData,
  surface = "card",
}: {
  availability: {
    blockedReason?: string
    isAvailable: boolean
  }
  batches: ImportBatchSummary[]
  devMode: boolean
  importKind: DashboardImportKind
  onSuccess?: () => void
  referenceData: DashboardImportReferenceData
  surface?: "card" | "sheet"
}) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const trpc = useTRPC()
  const config = dashboardImportConfigs[importKind]
  const form = useZodForm<CsvImportValues>(csvImportSchema, {
    defaultValues: {
      confirmExistingMatches: false,
      confirmInFileDuplicates: false,
      csvText: "",
      importConfirmation: "",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [isStaging, startStagingTransition] = useTransition()
  const csvText = form.watch("csvText")
  const importConfirmation = form.watch("importConfirmation")
  const confirmedExistingMatches = form.watch("confirmExistingMatches")
  const confirmedInFileDuplicates = form.watch("confirmInFileDuplicates")
  const latestBatch = batches.find((batch) => batch.importType === importKind)
  const isLocked = !availability.isAvailable

  async function refreshImportQueries() {
    const invalidations = [
      queryClient.invalidateQueries(
        trpc.imports.batches.infiniteQueryFilter()
      ),
    ]

    if (importKind === "members") {
      invalidations.push(
        queryClient.invalidateQueries(trpc.members.list.infiniteQueryFilter())
      )
    }

    await Promise.all(invalidations)
  }

  const preview = useMemo(
    () => parseDashboardImportCsv(importKind, csvText),
    [csvText, importKind]
  )
  const templateLines = config.sampleCsv.split("\n")
  const templateHeader = templateLines[0] ?? ""
  const templateRows = templateLines.slice(1)
  const reconciliation = useMemo(() => {
    if (!preview.ok) {
      return {
        duplicateCount: 0,
        existingMatches: [] as string[],
        existingMatchCount: 0,
        duplicates: [] as string[],
      }
    }

    const seen = new Set<string>()
    const duplicates = new Set<string>()
    const existingMatches = new Set<string>()
    let existingMatchCount = 0

    preview.rows.forEach((row) => {
      const primaryValue = getDashboardImportPrimaryValue(
        importKind,
        row as Record<string, unknown>
      )
      if (primaryValue) {
        if (seen.has(primaryValue)) {
          duplicates.add(primaryValue)
        } else {
          seen.add(primaryValue)
        }
      }

      if (
        getDashboardImportExistingMatches(
          importKind,
          referenceData,
          row as Record<string, unknown>
        )
      ) {
        existingMatchCount += 1
        if (primaryValue) existingMatches.add(primaryValue)
      }
    })

    return {
      duplicateCount: duplicates.size,
      duplicates: Array.from(duplicates).slice(0, 4),
      existingMatches: Array.from(existingMatches).slice(0, 4),
      existingMatchCount,
    }
  }, [importKind, preview, referenceData])

  function onSubmit(values: CsvImportValues) {
    startTransition(async () => {
      try {
        if (isLocked) {
          throw new Error(
            availability.blockedReason ?? "This import is currently locked."
          )
        }

        if (
          preview.ok &&
          reconciliation.existingMatchCount > 0 &&
          !values.confirmExistingMatches
        ) {
          throw new Error(
            "Review the rows that will update existing workspace records and confirm before importing."
          )
        }

        if (
          preview.ok &&
          reconciliation.duplicateCount > 0 &&
          !values.confirmInFileDuplicates
        ) {
          throw new Error(
            "Remove or intentionally confirm in-file duplicates before importing."
          )
        }

        if (values.importConfirmation !== "IMPORT NOW") {
          throw new Error(
            "Type IMPORT NOW to run a direct import without staging."
          )
        }

        const action = importActionMap[importKind]
        await action(
          objectToFormData({
            confirmation: values.importConfirmation,
            csvText: values.csvText,
          })
        )
        await refreshImportQueries()
        router.refresh()
        showSuccess(
          `${config.title} imported`,
          `${preview.ok ? preview.rows.length : 0} rows processed successfully.`
        )
        form.reset({
          confirmExistingMatches: false,
          confirmInFileDuplicates: false,
          csvText: "",
          importConfirmation: "",
        })
        onSuccess?.()
      } catch (error) {
        showError(
          `Could not import ${config.title.toLowerCase()}`,
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  function onStageBatch(values: CsvImportValues) {
    startStagingTransition(async () => {
      try {
        if (isLocked) {
          throw new Error(
            availability.blockedReason ?? "This import is currently locked."
          )
        }

        await stageImportBatchAction(
          objectToFormData({ csvText: values.csvText, importKind })
        )
        await refreshImportQueries()
        router.refresh()
        showSuccess(
          `${config.title} staged`,
          "Import batch saved for later review and apply."
        )
        onSuccess?.()
      } catch (error) {
        showError(
          `Could not stage ${config.title.toLowerCase()}`,
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  const isDeductionSourceImport = importKind === "deduction_sources"
  const hasUnsafeDeductionSourceDuplicates =
    isDeductionSourceImport && reconciliation.duplicateCount > 0

  return (
    <article
      className={cn(
        "min-w-0",
        surface === "card"
          ? "rounded-lg border border-border/70 bg-background/92 p-5 shadow-sm"
          : "w-full bg-transparent"
      )}
    >
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h4 className="text-lg font-semibold text-foreground">
                {config.title}
              </h4>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {config.description}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:flex-wrap sm:justify-end">
              <Button
                className="h-11 md:h-9"
                disabled={isLocked}
                type="button"
                variant="outline"
                onClick={() =>
                  form.setValue("csvText", config.sampleCsv, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                Use template
              </Button>
              {devMode ? (
                <Button
                  className="h-11 md:h-9"
                  disabled={isLocked}
                  type="button"
                  variant="outline"
                  onClick={() => form.reset({ csvText: config.sampleCsv })}
                >
                  Quick fill
                </Button>
              ) : null}
            </div>
          </div>

          {isLocked ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <p className="font-medium">Import locked</p>
              <p className="mt-1">{availability.blockedReason}</p>
            </div>
          ) : null}

          <details className="border-y border-border py-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              CSV template
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Required header
                </p>
                <pre className="mt-2 max-w-full overflow-x-auto border-y border-border/60 bg-background/80 p-3 text-xs text-muted-foreground">
                  {templateHeader}
                </pre>
              </div>
              {templateRows.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Example rows
                  </p>
                  <pre className="mt-2 max-w-full overflow-x-auto border-y border-border/60 bg-background/80 p-3 text-xs text-muted-foreground">
                    {templateRows.join("\n")}
                  </pre>
                </div>
              ) : null}
            </div>
          </details>

          <FormField
            control={form.control}
            name="csvText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CSV content</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    className="min-h-[220px] min-w-0 max-w-full font-mono text-xs"
                    disabled={isLocked}
                    placeholder={config.sampleCsv}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="min-w-0 border-y border-border py-4">
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>
                {preview.headers.length > 0
                  ? `${preview.headers.length} columns`
                  : "No headers yet"}
              </span>
              <span>
                {preview.previewRows.length > 0
                  ? `${preview.previewRows.length} preview rows`
                  : "No preview rows"}
              </span>
              <span>
                {preview.ok
                  ? `${preview.rows.length} valid rows`
                  : `${preview.errors.length} validation issues`}
              </span>
              {preview.ok ? (
                <span>
                  {reconciliation.existingMatchCount} existing matches
                </span>
              ) : null}
              {preview.ok ? (
                <span>{reconciliation.duplicateCount} in-file duplicates</span>
              ) : null}
            </div>

            {preview.headers.length > 0 ? (
              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                Headers: {preview.headers.join(", ")}
              </p>
            ) : null}

            {preview.previewRows.length > 0 ? (
              <ImportPreviewTable
                headers={preview.headers}
                rows={preview.previewRows}
              />
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
                  Existing matches in workspace: {reconciliation.existingMatchCount}.{" "}
                  {isDeductionSourceImport
                    ? `Matching source names will update their type and external reference${reconciliation.existingMatches.length ? `: ${reconciliation.existingMatches.join(", ")}.` : "."}`
                    : "Matching keys will be updated or linked where the import path supports idempotent upserts."}
                </p>
                <p>
                  In-file duplicates: {reconciliation.duplicateCount}
                  {reconciliation.duplicates.length
                    ? ` (${reconciliation.duplicates.join(", ")})`
                    : "."}
                </p>
                {isDeductionSourceImport ? (
                  <p className="md:col-span-2">
                    Allowed source types: ministry payroll, employer payroll,
                    bank transfer, card, cash, and manual. This import creates
                    collection sources; it does not post deductions.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {preview.ok &&
          (reconciliation.existingMatchCount > 0 ||
            reconciliation.duplicateCount > 0) ? (
            <div className="space-y-3 border-y border-border py-4">
              <p className="text-sm font-medium text-foreground">
                Import review gate
              </p>
              {reconciliation.existingMatchCount > 0 ? (
                <FormField
                  control={form.control}
                  name="confirmExistingMatches"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) =>
                            field.onChange(checked === true)
                          }
                        />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel>
                          {isDeductionSourceImport
                            ? `I reviewed the ${reconciliation.existingMatchCount} collection sources whose type or external reference may be updated.`
                            : `I reviewed the ${reconciliation.existingMatchCount} rows that will match existing workspace records.`}
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              ) : null}
              {reconciliation.duplicateCount > 0 &&
              isDeductionSourceImport ? (
                <p className="text-sm leading-6 text-destructive">
                  Remove duplicate collection-source names before staging or
                  importing. Duplicate configuration rows cannot be safely
                  applied.
                </p>
              ) : reconciliation.duplicateCount > 0 ? (
                <FormField
                  control={form.control}
                  name="confirmInFileDuplicates"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) =>
                            field.onChange(checked === true)
                          }
                        />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel>
                          I understand this file contains duplicate keys and
                          want to continue anyway.
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              ) : null}
            </div>
          ) : null}

          {latestBatch ? (
            <div className="border-y border-border py-4 text-xs text-muted-foreground">
              Latest staged batch: {latestBatch.status} ·{" "}
              {latestBatch.validRows}/{latestBatch._count.rows} rows ·{" "}
              {latestBatch.createdAt.toISOString().slice(0, 10)}
            </div>
          ) : null}

          <FormField
            control={form.control}
            name="importConfirmation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type IMPORT NOW for direct import</FormLabel>
                <FormControl>
                  <input
                    {...field}
                    className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground md:h-9"
                    disabled={isLocked}
                    placeholder="IMPORT NOW"
                    type="text"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
            <p className="text-xs leading-6 text-muted-foreground">
              Stage a valid file for later review, or type the direct import
              confirmation to post immediately.
            </p>
            <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto">
              <StageBatchButton
                disabled={
                  isPending ||
                  isStaging ||
                  isLocked ||
                  !preview.ok ||
                  preview.rows.length === 0 ||
                  hasUnsafeDeductionSourceDuplicates ||
                  (reconciliation.existingMatchCount > 0 &&
                    !confirmedExistingMatches) ||
                  (reconciliation.duplicateCount > 0 &&
                    !confirmedInFileDuplicates)
                }
                onStage={() => onStageBatch(form.getValues())}
              />
              <Button
                className="h-11 w-full md:h-9 md:w-auto"
                disabled={
                  isPending ||
                  isStaging ||
                  isLocked ||
                  !preview.ok ||
                  preview.rows.length === 0 ||
                  importConfirmation !== "IMPORT NOW" ||
                  hasUnsafeDeductionSourceDuplicates ||
                  (reconciliation.existingMatchCount > 0 &&
                    !confirmedExistingMatches) ||
                  (reconciliation.duplicateCount > 0 &&
                    !confirmedInFileDuplicates)
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
    <Button
      className="h-11 w-full md:h-9 md:w-auto"
      disabled={disabled}
      onClick={onStage}
      type="button"
      variant="outline"
    >
      Stage batch
    </Button>
  )
}
