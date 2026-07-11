import AsyncStorage from "@react-native-async-storage/async-storage"
import { useCallback, useEffect, useRef } from "react"

const MOBILE_FORM_DRAFT_PREFIX = "halaalvest_mobile_form_draft:"

type MobileFormDraftEnvelope<T> = {
  updatedAt: string
  value: T
}

function draftKey(key: string) {
  return `${MOBILE_FORM_DRAFT_PREFIX}${key}`
}

export function useMobileFormDraft<T>({
  enabled = true,
  key,
  onHydrate,
  value,
}: {
  enabled?: boolean
  key: string
  onHydrate: (value: T) => void
  value: T
}) {
  const hasHydratedRef = useRef(false)
  const onHydrateRef = useRef(onHydrate)

  useEffect(() => {
    onHydrateRef.current = onHydrate
  }, [onHydrate])

  useEffect(() => {
    let mounted = true
    hasHydratedRef.current = false

    if (!enabled) {
      hasHydratedRef.current = true
      return () => {
        mounted = false
      }
    }

    void AsyncStorage.getItem(draftKey(key))
      .then((cachedValue) => {
        if (!mounted || !cachedValue) return

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
  }, [enabled, key])

  useEffect(() => {
    if (!enabled || !hasHydratedRef.current) return

    void AsyncStorage.setItem(
      draftKey(key),
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        value,
      } satisfies MobileFormDraftEnvelope<T>)
    ).catch(() => {
      // Draft persistence is best-effort; server-confirmed submit remains source of truth.
    })
  }, [enabled, key, value])

  return useCallback(() => AsyncStorage.removeItem(draftKey(key)), [key])
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
