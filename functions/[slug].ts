// functions/[slug].ts
//
// Same root cause as functions/sitemap.xml.ts: the old `/:slug ... 200`
// rule in public/_redirects tried to proxy to an external domain (the
// Worker), which Cloudflare Pages' _redirects does not support. In
// practice every article link shared on WhatsApp/Facebook/Twitter/etc. was
// showing a generic site-wide preview instead of that article's actual
// title/image, because the Worker's og-bot route (src/routes/og-bot.ts)
// was never actually being reached.
//
// This Function matches any single-segment path (e.g. /some-article-slug)
// and asks the Worker for it server-side, forwarding the real User-Agent
// so the Worker can still decide bot vs. regular browser. Multi-segment
// paths (/foo/bar) and anything containing a "." (static assets) don't
// match this route pattern, so they fall through to normal Pages handling
// exactly as before.

const WORKER_ORIGIN = "https://api.mindwriter.in";

// Mirrors src/routes/og-bot.ts's BOT_USER_AGENT_PATTERNS exactly — these are
// link-preview crawlers that can't execute JS and need pre-rendered
// OG-tag HTML. Googlebot is deliberately NOT in this list (same as the
// Worker's list): Google executes JS and reads meta tags dynamically, so
// someone arriving from a Google search result is a real browser here,
// not a bot — and should get the fast, direct path below, not the
// Worker round-trip.
const BOT_USER_AGENT_PATTERNS = [
  "whatsapp", "facebookexternalhit", "facebot", "twitterbot", "linkedinbot",
  "slackbot", "telegrambot", "discordbot", "skypeuripreview", "vkshare",
  "pinterest", "redditbot",
];

function isKnownBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENT_PATTERNS.some((pattern) => ua.includes(pattern));
}

// Static, client-side-only app routes (see src/App.tsx's staticPage state)
// — these aren't Sanity articles, so there's nothing for the Worker's
// og-bot route to look up for them, and routing them through the Worker
// (fetch out, then fetch back to Pages for index.html, then return that)
// adds two unnecessary network hops for a plain page load. Any failure or
// slowness in that round-trip was showing up as a blank/black screen when
// clicking these links. Pages' own normal handling serves index.html for
// them directly and reliably — no Worker round-trip needed at all.
const STATIC_APP_ROUTES = new Set(["about", "contact", "privacy-policy", "terms-of-use", "disclaimer", "dmca-policy"]);

export const onRequestGet: PagesFunction<unknown, "slug"> = async (context) => {
  const slug = context.params.slug as string;
  const userAgent = context.request.headers.get("User-Agent") || "";

  // Defensive: the routing pattern shouldn't match these, but just in case.
  // Also: not a known bot -> straight to Pages' own fast index.html
  // serving, skipping the Worker round-trip entirely (this is the fix —
  // previously EVERY request, bot or not, went through the Worker, and
  // the Worker's own real-browser fallback just fetched index.html from
  // Pages again anyway, adding pure latency with no benefit).
  if (!slug || slug.includes(".") || STATIC_APP_ROUTES.has(slug) || !isKnownBot(userAgent)) {
    return context.next();
  }

  try {
    const upstream = await fetch(`${WORKER_ORIGIN}/${slug}`, {
      headers: { "User-Agent": userAgent },
    });
    if (!upstream.ok) {
      return context.next();
    }
    const body = await upstream.text();
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": upstream.headers.get("Content-Type") || "text/html; charset=utf-8" },
    });
  } catch (err) {
    // Worker unreachable — fall through to the normal SPA so real visitors
    // are never blocked by this Function failing.
    return context.next();
  }
};
