import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { CompactFormSheet } from "@/components/app/compact-form-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenBackButton } from "@/components/app/screen-back-button"
import { ScreenHeader } from "@/components/app/screen-header"
import { SubmissionReviewSheet } from "@/components/app/submission-review-sheet"
import { SubmissionSuccessSheet } from "@/components/app/submission-success-sheet"
import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ScrollView, View } from "react-native"
import {
  changeAdminMemberStatus,
  getAdminMemberDetail,
  reviewAdminMemberKyc,
} from "../api/admin-member-lifecycle-api"
import { presentAdminMemberDetailForQa } from "../model/admin-member-lifecycle-qa"
import type {
  MobileAdminLifecycleQaState,
  MobileAdminMemberDetail,
  MobileAdminMemberKycStatus,
  MobileAdminMemberStatus,
} from "../model/admin-member-lifecycle-types"

type ChangeIntent =
  | { kind: "status"; value: MobileAdminMemberStatus }
  | { kind: "kyc"; value: MobileAdminMemberKycStatus }

const statusTransitions: Record<
  MobileAdminMemberStatus,
  MobileAdminMemberStatus[]
> = {
  active: ["inactive", "suspended", "exited"],
  exited: [],
  inactive: ["active", "suspended", "exited"],
  pending: ["active", "inactive"],
  suspended: ["active", "inactive", "exited"],
}

const kycTransitions: Record<
  MobileAdminMemberKycStatus,
  MobileAdminMemberKycStatus[]
> = {
  not_started: ["pending"],
  pending: ["verified", "rejected"],
  rejected: ["pending"],
  verified: ["pending"],
}

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded"
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value))
}

function getInitials(value: string) {
  return (
    value
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "MB"
  )
}

function getChangeDescription(intent: ChangeIntent) {
  if (intent.kind === "kyc") {
    if (intent.value === "verified")
      return "Confirm the submitted identity evidence"
    if (intent.value === "rejected")
      return "Return the KYC record for correction"
    return "Move the KYC record back into review"
  }
  if (intent.value === "active") return "Restore active cooperative access"
  if (intent.value === "inactive")
    return "Pause membership without recording an exit"
  if (intent.value === "suspended")
    return "Restrict access while a review is completed"
  if (intent.value === "exited") return "Record the member as exited"
  return "Apply the next permitted lifecycle state"
}

function ReadinessValue({
  first = false,
  label,
  value,
}: {
  first?: boolean
  label: string
  value: string
}) {
  return (
    <View
      className={
        first
          ? "min-w-0 flex-1 gap-1 py-3 pr-3"
          : "min-w-0 flex-1 gap-1 px-3 py-3"
      }
    >
      <Text className="text-[10px] leading-4 font-bold text-muted-foreground uppercase">
        {label}
      </Text>
      <Text
        adjustsFontSizeToFit
        className="text-xs leading-4 font-bold text-foreground"
        minimumFontScale={0.8}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  )
}

function ChangeActionRow({
  intent,
  memberName,
  onPress,
}: {
  intent: ChangeIntent
  memberName: string
  onPress: () => void
}) {
  const destructive =
    intent.value === "inactive" ||
    intent.value === "suspended" ||
    intent.value === "exited" ||
    intent.value === "rejected"

  return (
    <Pressable
      accessibilityLabel={`${formatStatus(intent.value)} for ${memberName}`}
      accessibilityRole="button"
      className="min-h-14 flex-row items-center gap-3 border-t border-border py-3 active:bg-accent/40"
      haptic
      onPress={onPress}
    >
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          className={
            destructive
              ? "text-sm font-semibold text-destructive"
              : "text-sm font-semibold text-foreground"
          }
        >
          {formatStatus(intent.value)}
        </Text>
        <Text className="text-xs leading-5 text-muted-foreground">
          {getChangeDescription(intent)}
        </Text>
      </View>
      <Icon
        className={
          destructive
            ? "size-sm text-destructive"
            : "size-sm text-muted-foreground"
        }
        name="ChevronRight"
      />
    </Pressable>
  )
}

