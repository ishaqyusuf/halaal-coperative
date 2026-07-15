import type { TenantBusinessProfitPolicySettings } from "@halaalvest/db"
import { Badge } from "@halaalvest/ui/components/badge"
import { ScrollableContent } from "@/components/dashboard"
import { financeMenuItems } from "@/components/finance-menu"
import { OpenTenantFinanceSettingsSheet } from "@/components/open-tenant-finance-settings-sheet"
import { SecondaryMenu } from "@/components/secondary-menu"
import { TenantFinanceSettingsSheet } from "@/components/sheets/tenant-finance-settings-sheet"

const frequencyLabels = {
  ad_hoc: "Ad hoc",
  annual: "Annual",
  quarterly: "Quarterly",
  semi_annual: "Semi-annual",
} as const

const migrationModeLabels = {
  import_historical_profit_pools: "Import historical profit pools",
  manual_review_required: "Manual review required",
  no_historical_business_profit: "No historical business profit",
} as const

const monthFormatter = new Intl.DateTimeFormat("en", { month: "long" })

function monthName(month: number) {
  return monthFormatter.format(new Date(Date.UTC(2026, month - 1, 1)))
}

export function FinanceBusinessSettingsView({
  businessPolicy,
  quickFillEnabled,
  tenantName,
}: {
  businessPolicy: TenantBusinessProfitPolicySettings
  quickFillEnabled: boolean
  tenantName: string
}) {
  return (
    <ScrollableContent>
      <div className="flex max-w-[980px] flex-col gap-6">
        <SecondaryMenu items={financeMenuItems} />

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Finance settings
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">
            Business
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Manage profit distribution policy for {tenantName}.
          </p>
        </div>

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Profit policy
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Review the active distribution rules. Open the sheet when the
                policy needs to change.
              </p>
            </div>
            <OpenTenantFinanceSettingsSheet
              type="businessProfitPolicy"
              variant="default"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border border-border/70 bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Distribution frequency
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {frequencyLabels[businessPolicy.profitDistributionFrequency]}
              </p>
            </div>
            <div className="border border-border/70 bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Financial year starts
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {monthName(businessPolicy.financialYearStartMonth)}
              </p>
            </div>
            <div className="border border-border/70 bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Distribution percentage
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {businessPolicy.defaultDistributablePercentage}%
              </p>
            </div>
            <div className="border border-border/70 bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">
                Reserve retention
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {businessPolicy.reserveRetentionPercentage}%
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {migrationModeLabels[businessPolicy.historicalProfitMigrationMode]}
            </Badge>
            <Badge variant="outline">
              {businessPolicy.requiresProfitDistributionApproval
                ? "Approval required"
                : "Approval not required"}
            </Badge>
          </div>
        </section>
      </div>
      <TenantFinanceSettingsSheet
        businessPolicy={businessPolicy}
        devMode={quickFillEnabled}
        tenantStartDate={null}
      />
    </ScrollableContent>
  )
}
