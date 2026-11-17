import { AppBuildUpdate } from "@/components/app-build-update"
import { AnalyticsRuntime } from "@/runtime/analytics-runtime"
import "react-native-reanimated"

import { AppAutoUpdateModal } from "@/components/app-auto-update-modal"
import { DevQuickFillLayer } from "@/components/app/dev-quick-fill-layer"
import { FullScreenFormSheetLayer } from "@/components/app/full-screen-form-sheet-layer"
import { FullScreenFormVisibilityProvider } from "@/components/app/full-screen-form-visibility"
import {
  AppAccessibilityBackground,
  ModalAccessibilityProvider,
} from "@/components/app/modal-accessibility-isolation"
import { BootstrapScreen } from "@/components/app/bootstrap-screen"
import { OverlayStatusBar } from "@/components/app/screen-status-bar"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { AuthProvider, useAuthContext } from "@/hooks/use-auth"
import {
  applyThemeOverride,
  useColorScheme,
} from "@/hooks/use-color"
import { nativewindThemeVars } from "@/lib/nativewind-theme-vars"
import {
  captureMobileError,
  initializeMobileSentry,
  runMobileObservabilitySmokeTest,
} from "@/lib/sentry"
import { getMobileErrorReport } from "@/lib/sentry-policy"
import { NAV_THEME } from "@/lib/theme"
import { SPLASH_LOGO } from "@/lib/splash-logo"
import { getThemeOverride } from "@/lib/theme-preference"
import { MobileRuntimeBanner } from "@/runtime/mobile-runtime-banner"
import { AppLockRuntime } from "@/runtime/app-lock-runtime"
import { CooperativeShortcutRuntime } from "@/runtime/cooperative-shortcut-runtime"
import { MobileRuntimeGate } from "@/runtime/mobile-runtime-gate"
import { MobileRuntimeProvider } from "@/runtime/mobile-runtime-provider"
import { NotificationRuntime } from "@/runtime/notification-runtime"
import { TRPCReactProvider } from "@/trpc/client"
import {
  MobileAppAccessProvider,
  useMobileAppAccess,
} from "@/runtime/mobile-app-access-provider"
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet"
import { getErrorPresentation } from "@halaalvest/errors"
import FontAwesome from "@expo/vector-icons/FontAwesome"
import { ThemeProvider } from "@react-navigation/native"
import { useFonts } from "expo-font"
import { Stack } from "expo-router"
import type { ErrorBoundaryProps } from "expo-router"
import { Asset } from "expo-asset"
import * as SplashScreen from "expo-splash-screen"
import { useEffect, useMemo, useState } from "react"
import { VariableContextProvider } from "nativewind"
import FlashMessage from "react-native-flash-message"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { KeyboardProvider } from "react-native-keyboard-controller"
import Toast from "react-native-toast-message"
import { View } from "react-native"
import "@/styles/global.css"

initializeMobileSentry()
runMobileObservabilitySmokeTest()

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const classifiedError = useMemo(
    () => getMobileErrorReport(error, "mobile.error_boundary").classified,
    [error]
  )
  const presentation = useMemo(
    () => getErrorPresentation(classifiedError),
    [classifiedError]
  )

  useEffect(() => {
    captureMobileError(classifiedError, "mobile.error_boundary")
  }, [classifiedError])

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <View className="w-full max-w-md items-center rounded-xl border border-border bg-card p-6">
        <Text className="text-center text-xl font-semibold">
          {presentation.title}
        </Text>
        <Text className="mt-3 text-center text-sm text-muted-foreground">
          {presentation.description}
        </Text>
        <Text className="mt-2 text-center text-xs text-muted-foreground">
          {presentation.reference}
        </Text>
        <Button className="mt-6" onPress={() => void retry()}>
          <Text>Try again</Text>
        </Button>
      </View>
    </View>
  )
}

SplashScreen.preventAutoHideAsync()
// The native splash fades into the JS splash, which shows the same tile.
SplashScreen.setOptions({ duration: 220, fade: true })

