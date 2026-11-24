import { Icon } from "@/components/ui/icon"
import { useFullScreenFormVisibility } from "@/components/app/full-screen-form-visibility"
import { DockScene, DockTabBar } from "@/components/app/dock-tab-bar"
import { useColors } from "@/hooks/use-color"
import { tabTransition } from "@/lib/screen-transition"
import { Tabs } from "expo-router"
import { useReducedMotion } from "react-native-reanimated"

export default function MemberTabsLayout() {
  const colors = useColors()
  const reduceMotion = useReducedMotion()
  const { hideTabBar } = useFullScreenFormVisibility()

  return (
    <Tabs
      screenLayout={({ children }) => <DockScene>{children}</DockScene>}
      screenOptions={{
        headerShown: false,
        ...tabTransition(reduceMotion),
        tabBarActiveTintColor: colors.accentForeground,
        tabBarInactiveTintColor: colors.mutedForeground,
      }}
      tabBar={(props) => <DockTabBar {...props} hidden={hideTabBar} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarAccessibilityLabel: "Member home tab",
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="Home" className="size-md" />
          ),
        }}
      />
      <Tabs.Screen
        name="commitments"
        options={{
          tabBarAccessibilityLabel: "Commitments and savings tab",
          title: "Plans",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="BadgeCheck" className="size-md" />
          ),
        }}
      />
      <Tabs.Screen
        name="financing"
        options={{
          tabBarAccessibilityLabel: "Financing tab",
          title: "Finance",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="HandCoins" className="size-md" />
          ),
        }}
      />
      <Tabs.Screen
        name="shares"
        options={{
          tabBarAccessibilityLabel: "Shares tab",
          title: "Shares",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="PieChart" className="size-md" />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarAccessibilityLabel: "More member services tab",
          title: "More",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="Menu" className="size-md" />
          ),
        }}
      />
    </Tabs>
  )
}
