import { describe, expect, test } from "bun:test"

import {
  ProductionQaAndroidDriver,
  androidKeyCodeForNumericDigit,
  chunkAndroidNumericText,
  findAndroidExpoLaunchDismissNode,
  findAndroidQaProfileNode,
  findAndroidUiNode,
  findAndroidUiNodeBySemanticLabel,
  findVisibleAndroidUiNode,
  findAndroidWorkspaceSwitchNode,
  findWorkspaceAccessRowIds,
  hasWorkspaceScreenshotCoverage,
  hasSettledOperationProfileScreen,
  hasProcurementFormActionState,
  hasStableProcurementFooter,
  WORKSPACE_ACCESS_CHECKPOINTS,
  isAndroidUiNodeWithinFloatingSheet,
  isMemberOnlyAndroidShell,
  isAndroidDebuggablePackage,
  parseAndroidUiNodes,
  readProcurementFooterGeometry,
  readProcurementReadOnlyCheck,
  readAndroidVisibleKeyboardTop,
  readAndroidCalendarCheckpoint,
  readOperationProfileConflictCheck,
  readOperationProfileDiscardCheck,
  readOperationProfileInputObservation,
  resolveAndroidVerifiedTextAppend,
  resolveAndroidCredentialEntryAction,
  resolveAndroidFloatingSheetExpansionGesture,
  resolveAndroidCalendarSwipe,
  resolveAndroidPageSwipe,
  resolveAndroidTextInputSwipe,
  resolveAndroidWorkspaceReturnAction,
} from "./production-qa-android-driver"

const fixture = `<?xml version="1.0" encoding="UTF-8"?>
<hierarchy>
  <node text="QA ONLY &#8212; Starter Healthy Member" content-desc="" enabled="true" bounds="[70,1400][900,1480]" />
  <node text="" content-desc="Member home tab" enabled="false" bounds="[0,2000][216,2200]" />
</hierarchy>`

