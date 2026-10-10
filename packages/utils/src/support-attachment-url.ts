const privateUploadPath =
  /^\/api\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isSafeSupportAttachmentUrl(
  value: string | null | undefined
): value is string {
  if (!value || value !== value.trim() || value.length > 1000) return false
  for (const character of value) {
    const code = character.charCodeAt(0)
    if (code < 32 || code === 127 || character === "\\") return false
  }
  if (privateUploadPath.test(value)) return true

  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "")
    return (
      url.protocol === "https:" &&
      Boolean(hostname) &&
      hostname !== "localhost" &&
      !/\.(?:localhost|local|internal)$/.test(hostname) &&
      !/^\d+\.\d+\.\d+\.\d+$/.test(hostname) &&
      !hostname.startsWith("[") &&
      !url.username &&
      !url.password
    )
  } catch {
    return false
  }
}
