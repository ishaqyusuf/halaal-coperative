import { describe, expect, it } from "bun:test"
import { parseMarketingJson } from "./parse-json.server"

describe("marketing JSON parsing", () => {
  it("classifies malformed JSON as expected validation", async () => {
    const request = new Request("https://halaalvest.test/api/signup", {
      body: "{not-json",
      method: "POST",
    })

    await expect(parseMarketingJson(request)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      reportable: false,
    })
  })
})
