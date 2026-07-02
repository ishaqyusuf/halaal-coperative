import { useAuthContext } from "@/hooks/use-auth";
import { LoadingScreen } from "@/screens/loading-screen";
import { Redirect } from "expo-router";

export default function IndexRoute() {
  const { initializing, role } = useAuthContext();

  if (initializing) return <LoadingScreen />;
  if (role === "admin") return <Redirect href="/(admin)/(tabs)" />;
  if (role === "member") return <Redirect href="/(member)/(tabs)" />;

  return <Redirect href="/(auth)/sign-in" />;
}
