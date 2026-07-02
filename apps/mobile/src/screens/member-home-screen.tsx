import { ProfileHeader } from "@/components/app/profile-header";
import { SectionCard } from "@/components/app/section-card";
import { ServiceTile } from "@/components/app/service-tile";
import { StatCard } from "@/components/app/stat-card";
import { SafeArea } from "@/components/safe-area";
import { Text } from "@/components/ui/text";
import { memberServices, memberStats } from "@/data/mobile-template";
import { useAuthContext } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-color";
import { ScrollView, View } from "react-native";

export function MemberHomeScreen() {
  const { profile } = useAuthContext();
  const colors = useColors();

  if (!profile) return null;

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-4">
        <ProfileHeader profile={profile} />

        <SectionCard icon="BadgeCheck" title="Member readiness">
          <View className="gap-2">
            <Text className="text-3xl font-black text-foreground">72%</Text>
            <Text className="text-sm leading-5 text-muted-foreground">
              Commitment profile is healthy. One financing document still needs
              review before the next request.
            </Text>
          </View>
        </SectionCard>

        <View className="flex-row flex-wrap gap-3">
          {memberStats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </View>

        <SectionCard icon="LayoutGrid" title="Services">
          <View className="flex-row flex-wrap justify-between gap-y-4">
            {memberServices.map((item) => (
              <ServiceTile key={item.label} {...item} />
            ))}
          </View>
        </SectionCard>
      </ScrollView>
    </SafeArea>
  );
}
