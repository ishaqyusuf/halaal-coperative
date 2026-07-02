import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { type MobileProfile } from "@/lib/session-store";
import { View } from "react-native";

export function ProfileHeader({ profile }: { profile: MobileProfile }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <View className="flex-1">
        <Text className="text-sm text-muted-foreground">
          {profile.tenant.name}
        </Text>
        <Text className="text-2xl font-bold text-foreground">
          {profile.user.name}
        </Text>
      </View>
      <View className="h-12 w-12 items-center justify-center rounded-md bg-primary">
        <Icon name="User" className="size-md text-primary-foreground" />
      </View>
    </View>
  );
}
