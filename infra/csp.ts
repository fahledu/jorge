// Content Security Policy and security headers of ADR 0011, literal copy.
// Used by `vite preview` (E2E) now; in item 1l a test checks that infra/Caddyfile
// carries the same string, so there is one source.
export const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; " +
  "connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; " +
  "frame-ancestors 'none'; form-action 'none'";

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "fullscreen=(self)",
};
