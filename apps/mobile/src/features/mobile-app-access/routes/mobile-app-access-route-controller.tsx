import { ConfirmSheet } from "@/components/app/confirm-sheet"
import { SIGN_OUT_CONFIRM_DESCRIPTION } from "@/components/app/confirmation-sheet"
import { DockedHeroScreen } from "@/components/app/docked-hero-screen"
import { GateHero, gateIdentityFor } from "@/components/app/gate-hero"
import { LegalLinks } from "@/components/app/legal-links"
import { SettingsRow } from "@/components/app/settings-row"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { ListCard } from "@/components/ui/list-card"
import { Text } from "@/components/ui/text"
import { isMobileDevelopmentBuild } from "@/dev/mobile-dev-session"
import { QaAccessPanel } from "@/features/auth/public/qa-access"
import {
  projectAccessGate,
  resolveAccessGatePreview,
  resolveAccessGateState,
} from "@/features/mobile-app-access/model/access-gate-presentation"
import { useAuthContext } from "@/hooks/use-auth"
import { useMobileAppAccess } from "@/runtime/mobile-app-access-provider"
import { Redirect, useLocalSearchParams, useRouter } from "expo-router"
import { useState } from "react"

/**
 * The app-access gate (T03, 02 Brand hero): signed in, but this membership
 * may not use the app. The hero names the cooperative and the status; the
 * body says the cooperative manages app access. It never mentions a price,
 * plan, renewal, subscription or where access is turned on (owner rule,
 * ADR-20261116-mobile-no-subscription-copy). Refresh access is docked. Development builds
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

  return (
    <>
      <DockedHeroScreen
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
        hero={
          <GateHero
            chip={gate.chip}
            identity={gateIdentityFor(profile)}
            title={gate.title}
          />
        }
        testID="mobile-access-screen"
      >
        <Text
          accessibilityLiveRegion="polite"
          className="text-foreground-soft"
          variant="body"
        >
          {gate.body}
        </Text>
        <ListCard>
          <SettingsRow
            chevron
            detail="Switch cooperative or open a shortcut"
            icon="Users"
            onPress={() => router.push("/cooperative-shortcuts")}
            title="Cooperatives & shortcuts"
          />
        </ListCard>
        <QaAccessPanel inline />
        <LegalLinks variant="card" />
      </DockedHeroScreen>
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
