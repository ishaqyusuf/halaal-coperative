// Playwright driver for `bun run qa:smoke:write run`. Runs under Node;
// scripts/qa-write-smoke.ts checks every guard, mints the local early-access
// approval and cleans up. This driver only talks to the named local hosts:
// any request to another host is aborted, reads included.
import { mkdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

const stepLimitMs = 120_000
export const localHosts = [
  "halaalvest.localhost",
  "halaalvest-dash.localhost",
  "api.halaalvest.localhost",
]

/** @param {string} hostname */
export function isLocalHost(hostname) {
  return localHosts.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`)
  )
}

/**
 * The write smoke may write, but only to the local stack.
 * @param {{ url: string }} request
 * @returns {"allow" | "block"}
 */
export function writeRequestPolicy({ url }) {
  const parsed = new URL(url)
  if (parsed.protocol === "data:" || parsed.protocol === "blob:") return "allow"
  return isLocalHost(parsed.hostname) ? "allow" : "block"
}

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
 * @typedef {{ runId: string, qaDomain: string, slug: string, cooperativeName: string, ownerName: string, ownerEmail: string, ownerPassword: string, cooperativeCodePrefix: string, marketingOrigin: string, dashboardHost: string, approvalToken: string }} WritePlan
 * @typedef {{ key: string, status: "pass" | "fail" | "skipped", ms: number, detail: string }} StageResult
 */

/**
 * Run the stages in order and stop at the first failure; later stages are
 * reported as skipped. Each stage gets one attempt: a write is not retried.
 * @param {Array<{ key: string, run: () => Promise<string> }>} stages
 * @param {(key: string) => Promise<void>} [onFailure]
 * @returns {Promise<StageResult[]>}
 */
export async function runStages(stages, onFailure) {
  /** @type {StageResult[]} */
  const results = []
  let failed = false
  for (const stage of stages) {
    if (failed) {
      results.push({ key: stage.key, status: "skipped", ms: 0, detail: "" })
      continue
    }
    const started = Date.now()
    process.stderr.write(`qa:smoke:write ${stage.key}…\n`)
    try {
      const detail = await withTimeout(
        stage.run(),
        stepLimitMs,
        `Stage exceeded ${stepLimitMs / 1000}s`
      )
      results.push({
        key: stage.key,
        status: "pass",
        ms: Date.now() - started,
        detail,
      })
    } catch (error) {
      failed = true
      const message =
        error instanceof Error ? error.message.split("\n")[0] : String(error)
      results.push({
        key: stage.key,
        status: "fail",
        ms: Date.now() - started,
        detail: message ?? "failed",
      })
      await onFailure?.(stage.key).catch(() => {})
    }
  }
  return results
}

/**
 * The calendar's day buttons carry `data-day` in the browser's locale
 * (en-US, set on the context): for 1 November 2026 that is "11/1/2026".
 * @param {Date} now
 */
export function firstOfMonthDataDay(now = new Date()) {
  return `${now.getMonth() + 1}/1/${now.getFullYear()}`
}

/**
 * Open a date picker and choose the 1st of the current month. An empty
 * picker opens on the current month.
 * @param {import("playwright").Page} page
 * @param {import("playwright").Locator} trigger
 */
async function pickFirstOfThisMonth(page, trigger) {
  await trigger.click()
  await page
    .locator(`button[data-day="${firstOfMonthDataDay()}"]`)
    .first()
    .click()
}

/**
 * Press the step's "Continue" (it saves first) and wait for the next step.
 * @param {import("playwright").Page} page
 * @param {string} fromStep
 */
async function continueFrom(page, fromStep) {
  await page
    .getByRole("button", { name: "Continue", exact: true })
    .last()
    .click()
  await page.waitForURL(
    (url) =>
      url.pathname !== "/getting-started" ||
      url.searchParams.get("step") !== fromStep,
    { timeout: 60_000 }
  )
}

/**
 * @param {import("playwright").Page} page
 * @param {WritePlan} plan
 * @param {string} artifacts
 * @param {{ blocked: string[] }} state
 */
export function onePathStages(page, plan, artifacts, state) {
  /** @type {{ onboardingUrl?: string, workspaceOrigin?: string }} */
  const journey = {}
  /** @param {string} name */
  const shot = (name) =>
    page
      .screenshot({ path: resolve(artifacts, `${name}.png`), fullPage: true })
      .catch(() => {})
  void state

  return [
    {
      key: "signup",
      run: async () => {
        const url = new URL("/signup", plan.marketingOrigin)
        url.searchParams.set("approvalToken", plan.approvalToken)
        await page.goto(url.toString(), { waitUntil: "domcontentloaded" })
        // The labels are not linked to every input, so use the form names.
        const fill = async (
          /** @type {string} */ name,
          /** @type {string} */ value
        ) => {
          const field = page.locator(`input[name="${name}"]`).first()
          if (await field.isEditable()) await field.fill(value)
        }
        // The approval prefills name and email once the form has hydrated;
        // values typed before that are reset.
        await page
          .getByText("From your approved request")
          .first()
          .waitFor({ state: "visible", timeout: 60_000 })
        await page.waitForLoadState("networkidle").catch(() => {})
        const values = {
          cooperativeName: plan.cooperativeName,
          primaryContactFullName: plan.ownerName,
          primaryContactEmail: plan.ownerEmail,
          workspaceSlug: plan.slug,
          cooperativeCodePrefix: plan.cooperativeCodePrefix,
          primaryContactMemberNumber: "0001",
        }
        for (let attempt = 0; attempt < 2; attempt += 1) {
          for (const [name, value] of Object.entries(values))
            await fill(name, value)
          const kept = await page
            .locator('input[name="workspaceSlug"]')
            .inputValue()
          if (kept === plan.slug) break
        }
        const response = page.waitForResponse(
          (candidate) =>
            new URL(candidate.url()).pathname === "/api/signup" &&
            candidate.request().method() === "POST",
          { timeout: 60_000 }
        )
        const send = page.getByRole("button", {
          name: "Send verification email",
          exact: true,
        })
        await send.waitFor({ state: "visible" })
        // The button waits for the name, prefix and address checks.
        await page.waitForFunction(
          () =>
            Array.from(document.querySelectorAll("button")).some(
              (button) =>
                button.textContent?.trim() === "Send verification email" &&
                !button.disabled
            ),
          undefined,
          { timeout: 30_000 }
        )
        await send.click()
        const result = await response
        const body = await result.json().catch(() => ({}))
        if (!result.ok())
          throw new Error(
            `Sign-up refused (${result.status()}): ${body?.error?.message ?? body?.message ?? "no message"}`
          )
        if (!body.onboardingUrl)
          throw new Error(
            "Sign-up answered without a local verification link (is the marketing app in development mode?)."
          )
        journey.onboardingUrl = body.onboardingUrl
        await page
          .getByText("We sent you a link")
          .first()
          .waitFor({ state: "visible" })
        await shot("01-signup-sent")
        return `Verification requested for ${plan.ownerEmail} (${body.verificationDelivery?.routingMode ?? body.verificationDelivery?.status ?? "no delivery"})`
      },
    },
    {
      key: "verify-email",
      run: async () => {
        if (!journey.onboardingUrl) throw new Error("No verification link.")
        const target = new URL(journey.onboardingUrl)
        if (!isLocalHost(target.hostname))
          throw new Error(`The verification link left the local stack.`)
        await page.goto(target.toString(), { waitUntil: "domcontentloaded" })
        await page
          .getByText("Email verified")
          .first()
          .waitFor({ state: "visible", timeout: 30_000 })
        await shot("02-email-verified")
        return "Opened the QA verification link; email verified"
      },
    },
    {
      key: "onboarding",
      run: async () => {
        // Filled by hand: marketing Quick fill needs a QA authorization that
        // the reserved write-smoke domain does not have. The start date is
        // the 1st of this month, so the owner member has no closed months to
        // back-fill.
        await page
          .getByText("How many members do you have?")
          .waitFor({ state: "visible" })
        await page.waitForLoadState("networkidle").catch(() => {})
        const comboboxes = page.getByRole("combobox")
        await comboboxes.nth(0).click()
        await page.getByRole("option").first().click()
        await pickFirstOfThisMonth(
          page,
          page.getByRole("button", { name: "Select start date" })
        )
        await page
          .locator(
            'textarea[name="officeAddress"], input[name="officeAddress"]'
          )
          .first()
          .fill("QA ONLY — 1 Smoke Test Road")
        await page.locator('input[name="city"]').fill("Kaduna")
        await page.locator('input[name="state"]').fill("Kaduna")
        await comboboxes.nth(1).click()
        await page.getByRole("option", { name: "Nigeria", exact: true }).click()
        await page
          .getByRole("button", { name: "Continue", exact: true })
          .click()
        const password = page.locator('input[name="password"]')
        await password.waitFor({ state: "visible" })
        await password.fill(plan.ownerPassword)
        await page
          .locator('input[name="confirmPassword"]')
          .fill(plan.ownerPassword)
        const legal = page.getByRole("checkbox", {
          name: /I accept the platform terms/,
        })
        if (await legal.isVisible().catch(() => false)) await legal.check()
        await shot("03-onboarding-password")
        const create = page.getByRole("button", {
          name: "Create workspace",
          exact: true,
        })
        const response = page.waitForResponse(
          (candidate) =>
            new URL(candidate.url()).pathname === "/api/onboarding" &&
            candidate.request().method() === "POST",
          { timeout: 60_000 }
        )
        await create.click()
        const result = await response
        if (!result.ok()) {
          const body = await result.json().catch(() => ({}))
          throw new Error(
            `Workspace creation refused (${result.status()}): ${body?.error?.message ?? body?.message ?? "no message"}`
          )
        }
        return "Cooperative details (Quick fill), password and legal acceptance; workspace created"
      },
    },
    {
      key: "handoff",
      run: async () => {
        // The onboarding page POSTs the session handoff to the tenant
        // dashboard, which lands signed in on One Path.
        await page.waitForURL(
          (url) =>
            url.hostname.endsWith(`.${plan.dashboardHost}`) &&
            url.pathname !== "/auth/handoff",
          { timeout: 60_000 }
        )
        const url = new URL(page.url())
        if (url.pathname === "/login")
          throw new Error("The handoff landed on /login, not signed in.")
        journey.workspaceOrigin = url.origin
        await page
          .getByRole("navigation", { name: "Setup steps" })
          .waitFor({ state: "visible", timeout: 30_000 })
        await shot("04-handoff-one-path")
        return `Signed in at ${url.hostname}${url.pathname}; One Path rail shown`
      },
    },
    {
      key: "setup",
      run: async () => {
        const origin = journey.workspaceOrigin
        if (!origin) throw new Error("No workspace origin from the handoff.")
        const at = (/** @type {string} */ key) =>
          new URL(page.url()).searchParams.get("step") === key
        const step = async (/** @type {string} */ key) => {
          if (!at(key))
            await page.goto(`${origin}/getting-started?step=${key}`, {
              waitUntil: "domcontentloaded",
            })
        }
        /** @type {string[]} */
        const done = []

        // Step 5: historical backfill from this month.
        await step("setup-mode")
        await page
          .getByRole("radio", { name: /Rebuild our full history/ })
          .check()
        await continueFrom(page, "setup-mode")
        done.push("5 setup mode")

        // Step 6: the service defaults are valid.
        await step("operation-profile")
        await continueFrom(page, "operation-profile")
        done.push("6 services")

        // Step 7: one monthly levy that applies to commitment savings.
        await step("shares-charges")
        await page
          .getByRole("textbox", { name: "Charge" })
          .first()
          .fill("Monthly levy")
        await page.getByRole("textbox", { name: "Amount" }).first().fill("500")
        const from = page.getByRole("button", { name: /^From\b/ })
        if (
          await from
            .first()
            .isVisible()
            .catch(() => false)
        )
          await pickFirstOfThisMonth(page, from.first())
        await page
          .getByRole("button", { name: /^Applies to/ })
          .first()
          .click()
        await page.getByRole("checkbox", { name: "Commitment" }).first().check()
        await page.keyboard.press("Escape")
        await shot("05-shares-charges")
        await continueFrom(page, "shares-charges")
        done.push("7 shares and charges")

        // Step 8: no business history yet.
        await step("profit")
        const noHistory = page.getByRole("checkbox", {
          name: /We have no business history/,
        })
        if (await noHistory.isVisible().catch(() => false))
          await noHistory.check()
        await continueFrom(page, "profit")
        done.push("8 profit sharing")

        // Step 8b (historical): no past profit seasons to confirm.
        if (at("profit-seasons")) {
          const confirm = page.getByRole("button", { name: "Confirm seasons" })
          if (await confirm.isVisible().catch(() => false))
            await confirm.click()
          else
            await page
              .getByRole("link", { name: "Continue", exact: true })
              .click()
          await page.waitForURL((url) => !url.search.includes("profit-seasons"))
          done.push("8b profit seasons")
        }

        // Step 9: every step is saved, so the review offers the members step.
        await step("review-setup")
        await shot("06-review-setup")
        await page.getByRole("link", { name: "Next: add members" }).click()
        await page.waitForURL((url) => url.pathname === "/onboarding-success")
        done.push("9 review")
        return `Filled by hand (dashboard Quick fill is hidden before go-live): ${done.join(", ")}`
      },
    },
    {
      key: "members",
      run: async () => {
        // The owner is the only member. Starting this month leaves no closed
        // months to back-fill; KYC goes not started -> pending -> verified.
        const verify = page.getByRole("link", { name: /Verify my KYC/ })
        await verify.first().waitFor({ state: "visible" })
        const kycUrl = new URL(
          /** @type {string} */ (await verify.first().getAttribute("href")),
          page.url()
        )
        for (const status of ["Pending review", "Verified"]) {
          await page.goto(kycUrl.toString(), { waitUntil: "domcontentloaded" })
          const sheet = page.getByRole("dialog").last()
          await sheet.waitFor({ state: "visible" })
          await sheet.getByRole("combobox", { name: "KYC status" }).click()
          await page.getByRole("option", { name: status, exact: true }).click()
          await sheet
            .getByRole("button", { name: "Save KYC", exact: true })
            .click()
          await sheet
            .waitFor({ state: "hidden", timeout: 30_000 })
            .catch(() => {})
        }
        await page.goto(`${journey.workspaceOrigin}/onboarding-success`, {
          waitUntil: "domcontentloaded",
        })
        await page.waitForFunction(
          () =>
            /\b1 of 1\b/.test(
              document.querySelector("#members-readiness")?.textContent ?? ""
            ),
          undefined,
          { timeout: 30_000 }
        )
        await shot("07-members-ready")
        return (await page.locator("#members-readiness").innerText()).trim()
      },
    },
    {
      key: "go-live",
      run: async () => {
        await page
          .getByRole("link", { name: "Go live", exact: true })
          .first()
          .click()
        await page.waitForURL(
          (url) => url.searchParams.get("step") === "review"
        )
        await page
          .getByRole("checkbox", {
            name: /I've checked the balances with our records/,
          })
          .check()
        await shot("08-go-live-checklist")
        await page.getByRole("button", { name: "Go live", exact: true }).click()
        await page.waitForURL(
          (url) => url.pathname === "/" && url.searchParams.get("live") === "1",
          { timeout: 60_000 }
        )
        await page
          .getByText(/is live\. Members can sign in/)
          .first()
          .waitFor({ state: "visible" })
        await shot("09-live")
        return "Confirmed the checklist and went live; home shows the live banner"
      },
    },
    {
      key: "verify-live",
      run: async () => {
        await page.goto(`${journey.workspaceOrigin}/getting-started`, {
          waitUntil: "domcontentloaded",
        })
        await page.waitForURL((url) => url.pathname === "/", {
          timeout: 20_000,
        })
        return "/getting-started redirects home for the live workspace"
      },
    },
  ]
}

async function main() {
  const [planFile, artifacts, headed] = process.argv.slice(2)
  if (!planFile || !artifacts)
    throw new Error(
      "Usage: node scripts/qa-write-smoke-driver.mjs PLAN ARTIFACTS"
    )
  /** @type {WritePlan} */
  const plan = JSON.parse(readFileSync(planFile, "utf8"))
  mkdirSync(artifacts, { recursive: true })
  const { chromium } = await import("playwright")
  const browser = await chromium.launch({ headless: headed !== "--headed" })
  /** @type {{ blocked: string[] }} */
  const state = { blocked: [] }
  try {
    // en-US keeps calendar `data-day` values predictable; the One Path rail
    // only renders at lg widths.
    const context = await browser.newContext({
      locale: "en-US",
      viewport: { width: 1440, height: 900 },
    })
    await context.route("**/*", async (route) => {
      const request = route.request()
      if (writeRequestPolicy({ url: request.url() }) === "allow")
        return route.continue()
      state.blocked.push(`${request.method()} ${new URL(request.url()).host}`)
      return route.abort("blockedbyclient")
    })
    const page = await context.newPage()
    page.setDefaultTimeout(30_000)
    const stages = await runStages(
      onePathStages(page, plan, artifacts, state),
      async (key) => {
        await page.screenshot({
          path: resolve(artifacts, `${key}-failure.png`),
          fullPage: true,
          timeout: 10_000,
        })
      }
    )
    process.stdout.write(
      `${JSON.stringify({ stages, blocked: [...new Set(state.blocked)], finalUrl: page.url() })}\n`
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
