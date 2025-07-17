import { auth } from '@/lib/auth/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default auth((req: NextRequest) => {
  // Handle OAuth callback routes
  if (req.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // Allow access to development auth pages
  if (req.nextUrl.pathname.startsWith('/dev/auth')) {
    return NextResponse.next()
  }

  // Allow access to other dev pages
  if (req.nextUrl.pathname.startsWith('/dev/')) {
    return NextResponse.next()
  }

  // Allow access to public pages
  if (req.nextUrl.pathname === '/' || req.nextUrl.pathname.startsWith('/public/')) {
    return NextResponse.next()
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}