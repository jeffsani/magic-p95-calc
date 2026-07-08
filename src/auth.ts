import { Context, Next } from 'hono';
import type { Env } from './types';

type AppEnv = { Bindings: Env; Variables: { userEmail: string } };

/**
 * Cloudflare Access authentication middleware.
 *
 * In production, the worker sits behind a CF Access Application which
 * validates the JWT before the request reaches the worker. We only need
 * to decode the JWT payload to extract the user's email — the trust
 * boundary is CF Access itself.
 */
export async function accessAuthMiddleware(c: Context<AppEnv>, next: Next) {
  if (c.req.path === '/health' || c.req.path === '/favicon.ico') {
    return next();
  }

  if (c.env.ENVIRONMENT !== 'production') {
    c.set('userEmail', 'dev@cloudflare.com');
    return next();
  }

  const jwtAssertion = c.req.header('Cf-Access-Jwt-Assertion');
  if (!jwtAssertion) {
    return c.text('Unauthorized — no CF Access token', 401);
  }

  try {
    const parts = jwtAssertion.split('.');
    if (parts.length !== 3) {
      return c.text('Unauthorized — malformed token', 401);
    }

    const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadStr) as { email?: string };

    if (!payload?.email) {
      return c.text('Unauthorized — no email in token', 401);
    }

    c.set('userEmail', payload.email);
    return next();
  } catch (err) {
    console.error('Access auth error:', err);
    return c.text('Auth error', 500);
  }
}
