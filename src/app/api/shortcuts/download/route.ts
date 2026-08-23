import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId") || ""
  const origin = request.headers.get("origin") || request.headers.get("host") || "https://leger-os.vercel.app"
  const baseUrl = origin.startsWith("http") ? origin : `https://${origin}`
  const targetWebhook = `${baseUrl}/api/transactions/device-push?userId=${userId}`

  // Apple Shortcut definition JSON metadata
  const shortcutMetadata = {
    name: "LEGER_OS Sync",
    version: "2.0",
    description: "Automated Apple Pay transaction ingest for LEGER_OS",
    targetWebhook,
    instructions: [
      "1. In Apple Shortcuts, tap 'Automation' > '+'",
      "2. Select 'Transaction' > Card: Any > Run Immediately",
      "3. Set Action: 'Get Contents of URL' > POST to your LEGER_OS webhook",
    ],
  }

  // Return formatted JSON or trigger shortcut scheme
  return NextResponse.json(shortcutMetadata, {
    headers: {
      "Content-Disposition": 'inline; filename="LEGER_OS_Sync.json"',
    },
  })
}
