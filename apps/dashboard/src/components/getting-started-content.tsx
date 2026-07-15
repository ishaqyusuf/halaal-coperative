import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import type { ComponentProps } from "react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@halaalvest/ui/components/alert"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@halaalvest/ui/components/field"
import { Input } from "@halaalvest/ui/components/input"
import { Separator } from "@halaalvest/ui/components/separator"
import { Textarea } from "@halaalvest/ui/components/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@halaalvest/ui/components/tooltip"
import { cn } from "@halaalvest/ui/lib/utils"
import { formatCurrency } from "@halaalvest/utils"
import type {
  TenantBusinessProfitPolicySettings,
  TenantOperationProfileReadModel,
  TenantMigrationSetupMode,
  TenantMigrationSetupSettings,
  TenantServiceAccessMode,
} from "@halaalvest/db"
import { BusinessProfitSeasonDeductionFields } from "@/components/business-profit-season-deduction-popover"
import {
  BusinessProfitPolicyForm,
  ChargeDefinitionForm,
  FinanceStartDateForm,
  ShareBusinessForm,
} from "@/components/forms/tenant-finance-forms"
import { GettingStartedFooterPortal } from "@/components/getting-started-footer-slot"
import {
  OperationProfileButtonGroup,
  OperationProfileCheckboxField,
  OperationProfileRadioCards,
  OperationProfileWizardForm,
} from "@/components/operation-profile-wizard-controls"
import {
  finalizeInitialMigrationAction,
  saveBusinessProfitSeasonReviewAction,
  updateTenantMigrationSetupAction,
} from "@/lib/dashboard-actions"
import {
  accessModesFromCommitmentCollectionChoice,
  getOperationProfileStepIndex,
  getOperationProfileStepMeta,
  getOperationProfileStepNavigation,
  operationProfileStepKeys,
  type CommitmentCollectionChoice,
  type OperationProfileStepKey,
} from "@/lib/getting-started/operation-profile-flow"
import { CheckCircle2Icon } from "lucide-react"

type BusinessProfitSeasonRow = {
  businessNames: string[]
  deductionAmount: number
  deductionReason?: string | null
  entryDeductionAmount: number
  grossProfitAmount: number
  key: string
  label: string
  periodEnd: string
  periodStart: string
  profitEntries: Array<{
    businessName: string
    deductionAmount: number
    profitAmount: number
    profitDate: string
    reason?: string | null
    status: string
  }>
  status: "pending" | "draft" | "approved" | "published" | "closed"
}

const migrationSetupModeOptions = [
  {
    description:
      "Enter the cooperative's past records so member savings, shares, business profit seasons, and dividends can be reconstructed.",
    label: "Historical backfill",
    mode: "historical_backfill",
  },
  {
    description:
      "Enter the current cooperative and member positions, skip old records that have already landed, and continue operations from today.",
    label: "Brought forward",
    mode: "brought_forward",
  },
] satisfies Array<{
  description: string
  label: string
  mode: TenantMigrationSetupMode
}>

const profitSeasonsReviewFormId = "profit-seasons-review-form"
const operationProfileFormId = "getting-started-operation-profile-form"

const noLimitActiveObligationCap = "2147483647"
const activeObligationLimitOptions = [
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5", value: "5" },
  {
    label: "No Limit",
    value: noLimitActiveObligationCap,
  },
]

