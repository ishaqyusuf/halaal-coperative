// Verified Zeroes Organization App Store Connect identity selected by the owner
// for the HalaalVest public iOS release. Keep all three fields together.
export const iosReleaseIdentity: {
  status: "pending" | "approved"
  publisher: "organization" | "personal"
  teamId: string | null
  bundleIdentifier: string | null
  ascAppId: string | null
} = {
  status: "approved",
  publisher: "organization",
  teamId: "ZXC78SPCV4",
  bundleIdentifier: "com.halaalvest.mobile",
  ascAppId: "6815838235",
}

const verifiedZeroesIdentity = {
  teamId: "ZXC78SPCV4",
  bundleIdentifier: "com.halaalvest.mobile",
  ascAppId: "6815838235",
} as const

export function approvedIosReleaseIdentity(
  identity: typeof iosReleaseIdentity = iosReleaseIdentity
) {
  const { status, publisher, teamId, bundleIdentifier, ascAppId } = identity
  if (
    status !== "approved" ||
    publisher !== "organization" ||
    teamId !== verifiedZeroesIdentity.teamId ||
    bundleIdentifier !== verifiedZeroesIdentity.bundleIdentifier ||
    ascAppId !== verifiedZeroesIdentity.ascAppId
  ) {
    throw new Error(
      "iOS release identity does not match the approved Zeroes Organization app."
    )
  }
  return { teamId, bundleIdentifier, ascAppId }
}
