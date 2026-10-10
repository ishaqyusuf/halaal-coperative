import { describe, expect, test } from "bun:test"
import type { ProductSubscription } from "expo-iap"
import { resolveMobileAppOffers } from "./mobile-app-offers"

const mappings = [
  { store: "apple", productId: "app.six", duration: "six_months" },
  { store: "apple", productId: "app.year", duration: "annual" },
  {
    store: "google",
    productId: "app.access",
    basePlanId: "six-month",
    duration: "six_months",
  },
  {
    store: "google",
    productId: "app.access",
    basePlanId: "annual",
    duration: "annual",
  },
] as const

function product(value: object) {
  return value as ProductSubscription
}

describe("personal native subscription offers", () => {
  test("accepts exact six-month and annual Apple periods and displays store prices", () => {
    const offers = resolveMobileAppOffers(
      [...mappings],
      [
        product({
          id: "app.six",
          type: "subs",
          platform: "ios",
          displayPrice: "₦500.00",
          subscriptionPeriodUnitIOS: "month",
          subscriptionPeriodNumberIOS: "6",
        }),
        product({
          id: "app.year",
          type: "subs",
          platform: "ios",
          displayPrice: "₦1,000.00",
          subscriptionPeriodUnitIOS: "year",
          subscriptionPeriodNumberIOS: "1",
        }),
      ],
      "apple"
    )
    expect(offers.map((offer) => offer.displayPrice)).toEqual([
      "₦500.00 / 6 months",
      "₦1,000.00 / year",
    ])
    expect(
      resolveMobileAppOffers(
        [...mappings],
        [
          product({
            id: "app.six",
            type: "subs",
            platform: "ios",
            displayPrice: "₦500.00",
            subscriptionPeriodUnitIOS: "month",
            subscriptionPeriodNumberIOS: "1",
          }),
        ],
        "apple"
      )
    ).toHaveLength(0)
  })

  test("selects both exact Play base plans from one product, without trial or monthly phases", () => {
    const offer = (id: string, period: string, token: string) => ({
      basePlanIdAndroid: id,
      offerTokenAndroid: token,
      pricingPhasesAndroid: {
        pricingPhaseList: [
          {
            billingPeriod: period,
            recurrenceMode: 1,
            formattedPrice: token === "six" ? "₦500.00" : "₦1,000.00",
          },
        ],
      },
    })
    const products = [
      product({
        id: "app.access",
        type: "subs",
        platform: "android",
        subscriptionOffers: [
          offer("six-month", "P6M", "six"),
          offer("annual", "P1Y", "year"),
          offer("annual", "P1M", "wrong"),
        ],
      }),
    ]
    const resolved = resolveMobileAppOffers([...mappings], products, "google")
    expect(resolved.map((item) => item.offerToken)).toEqual(["six", "year"])
    expect(resolved.map((item) => item.mapping.duration)).toEqual([
      "six_months",
      "annual",
    ])
  })

  test("withholds a configured pair when one provider period is missing", () => {
    expect(
      resolveMobileAppOffers(
        [...mappings],
        [
          product({
            id: "app.six",
            type: "subs",
            platform: "ios",
            displayPrice: "₦500.00",
            subscriptionPeriodUnitIOS: "month",
            subscriptionPeriodNumberIOS: "6",
          }),
        ],
        "apple"
      )
    ).toEqual([])

    expect(
      resolveMobileAppOffers(
        [...mappings],
        [
          product({
            id: "app.access",
            type: "subs",
            platform: "android",
            subscriptionOffers: [
              {
                basePlanIdAndroid: "six-month",
                offerTokenAndroid: "six",
                pricingPhasesAndroid: {
                  pricingPhaseList: [
                    {
                      billingPeriod: "P6M",
                      recurrenceMode: 1,
                      formattedPrice: "₦500.00",
                    },
                  ],
                },
              },
            ],
          }),
        ],
        "google"
      )
    ).toEqual([])
  })

  test("does not offer a configured period without its localized store price", () => {
    const appleProducts = [
      product({
        id: "app.six",
        type: "subs",
        platform: "ios",
        displayPrice: "₦500.00",
        subscriptionPeriodUnitIOS: "month",
        subscriptionPeriodNumberIOS: "6",
      }),
      product({
        id: "app.year",
        type: "subs",
        platform: "ios",
        displayPrice: " ",
        subscriptionPeriodUnitIOS: "year",
        subscriptionPeriodNumberIOS: "1",
      }),
    ]
    expect(
      resolveMobileAppOffers([...mappings], appleProducts, "apple")
    ).toEqual([])

    const playProduct = product({
      id: "app.access",
      type: "subs",
      platform: "android",
      subscriptionOffers: [
        {
          basePlanIdAndroid: "six-month",
          offerTokenAndroid: "six",
          pricingPhasesAndroid: {
            pricingPhaseList: [
              {
                billingPeriod: "P6M",
                recurrenceMode: 1,
                formattedPrice: "₦500.00",
              },
            ],
          },
        },
        {
          basePlanIdAndroid: "annual",
          offerTokenAndroid: "annual",
          pricingPhasesAndroid: {
            pricingPhaseList: [
              {
                billingPeriod: "P1Y",
                recurrenceMode: 1,
                formattedPrice: "",
              },
            ],
          },
        },
      ],
    })
    expect(
      resolveMobileAppOffers([...mappings], [playProduct], "google")
    ).toEqual([])
  })
})
