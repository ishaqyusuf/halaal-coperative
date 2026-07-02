import { SafeArea } from "@/components/safe-area";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useAuthContext } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-color";
import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";

export function MoreScreen() {
  const { profile, signOut } = useAuthContext();
  const colors = useColors();
  const router = useRouter();

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View className="gap-2">
          <Text className="text-3xl font-black text-foreground">More</Text>
          <Text className="text-base text-muted-foreground">
            {profile?.role === "admin" ? "Admin workspace" : "Member workspace"}
          </Text>
        </View>

        <View className="gap-3 rounded-md border border-border bg-card p-4">
          {["Profile", "Notifications", "Documents", "Support"].map((item) => (
            <View className="flex-row items-center gap-3 py-2" key={item}>
              <Icon name="ChevronRight" className="size-sm text-muted-foreground" />
              <Text className="text-base text-foreground">{item}</Text>
            </View>
          ))}
        </View>

        <Button
          className="h-12"
          onPress={async () => {
            await signOut();
            router.replace("/");
          }}
          variant="outline"
        >
          <Icon name="LogOut" className="size-base text-foreground" />
          <Text>Sign out</Text>
        </Button>
      </ScrollView>
    </SafeArea>
  );
}
