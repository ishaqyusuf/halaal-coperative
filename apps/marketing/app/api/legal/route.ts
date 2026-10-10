import { NextResponse } from "next/server"
import { getPublishedLegalBundle } from "@halaalvest/db"
export const dynamic = "force-dynamic"
export function GET() {return NextResponse.json(getPublishedLegalBundle(),{headers:{"Cache-Control":"no-store"}})}
