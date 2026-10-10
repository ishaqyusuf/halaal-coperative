import AsyncStorage from "@react-native-async-storage/async-storage"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { createMobileFormDraftWriter } from "@/lib/mobile-form-draft-writer"
import {
  getMobilePersistenceScope,
  requireMobilePersistenceScope,
} from "@/runtime/persistence-scope"

const MOBILE_FORM_DRAFT_PREFIX = "halaalvest_mobile_form_draft:"

type MobileFormDraftEnvelope<T> = {
  updatedAt: string
  value: T
}

function draftKey(key: string, scopeKey: string) {
  return `${MOBILE_FORM_DRAFT_PREFIX}${scopeKey}:${key}`
}

export type MobileFormDraftMetadata = {
  ageMs: number
  scope: string
  updatedAt: string
}

export async function getMobileFormDraftMetadata(
  key: string
): Promise<MobileFormDraftMetadata | null> {
  const scope = requireMobilePersistenceScope()
  const cachedValue = await AsyncStorage.getItem(draftKey(key, scope.key))
  if (!cachedValue) return null

  const parsed = JSON.parse(cachedValue) as MobileFormDraftEnvelope<unknown>
  return {
    ageMs: Math.max(0, Date.now() - new Date(parsed.updatedAt).getTime()),
    scope: scope.key,
    updatedAt: parsed.updatedAt,
  }
}

export function useMobileFormDraft<T>({
  enabled = true,
  freezeAfterClear = false,
  key,
  onHydrate,
  value,
}: {
  enabled?: boolean
  /** Only opt in when closing resets enabled/key before the next editor opens. */
  freezeAfterClear?: boolean
  key: string
  onHydrate: (value: T) => void
  value: T
}) {
  const hasHydratedRef = useRef(false)
  const onHydrateRef = useRef(onHydrate)
  const scopeKey = enabled ? getMobilePersistenceScope()?.key : null
  const writer = useMemo(
    () => scopeKey ? createMobileFormDraftWriter(AsyncStorage, draftKey(key, scopeKey), { freezeAfterClear }) : null,
    [freezeAfterClear, key, scopeKey]
  )

  useEffect(() => {
    onHydrateRef.current = onHydrate
  }, [onHydrate])

  useEffect(() => {
    let mounted = true
    hasHydratedRef.current = false

    if (!writer) {
      hasHydratedRef.current = true
      return () => {
        mounted = false
      }
    }

    void AsyncStorage.getItem(writer.key)
      .then((cachedValue) => {
        if (!mounted || !cachedValue || !writer.canHydrate()) return

        const parsed = JSON.parse(cachedValue) as MobileFormDraftEnvelope<T>
        onHydrateRef.current(parsed.value)
      })
      .catch(() => {
        // Invalid or inaccessible drafts should never block the live form.
      })
      .finally(() => {
        if (mounted) {
          hasHydratedRef.current = true
        }
      })

    return () => {
      mounted = false
    }
  }, [writer])

  useEffect(() => {
    if (!writer || !hasHydratedRef.current) return

    void writer.write(
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        value,
      } satisfies MobileFormDraftEnvelope<T>)
    ).catch(() => {
      // Draft persistence is best-effort; server-confirmed submit remains source of truth.
    })
  }, [writer, value])

  return useCallback(
    () =>
      writer ? writer.clear() : Promise.resolve(),
    [writer]
  )
}

export async function clearMobileFormDrafts() {
  const keys = await AsyncStorage.getAllKeys()
  const draftKeys = keys.filter((key) =>
    key.startsWith(MOBILE_FORM_DRAFT_PREFIX)
  )

  if (draftKeys.length > 0) {
    await AsyncStorage.multiRemove(draftKeys)
  }
}
