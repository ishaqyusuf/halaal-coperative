import { useAppLockContext } from "@/features/app-lock/hooks/use-app-lock"
import { AppLockScreen } from "@/features/app-lock/screens/app-lock-screen"
import { useAuthContext } from "@/hooks/use-auth"
import { useRouter } from "expo-router"
import { useCallback } from "react"

export function AppLockRouteController() {
  const appLock = useAppLockContext()
  const auth = useAuthContext()
  const router = useRouter()

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace("/")
  }, [router])

  return (
    <AppLockScreen
      biometricsStatus={appLock.biometricsStatus}
      config={appLock.config}
      cooperativeName={auth.profile?.tenant.name ?? "HalaalVest"}
      isHydrated={appLock.isHydrated}
      onBack={handleBack}
      onClearLock={appLock.clearLock}
      onLockNow={appLock.lockNow}
      onRefreshBiometrics={appLock.refreshBiometrics}
      onSetBiometricsEnabled={appLock.setBiometricsEnabled}
      onSetCode={appLock.setCode}
      onSetRelockAfterMs={appLock.setRelockAfterMs}
      onVerifyCode={appLock.unlockWithCode}
      userName={auth.profile?.user.name ?? "Member"}
    />
  )
}
