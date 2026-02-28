import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // Routes that require login (redirect to /login if not authenticated)
      // Role-based authorization is handled in each page's server component
      // via auth() + redirect(), not in middleware.
      const authRequired = ["/writer", "/admin", "/library", "/notifications", "/settings"];
      if (authRequired.some((p) => pathname.startsWith(p))) {
        return isLoggedIn;
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
