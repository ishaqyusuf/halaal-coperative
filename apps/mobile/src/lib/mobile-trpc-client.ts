import { getBaseUrl } from "@/lib/base-url"
import { getToken } from "@/lib/session-store"
import { getMobileDeviceMetadata } from "@/platform/mobile-device-metadata"
import {
  notifyMobileSessionUnauthorized,
  shouldInvalidateUnauthorizedMobileSession,
} from "@/lib/mobile-session-invalidation"
import type { AppRouter } from "@halaalvest/api/trpc/routers/_app"
import { createTRPCClient, httpLink } from "@trpc/client"
import superjson from "superjson"

function getTrpcUrl() {
  return `${getBaseUrl()}/api/trpc`
}

export function createMobileTrpcClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpLink({
        methodOverride: "POST",
        fetch: async (url, options) => {
          const requestToken = getToken()
          const response = await fetch(url, options)

          if (
            shouldInvalidateUnauthorizedMobileSession({
              currentToken: getToken(),
              requestToken,
              responseStatus: response.status,
            })
          ) {
            notifyMobileSessionUnauthorized()
          }

          return response
        },
        headers: () => {
          const token = getToken()
          const device = getMobileDeviceMetadata()

          return {
            ...(token ? { authorization: `Bearer ${token}` } : {}),
            "x-mobile-app-version": device.appVersion,
            "x-mobile-build-variant": device.buildVariant,
            "x-mobile-device-id": device.deviceId,
            "x-mobile-device-label": device.deviceLabel,
            "x-mobile-platform": device.platform,
            "x-trpc-source": "mobile",
          }
        },
        transformer: superjson,
        url: getTrpcUrl(),
      }),
    ],
  }) as any
}
