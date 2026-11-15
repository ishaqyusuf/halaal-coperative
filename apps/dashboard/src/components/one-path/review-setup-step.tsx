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
    <div className="grid gap-1 border-b border-border/70 py-3 last:border-b-0 @lg:grid-cols-[10rem_minmax(0,1fr)_auto] @lg:items-center @lg:gap-4">
      <dt className="text-base font-medium">{label}</dt>
      <dd className="min-w-0 text-base text-muted-foreground">
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
        "min-h-11"
      )}
      href={href}
    >
      Edit
    </Link>
  )
}

// Step 9, Review setup. Read-only summary of steps 5–8 with Edit links and the
// start date's inline Change action. "Next: add members" opens step 10 (or
// "Finish …" opens the first unsaved step); the existing
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
  // Instead of a disabled button, the footer opens the first unsaved step.
  const firstUnsavedStep = (
    [
      ["setupMode", "setup-mode", "Where records start"],
      ["operationProfile", "operation-profile", "Services"],
      ["sharesCharges", "shares-charges", "Shares and charges"],
      ["profit", "profit", "Profit sharing"],
    ] as const
  ).find(([key]) => !completion[key])
  const activeCharges = chargeDefinitions.filter((charge) => charge.isActive)

  return (
    <OnePathStep
      aside={
        <p>
          After you add the first member, where records start can no longer
          change.
        </p>
      }
      backHref={backHref}
      lede={
        allDone
          ? "Check your answers, then add your members."
          : "Some steps are not saved yet."
      }
      primary={
        allDone || !firstUnsavedStep ? (
          <Link
            className={cn(buttonVariants({}), "h-11")}
            href={getGettingStartedStepHref("admin-member")}
          >
            Next: add members
          </Link>
        ) : (
          <Link
            className={cn(buttonVariants({}), "h-11")}
            href={getGettingStartedStepHref(firstUnsavedStep[1])}
          >
            Finish {firstUnsavedStep[2].toLowerCase()}
          </Link>
        )
      }
      stepKey="review-setup"
      title="Review your setup"
    >
      <dl className="@container">
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
        <div className="grid gap-1 py-3 @lg:grid-cols-[10rem_minmax(0,1fr)_auto] @lg:items-center @lg:gap-4">
          <dt className="text-base font-medium">Start date</dt>
          <dd className="text-base text-muted-foreground">
            {formatGettingStartedDate(tenantStartDate)}
          </dd>
          <dd>
            <Button
              className="min-h-11"
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
