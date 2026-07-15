import { Icon } from "@/components/ui/icon"
import { useColors } from "@/hooks/use-color"
import { Tabs } from "expo-router"

export default function MemberTabsLayout() {
  const colors = useColors()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarItemStyle: {
          minHeight: 56,
          paddingVertical: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          minHeight: 64,
          paddingBottom: 6,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarAccessibilityLabel: "Member home tab",
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="Home" className="size-base" />
          ),
        }}
      />
      <Tabs.Screen
        name="commitments"
        options={{
          tabBarAccessibilityLabel: "Commitments tab",
          title: "Commitments",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="BadgeCheck" className="size-base" />
          ),
        }}
      />
      <Tabs.Screen
        name="financing"
        options={{
          tabBarAccessibilityLabel: "Financing tab",
          title: "Financing",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="HandCoins" className="size-base" />
          ),
        }}
      />
      <Tabs.Screen
        name="shares"
        options={{
          tabBarAccessibilityLabel: "Shares tab",
          title: "Shares",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="PieChart" className="size-base" />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarAccessibilityLabel: "More member services tab",
          title: "More",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="Menu" className="size-base" />
          ),
        }}
      />
    </Tabs>
  )
}
