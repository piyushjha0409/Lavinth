import { NextRequest, NextResponse } from "next/server";

const publicRoutes = ["/", "/sign-in"];
const SOLANA_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function middleware(req: NextRequest) {
  const walletAddress = req.cookies.get("wallet_address")?.value;
  const isLoggedIn = !!walletAddress && SOLANA_REGEX.test(walletAddress);
  const isPublicRoute = publicRoutes.includes(req.nextUrl.pathname);

  if (isLoggedIn && req.nextUrl.pathname === "/sign-in") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/sign-in", req.nextUrl));
  }
}

export const config = {
  matcher: [
    "/wallet-check",
    "/dashboard/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
