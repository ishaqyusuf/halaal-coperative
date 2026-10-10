import { describe, expect, test } from "bun:test"
import { isSafeSupportAttachmentUrl } from "./support-attachment-url"

describe("support attachment links", () => {
  test("allows HTTPS evidence and exact private upload paths", () => {
    expect(isSafeSupportAttachmentUrl("https://example.com/evidence.pdf")).toBe(
      true
    )
    expect(
      isSafeSupportAttachmentUrl(
        "/api/uploads/11111111-1111-4111-8111-111111111111"
      )
    ).toBe(true)
  })

  test("rejects active, local, insecure, and deceptive URLs", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "http://example.com/evidence.pdf",
      "https://localhost/evidence.pdf",
      "https://127.0.0.1/evidence.pdf",
      "https://127.1/evidence.pdf",
      "https://[::1]/evidence.pdf",
      "https://10.0.0.1/evidence.pdf",
      "https://records.internal/evidence.pdf",
      "https://user:pass@example.com/evidence.pdf",
      "https://example.com\\@attacker.example/evidence.pdf",
      "//example.com/evidence.pdf",
      "/api/uploads/11111111-1111-4111-8111-111111111111/extra",
      " https://example.com/evidence.pdf",
      "https://example.com/evidence.pdf\n",
    ]) {
      expect(isSafeSupportAttachmentUrl(url)).toBe(false)
    }
  })
})
