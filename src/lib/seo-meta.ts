// src/lib/seo-meta.ts
//
// New module (not present before): client-side meta-tag updater. Vite/React
// here is a client-side rendered SPA, so index.html ships with one static
// <title> and no per-article meta tags. This module updates document.title,
// the meta description, canonical link, and Open Graph/Twitter card tags
// whenever the viewed article changes.
//
// IMPORTANT LIMITATION: this only helps crawlers that execute JavaScript
// (Google's crawler does). Social-media link-preview bots (WhatsApp,
// Twitter, Facebook, Slack, etc.) do NOT run JS — they only read the raw
// HTML response. For those, see the Worker-side bot-detection route, which
// serves pre-rendered OG tags for known bot user-agents. This module and
// that route work together; neither alone is sufficient.

// BUG FIX: og:image:type was previously guessed as png-or-else-jpeg
// (`image.endsWith(".png") ? "image/png" : "image/jpeg"`). AI-generated
// feature images are actually WebP (compressed + uploaded as .webp — see
// the worker's image-compress.ts), so that guess mislabeled every
// AI-generated image's declared type as image/jpeg while the real bytes
// are WebP. Crawlers/validators (Facebook Sharing Debugger, Twitter Card
// Validator, and parts of Google's own image-selection pipeline) fetch the
// URL, see a MIME mismatch, and reject the image — which is exactly why
// images that generate and upload successfully still show as "broken" in
// search/social previews. Mirrors the same fix in the worker's og-bot.ts.
function detectImageMimeType(url: string): string {
  const path = url.toLowerCase().split("?")[0];
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

export interface ArticleMetaInput {
  title?: string;
  excerpt?: string;
  /** Admin-authored SEO title/description (SEOPanel), preferred over
   * title/excerpt when present — see updateArticleMetaTags below. */
  metaTitle?: string;
  metaDescription?: string;
  image?: string;
  imageAlt?: string;
  slug?: string;
  publishedAt?: string;
  category?: string;
  author?: string;
  /** Short author bio/credentials. When present alongside `author`, the
   * Article schema's author is emitted as a schema.org Person (with
   * `description`) instead of the generic Organization — a stronger
   * E-E-A-T (Experience/Expertise/Authoritativeness/Trustworthiness)
   * signal for Google than an anonymous byline. */
  authorBio?: string;
  /** Full article body HTML (or the already-flattened string form of
   * Sanity Portable Text). Used only to detect and extract an
   * AI-Lab-generated FAQ section for the FAQPage schema below — not
   * rendered by this module. */
  body?: string;
  /** Tag/keyword list — SecretAdminDashboard's Tags section (secondaryKeywords)
   * or a plain `tags` field. Rendered as a `keywords` meta tag plus one
   * `article:tag` meta per tag, matching what the Worker's OG-bot route
   * serves to link-preview bots for the same article. */
  tags?: string[];
}

const SITE_ORIGIN = "https://mindwriter.in";
const DEFAULT_TITLE = "MindWriter — Telugu & English AI Content";
const DEFAULT_DESCRIPTION = "MindWriter publishes AI, technology, and self-help content in Telugu and English.";
const DEFAULT_IMAGE = `${SITE_ORIGIN}/logo.png`;
// Used as the Article schema's author when an article has no specific
// byline in the data model yet. Search Console / rich-results validation
// wants *some* author entity for E-E-A-T; update this once individual
// author bylines are added to the article schema.
const DEFAULT_AUTHOR_NAME = "MindWriter Editorial Team";

function setMetaTag(attr: "name" | "property", key: string, content: string) {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

// For meta tags that can legitimately appear more than once (article:tag —
// one per tag). Always clears out whatever this function previously added
// first, since re-running it on every article navigation would otherwise
// keep stacking tags from earlier articles on top of each other forever.
function setMultiMetaTag(attr: "name" | "property", key: string, values: string[]) {
  document.head.querySelectorAll(`meta[${attr}="${key}"][data-seo-multi="1"]`).forEach((el) => el.remove());
  for (const value of values) {
    if (!value) continue;
    const el = document.createElement("meta");
    el.setAttribute(attr, key);
    el.setAttribute("content", value);
    el.setAttribute("data-seo-multi", "1");
    document.head.appendChild(el);
  }
}

// Marks the current URL as noindex when the SPA has landed on a path that
// doesn't resolve to any real content (no matching article slug, and not
// one of the known static/tool pages) — e.g. leftover WordPress paths like
// /cart, or a deleted category link. Without this, such URLs silently
// render the homepage at a 200 status ("soft 404"), which Google Search
// Console then reports as "Crawled - currently not indexed" thin/duplicate
// content instead of correctly treating them as gone. Exported so App.tsx
// can call it once it has determined a path has nothing behind it.
export function setRobotsNoIndex(noindex: boolean) {
  const existing = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (noindex) {
    if (!existing) {
      const el = document.createElement("meta");
      el.setAttribute("name", "robots");
      el.setAttribute("content", "noindex, follow");
      document.head.appendChild(el);
    } else {
      existing.setAttribute("content", "noindex, follow");
    }
  } else if (existing) {
    existing.remove();
  }
}

function setCanonicalLink(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

// Telugu Unicode block: U+0C00–U+0C7F.
const TELUGU_SCRIPT_RE = /[\u0C00-\u0C7F]/;

/**
 * Sets <html lang="..."> to match the actual language of what's on screen.
 * This was previously hardcoded to "en" in index.html regardless of
 * content — a real mismatch for a site whose articles are mostly Telugu,
 * which both confuses search engines' language detection for those pages
 * and gives screen readers the wrong pronunciation rules. Detects Telugu
 * script by presence of Telugu Unicode characters rather than trying to
 * track a language field per article (which the data model doesn't
 * consistently have yet), so it works correctly even for mixed
 * Telugu+English articles as long as the title reflects the main language.
 */
function setDocumentLanguage(sampleText: string) {
  document.documentElement.lang = TELUGU_SCRIPT_RE.test(sampleText) ? "te" : "en";
}

const JSON_LD_SCRIPT_ID = "mindwriter-article-jsonld";

/**
 * Injects (or removes) a schema.org Article JSON-LD <script> tag, which is
 * what Google uses for Article rich-results (headline, image, author,
 * publish date shown directly in search results). Like the rest of this
 * module, this only helps crawlers that execute JS — see og-bot.ts on the
 * Worker for the equivalent server-rendered version social bots can read.
 */
function setArticleJsonLd(article: ArticleMetaInput | null) {
  const existing = document.getElementById(JSON_LD_SCRIPT_ID);
  if (existing) {
    existing.remove();
  }

  if (!article || !article.title) {
    return; // Homepage / non-article views don't get an Article schema.
  }

  const url = article.slug ? `${SITE_ORIGIN}/${article.slug}` : SITE_ORIGIN;
  const image = article.image || DEFAULT_IMAGE;
  const description = article.excerpt ? toPlainDescription(article.excerpt) : DEFAULT_DESCRIPTION;

  // E-E-A-T: a real named author is a Person, not an Organization — Google
  // treats a named byline with credentials as a stronger trust signal than
  // an anonymous editorial-team attribution. Falls back to the Organization
  // byline exactly as before when no author name was set on the article.
  const author: Record<string, unknown> = article.author
    ? {
        "@type": "Person",
        name: article.author,
        ...(article.authorBio ? { description: article.authorBio } : {}),
      }
    : {
        "@type": "Organization",
        name: DEFAULT_AUTHOR_NAME,
        url: SITE_ORIGIN,
      };

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description,
    image: [image],
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author,
    publisher: {
      "@type": "Organization",
      name: "MindWriter",
      logo: { "@type": "ImageObject", url: DEFAULT_IMAGE },
    },
  };
  if (article.publishedAt) {
    jsonLd.datePublished = article.publishedAt;
    jsonLd.dateModified = article.publishedAt;
  }

  const script = document.createElement("script");
  script.id = JSON_LD_SCRIPT_ID;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(jsonLd);
  document.head.appendChild(script);
}

const BREADCRUMB_JSON_LD_SCRIPT_ID = "mindwriter-breadcrumb-jsonld";

/**
 * Injects (or removes) a schema.org BreadcrumbList JSON-LD tag, matching the
 * visible Home > Category > Article breadcrumb trail. This is what lets
 * Google show the breadcrumb path in search results instead of the raw URL.
 */
function setBreadcrumbJsonLd(article: ArticleMetaInput | null) {
  const existing = document.getElementById(BREADCRUMB_JSON_LD_SCRIPT_ID);
  if (existing) existing.remove();

  if (!article || !article.title) return;

  const url = article.slug ? `${SITE_ORIGIN}/${article.slug}` : SITE_ORIGIN;
  const items: Record<string, unknown>[] = [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN },
  ];
  if (article.category) {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: article.category,
      item: `${SITE_ORIGIN}/?category=${encodeURIComponent(article.category)}`,
    });
  }
  items.push({
    "@type": "ListItem",
    position: items.length + 1,
    name: article.title,
    item: url,
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };

  const script = document.createElement("script");
  script.id = BREADCRUMB_JSON_LD_SCRIPT_ID;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(jsonLd);
  document.head.appendChild(script);
}

