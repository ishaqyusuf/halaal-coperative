"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, CheckCircle2, Download, FileUp } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useRef, useState, useTransition } from "react"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import { Spinner } from "@halaalvest/ui/components/spinner"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { ConfirmActionDialog } from "@/components/confirm-action-dialog"
import {
  DashboardQuickFill,
  useDashboardQaEmailDomain,
} from "@/components/dashboard-quick-fill"
import type { ImportAvailability } from "@/components/imports/import-types"
import { useMarkWorkflowSaved } from "@/components/workflow-presentation"
import { importFileAction } from "@/lib/dashboard-actions"
import { createQaImportCsv } from "@/lib/dev-form-fill"
import { objectToFormData } from "@/lib/form-submit"
import {
  dashboardImportConfigs,
  getDashboardImportTemplateHeaders,
  type DashboardImportKind,
} from "@/lib/import-csv"
import {
  downloadDashboardImportTemplate,
  readDashboardImportFileAsCsv,
} from "@/lib/import-excel"
import {
  getRequiredImportColumns,
  isImportReady,
  reviewImportFile,
} from "@/lib/imports/import-review"
import {
  formatImportNaira,
  importColumnLabel,
  importCount,
  importKindWords,
} from "@/lib/imports/import-words"
import { useTRPC } from "@/trpc/client"

const SHOWN_PROBLEM_ROWS = 20

function Step({
  children,
  number,
  title,
}: {
  children: React.ReactNode
  number: number
  title: string
}) {
  return (
    <section className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 gap-y-3">
      <span
        aria-hidden
        className="flex size-9 items-center justify-center rounded-full bg-muted text-base font-semibold text-foreground"
      >
        {number}
      </span>
      <h3 className="self-center text-lg font-semibold text-foreground">
        {title}
      </h3>
      <div className="col-start-2 min-w-0 space-y-3">{children}</div>
    </section>
  )
}

/**
 * Adding records from a spreadsheet, in one modal: get the template, choose
 * the filled-in file, check what will be added, then add it. Money files are
 * confirmed in an AlertDialog that names the count and total.
 */
