type UiLandmark = {
  bounds: { bottom: number; left: number; right: number; top: number }
  contentDescription: string
  text: string
}

// Only allowlisted UI landmarks leave the hierarchy. Never retain profile names,
// form values, notification payloads, credentials, or arbitrary accessibility text.
export function summarizeWorkspaceNavigation(nodes: UiLandmark[]) {
  const visible = nodes.filter(
    ({ bounds }) => bounds.bottom > bounds.top && bounds.right > bounds.left
  )
  const description = (value: string) =>
    visible.some((node) => node.contentDescription === value)
  const text = (value: string) => visible.some((node) => node.text === value)

  return {
    adminShell: description("More admin services tab"),
    memberShell: description("More member services tab"),
    administration: text("Administration"),
    billing: text("Plan & billing"),
    guarantorApprovals: text("Guarantor approvals"),
    signIn: text("Sign in"),
    lightAppearance: description("Use light appearance"),
    darkAppearance: description("Use dark appearance"),
  }
}