const FAQ_JSON_LD_SCRIPT_ID = "mindwriter-faq-jsonld";

/**
 * Extracts Q&A pairs from an AI-Lab-generated FAQ section so they can be
 * turned into an FAQPage schema. The "Generate FAQs" tool in the admin
 * editor (see SecretAdminDashboard.tsx's handleToolAction) wraps its output
 * in `<div id="mw-faq-section">...</div>` specifically so this function can
 * reliably find *only* the FAQ block and not misread an article's regular
 * <h3> subheadings as questions.
 *
 * Only runs client-side: DOMParser isn't available during any non-browser
 * usage of this module, though in practice this file only ever runs in the
 * browser.
 */
function extractFaqItems(bodyHtml: string): { question: string; answer: string }[] {
  if (!bodyHtml || typeof DOMParser === "undefined") return [];

  try {
    const doc = new DOMParser().parseFromString(bodyHtml, "text/html");
    const faqSection = doc.getElementById("mw-faq-section");
    if (!faqSection) return [];

    const items: { question: string; answer: string }[] = [];
    const headings = faqSection.querySelectorAll("h3");
    headings.forEach((h3) => {
      const question = (h3.textContent || "").trim();
      if (!question) return;

      // Collect answer text from sibling <p> tags until the next <h3>.
      const answerParts: string[] = [];
      let sibling = h3.nextElementSibling;
      while (sibling && sibling.tagName.toLowerCase() !== "h3") {
        const text = (sibling.textContent || "").trim();
        if (text) answerParts.push(text);
        sibling = sibling.nextElementSibling;
      }
      const answer = answerParts.join(" ").trim();
      if (answer) items.push({ question, answer });
    });

    return items;
  } catch {
    return [];
  }
}

