import { useEffect, useState, FormEvent, useRef, useMemo, useCallback, lazy, Suspense } from "react";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { ConstellationCanvas } from "./components/ConstellationCanvas";
import { EbookCTA } from "./components/EbookCTA";
import { AffiliateCTA } from "./components/AffiliateCTA";
import { GalaxyBackground } from "./components/GalaxyBackground";
import { FeaturedStories } from "./components/FeaturedStories";
import { ExploreCategories } from "./components/ExploreCategories";
import { LatestArticles } from "./components/LatestArticles";
import { AdSlot } from "./components/AdSlot";
import { Sidebar } from "./components/Sidebar";
import { Footer } from "./components/Footer";
import { CookieConsent } from "./components/CookieConsent";
import { AboutPage, ContactPage, PrivacyPolicyPage, TermsOfUsePage, DisclaimerPage, DmcaPolicyPage } from "./components/StaticPages";
import { Comments } from "./components/Comments";
import { ToolsModal } from "./components/ToolsModal";
import { safeFetchJson } from "./lib/api";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { isSanityConfigured, fetchLivePosts, fetchLiveCategories, getSanityConfig, setSanityConfig, urlForAsset, getCleanCaption, resolveAssetUrl } from "./sanity/client";
import { portableTextToHtml } from "./lib/portableText";
import { Wifi, WifiOff, Sparkles, Tag, CheckCircle, Database, Settings, RefreshCw, HelpCircle, X, ChevronDown, ChevronUp, ChevronRight, AlertCircle, Copy, Check, List, Type, Plus, Minus, Twitter, Linkedin, Link, Play, Pause, Sun, Moon } from "lucide-react";
import { featuredStories, latestArticles, exploreCategories } from "./data";
import { updateArticleMetaTags, injectOrganizationSchema, setRobotsNoIndex } from "./lib/seo-meta";

// Code-splitting: these are all either admin-only or single-purpose tool
// pages that most visitors never load. Bundling them into the main chunk
// was pushing the build to a ~2.5MB single JS payload (flagged at build
// time), which directly hurts Core Web Vitals (LCP/TBT) — and therefore
// Google's page-experience ranking signal — for the ~99% of visits that
// only ever read articles on the homepage. Splitting them into separate
// chunks means the homepage bundle only pays for what it actually uses;
// each of these loads on-demand the first time its route/state is reached.
//
// SecretAdminDashboard in particular pulls in Tiptap (rich-text editor),
// Firebase, the Media Library, and the AI Lab tools — none of which a
// public reader ever needs — so this one split alone accounts for most of
// the savings.
const SecretAdminDashboard = lazy(() =>
  import("./components/SecretAdminDashboard").then((m) => ({ default: m.SecretAdminDashboard }))
);
const CategoryPage = lazy(() => import("./components/CategoryPage").then((m) => ({ default: m.CategoryPage })));
const ToolsPage = lazy(() => import("./components/ToolsPage").then((m) => ({ default: m.ToolsPage })));
const Calculator = lazy(() => import("./components/tools/Calculator").then((m) => ({ default: m.Calculator })));
const TextAnalyzer = lazy(() => import("./components/tools/TextAnalyzer").then((m) => ({ default: m.TextAnalyzer })));
const ColorPalette = lazy(() => import("./components/tools/ColorPalette").then((m) => ({ default: m.ColorPalette })));


const generateHeadingId = (text: string, index: number) => {
  // Normalize text cleaning for ID generation - remove HTML entities, tags, and special chars
  const clean = text
    .toLowerCase()
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .trim()
    .replace(/[^\w\u0C00-\u0C7F\s]/g, "") // Keep Alphanumeric + Telugu + Spaces
    .replace(/[\s_]+/g, "-") // Spaces to dashes
    .substring(0, 60);
  
  const finalId = `h-${clean || "item"}-${index}`;
  return finalId;
};

const extractTextFromChildren = (children: any): string => {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return children.toString();
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('');
  }
  if (children?.props?.children) {
    return extractTextFromChildren(children.props.children);
  }
  return "";
};

