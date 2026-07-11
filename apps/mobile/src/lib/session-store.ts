import * as SecureStore from "expo-secure-store"

export const SESSION_KEY = "halaalvest_mobile_session"
const PROFILE_KEY = "halaalvest_mobile_profile"

export type MobileRole = "member" | "admin"
export type CooperativeRole =
  | "super_admin"
  | "tenant_admin"
  | "finance_officer"
  | "operations_officer"
  | "member"

export interface MobileProfile {
  token: string
  role: MobileRole
  cooperativeRole?: CooperativeRole
  availableRoles?: Array<{
    id: string
    isDefault: boolean
    role: CooperativeRole
    workspaceRole: MobileRole
  }>
  tenant: {
    id: string
    name: string
    slug: string
  }
  user: {
    id: string
    name: string
    email: string
  }
  member?: {
    id: string
    code: string
  }
}

export const getToken = () => SecureStore.getItem(SESSION_KEY)

export const setToken = (value: string) =>
  SecureStore.setItem(SESSION_KEY, value)

export const deleteToken = () => SecureStore.deleteItemAsync(SESSION_KEY)

export const getSessionProfile = (): MobileProfile | null => {
  const value = SecureStore.getItem(PROFILE_KEY)
  if (!value) return null

  try {
    return JSON.parse(value) as MobileProfile
  } catch {
    void deleteSessionProfile()
    return null
  }
}

export const setSessionProfile = (profile: MobileProfile) =>
  SecureStore.setItem(PROFILE_KEY, JSON.stringify(profile))

export const deleteSessionProfile = () =>
  SecureStore.deleteItemAsync(PROFILE_KEY)

export const clearSession = async () => {
  await Promise.all([deleteToken(), deleteSessionProfile()])
}

export const createMockProfile = (role: MobileRole): MobileProfile => ({
  token: `mock-${role}-session`,
  role,
  cooperativeRole: role === "admin" ? "tenant_admin" : "member",
  availableRoles: [
    {
      id: `mock-${role}-membership`,
      isDefault: true,
      role: role === "admin" ? "tenant_admin" : "member",
      workspaceRole: role,
    },
  ],
  tenant: {
    id: "tenant_halaalvest",
    name: "Halaalvest Cooperative",
    slug: "halaalvest",
  },
  user: {
    id: role === "admin" ? "admin_demo" : "member_demo",
    name: role === "admin" ? "Amina Admin" : "Yusuf Member",
    email:
      role === "admin" ? "admin@halaalvest.test" : "member@halaalvest.test",
  },
  member:
    role === "member"
      ? {
          code: "HV-1024",
          id: "member_demo",
        }
      : undefined,
})
