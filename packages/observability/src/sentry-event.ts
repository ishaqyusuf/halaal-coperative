export type SentryEventSanitizerOptions = {
  allowedExtraKeys?: readonly string[]
  allowedTagKeys?: readonly string[]
}

type UnknownRecord = Record<string, unknown>

const BASE_TAG_KEYS = [
  "error_category",
  "error_code",
  "error_reference",
  "operation",
  "request_id",
  "retryable",
  "runtime",
  "source",
] as const

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null
}

function boundedString(value: unknown, maxLength = 200) {
  return typeof value === "string" ? value.slice(0, maxLength) : undefined
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function sanitizeFilename(value: unknown) {
  const filename = boundedString(value, 500)
  if (!filename) return undefined

  try {
    const url = new URL(filename)
    return url.pathname.slice(0, 500)
  } catch {
    return filename.split(/[?#]/, 1)[0]?.slice(0, 500)
  }
}

function sanitizeFrame(value: unknown) {
  const frame = record(value)
  if (!frame) return null

  const sanitized = {
    colno: finiteNumber(frame.colno),
    filename: sanitizeFilename(frame.filename),
    function: boundedString(frame.function),
    lineno: finiteNumber(frame.lineno),
    module: boundedString(frame.module),
  }

  return Object.fromEntries(
    Object.entries(sanitized).filter((entry) => entry[1] !== undefined)
  )
}

function sanitizeException(value: unknown, errorCode: string | undefined) {
  const exception = record(value)
  const values = Array.isArray(exception?.values) ? exception.values : []
  const sanitizedValues = values.flatMap((candidate) => {
    const exceptionValue = record(candidate)
    if (!exceptionValue) return []
    const stacktrace = record(exceptionValue.stacktrace)
    const frames = Array.isArray(stacktrace?.frames)
      ? stacktrace.frames.flatMap((frame) => {
          const sanitized = sanitizeFrame(frame)
          return sanitized ? [sanitized] : []
        })
      : []
    const type = boundedString(exceptionValue.type) ?? "Error"

    return [
      {
        ...(frames.length > 0 ? { stacktrace: { frames } } : {}),
        type,
        value: `Captured ${errorCode ?? "application error"}`,
      },
    ]
  })

  return sanitizedValues.length > 0 ? { values: sanitizedValues } : undefined
}

function sanitizeTags(
  value: unknown,
  additionalAllowedKeys: readonly string[]
) {
  const input = record(value)
  const allowed = new Set<string>([...BASE_TAG_KEYS, ...additionalAllowedKeys])
  const output: Record<string, string> = {}

  for (const key of allowed) {
    const item = boundedString(input?.[key])
    if (item !== undefined) output[key] = item
  }

  return output
}

function sanitizeExtra(value: unknown, allowedKeys: readonly string[]) {
  const input = record(value)
  const output: Record<string, boolean | number | string | null> = {}

  for (const key of allowedKeys) {
    const item = input?.[key]
    if (
      item === null ||
      typeof item === "boolean" ||
      typeof item === "number"
    ) {
      output[key] = item
    } else if (typeof item === "string") {
      output[key] = item.slice(0, 200)
    }
  }

  return output
}

export function sanitizeSentryEvent(
  value: unknown,
  options: SentryEventSanitizerOptions = {}
) {
  const event = record(value) ?? {}
  const tags = sanitizeTags(event.tags, options.allowedTagKeys ?? [])
  const errorCode = tags.error_code
  if (!errorCode || !tags.error_reference || !tags.runtime || !tags.source) {
    return null
  }
  const operation = tags.operation ?? "unknown"
  const exception = sanitizeException(event.exception, errorCode)
  const extra = sanitizeExtra(event.extra, options.allowedExtraKeys ?? [])

  const output = {
    dist: boundedString(event.dist),
    environment: boundedString(event.environment),
    event_id: boundedString(event.event_id),
    exception,
    extra: Object.keys(extra).length > 0 ? extra : undefined,
    fingerprint: errorCode ? [errorCode, operation] : undefined,
    level: boundedString(event.level),
    platform: boundedString(event.platform),
    release: boundedString(event.release),
    tags: Object.keys(tags).length > 0 ? tags : undefined,
    timestamp: finiteNumber(event.timestamp),
  }

  return Object.fromEntries(
    Object.entries(output).filter((entry) => entry[1] !== undefined)
  )
}

export function getSourceMapUploadConfig(input: {
  authToken?: string
  environment?: string
  org?: string
  project?: string
  release?: string
}) {
  const authToken = input.authToken?.trim()
  const org = input.org?.trim()
  const project = input.project?.trim()
  const release = input.release?.trim()

  if (
    input.environment !== "production" ||
    !authToken ||
    !org ||
    !project ||
    !release
  ) {
    return null
  }

  return { authToken, org, project, release }
}