const addCaptionsToHtmlImages = (html: string, articleTitle: string, theme: string): string => {
  if (!html) return html;
  
  const figurePlaceholders: string[] = [];
  let noFigureHtml = html.replace(/<figure[\s\S]*?<\/figure>/gi, (match) => {
    figurePlaceholders.push(match);
    return `__FIG_PLACEHOLDER_${figurePlaceholders.length - 1}__`;
  });
  
  let processedHtml = noFigureHtml.replace(/<img([^>]*)src=["']([^"']+)["']([^>]*)\/?>/gi, (match, before, src, after) => {
    const combinedAttrs = before + ' ' + after;
    if (src.includes('analytics') || src.includes('pixel') || src.includes('tracking')) {
      return match;
    }
    
    const altMatch = combinedAttrs.match(/alt=["']([^"']*)["']/i);
    const titleMatch = combinedAttrs.match(/title=["']([^"']*)["']/i);
    const captionMatch = combinedAttrs.match(/data-caption=["']([^"']*)["']/i);

    // The actual accessible name for this image (screen readers), kept
    // separate from `caption` below (the person-facing text shown under the
    // image). Falls back to the caption/title text if there's no dedicated
    // alt, but is never simply omitted — every <img> rebuilt by this
    // function must keep an alt attribute (previously this function dropped
    // alt entirely on every image it processed, regardless of whether the
    // original had one).
    const altText = (altMatch ? altMatch[1] : (captionMatch ? captionMatch[1] : (titleMatch ? titleMatch[1] : ''))).trim();
    const altAttrSafe = altText.replace(/"/g, '&quot;');
    
    // Prefer the dedicated caption (data-caption / figcaption text) for what's
    // shown under the image — alt text is written for accessibility/screen
    // readers and tends to be more clinical, while caption is meant to be
    // read by a person. Fall back to alt only if there's no real caption.
    let caption = captionMatch ? captionMatch[1] : (titleMatch ? titleMatch[1] : (altMatch ? altMatch[1] : ''));
    caption = caption.trim();

    const hasRealCaption = !!caption && !caption.toLowerCase().startsWith('http') && !caption.includes('/') && caption.length >= 2;

    const containerStyle = theme === 'dark'
      ? 'margin: 2rem 0; display: flex; flex-direction: column; overflow: hidden; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); background-color: #121214;'
      : 'margin: 2rem 0; display: flex; flex-direction: column; overflow: hidden; border-radius: 1rem; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); background-color: #ffffff;';

    // If there's no real, per-image caption (i.e. the source had no
    // alt/title/data-caption text worth showing), don't fabricate a generic
    // placeholder — that used to show the exact same caption under every
    // photo. Just render the image cleanly without a caption bar instead.
    if (!hasRealCaption) {
      return `
        <div class="my-8 flex flex-col overflow-hidden rounded-2xl border shadow-lg" style="${containerStyle}">
          <img src="${src}" alt="${altAttrSafe}" class="w-full object-cover max-h-[520px] m-0" style="margin: 0; width: 100%; object-fit: cover;" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
        </div>
      `;
    }

    const captionStyle = theme === 'dark' 
      ? 'background-color: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.05); color: #94a3b8; font-family: ui-monospace, SFMono-Regular, Menlos, JetBrains Mono, monospace;' 
      : 'background-color: #f8fafc; border-top: 1px solid #f1f5f9; color: #64748b; font-family: ui-monospace, SFMono-Regular, Menlos, JetBrains Mono, monospace;';

    return `
      <div class="my-8 flex flex-col overflow-hidden rounded-2xl border shadow-lg" style="${containerStyle}">
        <img src="${src}" alt="${altAttrSafe}" class="w-full object-cover max-h-[520px] m-0" style="margin: 0; width: 100%; object-fit: cover;" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
        <div class="px-5 py-3 border-t text-xs sm:text-sm italic text-center font-mono" style="${captionStyle}">
          📸 ${caption}
        </div>
      </div>
    `;
  });
  
  figurePlaceholders.forEach((figHtml, index) => {
    processedHtml = processedHtml.replace(`__FIG_PLACEHOLDER_${index}__`, figHtml);
  });
  
  return processedHtml;
};

const normalizeArticleHtmlHeadings = (htmlBody: string): string => {
  if (!htmlBody || typeof htmlBody !== 'string') return '';
  let processed = htmlBody;
  
  // Convert Markdown headings into HTML headings
  processed = processed.replace(/(?:^|\n|>)\s*(#{1,6})\s+([^<>\n]+)/g, (match, hashes, text) => {
    const level = hashes.length;
    let prefix = "";
    const hashIdx = match.indexOf(hashes);
    if (hashIdx > 0) {
      prefix = match.substring(0, hashIdx);
    }
    return `${prefix}<h${level}>${text.trim()}</h${level}>`;
  });
  
  return processed;
};

const getArticleHeadings = (article: any) => {
  if (!article) return [];
  let body = article.body || article.content;
  
  if (!body) {
    // Return fallback headings to stay in absolute sync with renderArticleBody fallback DOM nodes
    return [
      { id: "fallback-heading-1", text: "AI ప్రభావం", level: 3 },
      { id: "fallback-heading-2", text: "లైవ్ డాక్యుమెంట్ ప్రదర్శన", level: 3 },
      { id: "fallback-heading-3", text: "మరిన్ని అప్‌డేట్స్ కోసం", level: 3 }
    ];
  }

  if (Array.isArray(body)) {
    body = portableTextToHtml(body);
  }

  if (typeof body !== 'string' || body.trim().length === 0) return [];
  
  // Decide format on raw body string before any normalizations
  const containsHtmlBlocks = /<h[1-6]|<p|<div|<table|<img|<ul|<ol|<li/i.test(body);
  const headings: { id: string; text: string; level: number }[] = [];
  
  if (containsHtmlBlocks) {
    const normalizedBody = normalizeArticleHtmlHeadings(body);
    // HTML detection matches h1-h6 in duplicate order to stay in lockstep with renderArticleBody
    const hRegex = /<(h[1-6])([\s\S]*?)>([\s\S]*?)<\/\1>/gi;
    const matches = [...normalizedBody.matchAll(hRegex)];
    let hIdx = 0;
    
    for (const m of matches) {
      const rawContent = m[3] || "";
      const text = rawContent.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
      
      if (text && text.length > 1) {
        const attrs = m[2] || "";
        const idMatch = attrs.match(/id=["']([^"']+)["']/i);
        
        const id = idMatch ? idMatch[1] : generateHeadingId(text, hIdx++);
        const level = parseInt(m[1].substring(1));
        
        // Pull level 1 to 3 headings into Table of Contents list
        if (level <= 3) {
          headings.push({ id, text, level });
        }
      }
    }
  } else {
    // Markdown detection matches ALL level 1 to 6 headings to align mdIdx with ReactMarkdown
    const cleanMd = body.replace(/```[\s\S]*?```/g, "").replace(/<[^>]+>/g, "\n");
    const mdMatches = [...cleanMd.matchAll(/(?:^|\n)\s*(#{1,6})\s+(.+?)(?=\n|$)/g)];
    let mdIdx = 0;
    
    mdMatches.forEach((m) => {
      const rawText = m[2].trim();
      const text = rawText.replace(/[*_~`]|\[|\]\(.*?\)/g, "").trim();
      if (text && text.length > 1) {
        const id = generateHeadingId(text, mdIdx++);
        const level = m[1].length;
        
        // Pull level 1 to 3 headings into Table of Contents list
        if (level <= 3) {
          headings.push({ id, text, level });
        }
      }
    });
  }
  
  return headings;
};

const getArticleTags = (article: any): string[] => {
  if (!article) return [];
  // Real tags generated/saved via the admin editor's Tags section live in
  // secondaryKeywords — check this first so the article page actually shows
  // what was generated instead of falling through to guessed/generic tags.
  if (Array.isArray(article.secondaryKeywords) && article.secondaryKeywords.length > 0) {
    return article.secondaryKeywords.map((t: any) => typeof t === 'string' ? t.trim() : (t.name || t.title || '')).filter(Boolean);
  }
  // If article has custom tags (array or string)
  if (Array.isArray(article.tags) && article.tags.length > 0) {
    return article.tags.map((t: any) => typeof t === 'string' ? t.trim() : (t.name || t.title || '')).filter(Boolean);
  }
  if (typeof article.tags === 'string' && article.tags.trim()) {
    return article.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
  }
  
  // Dynamically derive beautiful tags matching SEO standard categories
  const tags: string[] = [];
  const title = (article.title || '').toLowerCase();
  const category = (article.category || '').toUpperCase();

  if (category) {
    tags.push(category);
  }

  const isTelugu = /[\u0c00-\u0c7f]/i.test(article.title || '') || /[\u0c00-\u0c7f]/i.test(article.excerpt || '');

  if (title.includes('openai') || title.includes('chatgpt') || title.includes('gpt')) {
    tags.push('OpenAI');
    tags.push('Generative AI');
  }
  if (title.includes('google') || title.includes('gemini') || title.includes('io')) {
    tags.push('Google');
    tags.push('Gemini');
  }
  if (title.includes('meta') || title.includes('llama')) {
    tags.push('Meta');
    tags.push('Llama');
  }
  if (title.includes('midjourney') || title.includes('image') || title.includes('dall') || title.includes('art')) {
    tags.push('AI Art');
    tags.push('Midjourney');
  }
  if (title.includes('tool') || title.includes('extension') || title.includes('productivity') || title.includes('work')) {
    tags.push('AI Tools');
    tags.push('Productivity');
  }
  if (title.includes('future') || title.includes('predictions') || title.includes('insight')) {
    tags.push('AI Future');
    tags.push('Insights');
  }
  if (title.includes('seo') || title.includes('blog') || title.includes('content') || title.includes('write')) {
    tags.push('Content Creation');
    tags.push('SEO');
  }

  if (isTelugu) {
    tags.push('తెలుగు టెక్');
    if (category.includes('TOOL') || title.includes('టూల్')) {
      tags.push('ఏఐ టూల్స్');
    } else {
      tags.push('సాంకేతికత');
    }
  }

  if (tags.length < 3) {
    tags.push('Technology');
    tags.push('Innovation');
  }

  const uniqueTags: string[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    const key = tag.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueTags.push(tag);
    }
  }

  return uniqueTags.slice(0, 14);
};

function getSafeItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(key);
    }
  } catch (e) {
    console.warn("Storage access denied for key:", key, e);
  }
  return null;
}

function setSafeItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  } catch (e: any) {
    if (typeof window !== 'undefined' && (e.name === 'QuotaExceededError' || e.code === 22 || String(e).includes('QuotaExceededError') || e.code === 1014)) {
      console.warn(`[Global Storage Quota Exceeded] Running global recovery for key: ${key}`);
      try {
        const keys = Object.keys(window.localStorage);
        // Prune older revisions
        const revisionKeys = keys.filter(k => k.startsWith("revisions_"));
        revisionKeys.forEach(revK => {
          try { window.localStorage.removeItem(revK); } catch {}
        });

        // Prune other transient caches
        const transientKeys = ["local_ai_drafts", "SANITY_ALT_TEXT_CACHE", "SANITY_CAPTION_CACHE", "SANITY_DESCRIPTION_CACHE"];
        transientKeys.forEach(tK => {
          try { window.localStorage.removeItem(tK); } catch {}
        });

        // Try writing the item again once caches have been cleared
        try {
          window.localStorage.setItem(key, value);
          console.log(`[Global Storage Recovery] Successfully saved key "${key}" after clearing caches.`);
          return;
        } catch (retryErr) {
          console.warn(`[Global Storage Recovery] Ultimate fallback failed for key "${key}":`, retryErr);
        }
      } catch (recoveryErr) {
        console.warn("Global storage recovery process failed:", recoveryErr);
      }
    }
    console.warn("Storage item write failed for key:", key, e);
  }
}

export default function App() {
  const { projectId: initialProjectId, dataset: initialDataset, assetBaseUrl: initialAssetBaseUrl, isConfigured: initialIsConfigured } = getSanityConfig();
  const [posts, setPosts] = useState<any[]>([]);
  // Pagination for the homepage/latest-articles list. The worker now caches
  // up to 100 posts (see worker/src/routes/posts.ts) but only serves 40 per
  // request — postsHasMore/postsPage/postsLoadingMore back a "Load More"
  // affordance so the rest are reachable instead of being invisible past a
  // hard cap.
  const [postsHasMore, setPostsHasMore] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [postsLoadingMore, setPostsLoadingMore] = useState(false);

  const loadMorePosts = async () => {
    if (postsLoadingMore || !postsHasMore) return;
    setPostsLoadingMore(true);
    try {
      const nextPage = postsPage + 1;
      const res = await fetchLivePosts(nextPage, 40);
      if (res && res.posts.length > 0) {
        setPosts(prev => {
          const seen = new Set(prev.map((p: any) => p._id || p.id));
          const merged = [...prev];
          for (const p of res.posts) {
            const id = p._id || p.id;
            if (!seen.has(id)) merged.push(p);
          }
          return merged;
        });
        setPostsPage(nextPage);
        setPostsHasMore(res.hasMore);
      } else {
        setPostsHasMore(false);
      }
    } catch (e) {
      console.error("Failed to load more posts:", e);
    } finally {
      setPostsLoadingMore(false);
    }
  };
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // Tracks whether the initial Sanity fetch attempt (success, failure, or "not configured")
  // has finished at least once. Used to stop the URL-slug matcher below from running against
  // the temporary static fallback data before the real articles have loaded, which was causing
  // shared article links to silently fall back to the home page.
  const [dataReady, setDataReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'mock' | 'success' | 'error'>(
    initialIsConfigured ? 'mock' : 'mock'
  );
  
  // Dynamic config state for browser overrides
  const [config, setConfig] = useState({ projectId: initialProjectId, dataset: initialDataset, assetBaseUrl: initialAssetBaseUrl });
  const [inputProjectId, setInputProjectId] = useState(initialProjectId);
  const [inputDataset, setInputDataset] = useState(initialDataset);
  const [inputAssetBaseUrl, setInputAssetBaseUrl] = useState(initialAssetBaseUrl || '');
  const [copied, setCopied] = useState(false);
  const [showConfigHub, setShowConfigHub] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);
  // Checked synchronously (lazy useState initializer, not a useEffect) so
  // that when the studio key is present, this is already true on the very
  // first render — no pass where the public page (and any configured ads)
  // renders before we know we're heading into the admin dashboard. See the
  // "Secret admin access" effect below, which now only scrubs the URL.
  const [showAdminDashboard, setShowAdminDashboard] = useState(() => {
    try {
      const ADMIN_ACCESS_KEY = import.meta.env.VITE_ADMIN_ACCESS_KEY || "mw-2026-access";
      return new URLSearchParams(window.location.search).get("studio") === ADMIN_ACCESS_KEY;
    } catch (e) {
      return false;
    }
  });
  // Once true, stays true for the rest of the session — this is what
  // actually gates the lazy-loaded admin dashboard chunk below. Using
  // showAdminDashboard directly would work for the first open, but the
  // component would unmount (and its code get thrown away, then
  // re-fetched) every time an admin closes and reopens it during the same
  // session, since it's normally kept mounted just toggled via `isOpen` so
  // its close animation can play.
  const [hasOpenedAdminDashboard, setHasOpenedAdminDashboard] = useState(showAdminDashboard);
  // Simple client-side "routing" for the handful of static legal/info pages
  // required for AdSense approval and basic site trust (About, Contact,
  // Privacy Policy, Terms of Use). This app has no router library, so this
  // just matches a known literal pathname on load and swaps out the main
  // content for the matching static page. Real browsers land here via the
  // Cloudflare Pages _redirects passthrough (same mechanism article slugs
  // use); crawlers get this content once React mounts and runs this check.
  const [staticPage, setStaticPage] = useState<null | 'about' | 'contact' | 'privacy' | 'terms' | 'disclaimer' | 'dmca'>(() => {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname.replace(/\/+$/, '');
    switch (path) {
      case '/about': return 'about';
      case '/contact': return 'contact';
      case '/privacy-policy': return 'privacy';
      case '/terms-of-use': return 'terms';
      case '/disclaimer': return 'disclaimer';
      case '/dmca-policy': return 'dmca';
      default: return null;
    }
  });
  // Tool internalId <-> URL path mapping. Kept in one place so the initial
  // load, the URL-sync effect, and the popstate handler all agree.
  const TOOL_PATHS: Record<string, string> = {
    toolsPage: '/tools',
    calculator: '/tools/calculator',
    textAnalyzer: '/tools/text-analyzer',
    colorPalette: '/tools/color-palette',
  };
  const TOOL_PATH_TO_ID: Record<string, 'toolsPage' | 'calculator' | 'textAnalyzer' | 'colorPalette'> =
    Object.fromEntries(Object.entries(TOOL_PATHS).map(([id, path]) => [path, id])) as any;

  const [activeTool, setActiveTool] = useState<'home' | 'calculator' | 'textAnalyzer' | 'colorPalette' | 'category' | 'toolsPage'>(() => {
    if (typeof window === 'undefined') return 'home';
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path.startsWith('/categories/') || path.startsWith('/category/')) return 'category';
    return TOOL_PATH_TO_ID[path] || 'home';
  });
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    const match = path.match(/^\/categor(?:y|ies)\/([^\/]+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  });
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    const match = path.match(/^\/tags?\/([^\/]+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  });
  const handleTagClick = (tag: string) => {
    setActiveTagFilter(tag);
    setSelectedArticle(null);
    setActiveTool('home');
    setActiveCategoryFilter(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const setSearchQuery = (val: string | ((prev: string) => string)) => {
    // Wrap state set so we clear tag filter when search queries are made
    setActiveTagFilter(null);
    _setSearchQuery(val);
  };
  const [_searchQuery, _setSearchQuery] = useState('');
  const searchQuery = _searchQuery;
  const [deletedPostIds, setDeletedPostIds] = useState<Set<string>>(new Set());
  const [tools, setTools] = useState<any[]>([]);
  const [toolsLoading, setToolsLoading] = useState(true);

  // Fetch the "Our Tools" directory from the backend once on mount. This is
  // the fix for tools added in the admin ToolManager never showing up: that
  // panel now writes to KV via /api/tools instead of localStorage, and this
  // is the read side that actually populates the `tools` state ToolsModal
  // and ToolsPage render — previously `tools` was declared but never set.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await safeFetchJson("/api/tools");
        if (!cancelled && data?.success) {
          setTools(data.tools || []);
        }
      } catch (err) {
        console.warn("Failed to load tools directory:", err);
      } finally {
        if (!cancelled) setToolsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);


  const [localPosts, setLocalPosts] = useState<any[]>(() => {
    const saved = getSafeItem('local_generated_articles');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse local_generated_articles", e);
      return [];
    }
  });

  const [seoMetadata, setSeoMetadata] = useState<Record<string, { metaTitle?: string; metaDescription?: string; seoScore?: number }>>(() => {
    const saved = getSafeItem('app_seo_metadata');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Failed to parse app_seo_metadata", e);
      return {};
    }
  });

  // Sync to localStorage
  useEffect(() => {
    setSafeItem('local_generated_articles', JSON.stringify(localPosts));
  }, [localPosts]);

  // Site-wide Organization + WebSite JSON-LD (Sitelinks Search Box eligibility,
  // knowledge-panel-style organization info). Independent of which article is
  // being viewed, so this only needs to run once.
  useEffect(() => {
    injectOrganizationSchema();
  }, []);

  // Secret admin access: the always-visible floating "Secret Admin" button
  // used to sit on every page for every visitor, which defeated the point of
  // it being secret (it was a large button that literally said "Open Secret
  // AI Studio" in its tooltip). It's been removed. Instead, the dashboard
  // now only opens when this exact URL query param + value is present, e.g.
  // https://yourdomain.com/?studio=mw-2026-access
  // Change ADMIN_ACCESS_KEY below to whatever secret value you'd like — just
  // keep it out of anywhere public (don't link to it from the site itself).
  useEffect(() => {
    // Was a hardcoded literal here — moved to an env var so it's not
    // sitting in source control, and can be rotated via Cloudflare Pages'
    // environment variables + a rebuild, without editing code. Note this
    // is NOT a real secret either way: any VITE_-prefixed value is baked
    // into the public JS bundle for anyone to read (this is a static SPA,
    // there's no server-side templating to keep it out). The actual
    // security boundary is the server-side ADMIN_PASSWORD check
    // (adminAuth) — this key only gates whether the dashboard UI *shows
    // up* for someone to attempt logging into, not whether they can log in.
    //
    // showAdminDashboard/hasOpenedAdminDashboard are already set correctly
    // by now (computed synchronously in their useState initializers above)
    // — this effect only handles the side effect of scrubbing the param
    // from the visible URL/history so it doesn't linger in the address bar,
    // browser history, or get accidentally shared.
    if (!showAdminDashboard) return;
    const ADMIN_ACCESS_KEY = import.meta.env.VITE_ADMIN_ACCESS_KEY || "mw-2026-access";
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("studio") === ADMIN_ACCESS_KEY) {
        params.delete("studio");
        const cleanSearch = params.toString();
        const cleanUrl = window.location.pathname + (cleanSearch ? `?${cleanSearch}` : "") + window.location.hash;
        window.history.replaceState({}, "", cleanUrl);
      }
    } catch (e) {
      console.warn(e);
    }
  }, []);




  useEffect(() => {
    setSafeItem('app_seo_metadata', JSON.stringify(seoMetadata));
  }, [seoMetadata]);

  // Merge loaded posts, fallback posts (when Sanity has no posts), and local posts, then enrich with custom SEO metadata
  const originalOrFallback = posts.length > 0 ? posts : [...featuredStories, ...latestArticles];
  
  // Deduplicate by ID and slug to satisfies "ai news lo duplication rakudadu"
  const uniquePosts: any[] = [];
  const seenIds = new Set();
  const seenSlugs = new Set();

  [...originalOrFallback, ...localPosts].forEach((post: any) => {
    const id = String(post._id || post.id || "");
    
    // Skip if deleted permanently
    if (deletedPostIds.has(id)) return;

    const slug = typeof post.slug === 'object' && post.slug !== null 
      ? post.slug.current 
      : (post.slug || "");
    const cleanSlug = String(slug).toLowerCase().trim();

    if (id && !seenIds.has(id)) {
      if (!cleanSlug || !seenSlugs.has(cleanSlug)) {
        uniquePosts.push(post);
        seenIds.add(id);
        if (cleanSlug) {
          seenSlugs.add(cleanSlug);
        }
      }
    }
  });

  const combinedPosts = uniquePosts.map((post: any) => {
    const id = post._id || post.id;
    const meta = seoMetadata[String(id)];
    
    // Human-friendly date formatting to satisfies "artical date maratledu"
    const rawDate = post.publishedAt || post.date || post._createdAt;
    let displayDate = 'June 9, 2026';
    if (rawDate) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          displayDate = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }
      } catch (e) {
        console.error("Error formatting date:", e);
      }
    }

    if (meta) {
      return {
        ...post,
        id: id,
        _id: id,
        date: displayDate,
        seoTitle: meta.metaTitle || post.seoTitle || post.title,
        seoDescription: meta.metaDescription || post.seoDescription || post.excerpt,
        seoScore: meta.seoScore !== undefined ? meta.seoScore : (post.seoScore || 35)
      };
    }
    return {
      ...post,
      id: id,
      _id: id,
      date: displayDate,
      seoTitle: post.seoTitle || post.title,
      seoDescription: post.seoDescription || post.excerpt,
      seoScore: post.seoScore || (post.title && post.excerpt ? 45 : 20)
    };
  }).sort((a: any, b: any) => {
    const parseDate = (item: any) => {
      if (!item) return 0;
      const val = item.publishedAt || item._createdAt || item.date;
      if (!val) return 0;
      const timestamp = Date.parse(val);
      return isNaN(timestamp) ? 0 : timestamp;
    };
    return parseDate(b) - parseDate(a);
  });

  // Filter approved articles for the general public (user-facing views)
  const approvedPosts = useMemo(() => {
    return combinedPosts.filter((p: any) => p.approved !== false);
  }, [combinedPosts]);

  // Identifies the most semantically relevant existing article from approvedPosts (excluding the current one)
  // based on title/category matches.
  const findRelevantInternalLink = useCallback((currentArticle: any) => {
    if (!currentArticle || !approvedPosts || approvedPosts.length === 0) return null;

    const currentId = String(currentArticle._id || currentArticle.id || '');
    const candidates = approvedPosts.filter((p: any) => String(p._id || p.id || '') !== currentId);
    if (candidates.length === 0) return null;

    // Helper to tokenize title and filter out Telugu/English stopwords and punctuation
    const tokenize = (str: string) => {
      if (!str) return [];
      const clean = str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ");
      const stopWords = new Set([
        "the", "a", "an", "and", "or", "but", "for", "with", "is", "of", "at", "by", "on", "in", "to", "this", "that", "these", "those",
        "లేదా", "మరియు", "యొక్క", "లో", "ను", "కు", "తో", "నుండి", "కూడా", "కాని", "ఏ", "ఈ", "ఆ", "ఒక", "అనే", "చేయడం", "ఉంది", "ఉన్నాయి", "వల్ల", "ద్వారా", "గురించి"
      ]);
      return clean.split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));
    };

    const currentTitleWords = tokenize(currentArticle.title || '');
    
    // Helper to extract category as an array of lowercase string tokens
    const getCats = (p: any) => {
      const catVal = p.category;
      if (Array.isArray(catVal)) return catVal.map(c => String(c).toLowerCase().trim());
      if (typeof catVal === 'string') return catVal.split(',').map(c => String(c).toLowerCase().trim());
      return [];
    };

    const currentCategories = getCats(currentArticle);

    let bestCandidate: any = null;
    let maxScore = -1;

    candidates.forEach((cand: any) => {
      let score = 0;

      // 1. Category Matching (Weight: 10 per match)
      const candCategories = getCats(cand);
      candCategories.forEach((cat: string) => {
        if (currentCategories.includes(cat)) {
          score += 10;
        }
      });

      // 2. Title Word Intersection Matching (Weight: 5 per matching keyword)
      const candTitleWords = tokenize(cand.title || '');
      candTitleWords.forEach((word: string) => {
        if (currentTitleWords.includes(word)) {
          score += 5;
        }
      });

      // Partial containment check (Weight: 2 per substring match)
      const candTitleLower = (cand.title || '').toLowerCase();
      currentTitleWords.forEach((word: string) => {
        if (word.length >= 3 && candTitleLower.includes(word)) {
          score += 2;
        }
      });

      if (score > maxScore) {
        maxScore = score;
        bestCandidate = cand;
      }
    });

    return bestCandidate || candidates[0];
  }, [approvedPosts]);

  const filteredPosts = useMemo(() => {
    let result = approvedPosts;

    if (activeTagFilter) {
      const tagLower = activeTagFilter.toLowerCase().trim();
      result = result.filter((p: any) => {
        const pTags = getArticleTags(p).map(t => t.toLowerCase().trim());
        return pTags.includes(tagLower);
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p: any) => 
        p.title?.toLowerCase().includes(query) || 
        p.excerpt?.toLowerCase().includes(query) || 
        p.category?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [approvedPosts, searchQuery, activeTagFilter]);

  const categoriesWithCounts = useMemo(() => {
    // categories (from /api/posts/categories) already carries an accurate
    // per-category count computed server-side via Sanity's count()
    // aggregate — that query isn't limited by the [0...300] cap on the
    // posts *list* query, so it reflects the true total even for
    // categories with more articles than are currently loaded in this
    // browser tab. Previously this recomputed count by filtering
    // approvedPosts (whatever's been paginated into `posts` so far), which
    // undercounted anything beyond what "Load More" had fetched.
    if (categories.length > 0) {
      return categories;
    }
    // Only fall back to counting from loaded posts when we don't have
    // live backend categories yet (e.g. still using the placeholder
    // exploreCategories list before the first successful fetch).
    return exploreCategories.map(cat => ({
        ...cat,
        count: approvedPosts.filter(p => {
          const pCat = Array.isArray(p.category) ? p.category.join(', ') : (p.category || "");
          return pCat.toLowerCase() === (cat.name || "").toLowerCase();
        }).length
      }));
  }, [categories, approvedPosts]);

  // Active article state for full reader
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const readerOverlayRef = useRef<HTMLDivElement>(null);
  const bodyFetchInFlightRef = useRef<string | null>(null);
  const [isFetchingArticleBody, setIsFetchingArticleBody] = useState(false);
  const [trendingArticles, setTrendingArticles] = useState<{ slug: string; title: string; image?: string; views: number }[]>([]);
  // True when the initial URL didn't resolve to any real article, static
  // page, or tool page (e.g. leftover WordPress paths like /cart, or a
  // deleted /category/xxx link). Drives a noindex robots tag so these
  // don't get indexed as thin/duplicate homepage content — see
  // setRobotsNoIndex in seo-meta.ts for why this matters for GSC.
  const [invalidPath, setInvalidPath] = useState(false);

  useEffect(() => {
    if (!selectedArticle) return;
    // Preserve exactly where the homepage was scrolled to, then lock it in
    // place (position: fixed) for the duration the reader overlay is
    // open. `overflow: hidden` alone isn't reliable on iOS Safari — touch
    // scroll gestures can still drag the body underneath a fixed-position
    // overlay ("scroll chaining"), which is what was making the homepage
    // flash into view and the whole page feel like it was jumping/shaking
    // while scrolling inside the article reader.
    const scrollY = window.scrollY;
    const { body } = document;
    const prevPosition = body.style.position;
    const prevTop = body.style.top;
    const prevWidth = body.style.width;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    return () => {
      body.style.position = prevPosition;
      body.style.top = prevTop;
      body.style.width = prevWidth;
      window.scrollTo(0, scrollY);
    };
  }, [selectedArticle]);
  const activeHeadings = useMemo(() => {
    if (!selectedArticle) return [];
    const headings = getArticleHeadings(selectedArticle);
    return headings;
  }, [selectedArticle]);

  const isTOCVisible = activeHeadings.length > 0;
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [isMobileTOCExpanded, setIsMobileTOCExpanded] = useState(false);

  useEffect(() => {
    if (!selectedArticle || activeHeadings.length === 0) return;

    let observer: IntersectionObserver | null = null;
    
    // Defensive timeout to guarantee all dynamically rendered DOM headings are mounted and fully painted
    const timer = setTimeout(() => {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveHeadingId(entry.target.id);
            }
          });
        },
        { 
          root: scrollContainerRef.current,
          rootMargin: '0px 0px -80% 0px', 
          threshold: 0.1 
        }
      );

      activeHeadings.forEach((heading) => {
        const element = document.getElementById(heading.id);
        if (element) {
          observer?.observe(element);
        } else {
          console.warn(`TOC: Heading element with id '${heading.id}' not found in DOM yet.`);
        }
      });
    }, 150);

    return () => {
      clearTimeout(timer);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [activeHeadings, selectedArticle]);

  const [readerFontSize, setReaderFontSize] = useState<number>(() => {
    const saved = Number(getSafeItem('mw_reader_font_size'));
    return saved && saved >= 12 && saved <= 32 ? saved : 18;
  });
  const [readerFontFamily, setReaderFontFamily] = useState<'sans' | 'serif' | 'display'>(() => {
    const saved = getSafeItem('mw_reader_font_family');
    return saved === 'sans' || saved === 'serif' || saved === 'display' ? saved : 'display';
  });

  useEffect(() => {
    setSafeItem('mw_reader_font_size', String(readerFontSize));
  }, [readerFontSize]);

  useEffect(() => {
    setSafeItem('mw_reader_font_family', readerFontFamily);
  }, [readerFontFamily]);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const textToSpeak = selectedArticle?.title + ". " + (selectedArticle?.excerpt || "");
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };
  const [articleCopied, setArticleCopied] = useState(false);
  const [hasLoadedFromUrl, setHasLoadedFromUrl] = useState(false);
  const [pendingDirectSlug] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    let slugParam = params.get('slug');
    if (!slugParam) {
      const path = window.location.pathname.slice(1);
      if (path && path !== 'index.html' && !path.includes('.')) {
        slugParam = path;
      }
    }
    if (!slugParam) return null;
    // Mirrors the staticPage/activeTool checks — those are computed the
    // same synchronous way above, so this is safe to check here too. Only
    // a "this might be an article" path counts as pending.
    const normalizedPath = window.location.pathname.replace(/\/+$/, '');
    const isKnownStaticOrToolPath =
      ['/about', '/contact', '/privacy-policy', '/terms-of-use', '/disclaimer', '/dmca-policy'].includes(
        normalizedPath
      ) || Object.values({
        toolsPage: '/tools',
        calculator: '/tools/calculator',
        textAnalyzer: '/tools/text-analyzer',
        colorPalette: '/tools/color-palette',
      }).includes(normalizedPath || '/')
        || normalizedPath.startsWith('/categories/') || normalizedPath.startsWith('/category/')
        || normalizedPath.startsWith('/tags/') || normalizedPath.startsWith('/tag/');
    return isKnownStaticOrToolPath ? null : slugParam;
  });

  const [isTOCSticky, setIsTOCSticky] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollContainerRef.current && progressBarRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      progressBarRef.current.style.width = `${progress}%`;
      
      // The TOC is at top-24 (96px). The layout padding starts around 40-60px below header.
      // So when scrollTop > 40, the TOC is stuck to the header.
      setIsTOCSticky(scrollTop > 40);
    }
  };

  // Helper for generating dynamic share URLs containing the article slug
  const getShareUrl = (article: any) => {
    if (typeof window === 'undefined' || !article) return '';
    const slugVal = article.slug?.current || article.slug || article._id || article.id;
    return `${window.location.origin}/${encodeURIComponent(slugVal)}`;
  };

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (!element) {
      console.warn(`scrollToHeading: Element with ID "${id}" not found.`);
      return;
    }
    
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Calculate position relative to the scrollable container's top
      const relativeTop = elementRect.top - containerRect.top + container.scrollTop;
      
      container.scrollTo({
        top: relativeTop - 30, // Small buffer padding instead of massive offset
        behavior: 'smooth'
      });
    } else {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Opens an internal article link by slug. Checks the currently-loaded
  // posts first (instant), and falls back to a direct by-slug fetch
  // (uncapped by pagination — see worker/src/routes/articles.ts) for any
  // article outside the currently-loaded window.
  const navigateToInternalSlug = (slug: string) => {
    const clean = slug.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!clean) return;
    const matched = combinedPosts.find((p: any) => {
      const pSlug = p.slug?.current || p.slug;
      return (pSlug && String(pSlug).toLowerCase() === clean.toLowerCase()) ||
             String(p._id || p.id).toLowerCase() === clean.toLowerCase();
    });
    if (matched) {
      setSelectedArticle(matched);
      return;
    }
    safeFetchJson(`/api/articles/by-slug/${encodeURIComponent(clean)}`)
      .then((data) => {
        if (data?.success && data?.article) {
          setSelectedArticle(data.article);
        } else {
          console.warn(`Internal link target "${clean}" was not found.`);
        }
      })
      .catch((e) => console.warn("Internal link fallback fetch failed:", e));
  };

  // Intercepts clicks on <a> tags inside rendered article-body content
  // (both the dangerouslySetInnerHTML raw-HTML path and the ReactMarkdown
  // path). Internal links (root-relative, or same-origin absolute URLs —
  // this is what the AI internal-linking feature and hand-written links
  // both produce) get routed through the SPA via navigateToInternalSlug
  // instead of triggering a full page reload, which is both slower and
  // was the original source of the "internal links go to home" bug for
  // any article outside the currently-loaded pagination window.
  const handleArticleBodyClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a') as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.getAttribute('href') || '';
    if (!href || href.startsWith('#') || anchor.target === '_blank') return;

    let path: string | null = null;
    if (href.startsWith('/') && !href.startsWith('//')) {
      path = href;
    } else if (typeof window !== 'undefined') {
      try {
        const url = new URL(href, window.location.href);
        if (url.origin === window.location.origin) {
          path = url.pathname;
        }
      } catch {
        // Malformed URL — let the browser's default handling deal with it.
      }
    }

    if (path && path !== '/' && !path.includes('.')) {
      e.preventDefault();
      navigateToInternalSlug(path);
    }
  };


  // Runs immediately on mount — does NOT wait for the homepage's post list
  // to load. A direct article link (e.g. from a Google search result) used
  // to sit behind `dataReady && combinedPosts.length > 0` below, which
  // meant the homepage (app icon / splash, then the home feed) rendered
  // first and only swapped to the actual article once the ENTIRE homepage
  // list had finished loading — a visible "icon -> home -> article" flash
  // on every deep link. staticPage/activeTool are already computed
  // synchronously from the URL in their own useState initializers above,
  // so we can safely check them here with no data-loading dependency at
  // all, and go straight to a direct by-slug fetch for anything that
  // isn't a known static/tool path.
  useEffect(() => {
    if (typeof window === 'undefined' || hasLoadedFromUrl) return;

    const params = new URLSearchParams(window.location.search);
    let slugParam = params.get('slug');
    if (!slugParam) {
      const path = window.location.pathname.slice(1);
      if (path && path !== 'index.html' && !path.includes('.')) {
        slugParam = path;
      }
    }

    if (!slugParam) {
      // Root "/" — homepage renders as normal, nothing to fetch directly.
      return;
    }

    if (staticPage || activeTool !== 'home') {
      // A known static page (/about, /contact, ...) or tool page
      // (/tools, /tools/calculator, ...) — those render via their own
      // state already, so mark URL resolution done without fetching.
      setHasLoadedFromUrl(true);
      return;
    }

    safeFetchJson(`/api/articles/by-slug/${encodeURIComponent(slugParam)}`)
      .then((data) => {
        if (data?.success && data?.article) {
          setSelectedArticle(data.article);
          setHasLoadedFromUrl(true);
        } else {
          // Genuinely nothing behind this URL — let the combinedPosts
          // effect below take one more pass once the homepage list loads
          // (covers any transient by-slug hiccup) before it finally marks
          // the path invalid; hasLoadedFromUrl stays false here on purpose.
        }
      })
      .catch((e) => {
        console.warn("Direct by-slug mount fetch failed, will retry once homepage data loads:", e);
      });
  }, []);

  // Trending/Most Read — powers Sidebar's "Trending Now" section with real
  // view-based data instead of its old fallback (just the first 4 latest
  // posts, or static placeholder data from data.ts).
  useEffect(() => {
    safeFetchJson("/api/articles/trending?limit=6")
      .then((data) => {
        if (data?.success && Array.isArray(data.articles)) {
          setTrendingArticles(data.articles);
        }
      })
      .catch((e) => console.warn("Trending fetch failed (non-fatal):", e));
  }, []);

  const handleTrendingArticleClick = async (slug: string) => {
    const matched = combinedPosts.find((p: any) => {
      const pSlug = p.slug?.current || p.slug;
      return pSlug && String(pSlug).toLowerCase() === slug.toLowerCase();
    });
    if (matched) {
      setSelectedArticle(matched);
      return;
    }
    try {
      const data = await safeFetchJson(`/api/articles/by-slug/${encodeURIComponent(slug)}`);
      if (data?.success && data?.article) {
        setSelectedArticle(data.article);
      }
    } catch (e) {
      console.warn("Trending article click fetch failed:", e);
    }
  };

  // IMPORTANT: this must wait for `dataReady` (the real Sanity fetch attempt to finish),
  // otherwise it runs immediately against the temporary static fallback articles (data.ts)
  // and, since a freshly-pasted article link's slug will almost never match those, it gives
  // up permanently (hasLoadedFromUrl locks true) and effect #2 below then rewrites the URL
  // back to "/" — this was the bug causing pasted article links to redirect to the home page.
  useEffect(() => {
    if (dataReady && combinedPosts.length > 0 && !hasLoadedFromUrl) {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        let slugParam = params.get('slug');
        
        if (!slugParam) {
          const path = window.location.pathname.slice(1);
          if (path && path !== 'index.html' && !path.includes('.')) {
            slugParam = path;
          }
        }

        if (slugParam) {
          const matched = combinedPosts.find((p: any) => {
            const pSlug = p.slug?.current || p.slug;
            return (pSlug && String(pSlug).toLowerCase() === slugParam!.toLowerCase()) ||
                   String(p._id || p.id).toLowerCase() === slugParam!.toLowerCase();
          });
          if (matched) {
            setSelectedArticle(matched);
            setHasLoadedFromUrl(true);
          } else if (staticPage || activeTool !== 'home') {
            // A known static page (/about, /contact, ...) or tool page
            // (/tools, /tools/calculator, ...) — those already render via
            // their own state (see staticPage/activeTool initializers
            // above), so this path is legitimate even though it isn't an
            // article slug. Don't flag it as invalid or fetch by-slug.
            setHasLoadedFromUrl(true);
          } else {
            // Not in the currently-loaded posts window (combinedPosts only
            // ever holds whatever pagination has fetched so far, up to 40
            // on a fresh load — see loadMorePosts/postsHasMore). Rather
            // than giving up and silently falling back to the homepage,
            // fetch this exact article directly: by-slug isn't limited by
            // that pagination window at all (see worker/src/routes/
            // articles.ts), so any published article resolves regardless
            // of how many "pages" of the list it would take to reach it.
            // (In practice the mount-time effect above almost always beats
            // this to it — this is just the safety-net retry path.)
            safeFetchJson(`/api/articles/by-slug/${encodeURIComponent(slugParam)}`)
              .then((data) => {
                if (data?.success && data?.article) {
                  setSelectedArticle(data.article);
                } else {
                  // Genuinely nothing behind this URL (e.g. /cart, a
                  // deleted /category/xxx page) — mark it so the
                  // meta-tags effect below can add a noindex tag instead
                  // of silently serving indexable homepage content at a
                  // URL that shouldn't exist.
                  setInvalidPath(true);
                }
              })
              .catch((e) => {
                console.warn("Direct by-slug fallback fetch failed:", e);
                setInvalidPath(true);
              })
              .finally(() => setHasLoadedFromUrl(true));
          }
        } else {
          setHasLoadedFromUrl(true);
        }
      }
    }
  }, [combinedPosts, hasLoadedFromUrl, dataReady]);

  // 2. Synchronize URL path with active article and handle scroll to top
  useEffect(() => {
    if (typeof window !== 'undefined' && hasLoadedFromUrl) {
      const url = new URL(window.location.href);
      const slugVal = selectedArticle ? (selectedArticle.slug?.current || selectedArticle.slug || selectedArticle._id || selectedArticle.id) : null;
      
      if (slugVal) {
        url.pathname = `/${slugVal}`;
        url.searchParams.delete('slug');
      } else {
        url.pathname = '/';
      }

      const currentUrl = window.location.pathname + window.location.search;
      const nextUrl = url.pathname + url.search;
      
      if (currentUrl !== nextUrl) {
        window.history.pushState({ articleId: selectedArticle?.id }, '', nextUrl);
      }

      // Ensure scroll to top whenever article changes
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [selectedArticle, hasLoadedFromUrl]);

  const STATIC_PAGE_PATHS: Record<string, string> = {
    about: '/about',
    contact: '/contact',
    privacy: '/privacy-policy',
    terms: '/terms-of-use',
    disclaimer: '/disclaimer',
    dmca: '/dmca-policy',
  };
  const STATIC_PATH_TO_PAGE: Record<string, 'about' | 'contact' | 'privacy' | 'terms' | 'disclaimer' | 'dmca'> =
    Object.fromEntries(Object.entries(STATIC_PAGE_PATHS).map(([id, path]) => [path, id])) as any;

  // Keep the URL in sync with tools-related activeTool values (toolsPage,
  // calculator, textAnalyzer, colorPalette) — same pushState approach the
  // article slug sync above already uses, just for a different piece of
  // state. Skipped while an article reader overlay is open, since that has
  // its own URL (the article slug) and takes priority; also skipped until
  // the initial article-slug hydration above has finished, so the two
  // effects don't race on first load.
  useEffect(() => {
    if (typeof window === 'undefined' || !hasLoadedFromUrl || selectedArticle) return;
    const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
    const nextPath = TOOL_PATHS[activeTool as keyof typeof TOOL_PATHS];

    if (nextPath) {
      if (currentPath !== nextPath) {
        window.history.pushState({ activeTool }, '', nextPath);
      }
    } else if (currentPath.startsWith('/tools')) {
      // Navigated away from the tools section (e.g. back to home/category) —
      // clean the URL rather than leaving a stale /tools/* path.
      window.history.pushState({}, '', '/');
    }
  }, [activeTool, hasLoadedFromUrl, selectedArticle]);

  // Same idea as the tools sync above, but for the About/Contact/Privacy/
  // Terms static pages — clicking them in the header now sets `staticPage`
  // (see onStaticPageSelect below) instead of miscategorizing them as
  // content categories, and this keeps the URL/back-button in sync with it.
  useEffect(() => {
    if (typeof window === 'undefined' || !hasLoadedFromUrl || selectedArticle) return;
    const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
    const nextPath = staticPage ? STATIC_PAGE_PATHS[staticPage] : null;

    if (nextPath) {
      if (currentPath !== nextPath) {
        window.history.pushState({ staticPage }, '', nextPath);
      }
    } else if (STATIC_PATH_TO_PAGE[currentPath]) {
      // staticPage was cleared (e.g. clicked "Home" from within About) but
      // the URL still shows the old static-page path — clean it up.
      window.history.pushState({}, '', '/');
    }
  }, [staticPage, hasLoadedFromUrl, selectedArticle]);

  // Category view URL sync — /categories/:name is the canonical form (the
  // _redirects file 301s legacy /category/* WordPress-style links into
  // this). Previously nothing kept the URL in sync with activeCategoryFilter
  // at all: clicking a category card only changed React state, so the URL
  // bar stayed wherever it was — meaning the view couldn't be bookmarked,
  // shared, or survive a refresh, and (combined with the initial-load gap
  // fixed above) a direct visit to a category link showed a blank homepage
  // instead of that category's articles.
  useEffect(() => {
    if (typeof window === 'undefined' || !hasLoadedFromUrl || selectedArticle) return;
    const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
    const nextPath = activeTool === 'category' && activeCategoryFilter ? `/categories/${encodeURIComponent(activeCategoryFilter)}` : null;

    if (nextPath) {
      if (currentPath !== nextPath) {
        window.history.pushState({ activeCategoryFilter }, '', nextPath);
      }
    } else if (currentPath.startsWith('/categories/') || currentPath.startsWith('/category/')) {
      window.history.pushState({}, '', '/');
    }
  }, [activeTool, activeCategoryFilter, hasLoadedFromUrl, selectedArticle]);

  // Tag view URL sync — same idea, /tags/:name canonical (matching the
  // existing /tag/* -> /tags/* redirect). Tags render inline on the
  // homepage (see activeTagFilter usage below) rather than a separate
  // activeTool value, so this only needs to watch activeTagFilter itself.
  useEffect(() => {
    if (typeof window === 'undefined' || !hasLoadedFromUrl || selectedArticle) return;
    const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
    const nextPath = activeTagFilter ? `/tags/${encodeURIComponent(activeTagFilter)}` : null;

    if (nextPath) {
      if (currentPath !== nextPath) {
        window.history.pushState({ activeTagFilter }, '', nextPath);
      }
    } else if (currentPath.startsWith('/tags/') || currentPath.startsWith('/tag/')) {
      window.history.pushState({}, '', '/');
    }
  }, [activeTagFilter, hasLoadedFromUrl, selectedArticle]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/\/+$/, '') || '/';

      const staticId = STATIC_PATH_TO_PAGE[path];
      if (staticId) {
        setSelectedArticle(null);
        setStaticPage(staticId);
        return;
      }
      if (staticPage) {
        // Was on a static page, navigated back/forward to something else —
        // leave the static page.
        setStaticPage(null);
      }

      const toolId = TOOL_PATH_TO_ID[path];
      if (toolId) {
        setSelectedArticle(null);
        setActiveTool(toolId);
        return;
      }
      if (path.startsWith('/tools')) {
        // Unknown sub-path under /tools (e.g. a removed tool's old link) —
        // fall back to the tools directory page rather than a dead route.
        setSelectedArticle(null);
        setActiveTool('toolsPage');
        return;
      }

      const categoryMatch = path.match(/^\/categor(?:y|ies)\/([^\/]+)$/);
      if (categoryMatch) {
        setSelectedArticle(null);
        setActiveTagFilter(null);
        setActiveCategoryFilter(decodeURIComponent(categoryMatch[1]));
        setActiveTool('category');
        return;
      }
      if (activeTool === 'category') {
        // Was on a category page, navigated back/forward off of it.
        setActiveTool('home');
        setActiveCategoryFilter(null);
      }

      const tagMatch = path.match(/^\/tags?\/([^\/]+)$/);
      if (tagMatch) {
        setSelectedArticle(null);
        setActiveTagFilter(decodeURIComponent(tagMatch[1]));
        return;
      }
      if (activeTagFilter) {
        setActiveTagFilter(null);
      }

      const slug = path.slice(1);
      if (!slug) {
        setSelectedArticle(null);
        return;
      }
      const matched = combinedPosts.find((p: any) => {
        const pSlug = p.slug?.current || p.slug;
        return (pSlug && String(pSlug).toLowerCase() === slug.toLowerCase()) ||
               String(p._id || p.id).toLowerCase() === slug.toLowerCase();
      });
      setSelectedArticle(matched || null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [combinedPosts, staticPage, activeTool, activeTagFilter]);

  // Update document.title, meta description, canonical link, and Open
  // Graph/Twitter tags whenever the viewed article changes. This is the
  // client-side half of per-article SEO — it helps Google's crawler (which
  // executes JS) and gives the browser tab a correct title, but does NOT
  // help social-media link-preview bots, which don't run JS. See
  // src/lib/seo-meta.ts for the full explanation and the Worker-side
  // bot-detection route for the other half.
  useEffect(() => {
    if (pendingDirectSlug && !selectedArticle && !hasLoadedFromUrl) return;

    if (selectedArticle) {
      const hasBodyAlready = !!(selectedArticle.body || selectedArticle.content);
      const slugForBodyFetch = selectedArticle.slug?.current || selectedArticle.slug || selectedArticle._id || selectedArticle.id;
      if (!hasBodyAlready && slugForBodyFetch && bodyFetchInFlightRef.current !== slugForBodyFetch) {
        bodyFetchInFlightRef.current = slugForBodyFetch;
        setIsFetchingArticleBody(true);
        safeFetchJson(`/api/articles/by-slug/${encodeURIComponent(slugForBodyFetch)}`)
          .then((data) => {
            if (data?.success && data?.article) {
              setSelectedArticle((prev: any) => {
                // Only merge if still the same article the user is looking
                // at — they may have navigated away while this was in flight.
                const prevSlug = prev?.slug?.current || prev?.slug || prev?._id || prev?.id;
                if (prevSlug !== slugForBodyFetch) return prev;
                return { ...prev, ...data.article };
              });
            }
          })
          .catch((e) => console.warn("On-demand article body fetch failed:", e))
          .finally(() => {
            if (bodyFetchInFlightRef.current === slugForBodyFetch) bodyFetchInFlightRef.current = null;
            setIsFetchingArticleBody(false);
          });
      }

      if (invalidPath) setInvalidPath(false);
      const slugValue = selectedArticle.slug?.current || selectedArticle.slug || selectedArticle._id || selectedArticle.id;
      if (slugValue) {
        safeFetchJson("/api/articles/track-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: slugValue,
            title: selectedArticle.title,
            image: resolveAssetUrl(selectedArticle.image) || selectedArticle.image,
          }),
        }).catch(() => {});
      }
      // Resolve body to a flat HTML string (same conversion used for
      // rendering/headings elsewhere) purely so seo-meta.ts can detect and
      // extract an AI-Lab-generated FAQ section for the FAQPage schema.
      let bodyHtml = selectedArticle.body || selectedArticle.content;
      if (Array.isArray(bodyHtml)) {
        try {
          bodyHtml = portableTextToHtml(bodyHtml);
        } catch {
          bodyHtml = "";
        }
      }
      updateArticleMetaTags({
        title: selectedArticle.title,
        excerpt: selectedArticle.excerpt,
        metaTitle: selectedArticle.metaTitle,
        metaDescription: selectedArticle.metaDescription,
        image: typeof selectedArticle.image === "string" ? selectedArticle.image : resolveAssetUrl(selectedArticle.image),
        imageAlt: selectedArticle.imageAlt,
        slug: slugValue,
        publishedAt: selectedArticle.publishedAt,
        category: Array.isArray(selectedArticle.category) ? selectedArticle.category[0] : selectedArticle.category,
        author: selectedArticle.authorName || selectedArticle.author,
        authorBio: selectedArticle.authorBio,
        body: typeof bodyHtml === "string" ? bodyHtml : "",
        tags: getArticleTags(selectedArticle),
      });
    } else {
      updateArticleMetaTags(null);
    }
    setRobotsNoIndex(!selectedArticle && invalidPath);

    if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname + window.location.search,
      });
    }
  }, [selectedArticle, invalidPath, hasLoadedFromUrl]);

  // Focus trap + Escape-to-close for the article reader overlay (see the
  // role="dialog"/aria-modal on its root div below). Without this,
  // keyboard/screen-reader users could Tab straight past the overlay into
  // the homepage content behind it — position:fixed + scroll-lock keeps it
  // visually hidden but doesn't remove it from the accessibility tree.
  useEffect(() => {
    if (!selectedArticle) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const overlay = readerOverlayRef.current;

    const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => (overlay ? Array.from(overlay.querySelectorAll<HTMLElement>(focusableSelector)).filter((el) => el.offsetParent !== null) : []);

    // Move focus into the dialog itself first (it has tabIndex={-1} below,
    // making it a valid, if inert, focus target even with no visible
    // "close" button focused specifically).
    overlay?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedArticle(null);
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [selectedArticle]);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = getSafeItem('theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      setSafeItem('theme', next);
      return next;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

  const [readerTheme, setReaderThemeState] = useState<'dark' | 'light'>(() => {
    const saved = getSafeItem('mw_reader_theme');
    return saved === 'light' ? 'light' : 'dark';
  });
  const setReaderTheme = (value: 'dark' | 'light' | ((prev: 'dark' | 'light') => 'dark' | 'light')) => {
    setReaderThemeState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      setSafeItem('mw_reader_theme', next);
      return next;
    });
  };

  // Synchronize reader specific theme with global theme when opening an article
  useEffect(() => {
    if (selectedArticle) {
      setReaderTheme(theme);
    }
  }, [selectedArticle]);

  const renderArticleBody = (article: any) => {
    let body = article.body || article.content;
    if (Array.isArray(body)) {
      body = portableTextToHtml(body);
    }
    
    if (!body) {
      if (isFetchingArticleBody) {
        return (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-brand-purple/30 border-t-brand-purple rounded-full animate-spin" />
          </div>
        );
      }
      return (
        <div className={`space-y-6 leading-relaxed ${readerTheme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>
          <h3 id="fallback-heading-1" className="text-xl font-bold scroll-mt-28">AI ప్రభావం</h3>
          <p>
            ఇటీవలి కాలంలో ఆర్టిఫిషియల్ ఇంటెలిజెన్స్ (AI) ప్రపంచవ్యాప్తంగా విపరీతమైన మార్పులు తీసుకువస్తోంది. మన జీవన విధానం, సాంకేతిక పరిజ్ఞానం, మరియు అభివృద్ధి ప్రక్రియలపై దీని ప్రభావం చాలా ఎక్కువగా ఉంది.
          </p>
          <h3 id="fallback-heading-2" className="text-xl font-bold scroll-mt-28">లైవ్ డాక్యుమెంట్ ప్రదర్శన</h3>
          <p>
            {article.excerpt || "మీరు సానిటీ నుండి కనెక్ట్ చేసిన లైవ్ డాక్యుమెంట్ ఇది. దీని పూర్తి డేటాను విజయవంతంగా పొంది మీ డివైస్ స్క్రీన్‌పై ప్రదర్శిస్తున్నాము."}
          </p>
          <h3 id="fallback-heading-3" className="text-xl font-bold scroll-mt-28">మరిన్ని అప్‌డేట్స్ కోసం</h3>
          <p>
            టెక్ లవర్స్ మరియు డెవలపర్స్ ఇలాంటి లేటెస్ట్ అప్డేట్స్ మిస్ అవ్వకుండా ఉండటానికి నిరంతరం మా వెబ్‌సైట్ మరియు సానిటీ స్టూడియోను ఫాలో అవ్వండి.
          </p>
        </div>
      );
    }

    if (typeof body === 'string') {
      const hasTableTag = /<table/i.test(body);
      // Better HTML detection: check if it contains any common blocks, not just at the start
      const containsHtmlBlocks = /<h[1-6]|<p|<div|<table|<img|<ul|<ol|<li/i.test(body);

      if (containsHtmlBlocks) {
        // Pre-process HTML to resolve relative asset URLs (WordPress style)
        let processedBody = normalizeArticleHtmlHeadings(body);
        
        const { assetBaseUrl } = getSanityConfig();
        if (assetBaseUrl) {
           const cleanBase = assetBaseUrl.endsWith('/') ? assetBaseUrl.slice(0, -1) : assetBaseUrl;
           processedBody = processedBody.replace(/src=["'](\/wp-content\/[^"']+)["']/gi, `src="${cleanBase}$1"`);
           processedBody = processedBody.replace(/src=["'](\/uploads\/[^"']+)["']/gi, `src="${cleanBase}$1"`);
           // Handle non-leading slash ones too if they appear
           processedBody = processedBody.replace(/src=["'](wp-content\/[^"']+)["']/gi, `src="${cleanBase}/$1"`);
           processedBody = processedBody.replace(/src=["'](uploads\/[^"']+)["']/gi, `src="${cleanBase}/$1"`);
        }
        processedBody = addCaptionsToHtmlImages(processedBody, article.title || 'కథనం', readerTheme);
        
        // Add IDs to HTML headers if missing and inject scrolling class
        let htmlIdx = 0;
        const hRegex = /<(h[1-6])([\s\S]*?)>([\s\S]*?)<\/\1>/gi;
        processedBody = processedBody.replace(hRegex, (match, tag, attrs, content) => {
          // If already has an ID, skip but count it if it's a valid heading
          const text = content.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
          if (!text || text.length <= 1) return match;

          if (attrs.toLowerCase().includes('id=')) {
            // Already has ID, don't increment htmlIdx as getArticleHeadings uses same logic
            return match;
          }
          
          const id = generateHeadingId(text, htmlIdx++);
          
          let newAttrs = attrs;
          if (attrs.toLowerCase().includes('class=')) {
             newAttrs = attrs.replace(/class=["']([^"']+)["']/i, (m, c) => `class="${c} scroll-mt-28"`);
          } else {
             newAttrs = `${attrs} class="scroll-mt-28"`;
          }
          
          return `<${tag}${newAttrs} id="${id}">${content}</${tag}>`;
        });

        return (
          <div 
            className={`prose ${readerTheme === 'dark' ? 'prose-invert text-gray-200' : 'prose-zinc text-slate-800'} max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-img:rounded-3xl prose-img:shadow-2xl prose-table:my-8 ${hasTableTag ? 'overflow-x-auto' : ''}`}
            dangerouslySetInnerHTML={{ __html: processedBody }} 
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.tagName === 'IMG') {
                const src = (target as HTMLImageElement).src;
              }
              handleArticleBodyClick(e);
            }}
          />
        );
      }

      let mdIdx = 0;
      return (
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]} 
          rehypePlugins={[rehypeRaw]}
          components={{
            a: ({node, href, children, ...props}) => {
              const hrefStr = href || '';
              let path: string | null = null;
              if (hrefStr.startsWith('/') && !hrefStr.startsWith('//')) {
                path = hrefStr;
              } else if (typeof window !== 'undefined' && hrefStr) {
                try {
                  const url = new URL(hrefStr, window.location.href);
                  if (url.origin === window.location.origin) path = url.pathname;
                } catch {
                  // Not a valid URL — leave path null, falls through to a normal link.
                }
              }
              const isInternal = path && path !== '/' && !path.includes('.');
              return (
                <a
                  {...props}
                  href={hrefStr}
                  onClick={(e) => {
                    if (isInternal) {
                      e.preventDefault();
                      navigateToInternalSlug(path!);
                    }
                  }}
                >
                  {children}
                </a>
              );
            },
            table: ({node, ...props}) => (
              <div className={`overflow-x-auto my-8 rounded-[2rem] border shadow-2xl backdrop-blur-sm ${readerTheme === 'dark' ? 'border-white/10 bg-brand-card' : 'border-slate-200 bg-white'}`}>
                <table {...props} className="w-full text-sm text-left border-collapse min-w-full" />
              </div>
            ),
            thead: ({node, ...props}) => (
              <thead {...props} className={`border-b ${readerTheme === 'dark' ? 'bg-brand-purple/10 border-white/10' : 'bg-brand-purple/5 border-slate-200/80'}`} />
            ),
            th: ({node, ...props}) => (
              <th {...props} className="px-6 sm:px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-brand-purple whitespace-nowrap" />
            ),
            tbody: ({node, ...props}) => (
              <tbody {...props} className={readerTheme === 'dark' ? 'divide-y divide-white/[0.06]' : 'divide-y divide-slate-100'} />
            ),
            tr: ({node, ...props}) => (
              <tr {...props} className={`hover:bg-white/[0.03] transition-colors group ${readerTheme === 'dark' ? '' : 'hover:bg-slate-50'}`} />
            ),
            td: ({node, ...props}) => (
              <td {...props} className={`px-6 sm:px-8 py-5 font-medium leading-relaxed transition-colors border-r ${readerTheme === 'dark' ? 'text-zinc-300 border-white/[0.04] group-hover:text-white' : 'text-slate-600 border-slate-100 group-hover:text-slate-900'} last:border-r-0`} />
            ),
            img: ({node, ...props}) => {
              const src = resolveAssetUrl(props.src || '');
              let imageCaption = props.alt || props.title || '';
              if (!imageCaption || imageCaption.toLowerCase().startsWith('http') || imageCaption.includes('/') || imageCaption.length < 2) {
                imageCaption = `కథనం యొక్క ప్రాముఖ్యతను వివరించే సాంకేతిక చిత్రం (చిత్రం: ${article.title || 'కథనం'})`;
              }
              return (
                <span className={`flex flex-col overflow-hidden rounded-3xl border shadow-2xl transition-transform hover:scale-[1.01] duration-300 my-8 ${readerTheme === 'dark' ? 'border-white/5 bg-brand-card' : 'border-slate-200 bg-white'}`}>
                  <img {...props} src={src} className="w-full object-cover max-h-[500px] m-0" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                  <span className={`px-5 py-3 ${readerTheme === 'dark' ? 'bg-black/30 border-white/5 text-brand-text-muted' : 'bg-white border-slate-200 text-slate-500'} border-t text-xs sm:text-sm italic font-mono text-center`}>
                    📸 {imageCaption}
                  </span>
                </span>
              );
            },
            p: ({node, ...props}) => (
              <p {...props} className={`mb-6 leading-relaxed ${readerTheme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`} />
            ),
            h1: ({node, ...props}) => {
              const text = extractTextFromChildren(props.children);
              const id = generateHeadingId(text, mdIdx++);
              return <h1 {...props} id={id} className={`scroll-mt-28 text-2xl sm:text-3xl font-bold mt-8 mb-4 border-b pb-2 ${readerTheme === 'dark' ? 'text-white border-white/5' : 'text-slate-900 border-slate-200'}`} />;
            },
            h2: ({node, ...props}) => {
              const text = extractTextFromChildren(props.children);
              const id = generateHeadingId(text, mdIdx++);
              return <h2 {...props} id={id} className={`scroll-mt-28 text-xl sm:text-2xl font-bold mt-8 mb-4 border-b pb-2 ${readerTheme === 'dark' ? 'text-white border-white/5' : 'text-slate-900 border-slate-200'}`} />;
            },
            h3: ({node, ...props}) => {
              const text = extractTextFromChildren(props.children);
              const id = generateHeadingId(text, mdIdx++);
              return <h3 {...props} id={id} className="scroll-mt-28 text-lg sm:text-xl font-bold text-brand-purple mt-6 mb-3" />;
            },
            h4: ({node, ...props}) => {
              const text = extractTextFromChildren(props.children);
              const id = generateHeadingId(text, mdIdx++);
              return <h4 {...props} id={id} className={`scroll-mt-28 text-base sm:text-lg font-bold mt-6 mb-2 ${readerTheme === 'dark' ? 'text-gray-100' : 'text-slate-800'}`} />;
            },
            h5: ({node, ...props}) => {
              const text = extractTextFromChildren(props.children);
              const id = generateHeadingId(text, mdIdx++);
              return <h5 {...props} id={id} className={`scroll-mt-28 text-sm sm:text-base font-bold mt-4 mb-2 ${readerTheme === 'dark' ? 'text-gray-200' : 'text-slate-700'}`} />;
            },
            h6: ({node, ...props}) => {
              const text = extractTextFromChildren(props.children);
              const id = generateHeadingId(text, mdIdx++);
              return <h6 {...props} id={id} className={`scroll-mt-28 text-xs sm:text-sm font-bold mt-4 mb-2 uppercase tracking-wide ${readerTheme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`} />;
            },
            blockquote: ({node, ...props}) => <blockquote {...props} className={`border-l-4 border-brand-purple px-6 py-4 my-6 italic rounded-r-lg ${readerTheme === 'dark' ? 'bg-brand-card/50 text-gray-300' : 'bg-white text-slate-600'}`} />,
          }}
        >
          {body}
        </ReactMarkdown>
      );
    }

    if (Array.isArray(body)) {
      return body.map((block: any, idx: number) => {
        // 0. Table block handling (Sanity standard table plugin)
        if (block._type === 'table' && block.rows) {
          const hasHeader = block.rows.length > 1; // Simplistic heuristic
          return (
             <div key={idx} className={`overflow-x-auto my-12 rounded-[2rem] border shadow-2xl backdrop-blur-sm animate-in fade-in zoom-in duration-700 ${readerTheme === 'dark' ? 'border-white/10 bg-brand-card' : 'border-slate-200 bg-white'}`}>
                <table className="w-full text-sm text-left border-collapse">
                   {hasHeader && (
                      <thead className={`bg-brand-purple/10 border-b ${readerTheme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                         <tr>
                            {(block.rows[0].cells || []).map((cell: string, cidx: number) => (
                               <th key={cidx} className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-brand-purple">
                                  {cell}
                               </th>
                            ))}
                         </tr>
                      </thead>
                   )}
                   <tbody className={readerTheme === 'dark' ? 'divide-y divide-white/[0.06]' : 'divide-y divide-slate-100'}>
                      {block.rows.slice(hasHeader ? 1 : 0).map((row: any, ridx: number) => (
                         <tr key={ridx} className={`transition-colors group ${readerTheme === 'dark' ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'}`}>
                            {(row.cells || []).map((cell: string, cidx: number) => (
                               <td key={cidx} className={`px-8 py-5 font-medium leading-relaxed transition-colors border-r last:border-r-0 ${readerTheme === 'dark' ? 'text-zinc-300 border-white/[0.04] group-hover:text-white' : 'text-slate-600 border-slate-100 group-hover:text-slate-900'}`}>
                                  {cell}
                               </td>
                            ))}
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          );
        }

        // 1. Standard custom heading block type
        const isHeadingType = block._type === 'heading' || /^h[1-6]$/.test(block._type || '');
        if (isHeadingType) {
          const text = block.text || block.title || block.heading || (block.children || []).map((ch: any) => ch.text || '').join('').trim();
          const headingId = generateHeadingId(text, idx);
          return (
            <h2 key={idx} id={headingId} className={`text-xl sm:text-2xl font-bold mt-8 mb-4 border-b pb-2 scroll-mt-24 ${readerTheme === 'dark' ? 'text-white border-white/5' : 'text-slate-900 border-slate-200'}`}>
              {text}
            </h2>
          );
        }

        // 2. Standard portabletext block
        if (block._type === 'block') {
          const text = (block.children || []).map((ch: any) => ch.text || '').join('');
          const style = (block.style || 'normal').toLowerCase().trim();
          
          // --- BEGIN WORDPRESS/HTML TAG DETECTION ---
          const lowerText = text.trim().toLowerCase();
          if (
            lowerText.includes('<table') || lowerText.includes('</table>') ||
            lowerText.includes('<ul') || lowerText.includes('</ul>') ||
            lowerText.includes('<ol') || lowerText.includes('</ol>') ||
            lowerText.includes('<figure') || lowerText.includes('</figure>') ||
            lowerText.includes('<img')
          ) {
            // Pre-process HTML to resolve relative asset URLs
            let processedText = text;
            const { assetBaseUrl } = getSanityConfig();
            if (assetBaseUrl) {
               const cleanBase = assetBaseUrl.endsWith('/') ? assetBaseUrl.slice(0, -1) : assetBaseUrl;
               processedText = processedText.replace(/src=["'](\/wp-content\/[^"']+)["']/gi, `src="${cleanBase}$1"`);
               processedText = processedText.replace(/src=["'](\/uploads\/[^"']+)["']/gi, `src="${cleanBase}$1"`);
            }

            return (
              <div key={idx} className={`my-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 ${lowerText.includes('<table') ? `overflow-x-auto rounded-[2rem] border shadow-2xl backdrop-blur-sm ${readerTheme === 'dark' ? 'border-white/10 bg-brand-card' : 'border-slate-200 bg-white'}` : ''}`}>
                <div 
                  className={`prose ${readerTheme === 'dark' ? 'prose-invert text-gray-200' : 'prose-zinc text-slate-800'} max-w-none ${lowerText.includes('<table') ? 'p-1' : ''}`}
                  dangerouslySetInnerHTML={{ __html: processedText }}
                />
              </div>
            );
          }
          // --- END WORDPRESS/HTML TAG DETECTION ---

          // Image extraction inside standard block text (both absolute and relative)
          // Removed manual imageRegex splitting since text markdown handles it natively and html logic handles actual HTML block rendering.

          const isHeading = style.startsWith('h') || 
                            style.includes('heading') || 
                            style.includes('header') || 
                            style === 'title' || 
                            style === 'subheader' ||
                            /^h[1-6]$/.test(style);

          // Auto-convert standard markdown images to HTML before rendering into DOM
          let finalText = text;
          if (finalText.includes('![') && finalText.includes('](')) {
             finalText = finalText.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-2xl shadow-lg border border-white/10" loading="lazy" decoding="async" />');
          }

          if (isHeading) {
            const headingId = generateHeadingId(finalText, idx);
            if (style.includes('h1') || style === 'title' || style.includes('heading1')) {
              return (
                <h2 key={idx} id={headingId} className={`text-xl sm:text-2xl font-bold mt-8 mb-4 border-b pb-2 scroll-mt-24 ${readerTheme === 'dark' ? 'text-white border-white/5' : 'text-slate-900 border-slate-200'}`} dangerouslySetInnerHTML={{ __html: finalText }} />
              );
            }
            if (style.includes('h2') || style.includes('header') || style.includes('heading2') || style === 'h2') {
              return (
                <h2 key={idx} id={headingId} className={`text-xl sm:text-2xl font-bold mt-8 mb-4 border-b pb-2 scroll-mt-24 ${readerTheme === 'dark' ? 'text-white border-white/5' : 'text-slate-900 border-slate-200'}`} dangerouslySetInnerHTML={{ __html: finalText }} />
              );
            }
            if (style.includes('h3') || style.includes('subheader') || style.includes('heading3') || style === 'h3') {
              return (
                <h3 key={idx} id={headingId} className="text-lg sm:text-xl font-bold text-brand-purple mt-6 mb-3 scroll-mt-24" dangerouslySetInnerHTML={{ __html: finalText }} />
              );
            }
            return (
              <h4 key={idx} id={headingId} className={`font-semibold mt-4 mb-2 scroll-mt-24 ${readerTheme === 'dark' ? 'text-gray-200' : 'text-slate-800'}`} dangerouslySetInnerHTML={{ __html: finalText }} />
            );
          }

          if (style === 'blockquote') {
            return (
              <blockquote key={idx} className={`border-l-4 border-brand-purple px-6 py-4 my-6 italic rounded-r-lg ${readerTheme === 'dark' ? 'bg-brand-card/50 text-gray-300' : 'bg-white text-slate-700'}`} dangerouslySetInnerHTML={{ __html: finalText }} />
            );
          }

          return (
            <p key={idx} className={`mb-6 leading-relaxed ${readerTheme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`} dangerouslySetInnerHTML={{ __html: finalText }} />
          );
        }
        
        // 3. Image blocks
        const isImageBlock = block._type === 'image' || 
                             block._type === 'mainImage' || 
                             block._type === 'featuredImage' || 
                             block._type === 'picture' ||
                             (block.asset && !block._type) ||
                             (block.imageUrl) ||
                             (block.url && (block.url.startsWith('http') || block.url.startsWith('/') || block.url.includes('wp-content') || block.url.includes('uploads') || block.url.startsWith('data:image')));

        if (isImageBlock) {
          const imageUrl = resolveAssetUrl(urlForAsset(block) || block.imageUrl || block.url || (block.asset?.url));
          
          let imageCaption = '';
          const rawCaption = block.caption || block.alt || block.title || block.description || (block.asset?.metadata?.caption);
          if (rawCaption) {
            imageCaption = getCleanCaption(rawCaption);
          }
          if (!imageCaption) {
            imageCaption = getCleanCaption(block);
          }
          if (!imageCaption || imageCaption.toLowerCase().startsWith('http') || imageCaption.includes('/') || imageCaption.length < 2) {
            imageCaption = `కథనం యొక్క ప్రాముఖ్యతను వివరించే సాంకేతిక చిత్రం (చిత్రం: ${article.title || 'కథనం'})`;
          }

          const renderImageCaption = (caption: string) => {
             if (!caption) return null;
             return (
               <div className={`px-5 py-3 border-t text-xs sm:text-sm italic font-mono text-center ${readerTheme === 'dark' ? 'bg-black/30 border-white/5 text-brand-text-muted' : 'bg-white border-slate-200 text-slate-500'}`}>
                 📸 {caption}
               </div>
             );
          };

          if (imageUrl) {
            return (
              <div key={idx} className={`my-8 flex flex-col overflow-hidden rounded-2xl border shadow-lg transition-all hover:scale-[1.005] duration-300 ${readerTheme === 'dark' ? 'bg-brand-card border-white/5' : 'bg-white border-slate-200'}`}>
                <img 
                  src={imageUrl} 
                  alt={imageCaption || "Article dynamic illustration"} 
                  className="w-full object-cover max-h-[520px]" 
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {renderImageCaption(imageCaption)}
              </div>
            );
          }
        }
        return null;
      });
    }

    return <p className={`font-sans ${readerTheme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>సాధారణ వివరణ అందుబాటులో లేదు.</p>;
  };

  useEffect(() => {
    // Stale-while-revalidate cache for the Sanity posts/categories fetch.
    // Previously every page load (including a simple reload) blocked on a
    // fresh, uncached fetch of ALL posts from Sanity, which got slower as
    // the article count grew ("anni articals load chesthe late authundi").
    // Now: if we have a cached copy, paint it instantly so the page feels
    // immediate, but we ALWAYS still revalidate against Sanity in the
    // background on every load and swap in whatever comes back — the cache
    // only controls whether the UI blocks/shows a spinner while waiting,
    // never whether we bother fetching. (An earlier version skipped the
    // background fetch entirely when the cache was <3min old, which hid
    // newly published articles until the cache expired — fixed here.)
    const POSTS_CACHE_KEY = 'mw_posts_cache_v1';

    function readPostsCache(): { posts: any[]; categories: any[]; savedAt: number } | null {
      try {
        const raw = getSafeItem(POSTS_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.posts)) return null;
        return parsed;
      } catch (e) {
        console.warn("Failed to parse posts cache:", e);
        return null;
      }
    }

    function writePostsCache(livePosts: any[], liveCategories: any[]) {
      try {
        setSafeItem(POSTS_CACHE_KEY, JSON.stringify({
          posts: livePosts,
          categories: liveCategories || [],
          savedAt: Date.now(),
        }));
      } catch (e) {
        console.warn("Failed to write posts cache:", e);
      }
    }

    async function loadData() {
      // fetchLivePosts()/fetchLiveCategories() call the Worker's cached
      // /api/posts/* endpoints directly and don't need a client-side
      // Sanity project ID at all, so they no longer wait on this. We still
      // fetch+store the project/dataset config in the background (in
      // parallel, not in front of it) because urlForAsset() elsewhere
      // still uses it as a fallback when resolving raw asset refs inside
      // article body content.
      const { isConfigured: alreadyConfigured } = getSanityConfig();
      if (!alreadyConfigured) {
        safeFetchJson("/api/admin/get-sanity-config")
          .then((cfgRes) => {
            if (cfgRes?.success && cfgRes.config?.projectId) {
              setSanityConfig(cfgRes.config.projectId, cfgRes.config.dataset || "production");
            }
          })
          .catch((e) => console.warn("Could not fetch server-side Sanity config:", e));
      }
      {
        const cached = readPostsCache();

        // Paint cached posts immediately so reloads never show a blank/
        // loading state when we already have something to show. This is
        // purely a "don't make them stare at a spinner" optimization — it
        // does NOT decide whether we fetch fresh data below.
        if (cached && cached.posts.length > 0) {
          setPosts(cached.posts);
          setCategories(cached.categories || []);
          setConnectionStatus('success');
          setLoading(false);
          setDataReady(true);
        } else {
          setLoading(true);
        }

        // Always hit the worker's cached posts/categories endpoints on
        // every load, so newly published or edited articles show up
        // without waiting out a cache window. Both requests fire in
        // parallel now (they're independent, cached KV reads on the
        // worker) instead of categories waiting on posts to finish first.
        try {
          const [livePostsRes, liveCategories] = await Promise.all([fetchLivePosts(1, 40), fetchLiveCategories()]);
          const livePosts = livePostsRes?.posts || null;

          if (livePosts && livePosts.length > 0) {
            setPosts(livePosts);
            setPostsHasMore(!!livePostsRes?.hasMore);
            setPostsPage(1);
            setConnectionStatus('success');
            if (liveCategories) {
              setCategories(liveCategories);
            }
            writePostsCache(livePosts, liveCategories || []);
          } else if (!cached) {
            // fetch returned null or empty list due to connection error or empty project
            setConnectionStatus('error');
          }
        } catch (e) {
          console.error("Sanity connection error caught:", e);
          if (!cached) setConnectionStatus('error');
        } finally {
          setLoading(false);
          setDataReady(true);
        }
      }
    }
    loadData();
  }, [config]);

  const handleSaveConfig = (e: FormEvent) => {
    e.preventDefault();
    setSanityConfig(inputProjectId.trim(), inputDataset.trim() || 'production', inputAssetBaseUrl.trim());
    setConfig({ 
      projectId: inputProjectId.trim(), 
      dataset: inputDataset.trim() || 'production', 
      assetBaseUrl: inputAssetBaseUrl.trim() 
    });
  };

  const handleResetConfig = () => {
    setSanityConfig('', 'production', '');
    setInputProjectId('');
    setInputDataset('production');
    setInputAssetBaseUrl('');
    setConfig({ projectId: '', dataset: 'production', assetBaseUrl: '' });
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const copyToClipboard = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(currentOrigin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const staticPageHeader = (
    <Header
      isDarkMode={theme === 'dark'}
      onThemeToggle={toggleTheme}
      onToolsClick={() => setShowToolsModal(true)}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      onCategorySelect={(cat) => {
        setStaticPage(null);
        setSelectedArticle(null);
        setShowToolsModal(false);
        if (cat) {
          setActiveCategoryFilter(cat);
          setActiveTagFilter(null);
          setActiveTool('category');
        } else {
          setActiveCategoryFilter(null);
          setSearchQuery('');
          setActiveTagFilter(null);
          setActiveTool('home');
        }
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      }}
      onStaticPageSelect={(page) => {
        setSelectedArticle(null);
        setStaticPage(page);
      }}
    />
  );

  if (staticPage === 'about') return (
    <div className={`min-h-screen bg-brand-bg font-sans text-white ${theme}`}>
      {staticPageHeader}
      <AboutPage />
      <Footer />
    </div>
  );
  if (staticPage === 'contact') return (
    <div className={`min-h-screen bg-brand-bg font-sans text-white ${theme}`}>
      {staticPageHeader}
      <ContactPage />
      <Footer />
    </div>
  );
  if (staticPage === 'privacy') return (
    <div className={`min-h-screen bg-brand-bg font-sans text-white ${theme}`}>
      {staticPageHeader}
      <PrivacyPolicyPage />
      <Footer />
    </div>
  );
  if (staticPage === 'terms') return (
    <div className={`min-h-screen bg-brand-bg font-sans text-white ${theme}`}>
      {staticPageHeader}
      <TermsOfUsePage />
      <Footer />
    </div>
  );
  if (staticPage === 'disclaimer') return (
    <div className={`min-h-screen bg-brand-bg font-sans text-white ${theme}`}>
      {staticPageHeader}
      <DisclaimerPage />
      <Footer />
    </div>
  );
  if (staticPage === 'dmca') return (
    <div className={`min-h-screen bg-brand-bg font-sans text-white ${theme}`}>
      {staticPageHeader}
      <DmcaPolicyPage />
      <Footer />
    </div>
  );

  return (
    <div className={`relative isolate min-h-screen bg-brand-bg font-sans text-white selection:bg-brand-purple/30 selection:text-white ${theme}`}>
      <GalaxyBackground isDarkMode={theme === 'dark'} />
      <div className="mw-scanlines" aria-hidden="true" />
      <Header 
        isDarkMode={theme === 'dark'} 
        onThemeToggle={toggleTheme} 
        onToolsClick={() => setShowToolsModal(true)} 
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onCategorySelect={(cat) => {
          setStaticPage(null);
          setSelectedArticle(null);
          setShowToolsModal(false);
          if (cat) {
            setActiveCategoryFilter(cat);
            setActiveTagFilter(null);
            setActiveTool('category');
          } else {
            setActiveCategoryFilter(null);
            setSearchQuery('');
            setActiveTagFilter(null);
            setActiveTool('home');
          }
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'auto' });
          }
        }}
        onStaticPageSelect={(page) => {
          setSelectedArticle(null);
          setStaticPage(page);
        }}
      />
      
      <ToolsModal
        isOpen={showToolsModal}
        onClose={() => setShowToolsModal(false)}
        onSelectTool={setActiveTool}
        onViewAll={() => setActiveTool('toolsPage')}
        tools={tools}
        loading={toolsLoading}
      />

      <main>
        {activeTool === 'home' && pendingDirectSlug && !selectedArticle && !hasLoadedFromUrl ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-2 border-brand-purple/30 border-t-brand-purple rounded-full animate-spin" />
          </div>
        ) : activeTool === 'home' && (
          <>
            <div className="border-b border-white/5 bg-gradient-to-b from-brand-bg to-brand-card/20 pb-16">
              <Hero searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} isDarkMode={theme === 'dark'} />
            </div>
            
            <div className="mx-auto max-w-7xl px-6 py-16">
              {activeTagFilter && (
                <div className="mb-10 p-5 rounded-2xl border border-brand-purple/20 bg-brand-purple/5 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in" id="active-tag-banner">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-brand-purple/10 border border-brand-purple/20 rounded-xl text-brand-purple">
                      <Tag className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black tracking-widest text-[#a855f7] uppercase block">Selected Tag Filter</span>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        ట్యాగ్ చేయబడిన కథనాలు: <span className="text-brand-purple font-black">#{activeTagFilter}</span>
                      </h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                    <span className="text-xs text-brand-text-muted font-mono hidden md:inline">
                      Found {filteredPosts.length} {filteredPosts.length === 1 ? 'match' : 'matches'}
                    </span>
                    <button 
                      onClick={() => setActiveTagFilter(null)}
                      className="px-4 py-2 bg-white/5 hover:bg-brand-purple/20 border border-white/10 hover:border-brand-purple/30 text-white hover:text-brand-purple text-xs font-bold rounded-xl transition-all w-full sm:w-auto cursor-pointer"
                    >
                      Clear Filter ✕
                    </button>
                  </div>
                </div>
              )}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-purple border-t-transparent" />
                  <p className="text-sm font-medium text-brand-text-muted font-mono animate-pulse">Syncing clean documents with Sanity Studio...</p>
                </div>
              ) : (
                <>
                  <FeaturedStories posts={filteredPosts.slice(0, 8)} onArticleClick={setSelectedArticle} />
                  <ExploreCategories categories={categoriesWithCounts} onCategoryClick={(name) => { setActiveCategoryFilter(name); setActiveTool('category'); }} />
                  
                  <div className="mt-16 flex flex-col gap-12 lg:flex-row lg:gap-16">
                    <div className="flex-1 lg:w-2/3">
                      <LatestArticles posts={filteredPosts.slice(3)} onArticleClick={setSelectedArticle} hasMore={!searchQuery && !activeTagFilter && postsHasMore} loadingMore={postsLoadingMore} onLoadMore={loadMorePosts} hideAds={showAdminDashboard} />
                    </div>
                    
                    <div className="lg:w-1/3 xl:w-[350px] shrink-0">
                      <Sidebar categories={categoriesWithCounts} posts={filteredPosts} onArticleClick={setSelectedArticle} trendingArticles={trendingArticles} onTrendingArticleClick={handleTrendingArticleClick} hideAds={showAdminDashboard} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
        {activeTool === 'category' && (
          <Suspense fallback={<div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-purple border-t-transparent" /></div>}>
            <CategoryPage 
              category={activeCategoryFilter || ""} 
              posts={approvedPosts} 
              onArticleClick={setSelectedArticle}
              onBack={() => setActiveTool('home')}
            />
          </Suspense>
        )}
        {(activeTool === 'calculator' || activeTool === 'textAnalyzer' || activeTool === 'colorPalette' || activeTool === 'toolsPage') && (
          <Suspense fallback={<div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-purple border-t-transparent" /></div>}>
            {activeTool === 'calculator' && <Calculator onBack={() => setActiveTool('home')} />}
            {activeTool === 'textAnalyzer' && <TextAnalyzer onBack={() => setActiveTool('home')} />}
            {activeTool === 'colorPalette' && <ColorPalette onBack={() => setActiveTool('home')} />}
            {activeTool === 'toolsPage' && (
              <ToolsPage
                tools={tools}
                loading={toolsLoading}
                onSelectTool={setActiveTool}
                onBack={() => setActiveTool('home')}
              />
            )}
          </Suspense>
        )}
      </main>

      <Footer />
      <CookieConsent />

      {/* Secret Admin Dashboard Portal — not mounted at all (so its JS chunk
          is never fetched) until the secret access key has been used once
          in this session. See the lazy() import above and
          hasOpenedAdminDashboard's declaration for why. */}
      {hasOpenedAdminDashboard && (
      <Suspense fallback={
        <div className={`fixed inset-0 z-[60] flex items-center justify-center ${theme === 'light' ? 'bg-slate-50' : 'bg-zinc-950'}`}>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-purple border-t-transparent" />
        </div>
      }>
      <SecretAdminDashboard 
        isOpen={showAdminDashboard}
        onClose={() => setShowAdminDashboard(false)}
        categories={categories}
        existingPosts={combinedPosts}
        isLightMode={theme === 'light'}
        seoMetadata={seoMetadata}
        onUpdateSeoMetadata={setSeoMetadata}
        onPostPublished={(newPost) => {
          const id = String(newPost._id || newPost.id);
          const isInvalidRef = !id || id.startsWith('fallback-');
          

          setLocalPosts(prev => {
            // If it's an update, replace the existing one
            const filtered = prev.filter(p => (p._id || p.id) !== (newPost._id || newPost.id));
            if (newPost.localOnly) {
              const preparedPost = {
                ...newPost,
                approved: newPost.approved !== undefined ? newPost.approved : true
              };
              return [preparedPost, ...filtered];
            }
            // If successfully published to Sanity, don't store inside local storage to prevent QuotaExceededError
            return filtered;
          });
          
          // Also update the main 'posts' if it was a sanity post being edited locally (unlikely but safe)
          setPosts(prev => {
            const filtered = prev.filter(p => (p._id || p.id) !== (newPost._id || newPost.id));
            if (newPost.localOnly) return filtered; // local posts don't go to live sanity state
            return [newPost, ...filtered];
          });

          // Also update the open selectedArticle so that the reader reflects the saved changes immediately
          setSelectedArticle(prev => {
            if (prev && (prev._id || prev.id) === (newPost._id || newPost.id)) {
              return {
                ...newPost,
                approved: newPost.approved !== undefined ? newPost.approved : true
              };
            }
            return prev;
          });
        }}
        onPostDeleted={(ids) => {
          const idsArray = Array.isArray(ids) ? ids : [ids];
          
          setLocalPosts(prev => prev.filter(p => !idsArray.includes(p._id || p.id)));
          setPosts(prev => prev.filter(p => !idsArray.includes(p._id || p.id)));

          setSelectedArticle(prev => {
            if (prev && idsArray.includes(prev._id || prev.id)) {
              return null;
            }
            return prev;
          });
        }}
      />
      </Suspense>
      )}

      {selectedArticle && (
          <div
            ref={readerOverlayRef}
            role="dialog"
            aria-modal="true"
            aria-label={selectedArticle.title || "Article reader"}
            tabIndex={-1}
            className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md flex justify-center items-stretch animate-fade-in outline-none"
          >
            
            <div className={`relative w-full h-full min-h-screen max-h-screen flex flex-col transition-all duration-350 ${
              readerTheme === 'dark' 
                ? 'bg-[#0B0F19] text-white border-0 theme-dark-reader' 
                : 'bg-white text-slate-900 border-0 shadow-2xl theme-light-reader'
            }`}>
              {/* Ambient signature element, carried over from the homepage —
                  a faint "connected knowledge" network drifting behind the
                  reading column. Dark-reader-theme only: on white it would
                  just read as noise, so it's skipped entirely rather than
                  faded, to avoid paying its render cost for nothing. */}
              {readerTheme === 'dark' && (
                <div className="absolute inset-0 z-0 opacity-[0.18] pointer-events-none">
                  <ConstellationCanvas isDarkMode={true} />
                </div>
              )}
              {/* Fixed Tiny Scroll Progress Bar at the absolute top of the reader */}
              <div className="absolute top-0 left-0 w-full h-[3.5px] z-30 overflow-hidden pointer-events-none">
                <div ref={progressBarRef} className="h-full bg-gradient-to-r from-brand-purple to-[var(--color-brand-teal)] rounded-r-full transition-all duration-75 ease-out shadow-[0_0_8px_rgba(79,216,196,0.5)]" style={{ width: '0%' }} />
              </div>

              {/* Scrollable Container containing both non-sticky header & content */}
              <div 
                ref={scrollContainerRef} 
                onScroll={handleScroll}
                className="relative z-10 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 select-text"
              >
                {/* Header Action Bar that moves and scrolls with the page */}
                <div className={`flex justify-between items-center px-3 py-2.5 sm:px-6 sm:py-4 border-b sticky top-0 z-40 transition-colors ${
                  readerTheme === 'dark'
                    ? 'border-white/5 bg-[#0B0F19]/95 text-white backdrop-blur-md'
                    : 'border-slate-200/60 bg-white/95 text-slate-800 shadow-sm backdrop-blur-md'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <span className="mw-signal-dot hidden sm:inline-block" aria-hidden="true" />
                    <span className="rounded bg-brand-purple/20 px-1.5 py-0.5 text-[9px] sm:text-xs font-bold uppercase tracking-wider text-brand-purple border border-brand-purple/30 whitespace-nowrap" style={{ fontFamily: "var(--font-mono-ui)" }}>
                      {selectedArticle.category}
                    </span>
                  </div>
                  <div className="flex flex-row items-center gap-1 sm:gap-3 flex-nowrap overflow-x-hidden">
                    <div className={`flex items-center gap-2 pr-3 sm:pr-4 mr-0 hidden md:flex border-r ${
                      readerTheme === 'dark' ? 'border-white/10' : 'border-slate-200'
                    }`}>
                      <button 
                        onClick={handleSpeak}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all border ${
                          isSpeaking 
                            ? 'bg-red-500/20 text-red-500 border-red-500/30' 
                            : readerTheme === 'dark'
                              ? 'bg-white/5 hover:bg-brand-purple/20 text-gray-400 hover:text-brand-purple border-white/5'
                              : 'bg-slate-100 hover:bg-brand-purple/10 text-slate-600 hover:text-brand-purple border-slate-200'
                        }`}
                      >
                        {isSpeaking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        <span className="text-xs font-medium">{isSpeaking ? 'Stop' : 'Listen'}</span>
                      </button>
                    </div>

                    {/* Font Size Group - tight padding & zero extra letter widgets */}
                    <div className={`flex items-center gap-0.5 sm:gap-2 rounded-lg p-0.5 sm:px-2 sm:py-1 border ${
                      readerTheme === 'dark'
                        ? 'bg-white/5 border-white/10'
                        : 'bg-slate-100 border-slate-200'
                    }`}>
                      <button 
                        onClick={() => setReaderFontSize(prev => Math.max(12, prev - 2))}
                        className={`p-1 rounded transition-colors ${
                          readerTheme === 'dark'
                            ? 'hover:bg-white/10 text-gray-400 hover:text-white'
                            : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                        }`}
                        title="Decrease Font Size"
                      >
                        <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                      <div className={`flex items-center justify-center px-1 min-w-[1.8rem] sm:min-w-[3.5rem] border-x ${
                        readerTheme === 'dark' ? 'border-white/10' : 'border-slate-200'
                      }`}>
                        <span className={`text-[10px] sm:text-[11px] font-mono font-bold ${
                          readerTheme === 'dark' ? 'text-white' : 'text-slate-800'
                        }`}>{readerFontSize}px</span>
                      </div>
                      <button 
                        onClick={() => setReaderFontSize(prev => Math.min(32, prev + 2))}
                        className={`p-1 rounded transition-colors ${
                          readerTheme === 'dark'
                            ? 'hover:bg-white/10 text-gray-400 hover:text-white'
                            : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                        }`}
                        title="Increase Font Size"
                      >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    </div>

                    {/* Dynamic Premium Font Stack Selector */}
                    <div className={`flex items-center gap-0.5 rounded-lg p-0.5 border text-[10px] sm:text-xs font-semibold ${
                      readerTheme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
                    }`}>
                      <button
                        onClick={() => setReaderFontFamily('sans')}
                        className={`px-1 sm:px-2.5 py-0.5 sm:py-1 rounded transition-all ${
                          readerFontFamily === 'sans' 
                            ? 'bg-brand-purple text-white shadow' 
                            : readerTheme === 'dark'
                              ? 'text-gray-400 hover:text-white hover:bg-white/5'
                              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                        }`}
                        title="Modern Sans: Plus Jakarta & Noto Telugu"
                      >
                        Sans
                      </button>
                      <button
                        onClick={() => setReaderFontFamily('serif')}
                        className={`px-1 sm:px-2.5 py-0.5 sm:py-1 rounded transition-all ${
                          readerFontFamily === 'serif' 
                            ? 'bg-brand-purple text-white shadow' 
                            : readerTheme === 'dark'
                              ? 'text-gray-400 hover:text-white hover:bg-white/5'
                              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                        }`}
                        style={{ fontFamily: 'Georgia, serif' }}
                        title="Classic Serif: Lora & Peddana"
                      >
                        Serif
                      </button>
                      <button
                        onClick={() => setReaderFontFamily('display')}
                        className={`px-1 sm:px-2.5 py-0.5 sm:py-1 rounded transition-all ${
                          readerFontFamily === 'display' 
                            ? 'bg-brand-purple text-white shadow' 
                            : readerTheme === 'dark'
                              ? 'text-gray-400 hover:text-white hover:bg-white/5'
                              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                        }`}
                        style={{ fontFamily: '"Outfit", sans-serif' }}
                        title="Artistic Display: Outfit & NTR"
                      >
                        Display
                      </button>
                    </div>

                    {/* Dedicated Reader-specific Theme Toggle Button */}
                    <button
                      onClick={() => setReaderTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                      className={`flex items-center justify-center p-1 sm:p-2 rounded-lg transition-all border ${
                        readerTheme === 'dark'
                          ? 'bg-white/5 hover:bg-brand-purple/20 text-yellow-400 hover:text-yellow-300 border-white/5'
                          : 'bg-slate-100 hover:bg-brand-purple/10 text-slate-700 hover:text-brand-purple border-slate-200'
                      }`}
                      title={readerTheme === 'dark' ? "Switch to Light Reader" : "Switch to Dark Reader"}
                    >
                      {readerTheme === 'dark' ? <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin-slow" /> : <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                    </button>

                    <div className="ml-1 sm:ml-2">
                      <button 
                        onClick={() => setSelectedArticle(null)}
                        className={`p-1 sm:p-2 rounded-lg transition-all border ${
                          readerTheme === 'dark'
                            ? 'bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-500 border-white/5'
                            : 'bg-slate-100 hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 border-slate-200'
                        }`}
                        title="Close"
                      >
                        <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                    </div>

                  </div>
                </div>

                {/* Content nested wrapper */}
                <div className="p-4 sm:p-10 max-w-4xl mx-auto w-full">
                  <div className="space-y-8 w-full">
                    {/* Breadcrumb trail — mirrors the BreadcrumbList JSON-LD in
                        seo-meta.ts so what users see matches what Google indexes. */}
                    <nav aria-label="Breadcrumb" className={`flex items-center gap-1.5 text-xs sm:text-sm flex-wrap ${readerTheme === 'dark' ? 'text-zinc-500' : 'text-slate-500'}`}>
                      <button
                        onClick={() => setSelectedArticle(null)}
                        className={`hover:underline ${readerTheme === 'dark' ? 'hover:text-white' : 'hover:text-slate-900'}`}
                      >
                        Home
                      </button>
                      {selectedArticle.category && (
                        <>
                          <ChevronRight className="h-3 w-3 opacity-60" />
                          <button
                            onClick={() => {
                              const cat = Array.isArray(selectedArticle.category) ? selectedArticle.category[0] : selectedArticle.category;
                              setSelectedArticle(null);
                              setActiveCategoryFilter(cat);
                            }}
                            className={`hover:underline ${readerTheme === 'dark' ? 'hover:text-white' : 'hover:text-slate-900'}`}
                          >
                            {Array.isArray(selectedArticle.category) ? selectedArticle.category[0] : selectedArticle.category}
                          </button>
                        </>
                      )}
                      <ChevronRight className="h-3 w-3 opacity-60" />
                      <span className={`truncate max-w-[220px] sm:max-w-xs ${readerTheme === 'dark' ? 'text-zinc-300' : 'text-slate-700'}`}>
                        {selectedArticle.title}
                      </span>
                    </nav>
                    {/* Title Header */}
                    <div className="space-y-4">
                      <h1 className={`text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight sm:leading-snug ${
                        readerTheme === 'dark' ? 'text-white' : 'text-slate-900'
                      }`} style={{ fontFamily: "var(--font-serif-te)" }}>
                        {selectedArticle.title}
                      </h1>
                      {/* Custom Author Profile & Multi-channel Sharing Widget */}
                      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 p-4 rounded-2xl border shadow-lg backdrop-blur-md flex-wrap transition-colors ${
                        readerTheme === 'dark' 
                          ? 'bg-white/5 border-white/10' 
                          : 'bg-white border-slate-200'
                      }`}>
                        {/* Author Profile Card */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="relative shrink-0">
                            {/* Crisp initials avatar — no external image request at
                                all (previously a hardcoded placeholder Gravatar
                                identicon hash, which loaded inconsistently/
                                sometimes-blurry since it's a low-detail pattern
                                served from a third-party domain we don't control).
                                Swap this for a real uploaded author photo once one
                                exists. */}
                            <div
                              className="w-16 h-16 rounded-lg flex items-center justify-center text-xl font-black text-white ring-2 ring-brand-purple/50 border border-black/40"
                              style={{ background: "linear-gradient(135deg, #7C3AED, #4C1D95)" }}
                              aria-label="Author"
                            >
                              {(selectedArticle.authorName || "Kiran").trim().charAt(0).toUpperCase()}
                            </div>
                            <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 rounded-full ${
                              readerTheme === 'dark' ? 'border-[#151B2B]' : 'border-white'
                            }`} title="Active Author"></span>
                          </div>
                          <div>
                            <div className={`text-[10px] font-bold tracking-wider uppercase ${
                              readerTheme === 'dark' ? 'text-zinc-400' : 'text-slate-500'
                            }`}>Author</div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <span className={`text-sm font-extrabold ${readerTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedArticle.authorName || "Kiran"}</span>
                              <span className={`hidden sm:inline text-xs ${readerTheme === 'dark' ? 'text-brand-text-muted/60' : 'text-slate-300'}`}>•</span>
                              <span className={`text-xs flex items-center gap-1 ${readerTheme === 'dark' ? 'text-brand-text-muted' : 'text-slate-500'}`}>
                                <span className={`font-medium ${readerTheme === 'dark' ? 'text-brand-purple' : 'text-purple-600'}`}>Published on:</span>
                                <strong className={`font-bold ${readerTheme === 'dark' ? 'text-gray-200' : 'text-slate-700'}`}>
                                  {selectedArticle.date && selectedArticle.date !== 'Recent' 
                                    ? selectedArticle.date 
                                    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Social Share Group */}
                        <div className="space-y-1.5 flex-1 min-w-[280px]">
                          <div className={`text-[9px] font-black tracking-widest uppercase mb-1 ${
                            readerTheme === 'dark' ? 'text-brand-text-muted' : 'text-slate-550 text-slate-500'
                          }`}>
                            SHARE THIS ARTICLE
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {/* WhatsApp */}
                            <a 
                              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                                `*${selectedArticle.title}*\n\n${selectedArticle.excerpt || ''}\n\nRead more here: ${getShareUrl(selectedArticle)}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] hover:scale-105 active:scale-95 transition-all border border-[#25D366]/20 flex items-center justify-center shadow-inner"
                              title="Share on WhatsApp"
                            >
                              <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.775-4.366 9.777-9.768.002-2.615-1.017-5.074-2.87-6.928C16.31 2.053 13.848.315 12 1.345 1.302c-5.41.002-9.78 4.37-9.782 9.772-.001 1.764.475 3.483 1.378 4.996l-.968 3.537 3.637-.954zm10.902-6.13c-.301-.15-1.78-.88-2.057-.98-.277-.1-.48-.15-.68.15s-.77.98-.95 1.18c-.17.2-.35.23-.65.08-1.201-.6-2.046-1.12-2.855-2.51-.21-.36.21-.33.6-.11a24.22 24.22 0 0 0 1.29 1.18c.2.14.3.1.4-.08s.1-.4-.2-.5c-.3-.15-1.78-.88-2.057-.98-.277-.1-.48-.15-.68.15s-.77.98-.95 1.18c-.17.2-.35.23-.65.08-1.201-.6-2.046-1.12-2.855-2.51z"/>
                              </svg>
                            </a>

                            {/* Telegram */}
                            <a 
                              href={`https://t.me/share/url?url=${encodeURIComponent(getShareUrl(selectedArticle))}&text=${encodeURIComponent(
                                `${selectedArticle.title}\n\n${selectedArticle.excerpt || ''}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/20 text-[#0088cc] hover:scale-105 active:scale-95 transition-all border border-[#0088cc]/20 flex items-center justify-center shadow-inner"
                              title="Share on Telegram"
                            >
                              <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                                <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.18l-1.91 9.02c-.14.63-.52.79-1.05.49l-2.91-2.15-1.4 1.35c-.16.16-.29.29-.44.29l.21-2.94 5.34-4.82c.23-.2-.05-.31-.35-.11l-6.6 4.15-2.85-.89c-.62-.2-.63-.62.13-.91l11.13-4.29c.52-.19.97.12.79.91z"/>
                              </svg>
                            </a>

                            {/* Pinterest */}
                            <a 
                              href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(getShareUrl(selectedArticle))}&media=${encodeURIComponent(
                                selectedArticle.image
                              )}&description=${encodeURIComponent(
                                `${selectedArticle.title} - ${selectedArticle.excerpt || selectedArticle.title}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 rounded-xl bg-[#BD081C]/10 hover:bg-[#BD081C]/20 text-[#BD081C] hover:scale-105 active:scale-95 transition-all border border-[#BD081C]/20 flex items-center justify-center shadow-inner"
                              title="Share on Pinterest"
                            >
                              <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                                <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.966 1.406-5.966s-.359-.715-.359-1.777c0-1.664.965-2.906 2.17-2.906 1.023 0 1.517.769 1.517 1.692 0 1.029-.656 2.568-.994 3.993-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.771-2.25 3.771-5.497 0-2.873-2.065-4.882-5.013-4.882-3.414 0-5.418 2.561-5.418 5.204 0 1.03.397 2.133.893 2.734.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.27 1.042-1.002 2.35-1.498 3.146 1.124.347 2.317.535 3.554.535 6.607 0 11.985-5.36 11.985-11.987C23.97 5.39 18.592.022 11.985.022L12.017 0z"/>
                              </svg>
                            </a>

                            {/* Reddit */}
                            <a 
                              href={`https://reddit.com/submit?url=${encodeURIComponent(getShareUrl(selectedArticle))}&title=${encodeURIComponent(
                                `${selectedArticle.title} - ${selectedArticle.excerpt || selectedArticle.title}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 rounded-xl bg-[#FF4500]/10 hover:bg-[#FF4500]/20 text-[#FF4500] hover:scale-105 active:scale-95 transition-all border border-[#FF4500]/20 flex items-center justify-center shadow-inner"
                              title="Share on Reddit"
                            >
                              <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                                <path d="M12 0C5.373 0 0 5.373 0 12c0 6.627 5.373 12 12 12 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-.76 1.15c.044.205.066.415.066.626 0 2.53-3.045 4.59-6.791 4.59-3.746 0-6.791-2.06-6.791-4.59 0-.211.022-.421.066-.626a1.25 1.25 0 0 1-.76-1.15c0-.688.562-1.249 1.25-1.249.467 0 .872.259 1.09.642 1.402-.955 3.303-1.572 5.398-1.644l1.13-3.56 3.712.793c.03.486.434.872.93.872a1.25 1.25 0 0 0 1.25-1.25c0-.688-.562-1.25-1.25-1.25a1.248 1.248 0 0 0-1.21.938l-4.04-.863a.151.151 0 0 0-.175.105l-1.25 3.93c-2.13.06-4.07.674-5.49 1.636a1.246 1.246 0 0 0 1.05-.636zm-8.23 6.945c-.596 0-1.082-.486-1.082-1.081 0-.596.486-1.082 1.081-1.082.596 0 1.082.486 1.082 1.081 0 .596-.486 1.082-1.081 1.082zm8.441 0c-.596 0-1.082-.486-1.082-1.081 0-.596.486-1.082 1.081-1.082.596 0 1.082.486 1.082 1.081 0 .596-.486 1.082-1.081 1.082zm-8.49 1.343l.07-.005c.801 0 1.498.17 2.052.486.27-.601.731-1.091 1.303-1.428a.15.15 0 0 0 .048-.204.148.148 0 0 0-.203-.048c-.672.39-1.205.955-1.542 1.657a4.93 4.93 0 0 0-1.728-.458zm8.58 0c-.801-.01-1.52.14-2.083.453-.33-.69-.86-1.25-1.53-1.64 a.152.152 0 0 0-.2.05c-.04.06-.04.15 0 .2.57.34 1.03.83 1.3 1.43.55-.31 1.25-.48 2.05-.48l.06.002a.151.151 0 0 0 .17-.13.153.153 0 0 0-.13-.17c-.01 0-.02-.008-.03-.01z"/>
                              </svg>
                            </a>

                            {/* Facebook */}
                            <a 
                              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl(selectedArticle))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] hover:scale-105 active:scale-95 transition-all border border-[#1877F2]/20 flex items-center justify-center shadow-inner"
                              title="Share on Facebook"
                            >
                              <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                              </svg>
                            </a>

                            {/* Twitter / X */}
                            <button 
                              onClick={() => {
                                const text = `${selectedArticle.title} - ${selectedArticle.excerpt || ''}`;
                                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(getShareUrl(selectedArticle))}`, '_blank');
                              }}
                              className={`p-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-inner border ${
                                readerTheme === 'dark' 
                                  ? 'bg-white/5 hover:bg-white/10 text-white border-white/10' 
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'
                              }`}
                              title="Share on Twitter / X"
                            >
                              <Twitter className="h-4.5 w-4.5" />
                            </button>

                            {/* LinkedIn */}
                            <button 
                              onClick={() => {
                                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl(selectedArticle))}`, '_blank');
                              }}
                              className={`p-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-inner border ${
                                readerTheme === 'dark'
                                  ? 'bg-sky-600/10 hover:bg-sky-600/20 text-sky-400 border-sky-600/20'
                                  : 'bg-slate-100 hover:bg-slate-200 text-sky-600 border-slate-200/80'
                              }`}
                              title="Share on LinkedIn"
                            >
                              <Linkedin className="h-4.5 w-4.5" />
                            </button>

                            {/* Copy Link */}
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(getShareUrl(selectedArticle));
                                setArticleCopied(true);
                                setTimeout(() => setArticleCopied(false), 2000);
                              }}
                              className={`p-2.5 rounded-xl transition-all border flex items-center gap-1.5 hover:scale-105 active:scale-95 ${
                                articleCopied 
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                                  : readerTheme === 'dark'
                                    ? 'bg-brand-purple/10 text-brand-purple border-brand-purple/20 hover:bg-brand-purple/20'
                                    : 'bg-slate-100 text-brand-purple border-brand-purple/25 hover:bg-brand-purple/10'
                              }`}
                              title="Copy Article Link"
                            >
                              {articleCopied ? <Check className="h-4.5 w-4.5 animate-bounce" /> : <Link className="h-4.5 w-4.5" />}
                              <span className="text-[10px] font-bold uppercase tracking-tight">
                                {articleCopied ? 'Copied' : 'Link'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cover Hero Image */}
                    {selectedArticle.image && (
                      <div className="flex flex-col relative w-full overflow-hidden rounded-2xl bg-black/20 border border-white/5 shadow-inner">
                        <span className="mw-hud-corner tl" aria-hidden="true" />
                        <span className="mw-hud-corner br" aria-hidden="true" />
                        <div className="relative w-full">
                          <img 
                            src={selectedArticle.image} 
                            alt={selectedArticle.imageAlt || selectedArticle.title} 
                            className="relative z-0 w-full object-cover max-h-[480px] w-full"
                            referrerPolicy="no-referrer"
                            loading="eager"
                            fetchPriority="high"
                            onError={(e) => {
                              // Fail-safe fallback if custom URL is broken
                              (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800';
                            }}
                          />
                          {/* Title overlay on the hero image itself — same
                              treatment as the homepage thumbnail cards, so
                              the article's identity is visible even from
                              just this image (e.g. when shared/screenshotted).
                              z-10 explicitly set (matches FeaturedStories.tsx)
                              so the gradient + title always paint above the
                              image regardless of DOM/stacking quirks. */}
                          <div 
                            className="pointer-events-none absolute inset-0 z-10" 
                            style={{ background: 'linear-gradient(to top, rgba(8,4,18,1) 0%, rgba(8,4,18,0.92) 22%, rgba(15,6,32,0.6) 45%, rgba(124,58,237,0.18) 65%, rgba(0,0,0,0) 90%)' }}
                          />
                          <div 
                            className="absolute bottom-0 left-0 right-0 z-10 p-4 sm:p-7"
                            style={{ background: 'linear-gradient(to top, rgba(8,4,18,0.98) 0%, rgba(8,4,18,0.85) 60%, rgba(8,4,18,0) 100%)' }}
                          >
                            {selectedArticle.category && (
                              <span className="on-dark-overlay mb-2 inline-block rounded bg-brand-purple px-2 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md">
                                {Array.isArray(selectedArticle.category) ? selectedArticle.category[0] : selectedArticle.category}
                              </span>
                            )}
                            <h2 
                              className="on-dark-overlay text-xl sm:text-3xl font-extrabold leading-tight text-white line-clamp-3"
                              style={{ textShadow: '0 2px 10px rgba(0,0,0,0.85)' }}
                            >
                              {selectedArticle.title}
                            </h2>
                          </div>
                        </div>
                        {(() => {
                          let featCaption = getCleanCaption(selectedArticle.imageCaption || selectedArticle.caption || selectedArticle.mainImage?.caption || selectedArticle.image?.caption);
                          if (!featCaption || featCaption.length < 2) {
                            // Fall back to the article's own title rather than a generic
                            // "image related to this article" placeholder sentence.
                            featCaption = selectedArticle.title || "";
                          }
                          return featCaption ? (
                            <div className={`px-5 py-3 border-t text-xs sm:text-sm italic font-mono text-center ${readerTheme === 'dark' ? 'bg-black/40 border-white/5 text-brand-text-muted' : 'bg-white border-slate-200 text-slate-500'}`}>
                              📸 {featCaption}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}

                    {/* Ebooks category CTA — funnels to the separate premium
                        ebooks.mindwriter.in site. Matches loosely (contains
                        "ebook") so both "EBOOKS" and "Ebook" from either the
                        Taxonomy dropdown or an older/differently-cased post
                        still show it, rather than requiring an exact string. */}
                    {String(Array.isArray(selectedArticle.category) ? selectedArticle.category[0] : selectedArticle.category || "").toLowerCase().includes("ebook") && (
                      <EbookCTA bookTitle={selectedArticle.keyword || undefined} theme={readerTheme} />
                    )}

                    {/* Editorial disclosure — see the comment on this block for why
                        it exists on every article, not just the About page. */}
                    <div className={`flex items-center gap-2 text-xs mb-6 px-1 ${readerTheme === 'dark' ? 'text-zinc-500' : 'text-slate-500'}`}>
                      <CheckCircle size={13} className="text-emerald-500 flex-shrink-0" />
                      <span>
                        Researched and drafted with AI assistance, reviewed by the MindWriter team
                        {selectedArticle.publishedAt ? ` on ${new Date(selectedArticle.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}.
                      </span>
                    </div>

                    {/* Rebuilt Table of Contents - Minimal, no md:hidden logic */}
                    {activeHeadings.length > 0 && (
                      <div className={`border rounded-2xl p-5 mb-6 ${
                        readerTheme === 'dark' 
                          ? 'border-white/10 bg-white/5 text-white shadow-black/40' 
                          : 'border-slate-200 bg-[#FAF9F6] text-slate-800 shadow-slate-200/50'
                      }`}>
                        <h3 className="text-base sm:text-lg font-bold mb-3 flex items-center gap-2">
                          <List className="h-4 w-4 text-[var(--color-brand-teal)]" />
                          <span className="uppercase tracking-wider text-sm" style={{ fontFamily: "var(--font-mono-ui)" }}>Table of Contents</span>
                        </h3>
                        <div className="flex flex-col gap-2.5 items-start">
                          {activeHeadings.map((h) => (
                            <button 
                              key={h.id}
                              onClick={(e) => {
                                e.preventDefault();
                                scrollToHeading(h.id);
                              }}
                              className={`text-left text-sm transition-all hover:text-[var(--color-brand-teal)] cursor-pointer ${
                                activeHeadingId === h.id 
                                  ? 'text-[var(--color-brand-teal)] font-bold translate-x-1.5' 
                                  : (readerTheme === 'dark' ? 'text-gray-300 hover:translate-x-1' : 'text-slate-600 hover:translate-x-1')
                              } ${h.level > 2 ? 'pl-4 text-xs opacity-90' : ''}`}
                            >
                              {h.text}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {!showAdminDashboard && (
                      <AdSlot slot="in-article" adSlotId={import.meta.env.VITE_ADSENSE_IN_ARTICLE_SLOT} className="mb-8" />
                    )}

                    {/* Main Parsed Content Body */}
                    <div 
                      className={`prose ${readerTheme === 'dark' ? 'prose-invert text-gray-200' : 'prose-zinc text-slate-800'} max-w-none ${
                        readerFontFamily === 'sans' 
                          ? 'font-sans' 
                          : readerFontFamily === 'serif' 
                            ? 'font-serif' 
                            : 'font-display'
                      }`}
                      style={{ fontSize: `${readerFontSize}px`, lineHeight: '1.8' }}
                    >
                      {renderArticleBody(selectedArticle)}

                      {/* Dynamic 'Read also' internal link suggestion appended at the end of content body */}
                      {(() => {
                        const relevantPost = findRelevantInternalLink(selectedArticle);
                        if (!relevantPost) return null;
                        return (
                          <div className={`mt-10 p-5 rounded-[2rem] border transition-all duration-350 hover:scale-[1.005] ${
                            readerTheme === 'dark' 
                              ? 'bg-gradient-to-br from-brand-card/60 to-brand-card/30 border-white/5 hover:border-brand-purple/20 shadow-lg' 
                              : 'bg-gradient-to-br from-slate-50 to-slate-100/50 border-slate-100 hover:border-purple-200 shadow-md'
                          }`}>
                            <p className={`text-[11px] font-black uppercase tracking-[0.2em] mb-2 px-1 flex items-center gap-2 ${
                              readerTheme === 'dark' ? 'text-brand-purple' : 'text-purple-600'
                            }`}>
                              <span className="inline-block w-2 h-2 rounded-full bg-brand-purple animate-pulse"></span>
                              ఇది కూడా చదవండి (Read also)
                            </p>
                            <button 
                              onClick={() => {
                                setSelectedArticle(relevantPost);
                                if (scrollContainerRef.current) {
                                  scrollContainerRef.current.scrollTop = 0;
                                }
                              }}
                              className={`font-bold text-base sm:text-lg text-left hover:underline transition-all block tracking-tight leading-snug cursor-pointer px-1 outline-none deco-brand-purple ${
                                readerTheme === 'dark' ? 'text-white hover:text-brand-purple' : 'text-slate-900 hover:text-purple-700'
                              }`}
                            >
                              👉 {relevantPost.title}
                            </button>
                            <p className={`text-xs sm:text-sm mt-1.5 leading-relaxed line-clamp-2 px-1 ${
                              readerTheme === 'dark' ? 'text-zinc-400' : 'text-slate-500'
                            }`}>
                              {relevantPost.excerpt || "కథనానికి సంబంధించిన పూర్తి విశ్లేషణ మరియు మరిన్ని వివరాల కోసం ఇక్కడ క్లిక్ చేయండి."}
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Article Tags at the End of the Article */}
                    {getArticleTags(selectedArticle).length > 0 && (
                      <div className={`pt-6 pb-2 border-t mt-8 flex flex-wrap items-center gap-2 ${
                        readerTheme === 'dark' ? 'border-white/5' : 'border-slate-100'
                      }`}>
                        <span className={`text-xs font-bold uppercase tracking-wider ${
                          readerTheme === 'dark' ? 'text-zinc-500' : 'text-slate-400'
                        }`}>టాగ్‌లు (Tags):</span>
                        {getArticleTags(selectedArticle).map((tag, tIdx) => (
                          <button
                            key={tIdx}
                            onClick={() => handleTagClick(tag)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide transition-all border cursor-pointer ${
                              readerTheme === 'dark'
                                ? 'bg-white/5 hover:bg-purple-500/20 text-gray-200 hover:text-purple-200 border-white/10'
                                : 'bg-slate-50 hover:bg-brand-purple/10 text-slate-600 hover:text-brand-purple border-slate-200'
                            }`}
                            title={`Filter by tag: ${tag}`}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedArticle && (
                      <Comments 
                        articleSlug={String(selectedArticle.slug?.current || selectedArticle.slug || selectedArticle._id || selectedArticle.id || '')} 
                        isLightMode={readerTheme === 'light'} 
                      />
                    )}

                    {/* Bottom Feature Sharing Card (With Image, Title, Description) */}
                    <div className={`mt-12 p-6 rounded-3xl border shadow-2xl relative overflow-hidden ${
                      readerTheme === 'dark'
                        ? 'bg-gradient-to-br from-brand-card/85 to-brand-purple/10 border-white/10'
                        : 'bg-gradient-to-br from-slate-50 to-brand-purple/5 border-slate-200/80 shadow-slate-100/30'
                    }`}>
                      <div className="absolute right-0 top-0 w-32 h-32 bg-brand-purple/5 rounded-full blur-3xl pointer-events-none" />
                      
                      <div className="flex flex-col md:flex-row gap-6 items-start">
                        {/* Featured Image Thumbnail */}
                        <div className={`w-full md:w-44 aspect-video md:aspect-[4/3] rounded-2xl overflow-hidden shrink-0 border shadow-lg ${
                          readerTheme === 'dark' ? 'border-white/10 bg-black/40' : 'border-slate-200/60 bg-slate-100'
                        }`}>
                          <img 
                            src={selectedArticle.image} 
                            alt={selectedArticle.title} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800';
                            }}
                          />
                        </div>

                        {/* Article Sharing Meta */}
                        <div className="flex-1 space-y-3 min-w-0">
                          <div>
                            <span className="text-[9px] font-black tracking-widest text-brand-purple uppercase bg-brand-purple/20 px-2 py-0.5 rounded-full border border-brand-purple/20">
                              Like this article?
                            </span>
                            <h4 className={`text-lg font-extrabold mt-1.5 leading-snug ${
                              readerTheme === 'dark' ? 'text-white' : 'text-slate-900'
                            }`}>
                              {selectedArticle.title}
                            </h4>
                            <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${
                              readerTheme === 'dark' ? 'text-brand-text-muted' : 'text-slate-600'
                            }`}>
                              {selectedArticle.excerpt || 'ఇటీవలి కాలంలో ఆర్టిఫిషియల్ ఇంటెలిజెన్స్ రంగంలో అద్భుతమైన మార్పులు తీసుకువచ్చే తాజా సమాచారం, ఐديయాలు మరియు విశ్లేషణలను మీ భాగస్వాములతో పంచుకోండి.'}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            {/* WhatsApp button */}
                            <a 
                              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                                `*${selectedArticle.title}*\n\n${selectedArticle.excerpt || ''}\n\nRead more here: ${getShareUrl(selectedArticle)}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-xs font-bold transition-all border border-[#25D366]/20 flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.403.002 9.775-4.366 9.777-9.768.002-2.615-1.017-5.074-2.87-6.928C16.31 2.053 13.848.315 12 1.345 1.302c-5.41.002-9.78 4.37-9.782 9.772-.001 1.764.475 3.483 1.378 4.996l-.968 3.537 3.637-.954zm10.902-6.13c-.301-.15-1.78-.88-2.057-.98-.277-.1-.48-.15-.68.15s-.77.98-.95 1.18c-.17.2-.35.23-.65.08-1.201-.6-2.046-1.12-2.855-2.51-.21-.36.21-.33.6-.11a24.22 24.22 0 0 0 1.29 1.18c.2.14.3.1.4-.08s.1-.4-.2-.5c-.3-.15-1.78-.88-2.057-.98-.277-.1-.48-.15-.68.15s-.77.98-.95 1.18c-.17.2-.35.23-.65.08-1.201-.6-2.046-1.12-2.855-2.51z"/>
                              </svg>
                              <span>WhatsApp</span>
                            </a>

                            {/* Telegram button */}
                            <a 
                              href={`https://t.me/share/url?url=${encodeURIComponent(getShareUrl(selectedArticle))}&text=${encodeURIComponent(
                                `${selectedArticle.title}\n\n${selectedArticle.excerpt || ''}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-[#0088cc]/10 hover:bg-[#0088cc]/20 text-[#0088cc] text-xs font-bold transition-all border border-[#0088cc]/20 flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.18l-1.91 9.02c-.14.63-.52.79-1.05.49l-2.91-2.15-1.4 1.35c-.16.16-.29.29-.44.29l.21-2.94 5.34-4.82c.23-.2-.05-.31-.35-.11l-6.6 4.15-2.85-.89c-.62-.2-.63-.62.13-.91l11.13-4.29c.52-.19.97.12.79.91z"/>
                              </svg>
                              <span>Telegram</span>
                            </a>

                            {/* Pinterest button */}
                            <a 
                              href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(getShareUrl(selectedArticle))}&media=${encodeURIComponent(
                                selectedArticle.image
                              )}&description=${encodeURIComponent(
                                `${selectedArticle.title} - ${selectedArticle.excerpt || selectedArticle.title}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-[#BD081C]/10 hover:bg-[#BD081C]/20 text-[#BD081C] text-xs font-bold transition-all border border-[#BD081C]/20 flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.966 1.406-5.966s-.359-.715-.359-1.777c0-1.664.965-2.906 2.17-2.906 1.023 0 1.517.769 1.517 1.692 0 1.029-.656 2.568-.994 3.993-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.771-2.25 3.771-5.497 0-2.873-2.065-4.882-5.013-4.882-3.414 0-5.418 2.561-5.418 5.204 0 1.03.397 2.133.893 2.734.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.27 1.042-1.002 2.35-1.498 3.146 1.124.347 2.317.535 3.554.535 6.607 0 11.985-5.36 11.985-11.987C23.97 5.39 18.592.022 11.985.022L12.017 0z"/>
                              </svg>
                              <span>Pinterest</span>
                            </a>

                            {/* Reddit button */}
                            <a 
                              href={`https://reddit.com/submit?url=${encodeURIComponent(getShareUrl(selectedArticle))}&title=${encodeURIComponent(
                                `${selectedArticle.title} - ${selectedArticle.excerpt || selectedArticle.title}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-[#FF4500]/10 hover:bg-[#FF4500]/20 text-[#FF4500] text-xs font-bold transition-all border border-[#FF4500]/20 flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M12 0C5.373 0 0 5.373 0 12c0 6.627 5.373 12 12 12 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-.76 1.15c.044.205.066.415.066.626 0 2.53-3.045 4.59-6.791 4.59-3.746 0-6.791-2.06-6.791-4.59 0-.211.022-.421.066-.626a1.25 1.25 0 0 1-.76-1.15c0-.688.562-1.249 1.25-1.249.467 0 .872.259 1.09.642 1.402-.955 3.303-1.572 5.398-1.644l1.13-3.56 3.712.793c.03.486.434.872.93.872a1.25 1.25 0 0 0 1.25-1.25c0-.688-.562-1.25-1.25-1.25a1.248 1.248 0 0 0-1.21.938l-4.04-.863a.151.151 0 0 0-.175.105l-1.25 3.93c-2.13.06-4.07.674-5.49 1.636a1.246 1.246 0 0 0 1.05-.636zm-8.23 6.945c-.596 0-1.082-.486-1.082-1.081 0-.596.486-1.082 1.081-1.082.596 0 1.082.486 1.082 1.081 0 .596-.486 1.082-1.081 1.082zm8.441 0c-.596 0-1.082-.486-1.082-1.081 0-.596.486-1.082 1.081-1.082.596 0 1.082.486 1.082 1.081 0 .596-.486 1.082-1.081 1.082zm-8.49 1.343l.07-.005c.801 0 1.498.17 2.052.486.27-.601.731-1.091 1.303-1.428a.15.15 0 0 0 .048-.204.148.148 0 0 0-.203-.048c-.672.39-1.205.955-1.542 1.657a4.93 4.93 0 0 0-1.728-.458zm8.58 0c-.801-.01-1.52.14-2.083.453-.33-.69-.86-1.25-1.53-1.64a.152.152 0 0 0-.2.05c-.04.06-.04.15 0 .2.57.34 1.03.83 1.3 1.43.55-.31 1.25-.48 2.05-.48l.06.002a.151.151 0 0 0 .17-.13.153.153 0 0 0-.13-.17c-.01 0-.02-.008-.03-.01z"/>
                              </svg>
                              <span>Reddit</span>
                            </a>

                            {/* Facebook button */}
                            <a 
                              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl(selectedArticle))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] text-xs font-bold transition-all border border-[#1877F2]/20 flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                              </svg>
                              <span>Facebook</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    {!showAdminDashboard && (
                      <AdSlot slot="in-article" adSlotId={import.meta.env.VITE_ADSENSE_IN_ARTICLE_END_SLOT} className="my-8" />
                    )}

                    {/* Auto affiliate CTA — appears at the end of every article,
                        no per-article action needed (unlike the manual "Insert
                        Affiliate CTA" button in the Tiptap editor toolbar, which
                        still works for a second, contextual placement mid-article
                        if you want one). Renders nothing until VITE_AFFILIATE_URL
                        is set — same pattern as the AdSense slots above, so this
                        is safe to ship before you've picked an offer. To change
                        what's promoted, edit these VITE_AFFILIATE_* values in
                        Cloudflare Pages' environment variables and redeploy —
                        no code change needed. One offer, site-wide, for now; if
                        you later want this to vary per-article or per-category,
                        that'd move into Sanity as a real field instead of an
                        env var — ask if you want that upgrade. */}
                    {import.meta.env.VITE_AFFILIATE_URL && (
                      <AffiliateCTA
                        eyebrow={import.meta.env.VITE_AFFILIATE_EYEBROW || "Recommended"}
                        title={import.meta.env.VITE_AFFILIATE_TITLE || ""}
                        description={import.meta.env.VITE_AFFILIATE_DESCRIPTION || ""}
                        buttonText={import.meta.env.VITE_AFFILIATE_BUTTON_TEXT || "Learn more"}
                        buttonUrl={import.meta.env.VITE_AFFILIATE_URL}
                        theme={readerTheme}
                      />
                    )}
                    
                    {/* Related Articles */}
                    {(() => {
                      const relatedArticles = approvedPosts.filter(p => {
                        if (p._id === selectedArticle._id || p.id === selectedArticle.id) return false;
                        
                        const pCatStr = Array.isArray(p.category) ? p.category.join(', ') : (p.category || "");
                        const refCatStr = Array.isArray(selectedArticle.category) ? selectedArticle.category.join(', ') : (selectedArticle.category || "");
                        
                        const pCats = pCatStr.split(',').map((c: string) => c.trim().toLowerCase()).filter(Boolean);
                        const refCats = refCatStr.split(',').map((c: string) => c.trim().toLowerCase()).filter(Boolean);
                        
                        return pCats.some((cat: string) => refCats.includes(cat));
                      });

                      if (relatedArticles.length === 0) return null;

                      return (
                        <div className={`pt-8 mt-8 border-t ${readerTheme === 'dark' ? 'border-white/5' : 'border-slate-200/60'}`}>
                          <h3 className={`text-lg font-bold mb-4 ${readerTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>సంబంధిత వార్తలు</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {relatedArticles
                              .slice(0, 4)
                              .map((relatedPost) => (
                                <div 
                                  key={relatedPost._id || relatedPost.id} 
                                  onClick={() => {
                                    setSelectedArticle(relatedPost);
                                    if (scrollContainerRef.current) {
                                      scrollContainerRef.current.scrollTop = 0;
                                    }
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className={`group cursor-pointer flex gap-4 p-3 rounded-xl transition-colors border border-transparent ${
                                    readerTheme === 'dark' 
                                      ? 'hover:bg-white/5 hover:border-white/10' 
                                      : 'hover:bg-slate-50 hover:border-slate-200/50'
                                  }`}
                                >
                                  {relatedPost.image && (
                                    <img 
                                      src={relatedPost.image} 
                                      alt={relatedPost.title} 
                                      className="w-20 h-20 object-cover rounded-lg group-hover:scale-105 transition-transform" 
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  )}
                                  <div className="flex flex-col justify-center">
                                    <h4 className={`font-bold text-sm line-clamp-2 transition-colors mb-1 ${
                                      readerTheme === 'dark' 
                                        ? 'text-white group-hover:text-purple-300' 
                                        : 'text-slate-800 group-hover:text-brand-purple'
                                    }`}>{relatedPost.title}</h4>
                                    <span className="text-[10px] text-brand-text-muted">{relatedPost.date || 'Recent'}</span>
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Extra helpful indicator */}
                    <div className={`pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono ${
                      readerTheme === 'dark' ? 'border-white/5 text-brand-text-muted' : 'border-slate-200/60 text-slate-500'
                    }`}>
                      <span>Article ID: <code className={`px-1 py-0.5 rounded text-[11px] ${
                        readerTheme === 'dark' ? 'bg-black/40 text-brand-purple' : 'bg-slate-100 text-brand-purple border border-slate-200/40'
                      }`}>{selectedArticle.id}</code></span>
                      <span>Powered by Sanity.io Studio</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      )}

      {/* Sticky mobile ad bar — mobile-only. The wrapper itself (border,
          backdrop-blur) only renders when ads are actually configured;
          AdSlot alone returning null wouldn't have been enough here since
          this wrapper's border/background would still show as an empty
          bar at the bottom of every page otherwise. Sits above the
          safe-area so it doesn't collide with iOS home-indicator gestures. */}
      {import.meta.env.VITE_ADSENSE_CLIENT_ID && import.meta.env.VITE_ADSENSE_STICKY_MOBILE_SLOT && !showAdminDashboard && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-brand-bg/95 backdrop-blur border-t border-white/5 pb-[env(safe-area-inset-bottom)]">
          <AdSlot slot="sticky-mobile" adSlotId={import.meta.env.VITE_ADSENSE_STICKY_MOBILE_SLOT} />
        </div>
      )}
    </div>
  );
}
