import { spawn } from "node:child_process"
import { appendFile, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { summarizeWorkspaceNavigation } from "./production-qa-workspace-navigation-evidence"

const DEFAULT_ADB_PATH = "/Users/M1PRO/Library/Android/sdk/platform-tools/adb"
const UI_DUMP_PATH = "/sdcard/halaalvest-ticket-30-window.xml"
const OPERATION_PROFILE_QA_REASON =
  "Reviewed with the cooperative operations team and approved for the current service policy."

export type AndroidUiNode = {
  bounds: { bottom: number; left: number; right: number; top: number }
  contentDescription: string
  enabled: boolean
  focused: boolean
  text: string
}

function decodeXmlAttribute(value: string) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code))
    )
}

function readAttribute(node: string, name: string) {
  const value = new RegExp(`${name}="([^"]*)"`).exec(node)?.[1]
  return value == null ? "" : decodeXmlAttribute(value)
}

export function parseAndroidUiNodes(xml: string): AndroidUiNode[] {
  return [...xml.matchAll(/<node\b[^>]*>/g)].flatMap(([node]) => {
    const bounds = /bounds="\[(\d+),(\d+)]\[(\d+),(\d+)]"/.exec(node)
    if (!bounds) return []

    return [
      {
        bounds: {
          bottom: Number(bounds[4]),
          left: Number(bounds[1]),
          right: Number(bounds[3]),
          top: Number(bounds[2]),
        },
        contentDescription: readAttribute(node, "content-desc"),
        enabled: readAttribute(node, "enabled") !== "false",
        focused: readAttribute(node, "focused") === "true",
        text: readAttribute(node, "text"),
      },
    ]
  })
}

export function findAndroidUiNode(
  xml: string,
  input: {
    contentDescription?: string
    text?: string
  }
) {
  return parseAndroidUiNodes(xml).find(
    (node) =>
      (input.contentDescription == null ||
        node.contentDescription === input.contentDescription) &&
      (input.text == null || node.text === input.text)
  )
}

export function findAndroidUiNodeBySemanticLabel(xml: string, label: string) {
  return parseAndroidUiNodes(xml).find(
    (node) => node.text === label || node.contentDescription.includes(label)
  )
}

export function findVisibleAndroidUiNode(
  xml: string,
  input: { contentDescription?: string; text?: string }
) {
  return parseAndroidUiNodes(xml).find(
    (node) =>
      (input.contentDescription == null ||
        node.contentDescription === input.contentDescription) &&
      (input.text == null || node.text === input.text) &&
      isVisibleNode(node)
  )
}

export function readOperationProfileDiscardCheck(xml: string) {
  const reason = findAndroidUiNode(xml, {
    contentDescription: "Operation Profile change reason",
  })
  const action = findAndroidUiNode(xml, {
    contentDescription: "Review Procurement access change",
  })
  const currentMode = [...xml.matchAll(/<node\b[^>]*>/g)].find(
    ([node]) =>
      readAttribute(node, "content-desc") ===
      "View only. History remains visible"
  )?.[0]
  return {
    reasonEmpty: Boolean(
      reason &&
      (reason.text === "" ||
        reason.text === "Why is this access mode changing?")
    ),
    modeReset: Boolean(
      currentMode && readAttribute(currentMode, "checked") === "true"
    ),
    reviewDisabled: Boolean(action && !action.enabled),
  }
}

export function readOperationProfileConflictCheck(xml: string) {
  const sheetLabels = ["Settings changed"]
  const withinSheet = (node: AndroidUiNode | undefined) =>
    Boolean(node && isAndroidUiNodeWithinFloatingSheet(xml, node, sheetLabels))
  const findTextWithinSheet = (text: string) =>
    parseAndroidUiNodes(xml).find(
      (node) => node.text === text && withinSheet(node)
    )
  const keepEditing = findAndroidUiNode(xml, { text: "Keep editing" })
  const refreshAndReview = findAndroidUiNode(xml, {
    text: "Refresh & review",
  })

  return {
    backdropVisible: Boolean(
      findAndroidUiNode(xml, {
        contentDescription: "Bottom sheet backdrop",
      })
    ),
    draftSafetyVisible: withinSheet(
      findAndroidUiNode(xml, { text: "Your draft is safe" })
    ),
    keepEditingEnabled: Boolean(
      keepEditing?.enabled && withinSheet(keepEditing)
    ),
    nextModeVisible: withinSheet(findTextWithinSheet("Not offered")),
    refreshAndReviewEnabled: Boolean(
      refreshAndReview?.enabled && withinSheet(refreshAndReview)
    ),
    reviewedModeVisible: withinSheet(findTextWithinSheet("View only")),
    sheetVisible: Boolean(findAndroidFloatingSheetNode(xml, sheetLabels)),
  }
}

export function hasSettledOperationProfileScreen(xml: string) {
  return (
    Boolean(
      findAndroidUiNode(xml, {
        contentDescription: "Refresh Operation Profile",
      })
    ) &&
    ![
      { contentDescription: "Close Procurement" },
      { contentDescription: "Bottom sheet backdrop" },
      { text: "Keep editing" },
      { text: "Close form" },
    ].some((input) => findAndroidUiNode(xml, input) != null)
  )
}

export function resolveAndroidWorkspaceReturnAction(xml: string) {
  if (
    findAndroidUiNode(xml, {
      contentDescription: "More member services tab",
    }) ||
    findAndroidUiNode(xml, { contentDescription: "More admin services tab" })
  )
    return "ready"
  if (
    findAndroidUiNode(xml, { contentDescription: "Open QA access" }) ||
    findAndroidUiNode(xml, { contentDescription: "Update QA access" })
  )
    return "signed-out"
  // A delayed restart/blank activity is not a navigation stack to pop.
  if (
    findAndroidUiNode(xml, { text: "Procurement" }) &&
    !findAndroidUiNode(xml, {
      contentDescription: "Close New procurement request",
    })
  )
    return "back"
  return "wait"
}

export function hasProcurementFormActionState(xml: string, enabled: boolean) {
  if (
    findAndroidUiNode(xml, { text: "Review procurement request" }) ||
    findAndroidUiNode(xml, { contentDescription: "Bottom sheet backdrop" })
  )
    return false
  return parseAndroidUiNodes(xml).some(
    (node) =>
      node.contentDescription.includes("Review request") &&
      node.enabled === enabled &&
      isVisibleNode(node)
  )
}

export function readProcurementFooterGeometry(
  xml: string,
  inputMethodState: string
) {
  const action = findAndroidUiNodeBySemanticLabel(xml, "Review request")
  const quickFill = findAndroidUiNode(xml, {
    contentDescription: "Quick fill procurement request",
  })
  return {
    keyboardVisible: /mInputShown=true/.test(inputMethodState),
    actionBounds: action?.bounds ?? null,
    quickFillBounds: quickFill?.bounds ?? null,
  }
}

export function readAndroidVisibleKeyboardTop(windowState: string) {
  const tops = [
    ...windowState.matchAll(
      /type=ime frame=\[(\d+),(\d+)]\[(\d+),(\d+)]([^\n]*)/g
    ),
  ]
    .filter(
      (match) =>
        /\bvisible=true\b/.test(match[5] ?? "") &&
        Number(match[3]) > Number(match[1]) &&
        Number(match[4]) > Number(match[2])
    )
    .map((match) => Number(match[2]))
  return tops.length ? Math.min(...tops) : null
}

export function hasStableProcurementFooter(
  empty: ReturnType<typeof readProcurementFooterGeometry>,
  populated: ReturnType<typeof readProcurementFooterGeometry>
) {
  if (
    empty.keyboardVisible ||
    populated.keyboardVisible ||
    !empty.quickFillBounds ||
    populated.quickFillBounds ||
    !empty.actionBounds ||
    !populated.actionBounds
  )
    return false
  return (["top", "bottom", "left", "right"] as const).every(
    (edge) => empty.actionBounds![edge] === populated.actionBounds![edge]
  )
}

export function resolveAndroidPageSwipe(
  xml: string,
  direction: "up" | "down",
  bodyBounds?: { top: number; bottom: number }
) {
  const scrollAreas = [...xml.matchAll(/<node\b[^>]*>/g)]
    .map(([node]) => node)
    .filter(
      (node) =>
        readAttribute(node, "scrollable") === "true" &&
        readAttribute(node, "package").startsWith("com.halaalvest.mobile")
    )
    .flatMap((node) => parseAndroidUiNodes(node))
    .filter(
      (node) =>
        node.bounds.bottom - node.bounds.top >= 300 &&
        node.bounds.right - node.bounds.left >= 200
    )
    .sort(
      (a, b) =>
        b.bounds.bottom - b.bounds.top - (a.bounds.bottom - a.bounds.top)
    )
  const bounds = scrollAreas
    .map((node) => ({
      ...node.bounds,
      top: Math.max(node.bounds.top, bodyBounds?.top ?? node.bounds.top),
      bottom: Math.min(
        node.bounds.bottom,
        bodyBounds?.bottom ?? node.bounds.bottom
      ),
    }))
    .find((area) => area.bottom - area.top >= 120)
  if (!bounds) return null
  const height = bounds.bottom - bounds.top
  const x = Math.round((bounds.left + bounds.right) / 2)
  const high = Math.round(bounds.top + height * 0.25)
  const low = Math.round(bounds.top + height * 0.8)
  return {
    x,
    fromY: direction === "up" ? low : high,
    toY: direction === "up" ? high : low,
  }
}

export function readOperationProfileInputObservation(xml: string) {
  const input = findAndroidUiNode(xml, {
    contentDescription: "Operation Profile change reason",
  })
  return {
    found: Boolean(input),
    focused: input?.focused === true,
    enabled: input?.enabled === true,
    textLength: input?.text.length ?? null,
    fieldBounds: input?.bounds ?? null,
  }
}

export function resolveAndroidVerifiedTextAppend(input: {
  expectedValue: string
  observedValue: string
  maxChunkLength?: number
}) {
  if (!input.expectedValue.startsWith(input.observedValue)) {
    return { kind: "diverged" as const }
  }
  if (input.expectedValue === input.observedValue) {
    return { kind: "complete" as const }
  }

  const targetLength = Math.min(
    input.expectedValue.length,
    input.observedValue.length + (input.maxChunkLength ?? 28)
  )
  return {
    kind: "append" as const,
    encodedValue: input.expectedValue
      .slice(input.observedValue.length, targetLength)
      .replaceAll(" ", "%s"),
    targetLength,
  }
}

export function resolveAndroidTextInputSwipe(
  xml: string,
  label: string,
  direction: "up" | "down",
  viewport: { top: number; bottom: number }
) {
  const input = findAndroidUiNode(xml, { contentDescription: label })
  if (!input?.focused || !input.enabled || !isVisibleNode(input)) return null
  const { top, bottom, left, right } = input.bounds
  if (
    top < viewport.top ||
    bottom > viewport.bottom ||
    bottom - top < 80 ||
    right - left < 80
  )
    return null
  const x = Math.round((left + right) / 2)
  const high = Math.round(top + (bottom - top) * 0.25)
  const low = Math.round(top + (bottom - top) * 0.75)
  return {
    x,
    fromY: direction === "up" ? low : high,
    toY: direction === "up" ? high : low,
  }
}

export function findAndroidWorkspaceSwitchNode(xml: string, roleLabel: string) {
  return findAndroidUiNode(xml, {
    contentDescription: `Switch to ${roleLabel} workspace`,
  })
}

export function isAndroidDebuggablePackage(packageDump: string) {
  return /^\s*(?:flags|pkgFlags)=\[[^\]\r\n]*\bDEBUGGABLE\b[^\]\r\n]*\]/m.test(
    packageDump
  )
}

export function isMemberOnlyAndroidShell(xml: string) {
  const nodes = parseAndroidUiNodes(xml)
  return (
    Boolean(
      findAndroidUiNode(xml, { contentDescription: "Member home tab" }) &&
      findAndroidUiNode(xml, { contentDescription: "More member services tab" })
    ) &&
    !nodes.some(
      (node) =>
        /^Admin .* tab$/.test(node.contentDescription) ||
        [
          "More admin services tab",
          "Open finance operations",
          "Search finance queue",
        ].includes(node.contentDescription) ||
        ["Unmatched Route", "Page not found"].includes(node.text)
    )
  )
}

export function readProcurementReadOnlyCheck(xml: string) {
  const nodes = parseAndroidUiNodes(xml)
  const hasText = (text: string) => nodes.some((node) => node.text === text)
  const hasSemanticLabel = (label: string) =>
    nodes.some(
      (node) => node.text === label || node.contentDescription.includes(label)
    )
  const forbiddenLabels = [
    "Procurement item description",
    "Procurement item name",
    "Procurement repayment months",
    "Procurement requested cost",
    "Procurement vendor",
    "Quick fill procurement request",
    "Review request",
  ]

  return {
    createActionAbsent: !hasText("New request") && !hasText("Continue request"),
    formAbsent:
      !forbiddenLabels.some(hasSemanticLabel) &&
      !hasSemanticLabel("Bottom sheet backdrop"),
    historySurfacePresent:
      hasText("Outstanding") &&
      [
        "Active purchase",
        "History",
        "Requests",
        "No procurement requests",
      ].some(hasText),
    reasonPresent: hasText(
      "Procurement is currently read-only. Existing requests remain available."
    ),
    reasonVisible: nodes.some(
      (node) =>
        node.text ===
          "Procurement is currently read-only. Existing requests remain available." &&
        isVisibleNode(node)
    ),
    restrictionPresent: hasText("New request unavailable"),
    restrictionVisible: nodes.some(
      (node) => node.text === "New request unavailable" && isVisibleNode(node)
    ),
    screenPresent: hasText("Procurement"),
  }
}

