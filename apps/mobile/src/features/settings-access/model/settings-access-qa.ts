const settingsAccessQaStates = [
  "denied",
  "empty",
  "error",
  "invite-failed",
  "loading",
  "missing-prefix",
  "offline",
  "signout-error",
  "stale",
] as const

export type SettingsAccessQaState = (typeof settingsAccessQaStates)[number]

export function getSettingsAccessQaState(
  value: string | undefined,
  isDevelopment = typeof __DEV__ !== "undefined" && __DEV__
): SettingsAccessQaState | null {
  return isDevelopment
    ? (settingsAccessQaStates.find((state) => state === value) ?? null)
    : null
}
