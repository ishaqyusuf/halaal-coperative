import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { SectionCard } from "@/components/app/section-card"
import { StatCard } from "@/components/app/stat-card"
import { VirtualizedCardList } from "@/components/app/virtualized-card-list"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import {
  createMobileMemberProjectFinancingRequest,
  getMobileMemberProjectFinancing,
  type MobileMemberProjectFinancing,
  type MobileProjectFinancingRequest,
  type MobileProjectFinancingStructure,
  type MobileWorkflowChargeOption,
} from "@/lib/mobile-home-api"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { isMockSessionToken } from "@/lib/session-store"
import { useCallback, useMemo, useState, useEffect } from "react"
import { ScrollView, View } from "react-native"

const projectFinancingStructures: {
  detail: string
  label: string
  value: MobileProjectFinancingStructure
}[] = [
  {
    detail: "Let finance clarify the structure during review",
    label: "Undecided",
    value: "undecided",
  },
  {
    detail: "Principal payback facility for a defined project",
    label: "Repayable",
    value: "repayable_facility",
  },
  {
    detail: "Investment-style partnership with separate accounting",
    label: "Partnership",
    value: "investment_partnership",
  },
  {
    detail: "Profit-sharing arrangement to be reviewed",
    label: "Profit sharing",
    value: "profit_sharing",
  },
]

function parseAmount(value: string) {
  const amount = Number(value.replace(/,/g, "").trim())

  return Number.isFinite(amount) ? amount : 0
}

function parsePositiveInteger(value: string) {
  const amount = Number(value.trim())

  return Number.isInteger(amount) && amount > 0 ? amount : 0
}

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded"

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value))
}

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function estimateChargeAmount(
  charge: MobileWorkflowChargeOption,
  basisAmount: number
) {
  if (charge.chargeValueType === "percentage") {
    return Number(((Math.max(0, basisAmount) * charge.amount) / 100).toFixed(2))
  }

  return charge.amount
}

function MobileChargeSummary({
  basisAmount,
  charges,
  currencyCode,
}: {
  basisAmount: number
  charges: MobileWorkflowChargeOption[]
  currencyCode: string
}) {
  const estimatedCharges = charges
    .map((charge) => ({
      ...charge,
      estimatedAmount: estimateChargeAmount(charge, basisAmount),
    }))
    .filter((charge) => charge.estimatedAmount > 0)
  const total = estimatedCharges.reduce(
    (sum, charge) => sum + charge.estimatedAmount,
    0
  )

  if (estimatedCharges.length === 0) return null

  return (
    <View className="gap-2 rounded-lg bg-secondary p-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-sm font-semibold text-foreground">
          Applicable charges
        </Text>
        <Text className="text-sm font-semibold text-foreground">
          {formatCurrency(total, currencyCode)}
        </Text>
      </View>
      {estimatedCharges.map((charge) => (
        <View
          className="flex-row items-center justify-between gap-3"
          key={`${charge.id}-${charge.collectionMode}`}
        >
          <Text className="flex-1 text-xs text-muted-foreground">
            {charge.name} - {formatStatus(charge.collectionMode)}
          </Text>
          <Text className="text-xs font-medium text-foreground">
            {formatCurrency(charge.estimatedAmount, currencyCode)}
          </Text>
        </View>
      ))}
    </View>
  )
}

function StructureButton({
  isSelected,
  onPress,
  structure,
}: {
  isSelected: boolean
  onPress: () => void
  structure: (typeof projectFinancingStructures)[number]
}) {
  return (
    <Button
      className="h-auto items-start justify-start px-3 py-3"
      onPress={onPress}
      variant={isSelected ? "secondary" : "outline"}
    >
      <View className="flex-1 gap-1">
        <Text className="text-sm font-semibold text-foreground">
          {structure.label}
        </Text>
        <Text className="text-xs leading-4 text-muted-foreground">
          {structure.detail}
        </Text>
      </View>
      {isSelected ? (
        <Icon name="Check" className="size-sm text-foreground" />
      ) : null}
    </Button>
  )
}

