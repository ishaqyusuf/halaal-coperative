import { ProfileHeader } from "@/components/app/profile-header";
import { SectionCard } from "@/components/app/section-card";
import { StatCard } from "@/components/app/stat-card";
import { SafeArea } from "@/components/safe-area";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { adminExceptions, adminStats } from "@/data/mobile-template";
import { useAuthContext } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-color";
import { ScrollView, View } from "react-native";

export function AdminHomeScreen() {
  const { profile } = useAuthContext();
  const colors = useColors();

  if (!profile) return null;

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-4">
        <ProfileHeader profile={profile} />

        <View className="flex-row flex-wrap gap-3">
          {adminStats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </View>

        <SectionCard icon="CircleAlert" title="Admin attention">
          <View className="gap-3">
            {adminExceptions.map((item) => (
              <View
                className="flex-row gap-3 rounded-md bg-secondary p-3"
                key={item.label}
              >
                <Icon name="ArrowUpRight" className="size-base text-accent" />
                <View className="flex-1 gap-1">
                  <Text className="font-semibold text-foreground">
                    {item.label}
                  </Text>
                  <Text className="text-sm font-medium text-foreground">
                    {item.value}
                  </Text>
                  <Text className="text-xs leading-5 text-muted-foreground">
                    {item.detail}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </SectionCard>
      </ScrollView>
    </SafeArea>
  );
}
