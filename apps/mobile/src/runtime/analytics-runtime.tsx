import { setProductAnalyticsClient } from "@/lib/analytics"
import { useAuthContext } from "@/hooks/use-auth"
import { createNativeAnalytics } from "@halaalvest/events/native"
import * as SecureStore from "expo-secure-store"
import { useSegments } from "expo-router"
import { useEffect, useRef } from "react"
import Constants from "expo-constants"
import * as Crypto from "expo-crypto"
import { AppState, Platform } from "react-native"

const keyFor = (key: string) => key.replaceAll(":", ".")
const createAnalyticsId = () => Crypto.randomUUID()

export function AnalyticsRuntime() {
  const { profile, initializing, refreshSession } = useAuthContext()
  const context = profile?.analyticsContext
  const trackingAllowed =
    !initializing &&
    (!profile || (profile.analyticsEnabled === true && !profile.qaAuthorized))
  const permission = useRef(trackingAllowed)
  permission.current = trackingAllowed
  const segments = useSegments()
  const route =
    "/" +
    segments
      .filter((segment) => !segment.startsWith("(") && !segment.startsWith("["))
      .join("/")
  const latestRoute = useRef(route)
  latestRoute.current = route
  const client = useRef<ReturnType<typeof createNativeAnalytics> | null>(null)

  useEffect(() => {
    if (
      !trackingAllowed ||
      Platform.OS !== "android" ||
      Constants.expoConfig?.extra?.appVariant !== "production" ||
      process.env.EXPO_PUBLIC_LOGLY_ENABLED !== "true" ||
      process.env.EXPO_PUBLIC_LOGLY_PROJECT !== "halaalvest-mobile"
    )
      return
    const endpoint = process.env.EXPO_PUBLIC_LOGLY_ENDPOINT
    if (!endpoint || !endpoint.startsWith("https://")) return
    const analytics = createNativeAnalytics({
      endpoint,
      enabled: true,
      permission: () => permission.current,
      context: context ?? null,
      appVersion: Constants.nativeAppVersion ?? undefined,
      appBuild: Constants.nativeBuildVersion ?? undefined,
      createId: createAnalyticsId,
      storage: {
        getItem: (key) => SecureStore.getItem(keyFor(key)),
        setItem: (key, value) => SecureStore.setItem(keyFor(key), value),
        removeItem: (key) => {
          void SecureStore.deleteItemAsync(keyFor(key)).catch(() => {})
        },
      },
    })
    client.current = analytics
    analytics.init()
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        analytics.trackPageView({ route: latestRoute.current })
      }
      void analytics.flush()
    })
    return () => {
      listener.remove()
      setProductAnalyticsClient(null)
      analytics.destroy()
      client.current = null
    }
  }, [
    trackingAllowed,
    profile?.user.id,
    profile?.tenant.id,
    profile?.activeMembershipId,
  ])

  useEffect(() => {
    client.current?.setContext(context ?? null)
    setProductAnalyticsClient(client.current)
    client.current?.trackPageView({ route })
  }, [
    context,
    initializing,
    route,
    trackingAllowed,
    profile?.user.id,
    profile?.tenant.id,
    profile?.activeMembershipId,
  ])

  useEffect(() => {
    if (initializing) return
    if (profile && profile.analyticsEnabled === undefined) {
      void refreshSession(true).catch(() => {})
      return
    }
    if (!context || !client.current) return
    const refresh = () => {
      if (context.expiresAt - Date.now() <= 60_000)
        void refreshSession(true).catch(() => {})
    }
    refresh()
    const timer = setInterval(refresh, 60_000)
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh()
    })
    return () => {
      clearInterval(timer)
      listener.remove()
    }
  }, [
    context,
    initializing,
    profile?.analyticsEnabled,
    trackingAllowed,
    refreshSession,
  ])

  return null
}