function ProjectFinancingRequestCard({
  currencyCode,
  isFirst,
  request,
}: {
  currencyCode: string
  isFirst: boolean
  request: MobileProjectFinancingRequest
}) {
  const outstandingAmount = Math.max(
    (request.approvedAmount ?? 0) - request.paidAmount,
    0
  )

  return (
    <View className={isFirst ? "gap-3" : "gap-3 border-t border-border pt-3"}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-sm font-semibold text-foreground">
            {request.businessName}
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {formatStatus(request.proposedStructure)}
          </Text>
        </View>
        <Text className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-foreground">
          {formatStatus(request.status)}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <View className="min-w-[120px] flex-1 rounded-md bg-secondary p-3">
          <Text className="text-xs font-medium text-muted-foreground">
            Requested
          </Text>
          <Text className="mt-1 text-sm font-semibold text-foreground">
            {formatCurrency(request.requestedAmount, currencyCode)}
          </Text>
        </View>
        <View className="min-w-[120px] flex-1 rounded-md bg-secondary p-3">
          <Text className="text-xs font-medium text-muted-foreground">
            Monthly estimate
          </Text>
          <Text className="mt-1 text-sm font-semibold text-foreground">
            {request.estimatedMonthlyPayback
              ? formatCurrency(request.estimatedMonthlyPayback, currencyCode)
              : "Not set"}
          </Text>
        </View>
      </View>

      {request.projectPurpose ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {request.projectPurpose}
        </Text>
      ) : null}

      {request.businessDescription ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {request.businessDescription}
        </Text>
      ) : null}

      {request.approvedAmount ? (
        <Text className="text-sm leading-5 text-foreground">
          Approved {formatCurrency(request.approvedAmount, currencyCode)}
          {request.approvedStructure
            ? ` as ${formatStatus(request.approvedStructure)}`
            : ""}
          {request.approvedPaybackMonths
            ? ` over ${request.approvedPaybackMonths} month(s)`
            : ""}
          .
        </Text>
      ) : null}

      {request.disbursedAt ? (
        <Text className="text-sm leading-5 text-foreground">
          Disbursed {formatDate(request.disbursedAt)}
          {request.disbursementReference
            ? ` - ${request.disbursementReference}`
            : ""}
        </Text>
      ) : null}

      {outstandingAmount > 0 ? (
        <Text className="text-sm leading-5 text-foreground">
          Outstanding {formatCurrency(outstandingAmount, currencyCode)}
        </Text>
      ) : null}

      <Text className="text-xs font-medium text-muted-foreground">
        Requested {formatDate(request.requestedAt)}
      </Text>

      {request.reviewNotes ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {request.reviewNotes}
        </Text>
      ) : null}

      {request.disbursementNotes ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {request.disbursementNotes}
        </Text>
      ) : null}
    </View>
  )
}

