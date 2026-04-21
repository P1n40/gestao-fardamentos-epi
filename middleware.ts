import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

import { canAccessPath } from "@/lib/auth-utils";
import { env } from "@/lib/env";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const role = token?.role as UserRole | undefined;
    const path = req.nextUrl.pathname;

    if (!role || !canAccessPath(role, path)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  },
  {
    secret: env.NEXTAUTH_SECRET,
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/auth/login",
    },
  },
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - auth/login (login page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|auth/login|_next/static|_next/image|favicon.ico).*)",
  ],
};
