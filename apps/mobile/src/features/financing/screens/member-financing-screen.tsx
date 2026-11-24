import { EmptyState } from "@/components/app/empty-state"
import { HeroBackButton, ScreenHero, ScreenShell } from "@/components/app/screen-shell"
import { ListSkeleton, Skeleton, SkeletonGroup } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ListCard, RecordRow } from "@/components/ui/list-card"
import { Text } from "@/components/ui/text"
import { statusToneFor } from "@/components/ui/status-pill"
import { NotificationDestinationNotice } from "@/features/notifications/public/notification-destination-notice"
import {
  appQueryKey,
  useAppQuery,
  useInvalidateAppQueries,
} from "@/hooks/use-app-query"
import { useIsOnline } from "@/lib/online-status"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { useState } from "react"
import { View } from "react-native"
import { getMemberFinancingRequestDetail } from "../api/member-financing-api"
import {
  useFinancingScope,
  useFinancingSnapshot,
} from "../api/use-member-financing-queries"
import {
  FinanceHeading,
  FinanceNotice,
  FinanceProductIcon,
  FinanceRequestDetail,
  FinanceRequestRow,
  FinancingRestricted,
  formatFinanceDate,
  formatFinanceMoney,
  isOpenRequest,
} from "../components/financing-records"
import { FinancingRequestForm } from "../components/financing-request-form"
import { buildMemberFinancingPresentation } from "../model/member-financing-presentation"
import type {
  MobileFinancingRequest,
  MobileMemberFinancing,
} from "../model/member-financing-types"

export function FinancingScreen({
  initialEntityId,
}: {
  initialEntityId: string | null
}) {
  const scope = useFinancingScope()
  return (
    <ScopedFinancingScreen
      initialEntityId={initialEntityId}
      key={JSON.stringify(scope.scope)}
    />
  )
}

