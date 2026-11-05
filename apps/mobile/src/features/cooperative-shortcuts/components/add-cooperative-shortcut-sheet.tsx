import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { useEffect, useState } from "react"
import { View } from "react-native"

import { SHORTCUT_PRIVACY_NOTICE } from "../model/shortcut-policy"
import type { ShortcutEnvironment } from "../platform/cooperative-shortcut-platform"
import type { ShortcutRequestOutcome } from "../platform/cooperative-shortcut-service"
import { CooperativeShortcutTile } from "./cooperative-shortcut-tile"

type SheetPhase = "offer" | "sending" | ShortcutRequestOutcome

const RESULT_COPY: Partial<
  Record<SheetPhase, { body: string; title: string }>
> = {
  already_pinned: {
    body: "This cooperative is already on your home screen.",
    title: "Already added",
  },
  busy: {
    body: "A request is already waiting on your launcher.",
    title: "Confirm on your launcher",
  },
  failed: {
    body: "The shortcut could not be requested. You can try again from More.",
    title: "Shortcut not added",
  },
  rejected: {
    body: "Your launcher did not accept the request. You can try again from More.",
    title: "Shortcut not added",
  },
  requested: {
    body: "Follow your launcher's prompt to place the shortcut. Nothing changes if you cancel.",
    title: "Confirm on your launcher",
  },
  unsupported: {
    body: "This phone's launcher does not accept cooperative shortcuts. Keep using the HalaalVest icon.",
    title: "Not available",
  },
}

export function AddCooperativeShortcutSheet({
  cooperativeName,
  environment,
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

  const result = RESULT_COPY[phase]
  const deciding = phase === "offer" || phase === "sending"

  async function handleAdd() {
    if (phase === "sending") return
    setPhase("sending")
    setPhase(await onAdd())
  }

  return (
    <FloatingBottomSheet
      accessibilityLabel="Add cooperative shortcut"
      footer={
        <View className="gap-2 px-5 pt-3 pb-5">
          {deciding ? (
            <>
              <Button
                accessibilityHint="Asks your launcher to place a shortcut for this cooperative"
                disabled={phase === "sending"}
                onPress={() => void handleAdd()}
                size="lg"
              >
                <Text>{phase === "sending" ? "Requesting…" : "Add"}</Text>
              </Button>
              <Button
                disabled={phase === "sending"}
                onPress={onDismiss}
                size="lg"
                variant="ghost"
              >
                <Text>Not now</Text>
              </Button>
            </>
          ) : (
            <Button onPress={onClose} size="lg">
              <Text>Done</Text>
            </Button>
          )}
        </View>
      }
      onClose={deciding ? onDismiss : onClose}
      presentation="compact"
      scrollable="auto"
      title={result?.title ?? `Add ${cooperativeName} to your home screen`}
      visible={visible}
    >
      <View className="gap-4 px-5 pb-4">
        <View className="flex-row items-center gap-4">
          <CooperativeShortcutTile
            cooperativeName={cooperativeName}
            environment={environment}
            mark={mark}
          />
          <View className="min-w-0 flex-1 gap-1">
            <Text
              className="text-base font-bold text-foreground"
              numberOfLines={2}
            >
              {cooperativeName}
            </Text>
            <Text className="text-sm text-muted-foreground">
              Opens in HalaalVest
            </Text>
          </View>
        </View>
        <Text className="text-sm leading-5 text-muted-foreground">
          {result?.body ??
            "Your usual sign-in, app lock and access checks still apply. The HalaalVest icon keeps working."}
        </Text>
        {deciding ? (
          <Text className="text-xs leading-5 text-muted-foreground">
            {SHORTCUT_PRIVACY_NOTICE}
          </Text>
        ) : null}
      </View>
    </FloatingBottomSheet>
  )
}