export const WORKSPACE_ACCESS_CHECKPOINTS = [
  { label: "Open invite form", file: "09-access-summary.png" },
  { label: "Users and roles", file: "10-access-users.png" },
  { label: "Role coverage", file: "11-access-roles.png" },
  { label: "Sign out", file: "12-access-bottom.png" },
] as const

// IDs stay in memory; the receipt persists aggregate coverage only.
export function findWorkspaceAccessRowIds(xml: string, contentBottom: number) {
  return [...xml.matchAll(/<node\b[^>]*>/g)].flatMap(([element]) => {
    const id = readAttribute(element, "resource-id")
    if (!/^workspace-access-(user|role)-[a-zA-Z0-9_-]+$/.test(id)) return []
    const node = parseAndroidUiNodes(element)[0]
    if (
      !node ||
      node.bounds.top <= 100 ||
      node.bounds.bottom >= contentBottom - 8 ||
      node.bounds.bottom <= node.bounds.top
    )
      return []
    return [id]
  })
}

export function hasWorkspaceScreenshotCoverage(
  names: string[],
  matrix: boolean
) {
  const prefixes = matrix
    ? ["light-100-", "dark-100-", "light-200-", "dark-200-"]
    : [""]
  const required = [
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
  const observed = new Set(names)
  return (
    observed.size === names.length &&
    prefixes.every((prefix) =>
      required.every((file) => observed.has(`${prefix}${file}`))
    )
  )
}

export function findAndroidExpoLaunchDismissNode(xml: string) {
  const nodes = parseAndroidUiNodes(xml)
  const introduction = nodes.some((node) =>
    node.text.startsWith("This is the developer menu.")
  )
  if (introduction) return findAndroidUiNode(xml, { text: "Continue" })

  const developerMenu =
    nodes.some((node) => node.text.startsWith("Runtime version:")) &&
    nodes.some((node) => node.text === "Connected to:") &&
    nodes.some((node) => node.contentDescription === "Toggle Dev Menu")
  return developerMenu
    ? findAndroidUiNode(xml, { contentDescription: "Close" })
    : undefined
}

export function findAndroidQaProfileNode(
  xml: string,
  identityLabel: string,
  role: string
) {
  const normalizedRole = role.replaceAll("_", " ").toLowerCase()
  return parseAndroidUiNodes(xml).find((node) => {
    const roleSegments = node.contentDescription
      .split(",")
      .map((segment) => segment.trim().replaceAll("_", " ").toLowerCase())
    return (
      node.contentDescription.includes(identityLabel) &&
      roleSegments.includes(normalizedRole)
    )
  })
}

export function chunkAndroidNumericText(value: string, chunkSize = 6) {
  if (!/^\d+$/.test(value) || chunkSize < 1) {
    throw new Error(
      "Android numeric text must use positive-sized digit chunks."
    )
  }
  return Array.from(
    { length: Math.ceil(value.length / chunkSize) },
    (_, index) => value.slice(index * chunkSize, (index + 1) * chunkSize)
  )
}

export function androidKeyCodeForNumericDigit(value: string) {
  if (!/^\d$/.test(value)) {
    throw new Error("Android numeric key events require one digit.")
  }
  return Number(value) + 7
}

export function resolveAndroidCredentialEntryAction(input: {
  expectedLength: number
  observedLength: number
}) {
  if (input.observedLength === input.expectedLength) return "accepted" as const
  if (input.observedLength === input.expectedLength - 1) return "retry" as const

  throw new Error(
    `Android secure input diverged (expected ${input.expectedLength}, observed ${input.observedLength}).`
  )
}

function findAndroidFloatingSheetNode(
  xml: string,
  contentDescriptions: string[]
) {
  return parseAndroidUiNodes(xml)
    .filter(
      (node) =>
        contentDescriptions.includes(node.contentDescription) &&
        node.bounds.right - node.bounds.left >= 900
    )
    .sort((left, right) => left.bounds.top - right.bounds.top)[0]
}

export function resolveAndroidFloatingSheetExpansionGesture(
  xml: string,
  contentDescriptions: string[]
) {
  const sheet = findAndroidFloatingSheetNode(xml, contentDescriptions)

  if (!sheet || sheet.bounds.top <= 300) return null

  const startX = Math.round((sheet.bounds.left + sheet.bounds.right) / 2)
  return {
    endX: startX,
    endY: 420,
    startX,
    startY: Math.min(sheet.bounds.top + 36, sheet.bounds.bottom - 120),
  }
}

export function readAndroidCalendarCheckpoint(xml: string, label: string) {
  const sheet = findAndroidUiNode(xml, {
    contentDescription: `${label} calendar`,
  })
  const title = findAndroidUiNodeBySemanticLabel(xml, "Change calendar view")
  return {
    backdropVisible: Boolean(
      findAndroidUiNode(xml, { contentDescription: "Bottom sheet backdrop" })
    ),
    sheetBounds: sheet?.bounds ?? null,
    title: title?.contentDescription ?? null,
  }
}

export function resolveAndroidCalendarSwipe(
  xml: string,
  label: string,
  direction: "next" | "previous"
) {
  const sheet = findAndroidUiNode(xml, {
    contentDescription: `${label} calendar`,
  })
  if (
    !sheet ||
    !isVisibleNode(sheet) ||
    sheet.bounds.right - sheet.bounds.left < 600 ||
    sheet.bounds.bottom - sheet.bounds.top < 600
  ) {
    return null
  }

  const width = sheet.bounds.right - sheet.bounds.left
  const height = sheet.bounds.bottom - sheet.bounds.top
  const left = Math.round(sheet.bounds.left + width * 0.2)
  const right = Math.round(sheet.bounds.left + width * 0.8)
  const y = Math.round(sheet.bounds.top + height * 0.55)
  return {
    fromX: direction === "next" ? right : left,
    toX: direction === "next" ? left : right,
    y,
  }
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function isVisibleNode(node: AndroidUiNode) {
  return (
    node.bounds.bottom > node.bounds.top &&
    node.bounds.right > node.bounds.left &&
    node.bounds.bottom > 0 &&
    node.bounds.top < 2_220
  )
}

function isVisibleExpandedProfileSheetNode(node: AndroidUiNode) {
  // Profile selection runs with the keyboard closed. Keep taps comfortably
  // above the navigation/footer region while allowing the last fully visible
  // Pixel 3a row, which can settle just below the old 1,250px cutoff.
  return isVisibleNode(node) && node.bounds.bottom <= 1_500
}

export function isAndroidUiNodeWithinFloatingSheet(
  xml: string,
  node: AndroidUiNode,
  contentDescriptions: string[]
) {
  const sheet = findAndroidFloatingSheetNode(xml, contentDescriptions)
  return Boolean(
    sheet &&
    isVisibleNode(node) &&
    node.bounds.left >= sheet.bounds.left &&
    node.bounds.right <= sheet.bounds.right &&
    node.bounds.top >= sheet.bounds.top &&
    node.bounds.bottom <= sheet.bounds.bottom
  )
}

async function runProcess(
  command: string,
  args: string[],
  options: { binary?: boolean; timeoutMs?: number } = {}
) {
  return new Promise<Buffer>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    const timeout = setTimeout(() => {
      child.kill("SIGTERM")
      reject(new Error("Android command timed out."))
    }, options.timeoutMs ?? 30_000)

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk))
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk))
    child.on("error", (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    child.on("close", (code) => {
      clearTimeout(timeout)
      if (code !== 0) {
        reject(
          new Error(
            `Android command failed${stderr.length ? "." : " without diagnostics."}`
          )
        )
        return
      }
      resolve(Buffer.concat(stdout))
    })
  })
}

export class ProductionQaAndroidDriver {
  private readonly adbPath: string
  private readonly evidenceDirectory: string
  private readonly launchUrl: string | null
  private readonly packageName: string
  private readonly serial: string
  private workspaceTraceSequence = 0
  private authorizationCheckpoint:
    | "not-started"
    | "launch"
    | "open-qa-access"
    | "clear-existing-access"
    | "enter-domain"
    | "focus-credential"
    | "enter-credential"
    | "authorize-device"
    | "select-profile"
    | "workspace-ready" = "not-started"

  /** Bounded progress only: never expose credentials, UI text or caught errors. */
  getAuthorizationCheckpoint() {
    return this.authorizationCheckpoint
  }

  constructor(input: {
    adbPath?: string
    evidenceDirectory: string
    launchUrl?: string | null
    packageName?: string
    serial: string
  }) {
    this.adbPath = input.adbPath ?? DEFAULT_ADB_PATH
    this.evidenceDirectory = input.evidenceDirectory
    this.launchUrl = input.launchUrl ?? null
    this.packageName = input.packageName ?? "com.halaalvest.mobile"
    this.serial = input.serial
  }

  private adb(args: string[], options?: { timeoutMs?: number }) {
    return runProcess(this.adbPath, ["-s", this.serial, ...args], options)
  }

  private async dumpUi() {
    let lastError: unknown = null
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await this.adb(["shell", "uiautomator", "dump", UI_DUMP_PATH], {
          timeoutMs: 15_000,
        })
        const xml = (
          await this.adb(["exec-out", "cat", UI_DUMP_PATH], {
            timeoutMs: 10_000,
          })
        ).toString("utf8")
        if (!xml.includes("<hierarchy")) {
          throw new Error("Android UI hierarchy was empty.")
        }
        return xml
      } catch (error) {
        lastError = error
        await wait(600 * (attempt + 1))
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Android UI hierarchy could not be captured.")
  }

