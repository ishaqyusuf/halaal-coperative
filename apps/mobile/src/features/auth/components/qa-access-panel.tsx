import { CompactFormSheet } from "@/components/app/compact-form-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
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
import { useAuthContext } from "@/hooks/use-auth"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { captureMobileError } from "@/lib/sentry"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { Keyboard, Pressable, TextInput, View } from "react-native"
import { KeyboardController } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export function QaAccessPanel() {
  const { acceptServerProfile } = useAuthContext()
  const insets = useSafeAreaInsets()
  const largeTextLayout = useLargeTextLayout()
  const [available, setAvailable] = useState(false)
  const [environment, setEnvironment] = useState("")
  const [authorization, setAuthorization] =
    useState<MobileQaAuthorization | null>(null)
  const [profiles, setProfiles] = useState<MobileQaProfile[]>([])
  const [qaDomain, setQaDomain] = useState("")
  const [credential, setCredential] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [sheetVisible, setSheetVisible] = useState(false)

  async function refresh(nextAuthorization?: MobileQaAuthorization | null) {
    const current = nextAuthorization ?? (await loadMobileQaAuthorization())
    setAuthorization(current)
    if (!current) {
      setProfiles([])
      return
    }
    const response = await listMobileQaProfiles(current)
    setQaDomain(response.qaDomain)
    setProfiles(response.profiles)
  }

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const capability = await getMobileQaCapability()
        if (!mounted || !capability.available) return
        setAvailable(true)
        setEnvironment(capability.environment)
        await refresh()
      } catch {
        await clearMobileQaAuthorization()
        if (!mounted) return
        setAuthorization(null)
        setProfiles([])
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  if (!available) return null

  const canAuthorize =
    !pending && qaDomain.trim().length >= 3 && credential.length >= 16

  async function authorize() {
    Keyboard.dismiss()
    setPending(true)
    setError(null)
    try {
      const next = await authorizeMobileQa({ credential, qaDomain })
      setCredential("")
      await refresh(next)
    } catch (authorizationError) {
      captureMobileError(authorizationError, "mobile.auth.qa_access")
      setError(
        authorizationError instanceof Error && authorizationError.message
          ? authorizationError.message
          : "QA access could not be authorized."
      )
    } finally {
      setPending(false)
    }
  }

  async function enter(profile: MobileQaProfile) {
    if (!authorization) return
    Keyboard.dismiss()
    setPending(true)
    setError(null)
    try {
      const response = await enterMobileQaProfile({
        authorization,
        selectionRef: profile.selectionRef,
      })
      if (response.clientKind !== "mobile") throw new Error("Invalid QA client")
      await acceptServerProfile(response.profile)
    } catch (handoffError) {
      captureMobileError(handoffError, "mobile.auth.qa_access")
      setError(
        handoffError instanceof Error && handoffError.message
          ? handoffError.message
          : "QA sign-in could not be completed."
      )
      setPending(false)
    }
  }

  async function clear() {
    await clearMobileQaAuthorization()
    setAuthorization(null)
    setProfiles([])
    setQaDomain("")
    setCredential("")
    setError(null)
  }

  function openSheet() {
    TextInput.State.currentlyFocusedInput()?.blur()
    Keyboard.dismiss()
    setError(null)
    setSheetVisible(true)
  }

  function closeSheet() {
    TextInput.State.currentlyFocusedInput()?.blur()
    Keyboard.dismiss()
    setCredential("")
    setError(null)
    if (!authorization) setQaDomain("")
    setSheetVisible(false)
  }

  return (
    <>
      <View
        className="absolute z-20 h-11 w-11"
        pointerEvents="box-none"
        style={{
          bottom: Math.max(insets.bottom, 16) + 12,
          left: 24,
          position: "absolute",
        }}
      >
        <Button
          accessibilityLabel={
            authorization ? "Update QA access" : "Open QA access"
          }
          accessibilityHint="Opens optional tester access in a floating bottom sheet"
          className="h-11 w-11 rounded-full border border-border bg-card p-0"
          onPress={openSheet}
          size="icon"
          variant="link"
        >
          <Icon className="size-sm text-brand" name="KeyRound" />
        </Button>
      </View>

      <CompactFormSheet
        onClose={closeSheet}
        title={authorization ? "Update QA access" : "Set up QA access"}
        visible={sheetVisible}
      >
        <View
          className={cn(
            "gap-3 rounded-lg bg-muted px-3 py-2",
            largeTextLayout
              ? "items-start"
              : "flex-row items-center justify-between"
          )}
        >
          <View className="min-w-0 flex-1">
            <Text className="text-success text-xs font-bold tracking-widest uppercase">
              QA access · {environment}
            </Text>
            <Text className="mt-1 text-sm font-semibold text-foreground">
              {authorization ? qaDomain : "Not configured"}
            </Text>
          </View>
          <View className="rounded-full border border-border bg-card px-2 py-1">
            <Text className="text-[11px] font-semibold text-muted-foreground">
              Optional
            </Text>
          </View>
        </View>

        {authorization ? (
          <View>
            <Text className="text-sm leading-5 text-muted-foreground">
              Choose a test profile.
            </Text>
            <View className="mt-4 overflow-hidden rounded-lg border border-border">
              {profiles.map((profile, index) => (
                <Pressable
                  accessibilityRole="button"
                  disabled={pending || !profile.eligible}
                  key={profile.selectionRef}
                  onPress={() => void enter(profile)}
                  className={cn(
                    "min-h-16 gap-3 px-3 py-3 active:bg-muted",
                    largeTextLayout ? "items-start" : "flex-row items-center",
                    index > 0 && "border-t border-border"
                  )}
                >
                  <View className="size-9 items-center justify-center rounded-md bg-muted">
                    <Text className="text-xs font-black">
                      {profile.identityLabel
                        .split(/\s+/)
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")}
                    </Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text
                      className="font-bold"
                      numberOfLines={largeTextLayout ? undefined : 1}
                    >
                      {profile.identityLabel}
                    </Text>
                    <Text
                      className="text-xs text-muted-foreground"
                      numberOfLines={largeTextLayout ? undefined : 1}
                    >
                      {profile.cooperativeName}
                      {profile.memberCode ? ` · ${profile.memberCode}` : ""}
                    </Text>
                    {largeTextLayout ? (
                      <Text className="mt-1 text-xs font-bold text-muted-foreground uppercase">
                        {profile.role.replaceAll("_", " ")}
                      </Text>
                    ) : null}
                  </View>
                  {largeTextLayout ? null : (
                    <Text className="text-[10px] font-bold text-muted-foreground uppercase">
                      {profile.role.replaceAll("_", " ")}
                    </Text>
                  )}
                  <Text accessible={false}>→</Text>
                </Pressable>
              ))}
            </View>
            {error ? (
              <Text
                accessibilityLiveRegion="assertive"
                className="mt-3 text-sm text-destructive"
              >
                {error}
              </Text>
            ) : null}
            <Button
              className="mt-4"
              disabled={pending}
              onPress={() => void clear()}
              variant="outline"
            >
              <Text>Change QA Domain</Text>
            </Button>
            <Text className="mt-3 text-xs leading-5 text-muted-foreground">
              No password is returned, displayed, or filled.
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            <Text className="text-sm leading-5 text-muted-foreground">
              Use the exact assigned domain and tester credential.
            </Text>
            <View className="gap-2">
              <Text className="text-sm font-semibold">QA Domain</Text>
              <Input
                accessibilityLabel="QA Domain"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setQaDomain}
                onSubmitEditing={() => KeyboardController.setFocusTo("next")}
                placeholder="ishaq.qa.test"
                returnKeyType="next"
                submitBehavior="submit"
                value={qaDomain}
              />
            </View>
            <View className="gap-2">
              <Text className="text-sm font-semibold">Tester credential</Text>
              <Input
                accessibilityLabel="Tester credential"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setCredential}
                onSubmitEditing={() => {
                  Keyboard.dismiss()
                  if (canAuthorize) void authorize()
                }}
                returnKeyType="go"
                secureTextEntry
                submitBehavior="blurAndSubmit"
                value={credential}
              />
            </View>
            {error ? (
              <Text
                accessibilityLiveRegion="assertive"
                className="text-sm text-destructive"
              >
                {error}
              </Text>
            ) : null}
            <Button
              className={cn("h-12", !canAuthorize && "bg-muted opacity-100")}
              disabled={!canAuthorize}
              onPress={() => void authorize()}
            >
              <Text className={cn(!canAuthorize && "text-muted-foreground")}>
                {pending ? "Authorizing" : "Authorize this device"}
              </Text>
            </Button>
            <Text className="text-xs leading-5 text-muted-foreground">
              The credential is discarded after server authorization.
            </Text>
          </View>
        )}
      </CompactFormSheet>
    </>
  )
}
