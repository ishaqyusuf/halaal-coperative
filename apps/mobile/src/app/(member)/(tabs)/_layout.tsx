import { Icon } from "@/components/ui/icon";
import { useColors } from "@/hooks/use-color";
import { Tabs } from "expo-router";

export default function MemberTabsLayout() {
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="Home" className="size-base" />
          ),
        }}
      />
      <Tabs.Screen
        name="commitments"
        options={{
          title: "Commitments",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="BadgeCheck" className="size-base" />
          ),
        }}
      />
      <Tabs.Screen
        name="financing"
        options={{
          title: "Financing",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="HandCoins" className="size-base" />
          ),
        }}
      />
      <Tabs.Screen
        name="shares"
        options={{
          title: "Shares",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="PieChart" className="size-base" />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="Menu" className="size-base" />
          ),
        }}
      />
    </Tabs>
  );
}
