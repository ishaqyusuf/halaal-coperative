import * as SecureStore from "expo-secure-store"

const MOBILE_QA_AUTHORIZATION_KEY = "halaalvest.qa.authorization.v1"

export type MobileQaAuthorization = {
  authorizationToken: string
  expiresAt: string
  qaDomain: string
}

export async function loadMobileQaAuthorization() {
  const value = await SecureStore.getItemAsync(MOBILE_QA_AUTHORIZATION_KEY)
  if (!value) return null

  try {
    const authorization = JSON.parse(value) as MobileQaAuthorization
    if (
      typeof authorization.authorizationToken !== "string" ||
      !authorization.authorizationToken ||
      typeof authorization.qaDomain !== "string" ||
      !authorization.qaDomain ||
      !Number.isFinite(Date.parse(authorization.expiresAt)) ||
      Date.parse(authorization.expiresAt) <= Date.now()
    ) {
      await clearMobileQaAuthorization()
      return null
    }
    return authorization
  } catch {
    await clearMobileQaAuthorization()
    return null
  }
}

export function saveMobileQaAuthorization(
  authorization: MobileQaAuthorization
) {
  return SecureStore.setItemAsync(
    MOBILE_QA_AUTHORIZATION_KEY,
    JSON.stringify(authorization)
  )
}

export function clearMobileQaAuthorization() {
  return SecureStore.deleteItemAsync(MOBILE_QA_AUTHORIZATION_KEY)
}
