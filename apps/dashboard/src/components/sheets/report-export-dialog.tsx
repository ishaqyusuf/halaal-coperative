"use client"

import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import { Download } from "lucide-react"
import { useState } from "react"
import { RequestChoice } from "@/components/requests/request-choice"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useReportExportParams } from "@/hooks/use-report-export-params"
import {
  getPeriodChoiceForRange,
  getReportDownloadHref,
  getReportExport,
  type ReportExport,
  reportPeriodChoices,
  type ReportPeriodChoice,
} from "@/lib/reports/report-catalog"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

/**
 * The /reports download dialog (export = modal). `reportExport` in the URL
 * names the report; staff pick a period and download the CSV.
 */
export function ReportExportDialog({
  pageDateRange,
  pagePeriodLabel,
}: {
  /** The date range chosen on the reports page, if any. */
  pageDateRange: string[] | null
  /** Plain words for that range, e.g. "1 Nov 2026 to 30 Nov 2026". */
  pagePeriodLabel: string
}) {
  const { reportExport, setParams } = useReportExportParams()
  const report = getReportExport(reportExport)
  const close = () => void setParams({ reportExport: null })

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation(
        "reportExport",
        report ? "download" : null
      )}
      onOpenChange={(open) => {
        if (!open) close()
      }}
      open={Boolean(report)}
    >
      {report ? (
        // Keyed, so each report starts from the page's own period.
        <ReportExportForm
          key={report.key}
          onClose={close}
          pageDateRange={pageDateRange}
          pagePeriodLabel={pagePeriodLabel}
          report={report}
        />
      ) : null}
    </WorkflowPresentation>
  )
}

function ReportExportForm({
  onClose,
  pageDateRange,
  pagePeriodLabel,
  report,
}: {
  onClose: () => void
  pageDateRange: string[] | null
  pagePeriodLabel: string
  report: ReportExport
}) {
  const pageChoice = getPeriodChoiceForRange(pageDateRange)
  const [choice, setChoice] = useState<ReportPeriodChoice>(pageChoice)
  const options =
    pageChoice === "page"
      ? [
          { label: pagePeriodLabel, value: "page" as const },
          ...reportPeriodChoices,
        ]
      : reportPeriodChoices

  return (
    <div className="grid gap-6">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold">
          {report.title}
        </DialogTitle>
        <DialogDescription className="text-base text-muted-foreground">
          {report.line}
        </DialogDescription>
      </DialogHeader>

      <RequestChoice<ReportPeriodChoice>
        label="Which dates?"
        onChange={setChoice}
        options={options}
        value={choice}
      />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          className="h-12 text-base"
          onClick={onClose}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <a
          className={buttonVariants({
            className: "h-12 gap-2 text-base",
          })}
          download
          href={getReportDownloadHref(report, choice, pageDateRange)}
          onClick={() => {
            // Let the download start, then close.
            window.setTimeout(onClose, 300)
          }}
        >
          <Download aria-hidden="true" className="size-5" />
          Download file
        </a>
      </div>
      <p className="text-base text-muted-foreground">
        The file opens in Excel or Google Sheets.
      </p>
    </div>
  )
}
