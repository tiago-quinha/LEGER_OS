import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"

// In-memory sliding window rate limiter
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Periodic cleanup of expired rate limit entries every 2 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key)
      }
    }
  }, 2 * 60 * 1000)
}

function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetInSec: Math.ceil(windowMs / 1000) }
  }

  if (entry.count >= limit) {
    const resetInSec = Math.max(1, Math.ceil((entry.resetTime - now) / 1000))
    return { allowed: false, remaining: 0, resetInSec }
  }

  entry.count += 1
  const resetInSec = Math.max(1, Math.ceil((entry.resetTime - now) / 1000))
  return { allowed: true, remaining: limit - entry.count, resetInSec }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 1. Skip static assets, images, and internal Next.js requests
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg"
  ) {
    return NextResponse.next()
  }

  // Extract client IP identifier
  const forwardedFor = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp || "127.0.0.1"

  // 2. Auth Route Protection (Brute Force / Credential Stuffing Shield)
  if (pathname === "/login" || pathname === "/signup") {
    // Only rate-limit POST actions (login/signup submissions)
    if (request.method === "POST") {
      const { allowed, resetInSec } = checkRateLimit(`auth:${ip}`, 15, 60 * 1000) // 15 req/min
      if (!allowed) {
        return new NextResponse(
          JSON.stringify({
            error: "Too many authentication attempts. Please cooldown and try again shortly.",
            code: "RATE_LIMITED",
            retryAfter: resetInSec,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(resetInSec),
              "X-RateLimit-Limit": "15",
              "X-RateLimit-Remaining": "0",
            },
          }
        )
      }
    }
  }

  // 3. Webhook & Device Ingestion Throttling
  if (pathname.startsWith("/api/transactions/device-push") || pathname.startsWith("/api/transactions/mobile-sync")) {
    const authHeader = request.headers.get("authorization") || request.nextUrl.searchParams.get("userId") || ip
    const key = `webhook:${authHeader}`
    const { allowed, resetInSec } = checkRateLimit(key, 60, 60 * 1000) // 60 req/min

    if (!allowed) {
      return new NextResponse(
        JSON.stringify({
          error: "Webhook transaction ingestion rate limit exceeded. Please throttle device sync frequency.",
          code: "RATE_LIMITED",
          retryAfter: resetInSec,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(resetInSec),
            "X-RateLimit-Limit": "60",
            "X-RateLimit-Remaining": "0",
          },
        }
      )
    }
  }

  // 4. General Public API Rate Limiting
  if (pathname.startsWith("/api/")) {
    const { allowed, resetInSec } = checkRateLimit(`api:${ip}`, 120, 60 * 1000) // 120 req/min
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({
          error: "API rate limit exceeded. Please wait a moment before sending more requests.",
          code: "RATE_LIMITED",
          retryAfter: resetInSec,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(resetInSec),
            "X-RateLimit-Limit": "120",
            "X-RateLimit-Remaining": "0",
          },
        }
      )
    }
  }

  // 5. Supabase SSR Session Refresh & Cookie Propagation
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: "", ...options })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({ name, value: "", ...options })
          },
        },
      }
    )

    // Calling getUser refreshes the session token if needed and updates response cookies
    await supabase.auth.getUser()
  } catch (err) {
    // Non-blocking fallback if auth service unreachable
  }

  // Add standard security headers
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  return response
}

export default proxy

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
}
