import { Icon } from "@/components/ui/icon"
import { useFullScreenFormVisibility } from "@/components/app/full-screen-form-visibility"
import { TabBarLabel } from "@/components/app/tab-bar-label"
import { useColors } from "@/hooks/use-color"
import { Tabs } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { resolveTabBarGeometry } from "@/lib/tab-bar-geometry"

export default function MemberTabsLayout() {
  const colors = useColors()
  const insets = useSafeAreaInsets()
  const { hideTabBar } = useFullScreenFormVisibility()

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
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          display: hideTabBar ? "none" : "flex",
          ...resolveTabBarGeometry(insets.bottom),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarAccessibilityLabel: "Member home tab",
          tabBarLabel: ({ color }) => (
            <TabBarLabel color={color} label="Home" />
          ),
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="Home" className="size-base" />
          ),
        }}
      />
      <Tabs.Screen
        name="commitments"
        options={{
          tabBarAccessibilityLabel: "Commitments and savings tab",
          tabBarLabel: ({ color }) => (
            <TabBarLabel color={color} label="Plans" />
          ),
          title: "Plans",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="BadgeCheck" className="size-base" />
          ),
        }}
      />
      <Tabs.Screen
        name="financing"
        options={{
          tabBarAccessibilityLabel: "Financing tab",
          tabBarLabel: ({ color }) => (
            <TabBarLabel color={color} label="Finance" />
          ),
          title: "Finance",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="HandCoins" className="size-base" />
          ),
        }}
      />
      <Tabs.Screen
        name="shares"
        options={{
          tabBarAccessibilityLabel: "Shares tab",
          tabBarLabel: ({ color }) => (
            <TabBarLabel color={color} label="Shares" />
          ),
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
          tabBarLabel: ({ color }) => (
            <TabBarLabel color={color} label="More" />
          ),
          title: "More",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="Menu" className="size-base" />
          ),
        }}
      />
    </Tabs>
  )
}