export function ImportFileContent({
  availability,
  devMode,
  importKind,
  onAdded,
  onClose,
}: {
  availability: ImportAvailability[DashboardImportKind]
  devMode: boolean
  importKind: DashboardImportKind
  onAdded: (batchId: string) => void
  onClose: () => void
}) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const router = useRouter()
  const markSaved = useMarkWorkflowSaved()
  const { showError, showSuccess } = useNotifications()
  const qaEmailDomain = useDashboardQaEmailDomain()
  const words = importKindWords[importKind]
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [csvText, setCsvText] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [confirmUpdates, setConfirmUpdates] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isReading, startReading] = useTransition()
  const [isAdding, startAdding] = useTransition()
  // Existing member numbers and names, for checking the file before it is
  // sent. Loaded when the dialog opens, not with the page.
  const referenceData = useQuery(trpc.imports.referenceData.queryOptions())
  const review = useMemo(
    () => reviewImportFile(importKind, csvText, referenceData.data),
    [csvText, importKind, referenceData.data]
  )
  const requiredColumns = getRequiredImportColumns(importKind)
  const templateColumns = getDashboardImportTemplateHeaders(importKind)
  const needsUpdateConfirm =
    (importKind === "deduction_sources" || importKind === "loan_products") &&
    review.updateCount > 0
  const ready =
    availability.isAvailable &&
    Boolean(referenceData.data) &&
    isImportReady(review) &&
    (!needsUpdateConfirm || confirmUpdates)
  const total =
    review.totalAmount === null ? null : formatImportNaira(review.totalAmount)
  const addLabel = `Add ${importCount(importKind, review.readyCount)}`

  function chooseFile(file: File | undefined) {
    if (!file) return

    startReading(async () => {
      try {
        const text = await readDashboardImportFileAsCsv(file)
        setCsvText(text)
        setFileName(file.name)
        setConfirmUpdates(false)
      } catch (error) {
        showError(
          "Could not read that file",
          error instanceof Error
            ? error.message
            : "Choose a CSV, XLS or XLSX file."
        )
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    })
  }

  function downloadTemplate() {
    downloadDashboardImportTemplate(importKind).catch((error: unknown) => {
      showError(
        "Could not download the template",
        error instanceof Error ? error.message : "Please try again."
      )
    })
  }

  function add() {
    startAdding(async () => {
      try {
        const result = await importFileAction(
          objectToFormData({
            confirmExistingMatches: confirmUpdates,
            csvText,
            importKind,
          })
        )
        await Promise.all([
          queryClient.invalidateQueries(trpc.imports.pathFilter()),
          importKind === "members"
            ? queryClient.invalidateQueries(
                trpc.members.list.infiniteQueryFilter()
              )
            : Promise.resolve(),
        ])
        router.refresh()
        markSaved()
        setConfirmOpen(false)
        showSuccess(
          "Added",
          `${importCount(importKind, result.processed)} added.`
        )
        onAdded(result.batchId)
      } catch (error) {
        setConfirmOpen(false)
        showError(
          "Nothing was added",
          error instanceof Error ? error.message : "Please try again."
        )
      }
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DialogHeader className="border-b border-border/70 px-4 py-4 text-left sm:px-6">
        <DialogTitle className="text-xl font-semibold">
          Add {words.many} from a spreadsheet
        </DialogTitle>
        <DialogDescription className="text-base text-foreground/80">
          {words.line}
        </DialogDescription>
      </DialogHeader>

      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-4 py-5 sm:px-6">
        {!availability.isAvailable ? (
          <p
            className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-base text-amber-950"
            role="status"
          >
            {availability.blockedReason}
          </p>
        ) : null}

        <Step number={1} title="Get the template">
          <p className="text-base text-muted-foreground">
            Fill in one row for each {words.one}. Keep the first row as it is.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="touch"
              className="text-base"
              onClick={downloadTemplate}
              type="button"
              variant="outline"
            >
              <Download aria-hidden />
              Download template
            </Button>
            {devMode ? (
              <DashboardQuickFill
                enabled={availability.isAvailable}
                onFill={({ emailDomain }) => {
                  setCsvText(
                    createQaImportCsv(
                      importKind,
                      dashboardImportConfigs[importKind].sampleCsv,
                      { emailDomain: emailDomain || qaEmailDomain }
                    )
                  )
                  setFileName("Quick fill")
                }}
              />
            ) : null}
          </div>
          <details className="group text-base">
            <summary className="flex min-h-11 cursor-pointer items-center font-medium text-foreground underline-offset-4 hover:underline">
              What goes in each column
            </summary>
            <ul className="mt-2 divide-y divide-border/70 border-y border-border/70">
              {templateColumns.map((column) => (
                <li
                  className="flex items-center justify-between gap-3 py-2"
                  key={column}
                >
                  <span className="text-foreground">
                    {importColumnLabel(column)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {requiredColumns.includes(column)
                      ? "Needed"
                      : "Can be left empty"}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </Step>

        <Step number={2} title="Choose your filled-in file">
          <input
            accept=".csv,.txt,.xls,.xlsx"
            className="sr-only"
            disabled={!availability.isAvailable || isReading}
            id={`import-file-${importKind}`}
            onChange={(event) => chooseFile(event.target.files?.[0])}
            ref={fileInputRef}
            type="file"
          />
          <label
            className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-border bg-background px-4 py-3 text-base font-medium text-foreground hover:bg-muted/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            htmlFor={`import-file-${importKind}`}
          >
            {isReading ? (
              <Spinner className="size-5" />
            ) : (
              <FileUp aria-hidden className="size-5 shrink-0" />
            )}
            <span className="min-w-0 truncate">
              {fileName ? fileName : "Choose file (Excel or CSV)"}
            </span>
            {fileName ? (
              <span className="ml-auto shrink-0 text-sm text-muted-foreground">
                Change
              </span>
            ) : null}
          </label>
          <details className="text-base">
            <summary className="flex min-h-11 cursor-pointer items-center text-muted-foreground underline-offset-4 hover:underline">
              Or paste the rows instead
            </summary>
            <Textarea
              aria-label="Rows copied from a spreadsheet"
              className="mt-2 min-h-40 font-mono text-sm"
              disabled={!availability.isAvailable}
              onChange={(event) => {
                setCsvText(event.target.value)
                setFileName(event.target.value ? "Pasted rows" : null)
                setConfirmUpdates(false)
              }}
              placeholder={dashboardImportConfigs[importKind].sampleCsv}
              value={fileName === "Pasted rows" || !fileName ? csvText : ""}
            />
          </details>
        </Step>

        {csvText.trim() ? (
          <Step number={3} title="Check before adding">
            {referenceData.isPending ? (
              <p className="flex items-center gap-2 text-base text-muted-foreground">
                <Spinner className="size-4" /> Checking your file…
              </p>
            ) : referenceData.isError ? (
              <p className="text-base text-destructive">
                Your file could not be checked against your records. Close and
                try again.
              </p>
            ) : (
              <ImportCheck
                confirmUpdates={confirmUpdates}
                importKind={importKind}
                needsUpdateConfirm={needsUpdateConfirm}
                onConfirmUpdatesChange={setConfirmUpdates}
                review={review}
                total={total}
              />
            )}
          </Step>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border/70 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:justify-end sm:px-6">
        <Button
          size="touch"
          className="text-base"
          onClick={onClose}
          type="button"
          variant="ghost"
        >
          Cancel
        </Button>
        <Button
          size="touch"
          className="text-base"
          disabled={!ready || isAdding}
          onClick={() => (words.postsMoney ? setConfirmOpen(true) : add())}
          type="button"
        >
          {isAdding ? "Adding…" : ready ? addLabel : `Add ${words.many}`}
        </Button>
      </div>

      {words.postsMoney ? (
        <ConfirmActionDialog
          actionLabel={addLabel}
          description={`${words.moneyEffect?.(total ?? "") ?? ""} Check the numbers: a file can only be added once.`}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={add}
          open={confirmOpen}
          pending={isAdding}
          title={`Add ${importCount(importKind, review.readyCount)}?`}
        >
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-base">
            <dt className="text-muted-foreground">{words.title}</dt>
            <dd className="text-right font-medium">
              {review.readyCount.toLocaleString("en-NG")}
            </dd>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="text-right font-medium">{total}</dd>
            <dt className="text-muted-foreground">File</dt>
            <dd className="truncate text-right">{fileName}</dd>
          </dl>
        </ConfirmActionDialog>
      ) : null}
    </div>
  )
}

function ImportCheck({
  confirmUpdates,
  importKind,
  needsUpdateConfirm,
  onConfirmUpdatesChange,
  review,
  total,
}: {
  confirmUpdates: boolean
  importKind: DashboardImportKind
  needsUpdateConfirm: boolean
  onConfirmUpdatesChange: (value: boolean) => void
  review: ReturnType<typeof reviewImportFile>
  total: string | null
}) {
  const words = importKindWords[importKind]

  if (review.fileProblem) {
    return (
      <p
        className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-base text-destructive"
        role="alert"
      >
        <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0" />
        {review.fileProblem}
      </p>
    )
  }

  const problemRows = review.problems.length
  const newCount = review.readyCount - review.updateCount

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border/70 border-y border-border/70 text-base">
        {review.totalRows > problemRows ? (
          <li className="flex items-center gap-3 py-3">
            <CheckCircle2
              aria-hidden
              className="size-5 shrink-0 text-emerald-700"
            />
            <span>
              {problemRows
                ? `${importCount(importKind, Math.max(0, review.totalRows - problemRows))} look right`
                : `${importCount(importKind, review.readyCount)} ready`}
            </span>
          </li>
        ) : null}
        {review.updateCount > 0 ? (
          <li className="py-3 pl-8">
            {newCount > 0 ? `${newCount.toLocaleString("en-NG")} new, ` : ""}
            {review.updateCount.toLocaleString("en-NG")} already in Halaalvest
            will be updated
          </li>
        ) : null}
        {total && !problemRows ? (
          <li className="flex justify-between py-3 pl-8">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">{total}</span>
          </li>
        ) : null}
        {problemRows ? (
          <li className="flex items-center gap-3 py-3 font-medium text-destructive">
            <AlertCircle aria-hidden className="size-5 shrink-0" />
            {problemRows === 1
              ? "1 row needs fixing"
              : `${problemRows} rows need fixing`}
          </li>
        ) : null}
      </ul>

      {problemRows ? (
        <div className="space-y-3" role="alert">
          <ul className="space-y-2 text-base">
            {review.problems.slice(0, SHOWN_PROBLEM_ROWS).map((problem) => (
              <li
                className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
                key={problem.row}
              >
                <span className="font-semibold">Row {problem.row}:</span>{" "}
                {problem.messages.join(". ")}.
              </li>
            ))}
          </ul>
          {problemRows > SHOWN_PROBLEM_ROWS ? (
            <p className="text-base text-muted-foreground">
              And {problemRows - SHOWN_PROBLEM_ROWS} more rows.
            </p>
          ) : null}
          <p className="text-base text-foreground">
            Fix these rows in your file, save it, then choose it again. Nothing
            is added until every row is right.
          </p>
        </div>
      ) : null}

      {needsUpdateConfirm && !problemRows ? (
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-base">
          <Checkbox
            checked={confirmUpdates}
            className="mt-1 size-5"
            onCheckedChange={(checked) =>
              onConfirmUpdatesChange(checked === true)
            }
          />
          <span>
            I checked the {review.updateCount} {words.many} that will be
            changed.
          </span>
        </label>
      ) : null}
    </div>
  )
}
