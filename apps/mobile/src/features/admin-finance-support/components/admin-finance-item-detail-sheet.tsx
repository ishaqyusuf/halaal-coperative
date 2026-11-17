import { AppSheet } from "@/components/app/app-sheet"
import { ReviewRow } from "@/components/app/result-screen"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { ListCard, TintedAvatar } from "@/components/ui/list-card"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { View } from "react-native"
import {
  financeDeskItemStatus,
  financeDeskLaneNames,
  formatAdminFinanceAge,
  formatAdminFinanceCurrency,
  formatAdminFinanceStatus,
} from "../model/admin-finance-support-presentation"
import type {
  AdminFinanceSupportAction,
  AdminFinanceSupportItem,
} from "../model/admin-finance-support-types"

function displayDetail(label: string, value: string, currencyCode: string) {
  if (
    /amount|cost|outstanding|unit amount|snapshot value/i.test(label) &&
    /^\d+(\.\d+)?$/.test(value)
  ) {
    return formatAdminFinanceCurrency(Number(value), currencyCode)
  }
  if (label === "Due date" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
  }
  return value.includes("_") ? formatAdminFinanceStatus(value) : value
}

export function AdminFinanceItemDetailSheet({
  blocked,
  currencyCode,
  item,
  onAction,
  onClose,
  onDismissed,
  visible,
}: {
  blocked: boolean
  currencyCode: string
  item: AdminFinanceSupportItem | null
  onAction: (action: AdminFinanceSupportAction) => void
  onClose: () => void
  onDismissed: () => void
  visible: boolean
}) {
  if (!item) return null
  const actions = item.allowedActions
  const primary =
    actions.find(
      (action) => !action.destructive && action.key !== "mark_under_review"
    ) ?? actions[0]
  const start = actions.find(
    (action) => action.key === "mark_under_review" && action !== primary
  )
  const rest = actions.filter(
    (action) => action !== primary && action !== start
  )
  const lane = financeDeskLaneNames[item.queueKey]
  const status = financeDeskItemStatus(item)
  // These rows and actions already establish a lower bound before text wrapping.
  const minimumContentHeight =
    52 +
    16 +
    (item.amount === null ? 26 : 54) +
    (item.details.length ? 42 + item.details.length * 48 : 0) +
    (item.policyEvidence.length ? 42 + item.policyEvidence.length * 20 : 0) +
    (primary ? 80 : 0) +
    (rest.length ? 52 : 0) +
    (start ? 52 : 0)
  return (
    <AppSheet
      footer={
        primary ? (
          <View className="gap-[8px]">
            <Button
              disabled={blocked}
              onPress={() => onAction(primary)}
              testID={`admin-finance-action-${primary.key}`}
              variant={primary.destructive ? "destructive" : "default"}
            >
              <Text>{primary.label}</Text>
            </Button>
            {rest.length ? (
              <View className="flex-row flex-wrap gap-[8px]">
                {rest.map((action) => (
                  <Button
                    className={
                      action.destructive
                        ? "bg-tint-danger flex-1"
                        : "bg-surface-raised flex-1"
                    }
                    disabled={blocked}
                    key={action.key}
                    onPress={() => onAction(action)}
                    size="sm"
                    testID={`admin-finance-action-${action.key}`}
                    variant="secondary"
                  >
                    <Text
                      className={
                        action.destructive
                          ? "text-tint-danger-foreground"
                          : "text-foreground"
                      }
                    >
                      {action.label}
                    </Text>
                  </Button>
                ))}
              </View>
            ) : null}
            {start ? (
              <Button
                disabled={blocked}
                onPress={() => onAction(start)}
                size="sm"
                testID="admin-finance-action-mark_under_review"
                variant="link"
              >
                <Text>Mark as in review</Text>
              </Button>
            ) : null}
          </View>
        ) : undefined
      }
      insetFloatingFooter
      minimumContentHeight={minimumContentHeight}
      onClose={onClose}
      onDismissed={onDismissed}
      title={lane}
      visible={visible}
    >
      <View className="gap-[16px]">
        <View className="flex-row items-center gap-[12px]">
          <TintedAvatar name={item.title} size={52} />
          <View className="min-w-0 flex-1 gap-[2px]">
            <Text variant="title">{item.title}</Text>
            <Text className="text-muted-foreground" variant="small">
              {[item.member?.number, lane].filter(Boolean).join(" · ")}
            </Text>
          </View>
        </View>
        <View className="flex-row items-end justify-between gap-[10px]">
          <View className="min-w-0 flex-1 gap-[2px]">
            {item.amount === null ? (
              <Text variant="title">{item.subtitle}</Text>
            ) : (
              <>
                <Text
                  className="text-[30px] leading-[36px]"
                  tabular
                  variant="screenTitle"
                >
                  {formatAdminFinanceCurrency(item.amount, currencyCode)}
                </Text>
                <Text className="text-muted-foreground" variant="caption">
                  {item.subtitle}
                </Text>
              </>
            )}
          </View>
          <View className="items-end gap-[4px]">
            <StatusPill label={status.label} tone={status.tone} />
            <Text className="text-muted-foreground" variant="caption">
              {formatAdminFinanceAge(item.ageMinutes)}
            </Text>
          </View>
        </View>
        {item.blockers.length ? (
          <StatusBanner
            description={item.blockers.join("\n")}
            kind="error"
            title="Blocked"
          />
        ) : null}
        {blocked ? (
          <StatusBanner
            description="Refresh online to act on this item."
            kind="offline"
            title="Reviews are paused"
          />
        ) : null}
        {item.details.length ? (
          <View className="gap-[8px]">
            <Text variant="label">Details</Text>
            <ListCard inset={false}>
              {item.details.map(({ label, value }) => (
                <ReviewRow
                  key={label}
                  label={label}
                  value={displayDetail(label, value, currencyCode)}
                />
              ))}
            </ListCard>
          </View>
        ) : null}
        {item.policyEvidence.length ? (
          <View className="gap-[8px]">
            <Text variant="label">Evidence</Text>
            <View className="border-brand gap-[8px] border-l-2 pl-[12px]">
              {item.policyEvidence.map((evidence) => (
                <View className="flex-row items-start gap-[8px]" key={evidence}>
                  <Icon
                    className="text-success mt-[2px] size-[16px]"
                    name="Check"
                  />
                  <Text
                    className="text-foreground-soft min-w-0 flex-1"
                    variant="small"
                  >
                    {evidence}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        {!primary ? (
          <StatusBanner
            description="Your role can’t act on this item."
            kind="info"
            title="View only"
          />
        ) : null}
      </View>
    </AppSheet>
  )
}
