// Playwright driver for `bun run qa:smoke`. Runs under Node (Playwright's
// supported runtime); scripts/qa-smoke.ts validates config and writes receipts.
// Read-mostly by construction: every non-GET request except the QA entry route
// is aborted, Quick Fill only fills drafts, and nothing is ever submitted.
import { mkdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

export const pages = [
  { name: "members", path: "/members" },
  { name: "contributions", path: "/contributions" },
  { name: "charges", path: "/charges" },
]

export const forms = [
  { name: "member create", path: "/members?memberSheetType=create" },
  {
    name: "contribution plan",
    path: "/contributions?contributionSheetType=plan",
  },
  {
    name: "charge definition",
    path: "/charges?chargeOperationSheetType=definition",
  },
]

const readMethods = new Set(["GET", "HEAD", "OPTIONS"])
// /auth/qa is the QA entry route. The Next dev overlay POSTs stack frames to
// the dev server for symbolication; blocking it made the overlay retry and
// wedge the page's main thread.
const allowedPosts = new Set(["/auth/qa", "/__nextjs_original-stack-frames"])
const stepLimitMs = 90_000
const frozenProbeMs = 4_000

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} message
 * @returns {Promise<T>}
 */
function withTimeout(promise, ms, message) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms)
    }),
  ]).finally(() => clearTimeout(timer))
}

/**
 * @param {{ method: string, url: string, dashboardHost: string }} request
 * @returns {"allow" | "block"}
 */
export function requestPolicy({ method, url, dashboardHost }) {
  if (readMethods.has(method.toUpperCase())) return "allow"
  const parsed = new URL(url)
  const ownHost =
    parsed.hostname === dashboardHost ||
    parsed.hostname.endsWith(`.${dashboardHost}`)
  return ownHost && allowedPosts.has(parsed.pathname) ? "allow" : "block"
}

/** @param {string} hostname @param {string} dashboardHost */
export function isDashboardHost(hostname, dashboardHost) {
  return hostname === dashboardHost || hostname.endsWith(`.${dashboardHost}`)
}

/**
 * One Path setup lives at /getting-started. A live workspace redirects it to
 * "/", and member migration lands on /onboarding-success. A setup-stage admin
 * must see the "Setup steps" rail.
 * @param {{ pathname: string, hasRail: boolean, expectSetup: boolean }} input
 * @returns {{ ok: boolean, detail: string }}
 */
export function classifyGettingStarted({ pathname, hasRail, expectSetup }) {
  if (pathname === "/getting-started" && hasRail)
    return { ok: true, detail: "One Path setup rail rendered" }
  if (pathname === "/onboarding-success")
    return {
      ok: true,
      detail: "Member migration: redirected to /onboarding-success",
    }
  if (pathname === "/" && !expectSetup)
    return {
      ok: true,
      detail: "Live workspace: /getting-started redirects home",
    }
  return {
    ok: false,
    detail: expectSetup
      ? `Expected the One Path setup rail; landed on ${pathname}${hasRail ? "" : " without it"}`
      : `Unexpected /getting-started outcome: ${pathname}`,
  }
}

/**
 * A tab whose main thread is stuck (a render loop) fails every later
 * navigation too. Swap it for a fresh tab in the same context, which keeps
 * the sign-in cookies, so one frozen journey cannot fail the rest.
 * @param {import("playwright").Page} page
 * @param {(page: import("playwright").Page) => Promise<void>} attach
 * @returns {Promise<import("playwright").Page | null>} the fresh tab, or null when responsive
 */
export async function swapIfFrozen(page, attach, probeMs = frozenProbeMs) {
  const alive = await withTimeout(
    page.evaluate(() => true),
    probeMs,
    "frozen"
  ).catch(() => false)
  if (alive) return null
  const fresh = await page.context().newPage()
  await attach(fresh)
  await withTimeout(page.close(), 5_000, "close timed out").catch(() => {})
  return fresh
}

