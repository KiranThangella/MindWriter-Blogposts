// functions/sitemap.xml.ts
//
// Cloudflare Pages' `_redirects` file cannot proxy to an external domain
// (only relative, same-site paths) — see
// https://developers.cloudflare.com/pages/configuration/redirects/#proxying
// The old `/sitemap.xml ... 200` rule in public/_redirects therefore never
// actually worked; requests fell straight through to the SPA's index.html,
// which is why Google Search Console reported "Sitemap is HTML".
//
// A Pages Function runs as its own Worker, so it CAN fetch a different
// origin server-side (no CORS/proxy restriction applies to server-to-
// server fetches) and hand the response back as if it were local content.
// This file's path (functions/sitemap.xml.ts) maps directly to the route
// /sitemap.xml.

const WORKER_ORIGIN = "https://mindwriter-worker.thangella-kirankumar.workers.dev";

export const onRequestGet: PagesFunction = async () => {
  try {
    const upstream = await fetch(`${WORKER_ORIGIN}/sitemap.xml`);
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { status: 200, headers: { "Content-Type": "application/xml; charset=utf-8" } }
    );
  }
};
