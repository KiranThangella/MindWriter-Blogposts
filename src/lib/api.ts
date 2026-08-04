// src/lib/api.ts
//
// Centralized backend API helpers.
//
// Root cause this file fixes: every fetch("/api/...") call in the app was
// using a relative path, which resolves against the CURRENT origin
// (mindwriter.in, served by Cloudflare Pages) instead of the Cloudflare
// Worker backend. Pages has no /api/* route, so it falls back to serving
// index.html (SPA fallback) — which is why every API call was getting back
// HTML instead of JSON.
//
// Fix: resolve an absolute backend base URL from VITE_API_BASE_URL (set in
// .env for local dev, and in Cloudflare Pages' environment variables for
// production), and prefix every API path with it via apiUrl().
//
// IMPORTANT: VITE_API_BASE_URL is a Vite build-time env var. Changing it in
// the Cloudflare Pages dashboard requires a new deployment (rebuild) to take
// effect — it is baked into the JS bundle at build time, not read at runtime.

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

// Strip any trailing slash so `${base}${path}` never produces a double slash
// when `path` already starts with "/".
export const API_BASE_URL = (rawBaseUrl || "").replace(/\/+$/, "");

if (!API_BASE_URL && import.meta.env.PROD) {
  // Fails loudly in production builds rather than silently falling back to
  // relative paths (which is exactly the bug this file fixes). In dev mode
  // this is just a console warning so local work without a configured
  // backend doesn't hard-crash the whole app.
  console.error(
    "[api] VITE_API_BASE_URL is not set. All backend API calls will fail. " +
      "Set it in your .env file (local) or Cloudflare Pages environment variables (production), " +
      "then redeploy — Vite env vars are baked in at build time."
  );
}

/**
 * Builds an absolute backend URL from an API path like "/api/articles/auto".
 * Use this for every backend call instead of passing the raw path to fetch().
 */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

/**
 * Shared fetch wrapper with consistent error handling, ported from the
 * (previously duplicated) safeFetchJson in MediaLibrary.tsx and
 * SecretAdminDashboard.tsx. Automatically resolves `path` to the backend's
 * absolute URL via apiUrl() — callers should pass API paths
 * ("/api/articles/...") rather than full URLs.
 */
export async function safeFetchJson(path: string, init?: RequestInit): Promise<any> {
  const url = apiUrl(path);
  try {
    // Attach the admin session token, if one exists, so admin-only backend
    // routes (see worker/src/middleware/admin-auth.ts) can verify the
    // request. This runs for every call through this shared helper —
    // harmless on public/unauthenticated calls (no token means no header),
    // and means every existing admin call site is covered without having
    // to individually add the header at each of them.
    let authHeader: Record<string, string> = {};
    try {
      const token = sessionStorage.getItem("admin_session_token");
      if (token) authHeader = { Authorization: `Bearer ${token}` };
    } catch {
      // sessionStorage unavailable (SSR/private mode) — proceed without it.
    }

    const mergedInit: RequestInit = {
      ...init,
      headers: { ...authHeader, ...(init?.headers || {}) },
    };

    const res = await fetch(url, mergedInit);
    const contentType = res.headers.get("content-type") || "";

    if (!res.ok) {
      if (contentType.includes("application/json")) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.message || `Server error (${res.status})`);
      } else {
        const errorText = await res.text();
        if (res.status === 413) {
          throw new Error("The image file is too large to process. Please try uploading a smaller image.");
        }
        throw new Error(`Server returned error (${res.status}): ${errorText.substring(0, 100) || "Empty response"}`);
      }
    }

    if (!contentType.includes("application/json")) {
      const text = await res.text();
      if (text.includes("<!doctype html") || text.includes("<html") || text.includes("<body")) {
        throw new Error(
          "API సర్వర్ ఇంకా ప్రారంభించబడుతోంది లేదా ప్రాసెస్ అవుతోంది. దయచేసి కొన్ని సెకన్లు వేచి మరలా ప్రయత్నించండి (The API server is still booting up or warm-starting. Please wait a few seconds and try again)."
        );
      }
      throw new Error(`Invalid server response (Expected JSON, got: ${text.substring(0, 100) || "empty"})`);
    }

    return await res.json();
  } catch (e: any) {
    if (e.message?.includes("Failed to fetch")) {
      throw new Error("Unable to connect to the server. Please check if the backend developmental server is running and accessible.");
    }
    throw e;
  }
}
