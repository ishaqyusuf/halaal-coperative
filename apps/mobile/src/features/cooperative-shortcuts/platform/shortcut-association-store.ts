import * as SecureStore from "expo-secure-store"

import {
  parseShortcutRegistry,
  type ShortcutRegistry,
} from "../model/shortcut-state"

const REGISTRY_KEY = "halaalvest_cooperative_shortcuts_v1"

let queue: Promise<unknown> = Promise.resolve()

export function readShortcutRegistry() {
  return parseShortcutRegistry(SecureStore.getItem(REGISTRY_KEY))
}

/**
 * Serialized read-modify-write. A failed write rejects so callers fail closed
 * instead of reporting a shortcut state that was never persisted.
 */
export function updateShortcutRegistry(
  update: (registry: ShortcutRegistry) => ShortcutRegistry
): Promise<ShortcutRegistry> {
  const run = queue.then(async () => {
    const next = update(readShortcutRegistry())
    await SecureStore.setItemAsync(REGISTRY_KEY, JSON.stringify(next))
    return next
  })
  queue = run.catch(() => undefined)
  return run
}
