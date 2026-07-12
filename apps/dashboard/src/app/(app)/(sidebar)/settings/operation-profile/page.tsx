import {
  getTenantOperationProfile,
  type TenantServiceKey,
} from "@halaalvest/db"
import { Button } from "@halaalvest/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@halaalvest/ui/components/field"
import { Textarea } from "@halaalvest/ui/components/textarea"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import { updateTenantOperationProfileAction } from "@/lib/dashboard-actions"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

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

function serviceAccessInputName(serviceKey: TenantServiceKey) {
  return `${serviceKey}AccessMode`
}

function accessModeLabel(value: string) {
  return (
    accessModeOptions.find(([optionValue]) => optionValue === value)?.[1] ??
    value.replaceAll("_", " ")
  )
}

export default async function OperationProfileSettingsPage() {
  const context = await getDashboardServerContext()

  if (!context.tenant) {
    return (
      <WorkspacePageShell
        description="Service activation and member access settings are available from a cooperative workspace."
        eyebrow="Settings"
        title="Operation profile"
      >
        <WorkspaceEmptyState
          body="Open a cooperative workspace before editing service access."
          title="Choose a cooperative workspace first."
        />
      </WorkspacePageShell>
    )
  }

  const canManageOperationProfile = hasAnyRole(
    context.auth.membership?.role,
    workspaceAdminRoles
  )
  const operationProfile = await getTenantOperationProfile(context.tenant.id)
  const enabledServices = serviceRows.filter(
    (service) =>
      operationProfile.services[service.key].accessMode !== "disabled"
  )

  if (!canManageOperationProfile) {
    return (
      <WorkspacePageShell
        description="Only cooperative admins and super admins can change service activation."
        eyebrow="Settings"
        title="Operation profile"
      >
        <WorkspaceEmptyState
          body="Ask a cooperative admin to review service access settings."
          title="Operation profile access is limited."
        />
      </WorkspacePageShell>
    )
  }

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
          value={serviceRows
            .filter(
              (service) =>
                operationProfile.services[service.key].accessMode ===
                "member_self_service"
            )
            .length.toString()}
        />
        <DashboardStatCard
          detail={
            operationProfile.reviewedAt
              ? new Date(operationProfile.reviewedAt).toLocaleDateString()
              : "Not reviewed yet."
          }
          label="Last reviewed"
          tone={operationProfile.reviewedAt ? "positive" : "warning"}
          value={operationProfile.reviewedAt ? "Reviewed" : "Draft"}
        />
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          eyebrow="Service access"
          title="Update operation profile"
          description="Use a reason when disabling a service, making it view-only, or removing member self-service access."
        />
        <form
          action={updateTenantOperationProfileAction}
          className="mt-5 grid gap-5"
        >
          <FieldSet>
            <FieldGroup>
              {serviceRows.map((service) => {
                const currentAccessMode =
                  operationProfile.services[service.key].accessMode

                return (
                  <Field
                    className="border border-border/70 bg-background p-4"
                    key={service.key}
                  >
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
                      <div>
                        <FieldLabel
                          htmlFor={serviceAccessInputName(service.key)}
                        >
                          {service.label}
                        </FieldLabel>
                        <FieldDescription>{service.body}</FieldDescription>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Current: {accessModeLabel(currentAccessMode)}
                        </p>
                      </div>
                      <select
                        className="h-10 w-full border border-input bg-background px-3 text-sm text-foreground"
                        defaultValue={currentAccessMode}
                        id={serviceAccessInputName(service.key)}
                        name={serviceAccessInputName(service.key)}
                      >
                        {accessModeOptions.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </Field>
                )
              })}
            </FieldGroup>
          </FieldSet>

          <Field>
            <FieldLabel htmlFor="changeReason">Change reason</FieldLabel>
            <Textarea
              id="changeReason"
              name="changeReason"
              placeholder="Required when reducing access. Example: Procurement is paused while the new cycle policy is approved."
            />
            <FieldDescription>
              Reasons are saved to the audit log with the before and after
              operation profile.
            </FieldDescription>
          </Field>

          <input
            name="procurementMaximumActiveObligationsPerMember"
            type="hidden"
            value={
              operationProfile.policy
                .procurementMaximumActiveObligationsPerMember
            }
          />
          <input
            name="foodPurchaseMaximumActiveObligationsPerMember"
            type="hidden"
            value={
              operationProfile.policy
                .foodPurchaseMaximumActiveObligationsPerMember
            }
          />
          <input
            name="foodPurchaseRequiresOpenCycle"
            type="hidden"
            value={
              operationProfile.policy.foodPurchaseRequiresOpenCycle
                ? "true"
                : "false"
            }
          />

          <Button className="w-fit" type="submit">
            Save operation profile
          </Button>
        </form>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
