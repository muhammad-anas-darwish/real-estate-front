import createMiddleware from "next-intl/middleware"
import { NextResponse, type NextRequest } from "next/server"
import { locales, defaultLocale } from "./i18n/config"

const intlMiddleware = createMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: "always",
  localeDetection: true,
})

const PUBLIC_PATH_EXACT = new Set<string>([
  "/",
  "/properties",
  "/compare",
  "/saved-searches",
])

const AUTH_PATH_EXACT = new Set<string>([
  "/login",
  "/login/two-factor",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
])

const PROPERTY_PROTECTED_SUBPATHS = new Set<string>(["/properties/create"])

function stripLocale(pathname: string): string {
  for (const locale of locales) {
    if (pathname === `/${locale}`) return "/"
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(`/${locale}`.length)
    }
  }
  return pathname
}

function isPropertyProtected(stripped: string): boolean {
  if (PROPERTY_PROTECTED_SUBPATHS.has(stripped)) return true
  if (/^\/properties\/[^/]+\/edit\/?$/.test(stripped)) return true
  return false
}

export function isPublicRoute(pathname: string): boolean {
  const stripped = stripLocale(pathname)
  if (AUTH_PATH_EXACT.has(stripped)) return true
  if (PUBLIC_PATH_EXACT.has(stripped)) return true
  if (stripped.startsWith("/properties/")) {
    return !isPropertyProtected(stripped)
  }
  return false
}

function buildLoginRedirect(request: NextRequest): URL {
  const { pathname, search } = request.nextUrl
  const localeMatch = pathname.match(/^\/(en|ar)/)
  const localePrefix = localeMatch ? localeMatch[0] : `/${defaultLocale}`
  const callbackPath = localeMatch ? pathname : `${localePrefix}${pathname}`
  const callbackUrl = encodeURIComponent(callbackPath + search)
  return new URL(`${localePrefix}/login?callbackUrl=${callbackUrl}`, request.url)
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isPublicRoute(pathname)) {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.redirect(buildLoginRedirect(request))
    }
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
}