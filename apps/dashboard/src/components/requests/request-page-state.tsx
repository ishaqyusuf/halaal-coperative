import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"

export type RequestPageBlockedState =
  | "member-profile-missing"
  | "member-sign-in-required"
  | "restricted"
  | "service-disabled"
  | "unavailable"

const copy: Record<RequestPageBlockedState, { body: string; title: string }> = {
  "member-profile-missing": {
    body: "Ask the cooperative office to link your account.",
    title: "Your account is not linked to a member yet.",
  },
  "member-sign-in-required": {
    body: "Sign in with your member account.",
    title: "Please sign in again.",
  },
  restricted: {
    body: "Ask a cooperative admin if you need it.",
    title: "You can't open this page.",
  },
  "service-disabled": {
    body: "An admin can turn it on in Settings, Operation profile.",
    title: "This service is turned off.",
  },
  unavailable: {
    body: "Please try again later.",
    title: "This page isn't available right now.",
  },
}

/** The same plain message for each request page when it can't show requests. */
export function RequestPageState({
  state,
  title,
}: {
  state: RequestPageBlockedState
  title: string
}) {
  return (
    <WorkspacePageShell description="" eyebrow={title} title={title}>
      <WorkspaceEmptyState body={copy[state].body} title={copy[state].title} />
    </WorkspacePageShell>
  )
}

export function isRequestPageBlocked(
  state: string
): state is RequestPageBlockedState {
  return state in copy
}
