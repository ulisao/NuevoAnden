import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// 1. Definimos las rutas que NO pueden ser públicas
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/admin(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // 2. Si el usuario intenta entrar a dashboard o admin, forzamos login
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  // Este es el matcher moderno que te dio Clerk, úsalo tal cual
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};