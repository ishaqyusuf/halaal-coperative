import { describe, expect, test } from "bun:test"
import {
  notificationEmailPresentationByType,
  notificationEmailPresentationTypeList,
} from "./email-presentation"
import {
  halaalVestNotificationTypeList,
  halaalVestNotificationTypes,
} from "./registry"
import { extractDisplayAmount } from "./shared"

describe("notification email presentation registry", () => {
  test("covers every registered email notification type exactly once", () => {
    expect(notificationEmailPresentationTypeList.sort()).toEqual(
      [...halaalVestNotificationTypeList].sort()
    )
    expect(halaalVestNotificationTypeList).toHaveLength(40)

    for (const type of halaalVestNotificationTypeList) {
      expect(halaalVestNotificationTypes[type].defaultChannels).toContain(
        "email"
      )
      expect(notificationEmailPresentationByType[type].eyebrow.length).toBeGreaterThan(
        0
      )
    }
  })

  test("extracts only explicit Naira facts already present in notification copy", () => {
    expect(extractDisplayAmount("A contribution of ₦120,000 was recorded.")).toBe(
      "₦120,000"
    )
    expect(extractDisplayAmount("A payment of NGN 75,500.25 was posted.")).toBe(
      "NGN 75,500.25"
    )
    expect(extractDisplayAmount("A contribution was recorded.")).toBeNull()
  })
})