describe("production QA Android UI parser", () => {
  test("derives bounded calendar swipes and preserves observable sheet state", () => {
    const xml = `<hierarchy>
      <node content-desc="Bottom sheet backdrop" enabled="true" bounds="[0,0][1080,2220]" />
      <node content-desc="Assessment date calendar" enabled="true" bounds="[20,620][1060,2150]" />
      <node content-desc="September 2026. Change calendar view" enabled="true" bounds="[180,760][900,860]" />
    </hierarchy>`

    expect(readAndroidCalendarCheckpoint(xml, "Assessment date")).toEqual({
      backdropVisible: true,
      sheetBounds: { bottom: 2150, left: 20, right: 1060, top: 620 },
      title: "September 2026. Change calendar view",
    })
    expect(resolveAndroidCalendarSwipe(xml, "Assessment date", "next")).toEqual(
      { fromX: 852, toX: 228, y: 1462 }
    )
    expect(
      resolveAndroidCalendarSwipe(xml, "Assessment date", "previous")
    ).toEqual({ fromX: 228, toX: 852, y: 1462 })
    expect(
      resolveAndroidCalendarSwipe("<hierarchy />", "Assessment date", "next")
    ).toBeNull()
  })

  test("does not tap an off-screen sign-out node", () => {
    const xml = `<hierarchy>
      <node text="Sign out" enabled="true" bounds="[40,2400][1040,2500]" />
      <node text="Sign out" enabled="true" bounds="[40,1800][1040,1900]" />
    </hierarchy>`
    expect(findVisibleAndroidUiNode(xml, { text: "Sign out" })?.bounds).toEqual(
      { bottom: 1900, left: 40, right: 1040, top: 1800 }
    )
    expect(
      findVisibleAndroidUiNode(
        '<node text="Sign out" enabled="true" bounds="[40,2400][1040,2500]" />',
        { text: "Sign out" }
      )
    ).toBeUndefined()
  })

  test("requires a browse-only Procurement state with no create surface", () => {
    const node = (attributes: string) =>
      `<node ${attributes} enabled="true" bounds="[40,200][1040,300]" />`
    const xml = `<hierarchy>
      ${node('text="Procurement"')}
      ${node('text="Outstanding"')}
      ${node('text="Requests"')}
      ${node('text="New request unavailable"')}
      ${node('text="Procurement is currently read-only. Existing requests remain available."')}
    </hierarchy>`

    expect(readProcurementReadOnlyCheck(xml)).toEqual({
      createActionAbsent: true,
      formAbsent: true,
      historySurfacePresent: true,
      reasonPresent: true,
      reasonVisible: true,
      restrictionPresent: true,
      restrictionVisible: true,
      screenPresent: true,
    })
    expect(
      readProcurementReadOnlyCheck(
        xml.replace(
          "</hierarchy>",
          `${node('text="New request"')}<node content-desc="Procurement item name" enabled="true" bounds="[40,400][1040,500]" /></hierarchy>`
        )
      )
    ).toMatchObject({ createActionAbsent: false, formAbsent: false })
  })

  test("requires the Operation Profile sheet and backdrop to finish dismissing", () => {
    const refresh =
      '<node content-desc="Refresh Operation Profile" enabled="true" bounds="[900,80][1040,200]" />'
    expect(
      hasSettledOperationProfileScreen(`<hierarchy>${refresh}</hierarchy>`)
    ).toBe(true)
    expect(
      hasSettledOperationProfileScreen(
        `<hierarchy>${refresh}<node content-desc="Bottom sheet backdrop" bounds="[0,0][1080,2220]" /></hierarchy>`
      )
    ).toBe(false)
    expect(
      hasSettledOperationProfileScreen(
        `<hierarchy>${refresh}<node text="Close form" bounds="[500,1900][1000,2050]" /></hierarchy>`
      )
    ).toBe(false)
    expect(
      hasSettledOperationProfileScreen(
        '<hierarchy><node text="Operation Profile" bounds="[0,0][1080,200]" /></hierarchy>'
      )
    ).toBe(false)
  })

  test("authorization failures expose a bounded checkpoint, not input or error text", async () => {
    const driver = new ProductionQaAndroidDriver({
      adbPath: "/nonexistent-qa-test-adb",
      evidenceDirectory: "/tmp/unused-qa-auth-checkpoint",
      serial: "emulator-test",
    })
    expect(driver.getAuthorizationCheckpoint()).toBe("not-started")
    await expect(
      driver.enterQaProfile({
        credential: "private-test-credential",
        expectedRole: "tenant_admin",
        identityLabel: "private-test-identity",
        qaDomain: "private-test-domain",
      })
    ).rejects.toThrow()
    expect(driver.getAuthorizationCheckpoint()).toBe("launch")
    expect(JSON.stringify(driver.getAuthorizationCheckpoint())).not.toContain(
      "private-test"
    )
  })

  test("input diagnostics expose bounds and length but never form text", () => {
    const observation = readOperationProfileInputObservation(
      '<node content-desc="Operation Profile change reason" text="private-form-text" focused="true" enabled="true" bounds="[50,400][1000,700]" />'
    )
    expect(observation).toEqual({
      found: true,
      focused: true,
      enabled: true,
      textLength: 17,
      fieldBounds: { left: 50, top: 400, right: 1000, bottom: 700 },
    })
    expect(JSON.stringify(observation)).not.toContain("private-form-text")
    expect(readOperationProfileInputObservation("<hierarchy />")).toEqual({
      found: false,
      focused: false,
      enabled: false,
      textLength: null,
      fieldBounds: null,
    })
  })
  test("appends long Android text in verified bounded chunks", () => {
    expect(
      resolveAndroidVerifiedTextAppend({
        expectedValue: "QA audit reason. Reviewed safely.",
        observedValue: "QA audit reason",
        maxChunkLength: 8,
      })
    ).toEqual({
      kind: "append",
      encodedValue: ".%sReview",
      targetLength: 23,
    })
    expect(
      resolveAndroidVerifiedTextAppend({
        expectedValue: "QA audit reason",
        observedValue: "QA audit reason",
      })
    ).toEqual({ kind: "complete" })
    expect(
      resolveAndroidVerifiedTextAppend({
        expectedValue: "QA audit reason",
        observedValue: "QA wrong",
      })
    ).toEqual({ kind: "diverged" })
  })
  test("bounds long-text swipes to the focused input above the keyboard", () => {
    const xml = (focused = true, bounds = "[50,400][1000,700]") =>
      `<node content-desc="Reason" text="QA reason" focused="${focused}" enabled="true" bounds="${bounds}" />`
    const viewport = { top: 200, bottom: 900 }
    expect(
      resolveAndroidTextInputSwipe(xml(), "Reason", "up", viewport)
    ).toEqual({ x: 525, fromY: 625, toY: 475 })
    expect(
      resolveAndroidTextInputSwipe(xml(), "Reason", "down", viewport)
    ).toEqual({ x: 525, fromY: 475, toY: 625 })
    expect(
      resolveAndroidTextInputSwipe(xml(false), "Reason", "up", viewport)
    ).toBeNull()
    expect(
      resolveAndroidTextInputSwipe(xml(), "Missing", "up", viewport)
    ).toBeNull()
    expect(
      resolveAndroidTextInputSwipe(
        xml(true, "[50,100][1000,700]"),
        "Reason",
        "up",
        viewport
      )
    ).toBeNull()
    expect(
      resolveAndroidTextInputSwipe(
        xml(true, "[50,400][1000,950]"),
        "Reason",
        "up",
        viewport
      )
    ).toBeNull()
    expect(
      resolveAndroidTextInputSwipe(
        xml(true, "[50,400][1000,440]"),
        "Reason",
        "up",
        viewport
      )
    ).toBeNull()
  })
  test("requires empty reason, restored current mode and disabled Review after discard", () => {
    const fixture = (reason: string, checked: boolean, enabled: boolean) =>
      `<node content-desc="Operation Profile change reason" text="${reason}" bounds="[20,900][1000,1100]" />` +
      `<node content-desc="View only. History remains visible" checked="${checked}" bounds="[20,700][1000,800]" />` +
      `<node content-desc="Review Procurement access change" enabled="${enabled}" bounds="[20,1500][1000,1600]" />`
    expect(readOperationProfileDiscardCheck(fixture("", true, false))).toEqual({
      reasonEmpty: true,
      modeReset: true,
      reviewDisabled: true,
    })
    expect(
      readOperationProfileDiscardCheck(
        fixture("Why is this access mode changing?", true, false)
      ).reasonEmpty
    ).toBe(true)
    expect(
      readOperationProfileDiscardCheck(fixture("saved QA reason", true, false))
        .reasonEmpty
    ).toBe(false)
    expect(
      readOperationProfileDiscardCheck(fixture("", false, false)).modeReset
    ).toBe(false)
    expect(
      readOperationProfileDiscardCheck(fixture("", true, true)).reviewDisabled
    ).toBe(false)
    expect(readOperationProfileDiscardCheck("<hierarchy />")).toEqual({
      reasonEmpty: false,
      modeReset: false,
      reviewDisabled: false,
    })
  })
  test("requires every native stale-conflict recovery landmark inside the floating sheet", () => {
    const node = (attributes: string) =>
      `<node ${attributes} bounds="[40,800][1040,900]" />`
    const xml = `<hierarchy>
      ${node('content-desc="Bottom sheet backdrop" enabled="true"')}
      <node text="View only" enabled="true" bounds="[700,300][1000,380]" />
      <node content-desc="Settings changed" enabled="true" bounds="[20,700][1060,2100]" />
      ${node('text="View only" enabled="true"')}
      ${node('text="Not offered" enabled="true"')}
      ${node('text="Your draft is safe" enabled="true"')}
      ${node('text="Keep editing" enabled="true"')}
      ${node('text="Refresh &amp; review" enabled="true"')}
    </hierarchy>`
    expect(readOperationProfileConflictCheck(xml)).toEqual({
      backdropVisible: true,
      draftSafetyVisible: true,
      keepEditingEnabled: true,
      nextModeVisible: true,
      refreshAndReviewEnabled: true,
      reviewedModeVisible: true,
      sheetVisible: true,
    })
    expect(
      readOperationProfileConflictCheck(
        xml.replace('text="Your draft is safe"', 'text=""')
      ).draftSafetyVisible
    ).toBe(false)
  })
  test("reads only visible nonempty IME insets for keyboard clearance", () => {
    expect(
      readAndroidVisibleKeyboardTop(
        "InsetsSource id=3 type=ime frame=[0,1390][1080,2220] visible=true flags="
      )
    ).toBe(1390)
    expect(
      readAndroidVisibleKeyboardTop(
        "InsetsSource id=3 type=ime frame=[0,1390][1080,2220] visible=false flags="
      )
    ).toBeNull()
    expect(
      readAndroidVisibleKeyboardTop(
        "InsetsSource id=3 type=ime frame=[0,0][0,0] visible=true flags="
      )
    ).toBeNull()
    expect(
      readAndroidVisibleKeyboardTop(
        "type=statusBars frame=[0,0][1080,66] visible=true"
      )
    ).toBeNull()
  })
  test("distinguishes an installed debug client from release or unrelated debug text", () => {
    expect(
      isAndroidDebuggablePackage(
        "    flags=[ DEBUGGABLE HAS_CODE ALLOW_BACKUP ]"
      )
    ).toBe(true)
    expect(
      isAndroidDebuggablePackage("    pkgFlags=[ HAS_CODE DEBUGGABLE ]")
    ).toBe(true)
    expect(
      isAndroidDebuggablePackage("    flags=[ HAS_CODE ALLOW_BACKUP ]")
    ).toBe(false)
    expect(
      isAndroidDebuggablePackage("permission.example: flags=[ DEBUGGABLE ]")
    ).toBe(false)
    expect(
      isAndroidDebuggablePackage("Unable to find package: example.DEBUGGABLE")
    ).toBe(false)
  })
  test("requires the Member shell and rejects leaked staff controls or unmatched routes", () => {
    const node = (attributes: string) =>
      `<node ${attributes} bounds="[0,100][1000,200]" />`
    const member =
      node('content-desc="Member home tab"') +
      node('content-desc="More member services tab"')
    expect(isMemberOnlyAndroidShell(member)).toBe(true)
    expect(isMemberOnlyAndroidShell("<hierarchy />")).toBe(false)
    expect(
      isMemberOnlyAndroidShell(
        member + node('content-desc="Admin finance tab"')
      )
    ).toBe(false)
    expect(
      isMemberOnlyAndroidShell(
        member + node('content-desc="Open finance operations"')
      )
    ).toBe(false)
    expect(
      isMemberOnlyAndroidShell(member + node('text="Unmatched Route"'))
    ).toBe(false)
  })
  test("requires identical closed-keyboard footer bounds across Quick Fill removal", () => {
    const empty = readProcurementFooterGeometry(
      '<node content-desc="Review request" bounds="[48,2039][1032,2154]" />' +
        '<node content-desc="Quick fill procurement request" bounds="[44,1753][160,1868]" />',
      "mInputShown=false"
    )
    const populated = { ...empty, quickFillBounds: null }
    expect(hasStableProcurementFooter(empty, populated)).toBe(true)
    expect(
      hasStableProcurementFooter(
        {
          ...empty,
          actionBounds: {
            left: 48,
            right: 1032,
            top: 1923,
            bottom: 2038,
          },
        },
        populated
      )
    ).toBe(false)
    expect(
      hasStableProcurementFooter({ ...empty, keyboardVisible: true }, populated)
    ).toBe(false)
    expect(
      hasStableProcurementFooter({ ...empty, actionBounds: null }, populated)
    ).toBe(false)
    expect(hasStableProcurementFooter(populated, populated)).toBe(false)
    expect(hasStableProcurementFooter(empty, empty)).toBe(false)
  })
  test("records footer geometry without persisting form values or raw input-method output", () => {
    const xml =
      '<node text="private form value" bounds="[20,300][1000,400]" />' +
      '<node content-desc="Review request" bounds="[48,2000][1032,2116]" />' +
      '<node content-desc="Quick fill procurement request" bounds="[44,1750][160,1866]" />'
    expect(
      readProcurementFooterGeometry(xml, "private state mInputShown=false")
    ).toEqual({
      keyboardVisible: false,
      actionBounds: { left: 48, top: 2000, right: 1032, bottom: 2116 },
      quickFillBounds: { left: 44, top: 1750, right: 160, bottom: 1866 },
    })
    expect(
      readProcurementFooterGeometry("<hierarchy />", "mInputShown=true")
    ).toEqual({
      keyboardVisible: true,
      actionBounds: null,
      quickFillBounds: null,
    })
  })
  test("rejects premature form captures while review or its backdrop remains", () => {
    const button = (enabled: boolean) =>
      `<node content-desc="Review request" enabled="${enabled}" bounds="[50,1800][1000,1950]" />`
    const overlay =
      '<node text="Review procurement request" bounds="[50,1000][1000,1100]" />'
    const backdrop =
      '<node content-desc="Bottom sheet backdrop" bounds="[0,0][1080,2220]" />'
    expect(hasProcurementFormActionState(button(false), false)).toBe(true)
    expect(hasProcurementFormActionState(button(true), false)).toBe(false)
    expect(hasProcurementFormActionState(button(true), true)).toBe(true)
    expect(hasProcurementFormActionState(button(true) + overlay, true)).toBe(
      false
    )
    expect(hasProcurementFormActionState(button(true) + backdrop, true)).toBe(
      false
    )
    expect(hasProcurementFormActionState("<hierarchy />", true)).toBe(false)
  })
  test("waits for restart hydration instead of backing out of unknown UI", () => {
    const node = (attributes: string) =>
      `<node ${attributes} bounds="[0,100][1000,200]" />`
    expect(resolveAndroidWorkspaceReturnAction("<hierarchy />")).toBe("wait")
    expect(
      resolveAndroidWorkspaceReturnAction(
        node('text="Home" package="com.google.android.apps.nexuslauncher"')
      )
    ).toBe("wait")
    expect(
      resolveAndroidWorkspaceReturnAction(node('text="Procurement"'))
    ).toBe("back")
    expect(
      resolveAndroidWorkspaceReturnAction(
        node('text="Procurement"') +
          node('content-desc="Close New procurement request"')
      )
    ).toBe("wait")
    expect(
      resolveAndroidWorkspaceReturnAction(
        node('content-desc="More member services tab"')
      )
    ).toBe("ready")
    expect(
      resolveAndroidWorkspaceReturnAction(
        node('content-desc="More admin services tab"')
      )
    ).toBe("ready")
    expect(
      resolveAndroidWorkspaceReturnAction(node('content-desc="Open QA access"'))
    ).toBe("signed-out")
  })
  test("keeps page swipes inside the observed Member content instead of the tab gap", () => {
    const xml =
      '<node package="com.halaalvest.mobile" scrollable="true" bounds="[0,66][1080,1797]" />'
    expect(resolveAndroidPageSwipe(xml, "up")).toEqual({
      x: 540,
      fromY: 1451,
      toY: 499,
    })
    expect(resolveAndroidPageSwipe(xml, "down")).toEqual({
      x: 540,
      fromY: 499,
      toY: 1451,
    })
  })
  test("bounds sheet-body swipes to the scroll viewport between its header and fixed action", () => {
    const xml =
      '<node package="com.halaalvest.mobile" scrollable="true" bounds="[20,1200][1060,1560]" />'
    expect(
      resolveAndroidPageSwipe(xml, "up", { top: 1300, bottom: 1900 })
    ).toEqual({
      x: 540,
      fromY: 1508,
      toY: 1365,
    })
    expect(
      resolveAndroidPageSwipe(xml, "up", { top: 1600, bottom: 1900 })
    ).toBeNull()
  })
  test("does not gesture on the keyboard, non-scrollable shell or a clipped row", () => {
    const xml =
      '<node package="com.google.android.inputmethod.latin" scrollable="true" bounds="[0,1000][1080,2200]" /><node package="com.halaalvest.mobile" scrollable="false" bounds="[0,0][1080,2200]" /><node package="com.halaalvest.mobile" scrollable="true" bounds="[0,100][1080,180]" />'
    expect(resolveAndroidPageSwipe(xml, "up")).toBeNull()
  })
  test("counts only access rows clear of the status and tab bars", () => {
    const node = (id: string, top: number, bottom: number) =>
      `<node resource-id="${id}" text="private value" bounds="[20,${top}][1000,${bottom}]" />`
    expect(
      findWorkspaceAccessRowIds(
        [
          node("workspace-access-user-id-1", 150, 650),
          node("workspace-access-role-tenant_admin", 700, 1100),
          node("workspace-access-user-cut-top", 80, 300),
          node("workspace-access-role-cut_bottom", 1500, 1999),
          node("workspace-access-user-hidden", 500, 500),
          node("credential-field", 150, 250),
        ].join(""),
        2000
      )
    ).toEqual([
      "workspace-access-user-id-1",
      "workspace-access-role-tenant_admin",
    ])
  })
  test("requires every workspace checkpoint instead of accepting a screenshot count", () => {
    const files = [
      "01-admin-workspace-selector.png",
      "02-member-home-after-switch.png",
      "03-member-workspace-selector.png",
      "04-more-before-billing.png",
      "05-billing-status-bar.png",
      "06-more-after-billing.png",
      "07-admin-home-after-reverse-switch.png",
      "08-admin-more-after-reverse-switch.png",
      ...WORKSPACE_ACCESS_CHECKPOINTS.map(({ file }) => file),
    ]
    expect(hasWorkspaceScreenshotCoverage(files, false)).toBe(true)
    expect(hasWorkspaceScreenshotCoverage(files.slice(0, 8), false)).toBe(false)
    expect(hasWorkspaceScreenshotCoverage([...files, files[0]!], false)).toBe(
      false
    )
    expect(hasWorkspaceScreenshotCoverage(files, true)).toBe(false)
    const matrix = [
      "light-100-",
      "dark-100-",
      "light-200-",
      "dark-200-",
    ].flatMap((prefix) => files.map((file) => `${prefix}${file}`))
    expect(hasWorkspaceScreenshotCoverage(matrix, true)).toBe(true)
    expect(
      hasWorkspaceScreenshotCoverage([...matrix.slice(1), "extra.png"], true)
    ).toBe(false)
    expect(
      hasWorkspaceScreenshotCoverage([...matrix, "access-scroll-01.png"], true)
    ).toBe(true)
  })
  test("dismisses only the identified Expo introduction or developer menu", () => {
    const action =
      '<node text="Continue" content-desc="" bounds="[10,100][200,150]" />'
    const close =
      '<node text="" content-desc="Close" bounds="[200,10][250,60]" />'
    const intro =
      '<node text="This is the developer menu. It gives you access to useful tools in your development builds." bounds="[10,20][250,90]" />'
    const menu =
      '<node text="Runtime version: 0.1.0" bounds="[10,20][250,50]" /><node text="Connected to:" bounds="[10,70][250,90]" /><node content-desc="Toggle Dev Menu" bounds="[10,100][250,150]" />'
    expect(findAndroidExpoLaunchDismissNode(intro + action)?.text).toBe(
      "Continue"
    )
    expect(
      findAndroidExpoLaunchDismissNode(menu + close)?.contentDescription
    ).toBe("Close")
    expect(findAndroidExpoLaunchDismissNode(action + close)).toBeUndefined()
  })
  test("chunks long numeric credentials without changing their value", () => {
    const value = "01234567890123456789"
    const chunks = chunkAndroidNumericText(value, 6)

    expect(chunks).toEqual(["012345", "678901", "234567", "89"])
    expect(chunks.join("")).toBe(value)
  })

  test("maps each credential digit to one deterministic Android key event", () => {
    expect("0123456789".split("").map(androidKeyCodeForNumericDigit)).toEqual([
      7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    ])
    expect(() => androidKeyCodeForNumericDigit("12")).toThrow(
      "Android numeric key events require one digit."
    )
  })

  test("retries one dropped secure-input event and fails closed on divergence", () => {
    expect(
      resolveAndroidCredentialEntryAction({
        expectedLength: 24,
        observedLength: 24,
      })
    ).toBe("accepted")
    expect(
      resolveAndroidCredentialEntryAction({
        expectedLength: 24,
        observedLength: 23,
      })
    ).toBe("retry")
    expect(() =>
      resolveAndroidCredentialEntryAction({
        expectedLength: 24,
        observedLength: 25,
      })
    ).toThrow("Android secure input diverged")
    expect(() =>
      resolveAndroidCredentialEntryAction({
        expectedLength: 24,
        observedLength: 22,
      })
    ).toThrow("Android secure input diverged")
  })

  test("decodes semantic labels and bounds without depending on coordinates", () => {
    expect(parseAndroidUiNodes(fixture)).toEqual([
      {
        bounds: { bottom: 1480, left: 70, right: 900, top: 1400 },
        contentDescription: "",
        enabled: true,
        focused: false,
        text: "QA ONLY — Starter Healthy Member",
      },
      {
        bounds: { bottom: 2200, left: 0, right: 216, top: 2000 },
        contentDescription: "Member home tab",
        enabled: false,
        focused: false,
        text: "",
      },
    ])
  })

  test("finds controls by text or accessibility description", () => {
    expect(
      findAndroidUiNode(fixture, {
        text: "QA ONLY — Starter Healthy Member",
      })?.bounds
    ).toEqual({ bottom: 1480, left: 70, right: 900, top: 1400 })
    expect(
      findAndroidUiNode(fixture, {
        contentDescription: "Member home tab",
      })?.enabled
    ).toBe(false)
    expect(
      findAndroidUiNodeBySemanticLabel(
        '<node text="" content-desc="QO, QA ONLY &#8212; Starter Healthy Member, MEMBER, →" enabled="true" bounds="[70,1400][900,1480]" />',
        "QA ONLY — Starter Healthy Member"
      )?.bounds
    ).toEqual({ bottom: 1480, left: 70, right: 900, top: 1400 })
  })

  test("distinguishes duplicate multi-role QA identities by exact role segment", () => {
    const duplicateIdentity = `
      <node text="" content-desc="QA ONLY &#8212; Starter Healthy Tenant Admin, QA ONLY &#8212; Starter Healthy Cooperative, MEMBER, →" enabled="true" bounds="[70,1200][900,1280]" />
      <node text="" content-desc="QA ONLY &#8212; Starter Healthy Tenant Admin, QA ONLY &#8212; Starter Healthy Cooperative, TENANT ADMIN, →" enabled="true" bounds="[70,1400][900,1480]" />
    `

    expect(
      findAndroidQaProfileNode(
        duplicateIdentity,
        "QA ONLY — Starter Healthy Tenant Admin",
        "tenant_admin"
      )?.bounds
    ).toEqual({ bottom: 1480, left: 70, right: 900, top: 1400 })
  })

  test("finds the exact workspace role action without matching status copy", () => {
    const workspaceSelector = `
      <node text="Member workspace" content-desc="" enabled="false" bounds="[70,1200][700,1280]" />
      <node text="Current" content-desc="" enabled="false" bounds="[760,1200][920,1280]" />
      <node text="" content-desc="Switch to Tenant Admin workspace" enabled="true" bounds="[70,1300][1010,1420]" />
    `

    expect(
      findAndroidWorkspaceSwitchNode(workspaceSelector, "Tenant Admin")?.bounds
    ).toEqual({ bottom: 1420, left: 70, right: 1010, top: 1300 })
    expect(
      findAndroidWorkspaceSwitchNode(workspaceSelector, "Member")
    ).toBeUndefined()
  })

  test("expands a collapsed floating sheet from its header instead of its list", () => {
    const collapsed = `
      <node text="" content-desc="Update QA access" enabled="true" bounds="[58,2114][164,2220]" />
      <node text="" content-desc="Update QA access" enabled="true" bounds="[22,1184][1058,2132]" />
    `
    const expanded = `
      <node text="" content-desc="Update QA access" enabled="true" bounds="[22,236][1058,2132]" />
    `

    expect(
      resolveAndroidFloatingSheetExpansionGesture(collapsed, [
        "Update QA access",
      ])
    ).toEqual({ endX: 540, endY: 420, startX: 540, startY: 1220 })
    expect(
      resolveAndroidFloatingSheetExpansionGesture(expanded, [
        "Update QA access",
      ])
    ).toBeNull()
  })

  test("accepts a fully visible row inside a compact non-expandable sheet", () => {
    const compactSheet = `
      <node text="" content-desc="Finance operations" enabled="true" bounds="[22,994][1058,2132]" />
      <node text="" content-desc="Open Shares &amp; profit" enabled="true" bounds="[70,1819][1010,1956]" />
      <node text="Charges" content-desc="" enabled="true" bounds="[185,2120][937,2170]" />
    `

    expect(
      isAndroidUiNodeWithinFloatingSheet(
        compactSheet,
        findAndroidUiNodeBySemanticLabel(compactSheet, "Open Shares & profit")!,
        ["Finance operations"]
      )
    ).toBe(true)
    expect(
      isAndroidUiNodeWithinFloatingSheet(
        compactSheet,
        findAndroidUiNodeBySemanticLabel(compactSheet, "Charges")!,
        ["Finance operations"]
      )
    ).toBe(false)
  })
})
