const LEGACY_STRICT_SSL_MODES = new Set(["prefer", "require", "verify-ca"])

export function normalizePostgresConnectionString(connectionString: string) {
  const url = new URL(connectionString)
  const sslMode = url.searchParams.get("sslmode")

  if (sslMode && LEGACY_STRICT_SSL_MODES.has(sslMode)) {
    url.searchParams.set("sslmode", "verify-full")
  }

  return url.toString()
}
