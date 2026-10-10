export type BootstrapScreenMode = "loading" | "fatal"

type BootstrapPresentation = {
  actionLabel: string | null
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
  if (mode === "fatal") {
    return {
      actionLabel: retrying ? "Retrying" : "Try again",
      description:
        "Check your connection, then try again. Your saved session has not been opened.",
      note: "No financial or staff action can continue until access is verified.",
      title: "We couldn’t verify your workspace",
    }
  }

  return {
    actionLabel: null,
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
  return value === "loading" || value === "fatal" ? value : null
}
