type VercelProjectDomainVerification = {
  domain: string
  reason: string
  type: string
  value: string
}

type VercelProjectDomain = {
  apexName: string
  createdAt: number
  customEnvironmentId?: string | null
  gitBranch?: string | null
  name: string
  projectId: string
  redirect?: string | null
  redirectStatusCode?: number | null
  updatedAt: number
  verification?: VercelProjectDomainVerification[]
  verified: boolean
}

type VercelProvisioningStatus = "failed" | "pending_verification" | "skipped" | "verified"

export type VercelTenantDomainProvisioningResult = {
  checkedAt: string
  errorCode: string | null
  errorMessage: string | null
  hostname: string
  lookupMethod: "vercel_api"
  projectDomain: VercelProjectDomain | null
  projectIdOrName: string | null
  provider: "vercel"
  status: VercelProvisioningStatus
  teamId: string | null
  teamSlug: string | null
  verification: VercelProjectDomainVerification[]
}

function getVercelProvisioningConfig() {
  const token = process.env.HALAAL_VEST_VERCEL_API_TOKEN?.trim() || null
  const projectIdOrName = process.env.HALAAL_VEST_VERCEL_PROJECT_ID?.trim() || null
  const teamId = process.env.HALAAL_VEST_VERCEL_TEAM_ID?.trim() || null
  const teamSlug = process.env.HALAAL_VEST_VERCEL_TEAM_SLUG?.trim() || null

  return {
    isConfigured: Boolean(token && projectIdOrName),
    projectIdOrName,
    teamId,
    teamSlug,
    token,
  }
}

function buildQueryString(input: { teamId: string | null; teamSlug: string | null }) {
  const params = new URLSearchParams()

  if (input.teamId) {
    params.set("teamId", input.teamId)
  }

  if (input.teamSlug) {
    params.set("slug", input.teamSlug)
  }

  const value = params.toString()
  return value ? `?${value}` : ""
}

async function requestVercel<T>(
  path: string,
  input: {
    body?: Record<string, unknown>
    method?: "GET" | "POST"
  },
) {
  const config = getVercelProvisioningConfig()

  if (!config.token) {
    throw new Error("Missing HALAAL_VEST_VERCEL_API_TOKEN")
  }

  const response = await fetch(`https://api.vercel.com${path}`, {
    method: input.method ?? "GET",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  return {
    ok: response.ok,
    payload: payload as T,
    status: response.status,
  }
}

function toFailureResult(input: {
  checkedAt: string
  errorCode: string | null
  errorMessage: string
  hostname: string
  projectIdOrName: string | null
  teamId: string | null
  teamSlug: string | null
}): VercelTenantDomainProvisioningResult {
  return {
    checkedAt: input.checkedAt,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    hostname: input.hostname,
    lookupMethod: "vercel_api",
    projectDomain: null,
    projectIdOrName: input.projectIdOrName,
    provider: "vercel",
    status: "failed",
    teamId: input.teamId,
    teamSlug: input.teamSlug,
    verification: [],
  }
}

export async function provisionTenantDomainOnVercel(
  hostname: string,
): Promise<VercelTenantDomainProvisioningResult> {
  const checkedAt = new Date().toISOString()
  const config = getVercelProvisioningConfig()

  if (!config.isConfigured) {
    return {
      checkedAt,
      errorCode: null,
      errorMessage: "Vercel domain provisioning is not configured for this environment.",
      hostname,
      lookupMethod: "vercel_api",
      projectDomain: null,
      projectIdOrName: config.projectIdOrName,
      provider: "vercel",
      status: "skipped",
      teamId: config.teamId,
      teamSlug: config.teamSlug,
      verification: [],
    }
  }

  const query = buildQueryString({
    teamId: config.teamId,
    teamSlug: config.teamSlug,
  })
  const encodedHostname = encodeURIComponent(hostname)
  const projectDomainPath = `/v9/projects/${config.projectIdOrName}/domains/${encodedHostname}${query}`
  const addDomainPath = `/v10/projects/${config.projectIdOrName}/domains${query}`

  try {
    let projectDomain: VercelProjectDomain | null = null

    const created = await requestVercel<VercelProjectDomain | { error?: { code?: string; message?: string } }>(
      addDomainPath,
      {
        body: { name: hostname },
        method: "POST",
      },
    )

    if (created.ok) {
      projectDomain = created.payload as VercelProjectDomain
    } else if (created.status === 400 || created.status === 409) {
      const existing = await requestVercel<VercelProjectDomain | { error?: { code?: string; message?: string } }>(
        projectDomainPath,
        { method: "GET" },
      )

      if (!existing.ok) {
        const errorPayload = existing.payload as { error?: { code?: string; message?: string } }
        return toFailureResult({
          checkedAt,
          errorCode: errorPayload.error?.code ?? `HTTP_${existing.status}`,
          errorMessage: errorPayload.error?.message ?? "The domain could not be read from Vercel.",
          hostname,
          projectIdOrName: config.projectIdOrName,
          teamId: config.teamId,
          teamSlug: config.teamSlug,
        })
      }

      projectDomain = existing.payload as VercelProjectDomain
    } else {
      const errorPayload = created.payload as { error?: { code?: string; message?: string } }
      return toFailureResult({
        checkedAt,
        errorCode: errorPayload.error?.code ?? `HTTP_${created.status}`,
        errorMessage: errorPayload.error?.message ?? "The domain could not be added to the Vercel project.",
        hostname,
        projectIdOrName: config.projectIdOrName,
        teamId: config.teamId,
        teamSlug: config.teamSlug,
      })
    }

    if (!projectDomain) {
      return toFailureResult({
        checkedAt,
        errorCode: "EMPTY_RESPONSE",
        errorMessage: "Vercel returned an empty project-domain response.",
        hostname,
        projectIdOrName: config.projectIdOrName,
        teamId: config.teamId,
        teamSlug: config.teamSlug,
      })
    }

    if (!projectDomain.verified) {
      const verified = await requestVercel<VercelProjectDomain | { error?: { code?: string; message?: string } }>(
        `${projectDomainPath}/verify`,
        { method: "POST" },
      )

      if (verified.ok) {
        projectDomain = verified.payload as VercelProjectDomain
      } else {
        const errorPayload = verified.payload as { error?: { code?: string; message?: string } }

        return {
          checkedAt,
          errorCode: errorPayload.error?.code ?? `HTTP_${verified.status}`,
          errorMessage:
            errorPayload.error?.message
            ?? "Vercel accepted the domain but it still needs verification.",
          hostname,
          lookupMethod: "vercel_api",
          projectDomain,
          projectIdOrName: config.projectIdOrName,
          provider: "vercel",
          status: "pending_verification",
          teamId: config.teamId,
          teamSlug: config.teamSlug,
          verification: projectDomain.verification ?? [],
        }
      }
    }

    return {
      checkedAt,
      errorCode: null,
      errorMessage: projectDomain.verified ? null : "Vercel domain verification is still pending.",
      hostname,
      lookupMethod: "vercel_api",
      projectDomain,
      projectIdOrName: config.projectIdOrName,
      provider: "vercel",
      status: projectDomain.verified ? "verified" : "pending_verification",
      teamId: config.teamId,
      teamSlug: config.teamSlug,
      verification: projectDomain.verification ?? [],
    }
  } catch (error) {
    return toFailureResult({
      checkedAt,
      errorCode: "REQUEST_FAILED",
      errorMessage: error instanceof Error ? error.message : "The Vercel domain request failed.",
      hostname,
      projectIdOrName: config.projectIdOrName,
      teamId: config.teamId,
      teamSlug: config.teamSlug,
    })
  }
}
