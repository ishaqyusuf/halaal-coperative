import { AppSheet } from "@/components/app/app-sheet"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenHeaderButton, ScreenShell } from "@/components/app/screen-shell"
import { ListCard, RecordRow, TintedAvatar } from "@/components/ui/list-card"
import { ListSkeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { useAppQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { formatDateOnly } from "@/lib/date-only"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { useIsOnline } from "@/lib/online-status"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { useRouter } from "expo-router"
import { type ReactNode, useRef, useState } from "react"
import { View } from "react-native"
import {
  changeAdminMemberStatus,
  getAdminMemberDetail,
  reviewAdminMemberKyc,
} from "../api/admin-member-lifecycle-api"
import { MemberChangeSheet } from "../components/member-change-sheet"
import { presentAdminMemberDetailForQa } from "../model/admin-member-lifecycle-qa"
import type {
  MobileAdminLifecycleQaState,
  MobileAdminMemberKycStatus,
  MobileAdminMemberStatus,
} from "../model/admin-member-lifecycle-types"
import {
  memberLabel,
  memberMeta,
  memberPill,
} from "../model/member-directory-presentation"
import {
  memberDirectoryKeys,
  useRefreshMemberDirectory,
} from "../model/member-directory-queries"

type ChangeIntent =
  | { kind: "status"; value: MobileAdminMemberStatus }
  | { kind: "kyc"; value: MobileAdminMemberKycStatus }

const STATUS_TRANSITIONS: Record<string, readonly MobileAdminMemberStatus[]> = {
  active: ["inactive", "suspended", "exited"],
  exited: [],
  inactive: ["active", "suspended", "exited"],
  pending: ["active", "inactive"],
  suspended: ["active", "inactive", "exited"],
}
const KYC_TRANSITIONS: Record<string, readonly MobileAdminMemberKycStatus[]> = {
  not_started: ["pending"],
  pending: ["verified", "rejected"],
  rejected: ["pending"],
  verified: ["pending"],
}
const STATUS_ACTIONS = {
  active: {
    label: "Reactivate",
    description: "Restore active cooperative access",
    icon: "UserRoundCheck",
  },
  inactive: {
    label: "Mark inactive",
    description: "Pause membership without recording an exit",
    icon: "CirclePause",
  },
  suspended: {
    label: "Suspend",
    description: "Restrict access while a review is completed",
    icon: "Ban",
  },
  exited: {
    label: "Record exit",
    description: "Record the member as exited. This can’t be changed back.",
    icon: "LogOut",
  },
  pending: {
    label: "Mark pending",
    description: "Return to pending membership",
    icon: "Clock",
  },
}
const KYC_ACTIONS = {
  not_started: {
    label: "Reset KYC",
    description: "Return KYC to its initial state",
    icon: "History",
  },
  pending: {
    label: "Move KYC to review",
    description: "Open the KYC record for review",
    icon: "History",
  },
  verified: {
    label: "Verify KYC",
    description: "Confirm the submitted identity evidence",
    icon: "ShieldCheck",
  },
  rejected: {
    label: "Reject KYC",
    description: "Return the KYC record for correction",
    icon: "ShieldX",
  },
}

function presentAction(change: ChangeIntent, status: string, kyc: string) {
  if (change.kind === "status") {
    if (change.value === "active" && status === "pending") {
      return { ...STATUS_ACTIONS.active, label: "Activate membership" }
    }
    return STATUS_ACTIONS[change.value]
  }
  if (change.value === "pending" && kyc === "not_started") {
    return { ...KYC_ACTIONS.pending, label: "Start KYC review" }
  }
  return KYC_ACTIONS[change.value]
}

function DetailGroup({
  children,
  title,
  trailing,
}: {
  children: ReactNode
  title: string
  trailing?: string
}) {
  return (
    <View className="gap-[8px]">
      <View className="flex-row items-baseline justify-between px-[4px]">
        <Text accessibilityRole="header" variant="section">
          {title}
        </Text>
        {trailing ? (
          <Text className="text-muted-foreground" variant="caption">
            {trailing}
          </Text>
        ) : null}
      </View>
      <ListCard inset={false}>{children}</ListCard>
    </View>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View className="min-h-[48px] flex-row items-center justify-between gap-[12px] px-[14px] py-[10px]">
      <Text className="flex-shrink text-muted-foreground" variant="small">
        {label}
      </Text>
      {typeof value === "string" ? (
        <Text className="max-w-[62%] text-right font-semibold" variant="body">
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
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
  const router = useRouter()
  const online = useIsOnline()
  const refreshDirectory = useRefreshMemberDirectory()
  const [manage, setManage] = useState(false)
  const [change, setChange] = useState<ChangeIntent | null>(null)
  const nextChange = useRef<ChangeIntent | null>(null)
  const canUseDetail =
    Boolean(memberId) &&
    qaState !== "denied" &&
    canUseMobileFeatureData(profile, "admin")
  const enabled = canUseDetail && qaState !== "error" && qaState !== "loading"
  const query = useAppQuery({
    enabled,
    networkMode: "always",
    placeholderData: undefined,
    queryKey: memberDirectoryKeys().detail(memberId),
    queryFn: () => getAdminMemberDetail(memberId),
  })

  const detail = query.data
    ? presentAdminMemberDetailForQa(query.data, qaState)
    : null
  const member =
    canUseDetail && qaState !== "error" && qaState !== "loading"
      ? detail?.member
      : null
  const offline = !online || qaState === "offline"
  const saved = isMobileReadCacheStale(detail?.cache)
  const error =
    qaState === "error" || qaState === "refresh-error" || query.isError
  const blocked = offline || saved || error
  const loading = qaState === "loading" || (enabled && query.isPending)
  const statusActions =
    member && member.status !== "exited"
      ? (STATUS_TRANSITIONS[member.status] ?? [])
      : []
  const kycActions =
    member && member.status !== "exited"
      ? (KYC_TRANSITIONS[member.kycStatus] ?? [])
      : []
  const canManage = statusActions.length + kycActions.length > 0
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const documents =
    detail?.sections.find(({ key }) => key === "documents")?.rows ?? []
  const changes = detail?.recentChanges ?? []
  const lastKyc = changes.find(({ kind }) => kind === "kyc")

  function back() {
    if (router.canGoBack()) router.back()
    else router.replace("/(admin)/(tabs)/members")
  }

  function refresh() {
    if (enabled && !offline) void query.refetch()
  }

  function chooseChange(intent: ChangeIntent) {
    nextChange.current = intent
    setManage(false)
  }

  function actionRow(intent: ChangeIntent) {
    if (!member) return null
    const action = presentAction(intent, member.status, member.kycStatus)
    return (
      <RecordRow
        avatarIcon={action.icon}
        chevron
        compact
        key={intent.value}
        meta={action.description}
        onPress={() => chooseChange(intent)}
        title={action.label}
      />
    )
  }

  const metrics = [
    ["savings", "Savings"],
    ["financing", "Financing"],
    ["share-capital", "Share capital"],
    ["receipt-pending-review", "Receipts to review"],
  ].map(([key, label]) => {
    const metric =
      detail?.stats.find((item) => item.key === key) ??
      detail?.sections
        .flatMap(({ rows }) => rows)
        .find((row) => row.key === key)
    const format = key === "receipt-pending-review" ? "count" : "currency"
    return {
      key,
      label,
      value: formatMobileMetricValue(
        { key, label, detail: "", format, value: metric?.value ?? 0 },
        currencyCode
      ),
    }
  })
  const selection =
    member && change
      ? presentAction(change, member.status, member.kycStatus)
      : null

  return (
    <>
      <ScreenShell
        back={back}
        headerActions={
          canManage && !blocked ? (
            <ScreenHeaderButton
              accessibilityLabel="Manage member"
              icon="Ellipsis"
              onPress={() => setManage(true)}
            />
          ) : undefined
        }
        onRefresh={enabled && !offline ? refresh : undefined}
        refreshing={query.isRefetching}
        testID="admin-member-detail-screen"
      >
        {!canUseDetail ? (
          <EmptyState
            description="Ask a workspace owner for permission to view member records."
            icon="ShieldX"
            title="Member access required"
          />
        ) : null}
        {loading ? <ListSkeleton rows={6} /> : null}
        {canUseDetail && error && !member ? (
          <EmptyState
            action={
              !offline ? { label: "Try again", onPress: refresh } : undefined
            }
            description="Check your connection and try again."
            icon="CircleAlert"
            title="Couldn’t load this member"
            tone="error"
          />
        ) : null}
        {canUseDetail && !loading && !error && !member ? (
          <EmptyState
            action={{ label: "Back to members", onPress: back }}
            description="This member wasn’t found in the current workspace."
            icon="UserRoundX"
            title="Member not found"
          />
        ) : null}
        {member ? (
          <>
            {blocked ? (
              <StatusBanner
                kind={offline ? "offline" : "stale"}
                title={
                  offline ? "You’re offline" : "Showing saved member details"
                }
                description={
                  offline
                    ? "Changes are paused until you reconnect."
                    : "Refresh this member’s details before making changes."
                }
                onRetry={!offline ? refresh : undefined}
              />
            ) : null}
            <ListCard>
              <View className="flex-row items-center gap-[14px] p-[16px]">
                <TintedAvatar name={member.fullName} size={56} />
                <View className="min-w-0 flex-1 gap-[3px]">
                  <Text accessibilityRole="header" variant="title">
                    {member.fullName}
                  </Text>
                  <Text className="text-muted-foreground" variant="small">
                    {memberMeta(member)}
                  </Text>
                  <View className="mt-[4px] flex-row flex-wrap gap-[6px]">
                    <StatusPill {...memberPill(member.status)} />
                    <StatusPill {...memberPill(member.kycStatus, true)} />
                  </View>
                </View>
              </View>
            </ListCard>
            {member.status === "exited" ? (
              <StatusBanner
                kind="info"
                title="Membership ended"
                description="The member’s records are kept for reporting."
              />
            ) : null}
            <DetailGroup title="KYC and compliance">
              <DetailRow
                label="KYC"
                value={<StatusPill {...memberPill(member.kycStatus, true)} />}
              />
              {documents.length ? (
                documents.map((document) => (
                  <DetailRow
                    key={document.key}
                    label={document.label}
                    value={
                      <StatusPill
                        {...memberPill(
                          document.status?.toLowerCase() ?? "pending"
                        )}
                      />
                    }
                  />
                ))
              ) : (
                <DetailRow label="Documents" value="None uploaded" />
              )}
              {lastKyc ? (
                <DetailRow
                  label="Last KYC change"
                  value={
                    formatDateOnly(lastKyc.occurredAt.slice(0, 10)) +
                    (lastKyc.actor ? ` · ${lastKyc.actor}` : "")
                  }
                />
              ) : null}
              <DetailRow
                label="App login"
                value={member.linkedUserEmail ? "Linked" : "Not linked"}
              />
            </DetailGroup>
            <DetailGroup title="Membership">
              <DetailRow
                label="Joined"
                value={formatDateOnly(member.joinedAt.slice(0, 10))}
              />
              <DetailRow
                label="Collection source"
                value={member.deductionSourceName ?? "Not set"}
              />
              <DetailRow
                label="Monthly commitment"
                value={
                  member.activeMonthlyCommitment === null
                    ? "Not set"
                    : formatMobileMetricValue(
                        {
                          format: "currency",
                          key: "commitment",
                          label: "",
                          detail: "",
                          value: member.activeMonthlyCommitment,
                        },
                        currencyCode
                      )
                }
              />
              <DetailRow
                label="Phone"
                value={member.phoneNumber ?? "Not added"}
              />
              <DetailRow label="Email" value={member.email ?? "Not added"} />
              {member.exitedAt ? (
                <DetailRow
                  label="Exited"
                  value={formatDateOnly(member.exitedAt.slice(0, 10))}
                />
              ) : null}
            </DetailGroup>
            <DetailGroup title="Financial position" trailing="Posted records">
              {metrics.map((metric) => (
                <DetailRow
                  key={metric.key}
                  label={metric.label}
                  value={metric.value}
                />
              ))}
              {detail?.stats
                .filter(({ key }) => key.startsWith("approved-"))
                .map((metric) => (
                  <DetailRow
                    key={metric.key}
                    label={metric.label}
                    value={formatMobileMetricValue(metric, currencyCode)}
                  />
                ))}
            </DetailGroup>
            <DetailGroup title="Recent changes">
              {changes.length ? (
                changes.map((item) => {
                  const value = memberLabel(item.value ?? "")
                  const title =
                    item.kind === "created"
                      ? "Member added"
                      : item.kind === "kyc"
                        ? `KYC changed to ${value.toLowerCase()}`
                        : `Status changed to ${value.toLowerCase()}`
                  return (
                    <RecordRow
                      avatarIcon={
                        item.kind === "kyc"
                          ? "ShieldCheck"
                          : item.kind === "created"
                            ? "UserRoundPlus"
                            : "History"
                      }
                      compact
                      key={item.id}
                      meta={[
                        formatDateOnly(item.occurredAt.slice(0, 10)),
                        item.actor,
                        item.notes,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      title={title}
                    />
                  )
                })
              ) : (
                <DetailRow label="No recent changes" value={null} />
              )}
            </DetailGroup>
          </>
        ) : null}
      </ScreenShell>

      {member ? (
        <AppSheet
          onClose={() => setManage(false)}
          onDismissed={() => {
            setChange(nextChange.current)
            nextChange.current = null
          }}
          title="Manage member"
          visible={manage && !blocked}
        >
          {statusActions.length ? (
            <DetailGroup
              title="Membership status"
              trailing={`Now ${memberLabel(member.status).toLowerCase()}`}
            >
              {statusActions.map((value) =>
                actionRow({ kind: "status", value })
              )}
            </DetailGroup>
          ) : null}
          {kycActions.length ? (
            <DetailGroup
              title="KYC"
              trailing={`Now ${memberLabel(member.kycStatus).toLowerCase()}`}
            >
              {kycActions.map((value) => actionRow({ kind: "kyc", value }))}
            </DetailGroup>
          ) : null}
        </AppSheet>
      ) : null}

      {member && change && selection ? (
        <MemberChangeSheet
          blocked={blocked}
          danger={["exited", "suspended", "rejected"].includes(change.value)}
          from={memberLabel(
            change.kind === "kyc" ? member.kycStatus : member.status
          )}
          initialValue={change.value}
          memberName={member.fullName}
          memberNumber={member.memberNumber}
          onClose={() => setChange(null)}
          onSubmit={async (_, notes) => {
            if (change.kind === "kyc") {
              await reviewAdminMemberKyc({
                memberId,
                kycStatus: change.value,
                kycReviewNotes: notes,
              })
            } else {
              await changeAdminMemberStatus({
                memberId,
                status: change.value,
                reviewNotes: notes,
              })
            }
            refreshDirectory(memberId)
          }}
          options={[{ value: change.value, label: selection.label }]}
          quickFillKind="kycNotes"
          title={selection.label}
        />
      ) : null}
    </>
  )
}
