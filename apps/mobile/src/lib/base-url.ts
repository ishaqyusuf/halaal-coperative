import Constants from "expo-constants"
import { resolveMobileServiceUrl } from "./mobile-service-url"

const DEFAULT_DASHBOARD_PORT = "3000"
const DEFAULT_API_PORT = "1442"

const getDebuggerHostname = () => {
  const debuggerHost = Constants.expoConfig?.hostUri
  return debuggerHost?.split(":")[0] ?? null
}

export const getBaseUrl = () =>
  resolveMobileServiceUrl({
    configuredPort: process.env.EXPO_PUBLIC_API_PORT,
    configuredUrl: process.env.EXPO_PUBLIC_API_URL,
    debuggerHostname: getDebuggerHostname(),
    defaultPort: DEFAULT_API_PORT,
    requiredUrlName: "EXPO_PUBLIC_API_URL",
  })

export const getWebUrl = () =>
  resolveMobileServiceUrl({
    configuredPort: process.env.EXPO_PUBLIC_DASHBOARD_PORT,
    configuredUrl: process.env.EXPO_PUBLIC_DASHBOARD_URL,
    debuggerHostname: getDebuggerHostname(),
    defaultPort: DEFAULT_DASHBOARD_PORT,
    requiredUrlName: "EXPO_PUBLIC_DASHBOARD_URL",
  })
