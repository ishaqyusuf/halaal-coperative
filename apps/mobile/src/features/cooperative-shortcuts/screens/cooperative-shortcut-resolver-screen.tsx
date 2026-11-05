import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { View } from "react-native"

import {
  formatMembershipRole,
  type WorkspaceMembership,
} from "../model/shortcut-policy"

export type ShortcutResolverState =
  | { kind: "resolving" }
  | { kind: "switching" }
  | { kind: "invalid" }
  | { kind: "unknown" }
  | { kind: "offline" }
  | { kind: "unavailable" }
  | { kind: "failed" }
  | { kind: "choose-role"; memberships: WorkspaceMembership[] }

// Neutral copy: never names another account or cooperative.
const COPY: Record<
  Exclude<
    ShortcutResolverState["kind"],
    "resolving" | "switching" | "choose-role"
  >,
  { body: string; title: string }
> = {
  failed: {
    body: "The cooperative could not be opened. Try again, or open HalaalVest and sign in again if asked.",
    title: "Couldn't open this cooperative",
  },
  invalid: {
    body: "This link is not a HalaalVest cooperative shortcut.",
    title: "Shortcut can't be opened",
  },
  offline: {
    body: "Connect to the internet to switch cooperative. You can keep using the cooperative that is already open.",
    title: "You're offline",
  },
  unavailable: {
    body: "This cooperative is no longer available to your account, so its shortcut was disabled. You can remove its tile from your launcher.",
    title: "Cooperative unavailable",
  },
  unknown: {
    body: "This shortcut isn't linked to your account on this phone. Choose a cooperative to continue.",
    title: "Shortcut not recognised",
  },
}

export function CooperativeShortcutResolverScreen({
  onChooseCooperative,
  onChooseRole,
  onContinue,
  onRetry,
  state,
}: {
  onChooseCooperative: () => void
  onChooseRole: (membershipId: string) => void
  onContinue: () => void
  onRetry: () => void
  state: ShortcutResolverState
}) {
  if (state.kind === "resolving" || state.kind === "switching") {
    return (
      <SafeArea className="bg-background">
        <View
          accessibilityLabel={
            state.kind === "switching"
              ? "Opening cooperative"
              : "Opening HalaalVest"
          }
          accessibilityLiveRegion="polite"
          className="flex-1 items-center justify-center gap-3 px-6"
        >
          <LoadingSpinner />
          <Text className="text-sm text-muted-foreground">
            {state.kind === "switching"
              ? "Opening cooperative…"
              : "Opening HalaalVest…"}
          </Text>
        </View>
      </SafeArea>
    )
  }

  if (state.kind === "choose-role") {
    return (
      <SafeArea className="bg-background">
        <View className="flex-1 justify-center gap-5 px-6">
          <View className="gap-2">
            <Text className="text-xl font-extrabold tracking-tight text-foreground">
              Choose how to continue
            </Text>
            <Text className="text-sm leading-5 text-muted-foreground">
              You have more than one role in this cooperative.
            </Text>
          </View>
          <View className="gap-2">
            {state.memberships.map((membership) => (
              <Button
                accessibilityLabel={`Continue as ${formatMembershipRole(membership.role)}`}
                key={membership.id}
                onPress={() => onChooseRole(membership.id)}
                size="lg"
                variant="outline"
              >
                <Text>{formatMembershipRole(membership.role)}</Text>
              </Button>
            ))}
          </View>
          <Button onPress={onContinue} variant="ghost">
            <Text>Cancel</Text>
          </Button>
        </View>
      </SafeArea>
    )
  }

  const copy = COPY[state.kind]
  return (
    <SafeArea className="bg-background">
      <View
        accessibilityLiveRegion="polite"
        className="flex-1 justify-center gap-5 px-6"
      >
        <View className="size-12 items-center justify-center rounded-full bg-accent">
          <Icon
            className="size-base text-accent-foreground"
            name={state.kind === "offline" ? "WifiOff" : "Info"}
          />
        </View>
        <View className="gap-2">
          <Text
            accessibilityRole="header"
            className="text-xl font-extrabold tracking-tight text-foreground"
          >
            {copy.title}
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {copy.body}
          </Text>
        </View>
        <View className="gap-2">
          {state.kind === "offline" || state.kind === "failed" ? (
            <Button onPress={onRetry} size="lg">
              <Text>Try again</Text>
            </Button>
          ) : null}
          {state.kind === "unknown" || state.kind === "unavailable" ? (
            <Button onPress={onChooseCooperative} size="lg">
              <Text>Choose cooperative</Text>
            </Button>
          ) : null}
          <Button onPress={onContinue} size="lg" variant="outline">
            <Text>Open HalaalVest</Text>
          </Button>
        </View>
      </View>
    </SafeArea>
  )
}