export function AdminMemberDetailScreen({
  memberId,
  qaState = null,
}: {
  memberId: string
  qaState?: MobileAdminLifecycleQaState | null
}) {
  const { profile } = useAuthContext()
  const colors = useColors()
  const router = useRouter()
  const [detail, setDetail] = useState<MobileAdminMemberDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manageVisible, setManageVisible] = useState(false)
  const [formVisible, setFormVisible] = useState(false)
  const [reviewVisible, setReviewVisible] = useState(false)
  const [successVisible, setSuccessVisible] = useState(false)
  const [notes, setNotes] = useState("")
  const [intent, setIntent] = useState<ChangeIntent | null>(null)
  const [successMessage, setSuccessMessage] = useState("")
  const showFormRef = useRef(false)
  const showReviewRef = useRef(false)
  const showSuccessRef = useRef(false)
  const reopenRef = useRef(false)
  const canUseDetail =
    qaState !== "denied" && canUseMobileFeatureData(profile, "admin")
  const stale = isMobileReadCacheStale(detail?.cache)
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const stats = useMemo(
    () =>
      (detail?.stats ?? []).map((metric) => ({
        detail: metric.detail,
        label: metric.label,
        value: formatMobileMetricValue(metric, currencyCode),
      })),
    [currencyCode, detail?.stats]
  )

  const loadDetail = useCallback(() => {
    let mounted = true
    if (!canUseDetail || !memberId) {
      setDetail(null)
      setError(null)
      setIsLoading(false)
      return () => {
        mounted = false
      }
    }
    if (qaState === "error") {
      setDetail(null)
      setError("Member detail is unavailable.")
      setIsLoading(false)
      return () => {
        mounted = false
      }
    }
    if (qaState === "loading") {
      setDetail(null)
      setError(null)
      setIsLoading(true)
      return () => {
        mounted = false
      }
    }
    setIsLoading(true)
    setError(null)
    void getAdminMemberDetail(memberId)
      .then(
        (response) =>
          mounted &&
          setDetail(presentAdminMemberDetailForQa(response, qaState))
      )
      .catch(() => mounted && setError("Member detail is unavailable."))
      .finally(() => mounted && setIsLoading(false))
    return () => {
      mounted = false
    }
  }, [canUseDetail, memberId, qaState])

  useEffect(() => loadDetail(), [loadDetail])

  function selectChange(nextIntent: ChangeIntent) {
    setIntent(nextIntent)
    setNotes("")
    setError(null)
    showFormRef.current = true
    setManageVisible(false)
  }

  function manageDismissed() {
    if (!showFormRef.current) return
    showFormRef.current = false
    setFormVisible(true)
  }

  function continueToReview() {
    if (notes.trim().length < 2) return
    if (stale) {
      setError("Refresh member detail before making a change.")
      return
    }
    showReviewRef.current = true
    setFormVisible(false)
  }

  function formDismissed() {
    if (!showReviewRef.current) return
    showReviewRef.current = false
    setReviewVisible(true)
  }

  async function confirmChange() {
    if (!intent || !detail?.member || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      if (intent.kind === "status") {
        await changeAdminMemberStatus({
          memberId: detail.member.id,
          reviewNotes: notes.trim(),
          status: intent.value,
        })
        setSuccessMessage(
          `${detail.member.fullName}'s status is now ${formatStatus(intent.value).toLowerCase()}.`
        )
      } else {
        await reviewAdminMemberKyc({
          kycReviewNotes: notes.trim(),
          kycStatus: intent.value,
          memberId: detail.member.id,
        })
        setSuccessMessage(
          `${detail.member.fullName}'s KYC is now ${formatStatus(intent.value).toLowerCase()}.`
        )
      }
      showSuccessRef.current = true
      setReviewVisible(false)
      setNotes("")
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Member change could not be completed."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function reviewDismissed() {
    if (showSuccessRef.current) {
      showSuccessRef.current = false
      loadDetail()
      setSuccessVisible(true)
      return
    }
    if (!reopenRef.current) return
    reopenRef.current = false
    setFormVisible(true)
  }

  const member = detail?.member
  const allowedStatus = member
    ? (statusTransitions[member.status as MobileAdminMemberStatus] ?? [])
    : []
  const allowedKyc = member
    ? (kycTransitions[member.kycStatus as MobileAdminMemberKycStatus] ?? [])
    : []
  const hasMemberActions = allowedStatus.length > 0 || allowedKyc.length > 0
  const statusToneClass =
    member?.status === "active"
      ? { dot: "bg-success", text: "text-success" }
      : member?.status === "pending"
        ? { dot: "bg-warn", text: "text-warn" }
        : { dot: "bg-destructive", text: "text-destructive" }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-10 pt-5"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          leading={<ScreenBackButton onPress={() => router.back()} />}
          title="Member detail"
        />

        {!canUseDetail ? (
          <EmptyState
            description="Use an authorized member-operations workspace to load this profile."
            icon="ShieldX"
            title="Member access required"
          />
        ) : null}
        <CachedReadBanner
          action="changing member status or KYC"
          cache={detail?.cache}
          label="member detail"
        />
        {canUseDetail && isLoading ? <LoadingSpinner /> : null}
        {canUseDetail && error ? (
          <View className="gap-3 border-l-2 border-destructive pl-3">
            <Text className="text-sm font-medium text-destructive">
              {error}
            </Text>
            {!detail ? (
              <Button
                className="h-11 self-start px-4"
                onPress={() => loadDetail()}
                variant="outline"
              >
                <Icon className="size-sm text-foreground" name="RefreshCw" />
                <Text>Retry</Text>
              </Button>
            ) : null}
          </View>
        ) : null}

        {canUseDetail && member ? (
          <>
            <View className="gap-4 border-b border-border pb-4">
              <View className="flex-row items-center gap-3">
                <View
                  accessibilityLabel={`${member.fullName} profile`}
                  className="h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10"
                >
                  <Text className="text-base font-extrabold text-primary">
                    {getInitials(member.fullName)}
                  </Text>
                </View>
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-xl leading-7 font-extrabold tracking-tight text-foreground">
                    {member.fullName}
                  </Text>
                  <Text className="text-xs leading-5 text-muted-foreground">
                    {member.memberNumber} · {formatStatus(member.memberType)}
                  </Text>
                  <Text
                    className="text-xs text-muted-foreground"
                    numberOfLines={1}
                  >
                    {member.linkedUserEmail ??
                      member.email ??
                      "No linked email"}
                  </Text>
                </View>
                <View
                  accessibilityLabel={formatStatus(member.status)}
                  className="flex-row items-center gap-1.5"
                >
                  <View
                    className={`h-2 w-2 rounded-full ${statusToneClass.dot}`}
                  />
                  <Text className={`text-xs font-bold ${statusToneClass.text}`}>
                    {formatStatus(member.status)}
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-muted-foreground">
                {member.deductionSourceName ?? "No collection source assigned"}
              </Text>
            </View>

            <View className="flex-row border-b border-border">
              <ReadinessValue
                first
                label="KYC"
                value={formatStatus(member.kycStatus)}
              />
              <View className="w-px bg-border" />
              <ReadinessValue
                label="Login"
                value={member.linkedUserEmail ? "Linked" : "Unlinked"}
              />
              <View className="w-px bg-border" />
              <ReadinessValue
                label="Joined"
                value={formatDate(member.joinedAt)}
              />
            </View>

            <Button
              accessibilityLabel={`Manage ${member.fullName}`}
              className="h-11"
              disabled={stale || !hasMemberActions}
              onPress={() => setManageVisible(true)}
            >
              <Icon
                className="size-sm text-primary-foreground"
                name="SlidersHorizontal"
              />
              <Text>
                {hasMemberActions
                  ? "Manage member"
                  : "No member changes available"}
              </Text>
            </Button>

            {stats.length ? (
              <View className="gap-2">
                <View className="flex-row items-baseline justify-between gap-3">
                  <Text className="text-lg font-extrabold text-foreground">
                    Financial position
                  </Text>
                  <Text className="text-xs font-semibold text-muted-foreground">
                    Posted records
                  </Text>
                </View>
                <View className="flex-row flex-wrap border-y border-border">
                  {stats.map((item, index) => (
                    <View
                      className={`w-1/2 gap-1 px-2 py-3 ${index % 2 === 0 ? "border-r border-border pl-0" : "pr-0"} ${index >= 2 ? "border-t border-border" : ""}`}
                      key={item.label}
                    >
                      <Text className="text-xs text-muted-foreground">
                        {item.label}
                      </Text>
                      <Text
                        adjustsFontSizeToFit
                        className="text-xl leading-7 font-extrabold tracking-tight text-foreground"
                        minimumFontScale={0.72}
                        numberOfLines={1}
                      >
                        {item.value}
                      </Text>
                      <Text className="text-[11px] leading-4 text-muted-foreground">
                        {item.detail}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View className="gap-5">
              <View className="flex-row items-baseline justify-between gap-3">
                <Text className="text-lg font-extrabold text-foreground">
                  Account record
                </Text>
                <Text className="text-xs font-semibold text-muted-foreground">
                  {detail?.sections.length ?? 0} sections
                </Text>
              </View>
              {detail?.sections.map((section) => (
                <View className="gap-2" key={section.key}>
                  <View className="flex-row items-baseline justify-between gap-3">
                    <Text className="text-base font-bold text-foreground">
                      {section.title}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {section.rows.length}{" "}
                      {section.rows.length === 1 ? "record" : "records"}
                    </Text>
                  </View>
                  {section.rows.length ? (
                    <View className="border-t border-border">
                      {section.rows.map((row) => {
                        const value =
                          row.value !== null && row.format
                            ? formatMobileMetricValue(
                                {
                                  detail: row.detail,
                                  format: row.format,
                                  key: row.key,
                                  label: row.label,
                                  value: row.value,
                                },
                                currencyCode
                              )
                            : row.status
                              ? formatStatus(row.status)
                              : null

                        return (
                          <View
                            className="min-h-14 flex-row items-start justify-between gap-4 border-b border-border py-3"
                            key={row.key}
                          >
                            <View className="min-w-0 flex-1 gap-1">
                              <Text className="text-sm font-semibold text-foreground">
                                {row.label}
                              </Text>
                              <Text className="text-xs leading-5 text-muted-foreground">
                                {row.detail}
                              </Text>
                            </View>
                            {value ? (
                              <Text
                                adjustsFontSizeToFit
                                className="max-w-[42%] text-right text-sm font-bold text-foreground"
                                minimumFontScale={0.75}
                                numberOfLines={2}
                              >
                                {value}
                              </Text>
                            ) : null}
                          </View>
                        )
                      })}
                    </View>
                  ) : (
                    <Text className="border-t border-border py-3 text-xs leading-5 text-muted-foreground">
                      {section.emptyState}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </>
        ) : !isLoading && canUseDetail && !error ? (
          <EmptyState
            description="This member was not found in the signed cooperative workspace."
            icon="UserRoundX"
            title="Member not found"
          />
        ) : null}
      </ScrollView>

      <FloatingBottomSheet
        accessibilityLabel={
          member ? `Manage ${member.fullName}` : "Manage member"
        }
        hideHandle
        onClose={() => setManageVisible(false)}
        onDismissed={manageDismissed}
        presentation="compact"
        scrollable="auto"
        visible={manageVisible}
      >
        <View className="gap-4 px-5 pt-5 pb-6">
          <View className="flex-row items-center gap-3">
            <View className="min-w-0 flex-1 gap-1">
              <Text
                accessibilityRole="header"
                className="text-xl font-extrabold tracking-tight text-foreground"
              >
                Manage member
              </Text>
              <Text className="text-xs leading-5 text-muted-foreground">
                Choose one permitted, audited change for{" "}
                {member?.fullName ?? "this member"}.
              </Text>
            </View>
            <Button
              accessibilityLabel="Close member actions"
              onPress={() => setManageVisible(false)}
              size="icon"
              variant="ghost"
            >
              <Icon className="size-base text-foreground" name="X" />
            </Button>
          </View>
          {allowedStatus.length ? (
            <View>
              <Text className="pb-2 text-sm font-bold text-foreground">
                Membership status
              </Text>
              {allowedStatus.map((value) => (
                <ChangeActionRow
                  intent={{ kind: "status", value }}
                  key={value}
                  memberName={member?.fullName ?? "member"}
                  onPress={() => selectChange({ kind: "status", value })}
                />
              ))}
            </View>
          ) : null}
          {allowedKyc.length ? (
            <View>
              <Text className="pb-2 text-sm font-bold text-foreground">
                KYC review
              </Text>
              {allowedKyc.map((value) => (
                <ChangeActionRow
                  intent={{ kind: "kyc", value }}
                  key={value}
                  memberName={member?.fullName ?? "member"}
                  onPress={() => selectChange({ kind: "kyc", value })}
                />
              ))}
            </View>
          ) : null}
        </View>
      </FloatingBottomSheet>

      <CompactFormSheet
        dirty={Boolean(notes.trim())}
        footer={
          <View className="flex-row items-center gap-3 px-5 pt-3 pb-5">
            <DevQuickFill
              label="Quick fill member review"
              onPress={() =>
                setNotes(mobileDevQuickFill.adminMemberReview.kycNotes)
              }
              placement="footer"
              portal={false}
            />
            <Button
              className="h-12 flex-1"
              disabled={notes.trim().length < 2 || stale}
              onPress={continueToReview}
            >
              <Text>Continue to confirmation</Text>
            </Button>
          </View>
        }
        isSubmitting={isSubmitting}
        onClose={() => setFormVisible(false)}
        onDismissed={formDismissed}
        title={
          intent?.kind === "status"
            ? `Change status to ${formatStatus(intent.value)}`
            : `Set KYC to ${formatStatus(intent?.value ?? "pending")}`
        }
        visible={formVisible}
      >
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Review notes
          </Text>
          <Textarea
            accessibilityLabel="Member review notes"
            onChangeText={setNotes}
            placeholder="Required reason and review evidence"
            value={notes}
          />
          <Text className="text-xs leading-5 text-muted-foreground">
            This evidence is tenant scoped and retained with the audited
            command.
          </Text>
        </View>
      </CompactFormSheet>

      <SubmissionReviewSheet
        confirmLabel="Confirm change"
        description="This action is tenant scoped, audited, and checked against the current server state."
        isSubmitting={isSubmitting}
        onClose={() => {
          reopenRef.current = true
          setReviewVisible(false)
        }}
        onConfirm={confirmChange}
        onDismissed={reviewDismissed}
        rows={
          intent && member
            ? [
                {
                  detail: notes,
                  icon:
                    intent.kind === "status" ? "UserRoundCheck" : "ShieldCheck",
                  label: member.fullName,
                  value: formatStatus(intent.value),
                },
              ]
            : []
        }
        title="Confirm member change"
        visible={reviewVisible}
      />
      <SubmissionSuccessSheet
        description={successMessage}
        onClose={() => setSuccessVisible(false)}
        title="Member updated"
        visible={successVisible}
      />
    </SafeArea>
  )
}
