import { isUnauthorizedMobileSessionError } from "@/runtime/mobile-runtime-state"
import Constants from "expo-constants"
import { Button } from "@/components/ui/button"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import {
  authorizeMobileQa,
  clearMobileQaAuthorization,
  enterMobileQaProfile,
  getMobileQaCapability,
  listMobileQaProfiles,
  loadMobileQaAuthorization,
  type MobileQaAuthorization,
  type MobileQaProfile,
} from "@/features/auth/api/mobile-qa-access"
import { QaDomainComposer } from "@/features/auth/components/qa-domain-composer"
import { QaProfileChooser } from "@/features/auth/components/qa-profile-chooser"
import { normalizeQaDomainInput } from "@/features/auth/model/qa-access-chooser"
import { useAuthContext } from "@/hooks/use-auth"
import { captureMobileError } from "@/lib/sentry"
import { useCallback, useEffect, useRef, useState } from "react"
import { Keyboard, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type Capability = "loading" | "available" | "unavailable" | "unreachable"

/** Delay that lets a closing sheet finish before the composer takes focus. */
const SHEET_HANDOFF_MS = 400

export function QaAccessPanel({ inline = false }: { inline?: boolean }) {
  if (Constants.expoConfig?.extra?.qaAcceleratorClient !== true) return null
  return <EnabledQaAccessPanel inline={inline} />
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function EnabledQaAccessPanel({ inline }: { inline: boolean }) {
  const { acceptServerProfile } = useAuthContext()
  const [capability, setCapability] = useState<Capability>("loading")
  const [environment, setEnvironment] = useState("")
  const [authorization, setAuthorization] =
    useState<MobileQaAuthorization | null>(null)
  const [qaDomain, setQaDomain] = useState("")
  const [domainDraft, setDomainDraft] = useState("")
  const [profiles, setProfiles] = useState<MobileQaProfile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [profilesError, setProfilesError] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerError, setComposerError] = useState<string | null>(null)
  const [authorizing, setAuthorizing] = useState(false)
  const [chooserOpen, setChooserOpen] = useState(false)
  const [enteringRef, setEnteringRef] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const loadProfiles = useCallback(
    async (nextAuthorization?: MobileQaAuthorization | null) => {
      const current = nextAuthorization ?? (await loadMobileQaAuthorization())
      if (!mounted.current) return
      setAuthorization(current)
      setProfilesError(null)
      if (!current) {
        setProfiles([])
        return
      }
      setProfilesLoading(true)
      try {
        const response = await listMobileQaProfiles(current)
        if (!mounted.current) return
        setQaDomain(response.qaDomain)
        setProfiles(response.profiles)
      } catch (error) {
        if (!mounted.current) return
        if (isUnauthorizedMobileSessionError(error)) {
          // Rejected, expired or malformed authorization: ask for the domain again.
          await clearMobileQaAuthorization()
          setAuthorization(null)
          setProfiles([])
          return
        }
        setProfilesError(
          "QA profiles could not be loaded. Check the connection or change QA Domain."
        )
      } finally {
        if (mounted.current) setProfilesLoading(false)
      }
    },
    []
  )

  const loadCapability = useCallback(async () => {
    setCapability("loading")
    try {
      const response = await getMobileQaCapability()
      if (!mounted.current) return
      setEnvironment(response.environment)
      setCapability(response.available ? "available" : "unavailable")
      if (response.available) {
        setComposerError(null)
        await loadProfiles()
      }
    } catch {
      if (mounted.current) setCapability("unreachable")
    }
  }, [loadProfiles])

  useEffect(() => {
    void loadCapability()
  }, [loadCapability])

  const closeComposer = useCallback(() => setComposerOpen(false), [])

  // Production-like servers report QA unavailable; render nothing there.
  if (capability === "loading" || capability === "unavailable") return null

  function openComposer() {
    setComposerError(null)
    setComposerOpen(true)
  }

  function openQa() {
    TextInput.State.currentlyFocusedInput()?.blur()
    if (capability !== "available" || !authorization) {
      openComposer()
      return
    }
    Keyboard.dismiss()
    setChooserOpen(true)
    void loadProfiles(authorization)
  }

  async function authorize() {
    if (authorizing) return
    const normalized = normalizeQaDomainInput(domainDraft)
    if (!normalized) {
      setComposerError("Enter a domain like name.qa.test")
      return
    }
    setAuthorizing(true)
    setComposerError(null)
    try {
      const next = await authorizeMobileQa({ qaDomain: normalized })
      if (!mounted.current) return
      setComposerOpen(false)
      Keyboard.dismiss()
      setQaDomain(normalized)
      setChooserOpen(true)
      await loadProfiles(next)
    } catch (error) {
      captureMobileError(error, "mobile.auth.qa_access")
      if (mounted.current) {
        setComposerError(
          errorMessage(error, "QA access could not be authorized.")
        )
      }
    } finally {
      if (mounted.current) setAuthorizing(false)
    }
  }

  async function enter(profile: MobileQaProfile) {
    if (!authorization || enteringRef) return
    setEnteringRef(profile.selectionRef)
    setProfilesError(null)
    try {
      const response = await enterMobileQaProfile({
        authorization,
        selectionRef: profile.selectionRef,
      })
      if (response.clientKind !== "mobile") throw new Error("Invalid QA client")
      await acceptServerProfile(response.profile)
      if (mounted.current) setChooserOpen(false)
    } catch (error) {
      captureMobileError(error, "mobile.auth.qa_access")
      if (mounted.current) {
        setProfilesError(
          errorMessage(error, "QA sign-in could not be completed.")
        )
      }
    } finally {
      if (mounted.current) setEnteringRef(null)
    }
  }

  async function changeDomain() {
    Keyboard.dismiss()
    setChooserOpen(false)
    await clearMobileQaAuthorization()
    if (!mounted.current) return
    setAuthorization(null)
    setProfiles([])
    setProfilesError(null)
    setDomainDraft(qaDomain)
    setTimeout(() => {
      if (mounted.current) openComposer()
    }, SHEET_HANDOFF_MS)
  }

  const profileCount =
    capability === "available" && authorization ? profiles.length : undefined

  return (
    <>
      {inline ? (
        <Button className="my-3 min-h-11" variant="outline" onPress={openQa}>
          <Text>QA workspace</Text>
        </Button>
      ) : (
        <QaFloatingButton
          count={profileCount}
          hidden={composerOpen || chooserOpen}
          onPress={openQa}
        />
      )}

      <QaDomainComposer
        errorText={
          capability === "unreachable"
            ? "Can’t reach the server. Check it is running."
            : composerError
        }
        loading={authorizing}
        onChangeText={(value) => {
          setDomainDraft(value)
          setComposerError(null)
        }}
        onClose={closeComposer}
        onRetry={
          capability === "unreachable" ? () => void loadCapability() : undefined
        }
        onSubmit={() => void authorize()}
        value={domainDraft}
        visible={composerOpen}
      />

      {authorization ? (
        <QaProfileChooser
          enteringRef={enteringRef}
          environment={environment}
          error={profilesError}
          loading={profilesLoading}
          onChangeDomain={() => void changeDomain()}
          onClose={() => setChooserOpen(false)}
          onEnter={(profile) => void enter(profile)}
          onRefresh={() => void loadProfiles(authorization)}
          profiles={profiles}
          qaDomain={qaDomain}
          visible={chooserOpen}
        />
      ) : null}
    </>
  )
}

/**
 * Round floating "QA" button for the signed-out sign-in screen, with the
 * profile count once a QA Domain is authorized. It steps aside while the
 * keyboard is up so it never covers the sign-in fields.
 */
function QaFloatingButton({
  count,
  hidden,
  onPress,
}: {
  count?: number
  hidden: boolean
  onPress: () => void
}) {
  const insets = useSafeAreaInsets()
  const [keyboardVisible, setKeyboardVisible] = useState(Keyboard.isVisible())

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true)
    )
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false)
    )
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  if (hidden || keyboardVisible) return null

  return (
    <View
      className="absolute z-20"
      pointerEvents="box-none"
      style={{
        bottom: Math.max(insets.bottom, 12) + 16,
        position: "absolute",
        right: Math.max(insets.right, 16),
      }}
      testID="qa-floating-button"
    >
      <Pressable
        accessibilityHint={
          count === undefined
            ? "Opens QA Domain setup above the keyboard"
            : "Shows the QA profiles for the authorized QA Domain"
        }
        accessibilityLabel={
          count === undefined ? "Set up QA access" : `Open ${count} QA profiles`
        }
        accessibilityRole="button"
        className="border-brand/20 size-14 items-center justify-center rounded-full border-[1.5px] bg-card shadow-md active:bg-muted"
        haptic
        onPress={onPress}
        testID="qa-fab"
      >
        <Text className="text-brand text-[15px] font-extrabold">QA</Text>
      </Pressable>
      {count === undefined ? null : (
        // Outside the button, which clips its children.
        <View
          className="bg-brand absolute -top-1 -right-1 h-[22px] min-w-[22px] items-center justify-center rounded-full border-2 border-background px-1"
          pointerEvents="none"
        >
          <Text className="text-brand-foreground text-[11px] font-bold">
            {count}
          </Text>
        </View>
      )}
    </View>
  )
}
