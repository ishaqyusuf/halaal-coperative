"use client"

import { useState } from "react"
import type {
  TenantBusinessProfitPolicySettings,
  TenantMigrationSetupMode,
  TenantOperationProfileReadModel,
  TenantSharePolicySettings,
} from "@halaalvest/db"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { formatCurrency } from "@halaalvest/utils"
import { FinanceStartDateForm } from "@/components/forms/tenant-finance-forms"
import { OnePathStep } from "@/components/one-path/one-path-step"
import type {
  GettingStartedChargeDefinitionRow,
  GettingStartedShareBusinessRow,
} from "@/lib/getting-started/getting-started-page-types"
import {
  formatGettingStartedDate,
  getGettingStartedStepHref,
} from "@/lib/getting-started/getting-started-step-model"

const frequencyLabels = {
  ad_hoc: "whenever we decide",
  annual: "once a year",
  quarterly: "every quarter",
  semi_annual: "twice a year",
} as Record<string, string>

export function summarizeServices(profile: TenantOperationProfileReadModel) {
  const offered = (key: keyof TenantOperationProfileReadModel["services"]) =>
    profile.services[key]?.accessMode !== "disabled"
  const parts = [
    profile.services.collection_sources?.accessMode &&
    profile.services.collection_sources.accessMode !== "disabled"
      ? "Bulk payments from employers or payroll"
      : profile.services.payment_receipts?.accessMode === "member_self_service"
        ? "Members upload payment receipts"
        : "Staff record each payment",
    offered("procurement") ? "Buys items for members" : null,
    offered("food_purchase") ? "Foodstuff Purchase" : null,
    profile.services.support_cases?.accessMode === "member_self_service"
      ? "Members message you in the app"
      : "Members contact the office",
  ]

  return parts.filter(Boolean).join(" · ")
}

function ReviewRow({
  action,
  children,
  done,
  label,
}: {
  action: React.ReactNode
  children: React.ReactNode
  done: boolean
  label: string
}) {
  return (
    <div className="grid gap-1 border-b border-border/70 py-3 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
      <dt className="text-sm font-medium">{label}</dt>
      <dd className="min-w-0 text-sm text-muted-foreground">
        {done ? children : <Badge variant="secondary">Not saved yet</Badge>}
      </dd>
      <dd>{action}</dd>
    </div>
  )
}

function EditLink({ href }: { href: string }) {
  return (
    <Link
      className={cn(
        buttonVariants({ size: "sm", variant: "ghost" }),
        "min-h-11 sm:min-h-8"
      )}
      href={href}
    >
      Edit
    </Link>
  )
}

// Step 9, Review setup. Read-only summary of steps 5–8 with Edit links and the
// start date's inline Change action. "Save setup" opens step 10; the existing
// migration status already moves to member migration once steps 5–8 are saved.
export function ReviewSetupStep({
  backHref,
  businessPolicy,
  chargeDefinitions,
  completion,
  migrationSetupMode,
  operationProfile,
  shareBusinesses,
  sharePolicy,
  tenantStartDate,
}: {
  backHref: string | null
  businessPolicy: TenantBusinessProfitPolicySettings
  chargeDefinitions: GettingStartedChargeDefinitionRow[]
  completion: {
    operationProfile: boolean
    profit: boolean
    setupMode: boolean
    sharesCharges: boolean
  }
  migrationSetupMode: TenantMigrationSetupMode
  operationProfile: TenantOperationProfileReadModel
  shareBusinesses: GettingStartedShareBusinessRow[]
  sharePolicy: TenantSharePolicySettings
  tenantStartDate: string | null
}) {
  const [changingStartDate, setChangingStartDate] = useState(false)
  const allDone = Object.values(completion).every(Boolean)
  const activeCharges = chargeDefinitions.filter((charge) => charge.isActive)

  return (
    <OnePathStep
      aside={
        <p>
          Check everything once before you add members. After the first member
          is added, where records start stays fixed.
        </p>
      }
      backHref={backHref}
      lede="Check your answers. You can still change any of them before you add members."
      primary={
        allDone ? (
          <Link
            className={cn(buttonVariants({}), "h-11 sm:h-10")}
            href={getGettingStartedStepHref("admin-member")}
          >
            Save setup
          </Link>
        ) : (
          <Button className="h-11 sm:h-10" disabled>
            Save setup
          </Button>
        )
      }
      stepKey="review-setup"
      title="Review your setup"
    >
      <dl>
        <ReviewRow
          action={<EditLink href={getGettingStartedStepHref("setup-mode")} />}
          done={completion.setupMode}
          label="Records start"
        >
          {migrationSetupMode === "brought_forward"
            ? "From today's balances"
            : "Full history since you started"}
        </ReviewRow>
        <ReviewRow
          action={
            <EditLink href={getGettingStartedStepHref("operation-profile")} />
          }
          done={completion.operationProfile}
          label="Services"
        >
          {summarizeServices(operationProfile)}
        </ReviewRow>
        <ReviewRow
          action={
            <EditLink href={getGettingStartedStepHref("shares-charges")} />
          }
          done={completion.sharesCharges}
          label="Shares"
        >
          {sharePolicy.configurationMode === "unit_based"
            ? `Share units at ${formatCurrency(sharePolicy.unitAmount)} each, ${sharePolicy.compulsoryShareUnits} to ${sharePolicy.maximumShareUnits} per member`
            : "A share amount every month"}
        </ReviewRow>
        <ReviewRow
          action={
            <EditLink href={getGettingStartedStepHref("shares-charges")} />
          }
          done={completion.sharesCharges}
          label="Charges"
        >
          {activeCharges.length
            ? activeCharges.map((charge) => charge.name).join(", ")
            : "No charges"}
        </ReviewRow>
        <ReviewRow
          action={<EditLink href={getGettingStartedStepHref("profit")} />}
          done={completion.profit}
          label="Profit"
        >
          {`${businessPolicy.defaultDistributablePercentage}% shared with members, ${businessPolicy.reserveRetentionPercentage}% kept in reserve, ${frequencyLabels[businessPolicy.profitDistributionFrequency] ?? "on a schedule"}`}
        </ReviewRow>
        <ReviewRow
          action={<EditLink href={getGettingStartedStepHref("profit")} />}
          done={completion.profit}
          label="Businesses"
        >
          {shareBusinesses.length
            ? shareBusinesses.map((business) => business.name).join(", ")
            : "No businesses"}
        </ReviewRow>
        <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
          <dt className="text-sm font-medium">Start date</dt>
          <dd className="text-sm text-muted-foreground">
            {formatGettingStartedDate(tenantStartDate)}
          </dd>
          <dd>
            <Button
              className="min-h-11 sm:min-h-8"
              onClick={() => setChangingStartDate((value) => !value)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {changingStartDate ? "Cancel" : "Change"}
            </Button>
          </dd>
        </div>
      </dl>
      {changingStartDate ? (
        <div className="mt-2 border border-border/70 bg-muted/20 p-4">
          <FinanceStartDateForm
            defaultStartDate={tenantStartDate}
            onSuccess={() => setChangingStartDate(false)}
          />
        </div>
      ) : null}
    </OnePathStep>
  )
}
