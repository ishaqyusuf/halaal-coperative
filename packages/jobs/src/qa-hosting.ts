function getVercelQuery() {
  const params = new URLSearchParams()
  const teamId = process.env.VERCEL_TEAM_ID?.trim()
  const teamSlug = process.env.VERCEL_TEAM_SLUG?.trim()

  if (teamId) params.set("teamId", teamId)
  if (teamSlug) params.set("slug", teamSlug)

  const query = params.toString()
  return query ? `?${query}` : ""
}

export function getQaHostingCredentialBlocker() {
  const project = process.env.VERCEL_PROJECT_ID?.trim()
  const token = process.env.VERCEL_API_TOKEN?.trim()

  return project && !token ? "vercel_api_credentials_unavailable" : null
}

export async function deleteQaHostingDomains(hostnames: readonly string[]) {
  const project = process.env.VERCEL_PROJECT_ID?.trim()
  const token = process.env.VERCEL_API_TOKEN?.trim()

  if (!project) return { deletedDomains: 0 }
  if (!token) throw new Error("Missing VERCEL_API_TOKEN")

  let deletedDomains = 0
  for (const hostname of hostnames) {
    const response = await fetch(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(project)}/domains/${encodeURIComponent(hostname)}${getVercelQuery()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        method: "DELETE",
      },
    )

    if (response.ok) {
      deletedDomains += 1
      continue
    }
    if (response.status !== 404) {
      throw new Error(`Vercel domain cleanup failed with HTTP ${response.status}.`)
    }
  }

  return { deletedDomains }
}
