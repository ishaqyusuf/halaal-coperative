"use client"

import { useMemo, useRef, useState, useTransition } from "react"
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
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import {
  importMembersCsvAction,
  stageImportBatchAction,
} from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"
import { readDashboardImportFileAsCsv } from "@/lib/import-excel"
import {
  dashboardImportConfigs,
  getDashboardImportExistingMatches,
  getDashboardImportPrimaryValue,
  parseDashboardImportCsv,
  parseDashboardImportGrid,
  serializeDashboardImportGrid,
  type DashboardImportGridRow,
  type DashboardImportReferenceData,
} from "@/lib/import-csv"
import { MemberImportSheetHeader } from "@/components/member-import-sheet-header"
import {
  memberImportColumns,
  memberImportRequiredColumns,
  normalizeMemberImportColumnSettings,
  type MemberImportColumnSettings,
} from "@/lib/member-import-column-settings"

const memberImportKind = "members"

const memberImportSchema = z.object({
  confirmExistingMatches: z.boolean().default(false),
  confirmInFileDuplicates: z.boolean().default(false),
  csvText: z.string().min(1, "Paste CSV content to continue."),
  stageImport: z.boolean().default(false),
})

type MemberImportValues = z.infer<typeof memberImportSchema>

function createEmptyGridRow(headers: string[]): DashboardImportGridRow {
  return Object.fromEntries(headers.map((header) => [header, ""]))
}

function isEmptyGridRow(headers: string[], row: DashboardImportGridRow) {
  return headers.every((header) => !row[header]?.trim())
}

function normalizeEditableRows(
  headers: string[],
  rows: DashboardImportGridRow[]
) {
  const populatedRows = rows.filter((row) => !isEmptyGridRow(headers, row))

  return [
    ...populatedRows,
    createEmptyGridRow(headers),
  ] as DashboardImportGridRow[]
}

function countPopulatedRows(headers: string[], rows: DashboardImportGridRow[]) {
  return rows.filter((row) => !isEmptyGridRow(headers, row)).length
}

function getActiveImportColumns(settings: MemberImportColumnSettings) {
  return settings.order.filter(
    (column) =>
      memberImportRequiredColumns.has(column) ||
      settings.visible[column] !== false
  )
}

function projectRowsToColumns(
  rows: DashboardImportGridRow[],
  columns: string[]
) {
  return rows.map((row) => {
    const nextRow = createEmptyGridRow(memberImportColumns)

    memberImportColumns.forEach((column) => {
      nextRow[column] = columns.includes(column) ? (row[column] ?? "") : ""
    })

    return nextRow
  })
}

