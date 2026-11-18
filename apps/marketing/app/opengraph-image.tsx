import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"
import { SocialPreviewImage } from "@/components/marketing/social-preview-image"
import { marketingSocialImage } from "@/lib/social-metadata"

export const alt = marketingSocialImage.alt
export const contentType = "image/png"
export const size = {
  height: marketingSocialImage.height,
  width: marketingSocialImage.width,
}

const fontDir = join(process.cwd(), "src/assets/fonts")

export default async function Image() {
  const [medium, bold] = await Promise.all([
    readFile(join(fontDir, "inter-medium.ttf")),
    readFile(join(fontDir, "inter-bold.ttf")),
  ])

  return new ImageResponse(<SocialPreviewImage />, {
    ...size,
    fonts: [
      { data: medium, name: "Inter", style: "normal", weight: 500 },
      { data: bold, name: "Inter", style: "normal", weight: 700 },
    ],
  })
}
