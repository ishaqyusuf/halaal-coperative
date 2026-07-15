import { Icon } from "@/components/ui/icon"
import { useColors } from "@/hooks/use-color"
import { Tabs } from "expo-router"

export default function AdminTabsLayout() {
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
          tabBarAccessibilityLabel: "Admin overview tab",
          title: "Overview",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="LayoutDashboard" className="size-base" />
          ),
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          tabBarAccessibilityLabel: "Admin members tab",
          title: "Members",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="Users" className="size-base" />
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          tabBarAccessibilityLabel: "Admin finance tab",
          title: "Finance",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="Wallet" className="size-base" />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          tabBarAccessibilityLabel: "Admin reports tab",
          title: "Reports",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="FileText" className="size-base" />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarAccessibilityLabel: "More admin services tab",
          title: "More",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="Menu" className="size-base" />
          ),
        }}
      />
    </Tabs>
  )
}
