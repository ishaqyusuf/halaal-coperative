import type { CooperativeRole } from "@halaalvest/auth/roles"

export type DashboardWorkspace =
  | "overview"
  | "members"
  | "finance"
  | "communications"
  | "experience"
  | "settings"

export type DashboardNavStatus = "live" | "upcoming"

export type DashboardNavItem = {
  description?: string
  href: string
  key: string
  roles?: CooperativeRole[]
  status?: DashboardNavStatus
  title: string
}

export type DashboardNavSection = {
  items: DashboardNavItem[]
  key: string
  title?: string
}

export type DashboardNavModule = {
  key: string
  sections: DashboardNavSection[]
  subtitle?: string
  title: string
  workspace: DashboardWorkspace
}
