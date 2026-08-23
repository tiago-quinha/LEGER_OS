import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}))
    const { message, stack, digest, pathname, timestamp } = payload
    const userAgent = request.headers.get("user-agent") || "unknown"

    console.error("[CRASH_TELEMETRY_RECORDED]", {
      timestamp: timestamp || new Date().toISOString(),
      pathname: pathname || "unknown",
      message: message || "No error message",
      digest: digest || null,
      stack: stack ? String(stack).slice(0, 500) : null,
      userAgent: userAgent.slice(0, 150),
    })

    return NextResponse.json({ success: true, recorded: true })
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to record telemetry" }, { status: 500 })
  }
}
