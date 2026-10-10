import { useAuthContext } from "@/hooks/use-auth"
import { BootstrapScreen } from "@/components/app/bootstrap-screen"
import { Redirect, type Href } from "expo-router"
import { useMobileAppAccess } from "@/runtime/mobile-app-access-provider"

export default function IndexRoute() {
  const { initializing, role } = useAuthContext()
  const access = useMobileAppAccess()

  if (initializing) return <BootstrapScreen />
  if (role && access.checking) return <BootstrapScreen />
  if (role && !access.accessAllowed)
    return <Redirect href={"/mobile-access" as Href} />
  if (role === "admin") return <Redirect href="/(admin)/(tabs)" />
  if (role === "member") return <Redirect href="/(member)/(tabs)" />

  return <Redirect href="/(auth)/sign-in" />
}
