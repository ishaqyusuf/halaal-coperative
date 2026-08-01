"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import {
  FileTextIcon,
  MoreHorizontalIcon,
  ReceiptTextIcon,
  ShoppingBasketIcon,
  ShoppingCartIcon,
  ShieldCheckIcon,
  StoreIcon,
  UsersIcon,
} from "lucide-react"
import { useState, type ComponentType } from "react"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"

type MemberPortalAction = {
  href: string
  icon: ComponentType<{ className?: string; "data-icon"?: string }>
  label: string
}

export function MemberPortalActions({
  canShowFoodPurchase,
  canShowProcurement,
}: {
  canShowFoodPurchase: boolean
  canShowProcurement: boolean
}) {
  const [open, setOpen] = useState(false)
  const actions: MemberPortalAction[] = [
    {
      href: "/payment-receipts",
      icon: ReceiptTextIcon,
      label: "Receipts",
    },
    ...(canShowFoodPurchase
      ? [
          {
            href: "/food-purchase",
            icon: ShoppingBasketIcon,
            label: "Foodstuff Purchase",
          },
        ]
      : []),
    {
      href: "/guarantor-approvals",
      icon: ShieldCheckIcon,
      label: "Guarantor approvals",
    },
    ...(canShowProcurement
      ? [
          {
            href: "/procurement",
            icon: ShoppingCartIcon,
            label: "Procurement",
          },
        ]
      : []),
    { href: "/support", icon: UsersIcon, label: "Support" },
    { href: "/shares", icon: StoreIcon, label: "Shares" },
  ]

  return (
    <>
      <div className="hidden flex-wrap gap-2 md:flex">
        <Link
          className={buttonVariants({ variant: "outline" })}
          href="/member-statement-export"
        >
          Statement
        </Link>
        {actions.map((action) => (
          <Link
            className={buttonVariants({ variant: "outline" })}
            href={action.href}
            key={action.href}
          >
            {action.label}
          </Link>
        ))}
      </div>

      <div className="flex w-full gap-2 md:hidden">
        <Link
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-11 min-w-0 flex-1"
          )}
          href="/member-statement-export"
        >
          <FileTextIcon data-icon="inline-start" />
          Statement
        </Link>
        <Button
          aria-label="More member dashboard actions"
          className="h-11 flex-1"
          onClick={() => setOpen(true)}
          type="button"
          variant="outline"
        >
          <MoreHorizontalIcon data-icon="inline-start" />
          More
        </Button>
      </div>

      <MobileActionsDrawer
        description="Open a member self-service workspace."
        onOpenChange={setOpen}
        open={open}
        title="Member dashboard actions"
      >
        <div className="space-y-2">
          {actions.map((action) => {
            const Icon = action.icon

            return (
              <Link
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-11 w-full justify-start"
                )}
                href={action.href}
                key={action.href}
                onClick={() => setOpen(false)}
              >
                <Icon data-icon="inline-start" />
                {action.label}
              </Link>
            )
          })}
        </div>
      </MobileActionsDrawer>
    </>
  )
}