function formatDate(value: string | null) {
  if (!value) return "Not set"

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00.000Z`))
}

function getActiveObligationLimitChoice(value: number) {
  return value > 5 ? noLimitActiveObligationCap : String(value)
}

function getCommitmentCollectionChoice(
  operationProfile: TenantOperationProfileReadModel
): CommitmentCollectionChoice {
  const membersUploadReceipts =
    operationProfile.services.payment_receipts.accessMode ===
    "member_self_service"
  const usesCollectionSources =
    operationProfile.services.collection_sources.accessMode !== "disabled"

  if (membersUploadReceipts && usesCollectionSources) return "mixed"
  if (usesCollectionSources) return "collection_sources"
  if (membersUploadReceipts) return "member_receipts"
  return "office"
}

function isServiceOffered(accessMode: TenantServiceAccessMode) {
  return accessMode !== "disabled" && accessMode !== "read_only"
}

function getRequestChannel(accessMode: TenantServiceAccessMode) {
  return accessMode === "member_self_service" ? "member" : "office"
}

function formatAccessMode(value: TenantServiceAccessMode) {
  const labels = {
    disabled: "Not offered",
    member_self_service: "Members can request",
    office_only: "Office-managed",
    read_only: "View existing records only",
  } satisfies Record<TenantServiceAccessMode, string>

  return labels[value]
}

function ConfirmationForm({
  action,
  buttonLabel,
  confirmationLabel = "Confirmation phrase",
  description,
  disabled = false,
  id,
  includeNotes = true,
  placeholder,
  submitVariant = "outline",
  title,
}: {
  action: ComponentProps<"form">["action"]
  buttonLabel: string
  confirmationLabel?: string
  description: string
  disabled?: boolean
  id: string
  includeNotes?: boolean
  placeholder: string
  submitVariant?: ComponentProps<typeof Button>["variant"]
  title: string
}) {
  const confirmationId = `${id}-confirmation`
  const notesId = `${id}-notes`

  return (
    <form action={action} className="border border-border/70 bg-muted/20 p-4">
      <FieldSet>
        <FieldLegend>{title}</FieldLegend>
        <FieldDescription>{description}</FieldDescription>
        <FieldGroup className="gap-4">
          <Field data-disabled={disabled ? true : undefined}>
            <FieldLabel htmlFor={confirmationId}>
              {confirmationLabel}
            </FieldLabel>
            <Input
              disabled={disabled}
              id={confirmationId}
              name="confirmation"
              placeholder={placeholder}
            />
          </Field>
          {includeNotes ? (
            <Field>
              <FieldLabel htmlFor={notesId}>Review note</FieldLabel>
              <Textarea
                id={notesId}
                name="notes"
                placeholder="Optional review note"
              />
            </Field>
          ) : null}
          <Button
            className="w-fit"
            disabled={disabled}
            type="submit"
            variant={submitVariant}
          >
            {buttonLabel}
          </Button>
        </FieldGroup>
      </FieldSet>
    </form>
  )
}

export function MigrationSetupModeContent({
  migrationSetup,
  recommendedMigrationSetupMode,
}: {
  migrationSetup: TenantMigrationSetupSettings
  recommendedMigrationSetupMode: TenantMigrationSetupMode | null
}) {
  return (
    <form
      action={updateTenantMigrationSetupAction}
      className="grid gap-3 md:grid-cols-2"
    >
      {migrationSetupModeOptions.map((option) => {
        const selected = migrationSetup.mode === option.mode
        const recommended = recommendedMigrationSetupMode === option.mode

        return (
          <div
            className={cn(
              "flex min-h-[210px] flex-col justify-between border p-4",
              selected
                ? "border-primary bg-primary/5"
                : "border-border/70 bg-muted/20"
            )}
            key={option.mode}
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={selected ? "default" : "secondary"}>
                  {selected ? "Selected" : "Option"}
                </Badge>
                {recommended ? <Badge variant="outline">Recommended</Badge> : null}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{option.label}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {option.description}
              </p>
            </div>
            <Button
              className="mt-5 w-fit"
              name="mode"
              type="submit"
              value={option.mode}
              variant={selected ? "default" : "outline"}
            >
              {selected ? "Keep selected" : `Use ${option.label}`}
            </Button>
          </div>
        )
      })}
    </form>
  )
}

export function GettingStartedStartDateContent({
  tenantStartDate,
}: {
  tenantStartDate: string | null
}) {
  return (
    <FinanceStartDateForm
      defaultStartDate={tenantStartDate}
      preserveDraftKey="getting-started:start-date"
    />
  )
}

export function GettingStartedChargesContent({
  chargeDefinitions,
  quickFillEnabled,
  redirectTo,
  tenantStartDate,
}: {
  chargeDefinitions: ComponentProps<
    typeof ChargeDefinitionForm
  >["initialDefinitions"]
  quickFillEnabled: boolean
  redirectTo: string
  tenantStartDate: string | null
}) {
  return (
    <ChargeDefinitionForm
      devMode={quickFillEnabled}
      financeStartDate={tenantStartDate}
      initialDefinitions={chargeDefinitions}
      preserveDraftKey="getting-started:charges"
      redirectTo={redirectTo}
      showSubmitButton={false}
    />
  )
}

export function GettingStartedProfitPolicyContent({
  businessPolicy,
  quickFillEnabled,
  redirectTo,
}: {
  businessPolicy: TenantBusinessProfitPolicySettings
  quickFillEnabled: boolean
  redirectTo: string
}) {
  return (
    <BusinessProfitPolicyForm
      defaultPolicy={businessPolicy}
      devMode={quickFillEnabled}
      preserveDraftKey="getting-started:profit-policy"
      redirectTo={redirectTo}
      showSubmitButton={false}
    />
  )
}

export function GettingStartedBusinessHistoryContent({
  dividendPeriods,
  financeStartDate,
  redirectTo,
  setupMode,
  shareBusinesses,
}: {
  dividendPeriods: ComponentProps<typeof ShareBusinessForm>["dividendPeriods"]
  financeStartDate: string | null
  redirectTo: string
  setupMode: TenantMigrationSetupMode
  shareBusinesses: ComponentProps<typeof ShareBusinessForm>["initialBusinesses"]
}) {
  return (
    <ShareBusinessForm
      dividendPeriods={dividendPeriods}
      financeStartDate={financeStartDate}
      initialBusinesses={shareBusinesses}
      preserveDraftKey="getting-started:business-history"
      profitHistoryMode
      redirectTo={redirectTo}
      setupMode={setupMode}
      showSubmitButton={false}
      sourceType="backfill"
    />
  )
}

function OperationProfileProgress({
  activeStep,
  reviewed,
}: {
  activeStep: OperationProfileStepKey
  reviewed: boolean
}) {
  const activeIndex = getOperationProfileStepIndex(activeStep)
  const activeMeta = getOperationProfileStepMeta(activeStep)
  const progressPercent =
    ((activeIndex + 1) / operationProfileStepKeys.length) * 100

  return (
    <div className="border-b border-border/70 bg-muted/20 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Operation Profile
          </p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">
            {activeMeta.label}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {activeMeta.description}
          </p>
        </div>
        <Badge variant={reviewed ? "default" : "secondary"}>
          {reviewed ? "Reviewed" : "Needs review"}
        </Badge>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden bg-background">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Step {activeIndex + 1} of {operationProfileStepKeys.length}
      </p>
    </div>
  )
}

function OperationProfilePolicyInputs({
  operationProfile,
  step,
}: {
  operationProfile: TenantOperationProfileReadModel
  step: OperationProfileStepKey
}) {
  const hideProcurementPolicy =
    step !== "procurement" ||
    !isServiceOffered(operationProfile.services.procurement.accessMode)
  const hideFoodPurchasePolicy =
    step !== "foodstuff" ||
    !isServiceOffered(operationProfile.services.food_purchase.accessMode)

  return (
    <>
      {hideProcurementPolicy ? (
        <input
          name="procurementMaximumActiveObligationsPerMember"
          type="hidden"
          value={
            operationProfile.policy.procurementMaximumActiveObligationsPerMember
          }
        />
      ) : null}
      {hideFoodPurchasePolicy ? (
        <>
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
        </>
      ) : null}
    </>
  )
}

function IntroOperationProfileStep({ tenantName }: { tenantName: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
      <div className="border border-border/70 bg-background p-5">
        <Badge variant="secondary">Let&apos;s know about your operation</Badge>
        <h3 className="mt-4 text-2xl font-semibold text-foreground">
          Tell us how {tenantName} works day to day.
        </h3>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          We will ask about commitment collection, procurement, Foodstuff
          Purchase, and member access one at a time. Your answers tailor the
          member portal and staff workspaces without changing existing finance
          safety rules.
        </p>
      </div>
      <div className="grid gap-3">
        {[
          "Short choices, not a long settings table.",
          "Services can stay office-managed when members should come in person.",
          "Existing obligations and records remain visible for audit and trust.",
        ].map((item) => (
          <div className="border border-border/70 bg-muted/20 p-4" key={item}>
            <CheckCircle2Icon className="size-4 text-primary" />
            <p className="mt-3 text-sm leading-6 font-medium text-foreground">
              {item}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function CommitmentCollectionStep({
  operationProfile,
}: {
  operationProfile: TenantOperationProfileReadModel
}) {
  const selectedChoice = getCommitmentCollectionChoice(operationProfile)

  return (
    <FieldSet>
      <FieldLegend>How are commitments collected?</FieldLegend>
      <FieldDescription>
        Choose the closest operating model. Manual payers remain valid even when
        payroll-style sources are enabled.
      </FieldDescription>
      <OperationProfileRadioCards
        className="md:grid-cols-2"
        defaultValue={selectedChoice}
        name="commitmentCollection"
        options={[
          {
            description:
              "Officials post office payments, cash payments, transfers, and other evidence for members.",
            title: "Officials record payments",
            value: "office",
          },
          {
            description:
              "Members upload receipts from their portal, then officials review and post them.",
            title: "Members submit receipts",
            value: "member_receipts",
          },
          {
            description:
              "A ministry, employer, payroll group, or other Collection Source releases deductions in batches.",
            title: "Collection Source batches",
            value: "collection_sources",
          },
          {
            description:
              "Some members pay through a source, while manual or self-employed members submit receipts or pay in-office.",
            title: "Mixed collection",
            value: "mixed",
          },
        ]}
      />
    </FieldSet>
  )
}

function ProcurementOperationStep({
  operationProfile,
}: {
  operationProfile: TenantOperationProfileReadModel
}) {
  const accessMode = operationProfile.services.procurement.accessMode
  const offered = isServiceOffered(accessMode)
  const channel = getRequestChannel(accessMode)

  return (
    <FieldSet>
      <FieldLegend>Does this cooperative offer procurement?</FieldLegend>
      <FieldDescription>
        Procurement helps members purchase goods or services and repay over
        time. If it is not offered, member and staff create actions stay closed.
      </FieldDescription>
      <OperationProfileRadioCards
        className="md:grid-cols-2"
        defaultValue={offered ? "yes" : "no"}
        name="procurementOffered"
        options={[
          {
            description:
              accessMode === "read_only"
                ? "New procurement is closed, but existing procurement records remain visible."
                : "Hide procurement request actions for this cooperative.",
            title: "No, not offered",
            value: "no",
          },
          {
            description:
              "Enable procurement setup and choose whether members can start requests online.",
            title: "Yes, procurement is offered",
            value: "yes",
          },
        ]}
      />
      {offered ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Who starts requests?
            </h4>
            <OperationProfileRadioCards
              className="mt-3"
              defaultValue={channel}
              name="procurementRequestChannel"
              options={[
                {
                  description:
                    "Members come to the office. Staff record and manage requests online.",
                  title: "Office-managed",
                  value: "office",
                },
                {
                  description:
                    "Members can start procurement requests from their portal.",
                  title: "Members can request online",
                  value: "member",
                },
              ]}
            />
          </div>
          <Field>
            <FieldLabel>Active procurement limit per member</FieldLabel>
            <OperationProfileButtonGroup
              defaultValue={getActiveObligationLimitChoice(
                operationProfile.policy
                  .procurementMaximumActiveObligationsPerMember
              )}
              name="procurementMaximumActiveObligationsPerMember"
              options={activeObligationLimitOptions}
            />
            <FieldDescription>
              Choose how many active procurement obligations a member can carry
              at once.
            </FieldDescription>
          </Field>
        </div>
      ) : null}
    </FieldSet>
  )
}

function FoodstuffOperationStep({
  operationProfile,
}: {
  operationProfile: TenantOperationProfileReadModel
}) {
  const accessMode = operationProfile.services.food_purchase.accessMode
  const offered = isServiceOffered(accessMode)
  const channel = getRequestChannel(accessMode)

  return (
    <FieldSet>
      <FieldLegend>Does this cooperative run Foodstuff Purchase?</FieldLegend>
      <FieldDescription>
        Foodstuff Purchase is a separate cycle-led service. Officials can open
        cycles and members apply only when the service is active.
      </FieldDescription>
      <OperationProfileRadioCards
        className="md:grid-cols-2"
        defaultValue={offered ? "yes" : "no"}
        name="foodPurchaseOffered"
        options={[
          {
            description:
              accessMode === "read_only"
                ? "New applications are closed, but existing Foodstuff Purchase records remain visible."
                : "Hide Foodstuff Purchase application actions for this cooperative.",
            title: "No, not offered",
            value: "no",
          },
          {
            description:
              "Enable Foodstuff Purchase and choose how members join purchase cycles.",
            title: "Yes, Foodstuff Purchase is offered",
            value: "yes",
          },
        ]}
      />
      {offered ? (
        <div className="mt-5 grid gap-5">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Who starts applications?
            </h4>
            <OperationProfileRadioCards
              className="mt-3 flex flex-row flex-wrap [&>label]:min-w-64 [&>label]:flex-1"
              defaultValue={channel}
              name="foodPurchaseRequestChannel"
              options={[
                {
                  description:
                    "Members come to the office. Staff record applications during a cycle.",
                  title: "Office-managed",
                  value: "office",
                },
                {
                  description:
                    "Members can apply from their portal when a cycle is open.",
                  title: "Members can apply online",
                  value: "member",
                },
              ]}
            />
          </div>
          <Field>
            <FieldLabel>Active Foodstuff Purchase limit per member</FieldLabel>
            <OperationProfileButtonGroup
              defaultValue={getActiveObligationLimitChoice(
                operationProfile.policy
                  .foodPurchaseMaximumActiveObligationsPerMember
              )}
              name="foodPurchaseMaximumActiveObligationsPerMember"
              options={activeObligationLimitOptions}
            />
            <FieldDescription>
              Choose how many active Foodstuff Purchase obligations a member can
              carry at once.
            </FieldDescription>
          </Field>
          <OperationProfileCheckboxField
            defaultChecked={operationProfile.policy.foodPurchaseRequiresOpenCycle}
            description="Members can only apply when officials open an active purchase cycle."
            name="foodPurchaseRequiresOpenCycle"
            title="Require an open cycle"
          />
        </div>
      ) : null}
    </FieldSet>
  )
}

function MemberAccessOperationStep({
  operationProfile,
}: {
  operationProfile: TenantOperationProfileReadModel
}) {
  const supportMode = operationProfile.services.support_cases.accessMode
  const supportChannel = supportMode === "office_only" ? "office" : "member"

  return (
    <FieldSet>
      <FieldLegend>What can members do from their portal?</FieldLegend>
      <FieldDescription>
        Keep member support simple. Other service actions follow the choices you
        made in the earlier steps.
      </FieldDescription>
      <OperationProfileRadioCards
        className="md:grid-cols-2"
        defaultValue={supportChannel}
        name="supportAccess"
        options={[
          {
            description:
              "Members can raise support cases and ask officials for help from the portal.",
            title: "Members can contact support online",
            value: "member",
          },
          {
            description:
              "Support is handled by officials in the office; members do not start cases online.",
            title: "Office-managed support",
            value: "office",
          },
        ]}
      />
    </FieldSet>
  )
}

function OperationProfileReviewStep({
  operationProfile,
}: {
  operationProfile: TenantOperationProfileReadModel
}) {
  const commitmentChoice = getCommitmentCollectionChoice(operationProfile)
  const commitmentModes =
    accessModesFromCommitmentCollectionChoice(commitmentChoice)
  const rows = [
    ["Commitment collection", commitmentChoice.replaceAll("_", " ")],
    ["Payment receipts", formatAccessMode(commitmentModes.paymentReceipts)],
    ["Collection Sources", formatAccessMode(commitmentModes.collectionSources)],
    [
      "Batch posting",
      formatAccessMode(commitmentModes.collectionSourceBatchPosting),
    ],
    [
      "Procurement",
      formatAccessMode(operationProfile.services.procurement.accessMode),
    ],
    [
      "Foodstuff Purchase",
      formatAccessMode(operationProfile.services.food_purchase.accessMode),
    ],
    [
      "Member support",
      formatAccessMode(operationProfile.services.support_cases.accessMode),
    ],
  ] satisfies Array<[string, string]>

  return (
    <div className="grid gap-4">
      <div className="border border-border/70 bg-muted/20 p-4">
        <h3 className="text-lg font-semibold text-foreground">
          Review operation profile
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Save these choices to tailor staff workspaces, member actions, and
          reports without hiding existing records or obligations.
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div
            className="border border-border/70 bg-background p-4"
            key={label}
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-semibold text-foreground capitalize">
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function OperationProfileStepContent({
  operationProfile,
  step,
  tenantName,
}: {
  operationProfile: TenantOperationProfileReadModel
  step: OperationProfileStepKey
  tenantName: string
}) {
  if (step === "intro") {
    return <IntroOperationProfileStep tenantName={tenantName} />
  }

  if (step === "commitments") {
    return <CommitmentCollectionStep operationProfile={operationProfile} />
  }

  if (step === "procurement") {
    return <ProcurementOperationStep operationProfile={operationProfile} />
  }

  if (step === "foodstuff") {
    return <FoodstuffOperationStep operationProfile={operationProfile} />
  }

  if (step === "member-access") {
    return <MemberAccessOperationStep operationProfile={operationProfile} />
  }

  return <OperationProfileReviewStep operationProfile={operationProfile} />
}

function OperationProfileNavigationActions({
  nextHref,
  operationProfileStep,
  previousHref,
}: {
  nextHref: string
  operationProfileStep: OperationProfileStepKey
  previousHref: string
}) {
  return (
    <div className="flex flex-wrap justify-between gap-2">
      <Link
        className={buttonVariants({ variant: "outline" })}
        href={previousHref}
      >
        Previous
      </Link>
      {operationProfileStep === "intro" ? (
        <Link className={buttonVariants({})} href={nextHref}>
          Next
        </Link>
      ) : (
        <Button type="submit">
          {operationProfileStep === "review" ? "Save and continue" : "Next"}
        </Button>
      )}
    </div>
  )
}

export function OperationProfileGettingStartedContent({
  operationProfile,
  operationProfileStep,
  tenantName,
}: {
  operationProfile: TenantOperationProfileReadModel
  operationProfileStep: OperationProfileStepKey
  tenantName: string
}) {
  const navigation = getOperationProfileStepNavigation(operationProfileStep)

  return (
    <div className="overflow-hidden border border-border/70 bg-background">
      <OperationProfileProgress
        activeStep={operationProfileStep}
        reviewed={Boolean(operationProfile.reviewedAt)}
      />
      <OperationProfileWizardForm
        className="grid gap-5 p-5"
        id={operationProfileFormId}
        nextHref={navigation.nextHref}
      >
        <input name="redirectTo" type="hidden" value={navigation.nextHref} />
        {operationProfileStep === "intro" ? null : (
          <input
            name="changeReason"
            type="hidden"
            value="Initial setup operation profile update."
          />
        )}
        <OperationProfilePolicyInputs
          operationProfile={operationProfile}
          step={operationProfileStep}
        />
        <OperationProfileNavigationActions
          nextHref={navigation.nextHref}
          operationProfileStep={operationProfileStep}
          previousHref={navigation.previousHref}
        />
        <Separator />
        <div className="motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in-0 motion-safe:slide-in-from-right-2">
          <OperationProfileStepContent
            operationProfile={operationProfile}
            step={operationProfileStep}
            tenantName={tenantName}
          />
        </div>
        <Separator />
        <OperationProfileNavigationActions
          nextHref={navigation.nextHref}
          operationProfileStep={operationProfileStep}
          previousHref={navigation.previousHref}
        />
      </OperationProfileWizardForm>
    </div>
  )
}

export function ProfitSeasonsReviewContent({
  businessProfitSeasons,
  pendingCount,
  redirectTo,
}: {
  businessProfitSeasons: BusinessProfitSeasonRow[]
  pendingCount: number
  redirectTo: string
}) {
  return (
    <form
      action={saveBusinessProfitSeasonReviewAction}
      className="grid gap-4"
      id={profitSeasonsReviewFormId}
    >
      <input name="redirectTo" type="hidden" value={redirectTo} />
      {pendingCount > 0 ? (
        <Alert>
          <AlertTitle>{pendingCount} season(s) need review</AlertTitle>
          <AlertDescription>
            Save this table to create dividend seasons and link each business
            profit entry to the reviewed period.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-3">
        {businessProfitSeasons.map((season) => {
          const maxSeasonDeduction = Math.max(
            0,
            season.grossProfitAmount - season.entryDeductionAmount
          )
          const visibleBusinessNames = season.businessNames.slice(0, 1)
          const hiddenBusinessCount =
            season.businessNames.length - visibleBusinessNames.length

          return (
            <div
              className="grid gap-3 border-t border-border/70 pt-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_7rem_7rem_8rem_8rem_7rem] xl:items-start"
              key={season.key}
            >
              <div>
                <input name="seasonKey" type="hidden" value={season.key} />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          className="text-left font-medium underline-offset-4 hover:underline"
                          type="button"
                        />
                      }
                    >
                      {season.label}
                    </TooltipTrigger>
                    <TooltipContent
                      align="start"
                      className="grid max-w-[460px] gap-2 rounded-sm border border-border bg-popover p-3 text-popover-foreground shadow-xl [&>*:last-child]:bg-popover [&>*:last-child]:fill-popover"
                      side="right"
                      sideOffset={12}
                    >
                      <div className="border-b border-border/70 pb-2">
                        <p className="text-sm font-semibold">Profit entries</p>
                        <p className="text-xs text-muted-foreground">
                          {season.label}
                        </p>
                      </div>
                      <div className="grid gap-2">
                        {season.profitEntries.map((entry) => (
                          <div
                            className="grid gap-1 border-b border-border/70 pb-2 last:border-b-0 last:pb-0"
                            key={`${season.key}-${entry.businessName}-${entry.profitDate}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium">
                                {entry.businessName}
                              </span>
                              <span className="tabular-nums">
                                {formatCurrency(entry.profitAmount)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-muted-foreground">
                              <span>{formatDate(entry.profitDate)}</span>
                              <span>
                                deduction {formatCurrency(entry.deductionAmount)}
                              </span>
                            </div>
                            {entry.reason ? (
                              <p className="text-muted-foreground">
                                {entry.reason}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="mt-1 flex flex-wrap gap-1">
                  {visibleBusinessNames.map((businessName) => (
                    <Badge key={`${season.key}-${businessName}`} variant="secondary">
                      {businessName}
                    </Badge>
                  ))}
                  {hiddenBusinessCount > 0 ? (
                    <Badge variant="outline">+{hiddenBusinessCount}</Badge>
                  ) : null}
                </div>
              </div>
              <div className="sm:text-right">
                <p className="text-xs font-medium text-muted-foreground">
                  Profit
                </p>
                <p className="mt-1 text-sm">
                  {formatCurrency(season.grossProfitAmount)}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs font-medium text-muted-foreground">
                  Row deduct.
                </p>
                <p className="mt-1 text-sm">
                  {formatCurrency(season.entryDeductionAmount)}
                </p>
              </div>
              <BusinessProfitSeasonDeductionFields
                initialAmount={season.deductionAmount}
                initialReason={season.deductionReason}
                maxAmount={maxSeasonDeduction}
                preserveDraftKey={`getting-started:profit-seasons:${season.key}`}
                seasonKey={season.key}
              />
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Status
                </p>
                <Badge
                  variant={
                    season.status === "pending" || season.status === "draft"
                      ? "secondary"
                      : "default"
                  }
                >
                  {season.status === "pending" ? "Needs review" : season.status}
                </Badge>
              </div>
            </div>
          )
        })}
      </div>
      <GettingStartedFooterPortal>
        <Button form={profitSeasonsReviewFormId} type="submit">
          Finalize
        </Button>
      </GettingStartedFooterPortal>
    </form>
  )
}

export function FinalizeMigrationContent({
  blockingStepCount,
  tenantName,
}: {
  blockingStepCount: number
  tenantName: string
}) {
  return (
    <ConfirmationForm
      action={finalizeInitialMigrationAction}
      buttonLabel="Complete setup"
      description="Type FINALIZE MIGRATION after every setup and member backfill step is complete. This updates the workspace setup gate, opens live operations, and locks historical setup."
      disabled={blockingStepCount > 0}
      id="finalize-migration"
      includeNotes={false}
      placeholder="FINALIZE MIGRATION"
      submitVariant="default"
      title={`Finalize ${tenantName} migration`}
    />
  )
}
