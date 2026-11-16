import { FormField } from "@/components/ui/form-field"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { AuthErrorBanner } from "@/features/auth/components/auth-error-banner"
import { PasswordField } from "@/features/auth/components/password-field"
import { type AuthErrorPresentation } from "@/features/auth/model/auth-errors"
import { type SignInFieldErrors } from "@/features/auth/model/recovery-flow"
import { View } from "react-native"
import { KeyboardController } from "react-native-keyboard-controller"

/** Sign-in fields on the canvas; the Sign in button lives in the dock. */
export function SignInForm({
  confirmed,
  cooperativeNumber,
  disabled,
  error,
  fieldErrors,
  onCooperativeNumberChange,
  onForgotPassword,
  onPasswordChange,
  onRetry,
  onSubmit,
  password,
}: {
  confirmed: boolean
  cooperativeNumber: string
  disabled: boolean
  error: AuthErrorPresentation | null
  fieldErrors: SignInFieldErrors
  onCooperativeNumberChange: (value: string) => void
  onForgotPassword: () => void
  onPasswordChange: (value: string) => void
  onRetry: () => void
  onSubmit: () => void
  password: string
}) {
  return (
    <View className="gap-[16px]">
      <Text accessibilityRole="header" className="text-foreground" variant="screenTitle">
        Sign in
      </Text>
      <AuthErrorBanner error={error} onRetry={onRetry} retrying={disabled} />
      <FormField error={fieldErrors.cooperativeNumber} label="Cooperative number">
        <Input
          accessibilityLabel="Cooperative number"
          autoCapitalize="characters"
          autoComplete="username"
          autoCorrect={false}
          editable={!disabled}
          onChangeText={onCooperativeNumberChange}
          onSubmitEditing={() => KeyboardController.setFocusTo("next")}
          placeholder="ABC-0123"
          returnKeyType="next"
          submitBehavior="submit"
          testID="sign-in-cooperative-number"
          textContentType="username"
          trailing={
            confirmed ? (
              <View
                accessibilityLabel="Confirmed"
                className="size-[24px] items-center justify-center rounded-full bg-primary"
              >
                <Icon className="size-xs text-primary-foreground" name="Check" />
              </View>
            ) : undefined
          }
          value={cooperativeNumber}
        />
      </FormField>
      <FormField error={fieldErrors.password} label="Password">
        <PasswordField
          autoComplete="current-password"
          editable={!disabled}
          label="password"
          onChangeText={onPasswordChange}
          onSubmitEditing={onSubmit}
          placeholder="Enter password"
          returnKeyType="go"
          submitBehavior="blurAndSubmit"
          testID="sign-in-password"
          textContentType="password"
          value={password}
        />
      </FormField>
      <Pressable
        accessibilityRole="button"
        className="min-h-[44px] justify-center self-start"
        disabled={disabled}
        onPress={onForgotPassword}
        testID="sign-in-forgot-password"
      >
        <Text className="text-primary" variant="label">
          Forgot password?
        </Text>
      </Pressable>
    </View>
  )
}
