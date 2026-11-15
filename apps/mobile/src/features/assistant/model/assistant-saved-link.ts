import {
  type AssistantLinkTarget,
  assistantHrefs,
} from "@halaalvest/assistant/contracts"

/**
 * Saved-answer (`/assistant/m/<id>`) and draft (`/assistant/review/<id>`)
 * links use the website's paths, so one link opens the same thing on the
 * web and in the app. The id from a link is untrusted: only a plain id is
 * passed on, and the server re-authorizes it on every open.
 */
const LINK_ID = /^[A-Za-z0-9_-]{1,128}$/

export function assistantLinkTarget(
  kind: AssistantLinkTarget["kind"],
  raw: string | string[] | undefined
): AssistantLinkTarget | null {
  return typeof raw === "string" && LINK_ID.test(raw) ? { kind, id: raw } : null
}

/** The full link to share, on the dashboard (website) origin. */
export function assistantLinkUrl(origin: string, target: AssistantLinkTarget) {
  const path =
    target.kind === "message"
      ? assistantHrefs.message(target.id)
      : assistantHrefs.proposal(target.id)
  return `${origin.replace(/\/+$/, "")}${path}`
}

/** A param from the chat route: a plain id, or nothing. */
export function assistantIdParam(raw: string | string[] | undefined) {
  return typeof raw === "string" && LINK_ID.test(raw) ? raw : undefined
}
