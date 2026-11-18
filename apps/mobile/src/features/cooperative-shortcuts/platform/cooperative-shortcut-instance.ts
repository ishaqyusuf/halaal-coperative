import { getRandomBytes } from "expo-crypto"

import { captureMobileError } from "@/lib/sentry"

import {
  cooperativeShortcutNative,
  getShortcutAppIdentity,
} from "./cooperative-shortcut-platform"
import { createCooperativeShortcutService } from "./cooperative-shortcut-service"
import {
  readShortcutRegistry,
  updateShortcutRegistry,
} from "./shortcut-association-store"

export const cooperativeShortcutService = createCooperativeShortcutService({
  identity: getShortcutAppIdentity(),
  native: cooperativeShortcutNative,
  now: Date.now,
  randomBytes: getRandomBytes,
  readRegistry: readShortcutRegistry,
  reportError: (error) =>
    captureMobileError(error, "mobile.cooperative_shortcuts"),
  updateRegistry: updateShortcutRegistry,
})
