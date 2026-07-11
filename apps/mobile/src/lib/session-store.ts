import * as SecureStore from "expo-secure-store"

export const SESSION_KEY = "halaalvest_mobile_session"
const PROFILE_KEY = "halaalvest_mobile_profile"
const DEVICE_ID_KEY = "halaalvest_mobile_device_id"

export type MobileRole = "member" | "admin"
export type CooperativeRole =
  | "super_admin"
  | "tenant_admin"
  | "finance_officer"
  | "operations_officer"
  | "member"

export interface MobileProfile {
  activeMembershipId: string
  token: string
  role: MobileRole
  cooperativeRole?: CooperativeRole
  availableRoles?: {
    id: string
    isDefault: boolean
    role: CooperativeRole
    workspaceRole: MobileRole
  }[]
  tenant: {
    branding: {
      accentColor: string | null
      logoUrl: string | null
      mark: string
      primaryColor: string | null
    }
    currencyCode: string
    id: string
    name: string
    slug: string
    timezone: string
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

export const isMockSessionToken = (value: string | null | undefined) =>
  Boolean(value?.startsWith("mock-"))

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

function createMobileDeviceId() {
  const randomUuid = globalThis.crypto?.randomUUID?.()
  const randomId =
    randomUuid ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

  return `mobile-${randomId}`
}

export const getOrCreateMobileDeviceId = () => {
  const existing = SecureStore.getItem(DEVICE_ID_KEY)

  if (existing) return existing

  const deviceId = createMobileDeviceId()
  SecureStore.setItem(DEVICE_ID_KEY, deviceId)

  return deviceId
}

export const clearSession = async () => {
  await Promise.all([deleteToken(), deleteSessionProfile()])
}

export const createMockProfile = (role: MobileRole): MobileProfile => ({
  activeMembershipId: `mock-${role}-membership`,
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
    branding: {
      accentColor: null,
      logoUrl: null,
      mark: "HC",
      primaryColor: null,
    },
    currencyCode: "NGN",
    id: "tenant_halaalvest",
    name: "Halaalvest Cooperative",
    slug: "halaalvest",
    timezone: "Africa/Lagos",
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
