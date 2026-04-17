"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { type FieldValues, type Resolver, type UseFormProps, useForm } from "react-hook-form"

type ResolverSchema = Parameters<typeof zodResolver>[0]

export const useZodForm = <TFieldValues extends FieldValues>(
  schema: ResolverSchema | object,
  options?: Omit<UseFormProps<TFieldValues>, "resolver">,
) => {
  return useForm<TFieldValues>({
    resolver: zodResolver(schema as ResolverSchema) as Resolver<TFieldValues>,
    shouldFocusError: true,
    ...options,
  })
}
