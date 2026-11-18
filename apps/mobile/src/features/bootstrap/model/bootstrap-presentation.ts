export type BootstrapScreenMode = "loading" | "fatal" | "offline"

type BootstrapPresentation = {
  actionLabel: string | null
  /** Status chip on the hero (error modes only). */
  chip: { icon: string; label: string; tone: "danger" | "warm" } | null
  description: string
  note: string
  title: string
}

export function projectBootstrapPresentation({
  mode,
  retrying = false,
}: {
  mode: BootstrapScreenMode
  retrying?: boolean
}): BootstrapPresentation {
  if (mode === "fatal" || mode === "offline") {
    const offline = mode === "offline"
    return {
      actionLabel: retrying ? "Retrying" : "Try again",
      chip: offline
        ? { icon: "WifiOff", label: "Offline", tone: "warm" }
        : { icon: "ShieldAlert", label: "Not verified", tone: "danger" },
      description: offline
        ? "Connect to the internet, then try again. Your saved session has not been opened."
        : "Check your connection, then try again. Your saved session has not been opened.",
      note: "No financial or staff action can continue until access is verified.",
      title: offline ? "You’re offline" : "We couldn’t verify your workspace",
    }
  }

  return {
    actionLabel: null,
    chip: null,
    description: "Preparing your workspace and verifying cooperative access.",
    note: "Your saved session stays locked until the server confirms your access.",
    title: "HalaalVest",
  }
}

export function resolveBootstrapPreviewMode(
  value: string | undefined,
  isDevelopment: boolean
): BootstrapScreenMode | null {
  if (!isDevelopment) return null
  return value === "loading" || value === "fatal" || value === "offline"
    ? value
    : null
}
