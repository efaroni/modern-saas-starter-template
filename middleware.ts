import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Handle OAuth callback routes
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // Allow access to development auth pages
  if (request.nextUrl.pathname.startsWith('/dev/auth')) {
    return NextResponse.next()
  }

  // Allow access to other dev pages
  if (request.nextUrl.pathname.startsWith('/dev/')) {
    return NextResponse.next()
  }

  // Allow access to public pages
  if (request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/public/')) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}