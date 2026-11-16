import { describe, expect, test } from "bun:test"
import { NextRequest } from "next/server"
import { config as proxyConfig, proxy } from "../../proxy"
import {
  appLinksJsonResponse,
  buildAndroidAssetLinks,
  buildAppleAppSiteAssociation,
} from "./app-links"

const fingerprint = Array.from({ length: 32 }, (_, index) =>
  index.toString(16).padStart(2, "0")
).join(":")

describe("apple-app-site-association", () => {
  test("defaults to the approved store app and only the assistant paths", () => {
    expect(buildAppleAppSiteAssociation({})).toEqual({
      applinks: {
        details: [
          {
            appIDs: ["ZXC78SPCV4.com.halaalvest.mobile"],
            components: [
              {
                "/": "/assistant/m/*",
                comment: "Shared assistant answer or draft",
              },
              {
                "/": "/assistant/review/*",
                comment: "Shared assistant answer or draft",
              },
            ],
          },
        ],
      },
    })
  })

  test("uses configured app ids and drops malformed ones", () => {
    const body = buildAppleAppSiteAssociation({
      APP_LINKS_IOS_APP_IDS:
        "ZXC78SPCV4.com.halaalvest.mobile.preview, not-an-app-id",
    })
    expect(body.applinks.details[0]?.appIDs).toEqual([
      "ZXC78SPCV4.com.halaalvest.mobile.preview",
    ])
  })
})

describe("assetlinks.json", () => {
  test("is empty until the owner supplies signing fingerprints", () => {
    expect(buildAndroidAssetLinks({})).toEqual([])
    expect(
      buildAndroidAssetLinks({
        APP_LINKS_ANDROID_SHA256_CERT_FINGERPRINTS: "AB:CD",
      })
    ).toEqual([])
  })

  test("lists the package with normalized fingerprints", () => {
    expect(
      buildAndroidAssetLinks({
        APP_LINKS_ANDROID_SHA256_CERT_FINGERPRINTS: fingerprint,
      })
    ).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.halaalvest.mobile",
          sha256_cert_fingerprints: [fingerprint.toUpperCase()],
        },
      },
    ])
  })
})

describe("serving", () => {
  test("responds with plain JSON", async () => {
    const response = appLinksJsonResponse({ ok: true })
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("application/json")
    expect(await response.json()).toEqual({ ok: true })
  })

  test("the proxy matcher skips .well-known", () => {
    const [matcher] = proxyConfig.matcher
    const pattern = new RegExp(`^${matcher}$`)
    expect(pattern.test("/.well-known/apple-app-site-association")).toBe(false)
    expect(pattern.test("/.well-known/assetlinks.json")).toBe(false)
    expect(pattern.test("/assistant/m/abc")).toBe(true)
  })

  test("the proxy would otherwise send these paths to login", async () => {
    const host = "app.halaalvest.com"
    const response = await proxy(
      new NextRequest(`https://${host}/.well-known/assetlinks.json`, {
        headers: {
          host,
          "x-forwarded-host": host,
          "x-forwarded-proto": "https",
        },
      })
    )
    expect(response.headers.get("location")).toContain("/login")
  })
})
