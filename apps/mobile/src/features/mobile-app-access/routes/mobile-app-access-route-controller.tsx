import { ConfirmSheet } from "@/components/app/confirm-sheet"
import { SIGN_OUT_CONFIRM_DESCRIPTION } from "@/components/app/confirmation-sheet"
import {
  CenteredStatus,
  GateStatusBadge,
  type GateStatusTone,
} from "@/components/app/gate-status"
import { GroupedRow, GroupedSection } from "@/components/app/grouped-section"
import { ScreenShell } from "@/components/app/screen-shell"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { initialsFor } from "@/components/ui/list-card"
import { Text } from "@/components/ui/text"
import { isMobileDevelopmentBuild } from "@/dev/mobile-dev-session"
import { QaAccessPanel } from "@/features/auth/public/qa-access"
import {
  projectAccessGate,
  resolveAccessGatePreview,
  resolveAccessGateState,
  type AccessGateTone,
} from "@/features/mobile-app-access/model/access-gate-presentation"
import { useAuthContext } from "@/hooks/use-auth"
import { useMobileAppAccess } from "@/runtime/mobile-app-access-provider"
import { Redirect, useLocalSearchParams, useRouter } from "expo-router"
import { useState } from "react"
import { View } from "react-native"

const BADGE_TONE: Record<AccessGateTone, GateStatusTone> = {
  danger: "danger",
  neutral: "brand",
  ok: "ok",
  warm: "warm",
}

/**
 * The app-access gate (T03, owner pick 03 Docked action): signed in, but this
 * membership may not use the app. A centred status badge, pill, title and
 * body; the Account section (identity, cooperatives & shortcuts); the 02
 * "Account and privacy" card; Refresh access and Sign out docked. It never
 * mentions a price, plan, renewal, subscription or where access is turned on
 * (owner rule, ADR-20261116-mobile-no-subscription-copy). Development builds
 * accept `?preview=<state>` for device QA of every status.
 */
export function MobileAppAccessRouteController() {
  const { profile, role, signOut } = useAuthContext()
  const router = useRouter()
  const access = useMobileAppAccess()
  const { preview } = useLocalSearchParams<{ preview?: string | string[] }>()
  const previewState = resolveAccessGatePreview(
    preview,
    isMobileDevelopmentBuild
  )
  const [isSignOutConfirmVisible, setIsSignOutConfirmVisible] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  if (!profile || !role) return <Redirect href="/(auth)/sign-in" />
  if (access.accessAllowed && !previewState) return <Redirect href="/" />

  const cooperativeName = profile.tenant.name
  const state =
    previewState ??
    resolveAccessGateState({
      checking: access.checking,
      error: access.error,
      role,
      status: access.snapshot?.status ?? null,
    })
  const gate = projectAccessGate(state, cooperativeName)
  const refreshing = access.checking && state !== "checking"

  const tone = BADGE_TONE[gate.chip.tone]
  const roleLabel = role === "admin" ? "Staff" : "Member"

  return (
    <>
      <ScreenShell
        back={false}
        contentClassName="gap-[22px] pt-[44px]"
        footer={
          <>
            <Button
              accessibilityHint="Asks your cooperative's server again"
              loading={access.checking}
              onPress={() => void access.refresh()}
            >
              <Icon className="size-base text-primary-foreground" name="RefreshCw" />
              <Text>{refreshing ? "Checking…" : "Refresh access"}</Text>
            </Button>
            <Button
              onPress={() => setIsSignOutConfirmVisible(true)}
              size="sm"
              variant="ghost"
            >
              <Text>Sign out</Text>
            </Button>
          </>
        }
        testID="mobile-access-screen"
      >
        <CenteredStatus
          badge={
            <GateStatusBadge
              busy={gate.chip.busy}
              icon={gate.chip.icon}
              tone={tone}
            />
          }
          body={gate.body}
          pill={{ label: gate.chip.label, tone }}
          title={gate.title}
        />
        <View className="gap-[16px]">
          <GroupedSection caption="Account">
            <GroupedRow
              avatar={initialsFor(profile.user.name)}
              detail={[cooperativeName, profile.member?.code]
                .filter(Boolean)
                .join(" · ")}
              title={profile.user.name}
              trailing={
                <View className="rounded-full bg-accent px-[8px] py-[2px]">
                  <Text className="text-accent-foreground" variant="caption">
                    {roleLabel}
                  </Text>
                </View>
              }
            />
            <GroupedRow
              chevron
              detail="Switch cooperative or open a shortcut"
              icon="Users"
              onPress={() => router.push("/cooperative-shortcuts")}
              title="Cooperatives & shortcuts"
            />
            <GroupedRow
              chevron
              icon="LogOut"
              onPress={() => router.push("/account-privacy")}
              title="Close my account"
              tone="neutral"
            />
          </GroupedSection>
          <QaAccessPanel inline />
        </View>
      </ScreenShell>
      <ConfirmSheet
        confirmLabel="Sign out"
        description={SIGN_OUT_CONFIRM_DESCRIPTION}
        icon="LogOut"
        isConfirming={isSigningOut}
        onCancel={() => setIsSignOutConfirmVisible(false)}
        onConfirm={() => {
          setIsSigningOut(true)
          void signOut().finally(() => {
            setIsSigningOut(false)
            setIsSignOutConfirmVisible(false)
          })
        }}
        title="Sign out?"
        tone="destructive"
        visible={isSignOutConfirmVisible}
      />
    </>
  )
}