export function ProjectFinancingScreen() {
  const { profile } = useAuthContext()
  const colors = useColors()
  const [projectFinancing, setProjectFinancing] =
    useState<MobileMemberProjectFinancing | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [businessName, setBusinessName] = useState("")
  const [requestedAmount, setRequestedAmount] = useState("")
  const [requestedPaybackMonths, setRequestedPaybackMonths] = useState("")
  const [proposedStructure, setProposedStructure] =
    useState<MobileProjectFinancingStructure>("undecided")
  const [projectPurpose, setProjectPurpose] = useState("")
  const [businessDescription, setBusinessDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const canUseServerProjectFinancing = Boolean(
    profile?.role === "member" &&
    profile?.token &&
    !isMockSessionToken(profile.token)
  )
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const hasStaleProjectFinancing = isMobileReadCacheStale(
    projectFinancing?.cache
  )
  const projectFinancingDraft = useMemo(
    () => ({
      businessDescription,
      businessName,
      projectPurpose,
      proposedStructure,
      requestedAmount,
      requestedPaybackMonths,
    }),
    [
      businessDescription,
      businessName,
      projectPurpose,
      proposedStructure,
      requestedAmount,
      requestedPaybackMonths,
    ]
  )
  const clearProjectFinancingDraft = useMobileFormDraft({
    enabled: canUseServerProjectFinancing,
    key: "member.project-financing.create",
    onHydrate: (draft) => {
      setBusinessName(draft.businessName)
      setRequestedAmount(draft.requestedAmount)
      setRequestedPaybackMonths(draft.requestedPaybackMonths)
      setProposedStructure(draft.proposedStructure)
      setProjectPurpose(draft.projectPurpose)
      setBusinessDescription(draft.businessDescription)
    },
    value: projectFinancingDraft,
  })
  const amount = parseAmount(requestedAmount)
  const paybackMonths = parsePositiveInteger(requestedPaybackMonths)
  const hasInvalidPayback =
    requestedPaybackMonths.trim().length > 0 && paybackMonths === 0
  const canSubmit = Boolean(
    businessName.trim().length >= 2 &&
    amount > 0 &&
    !hasInvalidPayback &&
    !hasStaleProjectFinancing &&
    !isSubmitting
  )
  const stats = useMemo(
    () => [
      {
        detail: "Waiting for finance review",
        label: "Pending",
        value: String(projectFinancing?.summary.pendingRequests ?? 0),
      },
      {
        detail: "Approved, active, or completed",
        label: "Approved",
        value: String(projectFinancing?.summary.approvedRequests ?? 0),
      },
      {
        detail: "Active project facilities",
        label: "Active",
        value: String(projectFinancing?.summary.activeRequests ?? 0),
      },
      {
        detail: "Approved balance not yet repaid",
        label: "Outstanding",
        value: formatCurrency(
          projectFinancing?.summary.outstandingAmount ?? 0,
          currencyCode
        ),
      },
    ],
    [
      currencyCode,
      projectFinancing?.summary.activeRequests,
      projectFinancing?.summary.approvedRequests,
      projectFinancing?.summary.outstandingAmount,
      projectFinancing?.summary.pendingRequests,
    ]
  )

  const loadProjectFinancing = useCallback(() => {
    let mounted = true

    if (!canUseServerProjectFinancing) {
      setProjectFinancing(null)
      setError(null)
      setIsLoading(false)
      return () => {
        mounted = false
      }
    }

    setIsLoading(true)
    setError(null)

    void getMobileMemberProjectFinancing()
      .then((response) => {
        if (mounted) {
          setProjectFinancing(response)
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Project financing is unavailable.")
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [canUseServerProjectFinancing])

  useEffect(() => loadProjectFinancing(), [loadProjectFinancing])

  async function handleSubmit() {
    if (hasStaleProjectFinancing) {
      setError("Refresh project financing data before submitting a request.")
      return
    }

    if (!canSubmit) return

    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      await createMobileMemberProjectFinancingRequest({
        businessDescription: businessDescription.trim() || undefined,
        businessName: businessName.trim(),
        projectPurpose: projectPurpose.trim() || undefined,
        proposedStructure,
        requestedAmount: amount,
        requestedPaybackMonths: paybackMonths || undefined,
      })
      await clearProjectFinancingDraft()
      setBusinessName("")
      setRequestedAmount("")
      setRequestedPaybackMonths("")
      setProposedStructure("undecided")
      setProjectPurpose("")
      setBusinessDescription("")
      setSuccess("Project financing request submitted.")
      loadProjectFinancing()
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Project financing request could not be submitted."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View className="gap-2">
          <Text className="text-3xl font-black text-foreground">
            Project financing
          </Text>
          <Text className="text-base leading-6 text-muted-foreground">
            Request cooperative business funding while finance keeps structure
            and accounting review separate from ordinary financing.
          </Text>
        </View>

        {!canUseServerProjectFinancing ? (
          <SectionCard icon="BriefcaseBusiness" title="Project financing">
            <Text className="text-sm leading-5 text-muted-foreground">
              Sign in with a production member account to request and track
              project financing.
            </Text>
          </SectionCard>
        ) : null}

        {canUseServerProjectFinancing ? (
          <>
            <CachedReadBanner
              cache={projectFinancing?.cache}
              label="project financing data"
            />

            <View className="flex-row flex-wrap gap-3">
              {stats.map((item) => (
                <StatCard key={item.label} {...item} />
              ))}
            </View>

            {error ? (
              <Text className="text-sm font-medium text-destructive">
                {error}
              </Text>
            ) : null}
            {success ? (
              <Text className="text-success text-sm font-medium">
                {success}
              </Text>
            ) : null}

            <SectionCard icon="BriefcaseBusiness" title="New project request">
              <View className="gap-3">
                <Input
                  editable={!isSubmitting}
                  onChangeText={setBusinessName}
                  placeholder="Business name"
                  value={businessName}
                />
                <Input
                  editable={!isSubmitting}
                  keyboardType="numeric"
                  onChangeText={setRequestedAmount}
                  placeholder="Requested amount"
                  value={requestedAmount}
                />
                <Input
                  editable={!isSubmitting}
                  keyboardType="numeric"
                  onChangeText={setRequestedPaybackMonths}
                  placeholder="Payback months, if repayable"
                  value={requestedPaybackMonths}
                />
                <View className="gap-2">
                  {projectFinancingStructures.map((structure) => (
                    <StructureButton
                      isSelected={structure.value === proposedStructure}
                      key={structure.value}
                      onPress={() => setProposedStructure(structure.value)}
                      structure={structure}
                    />
                  ))}
                </View>
                <Textarea
                  editable={!isSubmitting}
                  onChangeText={setProjectPurpose}
                  placeholder="Project purpose"
                  value={projectPurpose}
                />
                <Textarea
                  editable={!isSubmitting}
                  onChangeText={setBusinessDescription}
                  placeholder="Business description"
                  value={businessDescription}
                />
                <MobileChargeSummary
                  basisAmount={amount}
                  charges={projectFinancing?.chargeOptions ?? []}
                  currencyCode={currencyCode}
                />
                <Button
                  className="h-12"
                  disabled={!canSubmit}
                  onPress={handleSubmit}
                >
                  <Icon
                    name="Send"
                    className="size-base text-primary-foreground"
                  />
                  <Text>{isSubmitting ? "Submitting" : "Send request"}</Text>
                </Button>
              </View>
            </SectionCard>

            <SectionCard icon="ClipboardList" title="Request history">
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <VirtualizedCardList
                  data={projectFinancing?.requests ?? []}
                  empty={
                    <Text className="text-sm leading-5 text-muted-foreground">
                      No project financing requests have been submitted from
                      this member profile.
                    </Text>
                  }
                  estimatedItemSize={200}
                  keyExtractor={(request) => request.id}
                  renderItem={({ index, item: request }) => (
                    <ProjectFinancingRequestCard
                      currencyCode={currencyCode}
                      isFirst={index === 0}
                      request={request}
                    />
                  )}
                />
              )}
            </SectionCard>
          </>
        ) : null}
      </ScrollView>
    </SafeArea>
  )
}