function ScopedFinancingScreen({
  initialEntityId,
}: {
  initialEntityId: string | null
}) {
  const router = useRouter()
  const online = useIsOnline()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateAppQueries()
  const financing = useFinancingScope()
  const snapshot = useFinancingSnapshot(financing)
  const { currency, enabled, requestsKey, scope, snapshotKey } = financing
  const data = snapshot.data
  const available = data?.state === "available" ? data : null
  const stale = available?.cache?.status === "stale" || snapshot.isError
  const [openedRequest, setOpenedRequest] =
    useState<MobileFinancingRequest | null>(null)
  const [dismissedId, setDismissedId] = useState<string | null>(null)
  const notificationId =
    initialEntityId && initialEntityId !== dismissedId ? initialEntityId : null
  const existing = notificationId
    ? available?.requests.find((request) => request.id === notificationId)
    : undefined
  const notification = useAppQuery({
    enabled: Boolean(
      enabled && notificationId && !existing && !snapshot.isPending
    ),
    placeholderData: undefined,
    queryFn: () => getMemberFinancingRequestDetail(notificationId!),
    queryKey: appQueryKey("member.financing.request", ...scope, notificationId),
  })
  const selected = openedRequest ?? existing ?? notification.data ?? null
  const destinationUnavailable =
    notificationId &&
    !openedRequest &&
    !existing &&
    (notification.isError || (notification.isSuccess && !notification.data))
  const presentation = available
    ? buildMemberFinancingPresentation(available.section, currency)
    : null
  const openRequests = available?.requests.filter(isOpenRequest) ?? []
  const pastRequests =
    available?.requests.filter((request) => !isOpenRequest(request)) ?? []
  const activity =
    presentation?.activeRows.filter((row) => row.key !== "financing-empty") ??
    []
  const money = (value: number) => formatFinanceMoney(value, currency)
  const showRequests = () => router.push("/financing-requests")
  const refresh = () => void snapshot.refetch()
  const restricted = !enabled || data?.state === "member_profile_missing"

  function created(request: MobileFinancingRequest) {
    queryClient.setQueryData<MobileMemberFinancing>(snapshotKey, (current) =>
      current
        ? {
            ...current,
            requests: [
              request,
              ...current.requests.filter((item) => item.id !== request.id),
            ],
          }
        : undefined
    )
    void invalidate(snapshotKey, requestsKey)
  }

  return (
    <FinancingRequestForm
      currency={currency}
      enabled={enabled}
      online={online}
      onCreated={created}
      onView={setOpenedRequest}
      products={available?.products ?? []}
      scope={scope}
      stale={stale}
      trigger={({ hasDraft, open }) => (
        <ScreenShell
          hero={
            <ScreenHero className="gap-4">
              <View className="min-h-[44px] flex-row items-center gap-[12px]">
                {/* Pushed from home (T31: no tabs for members). */}
                <HeroBackButton />
                <Text
                  accessibilityRole="header"
                  className="min-w-0 flex-1 text-hero-foreground"
                  variant="screenTitle"
                >
                  Finance
                </Text>
              </View>
              {snapshot.isPending && enabled ? (
                <SkeletonGroup>
                  <Skeleton className="h-[42px] w-[220px]" />
                  <Skeleton className="h-[64px] w-full" />
                </SkeletonGroup>
              ) : presentation ? (
                <>
                  <View className="gap-1">
                    <Text className="text-hero-foreground/80" variant="small">
                      Outstanding
                    </Text>
                    <Text
                      className="text-hero-foreground"
                      tabular
                      variant="hero"
                    >
                      {presentation.outstanding?.value ?? money(0)}
                    </Text>
                  </View>
                  <View className="bg-hero-end/60 flex-row rounded-[18px] px-4 py-3">
                    <HeroStat
                      label="Monthly"
                      value={presentation.monthlyServicing?.value ?? "—"}
                    />
                    <View className="bg-hero-foreground/20 mx-4 w-px" />
                    <HeroStat
                      label="Next due"
                      value={
                        available?.nextDueAt
                          ? formatFinanceDate(available.nextDueAt, false)
                          : "Nothing due"
                      }
                    />
                  </View>
                  {presentation.approvedNotPaidOut ? (
                    <View className="bg-hero-foreground/15 flex-row items-center justify-between gap-2 rounded-[18px] px-4 py-3">
                      <View className="min-w-0 flex-1 gap-1">
                        <Text className="text-hero-foreground" variant="label">
                          {presentation.approvedNotPaidOut.label}
                        </Text>
                        {presentation.approvedNotPaidOut.detail ? (
                          <Text
                            className="text-hero-foreground/80"
                            variant="caption"
                          >
                            {presentation.approvedNotPaidOut.detail}
                          </Text>
                        ) : null}
                      </View>
                      <Text
                        className="text-hero-foreground"
                        tabular
                        variant="money"
                      >
                        {presentation.approvedNotPaidOut.value}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : null}
            </ScreenHero>
          }
          onRefresh={enabled ? refresh : undefined}
          refreshing={snapshot.isRefetching}
          testID="member-financing"
        >
          {destinationUnavailable ? (
            <NotificationDestinationNotice
              message="That financing request isn’t available."
              onDismiss={() => setDismissedId(notificationId)}
            />
          ) : null}
          {!online ? (
            <FinanceNotice
              title="You’re offline"
              icon="WifiOff"
              detail={
                available
                  ? "Showing your saved financing data. New requests need a connection."
                  : "Connect to load your financing data."
              }
              warning
            />
          ) : null}
          {online && stale && available ? (
            <FinanceNotice
              title="Couldn’t refresh"
              detail="Showing your last saved financing data."
              onRetry={refresh}
            />
          ) : null}
          {restricted ? (
            <FinancingRestricted onHelp={() => router.push("/support")} />
          ) : snapshot.isPending ? (
            <ListSkeleton rows={4} />
          ) : !available && online ? (
            <EmptyState
              action={{ label: "Retry", onPress: refresh }}
              description="Check your connection and try again."
              icon="CircleAlert"
              title="Couldn’t load your financing"
              tone="error"
            />
          ) : available ? (
            <>
              <View className="gap-2">
                <FinanceHeading title="Request financing" />
                {available.products.length ? (
                  <ListCard>
                    {hasDraft ? (
                      <RecordRow
                        avatarIcon="ClipboardCheck"
                        chevron
                        onPress={() => open()}
                        title="Continue your draft"
                      />
                    ) : null}
                    {available.products.map((product) => (
                      <RecordRow
                        leading={<FinanceProductIcon product={product} />}
                        chevron
                        key={product.id}
                        meta={`${product.eligibleAmount != null ? `Up to ${money(product.eligibleAmount)} · ` : ""}${product.termMonths} months`}
                        onPress={() => open(product.id)}
                        title={product.name}
                      />
                    ))}
                  </ListCard>
                ) : (
                  <EmptyState
                    className="rounded-[20px] bg-card"
                    description="Check back when your cooperative opens products for a financing cycle."
                    icon="Calendar"
                    title="No financing products open"
                  />
                )}
              </View>
              {openRequests.length ? (
                <View className="gap-2">
                  <FinanceHeading
                    title="In progress"
                    trailing={
                      <Text className="text-muted-foreground" variant="label">
                        {openRequests.length}
                      </Text>
                    }
                  />
                  <ListCard>
                    {openRequests.map((request) => (
                      <FinanceRequestRow
                        currency={currency}
                        key={request.id}
                        onOpen={setOpenedRequest}
                        request={request}
                      />
                    ))}
                  </ListCard>
                </View>
              ) : null}
              {activity.length ? (
                <View className="gap-2">
                  <FinanceHeading title="Your financing" />
                  <ListCard>
                    {activity.map((row) => (
                      <RecordRow
                        amount={
                          row.value != null ? money(row.value) : undefined
                        }
                        avatarIcon={
                          row.key.startsWith("repayment-")
                            ? "ReceiptText"
                            : "HandCoins"
                        }
                        key={row.key}
                        meta={row.detail}
                        status={row.status ?? undefined}
                        statusTone={
                          row.status ? statusToneFor(row.status) : undefined
                        }
                        title={row.label}
                      />
                    ))}
                  </ListCard>
                </View>
              ) : null}
              <View className="gap-2">
                <FinanceHeading
                  title={pastRequests.length ? "Past requests" : "Requests"}
                  trailing={
                    <Button onPress={showRequests} size="sm" variant="link">
                      <Text className="text-primary">See all</Text>
                    </Button>
                  }
                />
                {pastRequests.length ? (
                  <ListCard>
                    {pastRequests.slice(0, 3).map((request) => (
                      <FinanceRequestRow
                        currency={currency}
                        key={request.id}
                        onOpen={setOpenedRequest}
                        request={request}
                      />
                    ))}
                  </ListCard>
                ) : !openRequests.length ? (
                  <Text className="text-muted-foreground" variant="small">
                    Requests you send appear here with their status.
                  </Text>
                ) : null}
              </View>
            </>
          ) : null}
          <FinanceRequestDetail
            currency={currency}
            onClose={() => {
              setOpenedRequest(null)
              if (notificationId) setDismissedId(notificationId)
            }}
            request={selected}
          />
        </ScreenShell>
      )}
    />
  )
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 gap-1">
      <Text className="text-hero-foreground/80" variant="caption">
        {label}
      </Text>
      <Text className="text-hero-foreground" tabular variant="money">
        {value}
      </Text>
    </View>
  )
}
