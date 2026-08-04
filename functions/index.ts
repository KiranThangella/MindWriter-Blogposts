// functions/index.ts
//
// Fixes a real LCP (Largest Contentful Paint) regression: index.html has a
// <link rel="preload" fetchpriority="high"> for the hero image, hardcoded
// at build time to the FALLBACK image. But the homepage's actual hero
// image is admin-configurable at runtime (Settings -> Hero Images,
// src/components/Hero.tsx / GET /api/admin/hero-images) — the moment an
// admin configures a real carousel image, the browser preloads an image
// that's never actually used, while the REAL hero image (the page's
// actual LCP element) gets no preload benefit at all: it's only
// discovered after the JS bundle downloads, parses, React mounts, and a
// client-side fetch to /api/admin/hero-images resolves. That whole chain
// sits in front of the LCP image's first byte.
//
// This intercepts the root path only (article pages are handled by
// [slug].ts) and rewrites that one preload tag server-side, using the
// same fast KV-backed lookup Hero.tsx itself calls — so the browser
// starts downloading the image that will ACTUALLY be shown, immediately,
// before any JS runs at all.
const WORKER_ORIGIN = "https://api.mindwriter.in";
const FALLBACK_PRELOAD_HREF =
  "https://wsrv.nl/?url=plain-apac-prod-public.komododecks.com/202606/16/6KSdeBRET92luaJv8c0l/image.webp&w=800&h=600&fit=inside&output=webp&q=80";

export const onRequestGet: PagesFunction<unknown> = async (context) => {
  const response = await context.next();

  // Only worth touching actual HTML responses — and if this ever fires
  // for a non-200 (e.g. Pages itself erroring), just pass it through
  // untouched rather than risk mangling an error page.
  const contentType = response.headers.get("Content-Type") || "";
  if (response.status !== 200 || !contentType.includes("text/html")) {
    return response;
  }

  try {
    const heroRes = await fetch(`${WORKER_ORIGIN}/api/admin/hero-images`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!heroRes.ok) return response;
    const data: any = await heroRes.json();
    const firstImage = Array.isArray(data?.images) && data.images.length > 0 ? data.images[0] : null;

    // Nothing configured — the hardcoded fallback in index.html is
    // already correct (it IS what Hero.tsx will render), nothing to fix.
    if (!firstImage?.url) return response;

    let html = await response.text();
    html = html.replace(FALLBACK_PRELOAD_HREF, firstImage.url);
    return new Response(html, {
      status: response.status,
      headers: response.headers,
    });
  } catch (e) {
    // Any failure here (timeout, bad JSON, etc.) — serve the page
    // unmodified rather than risk breaking the homepage over a preload
    // optimization. Worst case: back to the pre-fix behavior for this
    // one request, not an outage.
    return response;
  }
};
