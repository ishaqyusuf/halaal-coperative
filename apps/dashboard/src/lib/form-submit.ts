"use client"

type SerializableFormValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number>

export function objectToFormData(
  input: Record<string, SerializableFormValue>,
  options?: {
    booleanMode?: "on-off" | "true-false"
  },
) {
  const formData = new FormData()
  const booleanMode = options?.booleanMode ?? "on-off"

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        formData.append(key, String(item))
      }
      continue
    }

    if (typeof value === "boolean") {
      if (booleanMode === "on-off") {
        if (value) {
          formData.append(key, "on")
        }
      } else {
        formData.append(key, value ? "true" : "false")
      }
      continue
    }

    formData.append(key, String(value))
  }

  return formData
}
