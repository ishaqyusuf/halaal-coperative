import { EmptyState } from "@/components/app/empty-state"
import { ReviewRow } from "@/components/app/result-screen"
import { ScreenShell, useScreenBack } from "@/components/app/screen-shell"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { ListCard } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { useFocusEffect } from "@react-navigation/native"
import { useCallback, useState } from "react"
import { View } from "react-native"
import { OperationProfileEditSheet } from "../components/operation-profile-edit-sheet"
import { ReceiptMemberAudienceSheet } from "../components/receipt-member-audience-sheet"
import {
  ModePill,
  OperationProfileHero,
  ProfileBanner,
  ServiceTile,
} from "../components/operation-profile-ui"
import {
  getOperationProfileMode,
  getOperationProfileService,
  getOperationProfileServiceConsequence,
  isOperationProfileReadOnly,
  operationProfileSections,
  operationProfileServices,
} from "../model/operation-profile-policy"
import type {
  MobileOperationProfileService,
  MobileOperationProfileSnapshot,
  UpdateMobileOperationProfileServiceInput,
  UpdateMobileOperationProfileServiceResult,
} from "../model/operation-profile-types"

const cacheTime = new Intl.DateTimeFormat("en", {
  hour: "numeric",
  minute: "2-digit",
})

function ServiceRow({
  onPress,
  readOnly,
  service,
}: {
  onPress: () => void
  readOnly: boolean
  service: MobileOperationProfileService
}) {
  const definition = getOperationProfileService(service.serviceKey)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${definition.label}, ${getOperationProfileMode(service.effectiveAccessMode).label}`}
      accessibilityState={{ disabled: readOnly }}
      className={cn(
        "min-h-[94px] flex-row items-start gap-[12px] p-[14px]",
        !readOnly && "active:bg-accent"
      )}
      disabled={readOnly}
      haptic={!readOnly}
      onPress={onPress}
      testID={`operation-profile-${service.serviceKey}`}
    >
      <ServiceTile serviceKey={service.serviceKey} />
      <View className="min-w-0 flex-1 gap-[4px]">
        <View className="flex-row items-start justify-between gap-[8px]">
          <Text className="min-w-0 shrink font-bold" variant="body">
            {definition.label}
          </Text>
          <ModePill compact mode={service.effectiveAccessMode} />
        </View>
        <Text className="max-w-[225px] text-muted-foreground" variant="small">
          {getOperationProfileServiceConsequence({
            accessMode: service.effectiveAccessMode,
            serviceKey: service.serviceKey,
          })}
        </Text>
        {service.effectiveAccessMode !== service.accessMode ? (
          <Text className="text-tint-warm-foreground" variant="small">
            Configured as {getOperationProfileMode(service.accessMode).label}. A
            platform limit is stricter right now.
          </Text>
        ) : null}
      </View>
      <Icon
        className="size-base mt-[10px] shrink-0 text-muted-foreground"
        name={readOnly ? "Lock" : "ChevronRight"}
      />
    </Pressable>
  )
}

export function OperationProfileScreen({
  actorName,
  canManage,
  hasError,
  isLimited,
  isLoading,
  isOnline,
  isRefreshing,
  isRetrying,
  isStale,
  isSubmitting,
  onRefresh,
  onRefreshForConflict,
  onRetry,
  onUpdateService,
  snapshot,
  submitError,
  tenantName,
}: {
  actorName?: string
  canManage: boolean
  hasError: boolean
  isLimited: boolean
  isLoading: boolean
  isOnline: boolean
  isRefreshing: boolean
  isRetrying: boolean
  isStale: boolean
  isSubmitting: boolean
  onRefresh: () => void
  onRefreshForConflict: () => Promise<MobileOperationProfileSnapshot | null>
  onRetry: () => void
  onUpdateService: (
    input: UpdateMobileOperationProfileServiceInput
  ) => Promise<UpdateMobileOperationProfileServiceResult>
  snapshot?: MobileOperationProfileSnapshot
  submitError: string | null
  tenantName?: string
}) {
  const onBack = useScreenBack(true)
  const [editingService, setEditingService] =
    useState<MobileOperationProfileService | null>(null)
  const [editingReceiptAudience, setEditingReceiptAudience] = useState(false)
  useFocusEffect(
    useCallback(
      () => () => {
        setEditingService(null)
        setEditingReceiptAudience(false)
      },
      []
    )
  )
  const readOnly = isOperationProfileReadOnly({
    isLimited,
    isOnline,
    isStale,
  })
  const published =
    isLimited && snapshot
      ? {
          ...snapshot,
          services: snapshot.services.map(
            (service): MobileOperationProfileService => ({
              ...service,
              effectiveAccessMode:
                service.accessMode === "disabled" ? "disabled" : "read_only",
              effectiveCanMemberCreate: false,
              effectiveCanStaffCreate: false,
            })
          ),
        }
      : snapshot
  const savedAt = snapshot?.cache
    ? cacheTime.format(new Date(snapshot.cache.cachedAt))
    : null

  return (
    <>
      <ScreenShell
        contentClassName={cn(
          "gap-[22px]",
          published && (!isOnline || isStale || isLimited)
            ? "pt-[18px]"
            : "pt-[38px]"
        )}
        hero={
          <OperationProfileHero
            onBack={() => onBack?.()}
            snapshot={published}
            tenantName={published?.tenant.name ?? tenantName}
          />
        }
        onRefresh={
          canManage && isOnline && !isSubmitting ? onRefresh : undefined
        }
        refreshing={isRefreshing}
      >
        {!canManage ? (
          <EmptyState
            action={{ label: "Go back", onPress: () => onBack?.() }}
            description="Only Cooperative Admins can view or change service access settings."
            icon="ShieldAlert"
            title="Cooperative Admin access required"
          />
        ) : published ? (
          <>
            {!isOnline || isStale ? (
              <ProfileBanner
                description={`${savedAt ? `Showing settings saved at ${savedAt}. ` : ""}${isOnline ? "Pull down to refresh before changing access." : "Reconnect to change access."}`}
                icon={isOnline ? "History" : "WifiOff"}
                title={isOnline ? "Refresh needed" : "You’re offline"}
                tone="warning"
              />
            ) : null}
            {isLimited ? (
              <ProfileBanner
                action={<StatusPill label="Limited" tone="warning" />}
                description="The stricter rule wins. Existing records remain readable, but new work and changes are unavailable right now."
                icon="Info"
                title="Some services are limited"
                tone="warning"
              />
            ) : null}
            {operationProfileSections.map((section) => {
              const services = operationProfileServices
                .filter((definition) => definition.section === section.key)
                .flatMap((definition) =>
                  published.services.filter(
                    (service) => service.serviceKey === definition.key
                  )
                )
              return (
                <View className="gap-[9px]" key={section.key}>
                  <View className="flex-row items-end justify-between gap-[12px]">
                    <Text accessibilityRole="header" variant="section">
                      {section.label}
                    </Text>
                    <Text className="text-muted-foreground" variant="label">
                      {services.length}{" "}
                      {services.length === 1 ? "service" : "services"}
                    </Text>
                  </View>
                  <ListCard>
                    {services.map((service) => (
                      <ServiceRow
                        key={service.serviceKey}
                        onPress={() => setEditingService(service)}
                        readOnly={readOnly}
                        service={service}
                      />
                    ))}
                    {section.key === "member_channels" ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={readOnly}
                        onPress={() => setEditingReceiptAudience(true)}
                        className="min-h-11 flex-row items-center justify-between gap-3 p-[14px]"
                      >
                        <View className="min-w-0 flex-1 gap-1">
                          <Text className="font-bold">
                            Member receipt access
                          </Text>
                          <Text
                            className="text-muted-foreground"
                            variant="small"
                          >
                            Choose which members can send receipts.
                          </Text>
                        </View>
                        <Icon
                          className="size-base text-muted-foreground"
                          name={readOnly ? "Lock" : "ChevronRight"}
                        />
                      </Pressable>
                    ) : null}
                  </ListCard>
                </View>
              )
            })}
            <View className="gap-[9px]">
              <Text accessibilityRole="header" variant="section">
                Operating limits
              </Text>
              <ListCard inset={false}>
                <ReviewRow
                  compact
                  label="Procurement"
                  value={`${published.policy.procurementMaximumActiveObligationsPerMember} active per member`}
                />
                <ReviewRow
                  compact
                  label="Foodstuff Purchase"
                  value={`${published.policy.foodPurchaseMaximumActiveObligationsPerMember} active per member`}
                />
                <ReviewRow
                  compact
                  label="Foodstuff cycle"
                  value={
                    published.policy.foodPurchaseRequiresOpenCycle
                      ? "Open cycle required"
                      : "Any cycle"
                  }
                />
                <ReviewRow
                  compact
                  label="Receipt proof"
                  value={
                    published.policy.paymentReceiptProofRequired
                      ? "Required"
                      : "Optional"
                  }
                />
              </ListCard>
              <Text className="text-muted-foreground" variant="small">
                A platform limit can make a service view only. Edit policy
                limits in the admin dashboard.
              </Text>
            </View>
          </>
        ) : isLoading ? (
          <View
            accessibilityLabel="Loading operation profile"
            accessibilityRole="progressbar"
            className="gap-[14px]"
          >
            <View className="bg-surface-raised h-[20px] w-[45%] rounded-[8px]" />
            <View className="bg-surface-raised h-[240px] rounded-[20px]" />
          </View>
        ) : hasError ? (
          <View className="items-center gap-[12px] px-[10px] pt-[18px]">
            <View
              className={cn(
                "size-[64px] items-center justify-center rounded-full",
                isOnline ? "bg-tint-danger" : "bg-tint-warm"
              )}
            >
              <Icon
                className={cn(
                  "size-[30px]",
                  isOnline
                    ? "text-tint-danger-foreground"
                    : "text-tint-warm-foreground"
                )}
                name={isOnline ? "CircleAlert" : "WifiOff"}
              />
            </View>
            <Text
              accessibilityRole="header"
              className="mt-[6px] text-center"
              variant="title"
            >
              {isOnline ? "Operation profile unavailable" : "You’re offline"}
            </Text>
            <Text
              className="text-foreground-soft max-w-[300px] text-center"
              variant="small"
            >
              {isOnline
                ? "Operation profile could not be loaded. No settings changed."
                : "Reconnect to load your service access settings."}
            </Text>
            {isOnline ? (
              <Button
                className="bg-surface-raised mt-[6px]"
                loading={isRetrying}
                onPress={onRetry}
                variant="secondary"
              >
                <Icon className="size-base text-foreground" name="RefreshCw" />
                <Text className="text-foreground">Try again</Text>
              </Button>
            ) : null}
          </View>
        ) : null}
      </ScreenShell>
      {canManage && editingService ? (
        <OperationProfileEditSheet
          actorName={actorName}
          isOnline={isOnline}
          isReadOnly={readOnly}
          isSubmitting={isSubmitting}
          onClose={() => setEditingService(null)}
          onRefresh={onRefreshForConflict}
          onUpdate={onUpdateService}
          service={editingService}
          submitError={submitError}
        />
      ) : null}
      {canManage && editingReceiptAudience ? (
        <ReceiptMemberAudienceSheet
          onClose={() => setEditingReceiptAudience(false)}
          readOnly={readOnly}
        />
      ) : null}
    </>
  )
}
