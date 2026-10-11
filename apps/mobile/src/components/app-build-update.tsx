import { useMobileAppAccess } from "@/runtime/mobile-app-access-provider"
import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { useAuthContext } from "@/hooks/use-auth"
import {
  APP_UPDATE_RESUME_KEY,
  cancelBuildDownload,
  dismissNativeBuild,
  downloadAndInstallBuild,
  resolveInstalledBuild,
  useAppUpdate,
} from "@/lib/app-update-client"
import { getAppUpdateResume } from "@/lib/app-update-restoration"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Linking from "expo-linking"
import { usePathname, useRouter, type Href } from "expo-router"
import { useEffect, useRef } from "react"
import { View } from "react-native"

export function AppBuildUpdate() {
  const state = useAppUpdate()
  const route = usePathname()
  const router = useRouter()
  const { profile, initializing } = useAuthContext()
  const restored = useRef(false)
  const access = useMobileAppAccess()
  useEffect(() => {
    if (initializing || !profile || !access.accessAllowed || restored.current)
      return
    restored.current = true
    let cancelled = false
    let incomingLink = false
    const subscription = Linking.addEventListener("url", () => {
      incomingLink = true
    })
    void (async () => {
      const installed = await resolveInstalledBuild()
      if (!installed) return
      const raw = await AsyncStorage.getItem(APP_UPDATE_RESUME_KEY)
      if (!raw) return
      const value = JSON.parse(raw)
      // Keep the snapshot while Android installation is still pending.
      if (installed.buildNumber < value.targetBuild) return
      await AsyncStorage.removeItem(APP_UPDATE_RESUME_KEY)
      if (await Linking.getInitialURL()) return
      const resume = getAppUpdateResume(value, {
        userId: profile.user.id,
        tenantId: profile.tenant.id,
        membershipId: profile.activeMembershipId,
        buildNumber: installed.buildNumber,
        now: Date.now(),
      })
      if (resume && !cancelled && !incomingLink) router.replace(resume as Href)
    })().catch(() => undefined)
    return () => {
      cancelled = true
      subscription.remove()
    }
  }, [initializing, profile, router, access.accessAllowed])
  if (!state.build) return null
  const downloading = state.phase === "downloading"
  const message =
    state.error ??
    (state.phase === "permission"
      ? "Allow Halaalvest Preview to install apps, then return here and try again."
      : state.phase === "installing"
        ? "Confirm installation in Android. If you cancelled, you can try again."
        : state.phase === "verifying"
          ? "Verifying the download and signing identity."
          : downloading
            ? `Downloading ${Math.round((state.progress ?? 0) * 100)}%`
            : "A newer Preview build is ready. Finish any unsaved work before installing. Your session stays on this device.")
  return (
    <FloatingBottomSheet
      title={`Preview build ${state.build.buildNumber}`}
      visible={state.visible}
      dismissible={!state.busy}
      onClose={() => void dismissNativeBuild()}
      presentation="compact"
      scrollable="auto"
    >
      <View className="gap-4 px-5 pb-6">
        <Text accessibilityLiveRegion="polite">{message}</Text>
        {state.build.notes ? <Text>{state.build.notes}</Text> : null}
        {downloading ? (
          <Button onPress={() => void cancelBuildDownload()} variant="outline">
            <Text>Cancel download</Text>
          </Button>
        ) : (
          <Button
            disabled={state.busy}
            onPress={() => void downloadAndInstallBuild(route)}
          >
            <Text>
              {state.phase === "failed" || state.phase === "installing"
                ? "Try again"
                : "Download & install"}
            </Text>
          </Button>
        )}
        <Button
          disabled={state.busy}
          onPress={() => void dismissNativeBuild()}
          variant="outline"
        >
          <Text>Later</Text>
        </Button>
      </View>
    </FloatingBottomSheet>
  )
}
