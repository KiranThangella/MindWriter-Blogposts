// functions/news-sitemap.xml.ts
//
// Same fix, same reason, as functions/sitemap.xml.ts — see that file's
// comment. This is the route Google Search Console was flagging as
// "Sitemap is HTML" for /news-sitemap.xml.

const WORKER_ORIGIN = "https://mindwriter-worker.thangella-kirankumar.workers.dev";

export const onRequestGet: PagesFunction = async () => {
  try {
    const upstream = await fetch(`${WORKER_ORIGIN}/news-sitemap.xml`);
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
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"></urlset>`,
      { status: 200, headers: { "Content-Type": "application/xml; charset=utf-8" } }
    );
  }
};
