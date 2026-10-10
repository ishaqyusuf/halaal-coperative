export function resolveDashboardPublicLegalOrigin(value: string | undefined) {
  if (!value?.trim()) return null

  try {
    const url = new URL(value.trim())
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "")
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      hostname === "localhost" ||
      /\.(?:localhost|local|internal|invalid|test)$/.test(hostname) ||
      /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ||
      hostname.startsWith("[")
    ) {
      return null
    }

    return url.origin
  } catch {
    return null
  }
}
