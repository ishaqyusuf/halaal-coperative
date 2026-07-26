"use client"

import { useMemo, useState } from "react"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@halaalvest/ui/components/command"
import { Input } from "@halaalvest/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@halaalvest/ui/components/popover"
import { cn } from "@halaalvest/ui/lib/utils"
import { ChevronsUpDownIcon } from "lucide-react"

const devLoginPassword = "password123"

export type DevLoginAccount = {
  email: string
  fullName: string
  isPlatformOwner: boolean
  roleLabel: string
  tenantName: string
  userId: string
}

function DevEmailCombobox({
  accounts,
  onSelect,
  value,
}: {
  accounts: DevLoginAccount[]
  onSelect: (account: DevLoginAccount) => void
  value: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const selectedAccount =
    accounts.find((account) => account.userId === value) ?? null
  const normalizedQuery = query.trim().toLowerCase()
  const filteredAccounts = useMemo(() => {
    if (!normalizedQuery) {
      return accounts.slice(0, 30)
    }

    return accounts
      .filter((account) =>
        [account.fullName, account.email, account.roleLabel, account.tenantName]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      )
      .slice(0, 30)
  }, [accounts, normalizedQuery])

  function selectAccount(account: DevLoginAccount) {
    onSelect(account)
    setQuery("")
    setOpen(false)
  }

  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-foreground" htmlFor="email">
        Email
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              aria-expanded={open}
              id="email"
              className={cn(
                "h-10 w-full justify-between text-left font-normal",
                !selectedAccount && "text-muted-foreground"
              )}
              type="button"
              variant="outline"
            />
          }
        >
          <span className="min-w-0 truncate">
            {selectedAccount?.email ?? "Search email"}
          </span>
          <ChevronsUpDownIcon className="size-3.5 opacity-50" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-96 max-w-[calc(100vw-2rem)] p-1"
          sideOffset={6}
        >
          <Command shouldFilter={false}>
            <CommandInput
              onValueChange={setQuery}
              placeholder="Search email"
              value={query}
            />
            <CommandList>
              {filteredAccounts.length > 0 ? (
                <CommandGroup>
                  {filteredAccounts.map((account) => (
                    <CommandItem
                      key={account.userId}
                      onSelect={() => selectAccount(account)}
                      value={account.userId}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {account.fullName} - {account.roleLabel}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {account.email}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {account.tenantName}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant="outline">{account.roleLabel}</Badge>
                        {account.isPlatformOwner ? (
                          <Badge variant="secondary">Platform owner</Badge>
                        ) : null}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : (
                <CommandEmpty>No accounts found.</CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function LoginForm({
  action,
  devAccounts,
  isDevelopment,
  memberSignupHref,
  nextPath,
  resetPasswordHref,
  showMemberSignupCta,
}: {
  action: string
  devAccounts: DevLoginAccount[]
  isDevelopment: boolean
  memberSignupHref: string
  nextPath: string
  resetPasswordHref: string
  showMemberSignupCta: boolean
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")
  const showDevPicker = isDevelopment && devAccounts.length > 0

  function selectDevAccount(account: DevLoginAccount) {
    setEmail(account.email)
    setPassword(devLoginPassword)
    setSelectedUserId(account.userId)
  }

  return (
    <form
      action={action}
      className="mt-6 space-y-4"
      data-quick-fill-exempt="true"
      method="post"
    >
      {showDevPicker ? (
        <div className="flex justify-end">
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => {
              const account = devAccounts[0]
              if (account) selectDevAccount(account)
            }}
          >
            Quick fill
          </Button>
        </div>
      ) : null}
      <input type="hidden" name="next" value={nextPath} />
      {showDevPicker ? (
        <input type="hidden" name="email" value={email} />
      ) : null}
      {showDevPicker && selectedUserId ? (
        <input type="hidden" name="userId" value={selectedUserId} />
      ) : null}

      {showDevPicker ? (
        <DevEmailCombobox
          accounts={devAccounts}
          onSelect={selectDevAccount}
          value={selectedUserId}
        />
      ) : (
        <label
          className="grid gap-1.5 text-sm font-medium text-foreground"
          htmlFor="email"
        >
          Email
          <Input
            id="email"
            type="email"
            name="email"
            placeholder="name@cooperative.com"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setSelectedUserId("")
            }}
            className="h-10 bg-background text-sm md:text-sm"
          />
        </label>
      )}

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="password"
          >
            Password
          </label>
          <a
            className="text-xs font-medium text-[#1f7a3d] underline-offset-4 hover:underline dark:text-[#71d98b]"
            href={resetPasswordHref}
          >
            Reset password
          </a>
        </div>
        <Input
          id="password"
          type="password"
          name="password"
          placeholder="Enter your password"
          required
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
          }}
          className="h-10 bg-background text-sm md:text-sm"
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="h-10 w-full bg-[#1f7a3d] text-white hover:bg-[#176332] dark:bg-[#3fbf70] dark:text-[#071b2c] dark:hover:bg-[#71d98b]"
      >
        Sign in
      </Button>

      {showMemberSignupCta ? (
        <a
          className={cn(
            buttonVariants({ size: "lg", variant: "outline" }),
            "h-10 w-full border-[#1f7a3d]/35 text-[#1f7a3d] hover:bg-[#1f7a3d]/10 dark:border-[#71d98b]/45 dark:text-[#71d98b]"
          )}
          href={memberSignupHref}
        >
          Start member signup
        </a>
      ) : null}
    </form>
  )
}
