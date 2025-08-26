// Base from env: prod = https://api.climbge.com, dev can be blank for Vite proxy
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').trim();

export function joinURL(path: string) {
  // keep relative URLs in dev (proxy), make absolute in prod
  if (!API_BASE) return path;
  if (/^https?:\/\//i.test(path)) return path;      // already absolute
  return API_BASE.replace(/\/$/, '') + path;        // concat
}
