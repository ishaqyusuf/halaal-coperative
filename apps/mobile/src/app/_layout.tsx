import { AppAutoUpdateModal } from "@/components/app-auto-update-modal"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { AuthProvider } from "@/hooks/use-auth"
import { useColorScheme } from "@/hooks/use-color"
import { nativewindThemeVars } from "@/lib/nativewind-theme-vars"
import { NAV_THEME } from "@/lib/theme"
import { getThemeOverride } from "@/lib/theme-preference"
import { TRPCReactProvider } from "@/trpc/client"
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet"
import { getErrorPresentation } from "@halaalvest/errors"
import FontAwesome from "@expo/vector-icons/FontAwesome"
import { ThemeProvider } from "@react-navigation/native"
import { useFonts } from "expo-font"
import { Stack } from "expo-router"
import type { ErrorBoundaryProps } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect, useMemo } from "react"
import { VariableContextProvider } from "nativewind"
import FlashMessage from "react-native-flash-message"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { KeyboardProvider } from "react-native-keyboard-controller"
import "react-native-reanimated"
import Toast from "react-native-toast-message"
import { View } from "react-native"
import "@/styles/global.css"

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const presentation = useMemo(() => getErrorPresentation(error), [error])

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

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  })

  useEffect(() => {
    if (error) throw error
  }, [error])

  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync()
  }, [loaded])

  if (!loaded) return null

  return <RootLayoutNav />
}

function RootLayoutNav() {
  const { colorScheme, setColorScheme } = useColorScheme()
  const navigationTheme =
    colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light
  const themeVariables = useMemo(
    () => nativewindThemeVars(colorScheme),
    [colorScheme]
  )

  useEffect(() => {
    let mounted = true
    void getThemeOverride().then((override) => {
      if (mounted) setColorScheme(override)
    })
    return () => {
      mounted = false
    }
  }, [setColorScheme])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <VariableContextProvider value={themeVariables}>
          <View className="flex-1 bg-background">
            <ThemeProvider value={navigationTheme}>
              <AuthProvider>
                <TRPCReactProvider>
                  <BottomSheetModalProvider>
                    <FlashMessage position="top" />
                    <AppAutoUpdateModal />
                    <StatusBar
                      style={colorScheme === "dark" ? "light" : "dark"}
                    />
                    <Stack
                      screenOptions={{
                        headerShadowVisible: false,
                        headerShown: false,
                      }}
                    >
                      <Stack.Screen name="index" />
                      <Stack.Screen name="(auth)" />
                      <Stack.Screen name="(member)" />
                      <Stack.Screen name="(admin)" />
                      <Stack.Screen name="updates" />
                      <Stack.Screen name="notifications" />
                      <Stack.Screen name="+not-found" />
                    </Stack>
                    <Toast />
                  </BottomSheetModalProvider>
                </TRPCReactProvider>
              </AuthProvider>
            </ThemeProvider>
          </View>
        </VariableContextProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  )
}
