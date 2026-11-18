import { AppSheet } from "@/components/app/app-sheet"
import {
  CenteredStatus,
  GateStatusBadge,
  type GateStatusTone,
} from "@/components/app/gate-status"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useEffect, useState } from "react"
import { View } from "react-native"

import { sanitizeShortcutMark } from "../model/shortcut-label"
import { SHORTCUT_PRIVACY_NOTICE } from "../model/shortcut-policy"
import type { ShortcutEnvironment } from "../platform/cooperative-shortcut-platform"
import type { ShortcutRequestOutcome } from "../platform/cooperative-shortcut-service"

type SheetPhase = "offer" | "sending" | ShortcutRequestOutcome

const RESULT_COPY: Record<
  ShortcutRequestOutcome,
  { body: string; icon: string; title: string; tone: GateStatusTone }
> = {
  already_pinned: {
    body: "This cooperative is already on your home screen.",
    icon: "Check",
    title: "Already added",
    tone: "brand",
  },
  busy: {
    body: "A request is already waiting on your launcher.",
    icon: "Clock",
    title: "Confirm on your launcher",
    tone: "warm",
  },
  failed: {
    body: "The shortcut could not be requested. Try again, or later from Cooperatives & shortcuts.",
    icon: "CircleAlert",
    title: "Shortcut not added",
    tone: "danger",
  },
  rejected: {
    body: "Your launcher did not accept the request. You can try again from Cooperatives & shortcuts.",
    icon: "CircleAlert",
    title: "Shortcut not added",
    tone: "warm",
  },
  requested: {
    body: "Follow your launcher’s prompt to place the shortcut. Nothing changes if you cancel.",
    icon: "Smartphone",
    title: "Confirm on your launcher",
    tone: "brand",
  },
  unsupported: {
    body: "This phone’s launcher does not accept cooperative shortcuts. Keep using the HalaalVest icon.",
    icon: "Ban",
    title: "Not available",
    tone: "neutral",
  },
}

/**
 * Add-shortcut offer on 03 Grouped settings (T27): a floating sheet with the
 * cooperative's mark, what the tile does and who can see it; the launcher's
 * answer replaces the copy in place.
 */
export function AddCooperativeShortcutSheet({
  cooperativeName,
  mark,
  onAdd,
  onClose,
  onDismiss,
  visible,
}: {
  cooperativeName: string
  environment: ShortcutEnvironment
  mark: string
  onAdd: () => Promise<ShortcutRequestOutcome>
  onClose: () => void
  onDismiss: () => void
  visible: boolean
}) {
  const [phase, setPhase] = useState<SheetPhase>("offer")
  useEffect(() => {
    if (visible) setPhase("offer")
  }, [visible])

  const deciding = phase === "offer" || phase === "sending"
  const result = deciding ? null : RESULT_COPY[phase]

  async function handleAdd() {
    if (phase === "sending") return
    setPhase("sending")
    setPhase(await onAdd())
  }

  return (
    <AppSheet
      accessibilityLabel="Add cooperative shortcut"
      dismissible={phase !== "sending"}
      footer={
        <View className="gap-[10px] px-[20px] pt-[8px] pb-[20px]">
          {deciding ? (
            <>
              <Button
                accessibilityHint="Asks your launcher to place a shortcut for this cooperative"
                loading={phase === "sending"}
                onPress={() => void handleAdd()}
                testID="shortcut-add"
              >
                <Icon className="size-base text-primary-foreground" name="Plus" />
                <Text>{phase === "sending" ? "Requesting…" : "Add"}</Text>
              </Button>
              <Button disabled={phase === "sending"} onPress={onDismiss} variant="ghost">
                <Text>Not now</Text>
              </Button>
            </>
          ) : phase === "failed" ? (
            <>
              <Button onPress={() => void handleAdd()}>
                <Icon className="size-base text-primary-foreground" name="RefreshCw" />
                <Text>Try again</Text>
              </Button>
              <Button onPress={onClose} variant="ghost">
                <Text>Done</Text>
              </Button>
            </>
          ) : (
            <Button onPress={onClose}>
              <Text>Done</Text>
            </Button>
          )}
        </View>
      }
      onClose={deciding ? onDismiss : onClose}
      variant="confirm"
      visible={visible}
    >
      <View className="pt-[8px] pb-[4px]">
        <CenteredStatus
          badge={
            result ? (
              <GateStatusBadge icon={result.icon} size={76} tone={result.tone} />
            ) : (
              <GateStatusBadge mark={sanitizeShortcutMark(mark)} size={76} tone="brand" />
            )
          }
          body={
            result?.body ??
            "Your usual sign-in, app lock and access checks still apply. The HalaalVest icon keeps working."
          }
          title={result?.title ?? `Add ${cooperativeName} to your home screen`}
        >
          {deciding ? (
            <Text className="mt-[6px] max-w-[320px] text-center text-muted-foreground" variant="caption">
              {SHORTCUT_PRIVACY_NOTICE}
            </Text>
          ) : null}
        </CenteredStatus>
      </View>
    </AppSheet>
  )
}
