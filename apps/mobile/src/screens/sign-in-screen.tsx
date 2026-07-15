import { StatusBadge } from "@/components/app/status-badge"
import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import { useRouter } from "expo-router"
import { useMemo, useState } from "react"
import { View } from "react-native"

export function SignInScreen() {
  const { signInAs, signInWithPassword } = useAuthContext()
  const colors = useColors()
  const router = useRouter()
  const [tenantSlug, setTenantSlug] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canShowDevShortcuts = process.env.NODE_ENV !== "production"
  const canSubmit = useMemo(
    () => Boolean(tenantSlug.trim() && email.trim() && password),
    [email, password, tenantSlug]
  )

  async function handleSubmit() {
    if (!canSubmit || isSubmitting) return

    setError(null)
    setIsSubmitting(true)

    try {
      await signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
        tenantSlug: tenantSlug.trim().toLowerCase(),
      })
      router.replace("/")
    } catch {
      setError("The cooperative code or account details were invalid.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDevShortcut(role: "member" | "admin") {
    await signInAs(role)
    router.replace("/")
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <View className="flex-1 justify-between px-6 pt-10 pb-8">
        <View className="gap-8">
          <View className="gap-4">
            <View className="h-16 w-16 items-center justify-center rounded-md bg-primary">
              <Text className="text-3xl font-black text-primary-foreground">
                H
              </Text>
            </View>
            <StatusBadge label="Secure cooperative workspace" tone="success" />
          </View>
          <View className="gap-3">
            <Text className="text-4xl leading-[44px] font-black text-foreground">
              Halaalvest
            </Text>
            <Text className="max-w-[320px] text-base leading-6 text-muted-foreground">
              Sign in to your cooperative workspace for commitments, shares,
              receipts, support, and safe staff operations.
            </Text>
          </View>
        </View>

        <View className="rounded-md border border-border bg-card p-4">
          <View className="flex-row items-center gap-3">
            <Icon name="ShieldCheck" className="size-md text-success" />
            <Text className="flex-1 text-sm leading-5 text-muted-foreground">
              Signed mobile sessions keep member and staff access scoped to the
              selected cooperative.
            </Text>
          </View>
        </View>
      </View>

      <FloatingBottomSheet
        accessibilityLabel="Sign in to mobile workspace"
        onClose={() => undefined}
        snapPoints={canShowDevShortcuts ? ["74%"] : ["62%"]}
        title="Sign in"
        visible
      >
        <View className="gap-4 px-5 pt-2 pb-6">
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">
              Cooperative code
            </Text>
            <Input
              accessibilityLabel="Cooperative code"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
              onChangeText={setTenantSlug}
              placeholder="e.g. amanah"
              returnKeyType="next"
              value={tenantSlug}
            />
          </View>
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">
              Email address
            </Text>
            <Input
              accessibilityLabel="Email address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!isSubmitting}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              returnKeyType="next"
              textContentType="emailAddress"
              value={email}
            />
          </View>
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">
              Password
            </Text>
            <Input
              accessibilityLabel="Password"
              autoCapitalize="none"
              editable={!isSubmitting}
              onChangeText={setPassword}
              onSubmitEditing={handleSubmit}
              placeholder="Enter password"
              returnKeyType="go"
              secureTextEntry
              textContentType="password"
              value={password}
            />
          </View>
          {error ? (
            <View className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
              <Text className="text-sm font-medium text-destructive">
                {error}
              </Text>
            </View>
          ) : null}
          <Button
            className="h-12"
            disabled={!canSubmit || isSubmitting}
            onPress={handleSubmit}
          >
            <Icon
              name="ShieldCheck"
              className="size-base text-primary-foreground"
            />
            <Text>{isSubmitting ? "Signing in" : "Sign in"}</Text>
          </Button>
          {canShowDevShortcuts ? (
            <View className="gap-3 pt-2">
              <View className="items-center">
                <StatusBadge label="Development shortcuts" tone="muted" />
              </View>
              <Button
                className="h-12"
                onPress={() => handleDevShortcut("member")}
                variant="outline"
              >
                <Icon name="User" className="size-base text-foreground" />
                <Text>Continue as Member</Text>
              </Button>
              <Button
                className="h-12"
                onPress={() => handleDevShortcut("admin")}
                variant="outline"
              >
                <Icon
                  name="ShieldCheck"
                  className="size-base text-foreground"
                />
                <Text>Continue as Admin</Text>
              </Button>
            </View>
          ) : null}
        </View>
      </FloatingBottomSheet>
    </SafeArea>
  )
}
