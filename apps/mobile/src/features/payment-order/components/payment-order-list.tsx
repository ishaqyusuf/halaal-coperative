import { Elevated } from "@/components/ui/list-card"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import * as Haptics from "expo-haptics"
import { useEffect, useState } from "react"
import { View } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"
import { scheduleOnRN } from "react-native-worklets"
import {
  movePaymentOrderItem,
  paymentOrderItems,
  type PaymentOrderKey,
} from "../model/payment-order-model"

/** Fixed row height so drag maths is a simple index × ROW. */
export const PAYMENT_ORDER_ROW = 68

type Positions = Record<string, number>

function toPositions(order: readonly PaymentOrderKey[]): Positions {
  return Object.fromEntries(order.map((key, index) => [key, index]))
}

function OrderRow({
  activeKey,
  count,
  disabled,
  index,
  itemKey,
  onDragEnd,
  onLiveMove,
  onMove,
  positions,
  reduceMotion,
}: {
  activeKey: SharedValue<string | null>
  count: number
  disabled: boolean
  index: number
  itemKey: PaymentOrderKey
  onDragEnd: (positions: Positions) => void
  onLiveMove: (positions: Positions) => void
  onMove: (to: number) => void
  positions: SharedValue<Positions>
  reduceMotion: boolean
}) {
  const colors = useColors()
  const item = paymentOrderItems[itemKey]
  const top = useSharedValue((positions.get()[itemKey] ?? 0) * PAYMENT_ORDER_ROW)
  const startTop = useSharedValue(0)

  const pan = Gesture.Pan()
    .enabled(!disabled)
    // Hold, then drag: a plain vertical swipe still scrolls the screen.
    .activateAfterLongPress(220)
    .onStart(() => {
      activeKey.set(itemKey)
      startTop.set((positions.get()[itemKey] ?? 0) * PAYMENT_ORDER_ROW)
      scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Medium)
    })
    .onUpdate((event) => {
      const max = (count - 1) * PAYMENT_ORDER_ROW
      const next = Math.max(0, Math.min(max, startTop.get() + event.translationY))
      top.set(next)
      const current = positions.get()
      const from = current[itemKey] ?? 0
      const to = Math.round(next / PAYMENT_ORDER_ROW)
      if (to === from) return
      const moved: Positions = {}
      for (const key in current) {
        const at = current[key] ?? 0
        if (key === itemKey) moved[key] = to
        else if (from < to && at > from && at <= to) moved[key] = at - 1
        else if (from > to && at < from && at >= to) moved[key] = at + 1
        else moved[key] = at
      }
      positions.set(moved)
      scheduleOnRN(onLiveMove, moved)
      scheduleOnRN(Haptics.selectionAsync)
    })
    .onFinalize(() => {
      if (activeKey.get() !== itemKey) return
      activeKey.set(null)
      const settled = (positions.get()[itemKey] ?? 0) * PAYMENT_ORDER_ROW
      top.set(reduceMotion ? settled : withTiming(settled, { duration: 160 }))
      scheduleOnRN(onDragEnd, positions.get())
    })

  const style = useAnimatedStyle(() => {
    const active = activeKey.get() === itemKey
    if (!active) {
      const target = (positions.get()[itemKey] ?? 0) * PAYMENT_ORDER_ROW
      if (top.get() !== target)
        top.set(reduceMotion ? target : withTiming(target, { duration: 160 }))
    }
    return {
      transform: [{ translateY: top.get() }, { scale: active ? 1.02 : 1 }],
      zIndex: active ? 2 : 0,
    }
  })

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        accessibilityActions={[
          ...(index > 0 ? [{ label: "Move up", name: "moveUp" }] : []),
          ...(index < count - 1 ? [{ label: "Move down", name: "moveDown" }] : []),
        ]}
        accessibilityHint={disabled ? undefined : "Hold and drag to change the order"}
        accessibilityLabel={`${index + 1}, ${item.label}, ${item.description}`}
        accessible
        onAccessibilityAction={(event) => {
          if (disabled) return
          if (event.nativeEvent.actionName === "moveUp") onMove(index - 1)
          if (event.nativeEvent.actionName === "moveDown") onMove(index + 1)
        }}
        style={[
          {
            backgroundColor: colors.card,
            height: PAYMENT_ORDER_ROW,
            left: 0,
            position: "absolute",
            right: 0,
          },
          style,
        ]}
        testID={`payment-order-row-${itemKey}`}
      >
        {index > 0 ? <View className="ml-[14px] h-px bg-border" /> : null}
        <View className="flex-1 flex-row items-center gap-[12px] px-[14px]">
          <Text
            className="w-[18px] text-muted-foreground"
            tabular
            variant="label"
          >
            {index + 1}
          </Text>
          <View
            className={cn(
              "size-[36px] items-center justify-center rounded-[12px]",
              item.tint[0]
            )}
          >
            <Icon className={cn("size-base", item.tint[1])} name={item.icon} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-bold" numberOfLines={1} variant="body">
              {item.label}
            </Text>
            <Text
              className="text-muted-foreground"
              numberOfLines={1}
              variant="small"
            >
              {item.description}
            </Text>
          </View>
          {disabled ? null : (
            <Icon
              className="size-md text-muted-foreground"
              name="GripVertical"
            />
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  )
}

/**
 * The numbered, draggable payment order (workshop T30 rule 01). Hold a row,
 * drag it, drop; screen readers get Move up / Move down actions.
 */
export function PaymentOrderList({
  disabled = false,
  onChange,
  order,
}: {
  disabled?: boolean
  onChange: (order: PaymentOrderKey[]) => void
  order: PaymentOrderKey[]
}) {
  const reduceMotion = useReducedMotion()
  const positions = useSharedValue<Positions>(toPositions(order))
  const activeKey = useSharedValue<string | null>(null)
  // Live numbering while a row is held (≤ 5 updates per drag).
  const [live, setLive] = useState<Positions>(() => toPositions(order))

  const orderSignature = order.join(",")
  useEffect(() => {
    const next = toPositions(order)
    positions.set(next)
    setLive(next)
    // Only re-seed when the committed order itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderSignature])

  const commit = (settled: Positions) => {
    const next = [...order].sort((a, b) => (settled[a] ?? 0) - (settled[b] ?? 0))
    if (next.join(",") !== orderSignature) onChange(next)
    else setLive(toPositions(order))
  }

  return (
    <Elevated className="rounded-[20px] bg-card" radius={20}>
      <View
        style={{
          borderRadius: 20,
          height: order.length * PAYMENT_ORDER_ROW,
          overflow: "hidden",
        }}
        testID="payment-order-list"
      >
        {order.map((key) => (
          <OrderRow
            activeKey={activeKey}
            count={order.length}
            disabled={disabled}
            index={live[key] ?? 0}
            itemKey={key}
            key={key}
            onDragEnd={commit}
            onLiveMove={setLive}
            onMove={(to) =>
              onChange(movePaymentOrderItem(order, order.indexOf(key), to))
            }
            positions={positions}
            reduceMotion={reduceMotion}
          />
        ))}
      </View>
    </Elevated>
  )
}
