import { describe, expect, test } from "bun:test"
import {
  getEmailRoutingConfiguration,
  parseQaDomainRoutes,
  resolveEmailRouting,
} from "./email-routing"

describe("email routing configuration", () => {
  test("defaults local development to console delivery", () => {
    const configuration = getEmailRoutingConfiguration({
      NODE_ENV: "development",
    })

    expect(configuration.deliveryMode).toBe("console")
    expect(configuration.qaDomainRoutes.size).toBe(0)
  })

  test("allows QA domain routing in a preview runtime", () => {
    const configuration = getEmailRoutingConfiguration({
      EMAIL_DELIVERY_MODE: "qa_routed",
      EMAIL_QA_DOMAIN_ROUTES: JSON.stringify({
        "ishaq.qa.test": "ishaq@example.com",
      }),
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
    })

    expect(configuration.deliveryMode).toBe("qa_routed")
    expect(configuration.qaDomainRoutes.get("ishaq.qa.test")).toBe(
      "ishaq@example.com"
    )
  })

  test("allows QA domain routing in an explicit staging runtime", () => {
    const configuration = getEmailRoutingConfiguration({
      APP_ENV: "staging",
      EMAIL_DELIVERY_MODE: "qa_routed",
      EMAIL_QA_DOMAIN_ROUTES: JSON.stringify({
        "mubarak.qa.test": "mubarak@example.com",
      }),
      NODE_ENV: "production",
    })

    expect(configuration.deliveryMode).toBe("qa_routed")
  })

  test("allows explicitly configured QA routing in production", () => {
    const configuration = getEmailRoutingConfiguration({
      APP_ENV: "production",
      EMAIL_DELIVERY_MODE: "qa_routed",
      EMAIL_QA_DOMAIN_ROUTES: JSON.stringify({
        "ishaq.qa.test": "ishaq@example.com",
      }),
      NODE_ENV: "production",
    })

    expect(configuration.deliveryMode).toBe("qa_routed")
    expect(configuration.qaDomainRoutes.get("ishaq.qa.test")).toBe(
      "ishaq@example.com"
    )
  })

  test("allows explicitly configured QA routing in local development", () => {
    const configuration = getEmailRoutingConfiguration({
      EMAIL_DELIVERY_MODE: "qa_routed",
      EMAIL_QA_DOMAIN_ROUTES: JSON.stringify({
        "ishaq.qa.test": "ishaq@example.com",
      }),
      NODE_ENV: "development",
    })

    expect(configuration.deliveryMode).toBe("qa_routed")
  })

  test("rejects mixed legacy and QA routing configuration", () => {
    expect(() =>
      getEmailRoutingConfiguration({
        APP_ENV: "staging",
        EMAIL_DELIVERY_MODE: "qa_routed",
        EMAIL_QA_DOMAIN_ROUTES: JSON.stringify({
          "ishaq.qa.test": "ishaq@example.com",
        }),
        EMAIL_TEST_RECIPIENT: "legacy@example.com",
      })
    ).toThrow("QA domain routing cannot be combined")
  })

  test("requires routes when QA routing is enabled", () => {
    expect(() =>
      getEmailRoutingConfiguration({
        APP_ENV: "staging",
        EMAIL_DELIVERY_MODE: "qa_routed",
      })
    ).toThrow(
      "EMAIL_DELIVERY_MODE=qa_routed requires at least one EMAIL_QA_DOMAIN_ROUTES entry."
    )
  })
})

describe("QA domain route parsing", () => {
  test("normalizes domain keys and destination whitespace", () => {
    const routes = parseQaDomainRoutes(
      JSON.stringify({
        "  ISHAQ.QA.TEST.  ": "  ishaq@example.com  ",
      })
    )

    expect(routes.get("ishaq.qa.test")).toBe("ishaq@example.com")
  })

  test("rejects malformed JSON and non-object values", () => {
    expect(() => parseQaDomainRoutes("{")).toThrow(
      "EMAIL_QA_DOMAIN_ROUTES must be a valid JSON object."
    )
    expect(() => parseQaDomainRoutes("[]")).toThrow(
      "EMAIL_QA_DOMAIN_ROUTES must be a JSON object."
    )
  })

  test("rejects real route domains and reserved destinations", () => {
    expect(() =>
      parseQaDomainRoutes(
        JSON.stringify({
          "test1.com": "ishaq@example.com",
        })
      )
    ).toThrow("must be a valid reserved .test domain")

    expect(() =>
      parseQaDomainRoutes(
        JSON.stringify({
          "ishaq.qa.test": "tester@destination.test",
        })
      )
    ).toThrow("must be a deliverable tester inbox")
  })

  test("rejects duplicate normalized domains", () => {
    expect(() =>
      parseQaDomainRoutes(
        JSON.stringify({
          "ISHAQ.QA.TEST": "one@example.com",
          "ishaq.qa.test": "two@example.com",
        })
      )
    ).toThrow('contains duplicate domain "ishaq.qa.test"')
  })
})

describe("email recipient routing", () => {
  const qaConfiguration = {
    deliveryMode: "qa_routed" as const,
    qaDomainRoutes: new Map([
      ["ishaq.qa.test", "ishaq@example.com"],
      ["mubarak.qa.test", "mubarak@example.com"],
    ]),
  }

  test("routes arbitrary local parts by exact domain", () => {
    expect(
      resolveEmailRouting("MEMBER-001@ISHAQ.QA.TEST", qaConfiguration)
    ).toEqual({
      deliveredRecipients: ["ishaq@example.com"],
      mode: "qa_domain",
      originalRecipient: "MEMBER-001@ISHAQ.QA.TEST",
    })

    expect(
      resolveEmailRouting("admin@mubarak.qa.test", qaConfiguration)
    ).toEqual({
      deliveredRecipients: ["mubarak@example.com"],
      mode: "qa_domain",
      originalRecipient: "admin@mubarak.qa.test",
    })
  })

  test("blocks unmatched synthetic and real recipient domains", () => {
    expect(() =>
      resolveEmailRouting("member@unmapped.qa.test", qaConfiguration)
    ).toThrow(
      'QA email delivery blocked unmatched recipient domain "unmapped.qa.test".'
    )

    expect(() =>
      resolveEmailRouting("member@example.com", qaConfiguration)
    ).toThrow(
      'QA email delivery blocked unmatched recipient domain "example.com".'
    )
  })

  test("preserves live recipients and supports the legacy global override", () => {
    expect(
      resolveEmailRouting("member@example.com", {
        deliveryMode: "live",
        qaDomainRoutes: new Map(),
      })
    ).toEqual({
      deliveredRecipients: ["member@example.com"],
      mode: "live",
      originalRecipient: "member@example.com",
    })

    expect(
      resolveEmailRouting("member@example.com", {
        deliveryMode: "live",
        qaDomainRoutes: new Map(),
        testRecipient: "tester@example.com",
      })
    ).toEqual({
      deliveredRecipients: ["tester@example.com"],
      mode: "global_test_override",
      originalRecipient: "member@example.com",
    })
  })
})
