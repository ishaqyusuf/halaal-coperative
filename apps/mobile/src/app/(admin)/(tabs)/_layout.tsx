import { Icon } from "@/components/ui/icon"
import { useFullScreenFormVisibility } from "@/components/app/full-screen-form-visibility"
import { DockScene, DockTabBar } from "@/components/app/dock-tab-bar"
import { canViewMobileAdminReports } from "@/features/admin-reports-access/model/admin-reports-access-policy"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import { tabTransition } from "@/lib/screen-transition"
import { Tabs } from "expo-router"
import { useReducedMotion } from "react-native-reanimated"

export default function AdminTabsLayout() {
  const colors = useColors()
  const reduceMotion = useReducedMotion()
  const { profile } = useAuthContext()
  const { hideTabBar } = useFullScreenFormVisibility()
  const canViewReports = canViewMobileAdminReports(profile?.cooperativeRole)

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
          tabBarAccessibilityLabel: "Admin overview tab",
          title: "Overview",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="LayoutDashboard" className="size-md" />
          ),
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          tabBarAccessibilityLabel: "Admin members tab",
          title: "Members",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="Users" className="size-md" />
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          tabBarAccessibilityLabel: "Admin finance tab",
          title: "Finance",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="Wallet" className="size-md" />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          href: canViewReports ? undefined : null,
          tabBarAccessibilityLabel: "Admin reports tab",
          title: "Reports",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="FileText" className="size-md" />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarAccessibilityLabel: "More admin services tab",
          title: "More",
          tabBarIcon: ({ color }) => (
            <Icon color={color} name="Menu" className="size-md" />
          ),
        }}
      />
    </Tabs>
  )
}
