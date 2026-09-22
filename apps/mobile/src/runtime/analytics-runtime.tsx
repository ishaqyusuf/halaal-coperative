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
    analytics.trackPageView({ route: latestRoute.current })
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        analytics.trackPageView({ route: latestRoute.current })
      }
      void analytics.flush()
    })
    return () => {
      listener.remove()
      void analytics.flush().finally(() => analytics.destroy())
      client.current = null
    }
  }, [])

  useEffect(() => {
    client.current?.trackPageView({ route })
  }, [route])

  return null
}
