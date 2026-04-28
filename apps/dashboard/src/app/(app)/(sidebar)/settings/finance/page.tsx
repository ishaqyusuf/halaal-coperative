import { createDbRuntime, getTenantFinanceSetup } from "@halaal-vest/db"
import { TenantFinancePageView } from "@/components/tenant-finance-page-view"
import { getDashboardServerContext } from "@/lib/server-context"

const demoShareVersions = [
  {
    id: "share-1",
    effectiveFrom: "2024-01-01",
    amount: 10000,
    notes: "Initial cooperative default share",
  },
  {
    id: "share-2",
    effectiveFrom: "2025-01-01",
    amount: 15000,
    notes: "Raised after annual review",
  },
]

const demoChargeDefinitions = [
  {
    id: "charge-1",
    code: "ADM",
    name: "Administrative fee",
    kind: "fixed",
    isActive: true,
    versions: [
      { id: "charge-1-v1", effectiveFrom: "2024-01-01", amount: 1500, notes: "Initial amount" },
      { id: "charge-1-v2", effectiveFrom: "2025-02-01", amount: 2000, notes: "Updated amount" },
    ],
  },
  {
    id: "charge-2",
    code: "LEVY",
    name: "Monthly levy",
    kind: "fixed",
    isActive: true,
    versions: [
      { id: "charge-2-v1", effectiveFrom: "2024-01-01", amount: 1000, notes: "Default levy" },
    ],
  },
]

export default async function FinanceSetupPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (context.tenant && runtime.status === "database-configured") {
    const data = await getTenantFinanceSetup(context.tenant.id)

    return (
        <TenantFinancePageView
        chargeDefinitions={data.chargeDefinitions.map((charge: any) => ({
          id: charge.id,
          code: charge.code,
          name: charge.name,
          kind: charge.kind,
          isActive: charge.isActive,
          versions: charge.versions.map((version: any) => ({
            id: version.id,
            effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
            amount: Number(version.amount),
            notes: version.notes,
          })),
        }))}
        shareStructureVersions={data.shareStructureVersions.map((version: any) => ({
          id: version.id,
          effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
          amount: Number(version.amount),
          notes: version.notes,
        }))}
        tenantName={data.tenant?.name ?? context.tenant.name}
        tenantStartDate={data.tenant?.startDate?.toISOString().slice(0, 10) ?? null}
      />
    )
  }

  return (
    <TenantFinancePageView
      chargeDefinitions={demoChargeDefinitions}
      shareStructureVersions={demoShareVersions}
      tenantName={context.tenant?.name ?? "Demo cooperative"}
      tenantStartDate={context.tenant?.startDate ?? "2024-01-01"}
    />
  )
}
