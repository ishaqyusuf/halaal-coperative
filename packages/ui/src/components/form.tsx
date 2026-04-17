"use client"

import * as React from "react"
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"
import { cn } from "@halaal-vest/ui/lib/utils"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue)

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  )
}

function useFormField() {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext?.name) {
    throw new Error("useFormField must be used within <FormField>.")
  }

  const id = itemContext.id

  return {
    id,
    name: fieldContext.name,
    formDescriptionId: `${id}-form-description`,
    formItemId: `${id}-form-item`,
    formMessageId: `${id}-form-message`,
    ...fieldState,
  }
}

function FormLabel({ className, ...props }: React.ComponentProps<"label">) {
  const { error, formItemId } = useFormField()

  return (
    <label
      className={cn("text-sm font-medium text-foreground", error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
}

function FormControl({ className, ...props }: React.ComponentProps<"div">) {
  const { error, formDescriptionId, formItemId, formMessageId } = useFormField()
  const child = React.Children.only(props.children) as React.ReactElement<{
    className?: string
    id?: string
    "aria-describedby"?: string
    "aria-invalid"?: boolean
  }>

  if (!React.isValidElement(child)) {
    throw new Error("FormControl expects a single valid React element child.")
  }

  const describedBy = error
    ? `${formDescriptionId} ${formMessageId}`
    : formDescriptionId

  return (
    React.cloneElement(child, {
      ...child.props,
      className: cn(className, child.props.className),
      id: formItemId,
      "aria-describedby": describedBy,
      "aria-invalid": Boolean(error),
    })
  )
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField()

  return (
    <p
      className={cn("text-sm leading-6 text-muted-foreground", className)}
      id={formDescriptionId}
      {...props}
    />
  )
}

function FormMessage({ className, children, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error.message ?? "") : children

  if (!body) {
    return null
  }

  return (
    <p
      className={cn("text-sm font-medium text-destructive", className)}
      id={formMessageId}
      {...props}
    >
      {body}
    </p>
  )
}

export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
}
