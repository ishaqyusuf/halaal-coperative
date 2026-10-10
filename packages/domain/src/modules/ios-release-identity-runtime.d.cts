export type IosReleaseIdentity = {
  status: "pending" | "approved"
  publisher: "organization" | "personal"
  teamId: string | null
  bundleIdentifier: string | null
  ascAppId: string | null
}
export const iosReleaseIdentity: IosReleaseIdentity
export function approvedIosReleaseIdentity(identity?: IosReleaseIdentity): {
  teamId: string
  bundleIdentifier: string
  ascAppId: string
}
