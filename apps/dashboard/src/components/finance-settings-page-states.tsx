import { Skeleton } from "@halaalvest/ui/components/skeleton"
import {
  DashboardPageShell,
  DashboardSectionCard,
  WorkspaceEmptyState,
} from "@/components/dashboard"
import { financeMenuItems } from "@/components/finance-menu"
import { SecondaryMenu } from "@/components/secondary-menu"

function FinanceSettingsFrame({ children }: { children: React.ReactNode }) {
  return (
    <DashboardPageShell>
      <div className="w-full max-w-[800px]">
        <SecondaryMenu items={financeMenuItems} />
        <main className="mt-4 min-w-0">{children}</main>
      </div>
    </DashboardPageShell>
  )
}

export function FinanceSettingsUnavailableView({
  body,
  title,
}: {
  body: string
  title: string
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
      <div aria-label="Loading finance settings" className="space-y-6">
        <section className="space-y-3 border-b border-border pb-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-56 max-w-full" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <DashboardSectionCard key={index}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-4 h-7 w-28" />
              <Skeleton className="mt-3 h-3 w-full" />
            </DashboardSectionCard>
          ))}
        </section>

        <DashboardSectionCard>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-3 h-3 w-full max-w-xl" />
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </DashboardSectionCard>
      </div>
    </FinanceSettingsFrame>
  )
}
