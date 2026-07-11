import { getBaseUrl } from "@/lib/base-url"
import { getToken, type MobileProfile } from "@/lib/session-store"
import type { AppRouter } from "@halaalvest/api/trpc/routers/_app"
import { createTRPCClient, httpLink } from "@trpc/client"
import superjson from "superjson"

export type MobileSignInCredentials = {
  email: string
  password: string
  tenantSlug: string
}

type MobileSignInResponse = {
  profile: MobileProfile
}

type MobileSessionResponse = {
  profile: MobileProfile
}

function getTrpcUrl() {
  return `${getBaseUrl()}/api/trpc`
}

function createMobileAuthClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpLink({
        headers: () => {
          const token = getToken()

          return {
            ...(token ? { authorization: `Bearer ${token}` } : {}),
            "x-trpc-source": "mobile",
          }
        },
        transformer: superjson,
        url: getTrpcUrl(),
      }),
    ],
  })
}

export async function signInWithMobileAuth(input: MobileSignInCredentials) {
  const client = createMobileAuthClient()

  return client.auth.mobile.signIn.mutate(
    input
  ) as Promise<MobileSignInResponse>
}

export async function getCurrentMobileProfile() {
  const client = createMobileAuthClient()

  return client.auth.mobile.me.query() as Promise<MobileSessionResponse>
}

export async function signOutMobileAuth() {
  const client = createMobileAuthClient()

  return client.auth.mobile.signOut.mutate()
}