/**
 * Injects (or removes) a schema.org FAQPage JSON-LD tag when the article's
 * body contains an AI-Lab-generated FAQ section. This is what makes Google
 * eligible to show the expandable FAQ rich-result boxes directly in search
 * results, on top of the plain FAQ HTML the "Generate FAQs" tool already
 * adds to the visible article.
 */
function setFaqJsonLd(article: ArticleMetaInput | null) {
  const existing = document.getElementById(FAQ_JSON_LD_SCRIPT_ID);
  if (existing) existing.remove();

  if (!article || !article.body) return;

  const items = extractFaqItems(article.body);
  if (items.length === 0) return;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const script = document.createElement("script");
  script.id = FAQ_JSON_LD_SCRIPT_ID;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(jsonLd);
  document.head.appendChild(script);
}

const ORG_JSON_LD_SCRIPT_ID = "mindwriter-organization-jsonld";

/**
 * Injects a site-wide Organization + WebSite JSON-LD tag once. This is what
 * powers Google's Sitelinks Search Box and the knowledge-panel-style
 * organization info, and is independent of which article (if any) is
 * currently being viewed — call this once on app start, not per-article.
 */
export function injectOrganizationSchema() {
  if (document.getElementById(ORG_JSON_LD_SCRIPT_ID)) return; // already injected

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MindWriter",
    url: SITE_ORIGIN,
    logo: DEFAULT_IMAGE,
    sameAs: [] as string[],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MindWriter",
    url: SITE_ORIGIN,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_ORIGIN}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const script = document.createElement("script");
  script.id = ORG_JSON_LD_SCRIPT_ID;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify([jsonLd, websiteJsonLd]);
  document.head.appendChild(script);
}

/**
 * Strips HTML tags and trims to a target length for use as a meta
 * description (article excerpts may contain inline HTML/markdown).
 */
function toPlainDescription(text: string, maxLen = 160): string {
  const plain = text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return plain.length > maxLen ? `${plain.slice(0, maxLen - 1).trim()}…` : plain;
}

/**
 * Updates document.title and all relevant meta tags for the given article.
 * Call with `null` (e.g. when the user navigates back to the homepage) to
 * reset to site-wide defaults.
 */
