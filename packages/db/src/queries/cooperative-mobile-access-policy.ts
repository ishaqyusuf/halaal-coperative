/**
 * What a member's own mobile access actions do, decided from their latest term.
 * Pure, so the rules are tested without a database; the queries apply them
 * inside a serializable transaction.
 */

export type MemberTermLike = {
  status: "pending" | "approved" | "rejected" | "revoked"
  startsAt: Date | null
  endsAt: Date | null
  revokedByMember: boolean
}

export type MemberAccessSettings = {
  /** The cooperative gives out the app at all. */
  enabled: boolean
  /** Members turn it on themselves instead of waiting for approval. */
  selfService: boolean
}

export type MemberAcceptDecision =
  /** Start a new term: on at once, or a request waiting for approval. */
  | { kind: "create"; status: "approved" | "pending" }
  /** Turn the member's waiting request on in place. */
  | { kind: "approve_pending" }
  /** Nothing to change: already on, or already waiting. */
  | { kind: "unchanged" }
  /** The member turned it off this term; turn it back on, no new charge. */
  | { kind: "reinstate" }
  | { kind: "blocked"; reason: "not_enabled" | "cooperative_turned_off" }

export function isWithinTerm(term: MemberTermLike, now: Date) {
  return Boolean(
    term.startsAt && term.startsAt <= now && term.endsAt && now < term.endsAt
  )
}

export function decideMemberAccept(
  previous: MemberTermLike | null,
  now: Date,
  settings: MemberAccessSettings
): MemberAcceptDecision {
  if (previous && isWithinTerm(previous, now)) {
    if (previous.status === "approved") return { kind: "unchanged" }
    if (previous.status === "revoked") {
      // A paused cooperative still honours terms already paid for.
      return previous.revokedByMember
        ? { kind: "reinstate" }
        : { kind: "blocked", reason: "cooperative_turned_off" }
    }
  }
  if (!settings.enabled) return { kind: "blocked", reason: "not_enabled" }
  if (previous?.status === "pending") {
    return settings.selfService
      ? { kind: "approve_pending" }
      : { kind: "unchanged" }
  }
  return {
    kind: "create",
    status: settings.selfService ? "approved" : "pending",
  }
}

export type MemberTurnOffDecision =
  | { kind: "revoke" }
  | { kind: "unchanged" }
  | { kind: "blocked" }

export function decideMemberTurnOff(
  term: MemberTermLike | null,
  now: Date
): MemberTurnOffDecision {
  if (!term || !isWithinTerm(term, now)) return { kind: "blocked" }
  if (term.status === "approved") return { kind: "revoke" }
  if (term.status === "revoked") return { kind: "unchanged" }
  return { kind: "blocked" }
}

/** The buttons a member's page offers for their latest term. */
export function memberAccessActions(
  term: MemberTermLike | null,
  now: Date,
  settings: MemberAccessSettings
) {
  const accept = decideMemberAccept(term, now, settings)
  const within = Boolean(term && isWithinTerm(term, now))
  return {
    canAccept: accept.kind === "create" || accept.kind === "approve_pending",
    acceptTurnsOn:
      accept.kind === "approve_pending" ||
      (accept.kind === "create" && accept.status === "approved"),
    canTurnBackOn: accept.kind === "reinstate",
    canTurnOff: decideMemberTurnOff(term, now).kind === "revoke",
    turnedOffBy:
      within && term?.status === "revoked"
        ? term.revokedByMember
          ? ("member" as const)
          : ("cooperative" as const)
        : null,
  }
}
