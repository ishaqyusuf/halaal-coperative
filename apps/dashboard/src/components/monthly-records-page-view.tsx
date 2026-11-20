import type {
  MonthlyRecordSettingView,
  MonthlyRecordSummary,
  MonthlyRecordWorkspaceSummary,
} from "@halaalvest/db"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { MonthlyRecordsWorkspace } from "@/components/monthly-records/monthly-records-workspace"
import type { TableSettings } from "@/utils/table-settings"

const description = "Mark each member's monthly payment as paid."

export function MonthlyRecordsRuntimeUnavailableView() {
  return (
    <WorkspacePageShell
      description={description}
      eyebrow="Monthly records"
      title="Monthly records"
    >
      <WorkspaceEmptyState
        body="Monthly records are not available right now. Try again later."
        title="Not available"
      />
    </WorkspacePageShell>
  )
}

export function MonthlyRecordsAccessUnavailableView() {
  return (
    <WorkspacePageShell
      description={description}
      eyebrow="Monthly records"
      title="Monthly records"
    >
      <WorkspaceEmptyState
        body="Ask a cooperative admin or finance officer for access."
        title="You don't have access to monthly records"
      />
    </WorkspacePageShell>
  )
}

export function MonthlyRecordsPageView(props: {
  canManageWorkplaces: boolean
  monthlyRecordTableSettings?: Partial<TableSettings>
  records: MonthlyRecordSummary[]
  selectedRecord: MonthlyRecordWorkspaceSummary | null
  selectedYear: number
  settings: MonthlyRecordSettingView
}) {
  return <MonthlyRecordsWorkspace {...props} />
}