/** @param {string} text */
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/**
 * @typedef {{ qaDomain: string, profileLabel: string, cooperative?: string, setupProfileLabel?: string, setupCooperative?: string, origin: string }} SmokeConfig
 * @typedef {{ name: string, status: "pass" | "fail", ms: number, detail: string }} Check
 * @typedef {{ checks: Check[], blocked: string[], consoleErrors: number }} Results
 */

/**
 * One signed-in browser session: write-blocking routes, step bookkeeping,
 * QA sign-in and dashboard navigation.
 * @param {import("playwright").Page} initialPage
 * @param {SmokeConfig} config
 * @param {string} artifacts
 * @param {Results} results
 */
export async function createSession(initialPage, config, artifacts, results) {
  let page = initialPage
  const dashboardHost = new URL(config.origin).hostname
  const { checks, blocked } = results

  /** @param {import("playwright").Page} target */
  async function attach(target) {
    target.setDefaultTimeout(20_000)
    target.on("console", (message) => {
      if (message.type() === "error") results.consoleErrors += 1
    })
    await target.route("**/*", async (route) => {
      const request = route.request()
      if (
        requestPolicy({
          method: request.method(),
          url: request.url(),
          dashboardHost,
        }) === "allow"
      )
        return route.continue()
      blocked.push(`${request.method()} ${new URL(request.url()).pathname}`)
      return route.abort("blockedbyclient")
    })
  }
  await attach(page)

  async function replaceIfFrozen() {
    const fresh = await swapIfFrozen(page, attach)
    if (fresh) page = fresh
    return Boolean(fresh)
  }

  /** @param {string} name @param {() => Promise<string>} run */
  async function step(name, run) {
    const started = Date.now()
    process.stderr.write(`qa:smoke ${name}…\n`)
    const attempt = () =>
      withTimeout(run(), stepLimitMs, `Step exceeded ${stepLimitMs / 1000}s`)
    let froze = false
    try {
      let detail
      try {
        detail = await attempt()
      } catch (first) {
        // A shared dev server hot-reloads while other sessions edit, so one
        // retry tells a reload from a real failure. The retry stays visible.
        const reason =
          first instanceof Error ? first.message.split("\n")[0] : String(first)
        froze = await replaceIfFrozen()
        process.stderr.write(
          `qa:smoke ${name}: retrying after "${reason}"${froze ? " (tab froze; retrying in a fresh tab)" : ""}\n`
        )
        await new Promise((done) => setTimeout(done, 3_000))
        detail = `${await attempt()} (passed on retry; first attempt: ${reason}${froze ? "; tab froze" : ""})`
      }
      checks.push({ name, status: "pass", ms: Date.now() - started, detail })
      return true
    } catch (error) {
      const message =
        error instanceof Error ? error.message.split("\n")[0] : String(error)
      // Diagnose on the tab that failed, then replace it if it is frozen.
      if (await replaceIfFrozen()) {
        checks.push({
          name,
          status: "fail",
          ms: Date.now() - started,
          detail: `${message ?? "failed"} [tab froze: main thread unresponsive${froze ? " on both attempts" : ""}; later steps use a fresh tab]`,
        })
        return false
      }
      // Button names are UI labels; enough to tell a missing control from a slow page.
      // Bounded: a wedged page must not stall the remaining steps.
      const buttons = await withTimeout(
        page.getByRole("dialog").last().getByRole("button").allInnerTexts(),
        5_000,
        "diagnostics timed out"
      )
        .then((names) => names.map((label) => label.trim()).filter(Boolean))
        .catch(() => [])
      const path = new URL(page.url()).pathname
      checks.push({
        name,
        status: "fail",
        ms: Date.now() - started,
        detail: `${message ?? "failed"} [at ${path}${buttons.length ? `; dialog buttons: ${buttons.slice(0, 8).join(" | ")}` : ""}]`,
      })
      await page
        .screenshot({
          path: resolve(artifacts, `${name.replaceAll(" ", "-")}-failure.png`),
          timeout: 10_000,
        })
        .catch(() => {})
      return false
    }
  }

  let appOrigin = config.origin
  /** @param {string} stepName @param {string} profileLabel @param {string | undefined} cooperative */
  const signIn = (stepName, profileLabel, cooperative) =>
    step(stepName, async () => {
      const capability = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/auth/qa" &&
          response.request().method() === "GET",
        { timeout: 30_000 }
      )
      const login = await page.goto(`${config.origin}/login`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      if (!login || login.status() >= 400) {
        capability.catch(() => {})
        throw new Error(
          `HTTP ${login?.status() ?? "no response"} for /login; check the dashboard dev server output`
        )
      }
      const state = await (await capability).json()
      if (!state?.capability?.available)
        throw new Error(
          `QA access is unavailable (${state?.capability?.status ?? "no capability"}); run bun run qa:doctor --require-qa`
        )
      const panel = page.locator('section[aria-labelledby="qa-access-title"]')
      const changeDomain = panel.getByRole("button", {
        name: "Change QA Domain",
        exact: true,
      })
      const domainField = panel.getByLabel("QA Domain", { exact: true })
      await domainField.or(changeDomain).first().waitFor({ state: "visible" })
      if (await domainField.isVisible()) {
        await domainField.fill(config.qaDomain)
        await panel
          .getByRole("button", { name: "Authorize this browser", exact: true })
          .click()
        const alert = panel.getByRole("alert")
        await changeDomain.or(alert).first().waitFor({ state: "visible" })
        if (await alert.isVisible())
          throw new Error(
            `QA authorization failed for ${config.qaDomain}: ${await alert.innerText()}`
          )
      }
      // Profile buttons are named "<initials> <full name> <cooperative> <role>".
      const name = new RegExp(
        `${escapeRegex(profileLabel)}${cooperative ? `.*${escapeRegex(cooperative)}` : ""}`
      )
      const profile = panel.getByRole("button", { name }).first()
      if (!(await profile.isVisible())) {
        const available = await panel
          .locator("button strong")
          .evaluateAll((elements) =>
            elements.map((element) => element.textContent?.trim() ?? "")
          )
        throw new Error(
          `No QA profile matches "${profileLabel}". Available: ${available.slice(0, 8).join(", ") || "none"}`
        )
      }
      await profile.click()
      await page.waitForURL((url) => url.pathname !== "/login", {
        timeout: 60_000,
      })
      const url = new URL(page.url())
      if (!isDashboardHost(url.hostname, dashboardHost))
        throw new Error(`Sign-in left the dashboard host (${url.hostname}).`)
      appOrigin = url.origin
      return `Entered ${profileLabel}; workspace ${url.hostname}`
    })

  /** @param {string} path */
  async function open(path) {
    const response = await page.goto(`${appOrigin}${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    })
    const url = new URL(page.url())
    if (!response || response.status() >= 400)
      throw new Error(`HTTP ${response?.status() ?? "no response"} for ${path}`)
    if (url.pathname === "/login")
      throw new Error(`${path} redirected to /login`)
    if (!isDashboardHost(url.hostname, dashboardHost))
      throw new Error(`${path} left the dashboard host`)
    await page.locator("main").first().waitFor({ state: "visible" })
    if (
      await page
        .getByText(/Application error|Something went wrong/i)
        .first()
        .isVisible()
        .catch(() => false)
    )
      throw new Error(`${path} rendered an error boundary`)
    return url
  }

  /** @param {string} stepName @param {boolean} expectSetup */
  const gettingStarted = (stepName, expectSetup) =>
    step(stepName, async () => {
      await open("/getting-started")
      // The page streams behind a loading skeleton, and a redirect issued
      // inside the streamed segment happens client-side, so wait for either.
      const rail = page.getByRole("navigation", { name: "Setup steps" })
      await Promise.race([
        rail.waitFor({ state: "visible", timeout: 20_000 }),
        page.waitForURL((next) => next.pathname !== "/getting-started", {
          timeout: 20_000,
        }),
      ]).catch(() => {})
      const url = new URL(page.url())
      const hasRail = await rail.isVisible().catch(() => false)
      const outcome = classifyGettingStarted({
        pathname: url.pathname,
        hasRail,
        expectSetup,
      })
      await page.screenshot({
        path: resolve(artifacts, `${stepName.replaceAll(" ", "-")}.png`),
      })
      if (!outcome.ok) throw new Error(outcome.detail)
      return outcome.detail
    })

  return { step, signIn, open, gettingStarted, page: () => page }
}

/**
 * @param {import("playwright").Page} initialPage
 * @param {SmokeConfig} config
 * @param {string} artifacts
 * @param {() => Promise<import("playwright").Page>} [newPage] fresh context for the setup admin
 * @returns {Promise<Results>}
 */
export async function webJourney(initialPage, config, artifacts, newPage) {
  /** @type {Results} */
  const results = { checks: [], blocked: [], consoleErrors: 0 }
  const session = await createSession(initialPage, config, artifacts, results)
  const { step, signIn, open, gettingStarted } = session
  if (!(await signIn("qa sign-in", config.profileLabel, config.cooperative)))
    return results

  for (const target of pages)
    await step(`${target.name} page`, async () => {
      const url = await open(target.path)
      await session.page().screenshot({
        path: resolve(artifacts, `${target.name}-page.png`),
      })
      return `Rendered ${url.pathname}`
    })

  for (const form of forms)
    await step(`${form.name} quick fill`, async () => {
      await open(form.path)
      const page = session.page()
      const dialog = page.getByRole("dialog").last()
      await dialog.waitFor({ state: "visible" })
      const fields = dialog.locator(
        "input:not([type=hidden]):not([type=file]), textarea"
      )
      const before = await fields.evaluateAll((elements) =>
        elements.map(
          (element) => /** @type {HTMLInputElement} */ (element).value
        )
      )
      await dialog
        .getByRole("button", { name: /^quick fill$/i })
        .first()
        .click()
      await page.waitForFunction(
        ([selector, previous]) => {
          const dialogs = document.querySelectorAll('[role="dialog"]')
          const current = dialogs[dialogs.length - 1]
          if (!current) return false
          const values = Array.from(current.querySelectorAll(selector)).map(
            (element) => /** @type {HTMLInputElement} */ (element).value
          )
          return values.some(
            (value, index) => value && value !== previous[index]
          )
        },
        /** @type {[string, string[]]} */ ([
          "input:not([type=hidden]):not([type=file]), textarea",
          before,
        ]),
        { timeout: 10_000 }
      )
      const filled = await fields.evaluateAll(
        (elements, previous) =>
          elements.filter(
            (element, index) =>
              /** @type {HTMLInputElement} */ (element).value &&
              /** @type {HTMLInputElement} */ (element).value !==
                previous[index]
          ).length,
        before
      )
      await page.screenshot({
        path: resolve(
          artifacts,
          `${form.name.replaceAll(" ", "-")}-quick-fill.png`
        ),
      })
      await page.keyboard.press("Escape")
      return `Quick Fill set ${filled} field(s); closed without submitting`
    })

  await gettingStarted("getting-started gate", false)

  // One Path renders only for a cooperative still in setup, so it needs a
  // second QA admin; a fresh context keeps the two sessions apart.
  if (config.setupProfileLabel && newPage) {
    const setup = await createSession(
      await newPage(),
      config,
      artifacts,
      results
    )
    if (
      await setup.signIn(
        "setup admin sign-in",
        config.setupProfileLabel,
        config.setupCooperative
      )
    )
      await setup.gettingStarted("one path setup render", true)
  }

  return results
}

async function main() {
  const [configFile, artifacts, headed] = process.argv.slice(2)
  if (!configFile || !artifacts)
    throw new Error("Usage: node scripts/qa-web-smoke.mjs CONFIG ARTIFACTS")
  const config = JSON.parse(readFileSync(configFile, "utf8"))
  mkdirSync(artifacts, { recursive: true })
  const { chromium } = await import("playwright")
  const browser = await chromium.launch({ headless: headed !== "--headed" })
  try {
    const newPage = async () =>
      (
        await browser.newContext({ viewport: { width: 1440, height: 900 } })
      ).newPage()
    process.stdout.write(
      `${JSON.stringify(await webJourney(await newPage(), config, artifacts, newPage))}\n`
    )
  } finally {
    await browser.close()
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
