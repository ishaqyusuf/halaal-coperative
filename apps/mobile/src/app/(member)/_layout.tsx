import { useAuthContext } from "@/hooks/use-auth";
import { LoadingScreen } from "@/screens/loading-screen";
import { Redirect, Stack } from "expo-router";

export default function MemberLayout() {
  const { initializing, role } = useAuthContext();

  if (initializing) return <LoadingScreen />;
  if (role !== "member") return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
