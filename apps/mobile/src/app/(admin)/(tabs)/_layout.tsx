import { Icon } from "@/components/ui/icon"
import { useFullScreenFormVisibility } from "@/components/app/full-screen-form-visibility"
import { TabBarLabel } from "@/components/app/tab-bar-label"
import { canViewMobileAdminReports } from "@/features/admin-reports-access/model/admin-reports-access-policy"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import { Tabs } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { resolveTabBarGeometry } from "@/lib/tab-bar-geometry"

export default function AdminTabsLayout() {
  const colors = useColors()
  const insets = useSafeAreaInsets()
  const { profile } = useAuthContext()
  const { hideTabBar } = useFullScreenFormVisibility()
  const canViewReports = canViewMobileAdminReports(profile?.cooperativeRole)

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
          tabBarAccessibilityLabel: "Admin overview tab",
          tabBarLabel: ({ color }) => (
            <TabBarLabel color={color} label="Overview" />
          ),
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
          tabBarLabel: ({ color }) => (
            <TabBarLabel color={color} label="Members" />
          ),
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
          tabBarLabel: ({ color }) => (
            <TabBarLabel color={color} label="Finance" />
          ),
          title: "Finance",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="Wallet" className="size-base" />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          href: canViewReports ? undefined : null,
          tabBarAccessibilityLabel: "Admin reports tab",
          tabBarLabel: ({ color }) => (
            <TabBarLabel color={color} label="Reports" />
          ),
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
