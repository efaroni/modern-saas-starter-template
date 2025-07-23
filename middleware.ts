import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle OAuth callback routes
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Allow access to auth pages
  if (request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.next();
  }

  // Allow access to all sections (configuration, generators, etc.)
  if (
    request.nextUrl.pathname.startsWith('/configuration') ||
    request.nextUrl.pathname.startsWith('/generators') ||
    request.nextUrl.pathname.startsWith('/performance') ||
    request.nextUrl.pathname.startsWith('/rate-limiting') ||
    request.nextUrl.pathname.startsWith('/debug') ||
    request.nextUrl.pathname.startsWith('/test') ||
    request.nextUrl.pathname.startsWith('/service-test') ||
    request.nextUrl.pathname.startsWith('/config-test') ||
    request.nextUrl.pathname.startsWith('/minimal-config') ||
    request.nextUrl.pathname.startsWith('/debug-error')
  ) {
    return NextResponse.next();
  }

  // Allow access to public pages
  if (
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/public/')
  ) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
