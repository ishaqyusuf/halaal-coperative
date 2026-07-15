import type { ComponentProps } from "react"
import type { TenantServiceKey } from "@halaalvest/db"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import { OpenOperationProfileSettingsSheet } from "@/components/open-operation-profile-settings-sheet"
import { OperationProfileSettingsSheet } from "@/components/sheets/operation-profile-settings-sheet"

const serviceRows = [
  {
    body: "Manual commitment proof, transfer receipts, cash office payments, and other payment evidence.",
    key: "payment_receipts",
    label: "Payment receipts",
  },
  {
    body: "Member procurement requests and staff-recorded procurement workflows.",
    key: "procurement",
    label: "Procurement",
  },
  {
    body: "Foodstuff Purchase applications and cycle participation.",
    key: "food_purchase",
    label: "Foodstuff Purchase",
  },
  {
    body: "Member support cases and official responses.",
    key: "support_cases",
    label: "Member support",
  },
  {
    body: "Ministry, employer, payroll, or other deduction-source records.",
    key: "collection_sources",
    label: "Collection sources",
  },
  {
    body: "Monthly batch posting when a collection source has released deductions.",
    key: "collection_source_batch_posting",
    label: "Source batch posting",
  },
] satisfies Array<{ body: string; key: TenantServiceKey; label: string }>

const accessModeOptions = [
  ["disabled", "Not offered"],
  ["office_only", "Office only"],
  ["member_self_service", "Member self-service"],
  ["read_only", "View only"],
] as const

type OperationProfileSettingsSheetProps = ComponentProps<
  typeof OperationProfileSettingsSheet
>

function accessModeLabel(value: string) {
  return (
    accessModeOptions.find(([optionValue]) => optionValue === value)?.[1] ??
    value.replaceAll("_", " ")
  )
}

export function OperationProfileSettingsUnavailableView({
  body,
  description,
  title,
}: {
  body: string
  description: string
  title: string
}) {
  return (
    <WorkspacePageShell
      description={description}
      eyebrow="Settings"
      title="Operation profile"
    >
      <WorkspaceEmptyState body={body} title={title} />
    </WorkspacePageShell>
  )
}

export function OperationProfileSettingsView({
  policy,
  reviewedAt,
  services,
}: OperationProfileSettingsSheetProps & {
  reviewedAt: Date | null
}) {
  const enabledServices = serviceRows.filter(
    (service) => services[service.key].accessMode !== "disabled"
  )
  const memberSelfServiceCount = serviceRows.filter(
    (service) =>
      services[service.key].accessMode === "member_self_service"
  ).length

  return (
    <WorkspacePageShell
      description="Choose which cooperative services are offered, whether members can start requests online, and when a service is office-only or view-only."
      eyebrow="Settings"
      title="Operation profile"
    >
      <section className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard
          detail="Services not disabled."
          label="Enabled services"
          value={`${enabledServices.length}/${serviceRows.length}`}
        />
        <DashboardStatCard
          detail="Services where members can submit requests themselves."
          label="Member self-service"
          value={memberSelfServiceCount.toString()}
        />
        <DashboardStatCard
          detail={
            reviewedAt
              ? new Date(reviewedAt).toLocaleDateString()
              : "Not reviewed yet."
          }
          label="Last reviewed"
          tone={reviewedAt ? "positive" : "warning"}
          value={reviewedAt ? "Reviewed" : "Draft"}
        />
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={<OpenOperationProfileSettingsSheet />}
          description="Use a focused sheet to change service access and capture the reason for audit history."
          eyebrow="Service access"
          title="Update operation profile"
        />
        <div className="mt-5 grid gap-3">
          {serviceRows.map((service) => (
            <div
              className="border border-border/70 bg-background p-4"
              key={service.key}
            >
              <p className="font-medium text-foreground">{service.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {service.body}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Current: {accessModeLabel(services[service.key].accessMode)}
              </p>
            </div>
          ))}
        </div>
      </DashboardSectionCard>

      <OperationProfileSettingsSheet policy={policy} services={services} />
    </WorkspacePageShell>
  )
}
