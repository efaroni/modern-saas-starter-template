import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@/lib/auth/auth';

// List of public routes that don't require authentication
const publicRoutes = [
  '/', // Homepage (sign-in)
  '/reset-password', // Password reset flow
  '/verify-email', // Email verification
  '/api/auth', // Auth API routes
  '/_next', // Next.js internals
  '/favicon.ico', // Favicon
];

// List of auth-only routes (should redirect to protected area if already authenticated)
const authOnlyRoutes = [
  '/', // Homepage (sign-in)
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's a public route
  const isPublicRoute = publicRoutes.some(
    route => pathname === route || pathname.startsWith(route + '/'),
  );

  // If it's a public route, allow access
  if (isPublicRoute) {
    // Check if user is already authenticated for auth-only routes
    if (authOnlyRoutes.includes(pathname)) {
      const session = await auth();
      if (session?.user) {
        // User is already authenticated, redirect to configuration
        return NextResponse.redirect(new URL('/configuration', request.url));
      }
    }
    return NextResponse.next();
  }

  // For all other routes, check authentication
  const session = await auth();

  if (!session?.user) {
    // Not authenticated, redirect to sign-in
    const url = new URL('/', request.url);
    // Optionally add a return URL for after login
    // url.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(url);
  }

  // User is authenticated, allow access
  return NextResponse.next();
}

export const config = {
  /*
   * Match all request paths except:
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   * - public folder
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
