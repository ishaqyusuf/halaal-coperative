import { requireOptionalNativeModule } from "expo"
import Constants from "expo-constants"
import { Platform } from "react-native"

import type { ShortcutSupport } from "../model/shortcut-policy"
import type { PinnedShortcut } from "../model/shortcut-state"

export type ShortcutEnvironment = "production" | "preview" | "development"

export type NativeShortcutSpec = {
  environment: ShortcutEnvironment
  id: string
  longLabel: string
  mark: string
  shortLabel: string
  /** Stored in the launcher's extras so storage loss can be recovered. */
  tenantId: string
  uri: string
}

export type NativePinResult =
  | "requested"
  | "already_pinned"
  | "rejected"
  | "unsupported"

type CooperativeShortcutsNativeModule = {
  addListener: (
    event: "onPinObserved",
    listener: (event: { id: string }) => void
  ) => { remove: () => void }
  consumeObservedPins: () => Promise<string[]>
  disable: (ids: string[], message: string) => Promise<number>
  enable: (id: string) => Promise<boolean>
  getSupport: () => Promise<
    Exclude<ShortcutSupport, "checking" | "unavailable">
  >
  listPinned: () => Promise<PinnedShortcut[]>
  requestPin: (spec: NativeShortcutSpec) => Promise<NativePinResult>
  update: (spec: NativeShortcutSpec) => Promise<boolean>
}

// Absent on iOS, web, Expo Go and binaries built before this module shipped;
// every caller must treat null as "unavailable" and keep normal navigation.
const native =
  Platform.OS === "android"
    ? requireOptionalNativeModule<CooperativeShortcutsNativeModule>(
        "CooperativeShortcuts"
      )
    : null

export const cooperativeShortcutNative = native

export function getShortcutAppIdentity() {
  const appVariant = String(
    Constants.expoConfig?.extra?.appVariant ?? "production"
  ).toLowerCase()
  const environment: ShortcutEnvironment =
    appVariant === "preview"
      ? "preview"
      : appVariant === "development" ||
          appVariant === "dev" ||
          appVariant === "local"
        ? "development"
        : "production"
  const configuredScheme = Constants.expoConfig?.scheme
  const scheme = Array.isArray(configuredScheme)
    ? configuredScheme[0]
    : configuredScheme
  return { environment, scheme: scheme ?? null, variant: environment }
}

export async function readShortcutSupport(): Promise<ShortcutSupport> {
  if (!native || !getShortcutAppIdentity().scheme) return "unavailable"
  try {
    return await native.getSupport()
  } catch {
    return "unavailable"
  }
}
