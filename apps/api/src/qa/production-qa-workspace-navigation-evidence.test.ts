import { expect, test } from "bun:test"
import { summarizeWorkspaceNavigation } from "./production-qa-workspace-navigation-evidence"

const bounds = { bottom: 120, left: 0, right: 200, top: 20 }

test("navigation evidence retains only exact visible allowlisted landmarks", () => {
  const evidence = summarizeWorkspaceNavigation([
    {
      bounds,
      text: "Private user name",
      contentDescription: "secret credential",
    },
    { bounds, text: "", contentDescription: "More admin services tab" },
    { bounds, text: "Administration", contentDescription: "" },
    {
      bounds,
      text: "Guarantor approvals pending: private payload",
      contentDescription: "",
    },
    {
      bounds: { ...bounds, bottom: 20 },
      text: "Guarantor approvals",
      contentDescription: "",
    },
  ])
  expect(evidence).toEqual({
    adminShell: true,
    memberShell: false,
    administration: true,
    billing: false,
    guarantorApprovals: false,
    signIn: false,
    lightAppearance: false,
    darkAppearance: false,
  })
  expect(JSON.stringify(evidence)).not.toContain("Private")
  expect(JSON.stringify(evidence)).not.toContain("secret")
})

test("navigation evidence distinguishes unexpected service from the tab shell", () => {
  const evidence = summarizeWorkspaceNavigation([
    { bounds, text: "Guarantor approvals", contentDescription: "" },
  ])
  expect(evidence.guarantorApprovals).toBe(true)
  expect(evidence.adminShell).toBe(false)
  expect(evidence.memberShell).toBe(false)
})
