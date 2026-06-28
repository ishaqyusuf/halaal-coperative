import { describe, expect, test } from "bun:test"
import { buildRuntimeAppUrl } from "./runtime-url"

describe("buildRuntimeAppUrl", () => {
  test("constructs portless local URLs without the configured app port", () => {
    const url = buildRuntimeAppUrl({
      config: {
        appPort: 1440,
        appRootDomain: "halaalvest.localhost:1440",
        defaultProtocol: "http",
        portlessRootDomain: "halaalvest.localhost:1440",
        productionRootDomain: "halaalvest.com",
      },
      currentHost: "halaalvest.localhost",
      currentProtocol: "http",
      path: "/signup",
    })

    expect(url).toBe("http://halaalvest.localhost/signup")
  })

  test("keeps the configured app port for bare localhost URLs", () => {
    const url = buildRuntimeAppUrl({
      config: {
        appPort: 1440,
        defaultProtocol: "http",
        localHostname: "localhost",
        portlessRootDomain: "halaalvest.localhost:1440",
      },
      currentHost: "localhost",
      currentProtocol: "http",
      path: "/signup",
    })

    expect(url).toBe("http://localhost:1440/signup")
  })
})