export function updateArticleMetaTags(article: ArticleMetaInput | null) {
  if (!article) {
    document.title = DEFAULT_TITLE;
    // Homepage default: the site's primary audience/content is Telugu.
    setDocumentLanguage("తెలుగు");
    setMetaTag("name", "description", DEFAULT_DESCRIPTION);
    setCanonicalLink(SITE_ORIGIN);
    setMetaTag("property", "og:title", DEFAULT_TITLE);
    setMetaTag("property", "og:description", DEFAULT_DESCRIPTION);
    setMetaTag("property", "og:image", DEFAULT_IMAGE);
    setMetaTag("property", "og:url", SITE_ORIGIN);
    setMetaTag("property", "og:type", "website");
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", DEFAULT_TITLE);
    setMetaTag("name", "twitter:description", DEFAULT_DESCRIPTION);
    setMetaTag("name", "twitter:image", DEFAULT_IMAGE);
    setMultiMetaTag("property", "article:tag", []);
    setArticleJsonLd(null);
    setBreadcrumbJsonLd(null);
    setFaqJsonLd(null);
    return;
  }

  // Prefer the admin-set SEO title/description (SEOPanel -> metaTitle/
  // metaDescription, now saved on the Sanity document) over the generic
  // title/excerpt-derived versions. Previously these admin-authored fields
  // were saved to localStorage only and never actually consulted here — an
  // admin could carefully write a custom SEO title and it would have zero
  // effect on the live page's <title>/meta description.
  const title = article.metaTitle ? `${article.metaTitle} | MindWriter` : (article.title ? `${article.title} | MindWriter` : DEFAULT_TITLE);
  const description = article.metaDescription ? toPlainDescription(article.metaDescription) : (article.excerpt ? toPlainDescription(article.excerpt) : DEFAULT_DESCRIPTION);
  const image = article.image || DEFAULT_IMAGE;
  const url = article.slug ? `${SITE_ORIGIN}/${article.slug}` : SITE_ORIGIN;

  document.title = title;
  setDocumentLanguage(`${article.title || ""} ${article.excerpt || ""}`);
  setMetaTag("name", "description", description);
  setCanonicalLink(url);

  setMetaTag("property", "og:title", title);
  setMetaTag("property", "og:description", description);
  setMetaTag("property", "og:image", image);
  // Facebook/LinkedIn use these to decide the large-card layout immediately
  // rather than fetching the image first to measure it (which sometimes
  // falls back to a small thumbnail if that probe is slow/fails). Featured
  // images are consistently generated/uploaded at 1024x576 or resized to
  // 800-wide elsewhere in the pipeline — this is a reasonable fixed
  // default since the actual served dimensions vary slightly by source
  // (AI-generated vs directly uploaded vs Sanity-resized).
  setMetaTag("property", "og:image:width", "1200");
  setMetaTag("property", "og:image:height", "630");
  setMetaTag("property", "og:image:alt", article.imageAlt || title);
  setMetaTag("property", "og:image:type", detectImageMimeType(image));
  setMetaTag("property", "og:url", url);
  setMetaTag("property", "og:type", "article");
  setMetaTag("property", "og:site_name", "MindWriter");
  setMetaTag("property", "og:locale", TELUGU_SCRIPT_RE.test(`${article.title || ""} ${article.excerpt || ""}`) ? "te_IN" : "en_US");
  if (article.publishedAt) {
    setMetaTag("property", "article:published_time", article.publishedAt);
  }
  if (article.author) {
    setMetaTag("property", "article:author", article.author);
  }
  const tags = (article.tags || []).filter(Boolean);
  if (tags.length) {
    setMetaTag("name", "keywords", tags.join(", "));
  }
  setMultiMetaTag("property", "article:tag", tags);

  setArticleJsonLd(article);
  setBreadcrumbJsonLd(article);
  setFaqJsonLd(article);

  setMetaTag("name", "twitter:card", "summary_large_image");
  // @MindWriterBlog — the site's own Twitter/X account. twitter:site
  // attributes the card to the publication (shows "via @MindWriterBlog"
  // wherever the link is shared); twitter:creator would be the individual
  // author's handle if/when per-author Twitter handles exist — using the
  // same site handle for both is the standard fallback until then.
  setMetaTag("name", "twitter:site", "@MindWriterBlog");
  setMetaTag("name", "twitter:creator", "@MindWriterBlog");
  setMetaTag("name", "twitter:title", title);
  setMetaTag("name", "twitter:description", description);
  setMetaTag("name", "twitter:image", image);
  setMetaTag("name", "twitter:image:alt", article.imageAlt || title);
}
