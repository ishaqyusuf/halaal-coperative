import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { ProfileHeader } from "@/components/app/profile-header"
import { SectionCard } from "@/components/app/section-card"
import { StatCard } from "@/components/app/stat-card"
import { VirtualizedCardList } from "@/components/app/virtualized-card-list"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { adminExceptions, adminStats } from "@/data/mobile-template"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import {
  getMobileAdminOverview,
  replyMobileAdminSupport,
  updateMobileAdminSupportStatus,
  type MobileAdminOverview,
  type MobileSupportCase,
} from "@/lib/mobile-home-api"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { isMockSessionToken } from "@/lib/session-store"
import { useEffect, useMemo, useState } from "react"
import { ScrollView, View } from "react-native"

function formatDate(value: string) {
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

function formatMessageAuthor(input: {
  authorName: string | null
  authorType: string
}) {
  if (input.authorName) return input.authorName

  return formatStatus(input.authorType)
}

function SupportCaseCard({
  actionState,
  isActionBlocked,
  isFirst,
  onCancelReply,
  onOpenReply,
  onReply,
  onUpdateStatus,
  replyCaseId,
  replyMessage,
  setReplyMessage,
  supportCase,
}: {
  actionState: "idle" | "pending"
  isActionBlocked: boolean
  isFirst: boolean
  onCancelReply: () => void
  onOpenReply: (supportCase: MobileSupportCase) => void
  onReply: (supportCase: MobileSupportCase) => void
  onUpdateStatus: (supportCase: MobileSupportCase) => void
  replyCaseId: string | null
  replyMessage: string
  setReplyMessage: (value: string) => void
  supportCase: MobileSupportCase
}) {
  const canMarkInProgress = supportCase.status !== "in_progress"
  const isReplying = replyCaseId === supportCase.id

  return (
    <View className={isFirst ? "gap-2" : "gap-2 border-t border-border pt-3"}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-sm font-semibold text-foreground">
            {supportCase.subject}
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {supportCase.detail}
          </Text>
        </View>
        <Text className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-foreground">
          {formatStatus(supportCase.priority)}
        </Text>
      </View>
      <Text className="text-xs font-medium text-muted-foreground">
        {formatStatus(supportCase.status)} -{" "}
        {formatStatus(supportCase.category)} -{" "}
        {formatDate(supportCase.lastActivityAt)}
      </Text>
      {supportCase.recentMessages.length ? (
        <View className="gap-2 border-l-2 border-border pl-3">
          {supportCase.recentMessages.map((message) => (
            <View className="gap-1" key={message.id}>
              <Text className="text-xs font-medium text-muted-foreground">
                {formatMessageAuthor(message)} - {formatDate(message.createdAt)}
              </Text>
              <Text className="text-sm leading-5 text-foreground">
                {message.message}
              </Text>
              {message.attachmentUrl ? (
                <Text className="text-xs text-muted-foreground">
                  Attachment available
                </Text>
              ) : null}
            </View>
          ))}
          {supportCase.messageCount > supportCase.recentMessages.length ? (
            <Text className="text-xs text-muted-foreground">
              Showing latest {supportCase.recentMessages.length} of{" "}
              {supportCase.messageCount} messages
            </Text>
          ) : null}
        </View>
      ) : null}
      {isReplying ? (
        <View className="gap-2 pt-1">
          <Textarea
            editable={actionState !== "pending"}
            onChangeText={setReplyMessage}
            placeholder="Write a staff reply"
            value={replyMessage}
          />
          <View className="flex-row gap-2">
            <Button
              className="h-10 flex-1"
              disabled={
                replyMessage.trim().length < 2 ||
                isActionBlocked ||
                actionState === "pending"
              }
              onPress={() => onReply(supportCase)}
            >
              <Icon name="Send" className="size-base text-primary-foreground" />
              <Text>
                {actionState === "pending" ? "Sending" : "Send reply"}
              </Text>
            </Button>
            <Button
              className="h-10 flex-1"
              disabled={isActionBlocked || actionState === "pending"}
              onPress={onCancelReply}
              variant="outline"
            >
              <Text>Cancel</Text>
            </Button>
          </View>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          <Button
            className="self-start"
            disabled={isActionBlocked || actionState === "pending"}
            onPress={() => onOpenReply(supportCase)}
            size="sm"
            variant="outline"
          >
            <Icon name="MessageSquareReply" className="size-sm" />
            <Text>Reply</Text>
          </Button>
          {canMarkInProgress ? (
            <Button
              className="self-start"
              disabled={isActionBlocked || actionState === "pending"}
              onPress={() => onUpdateStatus(supportCase)}
              size="sm"
              variant="outline"
            >
              <Text>
                {actionState === "pending" ? "Updating..." : "Mark in progress"}
              </Text>
            </Button>
          ) : null}
        </View>
      )}
    </View>
  )
}

export function AdminHomeScreen() {
  const { profile } = useAuthContext()
  const colors = useColors()
  const [overview, setOverview] = useState<MobileAdminOverview | null>(null)
  const [actionKey, setActionKey] = useState<string | null>(null)
  const [replyCaseId, setReplyCaseId] = useState<string | null>(null)
  const [replyMessage, setReplyMessage] = useState("")
  const [isLoadingOverview, setIsLoadingOverview] = useState(false)
  const [overviewError, setOverviewError] = useState<string | null>(null)
  const canUseServerOverview = Boolean(
    profile?.token && !isMockSessionToken(profile.token)
  )
  const stats = useMemo(
    () =>
      overview?.stats.map((metric) => ({
        detail: metric.detail,
        label: metric.label,
        value: formatMobileMetricValue(
          metric,
          profile?.tenant.currencyCode ?? "NGN"
        ),
      })) ?? adminStats,
    [overview?.stats, profile?.tenant.currencyCode]
  )
  const exceptions = useMemo(
    () =>
      overview?.actionQueue.map((item) => ({
        detail: item.detail,
        label: item.label,
        value: `${item.count} waiting`,
      })) ?? adminExceptions,
    [overview?.actionQueue]
  )
  const overviewCache = overview?.cache
  const hasStaleOverview = isMobileReadCacheStale(overviewCache)
  const adminHomeDraft = useMemo(
    () => ({
      replyCaseId,
      replyMessage,
    }),
    [replyCaseId, replyMessage]
  )
  const clearAdminHomeDraft = useMobileFormDraft({
    enabled: canUseServerOverview,
    key: "admin.home.support",
    onHydrate: (draft) => {
      setReplyCaseId(draft.replyCaseId)
      setReplyMessage(draft.replyMessage)
    },
    value: adminHomeDraft,
  })

  useEffect(() => {
    let mounted = true

    if (!canUseServerOverview) {
      setOverview(null)
      setOverviewError(null)
      setIsLoadingOverview(false)
      return
    }

    setIsLoadingOverview(true)
    setOverviewError(null)

    void getMobileAdminOverview()
      .then((response) => {
        if (mounted) {
          setOverview(response)
        }
      })
      .catch(() => {
        if (mounted) {
          setOverviewError("Admin overview is unavailable.")
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingOverview(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [canUseServerOverview, profile?.token])

  if (!profile) return null

  async function refreshOverview() {
    const response = await getMobileAdminOverview()
    setOverview(response)
  }

  async function markSupportInProgress(supportCase: MobileSupportCase) {
    if (hasStaleOverview) {
      setOverviewError("Refresh admin data before updating a support case.")
      return
    }

    setActionKey(`${supportCase.id}:status`)
    setOverviewError(null)

    try {
      await updateMobileAdminSupportStatus({
        status: "in_progress",
        supportCaseId: supportCase.id,
      })
      await refreshOverview()
    } catch (error) {
      setOverviewError(
        error instanceof Error
          ? error.message
          : "Support case could not be updated."
      )
    } finally {
      setActionKey(null)
    }
  }

  async function sendSupportReply(supportCase: MobileSupportCase) {
    if (replyMessage.trim().length < 2) return
    if (hasStaleOverview) {
      setOverviewError("Refresh admin data before sending a support reply.")
      return
    }

    setActionKey(`${supportCase.id}:reply`)
    setOverviewError(null)

    try {
      await replyMobileAdminSupport({
        message: replyMessage.trim(),
        supportCaseId: supportCase.id,
      })
      await clearAdminHomeDraft()
      setReplyCaseId(null)
      setReplyMessage("")
      await refreshOverview()
    } catch (error) {
      setOverviewError(
        error instanceof Error
          ? error.message
          : "Support reply could not be sent."
      )
    } finally {
      setActionKey(null)
    }
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-4">
        <ProfileHeader profile={profile} />

        <CachedReadBanner cache={overviewCache} label="admin data" />

        <View className="flex-row flex-wrap gap-3">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </View>

        <SectionCard icon="CircleAlert" title="Admin attention">
          {isLoadingOverview ? (
            <LoadingSpinner />
          ) : (
            <View className="gap-3">
              {overviewError ? (
                <Text className="text-sm font-medium text-destructive">
                  {overviewError}
                </Text>
              ) : null}
              {exceptions.map((item) => (
                <View
                  className="flex-row gap-3 rounded-md bg-secondary p-3"
                  key={item.label}
                >
                  <Icon name="ArrowUpRight" className="size-base text-accent" />
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold text-foreground">
                      {item.label}
                    </Text>
                    <Text className="text-sm font-medium text-foreground">
                      {item.value}
                    </Text>
                    <Text className="text-xs leading-5 text-muted-foreground">
                      {item.detail}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </SectionCard>

        <SectionCard icon="MessagesSquare" title="Support cases">
          {isLoadingOverview ? (
            <LoadingSpinner />
          ) : (
            <VirtualizedCardList
              data={overview?.supportCases ?? []}
              empty={
                <Text className="text-sm leading-5 text-muted-foreground">
                  No open support cases are visible in the mobile overview.
                </Text>
              }
              estimatedItemSize={220}
              keyExtractor={(supportCase) => supportCase.id}
              maxHeight={620}
              renderItem={({ index, item: supportCase }) => (
                <SupportCaseCard
                  actionState={
                    actionKey?.startsWith(`${supportCase.id}:`)
                      ? "pending"
                      : "idle"
                  }
                  isFirst={index === 0}
                  isActionBlocked={hasStaleOverview}
                  key={supportCase.id}
                  onCancelReply={() => {
                    setReplyCaseId(null)
                    setReplyMessage("")
                  }}
                  onOpenReply={(selectedCase) => {
                    setReplyCaseId(selectedCase.id)
                    setReplyMessage("")
                    setOverviewError(null)
                  }}
                  onReply={sendSupportReply}
                  onUpdateStatus={markSupportInProgress}
                  replyCaseId={replyCaseId}
                  replyMessage={replyMessage}
                  setReplyMessage={setReplyMessage}
                  supportCase={supportCase}
                />
              )}
            />
          )}
        </SectionCard>

        <SectionCard icon="TriangleAlert" title="Setup warnings">
          {isLoadingOverview ? (
            <LoadingSpinner />
          ) : overview?.warnings.length ? (
            <View className="gap-3">
              {overview.warnings.map((warning) => (
                <View
                  className="flex-row gap-3 rounded-md bg-secondary p-3"
                  key={warning.key}
                >
                  <Icon
                    name="TriangleAlert"
                    className="size-base text-accent"
                  />
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold text-foreground">
                      {warning.label}
                    </Text>
                    <Text className="text-xs leading-5 text-muted-foreground">
                      Complete setup on the dashboard before relying on this
                      workspace for live operations.
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-sm leading-5 text-muted-foreground">
              No setup warnings are visible in the mobile overview.
            </Text>
          )}
        </SectionCard>
      </ScrollView>
    </SafeArea>
  )
}
