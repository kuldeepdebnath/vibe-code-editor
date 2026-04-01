import NextAuth from "next-auth";

import {
  publicRoutes,
  authRoutes,
  protectedRoutes,
  apiAuthPrefix,
  DEFAULT_LOGIN_REDIRECT,
} from "@/routes";

import authConfig from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);
  const isProtectedRoute = protectedRoutes.includes(nextUrl.pathname);
  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);

  if (isApiAuthRoute) {
    return null;
  }

  if (isAuthRoute && isLoggedIn) {
    return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
  }

  if (!isLoggedIn && isProtectedRoute && !isPublicRoute) {
    return Response.redirect(new URL("/auth/sign-in", nextUrl));
  }

  return null;
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