function MemberImportEditableTable({
  headers,
  onCellChange,
  rows,
}: {
  headers: string[]
  onCellChange: (rowIndex: number, header: string, value: string) => void
  rows: DashboardImportGridRow[]
}) {
  return (
    <div className="rounded-xl bg-background">
      <div className="max-h-[45vh] overflow-auto">
        <div
          className="grid min-w-max text-xs"
          style={{
            gridTemplateColumns: `4rem repeat(${headers.length}, 11rem)`,
          }}
        >
          <div className="sticky top-0 left-0 z-30 border-r border-border/60 bg-muted/35 px-2 py-2 font-medium text-muted-foreground">
            Line
          </div>
          {headers.map((header) => (
            <div
              className="sticky top-0 z-20 border-r border-border/60 bg-muted/35 px-2 py-2 font-medium text-muted-foreground"
              key={header}
            >
              {header}
            </div>
          ))}
          {rows.map((row, rowIndex) => {
            const isBlankRow = isEmptyGridRow(memberImportColumns, row)
            const rowLabel =
              isBlankRow && rowIndex === rows.length - 1
                ? "New"
                : String(rowIndex + 1)

            return (
              <div
                className="contents"
                key={`member-import-row-${rowIndex}`}
              >
                <div className="sticky left-0 z-10 border-r border-border/60 bg-background px-2 py-2 text-xs text-muted-foreground">
                  {rowLabel}
                </div>
                {headers.map((header) => (
                  <div
                    className="border-r border-border/50 border-b border-border/40 p-0"
                    key={`${rowIndex}-${header}`}
                  >
                    <Input
                      aria-label={`${header} row ${rowIndex + 1}`}
                      className="h-9 w-full min-w-[11rem] rounded-none border-0 bg-transparent px-2 text-xs shadow-none focus-visible:ring-1"
                      value={row[header] ?? ""}
                      onChange={(event) =>
                        onCellChange(rowIndex, header, event.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function MemberImportContent({
  batches,
  devMode,
  initialColumnSettings,
  onClose,
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
  initialColumnSettings?: MemberImportColumnSettings
  onClose: () => void
  referenceData: DashboardImportReferenceData
}) {
  const config = dashboardImportConfigs.members
  const form = useZodForm<MemberImportValues>(memberImportSchema, {
    defaultValues: {
      confirmExistingMatches: false,
      confirmInFileDuplicates: false,
      csvText: "",
      stageImport: false,
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [isReadingFile, startFileTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const csvText = form.watch("csvText")
  const confirmedExistingMatches = form.watch("confirmExistingMatches")
  const confirmedInFileDuplicates = form.watch("confirmInFileDuplicates")
  const shouldStageImport = form.watch("stageImport")
  const latestBatch = batches.find((batch) => batch.importType === "members")
  const [columnSettings, setColumnSettings] = useState(() =>
    normalizeMemberImportColumnSettings(initialColumnSettings)
  )
  const [gridRows, setGridRows] = useState<DashboardImportGridRow[]>(() =>
    normalizeEditableRows(memberImportColumns, [])
  )
  const activeColumns = useMemo(
    () => getActiveImportColumns(columnSettings),
    [columnSettings]
  )

  const preview = useMemo(
    () => parseDashboardImportCsv("members", csvText),
    [csvText]
  )
  const reconciliation = useMemo(() => {
    if (!preview.ok) {
      return {
        duplicateCount: 0,
        duplicates: [] as string[],
        existingMatchCount: 0,
      }
    }

    const seen = new Set<string>()
    const duplicates = new Set<string>()
    let existingMatchCount = 0

    preview.rows.forEach((row) => {
      const primaryValue = getDashboardImportPrimaryValue(
        "members",
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
          "members",
          referenceData,
          row as Record<string, unknown>
        )
      ) {
        existingMatchCount += 1
      }
    })

    return {
      duplicateCount: duplicates.size,
      duplicates: Array.from(duplicates).slice(0, 4),
      existingMatchCount,
    }
  }, [preview, referenceData])
  const populatedGridRowCount = countPopulatedRows(activeColumns, gridRows)
  const shouldConfirmExistingMatches =
    preview.ok && reconciliation.existingMatchCount > 0
  const shouldConfirmInFileDuplicates =
    preview.ok && reconciliation.duplicateCount > 0

  function getRowsFromCsvText(nextCsvText: string, columns = activeColumns) {
    const nextGrid = parseDashboardImportGrid(memberImportKind, nextCsvText)
    const projectedRows = projectRowsToColumns(nextGrid.rows, columns)

    return normalizeEditableRows(memberImportColumns, projectedRows)
  }

  function setCsvTextFromRows(
    rows: DashboardImportGridRow[],
    columns = activeColumns
  ) {
    form.setValue("csvText", serializeDashboardImportGrid(columns, rows), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  function setCsvTextAndGrid(nextCsvText: string, columns = activeColumns) {
    const nextRows = getRowsFromCsvText(nextCsvText, columns)

    setGridRows(nextRows)
    form.setValue("csvText", serializeDashboardImportGrid(columns, nextRows), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
    resetReviewChecks()
  }

  function resetReviewChecks() {
    form.setValue("confirmExistingMatches", false, {
      shouldDirty: true,
      shouldValidate: true,
    })
    form.setValue("confirmInFileDuplicates", false, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  function resetImportForm(nextCsvText = "") {
    const nextRows = getRowsFromCsvText(nextCsvText)

    form.reset({
      confirmExistingMatches: false,
      confirmInFileDuplicates: false,
      csvText: nextCsvText
        ? serializeDashboardImportGrid(activeColumns, nextRows)
        : "",
      stageImport: false,
    })
    setGridRows(nextRows)
  }

  function onGridCellChange(rowIndex: number, header: string, value: string) {
    const nextRows = gridRows.map((row, index) =>
      index === rowIndex ? { ...row, [header]: value } : row
    )
    const normalizedRows = normalizeEditableRows(memberImportColumns, nextRows)

    setGridRows(normalizedRows)
    setCsvTextFromRows(normalizedRows)
    resetReviewChecks()
  }

  function onColumnSettingsChange(nextSettings: MemberImportColumnSettings) {
    const nextActiveColumns = getActiveImportColumns(nextSettings)
    const nextRows = normalizeEditableRows(
      memberImportColumns,
      projectRowsToColumns(gridRows, nextActiveColumns)
    )

    setColumnSettings(nextSettings)
    setGridRows(nextRows)
    form.setValue(
      "csvText",
      serializeDashboardImportGrid(nextActiveColumns, nextRows),
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      }
    )
    resetReviewChecks()
  }

  function onImportFile(file: File | undefined) {
    if (!file) {
      return
    }

    startFileTransition(async () => {
      try {
        const nextCsvText = await readDashboardImportFileAsCsv(file)
        setCsvTextAndGrid(nextCsvText)
        showSuccess("Import file loaded", `${file.name} is ready for review.`)
      } catch (error) {
        showError(
          "Could not read import file",
          error instanceof Error
            ? error.message
            : "Upload a CSV, XLS, or XLSX file."
        )
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    })
  }

  function onStage(values: MemberImportValues) {
    startTransition(async () => {
      try {
        if (!preview.ok || preview.rows.length === 0) {
          throw new Error("Add at least one valid member row before importing.")
        }

        if (
          reconciliation.existingMatchCount > 0 &&
          !values.confirmExistingMatches
        ) {
          throw new Error(
            "Review the rows that will match existing members and confirm before continuing."
          )
        }

        if (
          reconciliation.duplicateCount > 0 &&
          !values.confirmInFileDuplicates
        ) {
          throw new Error(
            "Review the duplicate rows in the file and confirm before continuing."
          )
        }

        if (values.stageImport) {
          await stageImportBatchAction(
            objectToFormData({ csvText: values.csvText, importKind: "members" })
          )
          showSuccess(
            "Members import staged",
            "Batch saved for review and later apply in the import workspace."
          )
        } else {
          await importMembersCsvAction(
            objectToFormData({
              confirmation: "IMPORT NOW",
              csvText: values.csvText,
            })
          )
          showSuccess(
            "Members imported",
            `${preview.rows.length} member row(s) applied to the registry.`
          )
        }
        resetImportForm()
        onClose()
      } catch (error) {
        showError(
          values.stageImport
            ? "Could not stage members import"
            : "Could not import members",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <>
      <MemberImportSheetHeader
        activeColumns={activeColumns}
        columnSettings={columnSettings}
        devMode={devMode}
        fileInputRef={fileInputRef}
        isReadingFile={isReadingFile}
        onClose={onClose}
        onColumnSettingsChange={onColumnSettingsChange}
        onImportFile={onImportFile}
        onQuickFill={() => resetImportForm(config.sampleCsv)}
      />

      <Form {...form}>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={form.handleSubmit(onStage)}
        >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <details className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                  CSV source
                </summary>
                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="csvText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CSV content</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            className="min-h-[180px] font-mono text-xs"
                            placeholder={config.sampleCsv}
                            onChange={(event) =>
                              setCsvTextAndGrid(event.target.value)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </details>

              <section className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Member rows
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {populatedGridRowCount} entered rows ·{" "}
                      {activeColumns.length} columns
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
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
                      <span>
                        {reconciliation.duplicateCount} in-file duplicates
                      </span>
                    ) : null}
                  </div>
                </div>

                <MemberImportEditableTable
                  headers={activeColumns}
                  rows={gridRows}
                  onCellChange={onGridCellChange}
                />
              </section>

              {!preview.ok && preview.errors.length > 0 ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">
                  {preview.errors.slice(0, 5).map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                  {preview.errors.length > 5 ? (
                    <p>+{preview.errors.length - 5} more validation issues</p>
                  ) : null}
                </div>
              ) : null}

              {preview.ok ? (
                <div className="grid gap-3 text-xs text-muted-foreground md:grid-cols-2">
                  <p className="rounded-xl border border-border/60 bg-background/80 p-3">
                    Existing member matches:{" "}
                    {reconciliation.existingMatchCount}. Matching rows will
                    update or link where the import supports idempotent upserts.
                  </p>
                  <p className="rounded-xl border border-border/60 bg-background/80 p-3">
                    In-file duplicates: {reconciliation.duplicateCount}
                    {reconciliation.duplicates.length
                      ? ` (${reconciliation.duplicates.join(", ")})`
                      : "."}
                  </p>
                </div>
              ) : null}

              {shouldConfirmExistingMatches || shouldConfirmInFileDuplicates ? (
                <div className="space-y-3 rounded-xl border border-border/60 bg-background/80 p-4">
                  <p className="text-sm font-medium text-foreground">
                    Import review gate
                  </p>
                  {shouldConfirmExistingMatches ? (
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
                              I reviewed the rows that match existing members.
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  ) : null}
                  {shouldConfirmInFileDuplicates ? (
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
                              I reviewed the duplicate rows inside this file.
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  ) : null}
                </div>
              ) : null}

              <FormField
                control={form.control}
                name="stageImport"
                render={({ field }) => (
                  <FormItem className="rounded-xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex flex-row items-start gap-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) =>
                            field.onChange(checked === true)
                          }
                        />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel>Stage for later review</FormLabel>
                        <p className="text-xs leading-5 text-muted-foreground">
                          Save this file as a staged import batch instead of
                          applying the member rows now. Staged batches are
                          reviewed and applied from `/settings/imports`.
                        </p>
                        <FormMessage />
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              {latestBatch ? (
                <p className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                  Latest staged batch: {latestBatch.status} ·{" "}
                  {latestBatch.validRows}/{latestBatch._count.rows} rows ·{" "}
                  {latestBatch.createdAt.toISOString().slice(0, 10)}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-6 py-4">
              <p className="text-sm text-muted-foreground">
                {shouldStageImport
                  ? "This will save a review batch for `/settings/imports`."
                  : "This will apply valid member rows to the registry now."}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  className="rounded-full"
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-full"
                  disabled={
                    !preview.ok ||
                    preview.rows.length === 0 ||
                    isPending ||
                    isReadingFile ||
                    (shouldConfirmExistingMatches &&
                      !confirmedExistingMatches) ||
                    (shouldConfirmInFileDuplicates &&
                      !confirmedInFileDuplicates)
                  }
                  type="submit"
                >
                  {isPending
                    ? shouldStageImport
                      ? "Staging..."
                      : "Importing..."
                    : shouldStageImport
                      ? "Stage members import"
                      : "Import members"}
                </Button>
              </div>
            </div>
        </form>
      </Form>
    </>
  )
}
