// routes.ts

/**
 * Routes that are accessible to everyone
 * No authentication required
 * Example use-case: landing page, about page, etc.
 */
export const publicRoutes: string[] = [
    
]

/**
 * Routes used for authentication
 * These pages should NOT be accessible after login
 * Example use-case: login, register
 */
export const authRoutes: string[] = [
    "auth/sign-in",

]

/**
 * Routes that require authentication
 * User must be logged in to access these
 * Example use-case: dashboard, profile, settings
 */
export const protectedRoutes: string[] = [
    "/",
]

/**
 * Prefix for API authentication routes
 * This is used internally by Auth.js
 * Middleware should ignore these routes
 */
export const apiAuthPrefix = "/api/auth"

/**
 * Default redirect path after successful login
 * Where user will be sent after signing in
 */
export const DEFAULT_LOGIN_REDIRECT = "/";