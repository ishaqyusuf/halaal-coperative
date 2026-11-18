import { FormField } from "@/components/ui/form-field"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { AuthErrorBanner } from "@/features/auth/components/auth-error-banner"
import { OtpField } from "@/features/auth/components/otp-field"
import { PasswordField } from "@/features/auth/components/password-field"
import { type AuthErrorPresentation } from "@/features/auth/model/auth-errors"
import {
  formatResendCountdown,
  getPasswordRules,
} from "@/features/auth/model/recovery-flow"
import { cn } from "@/lib/utils"
import { ActivityIndicator, View } from "react-native"
import { KeyboardController } from "react-native-keyboard-controller"
import { useColors } from "@/hooks/use-color"

/** Step 1: cooperative number and the account email. */
export function RecoveryRequestStep({
  cooperativeNumber,
  cooperativeNumberError,
  disabled,
  email,
  emailError,
  error,
  onCooperativeNumberChange,
  onEmailChange,
  onRequest,
}: {
  cooperativeNumber: string
  cooperativeNumberError: string | null
  disabled: boolean
  email: string
  emailError: string | null
  error: AuthErrorPresentation | null
  onCooperativeNumberChange: (value: string) => void
  onEmailChange: (value: string) => void
  onRequest: () => void
}) {
  return (
    <>
      <Text className="text-foreground-soft" variant="body">
        Enter your cooperative number and the email on your account.
        We&apos;ll send a 6-digit code.
      </Text>
      <AuthErrorBanner error={error} onRetry={onRequest} retrying={disabled} />
      <FormField error={cooperativeNumberError} label="Cooperative number">
        <Input
          autoCapitalize="characters"
          autoComplete="username"
          autoCorrect={false}
          editable={!disabled}
          onChangeText={onCooperativeNumberChange}
          onSubmitEditing={() => KeyboardController.setFocusTo("next")}
          placeholder="ABC-0123"
          returnKeyType="next"
          submitBehavior="submit"
          testID="recovery-cooperative-number"
          textContentType="username"
          value={cooperativeNumber}
        />
      </FormField>
      <FormField error={emailError} label="Email address">
        <Input
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          editable={!disabled}
          keyboardType="email-address"
          onChangeText={onEmailChange}
          onSubmitEditing={onRequest}
          placeholder="name@example.com"
          returnKeyType="go"
          submitBehavior="blurAndSubmit"
          testID="recovery-email"
          textContentType="emailAddress"
          value={email}
        />
      </FormField>
    </>
  )
}

/** Step 2: the 6-digit code, the resend timer and "Use a different email". */
export function RecoveryCodeStep({
  code,
  codeError,
  destination,
  disabled,
  onCodeChange,
  onContinue,
  onDifferentEmail,
  onResend,
  resendRemaining,
  resending,
}: {
  code: string
  codeError: string | null
  destination: string
  disabled: boolean
  onCodeChange: (value: string) => void
  onContinue: () => void
  onDifferentEmail: () => void
  onResend: () => void
  resendRemaining: number
  resending: boolean
}) {
  const colors = useColors()
  return (
    <>
      <Text className="text-foreground-soft" variant="body">
        If an account matches, we sent a 6-digit code to{" "}
        <Text className="font-bold text-foreground" variant="body">
          {destination}
        </Text>
        .
      </Text>
      <OtpField
        autoFocus
        editable={!disabled}
        error={codeError}
        label="Six-digit code"
        onChangeText={onCodeChange}
        onSubmitEditing={onContinue}
        value={code}
      />
      <View className="flex-row flex-wrap items-center justify-between gap-[8px]">
        {resending ? (
          <View className="min-h-[44px] flex-row items-center gap-[8px]">
            <ActivityIndicator color={colors.primary} size="small" />
            <Text className="text-muted-foreground" variant="small">
              Sending another code
            </Text>
          </View>
        ) : resendRemaining > 0 ? (
          <View className="min-h-[44px] justify-center">
            <Text className="text-muted-foreground" tabular variant="small">
              Resend code in {formatResendCountdown(resendRemaining)}
            </Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            className="min-h-[44px] justify-center"
            disabled={disabled}
            onPress={onResend}
            testID="recovery-resend"
          >
            <Text className="text-primary" variant="label">
              Resend code
            </Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          className="min-h-[44px] justify-center"
          disabled={disabled || resending}
          onPress={onDifferentEmail}
        >
          <Text className="text-primary" variant="label">
            Use a different email
          </Text>
        </Pressable>
      </View>
    </>
  )
}

function PasswordRules({ password }: { password: string }) {
  return (
    <View accessibilityRole="summary" className="gap-[4px]">
      {getPasswordRules(password).map((rule) => (
        <View
          accessibilityLabel={`${rule.label}${rule.met ? ", done" : ""}`}
          className="flex-row items-center gap-[8px]"
          key={rule.key}
        >
          <View
            className={cn(
              "size-[18px] items-center justify-center rounded-full border-[1.5px]",
              rule.met ? "border-success bg-success" : "border-muted-foreground/70"
            )}
          >
            {rule.met ? (
              <Icon className="size-[11px] text-success-foreground" name="Check" strokeWidth={3.2} />
            ) : null}
          </View>
          <Text
            className={rule.met ? "text-success" : "text-muted-foreground"}
            variant="small"
          >
            {rule.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

/** Step 3: new password with live rules, typed again. */
export function RecoveryPasswordStep({
  confirmPassword,
  disabled,
  error,
  mismatch,
  onConfirmBlur,
  onConfirmPasswordChange,
  onPasswordChange,
  onReset,
  password,
}: {
  confirmPassword: string
  disabled: boolean
  error: AuthErrorPresentation | null
  mismatch: boolean
  onConfirmBlur: () => void
  onConfirmPasswordChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onReset: () => void
  password: string
}) {
  return (
    <>
      <AuthErrorBanner error={error} onRetry={onReset} retrying={disabled} />
      <FormField label="New password">
        <PasswordField
          autoComplete="new-password"
          editable={!disabled}
          label="new password"
          onChangeText={onPasswordChange}
          onSubmitEditing={() => KeyboardController.setFocusTo("next")}
          placeholder="Create a password"
          returnKeyType="next"
          submitBehavior="submit"
          testID="recovery-new-password"
          textContentType="newPassword"
          value={password}
        />
        <PasswordRules password={password} />
      </FormField>
      <FormField
        error={mismatch ? "Passwords do not match" : null}
        label="Type it again"
      >
        <PasswordField
          autoComplete="new-password"
          editable={!disabled}
          label="repeated password"
          onBlur={onConfirmBlur}
          onChangeText={onConfirmPasswordChange}
          onSubmitEditing={onReset}
          placeholder="Repeat the password"
          returnKeyType="go"
          submitBehavior="blurAndSubmit"
          testID="recovery-confirm-password"
          textContentType="newPassword"
          value={confirmPassword}
        />
      </FormField>
    </>
  )
}
