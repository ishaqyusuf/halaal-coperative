import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { WorkspaceEmptyState } from "@/components/dashboard"
import { FinanceSettingsFrame } from "@/components/finance-settings/finance-settings-frame"

export function FinanceSettingsUnavailableView({
  body = "Finance setup shows here once your cooperative's records are connected.",
  title = "Finance setup isn't available yet.",
}: {
  body?: string
  title?: string
}) {
  return (
    <FinanceSettingsFrame>
      <WorkspaceEmptyState body={body} title={title} />
    </FinanceSettingsFrame>
  )
}

export function FinanceSettingsSkeleton() {
  return (
    <FinanceSettingsFrame>
      <div aria-label="Loading finance setup" className="grid gap-6">
        <Skeleton className="h-6 w-full max-w-md" />
        <div className="divide-y divide-border border-y border-border">
          {Array.from({ length: 5 }, (_, index) => (
            <div className="grid gap-2 py-4" key={index}>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-5 w-full max-w-sm" />
            </div>
          ))}
        </div>
      </div>
    </FinanceSettingsFrame>
  )
}
