import { isUnauthorizedMobileSessionError } from "@/runtime/mobile-runtime-state"
import Constants from "expo-constants"
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
import { useSafeAreaInsets } from "react-native-safe-area-context"

export function QaAccessPanel({ inline = false }: { inline?: boolean }) {
  if (Constants.expoConfig?.extra?.qaAcceleratorClient !== true) return null
  return <EnabledQaAccessPanel inline={inline} />
}

function EnabledQaAccessPanel({ inline }: { inline: boolean }) {
  const { acceptServerProfile } = useAuthContext()
  const insets = useSafeAreaInsets()
  const largeTextLayout = useLargeTextLayout()
  const [available, setAvailable] = useState(false)
  const [environment, setEnvironment] = useState("")
  const [authorization, setAuthorization] =
    useState<MobileQaAuthorization | null>(null)
  const [search, setSearch] = useState("")
  const [profiles, setProfiles] = useState<MobileQaProfile[]>([])
  const [qaDomain, setQaDomain] = useState("")
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
    setProfiles([])
    let response
    try {
      response = await listMobileQaProfiles(current)
    } catch (error) {
      if (isUnauthorizedMobileSessionError(error)) {
        await clearMobileQaAuthorization()
        setAuthorization(null)
      }
      throw error
    }
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
        if (!mounted) return
        setError(
          "QA access could not be loaded. Check your connection and reopen QA access."
        )
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  if (!available) return null

  const canAuthorize = !pending && qaDomain.trim().length >= 3

  async function authorize() {
    if (pending) return
    Keyboard.dismiss()
    setPending(true)
    setError(null)
    try {
      const next = await authorizeMobileQa({ qaDomain })
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
    if (!authorization || pending) return
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
      setSheetVisible(false)
      setPending(false)
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
    setError(null)
  }

  function openSheet() {
    TextInput.State.currentlyFocusedInput()?.blur()
    Keyboard.dismiss()
    setError(null)
    setSheetVisible(true)
    void refresh().catch(() =>
      setError(
        "QA access could not be loaded. Check the connection or change QA Domain."
      )
    )
  }

  function closeSheet() {
    TextInput.State.currentlyFocusedInput()?.blur()
    Keyboard.dismiss()
    setError(null)
    if (!authorization) setQaDomain("")
    setSheetVisible(false)
  }

  return (
    <>
      {inline ? (
        <Button className="my-3 min-h-11" variant="outline" onPress={openSheet}>
          <Text>QA workspace</Text>
        </Button>
      ) : (
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
      )}

      <CompactFormSheet
        isSubmitting={pending}
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
            <Input
              accessibilityLabel="Search QA profiles"
              placeholder="Cooperative, name or role"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
            {profiles.length === 0 ? (
              <Text className="mt-3 text-sm text-muted-foreground">
                No eligible profiles are available for this QA Domain.
              </Text>
            ) : null}
            <View className="mt-4 overflow-hidden rounded-lg border border-border">
              {profiles
                .filter((profile) =>
                  [
                    profile.identityLabel,
                    profile.cooperativeName,
                    profile.role,
                    profile.memberCode,
                  ].some((value) =>
                    value?.toLowerCase().includes(search.trim().toLowerCase())
                  )
                )
                .map((profile, index) => (
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
              Enter your assigned QA Domain.
            </Text>
            <View className="gap-2">
              <Text className="text-sm font-semibold">QA Domain</Text>
              <Input
                accessibilityLabel="QA Domain"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setQaDomain}
                onSubmitEditing={() => {
                  Keyboard.dismiss()
                  if (canAuthorize) void authorize()
                }}
                placeholder="ishaq.qa.test"
                returnKeyType="go"
                submitBehavior="blurAndSubmit"
                value={qaDomain}
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
              QA access expires automatically and retains ordinary role
              permissions.
            </Text>
          </View>
        )}
      </CompactFormSheet>
    </>
  )
}
