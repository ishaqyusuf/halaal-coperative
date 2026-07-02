import type { Metadata } from "next"
import {
  createDbRuntime,
  defaultTenantBusinessProfitPolicy,
  getTenantFinanceSetup,
} from "@halaalvest/db"
import { ScrollableContent } from "@/components/dashboard"
import { BusinessProfitPolicyForm } from "@/components/forms/tenant-finance-forms"
import { SecondaryMenu } from "@/components/secondary-menu"
import { getDashboardServerContext } from "@/lib/server-context"

export const metadata: Metadata = {
  title: "Business | Finance Settings",
}

const financeMenuItems = [
  { path: "/settings/finance", label: "Overview" },
  { path: "/settings/finance/shares", label: "Shares" },
  { path: "/settings/finance/charges", label: "Charges" },
  { path: "/settings/finance/business", label: "Business" },
  { path: "/settings/finance/loan", label: "Loan" },
  { path: "/settings/finance/migration", label: "Migration" },
]

export default async function FinanceBusinessPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  let businessPolicy = defaultTenantBusinessProfitPolicy
  let tenantName = context.tenant?.name ?? "Demo cooperative"

  if (context.tenant && runtime.status === "database-configured") {
    const data = await getTenantFinanceSetup(context.tenant.id)
    tenantName = data.tenant?.name ?? context.tenant.name
    businessPolicy = data.businessPolicy
  }

  return (
    <ScrollableContent>
      <div className="flex max-w-[980px] flex-col gap-6">
        <SecondaryMenu items={financeMenuItems} />

        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Finance settings
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Business
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Manage profit distribution policy for {tenantName}.
          </p>
        </div>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Profit policy
            </h2>
          </div>
          <BusinessProfitPolicyForm defaultPolicy={businessPolicy} />
        </section>
      </div>
    </ScrollableContent>
  )
}