export default function RootLayout() {
  const [themeReady, setThemeReady] = useState(false)
  // Preload the splash tile so the JS splash never shows an empty first frame.
  const [logoReady, setLogoReady] = useState(false)
  useEffect(() => {
    let mounted = true
    void Asset.loadAsync(SPLASH_LOGO)
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setLogoReady(true)
      })
    return () => {
      mounted = false
    }
  }, [])
  const [loaded, error] = useFonts({
    SpaceMono: require("../../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  })

  useEffect(() => {
    if (error) throw error
  }, [error])

  useEffect(() => {
    let mounted = true
    void getThemeOverride()
      .then(applyThemeOverride)
      .catch(() => applyThemeOverride("system"))
      .finally(() => {
        if (mounted) setThemeReady(true)
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (loaded && themeReady && logoReady) void SplashScreen.hideAsync()
  }, [loaded, logoReady, themeReady])

  if (!loaded || !themeReady || !logoReady) return null

  return <RootLayoutNav />
}

function RootLayoutNav() {
  const { colorScheme } = useColorScheme()
  const navigationTheme =
    colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light
  const themeVariables = useMemo(
    () => nativewindThemeVars(colorScheme),
    [colorScheme]
  )

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Android is edge-to-edge (gradle edgeToEdgeEnabled); say so explicitly.
          Auto-detection fails in this dev client, so the provider padded the
          root by the status bar: a black strip above every screen plus a
          doubled top inset on safe-area screens (T02, Android device). */}
      <KeyboardProvider navigationBarTranslucent statusBarTranslucent>
        <VariableContextProvider value={themeVariables}>
          <View className="flex-1 bg-background">
            <ThemeProvider value={navigationTheme}>
              <TRPCReactProvider>
                <AuthProvider>
                  <MobileAppAccessProvider>
                    <AnalyticsRuntime />
                    <AuthorizedNotificationRuntime>
                      <AppLockRuntime>
                        <MobileRuntimeProvider>
                          <ModalAccessibilityProvider>
                            <BottomSheetModalProvider>
                              <FullScreenFormVisibilityProvider>
                                <AppAccessibilityBackground>
                                  <FlashMessage position="top" />
                                  <MobileRuntimeGate>
                                    <CooperativeShortcutRuntime>
                                      <MobileRuntimeBanner />
                                      <AppAutoUpdateModal />
                                      <AppBuildUpdate />
                                      <OverlayStatusBar />
                                      <RoleProtectedStack />
                                    </CooperativeShortcutRuntime>
                                  </MobileRuntimeGate>
                                  <Toast />
                                  <DevQuickFillLayer />
                                </AppAccessibilityBackground>
                                <FullScreenFormSheetLayer />
                              </FullScreenFormVisibilityProvider>
                            </BottomSheetModalProvider>
                          </ModalAccessibilityProvider>
                        </MobileRuntimeProvider>
                      </AppLockRuntime>
                    </AuthorizedNotificationRuntime>
                  </MobileAppAccessProvider>
                </AuthProvider>
              </TRPCReactProvider>
            </ThemeProvider>
          </View>
        </VariableContextProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  )
}

function AuthorizedNotificationRuntime({
  children,
}: {
  children: React.ReactNode
}) {
  const access = useMobileAppAccess()
  return access.accessAllowed ? (
    <NotificationRuntime>{children}</NotificationRuntime>
  ) : (
    children
  )
}

function RoleProtectedStack() {
  const { initializing, role } = useAuthContext()
  const access = useMobileAppAccess()

  if (initializing) return <BootstrapScreen />

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" options={{ animation: "fade" }} />
      {/* Neutral launcher-shortcut resolver; it defers to every gate below. */}
      <Stack.Screen name="cooperative-shortcut/[shortcutId]" />
      {/* Neutral saved-answer and draft link landings (website paths); each
          waits for auth, app lock and app access, then re-authorizes. */}
      <Stack.Screen name="assistant/m/[messageId]" />
      <Stack.Screen name="assistant/review/[proposalId]" />
      <Stack.Protected guard={role === null}>
        <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
      </Stack.Protected>
      <Stack.Protected guard={role === "member" && access.accessAllowed}>
        <Stack.Screen name="(member)" options={{ animation: "fade" }} />
      </Stack.Protected>
      <Stack.Protected guard={role === "admin" && access.accessAllowed}>
        <Stack.Screen name="(admin)" options={{ animation: "fade" }} />
      </Stack.Protected>
      <Stack.Protected guard={role !== null}>
        <Stack.Screen name="mobile-access" options={{ animation: "fade" }} />
        <Stack.Screen name="account-privacy" />
        <Stack.Screen name="legal-agreements" />
        <Stack.Screen name="cooperative-shortcuts" />
      </Stack.Protected>
      <Stack.Protected guard={role !== null && access.accessAllowed}>
        <Stack.Screen name="updates" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="sessions" />
        <Stack.Screen name="app-lock" />
      </Stack.Protected>
      <Stack.Screen name="+not-found" />
    </Stack>
  )
}
