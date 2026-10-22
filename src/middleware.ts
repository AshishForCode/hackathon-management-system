import { auth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const user = req.auth?.user;

  const isAuthRoute = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register");
  const isDashboardRoute =
    nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/profile") ||
    nextUrl.pathname.startsWith("/admin") ||
    nextUrl.pathname.startsWith("/hackathons/create");

  // Redirect authenticated users away from /login or /register to /dashboard
  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return NextResponse.next();
  }

  // Protect private routes
  if (isDashboardRoute) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", nextUrl);
      loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based route guard for /admin
    if (nextUrl.pathname.startsWith("/admin")) {
      const adminRoles = ["SUPER_ADMIN", "CAMPUS_ADMIN", "ORGANIZER"];
      if (!user?.role || !adminRoles.includes(user.role)) {
        return NextResponse.redirect(new URL("/dashboard?error=Unauthorized", nextUrl));
      }
    }

    // Role-based guard for /hackathons/create
    if (nextUrl.pathname.startsWith("/hackathons/create")) {
      const creatorRoles = ["SUPER_ADMIN", "CAMPUS_ADMIN"];
      if (!user?.role || !creatorRoles.includes(user.role)) {
        return NextResponse.redirect(new URL("/hackathons?error=Forbidden", nextUrl));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|templates|images).*)",
  ],
};
