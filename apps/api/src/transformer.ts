import { Decimal } from "@prisma/client-runtime-utils"
import SuperJSON, {
  type SuperJSONResult,
  type SuperJSONValue,
} from "superjson"

const serializer = new SuperJSON()

serializer.registerCustom<Decimal, string>(
  {
    deserialize: (value) => new Decimal(value),
    isApplicable: (value): value is Decimal => Decimal.isDecimal(value),
    serialize: (value) => value.toString(),
  },
  "halaalvest.prisma-decimal"
)

export const halaalvestDataTransformer = {
  deserialize<T>(value: unknown) {
    return serializer.deserialize<T>(value as SuperJSONResult)
  },
  serialize(value: unknown) {
    return serializer.serialize(value as SuperJSONValue)
  },
}
