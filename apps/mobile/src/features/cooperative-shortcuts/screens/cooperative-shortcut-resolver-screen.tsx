import {
  CenteredStatus,
  GateStatusBadge,
  type GateStatusTone,
} from "@/components/app/gate-status"
import { ScreenShell } from "@/components/app/screen-shell"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"

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

type Kind = Exclude<ShortcutResolverState["kind"], "resolving" | "switching" | "choose-role">

// Neutral copy: never names another account or cooperative.
const COPY: Record<Kind, { body: string; icon: string; title: string; tone: GateStatusTone }> = {
  failed: {
    body: "Try again, or open HalaalVest and sign in again if asked.",
    icon: "CircleAlert",
    title: "Couldn’t open this cooperative",
    tone: "danger",
  },
  invalid: {
    body: "This link is not a HalaalVest cooperative shortcut.",
    icon: "Link2Off",
    title: "Shortcut can’t be opened",
    tone: "danger",
  },
  offline: {
    body: "Connect to the internet to switch cooperative. You can keep using the cooperative that is already open.",
    icon: "WifiOff",
    title: "You’re offline",
    tone: "warm",
  },
  unavailable: {
    body: "This cooperative is no longer available to your account, so its shortcut was disabled. You can remove its tile from your launcher.",
    icon: "Ban",
    title: "Cooperative unavailable",
    tone: "neutral",
  },
  unknown: {
    body: "This shortcut isn’t linked to your account on this phone. Choose a cooperative to continue.",
    icon: "ShieldAlert",
    title: "Shortcut not recognised",
    tone: "warm",
  },
}

/**
 * Shortcut opener on 03 Grouped settings (T27): a centred status badge and
 * neutral copy, with the way forward docked at the bottom.
 */
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
      <ScreenShell back={false} contentClassName="pt-[160px]" testID="shortcut-opener">
        <CenteredStatus
          badge={<GateStatusBadge busy tone="brand" />}
          title={state.kind === "switching" ? "Opening cooperative…" : "Opening HalaalVest…"}
        />
      </ScreenShell>
    )
  }

  if (state.kind === "choose-role") {
    return (
      <ScreenShell
        back={false}
        contentClassName="pt-[120px]"
        footer={
          <>
            {state.memberships.map((membership) => (
              <Button
                accessibilityLabel={`Continue as ${formatMembershipRole(membership.role)}`}
                key={membership.id}
                onPress={() => onChooseRole(membership.id)}
                variant="secondary"
              >
                <Icon className="size-base text-accent-foreground" name="UserRound" />
                <Text>{formatMembershipRole(membership.role)}</Text>
              </Button>
            ))}
            <Button onPress={onContinue} size="sm" variant="ghost">
              <Text>Cancel</Text>
            </Button>
          </>
        }
        testID="shortcut-opener"
      >
        <CenteredStatus
          badge={<GateStatusBadge icon="Users" tone="brand" />}
          body="You have more than one role in this cooperative."
          title="Choose how to continue"
        />
      </ScreenShell>
    )
  }

  const copy = COPY[state.kind]
  const retry = state.kind === "offline" || state.kind === "failed"
  const choose = state.kind === "unknown" || state.kind === "unavailable"
  return (
    <ScreenShell
      back={false}
      contentClassName="pt-[120px]"
      footer={
        <>
          {retry ? (
            <Button onPress={onRetry}>
              <Icon className="size-base text-primary-foreground" name="RefreshCw" />
              <Text>Try again</Text>
            </Button>
          ) : null}
          {choose ? (
            <Button onPress={onChooseCooperative}>
              <Text>Choose cooperative</Text>
            </Button>
          ) : null}
          <Button
            onPress={onContinue}
            size={retry || choose ? "sm" : undefined}
            variant={retry || choose ? "ghost" : "default"}
          >
            <Text>Open HalaalVest</Text>
          </Button>
        </>
      }
      testID="shortcut-opener"
    >
      <CenteredStatus badge={<GateStatusBadge icon={copy.icon} tone={copy.tone} />} body={copy.body} title={copy.title} />
    </ScreenShell>
  )
}
