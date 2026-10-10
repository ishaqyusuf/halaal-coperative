import type { MobileReadCacheState } from "@/lib/read-cache"
import type { MobileMetricFormat } from "@/lib/mobile-display-types"

export type MobileMemberMoreRow = {
  detail: string
  format: MobileMetricFormat | null
  key: string
  label: string
  status: string | null
  value: number | null
}

export type MobileMemberMoreSection = {
  icon: string
  key:
    | "profile"
    | "statement"
    | "receipts"
    | "procurement"
    | "projectFinancing"
    | "foodPurchase"
    | "guarantors"
    | "support"
  rows: MobileMemberMoreRow[]
  title: string
}

export type MobileMemberMore = {
  cache?: MobileReadCacheState
  generatedAt: string
  member: {
    id: string
    kycStatus: string
    memberNumber: string
    name: string
    status: string
  } | null
  sections: MobileMemberMoreSection[]
}
