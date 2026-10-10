export type SentryEventSanitizerOptions = {
  allowedExtraKeys?: readonly string[]
  allowedTagKeys?: readonly string[]
}

type UnknownRecord = Record<string, unknown>

const MAX_EXCEPTION_VALUES = 4
const MAX_STACK_FRAMES = 80
const MAX_ADDITIONAL_KEYS = 24

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

  let pathname: string
  let protocol: string | undefined
  try {
    const url = new URL(filename)
    pathname = url.pathname
    protocol = url.protocol
  } catch {
    pathname = filename.split(/[?#]/, 1)[0] ?? ""
  }
  pathname = pathname.replace(/\\/g, "/")

  const codeFile = /\.(?:js|jsx|mjs|cjs|ts|tsx|bundle|java|kt|cpp|mm|h|so)$/i

  // Only build-owned web assets can retain their URL path. Other URL paths may
  // contain member IDs or request parameters even after the query is removed.
  if (protocol === "http:" || protocol === "https:") {
    if (
      !/^\/(?:_next\/static|static\/js)\/[A-Za-z0-9_./-]+$/.test(pathname) ||
      !codeFile.test(pathname)
    ) {
      return "external-source"
    }
  } else if (/^(?:[a-z]:\/|\/)/i.test(pathname)) {
    // Absolute stack paths can contain workstation usernames, Android app-data
    // IDs, and private export filenames. Retain only recognized code roots.
    const sourceRoot = pathname.search(/\/(?:apps|packages|src|node_modules)\//)
    const codePath = sourceRoot >= 0 ? pathname.slice(sourceRoot + 1) : ""
    pathname = codeFile.test(codePath) ? codePath : "local-source"
  }

  return (
    pathname.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 500) || undefined
  )
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
  const values = Array.isArray(exception?.values)
    ? exception.values.slice(0, MAX_EXCEPTION_VALUES)
    : []
  const sanitizedValues = values.flatMap((candidate) => {
    const exceptionValue = record(candidate)
    if (!exceptionValue) return []
    const stacktrace = record(exceptionValue.stacktrace)
    const frames = Array.isArray(stacktrace?.frames)
      ? stacktrace.frames.slice(-MAX_STACK_FRAMES).flatMap((frame) => {
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
  const allowed = new Set<string>([
    ...BASE_TAG_KEYS,
    ...additionalAllowedKeys.slice(0, MAX_ADDITIONAL_KEYS),
  ])
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

  for (const key of allowedKeys.slice(0, MAX_ADDITIONAL_KEYS)) {
    const item = input?.[key]
    if (
      item === null ||
      typeof item === "boolean" ||
      (typeof item === "number" && Number.isFinite(item))
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
