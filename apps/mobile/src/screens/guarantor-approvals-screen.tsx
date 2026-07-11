import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { SectionCard } from "@/components/app/section-card"
import { StatCard } from "@/components/app/stat-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import {
  getMobileMemberGuarantorApprovals,
  respondMobileMemberGuarantorApproval,
  type MobileGuarantorApprovalDecision,
  type MobileMemberGuarantorApproval,
  type MobileMemberGuarantorApprovals,
} from "@/lib/mobile-home-api"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { isMockSessionToken } from "@/lib/session-store"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ScrollView, View } from "react-native"

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

function ApprovalCard({
  approval,
  currencyCode,
  isActionBlocked,
  isSubmitting,
  notes,
  onChangeNotes,
  onRespond,
}: {
  approval: MobileMemberGuarantorApproval
  currencyCode: string
  isActionBlocked: boolean
  isSubmitting: boolean
  notes: string
  onChangeNotes: (value: string) => void
  onRespond: (decision: MobileGuarantorApprovalDecision) => void
}) {
  const isPending = approval.status === "pending"

  return (
    <View className="gap-3 rounded-md border border-border bg-card p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-sm font-semibold text-foreground">
            {approval.loanRequest.borrowerName}
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {approval.loanRequest.borrowerMemberNumber} -{" "}
            {approval.loanRequest.loanProductName}
          </Text>
        </View>
        <Text className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-foreground">
          {formatStatus(approval.status)}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <View className="min-w-[120px] flex-1 rounded-md bg-secondary p-3">
          <Text className="text-xs font-medium text-muted-foreground">
            Requested
          </Text>
          <Text className="mt-1 text-sm font-semibold text-foreground">
            {formatCurrency(approval.loanRequest.requestedAmount, currencyCode)}
          </Text>
        </View>
        <View className="min-w-[120px] flex-1 rounded-md bg-secondary p-3">
          <Text className="text-xs font-medium text-muted-foreground">
            Monthly
          </Text>
          <Text className="mt-1 text-sm font-semibold text-foreground">
            {formatCurrency(
              approval.loanRequest.estimatedMonthlyServicing,
              currencyCode
            )}
          </Text>
        </View>
      </View>

      <Text className="text-sm leading-5 text-muted-foreground">
        {approval.loanRequest.requestedTermMonths} month term. Requested{" "}
        {formatDate(approval.requestedAt)}.
      </Text>

      {approval.loanRequest.purpose ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {approval.loanRequest.purpose}
        </Text>
      ) : null}

      {approval.responseNotes ? (
        <View className="gap-1 rounded-md border border-border p-3">
          <Text className="text-xs font-medium text-muted-foreground">
            Response note
          </Text>
          <Text className="text-sm leading-5 text-foreground">
            {approval.responseNotes}
          </Text>
        </View>
      ) : null}

      {approval.respondedAt ? (
        <Text className="text-xs font-medium text-muted-foreground">
          Responded {formatDate(approval.respondedAt)}
        </Text>
      ) : null}

      {isPending ? (
        <View className="gap-3 border-t border-border pt-3">
          <Textarea
            editable={!isActionBlocked && !isSubmitting}
            onChangeText={onChangeNotes}
            placeholder="Optional response note"
            value={notes}
          />
          <View className="flex-row gap-2">
            <Button
              className="h-11 flex-1"
              disabled={isActionBlocked || isSubmitting}
              onPress={() => onRespond("rejected")}
              variant="outline"
            >
              <Icon name="X" className="size-base text-foreground" />
              <Text>Reject</Text>
            </Button>
            <Button
              className="h-11 flex-1"
              disabled={isActionBlocked || isSubmitting}
              onPress={() => onRespond("approved")}
            >
              <Icon
                name="Check"
                className="size-base text-primary-foreground"
              />
              <Text>{isSubmitting ? "Saving" : "Approve"}</Text>
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  )
}

export function GuarantorApprovalsScreen() {
  const { profile } = useAuthContext()
  const colors = useColors()
  const router = useRouter()
  const [approvals, setApprovals] =
    useState<MobileMemberGuarantorApprovals | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [submittingApprovalId, setSubmittingApprovalId] = useState<
    string | null
  >(null)
  const [notesByApprovalId, setNotesByApprovalId] = useState<
    Record<string, string>
  >({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const canUseServerApprovals = Boolean(
    profile?.role === "member" &&
    profile?.token &&
    !isMockSessionToken(profile.token)
  )
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const hasStaleApprovals = isMobileReadCacheStale(approvals?.cache)
  const guarantorDraft = useMemo(
    () => ({
      notesByApprovalId,
    }),
    [notesByApprovalId]
  )
  const clearGuarantorDraft = useMobileFormDraft({
    enabled: canUseServerApprovals,
    key: "member.guarantor-approvals.respond",
    onHydrate: (draft) => {
      setNotesByApprovalId(draft.notesByApprovalId)
    },
    value: guarantorDraft,
  })
  const stats = useMemo(
    () => [
      {
        detail: "Waiting for your response",
        label: "Pending",
        value: String(approvals?.summary.pendingApprovals ?? 0),
      },
      {
        detail: "Consented requests",
        label: "Approved",
        value: String(approvals?.summary.approvedApprovals ?? 0),
      },
      {
        detail: "Declined requests",
        label: "Rejected",
        value: String(approvals?.summary.rejectedApprovals ?? 0),
      },
    ],
    [
      approvals?.summary.approvedApprovals,
      approvals?.summary.pendingApprovals,
      approvals?.summary.rejectedApprovals,
    ]
  )

  const loadApprovals = useCallback(() => {
    let mounted = true

    if (!canUseServerApprovals) {
      setApprovals(null)
      setError(null)
      setIsLoading(false)

      return () => {
        mounted = false
      }
    }

    setIsLoading(true)
    setError(null)

    void getMobileMemberGuarantorApprovals()
      .then((response) => {
        if (mounted) {
          setApprovals(response)
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Guarantor approvals are unavailable.")
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
  }, [canUseServerApprovals])

  useEffect(() => loadApprovals(), [loadApprovals])

  async function handleRespond(
    approvalId: string,
    status: MobileGuarantorApprovalDecision
  ) {
    if (hasStaleApprovals) {
      setError("Refresh guarantor approval data before responding.")
      return
    }

    if (submittingApprovalId) return

    setError(null)
    setSuccess(null)
    setSubmittingApprovalId(approvalId)

    try {
      await respondMobileMemberGuarantorApproval({
        guarantorApprovalId: approvalId,
        notes: notesByApprovalId[approvalId]?.trim() || undefined,
        status,
      })
      await clearGuarantorDraft()
      setSuccess(`Guarantor request ${status}.`)
      setNotesByApprovalId((current) => ({
        ...current,
        [approvalId]: "",
      }))
      loadApprovals()
    } catch {
      setError("Guarantor response could not be saved.")
    } finally {
      setSubmittingApprovalId(null)
    }
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <Button
          className="h-10 self-start px-3"
          onPress={() => router.back()}
          variant="outline"
        >
          <Icon name="ArrowLeft" className="size-base text-foreground" />
          <Text>Back</Text>
        </Button>

        <View className="gap-2">
          <Text className="text-3xl font-black text-foreground">
            Guarantor approvals
          </Text>
          <Text className="text-base leading-6 text-muted-foreground">
            Review financing requests where your member profile is listed as a
            guarantor.
          </Text>
        </View>

        {!canUseServerApprovals ? (
          <SectionCard icon="ShieldCheck" title="Guarantor approvals">
            <Text className="text-sm leading-5 text-muted-foreground">
              Sign in with a production member account to review guarantor
              requests.
            </Text>
          </SectionCard>
        ) : null}

        {canUseServerApprovals ? (
          <>
            <CachedReadBanner
              cache={approvals?.cache}
              label="guarantor approval data"
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

            <SectionCard icon="ShieldCheck" title="Requests">
              {isLoading ? (
                <LoadingSpinner />
              ) : approvals?.approvals.length ? (
                <View className="gap-3">
                  {approvals.approvals.map((approval) => (
                    <ApprovalCard
                      approval={approval}
                      currencyCode={currencyCode}
                      isActionBlocked={hasStaleApprovals}
                      isSubmitting={submittingApprovalId === approval.id}
                      key={approval.id}
                      notes={notesByApprovalId[approval.id] ?? ""}
                      onChangeNotes={(value) =>
                        setNotesByApprovalId((current) => ({
                          ...current,
                          [approval.id]: value,
                        }))
                      }
                      onRespond={(decision) =>
                        handleRespond(approval.id, decision)
                      }
                    />
                  ))}
                </View>
              ) : (
                <Text className="text-sm leading-5 text-muted-foreground">
                  No financing request currently lists you as guarantor.
                </Text>
              )}
            </SectionCard>
          </>
        ) : null}
      </ScrollView>
    </SafeArea>
  )
}