  private async waitForNode(
    input: { contentDescription?: string; text?: string },
    timeoutMs = 20_000
  ) {
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeoutMs) {
      const xml = await this.dumpUi()
      const node = findAndroidUiNode(xml, input)
      if (node) return node
      await wait(450)
    }
    const expected = input.contentDescription
      ? `accessibility label "${input.contentDescription}"`
      : `text "${input.text ?? "unknown"}"`
    throw new Error(
      `The Android control with ${expected} did not become available.`
    )
  }

  private async waitForAnyNode(
    inputs: Array<{ contentDescription?: string; text?: string }>,
    timeoutMs = 20_000
  ) {
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeoutMs) {
      const xml = await this.dumpUi()
      const node = inputs
        .map((input) => findAndroidUiNode(xml, input))
        .find((candidate) => candidate != null)
      if (node) return node
      await wait(450)
    }
    throw new Error("The expected Android control did not become available.")
  }

  private async waitForSemanticNode(label: string, timeoutMs = 20_000) {
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeoutMs) {
      const node = findAndroidUiNodeBySemanticLabel(await this.dumpUi(), label)
      if (node) return node
      await wait(450)
    }
    throw new Error(
      `The Android control containing semantic label "${label}" did not become available.`
    )
  }

  private async waitForEnabledNode(
    input: { contentDescription?: string; text?: string },
    timeoutMs = 20_000
  ) {
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeoutMs) {
      const node = findAndroidUiNode(await this.dumpUi(), input)
      if (node?.enabled && isVisibleNode(node)) return node
      await wait(450)
    }
    throw new Error(
      "The expected enabled Android control did not become available."
    )
  }

  private async waitForNodesAbsent(
    inputs: Array<{ contentDescription?: string; text?: string }>,
    timeoutMs = 20_000
  ) {
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeoutMs) {
      const xml = await this.dumpUi()
      if (inputs.every((input) => !findAndroidUiNode(xml, input))) return xml
      await wait(450)
    }
    throw new Error("The stale Android surface did not finish dismissing.")
  }

  private async waitForFocusedNode(
    input: { contentDescription?: string; text?: string },
    timeoutMs = 5_000
  ) {
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeoutMs) {
      const node = findAndroidUiNode(await this.dumpUi(), input)
      if (node?.focused && isVisibleNode(node)) return node
      await wait(250)
    }
    throw new Error(
      "The expected Android input did not receive focus before text entry."
    )
  }

  private async waitForSettledOperationProfileScreen(timeoutMs = 20_000) {
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeoutMs) {
      if (hasSettledOperationProfileScreen(await this.dumpUi())) return
      await wait(450)
    }
    throw new Error("The Operation Profile sheet did not finish dismissing.")
  }

  private async tap(node: AndroidUiNode) {
    const x = Math.round((node.bounds.left + node.bounds.right) / 2)
    const y = Math.round((node.bounds.top + node.bounds.bottom) / 2)
    await this.adb(["shell", "input", "tap", String(x), String(y)])
  }

  private async tapNode(input: { contentDescription?: string; text?: string }) {
    await this.tap(await this.waitForNode(input))
  }

  private async inputText(value: string) {
    await this.adb(["shell", "input", "text", value])
  }

  private async inputTextUntilExpected(input: {
    contentDescription: string
    expectedValue: string
  }) {
    for (let attempt = 0; attempt < 48; attempt += 1) {
      const node = findAndroidUiNode(await this.dumpUi(), {
        contentDescription: input.contentDescription,
      })
      if (!node?.focused) {
        throw new Error(
          "The verified Android text input lost focus during entry."
        )
      }
      const action = resolveAndroidVerifiedTextAppend({
        expectedValue: input.expectedValue,
        observedValue: node.text,
      })
      if (action.kind === "complete") return
      if (action.kind === "diverged") {
        throw new Error(
          "The verified Android text input diverged from the expected prefix."
        )
      }

      await this.inputText(action.encodedValue)
      await wait(180)
    }
    throw new Error(
      "The verified Android text input did not reach the expected value."
    )
  }

  private async inputTesterCredential(credential: string) {
    if (!/^\d{78}$/.test(credential)) {
      throw new Error(
        "The Android QA credential must be the 78-digit generated value."
      )
    }
    let expectedLength = 0
    for (const digit of credential) {
      expectedLength += 1
      let accepted = false
      for (let attempt = 0; attempt < 3; attempt += 1) {
        await this.adb([
          "shell",
          "input",
          "keyevent",
          String(androidKeyCodeForNumericDigit(digit)),
        ])
        await wait(120)
        const credentialInput = findAndroidUiNode(await this.dumpUi(), {
          contentDescription: "Tester credential",
        })
        if (!credentialInput?.focused) {
          throw new Error(
            "The Android QA credential input lost focus during text entry."
          )
        }
        const action = resolveAndroidCredentialEntryAction({
          expectedLength,
          observedLength: credentialInput.text.length,
        })
        if (action === "accepted") {
          accepted = true
          break
        }
      }
      if (!accepted) {
        throw new Error(
          `The Android QA credential did not settle at the expected masked length ${expectedLength}.`
        )
      }
    }
    await wait(450)
  }

  private async pressKey(keyCode: number) {
    await this.adb(["shell", "input", "keyevent", String(keyCode)])
  }

  private async swipeProfileListUp() {
    await this.adb([
      "shell",
      "input",
      "swipe",
      "540",
      "1100",
      "540",
      "600",
      "350",
    ])
    await wait(450)
  }

  private async expandFloatingSheet(contentDescriptions: string[]) {
    const gesture = resolveAndroidFloatingSheetExpansionGesture(
      await this.dumpUi(),
      contentDescriptions
    )
    if (!gesture) return

    await this.adb([
      "shell",
      "input",
      "swipe",
      String(gesture.startX),
      String(gesture.startY),
      String(gesture.endX),
      String(gesture.endY),
      "500",
    ])
    await wait(650)
  }

  private async swipePageUp() {
    await this.swipePage("up")
  }

  private async swipePageDown() {
    await this.swipePage("down")
  }

  private async swipePage(
    direction: "up" | "down",
    bodyBounds?: { top: number; bottom: number }
  ) {
    const gesture = resolveAndroidPageSwipe(
      await this.dumpUi(),
      direction,
      bodyBounds
    )
    if (!gesture)
      throw new Error("No visible application scroll viewport was found.")
    await this.adb([
      "shell",
      "input",
      "swipe",
      String(gesture.x),
      String(gesture.fromY),
      String(gesture.x),
      String(gesture.toY),
      "350",
    ])
    await wait(450)
  }

  private async swipeCalendar(label: string, direction: "next" | "previous") {
    const gesture = resolveAndroidCalendarSwipe(
      await this.dumpUi(),
      label,
      direction
    )
    if (!gesture) {
      throw new Error(`The ${label} calendar swipe target was not available.`)
    }
    await this.adb([
      "shell",
      "input",
      "swipe",
      String(gesture.fromX),
      String(gesture.y),
      String(gesture.toX),
      String(gesture.y),
      "420",
    ])
    await wait(650)
  }

  private async screenshot(fileName: string) {
    await mkdir(this.evidenceDirectory, { recursive: true })
    const output = await this.adb(["exec-out", "screencap", "-p"])
    const outputPath = path.join(this.evidenceDirectory, fileName)
    await writeFile(outputPath, output)
    return outputPath
  }

  private async restartApp() {
    if (this.launchUrl?.includes("expo-development-client")) {
      const packageDump = (
        await this.adb(["shell", "dumpsys", "package", this.packageName])
      ).toString("utf8")
      if (!isAndroidDebuggablePackage(packageDump)) {
        throw new Error(
          "Expo QA requires the debug client; the installed APK is not debuggable."
        )
      }
    }
    await this.adb(["shell", "am", "force-stop", this.packageName])
    await this.adb(
      this.launchUrl
        ? [
            "shell",
            "am",
            "start",
            "-a",
            "android.intent.action.VIEW",
            "-d",
            this.launchUrl,
            this.packageName,
          ]
        : ["shell", "am", "start", "-n", `${this.packageName}/.MainActivity`]
    )
    await wait(2_500)

    let xml = await this.dumpUi()
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const expoDismiss = findAndroidExpoLaunchDismissNode(xml)
      if (!expoDismiss) break
      await this.tap(expoDismiss)
      await wait(500)
      xml = await this.dumpUi()
    }
    return xml
  }

  async enterQaProfile(input: {
    credential: string
    expectedMemberNumber?: string
    expectedShell?: "admin" | "member"
    expectedRole: string
    identityLabel: string
    qaDomain: string
  }) {
    this.authorizationCheckpoint = "launch"
    let xml = await this.restartApp()
    if (
      /<node\b[^>]*class="android\.widget\.EditText"[^>]*focused="true"/.test(
        xml
      )
    ) {
      await this.pressKey(4)
      await wait(450)
      xml = await this.dumpUi()
    }
    const existingSheetClose =
      findAndroidUiNode(xml, {
        contentDescription: "Close Set up QA access",
      }) ??
      findAndroidUiNode(xml, {
        contentDescription: "Close Update QA access",
      })
    if (existingSheetClose) {
      await this.tap(existingSheetClose)
      await wait(500)
    }

    this.authorizationCheckpoint = "open-qa-access"
    const qaAccessTrigger = await this.waitForAnyNode([
      { contentDescription: "Open QA access" },
      { contentDescription: "Update QA access" },
    ])
    const hasExistingAuthorization =
      qaAccessTrigger.contentDescription === "Update QA access"
    await this.tap(qaAccessTrigger)
    await this.waitForAnyNode([
      { contentDescription: "Set up QA access" },
      { contentDescription: "Update QA access" },
    ])
    if (hasExistingAuthorization) {
      this.authorizationCheckpoint = "clear-existing-access"
      let authorizationCleared = false
      await this.expandFloatingSheet(["Update QA access"])
      for (let attempt = 0; attempt < 32; attempt += 1) {
        xml = await this.dumpUi()
        const changeDomain = findAndroidUiNode(xml, {
          text: "Change QA Domain",
        })
        if (changeDomain && isVisibleExpandedProfileSheetNode(changeDomain)) {
          await this.tap(changeDomain)
          await this.waitForNode({ contentDescription: "QA Domain" })
          authorizationCleared = true
          break
        }
        await this.swipeProfileListUp()
      }
      if (!authorizationCleared) {
        throw new Error(
          "The existing Android QA authorization could not be cleared."
        )
      }
    }

    this.authorizationCheckpoint = "enter-domain"
    await this.tapNode({ contentDescription: "QA Domain" })
    await this.inputText(input.qaDomain)
    await this.pressKey(66)
    this.authorizationCheckpoint = "focus-credential"
    const testerCredentialInput = await this.waitForNode({
      contentDescription: "Tester credential",
    })
    await this.tap(testerCredentialInput)
    await this.waitForFocusedNode({
      contentDescription: "Tester credential",
    })
    this.authorizationCheckpoint = "enter-credential"
    await this.inputTesterCredential(input.credential)
    await this.pressKey(4)
    await wait(850)
    await this.expandFloatingSheet(["Set up QA access"])
    this.authorizationCheckpoint = "authorize-device"
    await this.tap(
      await this.waitForEnabledNode({
        contentDescription: "Authorize this device",
      })
    )

    await this.waitForNode({ text: "Choose a test profile." }, 25_000)
    this.authorizationCheckpoint = "select-profile"
    await this.expandFloatingSheet(["Set up QA access", "Update QA access"])

    let observedProfileBounds: AndroidUiNode["bounds"] | null = null
    for (let attempt = 0; attempt < 32; attempt += 1) {
      xml = await this.dumpUi()
      const profile = findAndroidQaProfileNode(
        xml,
        input.identityLabel,
        input.expectedRole
      )
      if (profile) observedProfileBounds = profile.bounds
      if (profile && isVisibleExpandedProfileSheetNode(profile)) {
        await this.tap(profile)
        await this.waitForNode(
          {
            contentDescription:
              input.expectedShell === "admin"
                ? "Admin overview tab"
                : "Member home tab",
          },
          25_000
        )
        if (input.expectedShell !== "admin") {
          await this.waitForNode(
            { text: input.expectedMemberNumber ?? "QSH-0001" },
            25_000
          )
        }
        this.authorizationCheckpoint = "workspace-ready"
        return
      }
      await this.swipeProfileListUp()
    }

    throw new Error(
      observedProfileBounds
        ? `The requested Android QA profile stayed outside the verified interaction viewport (${observedProfileBounds.top}-${observedProfileBounds.bottom}).`
        : "The requested Android QA profile was not present in the accessibility tree."
    )
  }

  async captureProcurementBaseline(
    presentationOnly = false,
    exerciseInputs = false,
    prefix = "",
    inspectFooter = false
  ) {
    const screenshots: string[] = []
    const capture = (name: string) => this.screenshot(`${prefix}${name}`)
    if (presentationOnly) {
      // Existing __DEV__ presentation only: never invoke a submission here.
      await this.adb([
        "shell",
        "am",
        "start",
        "-a",
        "android.intent.action.VIEW",
        "-d",
        "halaalvest-dev://procurement?qaState=empty",
        this.packageName,
      ])
      await this.waitForNode({ text: "Procurement" })
      await this.tap(
        await this.waitForAnyNode([
          { text: "New request" },
          { text: "Continue request" },
        ])
      )
      await this.waitForNode({ contentDescription: "Procurement item name" })
      if (inspectFooter) {
        // Clear only this isolated development draft through ordinary input controls.
        // No persisted financial record is touched and Quick Fill never submits.
        for (const label of [
          "Procurement item name",
          "Procurement vendor",
          "Procurement requested cost",
          "Procurement repayment months",
          "Procurement item description",
        ]) {
          const field = await this.revealProcurementInput(label)
          if (
            !field.text ||
            field.text.startsWith("e.g.") ||
            field.text === "What will you use it for?"
          )
            continue
          await this.tap(field)
          await this.pressKey(123)
          await this.adb([
            "shell",
            "input",
            "keyevent",
            ...Array.from({ length: field.text.length + 1 }, () => "67"),
          ])
          await this.pressKey(4)
          await wait(500)
        }
        // Return to the first field before comparing empty and filled layout.
        await this.revealProcurementInput("Procurement item name")
      }
      const initialXml = await this.dumpUi()
      const quickFill = findAndroidUiNode(initialXml, {
        contentDescription: "Quick fill procurement request",
      })
      const existingItem = findAndroidUiNode(initialXml, {
        contentDescription: "Procurement item name",
      })
      if (exerciseInputs && !quickFill && existingItem?.text) {
        await this.tap(existingItem)
        await this.pressKey(123)
        await this.adb([
          "shell",
          "input",
          "keyevent",
          ...Array.from({ length: existingItem.text.length + 1 }, () => "67"),
        ])
        await this.pressKey(4)
        await wait(450)
      }
      if (exerciseInputs) {
        await this.waitForProcurementFormAction(false)
        const disabledAction = parseAndroidUiNodes(await this.dumpUi()).find(
          (node) =>
            !node.enabled && node.contentDescription.includes("Review request")
        )
        await writeFile(
          path.join(this.evidenceDirectory, `${prefix}disabled-action.json`),
          JSON.stringify({ observedDisabled: Boolean(disabledAction) })
        )
        if (!disabledAction)
          throw new Error(
            "The missing-item procurement action was not disabled."
          )
        screenshots.push(await capture("02-procurement-form-before.png"))
        if (inspectFooter) {
          await this.captureProcurementFooterGeometry(`${prefix}empty`)
          await wait(3000)
          await this.captureProcurementFooterGeometry(`${prefix}empty-idle`)
          screenshots.push(await capture("02b-procurement-empty-idle.png"))
        }
        if (quickFill) await this.tap(quickFill)
        else if (existingItem?.text) {
          await this.tapNode({ contentDescription: "Procurement item name" })
          await this.inputText(existingItem.text.replaceAll(" ", "%s"))
          await this.pressKey(4)
        }
        await this.waitForProcurementFormAction(true)
        screenshots.push(await capture("03-procurement-populated.png"))
        if (inspectFooter) {
          await this.captureProcurementFooterGeometry(`${prefix}populated`)
          await wait(3000)
          await this.captureProcurementFooterGeometry(`${prefix}populated-idle`)
          screenshots.push(await capture("03b-procurement-populated-idle.png"))
        }
        const labels = [
          "Procurement item name",
          "Procurement vendor",
          "Procurement requested cost",
          "Procurement repayment months",
          "Procurement item description",
        ]
        const measurements = []
        for (const [index, label] of labels.entries()) {
          let input: AndroidUiNode | undefined
          for (let attempt = 0; attempt < 6; attempt += 1) {
            const xml = await this.dumpUi()
            input = findAndroidUiNode(xml, { contentDescription: label })
            const header = findAndroidUiNode(xml, {
              contentDescription: "Close New procurement request",
            })
            const footer = findAndroidUiNode(xml, { text: "Review request" })
            if (
              input &&
              isVisibleNode(input) &&
              input.bounds.top > (header?.bounds.bottom ?? 100) &&
              input.bounds.bottom < (footer?.bounds.top ?? 2000)
            )
              break
            await this.swipePageUp()
          }
          if (!input || !input.text.trim())
            throw new Error(
              `Procurement field ${index + 1} is unreachable or empty.`
            )
          await this.tap(input)
          await wait(900)
          const xml = await this.dumpUi()
          const focused = findAndroidUiNode(xml, { contentDescription: label })
          const action = findAndroidUiNode(xml, { text: "Review request" })
          const ime = (
            await this.adb(["shell", "dumpsys", "input_method"])
          ).toString("utf8")
          const keyboardVisible = /mInputShown=true/.test(ime)
          const clearOfFooter = Boolean(
            focused && action && focused.bounds.bottom <= action.bounds.top
          )
          screenshots.push(await capture(`keyboard-${index + 1}.png`))
          measurements.push({
            field: label,
            focused: focused?.focused === true,
            keyboardVisible,
            clearOfFooter,
            inputBounds: focused?.bounds,
            actionBounds: action?.bounds,
          })
          await writeFile(
            path.join(
              this.evidenceDirectory,
              `${prefix}keyboard-measurements.json`
            ),
            JSON.stringify(measurements, null, 2)
          )
          if (!focused?.focused || !keyboardVisible || !clearOfFooter) {
            throw new Error(
              `Procurement field ${index + 1} failed keyboard clearance.`
            )
          }
          await this.pressKey(4)
          await wait(450)
        }
        await this.tapNode({ text: "Review request" })
        await this.waitForNode({ text: "Review procurement request" })
        screenshots.push(await capture("04-procurement-review.png"))
        if (
          findAndroidUiNode(await this.dumpUi(), { text: "Review request" })
        ) {
          throw new Error(
            "The parent procurement action remains exposed under review."
          )
        }
        await this.tapNode({ text: "Review again" })
        await this.waitForProcurementFormAction(true)
        screenshots.push(await capture("05-procurement-final.png"))
      } else screenshots.push(await capture("02-procurement-form-before.png"))
      await this.tapNode({
        contentDescription: "Close New procurement request",
      })
      const close = findAndroidUiNode(await this.dumpUi(), {
        text: "Close form",
      })
      if (close) await this.tap(close)
      return screenshots
    }
    await this.tapNode({ contentDescription: "More member services tab" })
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const node = parseAndroidUiNodes(await this.dumpUi()).find(
        (candidate) =>
          /^Open Procurement(?:\.|$)/.test(candidate.contentDescription) &&
          isVisibleNode(candidate)
      )
      if (node) {
        await this.tap(node)
        await this.waitForNode({ text: "Procurement" })
        await wait(750)
        screenshots.push(await this.screenshot("01-procurement-before.png"))
        await this.tap(
          await this.waitForAnyNode([
            { text: "New request" },
            { text: "Continue request" },
          ])
        )
        await this.waitForNode({ contentDescription: "Procurement item name" })
        screenshots.push(
          await this.screenshot("02-procurement-form-before.png")
        )
        return screenshots
      }
      await this.swipePageUp()
    }
    throw new Error("The member procurement entry was not reachable.")
  }

  async captureOperationProfileBaseline(exerciseDraft = false) {
    const screenshots: string[] = []
    await this.tapNode({ contentDescription: "More admin services tab" })
    await this.waitForNode({ text: "Workspace access" })
    await wait(500)
    await this.waitForNode({ text: "Workspace access" })
    screenshots.push(
      await this.screenshot("01-more-before-operation-profile.png")
    )
    let opened = false
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const entry = findAndroidUiNode(await this.dumpUi(), {
        text: "Operation Profile",
      })
      if (entry && isVisibleNode(entry)) {
        await this.tap(entry)
        opened = true
        break
      }
      await this.swipePageUp()
    }
    if (!opened)
      throw new Error("The Operation Profile entry was not reachable.")
    await this.waitForNode({ contentDescription: "Refresh Operation Profile" })
    await this.waitForNode({ text: "Member channels" })
    screenshots.push(await this.screenshot("02-operation-profile-baseline.png"))
    await this.openOperationProfileProcurementEditor()
    screenshots.push(await this.screenshot("03-procurement-access-editor.png"))
    if (exerciseDraft) {
      await this.tapNode({
        contentDescription: "Not offered. Unavailable for new work",
      })
      const review = await this.waitForNode({
        contentDescription: "Review Procurement access change",
      })
      if (review.enabled)
        throw new Error(
          "A restrictive change without a reason must not be reviewable."
        )
      screenshots.push(
        await this.screenshot("03b-required-reason-disabled.png")
      )
    }
    let reasonRevealed = false
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const xml = await this.dumpUi()
      const reason = findAndroidUiNode(xml, {
        contentDescription: "Operation Profile change reason",
      })
      const footer = findAndroidUiNode(xml, {
        contentDescription: "Review Procurement access change",
      })
      const header = findAndroidUiNode(xml, {
        contentDescription: "Close Procurement",
      })
      if (
        reason &&
        footer &&
        header &&
        isVisibleNode(reason) &&
        reason.bounds.top >= header.bounds.bottom &&
        reason.bounds.bottom <= footer.bounds.top
      ) {
        await this.tap(reason)
        reasonRevealed = true
        break
      }
      if (!header || !footer)
        throw new Error(
          "The Operation Profile sheet bounds were not available."
        )
      await this.swipePage("up", {
        top: header.bounds.bottom,
        bottom: footer.bounds.top,
      })
    }
    if (!reasonRevealed)
      throw new Error(
        "The Operation Profile reason input was not reachable inside the sheet."
      )
    await this.waitForFocusedNode({
      contentDescription: "Operation Profile change reason",
    })
    await wait(700)
    screenshots.push(await this.screenshot("04-change-reason-keyboard.png"))
    const keyboardXml = await this.dumpUi()
    const focused = findAndroidUiNode(keyboardXml, {
      contentDescription: "Operation Profile change reason",
    })
    const reasonLabel = findAndroidUiNode(keyboardXml, {
      text: "Change reason",
    })
    const sheetHeader = findAndroidUiNode(keyboardXml, {
      contentDescription: "Close Procurement",
    })
    const footer = findAndroidUiNode(keyboardXml, {
      contentDescription: "Review Procurement access change",
    })
    const ime = (await this.adb(["shell", "dumpsys", "input_method"])).toString(
      "utf8"
    )
    const keyboardTop = readAndroidVisibleKeyboardTop(
      (await this.adb(["shell", "dumpsys", "window"])).toString("utf8")
    )
    const keyboardEvidence = {
      focused: focused?.focused === true,
      keyboardVisible: /mInputShown=true/.test(ime),
      fieldBounds: focused?.bounds ?? null,
      labelBounds: reasonLabel?.bounds ?? null,
      labelVisible: Boolean(
        reasonLabel &&
        sheetHeader &&
        focused &&
        reasonLabel.bounds.top >= sheetHeader.bounds.bottom &&
        reasonLabel.bounds.bottom <= focused.bounds.top &&
        isVisibleNode(reasonLabel)
      ),
      footerBounds: footer?.bounds ?? null,
      keyboardTop,
      clearOfKeyboard: Boolean(
        focused && keyboardTop !== null && focused.bounds.bottom <= keyboardTop
      ),
      clearOfFooter:
        !footer ||
        Boolean(focused && focused.bounds.bottom <= footer.bounds.top),
    }
    await writeFile(
      path.join(this.evidenceDirectory, "keyboard-check.json"),
      JSON.stringify(keyboardEvidence, null, 2)
    )
    if (
      !keyboardEvidence.focused ||
      !keyboardEvidence.keyboardVisible ||
      !keyboardEvidence.clearOfKeyboard ||
      !keyboardEvidence.clearOfFooter ||
      !keyboardEvidence.labelVisible
    ) {
      throw new Error("Operation Profile keyboard clearance did not pass.")
    }
    if (exerciseDraft) {
      await this.inputText("QA%saudit%sreason")
      const populated = await this.waitForNode({
        contentDescription: "Operation Profile change reason",
        text: "QA audit reason",
      })
      const populatedLabel = findAndroidUiNode(await this.dumpUi(), {
        text: "Change reason",
      })
      if (
        !populated.focused ||
        keyboardTop === null ||
        populated.bounds.bottom > keyboardTop ||
        !populatedLabel ||
        !sheetHeader ||
        populatedLabel.bounds.top < sheetHeader.bounds.bottom ||
        populatedLabel.bounds.bottom > populated.bounds.top
      ) {
        throw new Error(
          "Typed Operation Profile reason was not visible above the keyboard."
        )
      }
      screenshots.push(await this.screenshot("04b-typed-reason-keyboard.png"))
      const longSuffix =
        ". The operations team reviewed the service policy with the cooperative administrator. Existing records must remain readable while new requests are paused. Reopening will require another documented review before members can submit new work."
      const longReason = `QA audit reason${longSuffix}`
      const recordLongInput = async (phase: string, xml = "") => {
        const observedXml = xml || (await this.dumpUi())
        const keyboardTop = readAndroidVisibleKeyboardTop(
          (await this.adb(["shell", "dumpsys", "window"])).toString("utf8")
        )
        await appendFile(
          path.join(this.evidenceDirectory, "long-reason-trace.jsonl"),
          JSON.stringify({
            phase,
            ...readOperationProfileInputObservation(observedXml),
            keyboardTop,
          }) + "\n"
        )
        return observedXml
      }
      await recordLongInput("before-entry")
      await this.inputTextUntilExpected({
        contentDescription: "Operation Profile change reason",
        expectedValue: longReason,
      })
      await recordLongInput("after-entry")
      screenshots.push(await this.screenshot("04b-long-reason-entered.png"))
      await this.waitForNode({
        contentDescription: "Operation Profile change reason",
        text: longReason,
      })
      const longKeyboardTop = readAndroidVisibleKeyboardTop(
        (await this.adb(["shell", "dumpsys", "window"])).toString("utf8")
      )
      if (longKeyboardTop === null)
        throw new Error("Long reason keyboard was not visible.")
      for (const direction of ["down", "up"] as const) {
        for (let gestureIndex = 0; gestureIndex < 6; gestureIndex += 1) {
          const gestureXml = await recordLongInput(
            `before-${direction}-${gestureIndex + 1}`
          )
          const gesture = resolveAndroidTextInputSwipe(
            gestureXml,
            "Operation Profile change reason",
            direction,
            { top: sheetHeader.bounds.bottom, bottom: longKeyboardTop }
          )
          if (!gesture)
            throw new Error(
              "Long reason swipe would leave the focused field or cross the keyboard."
            )
          await this.adb([
            "shell",
            "input",
            "swipe",
            String(gesture.x),
            String(gesture.fromY),
            String(gesture.x),
            String(gesture.toY),
            "350",
          ])
          await wait(250)
          if (gestureIndex === 0) {
            await recordLongInput(`after-first-${direction}`)
            screenshots.push(
              await this.screenshot(`04b-long-reason-first-${direction}.png`)
            )
          }
        }
        await this.waitForNode({
          contentDescription: "Operation Profile change reason",
          text: longReason,
        })
        screenshots.push(
          await this.screenshot(
            `04b-long-reason-${direction === "down" ? "start" : "end"}.png`
          )
        )
      }
      await writeFile(
        path.join(this.evidenceDirectory, "long-reason-check.json"),
        JSON.stringify(
          {
            valuePreserved: true,
            characterCount: longReason.length,
            focusedInputGestures: 12,
            keyboardTop: longKeyboardTop,
            visualScrollAcceptance: "requires-screenshot-review",
            confirmSubmitted: false,
          },
          null,
          2
        )
      )
    }
    await this.pressKey(4)
    await wait(500)
    if (exerciseDraft) {
      await this.tapNode({
        contentDescription: "Quick fill Operation Profile change reason",
      })
      await this.waitForEnabledNode({
        contentDescription: "Review Procurement access change",
      })
      await this.expandFloatingSheet(["Procurement"])
      await wait(500)
      screenshots.push(await this.screenshot("04c-populated-editor.png"))
      await this.tapNode({
        contentDescription: "Review Procurement access change",
      })
      await this.waitForNode({ text: "Review service access" })
      await this.waitForNode({ text: "Confirm change" })
      await wait(500)
      screenshots.push(await this.screenshot("04d-review-without-submit.png"))
      await this.waitForNode({
        text: "The service is hidden for new work while existing records remain readable.",
      })
      const expectedReason = OPERATION_PROFILE_QA_REASON
      let reviewedReasonBounds: AndroidUiNode["bounds"] | null = null
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const xml = await this.dumpUi()
        const reason = findAndroidUiNode(xml, { text: expectedReason })
        const header = findAndroidUiNode(xml, { text: "Review service access" })
        const footer = findAndroidUiNode(xml, { text: "Confirm change" })
        if (!header || !footer)
          throw new Error("Review header/footer bounds were not available.")
        if (
          reason &&
          isVisibleNode(reason) &&
          reason.bounds.top >= header.bounds.bottom &&
          reason.bounds.bottom <= footer.bounds.top
        ) {
          reviewedReasonBounds = reason.bounds
          break
        }
        await this.swipePage("up", {
          top: header.bounds.bottom,
          bottom: footer.bounds.top,
        })
      }
      if (!reviewedReasonBounds)
        throw new Error(
          "The complete audit reason was not reachable in review."
        )
      screenshots.push(await this.screenshot("04d2-complete-review-reason.png"))
      await this.tapNode({ text: "Review again" })
      await this.waitForNode({ contentDescription: "Close Procurement" })
      await wait(500)
      screenshots.push(await this.screenshot("04e-returned-to-editor.png"))
      await this.expandFloatingSheet(["Procurement"])
      await wait(500)
      const returnedReason = await this.waitForNode({
        contentDescription: "Operation Profile change reason",
        text: expectedReason,
      })
      const returnedFooter = await this.waitForEnabledNode({
        contentDescription: "Review Procurement access change",
      })
      const returnedHeader = await this.waitForNode({
        contentDescription: "Close Procurement",
      })
      if (
        returnedReason.bounds.top < returnedHeader.bounds.bottom ||
        returnedReason.bounds.bottom > returnedFooter.bounds.top
      ) {
        throw new Error(
          "The retained reason was not fully visible after returning to the editor."
        )
      }
      await writeFile(
        path.join(this.evidenceDirectory, "review-retention-check.json"),
        JSON.stringify(
          {
            completeReasonMatches: true,
            reviewedReasonBounds,
            returnedReasonBounds: returnedReason.bounds,
            returnedFooterBounds: returnedFooter.bounds,
            confirmSubmitted: false,
          },
          null,
          2
        )
      )
      screenshots.push(await this.screenshot("04e2-retained-full-reason.png"))
      await this.tapNode({ contentDescription: "Close Procurement" })
      await this.waitForNode({ text: "Keep editing" })
      screenshots.push(await this.screenshot("04f-discard-confirmation.png"))
      await this.tapNode({ text: "Keep editing" })
      await this.waitForNode({ contentDescription: "Close Procurement" })
    }
    await this.tapNode({ contentDescription: "Close Procurement" })
    if (exerciseDraft) await this.tapNode({ text: "Close form" })
    await this.waitForSettledOperationProfileScreen()
    await this.tapNode({ contentDescription: "Go back" })
    await this.waitForNode({ text: "Workspace access" })
    await wait(500)
    await this.waitForNode({ text: "Workspace access" })
    screenshots.push(
      await this.screenshot("05-more-after-operation-profile.png")
    )
    if (exerciseDraft) {
      await this.tapNode({ text: "Operation Profile" })
      await this.waitForNode({
        contentDescription: "Refresh Operation Profile",
      })
      await this.openOperationProfileProcurementEditor()
      await this.expandFloatingSheet(["Procurement"])
      await this.waitForNode({
        contentDescription: "Operation Profile change reason",
      })
      // Observe twice after re-entry; do not manually edit or clear the input.
      for (let sample = 0; sample < 2; sample += 1) {
        await wait(500)
        const check = readOperationProfileDiscardCheck(await this.dumpUi())
        await writeFile(
          path.join(this.evidenceDirectory, "discard-reopen-check.json"),
          JSON.stringify(
            {
              ...check,
              sample: sample + 1,
              manuallyCleared: false,
              confirmSubmitted: false,
            },
            null,
            2
          )
        )
        if (!check.reasonEmpty || !check.modeReset || !check.reviewDisabled) {
          throw new Error(
            "Discarded Operation Profile draft returned after reopening."
          )
        }
      }
      screenshots.push(await this.screenshot("06-reopened-after-discard.png"))
      await this.tapNode({ contentDescription: "Close Procurement" })
      await this.waitForSettledOperationProfileScreen()
      await this.tapNode({ contentDescription: "Go back" })
      await this.waitForNode({ text: "Workspace access" })
    }
    return screenshots
  }

  async captureOperationProfileStaleRecovery(input: {
    createServerDrift: () => Promise<void>
    onConflictObserved: () => Promise<void>
    onRefreshedReview: () => Promise<void>
  }) {
    const screenshots: string[] = []
    await this.tapNode({ contentDescription: "More admin services tab" })
    await this.waitForNode({ text: "Workspace access" })
    await wait(500)

    let opened = false
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const entry = findAndroidUiNode(await this.dumpUi(), {
        text: "Operation Profile",
      })
      if (entry && isVisibleNode(entry)) {
        await this.tap(entry)
        opened = true
        break
      }
      await this.swipePageUp()
    }
    if (!opened) {
      throw new Error("The Operation Profile entry was not reachable.")
    }

    await this.waitForNode({ contentDescription: "Refresh Operation Profile" })
    await this.openOperationProfileProcurementEditor()
    await this.tapNode({
      contentDescription: "Not offered. Unavailable for new work",
    })
    await this.tapNode({
      contentDescription: "Quick fill Operation Profile change reason",
    })
    await this.waitForEnabledNode({
      contentDescription: "Review Procurement access change",
    })
    await this.tapNode({
      contentDescription: "Review Procurement access change",
    })
    await this.waitForNode({ text: "Review service access" })
    await this.waitForEnabledNode({ text: "Confirm change" })
    screenshots.push(await this.screenshot("01-review-before-server-drift.png"))

    await input.createServerDrift()
    await this.tapNode({ text: "Confirm change" })
    await this.waitForNode({ text: "Settings changed" })
    await wait(650)

    const conflictCheck = readOperationProfileConflictCheck(await this.dumpUi())
    await writeFile(
      path.join(this.evidenceDirectory, "conflict-sheet-check.json"),
      JSON.stringify(conflictCheck, null, 2)
    )
    if (Object.values(conflictCheck).some((value) => value !== true)) {
      throw new Error("The native stale-conflict recovery sheet is incomplete.")
    }
    await input.onConflictObserved()
    screenshots.push(await this.screenshot("02-stale-conflict.png"))

    await this.tapNode({ text: "Keep editing" })
    await this.waitForNode({ contentDescription: "Close Procurement" })
    await this.expandFloatingSheet(["Procurement"])
    const draftXml = await this.dumpUi()
    const retainedReason = findAndroidUiNode(draftXml, {
      contentDescription: "Operation Profile change reason",
      text: OPERATION_PROFILE_QA_REASON,
    })
    const retainedModeElement = [...draftXml.matchAll(/<node\b[^>]*>/g)]
      .map(([node]) => node)
      .find(
        (node) =>
          readAttribute(node, "content-desc") ===
            "Not offered. Unavailable for new work" &&
          readAttribute(node, "checked") === "true"
      )
    if (!retainedReason || !retainedModeElement) {
      throw new Error(
        "The Operation Profile draft was not retained after stale recovery."
      )
    }
    screenshots.push(await this.screenshot("03-draft-preserved.png"))

    await this.tapNode({
      contentDescription: "Review Procurement access change",
    })
    await this.waitForNode({ text: "Review service access" })
    await this.waitForEnabledNode({ text: "Confirm change" })
    await this.tapNode({ text: "Confirm change" })
    await this.waitForNode({ text: "Settings changed" })
    await this.waitForEnabledNode({ text: "Refresh & review" })
    screenshots.push(
      await this.screenshot("04-conflict-before-explicit-refresh.png")
    )

    await this.tapNode({ text: "Refresh & review" })
    await this.waitForNode({ text: "Review service access" })
    await this.waitForNode({ text: "Office only" })
    await this.waitForNode({ text: "Not offered" })
    await this.waitForEnabledNode({ text: "Confirm change" })
    await input.onRefreshedReview()
    screenshots.push(await this.screenshot("05-refreshed-review.png"))

    await this.tapNode({ text: "Review again" })
    await this.waitForNode({ contentDescription: "Close Procurement" })
    await this.expandFloatingSheet(["Procurement"])
    await this.waitForNode({
      contentDescription: "Operation Profile change reason",
      text: OPERATION_PROFILE_QA_REASON,
    })
    screenshots.push(await this.screenshot("06-refreshed-editor.png"))

    return screenshots
  }

  private async openOperationProfileProcurementEditor() {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const procurement = parseAndroidUiNodes(await this.dumpUi()).find(
        (node) =>
          node.contentDescription.startsWith("Procurement. View only.") &&
          isVisibleNode(node)
      )
      if (procurement) {
        await this.tap(procurement)
        await this.waitForNode({ contentDescription: "Close Procurement" })
        return
      }
      await this.swipePageUp()
    }
    throw new Error(
      "The expected view-only procurement service was not reachable."
    )
  }

  async captureOperationProfileFailure() {
    return this.screenshot("failed-operation-profile-baseline.png")
  }

  async discardOperationProfileTestDraft() {
    const ime = (await this.adb(["shell", "dumpsys", "input_method"])).toString(
      "utf8"
    )
    if (/mInputShown=true/.test(ime)) {
      await this.pressKey(4)
      await wait(500)
    }
    let xml = await this.dumpUi()
    if (findAndroidUiNode(xml, { text: "Settings changed" })) {
      await this.tapNode({ text: "Keep editing" })
      await this.waitForNode({ contentDescription: "Close Procurement" })
      xml = await this.dumpUi()
    }
    if (findAndroidUiNode(xml, { text: "Review service access" })) {
      await this.tapNode({ text: "Review again" })
      await this.waitForNode({ contentDescription: "Close Procurement" })
      xml = await this.dumpUi()
    }
    if (findAndroidUiNode(xml, { contentDescription: "Close Procurement" })) {
      await this.tapNode({ contentDescription: "Close Procurement" })
      await wait(500)
      xml = await this.dumpUi()
    }
    if (findAndroidUiNode(xml, { text: "Close form" })) {
      await this.tapNode({ text: "Close form" })
      await this.waitForNode({
        contentDescription: "Refresh Operation Profile",
      })
    }
  }

  async captureMemberRoleDenial() {
    await this.waitForNode({ contentDescription: "Member home tab" })
    const screenshots = [
      await this.screenshot("01-member-before-staff-link.png"),
    ]
    const launched = (
      await this.adb([
        "shell",
        "am",
        "start",
        "-W",
        "-a",
        "android.intent.action.VIEW",
        "-d",
        "halaalvest-dev://finance",
        this.packageName,
      ])
    ).toString("utf8")
    if (!/Status:\s*ok/.test(launched)) {
      throw new Error(
        "The staff deep-link activity did not launch successfully."
      )
    }
    await wait(2000)
    for (let sample = 0; sample < 3; sample += 1) {
      if (!isMemberOnlyAndroidShell(await this.dumpUi())) {
        await this.screenshot("failed-member-role-denial.png")
        throw new Error(
          "Staff deep link did not settle in the Member-only shell."
        )
      }
      await wait(500)
    }
    screenshots.push(await this.screenshot("02-member-after-staff-link.png"))
    return screenshots
  }

  async captureMemberCapacityBaseline() {
    await this.waitForNode({ contentDescription: "Admin overview tab" })
    await this.tapNode({ contentDescription: "Admin members tab" })
    await this.waitForNode({ text: "Members" }, 25_000)
    await this.waitForNode({ contentDescription: "Create member" }, 25_000)

    const screenshots = [
      await this.screenshot("01-current-member-directory.png"),
    ]

    await this.tapNode({ contentDescription: "Create member" })
    await this.waitForNode(
      { contentDescription: "Close Create member" },
      25_000
    )
    screenshots.push(await this.screenshot("02-current-create-member-form.png"))

    return screenshots
  }

  async captureMemberCapacityRecovery() {
    await this.waitForNode({ contentDescription: "Admin overview tab" })
    await this.tapNode({ contentDescription: "Admin members tab" })
    await this.waitForNode({ text: "Members" }, 25_000)
    await this.waitForNode({ text: "Member capacity reached" }, 25_000)
    await this.waitForNode({ contentDescription: "View plan" }, 25_000)

    const directory = await this.dumpUi()
    if (
      findAndroidUiNode(directory, { contentDescription: "Create member" }) ||
      findAndroidUiNode(directory, {
        contentDescription: "Close Create member",
      })
    ) {
      throw new Error(
        "The at-capacity Android directory still exposed member creation."
      )
    }

    const screenshots = [
      await this.screenshot("01-member-capacity-recovery.png"),
    ]
    await this.tapNode({ contentDescription: "View plan" })
    await this.waitForNode({ text: "Plan & billing" }, 25_000)
    screenshots.push(await this.screenshot("02-plan-and-billing-recovery.png"))

    return screenshots
  }

  async captureOfflineProcurementBaseline() {
    const launched = (
      await this.adb([
        "shell",
        "am",
        "start",
        "-W",
        "-a",
        "android.intent.action.VIEW",
        "-d",
        "halaalvest-dev://procurement?qaState=offline",
        this.packageName,
      ])
    ).toString("utf8")
    if (!/Status:\s*ok/.test(launched)) {
      throw new Error("The offline Procurement deep link did not launch.")
    }

    await this.waitForNode({ text: "Procurement" }, 25_000)
    await this.waitForNode({ text: "You’re offline" }, 25_000)
    await this.waitForNode({ contentDescription: "Refresh" }, 25_000)
    return [await this.screenshot("01-current-offline-procurement.png")]
  }

  async captureOfflineProcurementWriteSuppression() {
    const launched = (
      await this.adb([
        "shell",
        "am",
        "start",
        "-W",
        "-a",
        "android.intent.action.VIEW",
        "-d",
        "halaalvest-dev://procurement?qaState=offline",
        this.packageName,
      ])
    ).toString("utf8")
    if (!/Status:\s*ok/.test(launched)) {
      throw new Error("The offline Procurement deep link did not launch.")
    }

    await this.waitForNode({ text: "Procurement" }, 25_000)
    await this.waitForNode({ text: "Offline · Saved history" }, 25_000)
    await this.waitForNode({ contentDescription: "Check connection" }, 25_000)
    await this.waitForNode({ text: "Industrial sewing machine" }, 25_000)

    const assertSuppressedSurface = async () => {
      const xml = await this.dumpUi()
      const prohibited = [
        "New request",
        "Continue request",
        "Review request",
        "Review procurement request",
        "Quick fill procurement request",
        "Close New procurement request",
      ]
      if (
        prohibited.some((label) =>
          findAndroidUiNodeBySemanticLabel(xml, label)
        ) ||
        !findAndroidUiNode(xml, { text: "Industrial sewing machine" })
      ) {
        throw new Error(
          "Offline Procurement exposed a write/review surface or lost saved history."
        )
      }
    }

    await assertSuppressedSurface()
    const screenshots = [
      await this.screenshot("01-offline-procurement-saved-history.png"),
    ]

    await this.tapNode({ contentDescription: "Check connection" })
    await this.waitForNode({ contentDescription: "Check connection" }, 25_000)
    await assertSuppressedSurface()
    screenshots.push(
      await this.screenshot("02-offline-procurement-after-check.png")
    )

    await this.tapNode({
      contentDescription:
        "View Industrial sewing machine procurement details, Submitted",
    })
    await this.waitForNode({
      contentDescription: "Industrial sewing machine details",
    })
    screenshots.push(
      await this.screenshot("03-offline-procurement-saved-detail.png")
    )

    return screenshots
  }

  async captureCrossTenantProjectFinancingBaseline(input: {
    foreignBusinessName: string
    foreignRequestId: string
  }) {
    const launched = (
      await this.adb([
        "shell",
        "am",
        "start",
        "-W",
        "-a",
        "android.intent.action.VIEW",
        "-d",
        `halaalvest-dev://project-financing-operations?notificationEntityId=${encodeURIComponent(input.foreignRequestId)}`,
        this.packageName,
      ])
    ).toString("utf8")
    if (!/Status:\s*ok/.test(launched)) {
      throw new Error(
        "The cross-tenant project-financing deep link did not launch."
      )
    }

    await this.waitForNode({ text: "Project financing" }, 25_000)
    await this.waitForNode(
      { text: "This item is no longer available." },
      25_000
    )
    const xml = await this.dumpUi()
    if (
      findAndroidUiNodeBySemanticLabel(xml, input.foreignBusinessName) ||
      findAndroidUiNode(xml, {
        contentDescription: `${input.foreignBusinessName} project financing record`,
      })
    ) {
      throw new Error(
        "The cross-tenant denial surface rendered a foreign project fact."
      )
    }

    return [
      await this.screenshot("01-current-cross-tenant-unavailable-state.png"),
    ]
  }

  async captureDuplicateChargeBaseline(input: {
    memberName: string
    memberNumber: string
    ruleName: string
  }) {
    const launched = (
      await this.adb([
        "shell",
        "am",
        "start",
        "-W",
        "-a",
        "android.intent.action.VIEW",
        "-d",
        "halaalvest-dev://charges",
        this.packageName,
      ])
    ).toString("utf8")
    if (!/Status:\s*ok/.test(launched)) {
      throw new Error("The Charges baseline deep link did not launch.")
    }

    await this.waitForNode({ text: "Charges" }, 25_000)
    await this.waitForAnyNode(
      [
        { text: "Charge applications" },
        { text: "No applications yet" },
        { contentDescription: "Apply charge" },
      ],
      25_000
    )
    await wait(1_000)
    const screenshots = [await this.screenshot("01-current-charges-screen.png")]

    await this.tapNode({ contentDescription: "Apply charge" })
    await this.waitForNode({ text: "Apply charge" }, 20_000)

    await this.tap(await this.waitForSemanticNode("Charge rule,"))
    await this.waitForNode({ contentDescription: "Search charge rules" })
    await this.tapNode({ contentDescription: "Search charge rules" })
    await this.inputText(input.ruleName.replaceAll(" ", "%s"))
    await this.pressKey(4)
    await wait(500)
    await this.tap(await this.waitForSemanticNode(input.ruleName))

    await this.tap(await this.waitForSemanticNode("Member,"))
    await this.waitForNode({ contentDescription: "Search members" })
    await this.tapNode({ contentDescription: "Search members" })
    await this.inputText(input.memberNumber.replaceAll(" ", "%s"))
    await this.pressKey(4)
    await wait(500)
    await this.tap(await this.waitForSemanticNode(input.memberNumber))

    await this.tapNode({ contentDescription: "Quick fill" })
    await this.tap(await this.waitForSemanticNode("Review charge"))
    await this.waitForNode({ text: "Review charge command" }, 20_000)
    screenshots.push(await this.screenshot("02-current-charge-review.png"))

    await this.tapNode({ text: "Confirm and record" })
    await this.waitForNode({ text: "Charge evidence saved" }, 25_000)
    screenshots.push(
      await this.screenshot("03-current-generic-success-sheet.png")
    )

    await this.tapNode({ text: "Done" })
    await this.waitForNode({ text: "Charges" }, 20_000)
    await this.waitForSemanticNode(input.ruleName, 20_000)
    screenshots.push(await this.screenshot("04-current-single-application.png"))

    await this.tap(
      await this.waitForSemanticNode(`${input.memberName}, ${input.ruleName}`)
    )
    await this.waitForNode({ text: "Charge evidence" }, 20_000)
    await this.waitForNode({ text: "Posting" }, 20_000)
    screenshots.push(await this.screenshot("05-current-charge-detail.png"))

    return screenshots
  }

  async captureAdminChargeApplication(input: {
    memberName: string
    memberNumber: string
    ruleName: string
  }) {
    const launched = (
      await this.adb([
        "shell",
        "am",
        "start",
        "-W",
        "-a",
        "android.intent.action.VIEW",
        "-d",
        "halaalvest-dev://charges",
        this.packageName,
      ])
    ).toString("utf8")
    if (!/Status:\s*ok/.test(launched)) {
      throw new Error("The Charges journey deep link did not launch.")
    }

    await this.waitForNode({ text: "Charges" }, 25_000)
    await this.waitForAnyNode(
      [
        { text: "Charge applications" },
        { text: "No applications yet" },
        { contentDescription: "Apply charge" },
      ],
      25_000
    )
    await wait(1_000)
    const screenshots = [await this.screenshot("01-charges-workspace.png")]

    await this.tapNode({ contentDescription: "Apply charge" })
    await this.waitForNode({ text: "Apply charge" }, 20_000)
    screenshots.push(await this.screenshot("02-apply-charge-form.png"))

    await this.tap(await this.waitForSemanticNode("Charge rule,"))
    await this.waitForNode({ contentDescription: "Search charge rules" })
    await this.tapNode({ contentDescription: "Search charge rules" })
    screenshots.push(
      await this.captureChargeKeyboardEvidence({
        accessibilityLabel: "Search charge rules",
        fileName: "03-rule-search-keyboard.png",
      })
    )
    await this.inputText(input.ruleName.replaceAll(" ", "%s"))
    await this.pressKey(4)
    await wait(500)
    await this.tap(await this.waitForSemanticNode(input.ruleName))

    await this.tap(await this.waitForSemanticNode("Member,"))
    await this.waitForNode({ contentDescription: "Search members" })
    await this.tapNode({ contentDescription: "Search members" })
    screenshots.push(
      await this.captureChargeKeyboardEvidence({
        accessibilityLabel: "Search members",
        fileName: "04-member-search-keyboard.png",
      })
    )
    await this.inputText(input.memberNumber.replaceAll(" ", "%s"))
    await this.pressKey(4)
    await wait(500)
    await this.tap(await this.waitForSemanticNode(input.memberNumber))

    await this.tap(await this.revealChargeInput("Charge assessment date"))
    await this.waitForNode({ contentDescription: "Assessment date calendar" })
    const calendarStates: Array<
      ReturnType<typeof readAndroidCalendarCheckpoint>
    > = []
    const captureCalendarState = async (fileName: string) => {
      const state = readAndroidCalendarCheckpoint(
        await this.dumpUi(),
        "Assessment date"
      )
      if (!state.backdropVisible || !state.sheetBounds || !state.title) {
        throw new Error(
          "The Assessment date calendar did not expose its sheet, backdrop, and view title."
        )
      }
      calendarStates.push(state)
      screenshots.push(await this.screenshot(fileName))
      return state
    }
    const waitForCalendarTitleChange = async (previousTitle: string) => {
      const startedAt = Date.now()
      while (Date.now() - startedAt < 10_000) {
        const state = readAndroidCalendarCheckpoint(
          await this.dumpUi(),
          "Assessment date"
        )
        if (state.title && state.title !== previousTitle) return state.title
        await wait(300)
      }
      throw new Error("The Assessment date calendar page did not change.")
    }

    let calendarState = await captureCalendarState(
      "05-assessment-calendar-days.png"
    )
    await this.swipeCalendar("Assessment date", "next")
    await waitForCalendarTitleChange(calendarState.title!)
    calendarState = await captureCalendarState(
      "06-assessment-calendar-days-swiped.png"
    )

    await this.tap(await this.waitForSemanticNode("Change calendar view"))
    await waitForCalendarTitleChange(calendarState.title!)
    calendarState = await captureCalendarState(
      "07-assessment-calendar-months.png"
    )
    await this.swipeCalendar("Assessment date", "next")
    await waitForCalendarTitleChange(calendarState.title!)
    calendarState = await captureCalendarState(
      "08-assessment-calendar-months-swiped.png"
    )

    await this.tap(await this.waitForSemanticNode("Change calendar view"))
    await waitForCalendarTitleChange(calendarState.title!)
    calendarState = await captureCalendarState(
      "09-assessment-calendar-years.png"
    )
    await this.swipeCalendar("Assessment date", "next")
    await waitForCalendarTitleChange(calendarState.title!)
    await captureCalendarState("10-assessment-calendar-years-swiped.png")

    const firstCalendarBounds = calendarStates[0]?.sheetBounds
    const calendarFixedHeight = calendarStates.every(
      (state) =>
        state.sheetBounds?.top === firstCalendarBounds?.top &&
        state.sheetBounds?.bottom === firstCalendarBounds?.bottom
    )
    if (!calendarFixedHeight) {
      throw new Error(
        "The Assessment date calendar changed height between day, month, or year views."
      )
    }
    await writeFile(
      path.join(this.evidenceDirectory, "assessment-calendar-check.json"),
      JSON.stringify(
        {
          backdropVisible: calendarStates.every(
            (state) => state.backdropVisible
          ),
          fixedHeight: calendarFixedHeight,
          states: calendarStates,
          swipeModes: ["days", "months", "years"],
        },
        null,
        2
      )
    )
    await this.tapNode({ text: "Cancel" })
    await this.waitForNodesAbsent([
      { contentDescription: "Assessment date calendar" },
    ])

    await this.tap(await this.revealChargeInput("Charge evidence note"))
    screenshots.push(
      await this.captureChargeKeyboardEvidence({
        accessibilityLabel: "Charge evidence note",
        fileName: "11-evidence-note-keyboard.png",
      })
    )
    await this.pressKey(4)

    await this.tapNode({ contentDescription: "Quick fill" })
    screenshots.push(await this.screenshot("12-completed-charge-form.png"))
    await this.tap(await this.waitForSemanticNode("Review charge"))
    await this.waitForNode({ text: "Review charge command" }, 20_000)
    screenshots.push(await this.screenshot("13-charge-review.png"))

    await this.tapNode({ text: "Confirm and record" })
    await this.waitForNode({ text: "Charge posted" }, 25_000)
    await this.waitForNode({ text: "Retry-safe levy" }, 10_000)
    await this.waitForNode({ text: "Posted" }, 10_000)
    screenshots.push(await this.screenshot("14-charge-posted-sheet.png"))

    await this.tapNode({ text: "Done" })
    await this.waitForNode({ text: "Charges" }, 20_000)
    await this.waitForSemanticNode(input.ruleName, 20_000)
    screenshots.push(await this.screenshot("15-single-charge-application.png"))

    await this.tap(
      await this.waitForSemanticNode(`${input.memberName}, ${input.ruleName}`)
    )
    await this.waitForNode({ text: "Charge evidence" }, 20_000)
    await this.waitForNode({ text: "Posting" }, 20_000)
    screenshots.push(await this.screenshot("16-charge-detail.png"))

    return screenshots
  }

  private async captureChargeKeyboardEvidence(input: {
    accessibilityLabel: string
    fileName: string
  }) {
    await this.waitForFocusedNode({
      contentDescription: input.accessibilityLabel,
    })
    await wait(700)
    const xml = await this.dumpUi()
    const focused = findAndroidUiNode(xml, {
      contentDescription: input.accessibilityLabel,
    })
    const ime = (await this.adb(["shell", "dumpsys", "input_method"])).toString(
      "utf8"
    )
    const keyboardTop = readAndroidVisibleKeyboardTop(
      (await this.adb(["shell", "dumpsys", "window"])).toString("utf8")
    )
    const evidence = {
      accessibilityLabel: input.accessibilityLabel,
      fieldBounds: focused?.bounds ?? null,
      focused: focused?.focused === true,
      keyboardTop,
      keyboardVisible: /mInputShown=true/.test(ime),
      clearOfKeyboard: Boolean(
        focused && keyboardTop !== null && focused.bounds.bottom <= keyboardTop
      ),
    }
    await writeFile(
      path.join(
        this.evidenceDirectory,
        input.fileName.replace(/\.png$/, ".json")
      ),
      JSON.stringify(evidence, null, 2)
    )
    const screenshot = await this.screenshot(input.fileName)
    if (
      !evidence.focused ||
      !evidence.keyboardVisible ||
      !evidence.clearOfKeyboard
    ) {
      throw new Error(
        `${input.accessibilityLabel} failed Android keyboard clearance.`
      )
    }
    return screenshot
  }

  private async revealChargeInput(accessibilityLabel: string) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const xml = await this.dumpUi()
      const input = findAndroidUiNode(xml, {
        contentDescription: accessibilityLabel,
      })
      const header = findAndroidUiNode(xml, {
        contentDescription: "Close Apply charge",
      })
      const footer = findAndroidUiNodeBySemanticLabel(xml, "Review charge")
      if (
        input &&
        isVisibleNode(input) &&
        input.bounds.top > (header?.bounds.bottom ?? 100) &&
        input.bounds.bottom < (footer?.bounds.top ?? 2_000)
      ) {
        return input
      }
      await this.swipePageUp()
    }
    throw new Error(`${accessibilityLabel} was not reachable in the form.`)
  }

  async captureDuplicateChargeRetry(input: {
    memberName: string
    memberNumber: string
    ruleName: string
  }) {
    const launched = (
      await this.adb([
        "shell",
        "am",
        "start",
        "-W",
        "-a",
        "android.intent.action.VIEW",
        "-d",
        "halaalvest-dev://charges?qaState=duplicate-charge-response-loss",
        this.packageName,
      ])
    ).toString("utf8")
    if (!/Status:\s*ok/.test(launched)) {
      throw new Error("The duplicate-charge proof deep link did not launch.")
    }

    await this.waitForNode({ text: "Charges" }, 25_000)
    await this.waitForNode({ contentDescription: "Apply charge" }, 25_000)
    await this.tapNode({ text: "Rules" })
    await this.waitForSemanticNode(input.ruleName, 25_000)
    const screenshots = [await this.screenshot("01-active-retry-safe-rule.png")]

    await this.tapNode({ text: "Applications" })
    await this.tapNode({ contentDescription: "Apply charge" })
    await this.waitForNode({ text: "Apply charge" }, 20_000)

    await this.tap(await this.waitForSemanticNode("Charge rule,"))
    await this.waitForNode({ contentDescription: "Search charge rules" })
    await this.tapNode({ contentDescription: "Search charge rules" })
    await this.inputText(input.ruleName.replaceAll(" ", "%s"))
    await this.waitForSemanticNode(input.ruleName)
    screenshots.push(
      await this.captureChargeKeyboardEvidence({
        accessibilityLabel: "Search charge rules",
        fileName: "02-rule-search-keyboard.png",
      })
    )
    await this.pressKey(4)
    await wait(500)
    await this.tap(await this.waitForSemanticNode(input.ruleName))

    await this.tap(await this.waitForSemanticNode("Member,"))
    await this.waitForNode({ contentDescription: "Search members" })
    await this.tapNode({ contentDescription: "Search members" })
    await this.inputText(input.memberNumber.replaceAll(" ", "%s"))
    await this.waitForSemanticNode(input.memberNumber)
    screenshots.push(
      await this.captureChargeKeyboardEvidence({
        accessibilityLabel: "Search members",
        fileName: "03-member-search-keyboard.png",
      })
    )
    await this.pressKey(4)
    await wait(500)
    await this.tap(await this.waitForSemanticNode(input.memberNumber))

    const assessedAt = await this.revealChargeInput("Charge assessment date")
    await this.tap(assessedAt)
    screenshots.push(
      await this.captureChargeKeyboardEvidence({
        accessibilityLabel: "Charge assessment date",
        fileName: "04-assessment-date-keyboard.png",
      })
    )
    await this.pressKey(4)
    await wait(500)

    await this.tapNode({ contentDescription: "Quick fill" })
    const notes = await this.revealChargeInput("Charge evidence note")
    await this.tap(notes)
    screenshots.push(
      await this.captureChargeKeyboardEvidence({
        accessibilityLabel: "Charge evidence note",
        fileName: "05-evidence-note-keyboard.png",
      })
    )
    await this.pressKey(4)
    await wait(500)

    await this.tap(await this.waitForSemanticNode("Review charge"))
    await this.waitForNode({ text: "Review charge command" }, 20_000)
    screenshots.push(await this.screenshot("06-charge-review.png"))

    await this.tapNode({ text: "Confirm and record" })
    await this.waitForNode({ text: "Retry and confirm" }, 25_000)
    await this.waitForNode({
      text: "The charge was recorded, but the response was interrupted. Retry to confirm it.",
    })
    screenshots.push(await this.screenshot("07-committed-response-lost.png"))

    await this.tapNode({ text: "Retry and confirm" })
    await this.waitForNode({ text: "Charge already recorded" }, 25_000)
    await this.waitForNode({ text: "One charge recorded" })
    screenshots.push(
      await this.screenshot("08-charge-already-recorded-receipt.png")
    )

    await this.tapNode({ text: "Done" })
    await this.waitForNode({ text: "Charges" }, 20_000)
    await this.waitForSemanticNode(input.ruleName, 20_000)
    screenshots.push(await this.screenshot("09-single-charge-application.png"))

    await this.tap(
      await this.waitForSemanticNode(`${input.memberName}, ${input.ruleName}`)
    )
    await this.waitForNode({ text: "Charge evidence" }, 20_000)
    await this.waitForNode({ text: "Posting" }, 20_000)
    screenshots.push(await this.screenshot("10-single-ledger-detail.png"))

    return screenshots
  }

  async captureCrossTenantProjectFinancingDenial(input: {
    foreignBusinessName: string
    foreignRequestId: string
    localBusinessName: string
  }) {
    const launched = (
      await this.adb([
        "shell",
        "am",
        "start",
        "-W",
        "-a",
        "android.intent.action.VIEW",
        "-d",
        `halaalvest-dev://project-financing-operations?notificationEntityId=${encodeURIComponent(input.foreignRequestId)}`,
        this.packageName,
      ])
    ).toString("utf8")
    if (!/Status:\s*ok/.test(launched)) {
      throw new Error(
        "The cross-tenant project-financing deep link did not launch."
      )
    }

    await this.waitForNode({ text: "Project financing" }, 25_000)
    await this.waitForNode({ text: "Request unavailable" }, 25_000)
    await this.waitForSemanticNode(input.localBusinessName, 25_000)
    let xml = await this.waitForNodesAbsent(
      [
        { text: "Loading record" },
        { contentDescription: "Bottom sheet backdrop" },
        { contentDescription: "Project financing record" },
      ],
      25_000
    )
    if (
      findAndroidUiNodeBySemanticLabel(xml, input.foreignBusinessName) ||
      !findAndroidUiNodeBySemanticLabel(xml, input.localBusinessName)
    ) {
      throw new Error(
        "The cross-tenant denial leaked a foreign fact or lost the signed tenant queue."
      )
    }

    const screenshots = [
      await this.screenshot("01-cross-tenant-request-unavailable.png"),
    ]

    await this.tapNode({
      contentDescription: "Dismiss unavailable item notice",
    })
    xml = await this.waitForNodesAbsent([{ text: "Request unavailable" }])
    const localRow = findAndroidUiNodeBySemanticLabel(
      xml,
      input.localBusinessName
    )
    if (
      !localRow ||
      findAndroidUiNodeBySemanticLabel(xml, input.foreignBusinessName)
    ) {
      throw new Error(
        "The signed tenant queue was not preserved after dismissing the denial."
      )
    }
    screenshots.push(
      await this.screenshot("02-signed-tenant-queue-preserved.png")
    )

    await this.tap(localRow)
    await this.waitForNode({
      contentDescription: `${input.localBusinessName} project financing record`,
    })
    xml = await this.dumpUi()
    if (
      !findAndroidUiNodeBySemanticLabel(xml, input.localBusinessName) ||
      findAndroidUiNodeBySemanticLabel(xml, input.foreignBusinessName)
    ) {
      throw new Error(
        "The signed tenant detail did not open cleanly after the denial."
      )
    }
    screenshots.push(
      await this.screenshot("03-signed-tenant-detail-available.png")
    )

    return screenshots
  }

  async captureReadOnlyProcurement() {
    const launched = (
      await this.adb([
        "shell",
        "am",
        "start",
        "-W",
        "-a",
        "android.intent.action.VIEW",
        "-d",
        "halaalvest-dev://procurement",
        this.packageName,
      ])
    ).toString("utf8")
    if (!/Status:\s*ok/.test(launched)) {
      throw new Error("The Procurement deep-link activity did not launch.")
    }

    await this.waitForNode({ text: "Procurement" })
    await this.waitForNode({ text: "New request unavailable" }, 25_000)
    const initialCheck = readProcurementReadOnlyCheck(await this.dumpUi())
    if (
      !initialCheck.screenPresent ||
      !initialCheck.historySurfacePresent ||
      !initialCheck.restrictionPresent ||
      !initialCheck.reasonPresent ||
      !initialCheck.createActionAbsent ||
      !initialCheck.formAbsent
    ) {
      throw new Error(
        "The read-only Procurement screen did not expose the required browse-only state."
      )
    }

    const screenshots = [
      await this.screenshot("01-read-only-procurement-overview.png"),
    ]
    let finalCheck = initialCheck
    if (!finalCheck.restrictionVisible || !finalCheck.reasonVisible) {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        await this.swipePageUp()
        finalCheck = readProcurementReadOnlyCheck(await this.dumpUi())
        if (finalCheck.restrictionVisible && finalCheck.reasonVisible) break
      }
    }
    if (
      !finalCheck.restrictionVisible ||
      !finalCheck.reasonVisible ||
      !finalCheck.createActionAbsent ||
      !finalCheck.formAbsent
    ) {
      throw new Error(
        "The read-only Procurement restriction did not become visibly reviewable."
      )
    }
    if (!initialCheck.restrictionVisible || !initialCheck.reasonVisible) {
      screenshots.push(
        await this.screenshot("02-read-only-procurement-restriction.png")
      )
    }
    return screenshots
  }

  private async captureProcurementFooterGeometry(name: string) {
    const xml = await this.dumpUi()
    const ime = (await this.adb(["shell", "dumpsys", "input_method"])).toString(
      "utf8"
    )
    await writeFile(
      path.join(this.evidenceDirectory, `${name}-footer-geometry.json`),
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          ...readProcurementFooterGeometry(xml, ime),
        },
        null,
        2
      )
    )
  }

  private async revealProcurementInput(label: string) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const xml = await this.dumpUi()
      const input = findAndroidUiNode(xml, { contentDescription: label })
      const header = findAndroidUiNode(xml, {
        contentDescription: "Close New procurement request",
      })
      const footer = findAndroidUiNodeBySemanticLabel(xml, "Review request")
      if (
        input &&
        isVisibleNode(input) &&
        input.bounds.top > (header?.bounds.bottom ?? 100) &&
        input.bounds.bottom < (footer?.bounds.top ?? 2000)
      )
        return input
      if (input && input.bounds.top <= (header?.bounds.bottom ?? 100))
        await this.swipePageDown()
      else if (label === "Procurement item name" && !input)
        await this.swipePageDown()
      else await this.swipePageUp()
    }
    throw new Error("Procurement input was not reachable for draft reset.")
  }

  async captureProcurementFailure() {
    return this.screenshot("failed-procurement-checkpoint.png")
  }

  private async waitForProcurementFormAction(enabled: boolean) {
    const deadline = Date.now() + 20_000
    let consecutiveMatches = 0
    while (Date.now() < deadline) {
      const matches = hasProcurementFormActionState(
        await this.dumpUi(),
        enabled
      )
      consecutiveMatches = matches ? consecutiveMatches + 1 : 0
      if (consecutiveMatches >= 2) return
      await wait(500)
    }
    throw new Error(
      "The procurement form did not settle into the expected action state."
    )
  }

  async captureMemberCoreScreens() {
    const screenshots: string[] = []

    await this.waitForNode({ text: "Member readiness" })
    screenshots.push(await this.screenshot("01-member-home.png"))

    await this.tapNode({
      contentDescription: "Commitments and savings tab",
    })
    await this.waitForNode({ text: "Active plan" })
    screenshots.push(await this.screenshot("02-member-plans.png"))

    await this.tapNode({ contentDescription: "Shares tab" })
    await this.waitForAnyNode([
      { text: "Your position" },
      { text: "Share requests" },
    ])
    screenshots.push(await this.screenshot("03-member-shares.png"))

    await this.tapNode({ contentDescription: "Member home tab" })
    await this.tapNode({ contentDescription: "Open statement" })
    await this.waitForNode({ text: "Recent activity" })
    screenshots.push(await this.screenshot("04-member-statement.png"))

    return screenshots
  }

  async captureAdminContributionBaseline() {
    await this.tapNode({ contentDescription: "Admin finance tab" })
    await this.waitForNode({ contentDescription: "Open finance operations" })
    await this.tapNode({ contentDescription: "Open finance operations" })
    await this.waitForNode({ contentDescription: "Finance operations" })

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const xml = await this.dumpUi()
      const operation = findAndroidUiNodeBySemanticLabel(
        xml,
        "Open Contributions"
      )
      if (
        operation &&
        isAndroidUiNodeWithinFloatingSheet(xml, operation, [
          "Finance operations",
        ])
      ) {
        await this.tap(operation)
        await this.waitForNode({ text: "Contributions" }, 25_000)
        await this.waitForNode({ contentDescription: "Search contributions" })
        return this.screenshot("current-android-baseline.png")
      }
      await this.swipeProfileListUp()
    }

    throw new Error("The Android Contributions operation was not visible.")
  }

  async captureAdminContributionFormBaseline(input: {
    memberName: string
    memberNumber: string
  }) {
    await this.tapNode({ text: "Commitments" })
    await this.waitForNode({ contentDescription: "Search commitments" })
    await this.tapNode({ contentDescription: "Search commitments" })
    await this.waitForFocusedNode({
      contentDescription: "Search commitments",
    })
    await this.inputText(input.memberNumber.replaceAll(" ", "%s"))
    await this.pressKey(66)
    await this.waitForNode({ text: input.memberName }, 20_000)
    const searchInput = findAndroidUiNode(await this.dumpUi(), {
      contentDescription: "Search commitments",
    })
    if (searchInput?.focused) {
      await this.pressKey(4)
      await wait(450)
    }
    await this.tapNode({ text: input.memberName })
    await this.waitForNode(
      { contentDescription: `Close ${input.memberName}` },
      20_000
    )
    await this.screenshot("current-member-detail-android-baseline.png")
    await this.waitForNode({ text: "Post payment" }, 20_000)
    await this.tapNode({ text: "Post payment" })
    await this.waitForNode({ text: "Post contribution" }, 20_000)
    await this.waitForNode({ contentDescription: "Commitment savings" })
    await this.waitForNode({ contentDescription: "Posting date" })
    return this.screenshot("current-form-android-baseline.png")
  }

  async captureShareProfitGovernanceScreens(periodName: string) {
    const screenshots: string[] = []

    await this.tapNode({ contentDescription: "Admin finance tab" })
    await this.waitForNode({ contentDescription: "Open finance operations" })
    await this.tapNode({ contentDescription: "Open finance operations" })
    await this.waitForNode({ contentDescription: "Finance operations" })

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const xml = await this.dumpUi()
      const operation = findAndroidUiNodeBySemanticLabel(
        xml,
        "Open Shares & profit"
      )
      if (
        operation &&
        isAndroidUiNodeWithinFloatingSheet(xml, operation, [
          "Finance operations",
        ])
      ) {
        await this.tap(operation)
        break
      }
      await this.swipeProfileListUp()
      if (attempt === 11) {
        throw new Error(
          "The Android Shares & profit operation was not visible."
        )
      }
    }

    await this.waitForNode({ text: "Share & profit" }, 25_000)
    await this.tapNode({ text: "Profit periods" })
    await this.waitForNode({ text: periodName }, 25_000)
    screenshots.push(await this.screenshot("01-published-profit-summary.png"))

    const period = findAndroidUiNodeBySemanticLabel(
      await this.dumpUi(),
      periodName
    )
    if (!period) {
      throw new Error("The published Android profit period was not visible.")
    }
    await this.tap(period)
    await this.waitForNode({ contentDescription: "Profit period detail" })
    await this.waitForNode({ text: "Published evidence" }, 25_000)
    screenshots.push(await this.screenshot("02-published-profit-detail.png"))

    return screenshots
  }

  async captureSubscriptionStoreOfferScreens(input: {
    currentPlanName: string
    requestedPlanName: string
  }) {
    const screenshots: string[] = []

    await this.tapNode({ contentDescription: "More admin services tab" })
    await this.waitForNode({ text: "Administration" })
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const planAndBilling = findAndroidUiNodeBySemanticLabel(
        await this.dumpUi(),
        "Plan & billing"
      )
      if (planAndBilling && isVisibleNode(planAndBilling)) {
        await this.tap(planAndBilling)
        break
      }
      await this.swipePageUp()
      if (attempt === 11) {
        throw new Error("The Android Plan & billing route was not visible.")
      }
    }

    await this.waitForNode({ text: "Plan & billing" }, 25_000)
    await this.waitForNode({ text: input.currentPlanName }, 25_000)
    screenshots.push(await this.screenshot("01-current-plan.png"))

    let offerVisible = false
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const nodes = parseAndroidUiNodes(await this.dumpUi())
      const plan = nodes.find(
        (node) => node.text === input.requestedPlanName && isVisibleNode(node)
      )
      const purchase = nodes.find(
        (node) =>
          node.contentDescription.startsWith(
            `Subscribe to ${input.requestedPlanName}, `
          ) &&
          node.contentDescription.length >
            `Subscribe to ${input.requestedPlanName}, `.length &&
          node.enabled &&
          isVisibleNode(node)
      )
      if (plan && purchase) {
        offerVisible = true
        break
      }
      await this.swipePageUp()
    }
    if (!offerVisible) {
      throw new Error(
        "The configured Android store offer and localized price were not visible."
      )
    }
    screenshots.push(await this.screenshot("02-native-store-offer.png"))

    return screenshots
  }

  private async traceWorkspaceDisplay(
    phase:
      | "before-workspace-return"
      | "before-theme-tap"
      | "after-theme-tap"
      | "font-applied"
      | "after-restart"
      | "shell-ready",
    input: { fontScale: 1 | 2; theme: "light" | "dark" },
    xml: string,
    target?: AndroidUiNode
  ) {
    this.workspaceTraceSequence += 1
    const file = `navigation-${String(this.workspaceTraceSequence).padStart(2, "0")}-${input.theme}-${input.fontScale * 100}-${phase}.png`
    await this.screenshot(file)
    await appendFile(
      path.join(this.evidenceDirectory, "navigation-trace.jsonl"),
      `${JSON.stringify({
        at: new Date().toISOString(),
        phase,
        requestedDisplay: input,
        landmarks: summarizeWorkspaceNavigation(parseAndroidUiNodes(xml)),
        targetBounds: target?.bounds ?? null,
        screenshot: file,
      })}\n`
    )
  }

  async prepareWorkspaceDisplay(input: {
    fontScale: 1 | 2
    theme: "light" | "dark"
    expectedShell?: "member" | "admin"
  }) {
    if (!this.serial.startsWith("emulator-")) {
      throw new Error(
        "Display matrix changes are restricted to Android emulators."
      )
    }
    const navigationDeadline = Date.now() + 30_000
    let backCount = 0
    while (Date.now() < navigationDeadline) {
      const xml = await this.dumpUi()
      const action = resolveAndroidWorkspaceReturnAction(xml)
      if (action === "ready") break
      if (action === "signed-out")
        throw new Error("The QA session ended before display restoration.")
      if (action === "back") {
        if (backCount >= 4)
          throw new Error(
            "The known service route did not return to its workspace."
          )
        await this.traceWorkspaceDisplay("before-workspace-return", input, xml)
        await this.pressKey(4)
        backCount += 1
      }
      await wait(650)
    }
    const moreTab = await this.waitForAnyNode([
      { contentDescription: "More admin services tab" },
      { contentDescription: "More member services tab" },
    ])
    await this.tap(moreTab)
    let selected = false
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const xml = await this.dumpUi()
      const choice = findAndroidUiNode(xml, {
        contentDescription: `Use ${input.theme} appearance`,
      })
      if (choice && isVisibleNode(choice)) {
        await this.traceWorkspaceDisplay("before-theme-tap", input, xml, choice)
        await this.tap(choice)
        await wait(650)
        await this.traceWorkspaceDisplay(
          "after-theme-tap",
          input,
          await this.dumpUi()
        )
        selected = true
        break
      }
      await this.swipePageUp()
    }
    if (!selected)
      throw new Error("The requested app appearance was not reachable.")
    await this.adb([
      "shell",
      "settings",
      "put",
      "system",
      "font_scale",
      String(input.fontScale),
    ])
    const scale = (
      await this.adb(["shell", "settings", "get", "system", "font_scale"])
    )
      .toString("utf8")
      .trim()
    if (Number(scale) !== input.fontScale) {
      throw new Error("Android did not apply the requested system font scale.")
    }
    await this.traceWorkspaceDisplay("font-applied", input, await this.dumpUi())
    const restartedXml = await this.restartApp()
    await this.traceWorkspaceDisplay("after-restart", input, restartedXml)
    await this.waitForNode(
      {
        contentDescription:
          input.expectedShell === "member"
            ? "More member services tab"
            : "More admin services tab",
      },
      30_000
    )
    await this.traceWorkspaceDisplay("shell-ready", input, await this.dumpUi())
  }

  async restoreWorkspaceDisplay(expectedShell: "member" | "admin" = "admin") {
    if (!this.serial.startsWith("emulator-")) {
      throw new Error("Display restoration is restricted to Android emulators.")
    }
    // Restore the system setting even if a failed session cannot reopen More.
    await this.adb(["shell", "settings", "put", "system", "font_scale", "1"])
    // A font-scale change can recreate the activity. Do not tap the old tree.
    await this.restartApp()
    await this.prepareWorkspaceDisplay({
      fontScale: 1,
      theme: "light",
      expectedShell,
    })
  }

  async captureWorkspaceRoleSwitchScreens(prefix = "") {
    const screenshots: string[] = []
    const capture = (name: string) => this.screenshot(`${prefix}${name}`)

    await this.tapNode({ contentDescription: "More admin services tab" })
    await this.waitForNode({ text: "Administration" }, 25_000)
    screenshots.push(await capture("04-more-before-billing.png"))

    for (let attempt = 0; attempt < 16; attempt += 1) {
      const billing = findAndroidUiNode(await this.dumpUi(), {
        text: "Plan & billing",
      })
      if (billing && isVisibleNode(billing)) {
        await this.tap(billing)
        break
      }
      if (attempt === 15) throw new Error("Plan & billing was not reachable.")
      await this.swipePageUp()
    }
    await this.waitForNode({ text: "Starter" }, 25_000)
    screenshots.push(await capture("05-billing-status-bar.png"))
    await this.pressKey(4)
    await this.waitForNode(
      { contentDescription: "More admin services tab" },
      25_000
    )
    screenshots.push(await capture("06-more-after-billing.png"))

    let memberWorkspace: AndroidUiNode | undefined
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const xml = await this.dumpUi()
      memberWorkspace = findAndroidWorkspaceSwitchNode(xml, "Member")
      if (memberWorkspace && isVisibleNode(memberWorkspace)) break
      await this.swipePageUp()
    }
    if (!memberWorkspace || !isVisibleNode(memberWorkspace)) {
      throw new Error(
        "The Android Member workspace switch action was not visible."
      )
    }

    screenshots.push(await capture("01-admin-workspace-selector.png"))
    await this.tap(memberWorkspace)
    await this.waitForNode({ contentDescription: "Member home tab" }, 30_000)
    await this.waitForNode({ text: "Member readiness" }, 30_000)
    screenshots.push(await capture("02-member-home-after-switch.png"))

    await this.tapNode({ contentDescription: "More member services tab" })
    let adminWorkspace: AndroidUiNode | undefined
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const xml = await this.dumpUi()
      adminWorkspace = findAndroidWorkspaceSwitchNode(xml, "Tenant Admin")
      if (adminWorkspace && isVisibleNode(adminWorkspace)) break
      await this.swipePageUp()
    }
    if (!adminWorkspace || !isVisibleNode(adminWorkspace)) {
      throw new Error(
        "The Android Tenant Admin workspace switch action was not visible after the role change."
      )
    }
    screenshots.push(await capture("03-member-workspace-selector.png"))
    await this.tap(adminWorkspace)
    await this.waitForNode(
      { contentDescription: "More admin services tab" },
      30_000
    )
    await this.waitForNode({ text: "Live position" }, 30_000)
    screenshots.push(await capture("07-admin-home-after-reverse-switch.png"))
    await this.tapNode({ contentDescription: "More admin services tab" })
    await this.waitForNode({ text: "Administration" }, 25_000)
    screenshots.push(await capture("08-admin-more-after-reverse-switch.png"))

    screenshots.push(...(await this.captureWorkspaceAccessScreens(prefix)))

    return screenshots
  }

  private async captureWorkspaceAccessScreens(prefix: string) {
    // This audits read-only access content. Never open or submit the invite form.
    await this.tapNode({ contentDescription: "Workspace access" })
    await wait(700)
    const screenshots: string[] = []
    const captured = new Set<string>()
    const accessRows = new Set<string>()
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const xml = await this.dumpUi()
      const tab = findAndroidUiNode(xml, {
        contentDescription: "More admin services tab",
      })
      if (!tab) throw new Error("The access audit left the Admin More shell.")
      for (const id of findWorkspaceAccessRowIds(xml, tab.bounds.top))
        accessRows.add(id)
      for (const checkpoint of WORKSPACE_ACCESS_CHECKPOINTS) {
        const node = findAndroidUiNodeBySemanticLabel(xml, checkpoint.label)
        if (
          node &&
          node.bounds.top >= 100 &&
          node.bounds.bottom <= tab.bounds.top &&
          node.bounds.bottom > node.bounds.top &&
          !captured.has(checkpoint.file)
        ) {
          screenshots.push(await this.screenshot(`${prefix}${checkpoint.file}`))
          captured.add(checkpoint.file)
        }
      }
      // Retain every overlapping viewport for visual review, not only headings.
      screenshots.push(
        await this.screenshot(
          `${prefix}access-scroll-${String(attempt + 1).padStart(2, "0")}.png`
        )
      )
      if (captured.size === WORKSPACE_ACCESS_CHECKPOINTS.length) {
        const users = [...accessRows].filter((id) =>
          id.startsWith("workspace-access-user-")
        ).length
        const roles = [...accessRows].filter((id) =>
          id.startsWith("workspace-access-role-")
        ).length
        await writeFile(
          path.join(
            this.evidenceDirectory,
            `${prefix}access-row-coverage.json`
          ),
          JSON.stringify(
            {
              users,
              roles,
              expectedUsers: 4,
              expectedRoles: 5,
              complete: users === 4 && roles === 5,
            },
            null,
            2
          )
        )
        if (users !== 4 || roles !== 5) {
          throw new Error(
            "Workspace access traversal did not expose all four scenario users and five roles."
          )
        }
        // The next theme search starts above Appearance, not at this footer.
        for (let rewind = 0; rewind < 24; rewind += 1) {
          const heading = findAndroidUiNode(await this.dumpUi(), {
            text: "Administration",
          })
          if (heading && isVisibleNode(heading)) return screenshots
          await this.adb([
            "shell",
            "input",
            "swipe",
            "32",
            "750",
            "32",
            "1750",
            "450",
          ])
          await wait(450)
        }
        throw new Error(
          "Workspace access audit could not restore the directory position."
        )
      }
      // Pixel 3a parent gutter avoids accidentally scrolling a nested user list.
      await this.adb([
        "shell",
        "input",
        "swipe",
        "32",
        "1750",
        "32",
        "1050",
        "450",
      ])
      await wait(500)
    }
    throw new Error(
      "Workspace access headings and bottom action were not all reachable."
    )
  }

  async captureWorkspaceFailure() {
    return this.screenshot("failed-workspace-checkpoint.png")
  }

  async signOut() {
    let moreTab: AndroidUiNode | undefined
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const current = await this.dumpUi()
      if (
        findAndroidUiNode(current, {
          contentDescription: "Bottom sheet backdrop",
        })
      ) {
        await this.pressKey(4)
        await wait(850)
        continue
      }
      if (
        findAndroidUiNode(current, { contentDescription: "Open QA access" }) ||
        findAndroidUiNode(current, { contentDescription: "Update QA access" })
      ) {
        return true
      }
      moreTab =
        findAndroidUiNode(current, {
          contentDescription: "More member services tab",
        }) ??
        findAndroidUiNode(current, {
          contentDescription: "More admin services tab",
        })
      if (moreTab) break
      await this.pressKey(4)
      await wait(650)
    }
    if (!moreTab) return false

    await this.tap(moreTab)
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const xml = await this.dumpUi()
      const signOut = findVisibleAndroidUiNode(xml, { text: "Sign out" })
      if (signOut) {
        await this.tap(signOut)
        await this.waitForAnyNode(
          [
            { contentDescription: "Open QA access" },
            { contentDescription: "Update QA access" },
          ],
          25_000
        )
        return true
      }
      await this.swipePageUp()
    }

    return false
  }
}
