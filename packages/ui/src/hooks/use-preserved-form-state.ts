"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { FieldValues, UseFormReturn } from "react-hook-form"

type StorageKind = "local" | "session"

function getStorage(kind: StorageKind) {
  if (typeof window === "undefined") {
    return null
  }

  try {
    return kind === "local" ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

function fingerprintBaseline(value: string) {
  let hash = 5381

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index)
  }

  return (hash >>> 0).toString(36)
}

function buildStorageKey(storageKey: string, baselineKey?: string) {
  const baselineSuffix = baselineKey
    ? `:baseline:${fingerprintBaseline(baselineKey)}`
    : ""

  if (typeof window === "undefined") {
    return `${storageKey}${baselineSuffix}`
  }

  return `halaalvest:form-state:${window.location.host}:${storageKey}${baselineSuffix}`
}

function readStoredValue<TValue>(storageKey: string, storageKind: StorageKind) {
  const storage = getStorage(storageKind)
  const storedValue = storage?.getItem(storageKey)

  if (!storedValue) {
    return null
  }

  try {
    return JSON.parse(storedValue) as TValue
  } catch {
    storage?.removeItem(storageKey)
    return null
  }
}

function writeStoredValue<TValue>(
  storageKey: string,
  storageKind: StorageKind,
  value: TValue
) {
  const storage = getStorage(storageKind)

  try {
    storage?.setItem(storageKey, JSON.stringify(value))
  } catch {
    // Storage may be unavailable or full. The in-memory form state still works.
  }
}

export function usePreservedClientState<TValue>({
  baselineKey,
  enabled = true,
  onRestore,
  storage = "session",
  storageKey,
  value,
}: {
  baselineKey?: string
  enabled?: boolean
  onRestore: (value: TValue) => void
  storage?: StorageKind
  storageKey: string
  value: TValue
}) {
  const scopedStorageKey = useMemo(
    () => buildStorageKey(storageKey, baselineKey),
    [baselineKey, storageKey]
  )
  const [canPersist, setCanPersist] = useState(false)
  const skipNextPersistRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const storedValue = readStoredValue<TValue>(scopedStorageKey, storage)

    if (storedValue !== null) {
      onRestore(storedValue)
    }

    setCanPersist(true)
  }, [enabled, onRestore, scopedStorageKey, storage])

  useEffect(() => {
    if (!enabled || !canPersist) {
      return
    }

    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false
      return
    }

    writeStoredValue(scopedStorageKey, storage, value)
  }, [canPersist, enabled, scopedStorageKey, storage, value])

  return useCallback(() => {
    skipNextPersistRef.current = true
    getStorage(storage)?.removeItem(scopedStorageKey)
  }, [scopedStorageKey, storage])
}

export function usePreservedFormState<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  {
    baselineKey,
    enabled = true,
    storage = "session",
    storageKey,
  }: {
    baselineKey?: string
    enabled?: boolean
    storage?: StorageKind
    storageKey: string
  }
) {
  const scopedStorageKey = useMemo(
    () => buildStorageKey(storageKey, baselineKey),
    [baselineKey, storageKey]
  )
  const restoredRef = useRef(false)
  const skipNextPersistRef = useRef(false)

  useEffect(() => {
    if (!enabled || restoredRef.current) {
      return
    }

    const storedValues = readStoredValue<Partial<TFieldValues>>(
      scopedStorageKey,
      storage
    )

    if (storedValues && typeof storedValues === "object") {
      form.reset(
        {
          ...form.getValues(),
          ...storedValues,
        } as TFieldValues,
        { keepDefaultValues: true }
      )
    }

    restoredRef.current = true
  }, [enabled, form, scopedStorageKey, storage])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const subscription = form.watch((values) => {
      if (!restoredRef.current) {
        return
      }

      if (skipNextPersistRef.current) {
        skipNextPersistRef.current = false
        return
      }

      writeStoredValue(scopedStorageKey, storage, values)
    })

    return () => subscription.unsubscribe()
  }, [enabled, form, scopedStorageKey, storage])

  return useCallback(() => {
    skipNextPersistRef.current = true
    getStorage(storage)?.removeItem(scopedStorageKey)
  }, [scopedStorageKey, storage])
}
