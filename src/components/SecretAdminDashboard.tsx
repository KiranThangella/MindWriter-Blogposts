import { useState, useEffect, useMemo, FormEvent, useCallback, useRef } from "react";
import { 
  Sparkles, Key, Lock, Unlock, Database, Cpu, Check, 
  RefreshCw, X, AlertCircle, Edit3, CheckCircle, Eye, 
  Globe, Image as ImageIcon, ArrowRight, Loader2, Save, FileText,
  Search, Settings, Layout, History, BarChart, Wand2, Maximize2, Minimize2,
  ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Trash2, Clock, Link as LinkIcon, List, Copy, Menu, Tag, User, MessageCircle, Share2
} from "lucide-react";
import { TiptapEditor, TiptapEditorRef } from "./admin/TiptapEditor";
import { SEOPanel } from "./admin/SEOPanel";
import { HeroImagesManager } from "./admin/HeroImagesManager";
import { AutomationPanel } from "./admin/AutomationPanel";
import { ToolboxPanel } from "./admin/ToolboxPanel";
import { MediaLibrary } from "./admin/MediaLibrary";
import { ToolManager } from "./admin/ToolManager";
import { RealtimeSEOMonitor } from "./admin/RealtimeSEOMonitor";
import { ImageStudio } from "./admin/ImageStudio";
import { NewsEnginePanel } from "./admin/NewsEnginePanel";
import { convertToWebP, saveLocalAsset } from "../lib/localMediaStorage";
import { portableTextToHtml } from "../lib/portableText";
import { safeFetchJson, apiUrl } from "../lib/api";

function getRelevantFallbackPrompt(category?: string, title?: string): string {
  const cat = (category || "technology").trim().toLowerCase();
  const englishWords = (title || "").replace(/[^\x00-\x7F]/g, " ").replace(/\s+/g, " ").trim();
  const themeContext = englishWords.length > 5 ? englishWords : cat;
  
  if (cat.includes("tech") || cat.includes("comput") || cat.includes("softw") || cat.includes("news") || cat.includes("ai")) {
    return `abstract digital futuristic network technology background, neon microchip glowing nodes, creative technology style, high details`;
  }
  if (cat.includes("health") || cat.includes("med") || cat.includes("biolog") || cat.includes("doctor")) {
    return `clean medical science research illustration, microscopic DNA molecular structure or lab equipment close-up, medical concept photography`;
  }
  if (cat.includes("money") || cat.includes("finan") || cat.includes("busin") || cat.includes("market") || cat.includes("bank")) {
    return `modern professional abstract business graphics, glowing bar charts and upward stock candles on dark sleek reflective surface, financial success concept photography`;
  }
  if (cat.includes("space") || cat.includes("astro") || cat.includes("cosm")) {
    return `glorious cosmic deep space scenery with sparkling stars, nebulas, stellar gas clouds, and distant planets, spectacular outer space photography`;
  }
  if (cat.includes("sport") || cat.includes("fit") || cat.includes("run")) {
    return `dynamic active sports concept, stadium lights gleaming through subtle morning haze, athletic energy background, detailed photography`;
  }
  return `beautiful elegant professional conceptual photography of ${themeContext}, with soft clean studio lighting, realistic details, high resolution`;
}

interface SecretAdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  categories: any[];
  existingPosts: any[];
  onPostPublished: (newPost: any) => void;
  onPostDeleted?: (postIds: string[] | string) => void;
  isLightMode?: boolean;
  seoMetadata?: Record<string, { metaTitle?: string; metaDescription?: string; seoScore?: number }>;
  onUpdateSeoMetadata?: (newMeta: Record<string, { metaTitle?: string; metaDescription?: string; seoScore?: number }>) => void;
}

export function calculateSeoScore(metaTitle: string, metaDescription: string, article?: any): number {
  let score = 0;
  
  if (metaTitle && metaTitle.trim().length > 0) {
    score += 25;
    const len = metaTitle.trim().length;
    if (len >= 45 && len <= 65) {
      score += 20;
    } else if (len > 30 && len < 80) {
      score += 10;
    }
  }
  
  if (metaDescription && metaDescription.trim().length > 0) {
    score += 25;
    const len = metaDescription.trim().length;
    if (len >= 120 && len <= 165) {
      score += 20;
    } else if (len > 80 && len < 200) {
      score += 10;
    }
  }

  if (article) {
    const titleLower = (article.title || "").toLowerCase();
    const metaTitleLower = (metaTitle || "").toLowerCase();
    const words = titleLower.split(/\s+/).filter((w: string) => w.length > 4);
    if (words.length > 0) {
      const matchCount = words.filter((word: string) => metaTitleLower.includes(word)).length;
      if (matchCount > 0) {
        score += 10;
      }
    } else {
      score += 10;
    }
  } else {
    score += 10;
  }
  
  return Math.min(Math.max(score, 10), 100);
}

function CopyButton({ text, isLightMode }: { text: string; isLightMode?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };
  return (
    <button
      onClick={handleCopy}
      className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all border shrink-0 cursor-pointer ${
        copied
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          : isLightMode
          ? "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
          : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      {copied ? (
        <>
          <Check size={10} className="text-emerald-400" />
          Copied!
        </>
      ) : (
        <>
          <Copy size={10} />
          Copy Prompt
        </>
      )}
    </button>
  );
}

function getPromptInfo(val: any) {
  if (!val) {
    return {
      prompt: "",
      teluguDescription: "కథనం ఆధారంగా రూపొందించిన అత్యంత అద్భుతమైన దృశ్య చిత్రం",
      englishDescription: "Visual illustration generated from article content context."
    };
  }
  if (typeof val === 'string') {
    return {
      prompt: val,
      teluguDescription: "కథనం ఆధారంగా రూపొందించిన అత్యంత అద్భుతమైన దృశ్య చిత్రం",
      englishDescription: "Visual illustration generated from article content context."
    };
  }
  return {
    prompt: val.prompt || "",
    teluguDescription: val.teluguDescription || "కథనం ఆధారంగా రూపొందించిన అత్యంత అద్భుతమైన దృశ్య చిత్రం",
    englishDescription: val.englishDescription || "Visual illustration generated from article content context."
  };
}

function compressImageToUnder100kb(base64Str: string): Promise<{ base64: string; sizeKb: number; blob: Blob }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      // Was capped at 800px — smaller than the 1024px width AI images are
      // actually generated at, so every image was silently downscaled
      // before any quality compression was even attempted.
      let currentWidth = Math.min(1024, img.naturalWidth || 1024);
      let currentHeight = (currentWidth / img.naturalWidth) * img.naturalHeight;
      let quality = 0.85;

      const attemptCompression = () => {
        const canvas = document.createElement("canvas");
        canvas.width = currentWidth;
        canvas.height = currentHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context initialization failed during auto-compression."));
          return;
        }

        ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
        try {
          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                console.warn("Canvas toBlob failed (likely CORS taint). Passing raw URL.");
                resolve({ base64: base64Str, sizeKb: 10, blob: new Blob([base64Str]) });
                return;
              }

              const sizeKb = blob.size / 1024;
              // Raised from a strict 100KB to 300KB (matches the worker's
              // own compression target) — 100KB for a real 1024x576 photo
              // forced quality all the way down to 0.4 and then started
              // shrinking the canvas itself by 25% per retry, which is
              // what actually produced the visibly blurry/broken images:
              // a detailed AI photo doesn't fit under 100KB without either
              // heavy blocking artifacts or a much smaller canvas.
              if (sizeKb <= 300 || (currentWidth < 50 && currentHeight < 50)) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  resolve({
                    base64: reader.result as string,
                    sizeKb,
                    blob
                  });
                };
                reader.readAsDataURL(blob);
              } else {
                // Floor raised from 0.4 to 0.6 — quality below that looks
                // visibly blocky for photo content, and canvas-shrinking
                // (the old fallback once quality hit 0.4) should only ever
                // be a last resort, not the normal path for a typical
                // AI-generated hero image.
                if (quality > 0.6) {
                  quality -= 0.1;
                } else {
                  currentWidth = Math.floor(currentWidth * 0.85);
                  currentHeight = Math.floor(currentHeight * 0.85);
                  quality = 0.8;
                }
                attemptCompression();
              }
            },
            "image/webp",
            quality
          );
        } catch (e) {
          console.warn("Canvas serialization skipped due to error: ", e);
          resolve({ base64: base64Str, sizeKb: 10, blob: new Blob([base64Str]) });
        }
      };

      attemptCompression();
    };
    img.onerror = () => {
       console.warn("Failed to load source image for compression bounds enforcement.");
       resolve({ base64: base64Str, sizeKb: 10, blob: new Blob([base64Str]) });
    };
    img.src = base64Str;
  });
}

function insertImageIntoHtmlBody(html: string, imageHtml: string, percentage: number): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const container = doc.body;

    // Find any FAQ header
    const headers = Array.from(doc.querySelectorAll("h1, h2, h3, h4, h5, h6"));
    const faqHeader = headers.find(h => {
      const text = (h.textContent || "").toLowerCase();
      return text.includes("faq") || 
             text.includes("frequently asked questions") || 
             text.includes("questions") || 
             text.includes("ప్రశ్నలు") || 
             text.includes("అడిగే");
    });

    // Find all <p> elements in the document that are NOT inside tables, lists, table headers/cells/rows, pre, code or blockquotes
    // and also NOT inside or after the FAQ header section.
    const safeParagraphs = Array.from(doc.querySelectorAll("p")).filter(p => {
      if (p.closest("table, ul, ol, li, td, th, blockquote, pre, code, thead, tbody, tr") !== null) {
        return false;
      }
      if (faqHeader) {
        // If faqHeader is before p, then p is in or after FAQ section, so exclude it
        if (faqHeader.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING) {
          return false;
        }
      }
      return true;
    });

    const imgContainer = doc.createElement("div");
    imgContainer.innerHTML = imageHtml;
    const imgNode = imgContainer.firstElementChild || imgContainer;

    if (safeParagraphs.length > 0) {
      // We have safe paragraphs! Insert after the one closest to the requested percentage
      const targetIdx = Math.max(0, Math.min(safeParagraphs.length - 1, Math.floor(safeParagraphs.length * percentage)));
      const targetParagraph = safeParagraphs[targetIdx];
      targetParagraph.after(imgNode);
      return container.innerHTML;
    }

    // Fallback: Find top-level safe siblings of doc.body that are not table components or list structures
    const safeTopElements = Array.from(container.children).filter(el => {
      const tag = el.tagName.toLowerCase();
      if (["table", "ul", "ol", "li", "td", "th", "pre", "code", "blockquote", "thead", "tbody", "tr"].includes(tag)) {
        return false;
      }
      if (faqHeader) {
        if (el === faqHeader || (faqHeader.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) {
          return false;
        }
      }
      return true;
    });

    if (safeTopElements.length > 0) {
      const targetIdx = Math.max(0, Math.min(safeTopElements.length - 1, Math.floor(safeTopElements.length * percentage)));
      const targetEl = safeTopElements[targetIdx];
      targetEl.after(imgNode);
      return container.innerHTML;
    }

    // Absolute fallback: If no elements found (or all filtered out), insert BEFORE the faqHeader if it exists, otherwise append at the end
    if (faqHeader) {
      faqHeader.before(imgNode);
    } else {
      container.appendChild(imgNode);
    }
    return container.innerHTML;
  } catch (err) {
    console.error("DOMParser image insertion failed, falling back to simple appending:", err);
    return html + "\n" + imageHtml;
  }
}

export function SecretAdminDashboard({ isOpen, onClose, categories, existingPosts: existingPostsProp, onPostPublished, onPostDeleted, isLightMode, seoMetadata = {}, onUpdateSeoMetadata }: SecretAdminDashboardProps) {
  // --- Core Auth & Tab States ---
  const [passcode, setPasscode] = useState("");
  // Admin session used to be stored in localStorage with no expiry and no
  // logout option, which meant that after logging in once, the password
  // screen would never appear again on that browser — anyone with access to
  // the device (or the browser profile) had permanent admin access. This now
  // uses sessionStorage (cleared when the browser/tab closes) plus a 2-hour
  // expiry timestamp, and there's an explicit Lock/Logout button below.
  const ADMIN_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
  const isAdminSessionValid = () => {
    try {
      if (typeof window === 'undefined') return false;
      const expiry = sessionStorage.getItem("admin_session_expiry");
      if (!expiry) return false;
      return Date.now() < parseInt(expiry, 10);
    } catch {
      return false;
    }
  };
  const [isAuthenticated, setIsAuthenticated] = useState(() => isAdminSessionValid());
  const clearAdminSession = () => {
    try {
      sessionStorage.removeItem("admin_session_expiry");
      sessionStorage.removeItem("admin_session_token");
      // Also clear the old, no-longer-used localStorage key from previous
      // versions of this app so any pre-existing permanent session is revoked.
      localStorage.removeItem("admin_session");
    } catch (e) {
      console.warn(e);
    }
    setIsAuthenticated(false);
    setPasscode("");
  };
  const handleLogout = () => {
    clearAdminSession();
    onClose();
  };
  const [authErrorMessage, setAuthErrorMessage] = useState("");
  const [activeView, setActiveView] = useState<"DASHBOARD" | "EDITOR" | "MANAGE" | "GENERATOR" | "SEO" | "MEDIA" | "STUDIO" | "NEWS_ENGINE" | "DRAFTS" | "TOOLS" | "COMMENTS">("DASHBOARD");

  // --- Drafts tab state ---
  // Articles that the News Engine has already fetched/generated and cached
  // server-side in KV (/api/articles/auto) — either from a manual "Generate
  // News" click in some other session, or from the unattended cron cycle.
  // Previously nothing in the frontend ever fetched this endpoint, so these
  // articles existed on the server but were invisible in the dashboard
  // unless you happened to trigger generation yourself in the same tab.
  const [draftArticles, setDraftArticles] = useState<any[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);

  // Accurate total published-article count, from Sanity's count() aggregate
  // — NOT limited by the [0...300] cap on the posts *list* query, unlike
  // existingPosts.length (which only reflects however many posts have been
  // paginated into this browser session so far). Used only for the
  // informational Studio Overview stats; the Manage tab's filter buttons
  // intentionally keep using existingPosts.length since their count must
  // match what's actually visible/filterable in that grid.
  const [totalPublishedCount, setTotalPublishedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    safeFetchJson("/api/posts/count")
      .then((data) => {
        if (typeof data?.total === "number") setTotalPublishedCount(data.total);
      })
      .catch((e) => console.warn("Failed to load accurate post count:", e));
  }, [isAuthenticated]);

  const [fullPublishedPosts, setFullPublishedPosts] = useState<any[]>([]);
  const [fullListPage, setFullListPage] = useState(0);
  const [fullListHasMore, setFullListHasMore] = useState(true);
  const [loadingFullList, setLoadingFullList] = useState(false);
  const [fullListError, setFullListError] = useState<string | null>(null);

  // Loads one page at a time instead of fetching all pages upfront on
  // mount — for a large library (200+ articles), firing 6+ rapid
  // sequential requests the moment the dashboard opened was hitting
  // transient network failures partway through. This mirrors the
  // homepage's own Load More pattern (see loadMorePosts in App.tsx):
  // fast initial paint, more only fetched when actually asked for.
  const loadMoreLibraryPosts = async () => {
    if (loadingFullList || !fullListHasMore) return;
    setLoadingFullList(true);
    setFullListError(null);
    try {
      const nextPage = fullListPage + 1;
      const data = await safeFetchJson(`/api/posts/list?page=${nextPage}&pageSize=40`);
      if (!data?.success) {
        setFullListError(`Request did not return success (got: ${JSON.stringify(data).slice(0, 150)})`);
        return;
      }
      if (data?.posts?.length) {
        setFullPublishedPosts((prev) => {
          const seen = new Set(prev.map((p: any) => String(p._id || p.id)));
          const merged = [...prev];
          for (const p of data.posts) {
            const id = String(p._id || p.id);
            if (!seen.has(id)) merged.push(p);
          }
          return merged;
        });
        setFullListPage(nextPage);
      }
      setFullListHasMore(!!data.hasMore);
    } catch (e: any) {
      console.error("Failed to load more library posts:", e);
      setFullListError(e?.message || String(e));
    } finally {
      setLoadingFullList(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadMoreLibraryPosts();
    }
  }, [isAuthenticated]);

  // The admin dashboard (Manage/SEO/Bulk-tools tabs, and the stat counters
  // used throughout them) previously relied entirely on existingPosts as
  // passed in from App.tsx — which is the SAME `posts` state the public
  // homepage uses, capped to however many pages the homepage's own "Load
  // More" button has fetched in this browser session. That meant Manage
  // could show 40 articles right after a fresh page load and never more,
  // even with 300 actually published. This merges in the complete,
  // independently-paginated fullPublishedPosts fetched above, plus any
  // local-only (not-yet-published) drafts from the original prop, so the
  // admin views always reflect the true full set.
  const existingPosts = useMemo(() => {
    if (fullPublishedPosts.length === 0) return existingPostsProp;
    const localOnly = existingPostsProp.filter((p: any) => p.localOnly);
    const seen = new Set(fullPublishedPosts.map((p: any) => String(p._id || p.id)));
    const dedupedLocal = localOnly.filter((p: any) => !seen.has(String(p._id || p.id)));
    return [...fullPublishedPosts, ...dedupedLocal];
  }, [fullPublishedPosts, existingPostsProp]);

  const [pendingComments, setPendingComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const loadPendingComments = async () => {
    setCommentsLoading(true);
    try {
      const data = await safeFetchJson("/api/comments/admin/pending");
      setPendingComments(Array.isArray(data?.comments) ? data.comments : []);
    } catch (e) {
      console.warn("Failed to load pending comments:", e);
    } finally {
      setCommentsLoading(false);
    }
  };

  const moderateComment = async (id: number, action: "approve" | "spam" | "delete") => {
    try {
      if (action === "delete") {
        await safeFetchJson(`/api/comments/admin/${id}`, { method: "DELETE" });
      } else {
        await safeFetchJson(`/api/comments/admin/${id}/${action}`, { method: "POST" });
      }
      setPendingComments((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.warn(`Failed to ${action} comment:`, e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadPendingComments();
    }
  }, [isAuthenticated]);

  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [exportingSubscribers, setExportingSubscribers] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    safeFetchJson("/api/subscribe/admin/list")
      .then((data) => { if (typeof data?.total === "number") setSubscriberCount(data.total); })
      .catch((e) => console.warn("Failed to load subscriber count:", e));
  }, [isAuthenticated]);

  const exportSubscribersCsv = async () => {
    setExportingSubscribers(true);
    try {
      // Manual fetch (not safeFetchJson, which always parses JSON) so the
      // Bearer token still gets attached but the raw CSV text comes back
      // intact — a plain <a href> or window.open() to this endpoint
      // wouldn't carry the admin auth header at all and would just 401.
      const token = sessionStorage.getItem("admin_session_token");
      const res = await fetch(apiUrl("/api/subscribe/admin/list?format=csv"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const csvText = await res.text();
      const blob = new Blob([csvText], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mindwriter-subscribers.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to export subscribers:", e);
      alert("Export failed.");
    } finally {
      setExportingSubscribers(false);
    }
  };

  const loadDraftArticles = async () => {
    setDraftsLoading(true);
    try {
      const data = await safeFetchJson("/api/articles/auto");
      setDraftArticles(Array.isArray(data?.articles) ? data.articles : []);
    } catch (e) {
      console.error("Failed to load draft articles:", e);
    } finally {
      setDraftsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadDraftArticles();
    }
  }, [isAuthenticated]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedSection, setExpandedSection] = useState<"SEO" | "TOOLS" | "HISTORY" | null>("SEO");

  // --- SEO Manager State ---
  const [seoSearch, setSeoSearch] = useState("");
  const [seoCategoryFilter, setSeoCategoryFilter] = useState("ALL");
  // Library tab (activeView === "MANAGE") status filter — lets the admin
  // narrow "Content Library" down to just Sanity-synced / local-only /
  // pending-approval / approved / SEO-optimized / SEO-needs-work articles
  // instead of always seeing every article in one undifferentiated grid.
  const [librarySearch, setLibrarySearch] = useState("");
  // Simplified from the previous 7-bucket filter (ALL/SYNCED/LOCAL_ONLY/
  // PENDING/APPROVED/SEO_DONE/SEO_TODO) down to two tabs matching how the
  // admin actually thinks about the library: has this been reviewed
  // ("Edited" — approved) or not ("Not Edited" — still a raw/pending
  // draft). Maps directly to the post.approved flag.
  // Defaults to "edited" (not "not_edited") because the server-side filter
  // for "not_edited" only matches posts explicitly flagged approved:false —
  // and the vast majority of real published articles never get that flag
  // set at all (undefined counts as approved everywhere else in this
  // file, e.g. `p.approved !== false` checks). With "not_edited" as the
  // default, opening the Content Library showed almost nothing on first
  // load, which looked like "all articles aren't showing" even though
  // they were all there under the "Edited" tab.
  const [libraryTab, setLibraryTab] = useState<"edited" | "not_edited" | "published">("edited");

  // Library grid now pages through the server (like the homepage's Load
  // More) instead of fetching all 220+ articles upfront — that full-fetch
  // approach was fragile (a single failed page, e.g. from a transient
  // network blip, could leave the grid stuck showing far fewer articles
  // than actually exist) and needed 6+ sequential requests just to open
  // the tab. This loads 40 at a time, filtered server-side by approved
  // status so pagination boundaries stay correct per tab.
  const [libraryPosts, setLibraryPosts] = useState<any[]>([]);
  const [libraryPage, setLibraryPage] = useState(1);
  const [libraryHasMore, setLibraryHasMore] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryLoadingMore, setLibraryLoadingMore] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const loadLibraryPage = async (tab: "edited" | "not_edited" | "published", page: number, append: boolean) => {
    if (append) setLibraryLoadingMore(true); else setLibraryLoading(true);
    setLibraryError(null);
    try {
      const approved = tab === "not_edited" ? "false" : "true";
      const finalized = tab === "published" ? "true" : "false";
      const data = await safeFetchJson(`/api/posts/list?page=${page}&pageSize=40&approved=${approved}&finalized=${finalized}`);
      if (!data?.success) {
        setLibraryError(data?.error || data?.message || "Failed to load articles (no error detail returned).");
        return;
      }
      setLibraryPosts((prev) => (append ? [...prev, ...(data.posts || [])] : (data.posts || [])));
      setLibraryPage(page);
      setLibraryHasMore(!!data.hasMore);
    } catch (e: any) {
      setLibraryError(e?.message || "Failed to load articles.");
    } finally {
      setLibraryLoading(false);
      setLibraryLoadingMore(false);
    }
  };

  // Reload from page 1 whenever the tab changes (search stays client-side
  // over whatever's currently loaded, same as before).
  useEffect(() => {
    if (isAuthenticated) {
      loadLibraryPage(libraryTab, 1, false);
    }
  }, [isAuthenticated, libraryTab]);

  const filteredLibraryPosts = useMemo(() => {
    const q = librarySearch.trim().toLowerCase();
    if (!q) return libraryPosts;
    return libraryPosts.filter((post: any) =>
      (post.title || "").toLowerCase().includes(q) || (post.category || "").toLowerCase().includes(q)
    );
  }, [libraryPosts, librarySearch]);
  const [localSeoEdits, setLocalSeoEdits] = useState<Record<string, { metaTitle: string; metaDescription: string }>>({});
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const getLocalEdits = (postId: string, field: 'title' | 'description', fallbackValue: string) => {
    const edit = localSeoEdits[postId];
    if (edit) {
      return field === 'title' ? edit.metaTitle : edit.metaDescription;
    }
    return fallbackValue || "";
  };

  const updateLocalEdit = (postId: string, field: 'title' | 'description', value: string) => {
    const id = String(postId);
    setLocalSeoEdits(prev => {
      const existing = prev[id] || {
        metaTitle: seoMetadata[id]?.metaTitle || existingPosts.find(p => String(p._id || p.id) === id)?.seoTitle || existingPosts.find(p => String(p._id || p.id) === id)?.title || "",
        metaDescription: seoMetadata[id]?.metaDescription || existingPosts.find(p => String(p._id || p.id) === id)?.seoDescription || existingPosts.find(p => String(p._id || p.id) === id)?.excerpt || ""
      };
      return {
        ...prev,
        [id]: {
          ...existing,
          [field === 'title' ? 'metaTitle' : 'metaDescription']: value
        }
      };
    });
  };



  const handleSavePostSEO = (post: any) => {
    const id = String(post._id || post.id);
    const metaTitle = localSeoEdits[id]?.metaTitle !== undefined 
      ? localSeoEdits[id].metaTitle 
      : (post.seoTitle || post.title || "");
    const metaDescription = localSeoEdits[id]?.metaDescription !== undefined 
      ? localSeoEdits[id].metaDescription 
      : (post.seoDescription || post.excerpt || "");
    
    const computedScore = calculateSeoScore(metaTitle, metaDescription, post);
    
    const updatedMetadata = {
      ...seoMetadata,
      [id]: {
        metaTitle,
        metaDescription,
        seoScore: computedScore
      }
    };
    
    if (onUpdateSeoMetadata) {
      onUpdateSeoMetadata(updatedMetadata);
    }
    
    onPostPublished({
      ...post,
      seoTitle: metaTitle,
      seoDescription: metaDescription,
      seoScore: computedScore
    });

    setSavedStatus(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setSavedStatus(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const handleBulkAutoGenerate = () => {
    setIsBulkProcessing(true);
    setTimeout(() => {
      const updatedEdits = { ...localSeoEdits };
      const updatedMetadata = { ...seoMetadata };
      
      existingPosts.forEach(post => {
        const id = String(post._id || post.id);
        const currentTitle = post.title || "Untitled Article";
        
        const generatedMetaTitle = `${currentTitle.slice(0, 48)} | DeepMind Tech Portal`;
        const rawExcerpt = post.excerpt || "Explore artificial intelligence milestones, product reviews, and tech breakdowns on our platform.";
        const generatedMetaDesc = `${rawExcerpt.slice(0, 140)}... Read the full insights on AI trends.`;
        
        updatedEdits[id] = {
          metaTitle: generatedMetaTitle,
          metaDescription: generatedMetaDesc
        };

        const score = calculateSeoScore(generatedMetaTitle, generatedMetaDesc, post);
        updatedMetadata[id] = {
          metaTitle: generatedMetaTitle,
          metaDescription: generatedMetaDesc,
          seoScore: score
        };

        onPostPublished({
          ...post,
          seoTitle: generatedMetaTitle,
          seoDescription: generatedMetaDesc,
          seoScore: score
        });
      });

      setLocalSeoEdits(updatedEdits);
      if (onUpdateSeoMetadata) {
        onUpdateSeoMetadata(updatedMetadata);
      }
      setIsBulkProcessing(false);
      alert("AI Metadata Auto-generated and applied to local fields successfully!");
    }, 800);
  };

  const handleBulkSave = () => {
    setIsBulkProcessing(true);
    setTimeout(() => {
      const updatedMetadata = { ...seoMetadata };
      
      existingPosts.forEach(post => {
        const id = String(post._id || post.id);
        const edit = localSeoEdits[id];
        
        const metaTitle = edit?.metaTitle !== undefined ? edit.metaTitle : (post.seoTitle || post.title || "");
        const metaDescription = edit?.metaDescription !== undefined ? edit.metaDescription : (post.seoDescription || post.excerpt || "");
        
        const score = calculateSeoScore(metaTitle, metaDescription, post);
         
        updatedMetadata[id] = {
          metaTitle,
          metaDescription,
          seoScore: score
        };

        onPostPublished({
          ...post,
          seoTitle: metaTitle,
          seoDescription: metaDescription,
          seoScore: score
        });
      });

      if (onUpdateSeoMetadata) {
        onUpdateSeoMetadata(updatedMetadata);
      }
      setIsBulkProcessing(false);
      alert("All titles and descriptions bulk-saved and scores recalculated!");
    }, 800);
  };

  // --- Content State ---
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editExcerpt, setEditExcerpt] = useState("");
  const [editBody, setEditBody] = useState(""); // This is HTML from Tiptap
  const [editCategory, setEditCategory] = useState("AI NEWS");
  const [editPublishedAt, setEditPublishedAt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  // E-E-A-T: a real named author (with a short bio) is a trust signal Google
  // looks for over a generic "MindWriter Editorial Team" byline. Both are
  // optional — when left blank, article schema falls back to the Editorial
  // Team organization author exactly as before (see src/lib/seo-meta.ts).
  const [authorName, setAuthorName] = useState("");
  const [authorBio, setAuthorBio] = useState("");
  // Meta Title/Description live directly on the editor now instead of only
  // in the separate SEO table's localStorage-backed `seoMetadata` — that
  // indirection was why they weren't reliably reaching Sanity: articles
  // published straight from this editor never touched that other table, so
  // publishArticle's `seoMetadata[editId]?.metaTitle` lookup came back
  // empty even when the admin had typed something moments earlier.
  const [editMetaTitle, setEditMetaTitle] = useState("");
  const [editMetaDescription, setEditMetaDescription] = useState("");
  const [isGeneratingFeaturedImageMeta, setIsGeneratingFeaturedImageMeta] = useState(false);
  const [mediaSelectMode, setMediaSelectMode] = useState<"featured" | "content">("featured");
  const [keyword, setKeyword] = useState("");
  const [editMetaTags, setEditMetaTags] = useState<any[]>([]);
  const [editSecondaryKeywords, setEditSecondaryKeywords] = useState<string[]>([]);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [isSuggestingKeyword, setIsSuggestingKeyword] = useState(false);
  const [isSuggestingViralTitle, setIsSuggestingViralTitle] = useState(false);

  // --- Generator State ---
  const [genKeyword, setGenKeyword] = useState("");
  const [genPrompt, setGenPrompt] = useState("");
  const [genCategory, setGenCategory] = useState("AI NEWS");
  // Only used in EBOOK PROMOTION MODE — when set, the backend fetches this
  // page and grounds the teaser article in the ebook's real content instead
  // of guessing from the title alone (see EBOOK block in articles-ai.ts).
  const [genEbookUrl, setGenEbookUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpertEngine, setIsExpertEngine] = useState(false);
  const [isComparisonEngine, setIsComparisonEngine] = useState(true);
  const [generatedResult, setGeneratedResult] = useState<any | null>(null);

  const [isAiGenerated, setIsAiGenerated] = useState(false);

  // --- Matching Image Prompts Generator State ---
  const [isGeneratingImagePrompts, setIsGeneratingImagePrompts] = useState(false);
  const [isGeneratingMetaImage, setIsGeneratingMetaImage] = useState(false);
  const [generatedImagePrompts, setGeneratedImagePrompts] = useState<{
    featured: any;
    content1: any;
    content2: any;
    content3: any;
  } | null>(null);
  const [showImagePromptsModal, setShowImagePromptsModal] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [generatingSpecialKeys, setGeneratingSpecialKeys] = useState<Record<string, boolean>>({});
  const [embeddedImages, setEmbeddedImages] = useState<Record<string, { url: string; sizeKb: number }>>({});

  // --- External Refs ---
  const editorRef = useRef<TiptapEditorRef>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  // Previously each AI Lab action (Rewrite/Expand/etc, Internal Linking,
  // Image Generation, Keyword/Tags/Viral-Title suggestions) only disabled
  // its OWN button while running — nothing stopped an admin from clicking
  // e.g. "Smart Link (AI)" while "Gen Magic Image Prompt" was still
  // in-flight. Both write into the same editBody/editTitle/image* state
  // when they resolve, so overlapping calls raced to overwrite each
  // other's result (and the network layer sometimes surfaced this as a
  // confusing immediate-looking error on the second click, even though
  // the real problem was the first request still legitimately running).
  // This combines every content-mutating AI action's loading flag into
  // one lock, so only one can run at a time — everything else stays
  // disabled until it finishes (success OR failure resets it, via each
  // action's existing `finally` block).
  const isAiLabBusy =
    isEnhancing ||
    isLinking ||
    isGeneratingMetaImage ||
    isGeneratingImagePrompts ||
    isGeneratingFeaturedImageMeta ||
    isGeneratingTags ||
    isSuggestingKeyword ||
    isSuggestingViralTitle;
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<any[]>([]);

  // --- Sanity Configs ---
  // Deliberately NOT persisted to localStorage (see the useEffect below,
  // and the git history/comment there) — these are in-memory-only,
  // same-session overrides. The real, recommended way to configure Sanity
  // access is the server-side config (Settings tab -> Save), which every
  // publish/upload route already falls back to via resolveSanityContext
  // when these client-side fields are empty.
  const [sanityWriteToken, setSanityWriteToken] = useState("");
  const [sanityProjectId, setSanityProjectId] = useState("");
  const [sanityDataset, setSanityDataset] = useState("production");

  const [isSavingSanityConfig, setIsSavingSanityConfig] = useState(false);
  const [sanityConfigSaveStatus, setSanityConfigSaveStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [imageMigrationStatus, setImageMigrationStatus] = useState<{ running: boolean; migrated: number; remaining: number | null; error?: string; done?: boolean }>({ running: false, migrated: 0, remaining: null });
  const [serverSanityConfigured, setServerSanityConfigured] = useState<boolean | null>(null);
  const [isVerifyingPasscode, setIsVerifyingPasscode] = useState(false);

  // Check on mount whether the backend already has a Sanity config saved
  // server-side (KV), so the Settings UI can show its actual current state
  // rather than only ever reflecting this browser's localStorage.
  useEffect(() => {
    (async () => {
      try {
        const data = await safeFetchJson("/api/admin/get-sanity-config");
        if (data.success) {
          setServerSanityConfigured(!!data.config.projectId && !!data.config.hasToken);
          // Adopt the server's saved projectId/dataset into local state (and
          // localStorage, via the setters below) so a brand-new browser/device
          // doesn't show blank fields and force the admin to re-type values
          // that are already saved server-side. The write token itself is
          // intentionally never sent back by this endpoint (security), so it
          // still needs to be re-entered here only if the admin wants to
          // change it — but it is NOT required for publish/delete/upload
          // actions to work, since the backend already falls back to its own
          // KV-saved token automatically.
          if (data.config.projectId && !sanityProjectId) {
            setSanityProjectId(data.config.projectId);
          }
          if (data.config.dataset && !sanityDataset) {
            setSanityDataset(data.config.dataset);
          }
        }
      } catch {
        setServerSanityConfigured(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSanityConfigToServer = async () => {
    setIsSavingSanityConfig(true);
    setSanityConfigSaveStatus(null);
    try {
      const data = await safeFetchJson("/api/admin/save-sanity-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: sanityProjectId || undefined,
          dataset: sanityDataset || undefined,
          token: sanityWriteToken || undefined,
        }),
      });
      if (data.success) {
        setSanityConfigSaveStatus({ type: "success", text: "సర్వర్‌లో సేవ్ చేయబడింది — ఇకపై ఏ డివైజ్/బ్రౌజర్ నుండైనా పనిచేస్తుంది! (Saved to server — now works from any device/browser.)" });
        setServerSanityConfigured(true);
      } else {
        setSanityConfigSaveStatus({ type: "error", text: data.error || "Failed to save." });
      }
    } catch (e: any) {
      setSanityConfigSaveStatus({ type: "error", text: e.message || "Failed to save." });
    } finally {
      setIsSavingSanityConfig(false);
    }
  };

  const [isPublishing, setIsPublishing] = useState(false);
  const [shareSubreddit, setShareSubreddit] = useState("");
  const [sharingPlatform, setSharingPlatform] = useState<string | null>(null);
  const [shareResults, setShareResults] = useState<Record<string, { success: boolean; error?: string; postUrl?: string }>>({});
  const [isUploading, setIsUploading] = useState(false);

  // --- Batch Publishing Configs ---
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [isBatchPublishing, setIsBatchPublishing] = useState(false);
  const [batchPublishProgress, setBatchPublishProgress] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetchingEditContent, setIsFetchingEditContent] = useState(false);
  const [togglingApprovedId, setTogglingApprovedId] = useState<string | null>(null);
  const localOnlyPosts = existingPosts.filter((p: any) => p.localOnly === true);

  // --- Auto-Save Effect ---
  useEffect(() => {
    if (!isAuthenticated || !editTitle) return;
    const timer = setTimeout(() => {
      handleAutoSave();
    }, 30000); // 30 seconds
    return () => clearTimeout(timer);
  }, [editTitle, editBody, editExcerpt, isAuthenticated]);

  // --- Load Revisions ---
  useEffect(() => {
    if (editId) {
      try {
        const saved = localStorage.getItem(`revisions_${editId}`);
        if (saved) setRevisions(JSON.parse(saved));
      } catch (e) {
        console.warn("Failed to load revisions:", e);
      }
    }
  }, [editId]);

  const getWordCount = useCallback((body: any) => {
    if (typeof body !== 'string') return 0;
    // Strip HTML tags to extract actual text content
    const cleanText = body.replace(/<\/?[^>]+(>|$)/g, " ");
    return cleanText.split(/\s+/).filter(word => word.length > 0 && !word.startsWith("<")).length;
  }, []);

  const safeLocalStorageSetItem = useCallback((key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22 || String(e).includes('QuotaExceededError') || e.code === 1014) {
        console.warn(`[Storage Quota Exceeded] Running recovery mechanism for key: ${key}`);
        
        // Step 0: Immediately remove the problematic key to free up its space
        try {
          localStorage.removeItem(key);
        } catch (err) {
          console.warn(`[Storage Quota Recovery] Failed to remove key: ${key}`, err);
        }
        
        // Step 1: Try to clear space by removing older article revision keys
        try {
          const keys = Object.keys(localStorage);
          const revisionKeys = keys.filter(k => k.startsWith("revisions_"));
          if (revisionKeys.length > 0) {
            console.log(`[Storage Quota Recovery] Pruning ${revisionKeys.length} older revision history keys to make space.`);
            revisionKeys.forEach(revK => {
              try {
                localStorage.removeItem(revK);
              } catch {}
            });
            
            // Try saving original value again after pruning
            try {
              localStorage.setItem(key, value);
              console.log(`[Storage Save Retry] Successfully saved original data after clearing revision keys.`);
              return;
            } catch (retryErr) {
              console.warn(`[Storage Save Retry] Save still failed after pruning revisions. Proceeding to non-critical key cleanup.`);
            }
          }
        } catch (pruneErr) {
          console.warn(`[Storage Quota Prune Error] Failed while pruning keys:`, pruneErr);
        }

        // Step 1.5: Pruning other non-essential storage keys (caches, old local drafts) to resolve quota failure
        try {
          const keys = Object.keys(localStorage);
          const transientKeys = keys.filter(k => 
            k === "local_ai_drafts" || 
            k === "SANITY_ALT_TEXT_CACHE" || 
            k === "SANITY_CAPTION_CACHE" || 
            k === "SANITY_DESCRIPTION_CACHE"
          );
          if (transientKeys.length > 0) {
            console.warn(`[Storage Quota Recovery] Pruning cached metadata / old local drafts:`, transientKeys);
            transientKeys.forEach(transK => {
              try {
                localStorage.removeItem(transK);
              } catch {}
            });

            // Try saving original value again after pruning caches and drafts
            try {
              localStorage.setItem(key, value);
              console.log(`[Storage Save Retry] Successfully saved original data after clearing transient caches/drafts.`);
              return;
            } catch (retryErr) {
              console.warn(`[Storage Save Retry] Save still failed after full transient cache prune. Proceeding to base64 minimization.`);
            }
          }
        } catch (transientPruneErr) {
          console.warn(`[Storage Quota Transient Prune Error] Failed while pruning transient keys:`, transientPruneErr);
        }

        // Step 2: Create the minimized value by stripping/replacing base64 images with tiny placeholders
        try {
          const smallMime = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
          const minimizedVal = value.replace(/data:image\/[^;]+;base64,[^"'\s\)]+/gi, smallMime);
          
          try {
            localStorage.setItem(key, minimizedVal);
            console.log(`[Storage Save Retry] Successfully saved minimized content layout for key: ${key}`);
            return;
          } catch (minimizeErr) {
            console.warn(`[Storage Save Retry] Minimized content also exceeded quota. Proceeding to safe structural truncation.`);
          }
        } catch (minErr) {
          console.warn("[Storage Minimization Process Error] Error cleaning base64 strings:", minErr);
        }

        // Step 3: Ultimate Fallback: Parse the JSON (if it is a JSON draft), find the editBody, and strip or truncate it severely
        // while preserving all important metadata fields.
        try {
          if (value.startsWith("{") && value.endsWith("}")) {
            const parsed = JSON.parse(value);
            if (parsed.editBody !== undefined) {
              parsed.editBody = "<p>[కంటెంట్ చాలా పెద్దదిగా ఉండడం వల్ల లోకల్ స్టోరేజ్ కోటాను దాటిపోయింది. కాపీయింగ్ రికవరీ కోసం ఈ డ్రాఫ్ట్ మెటాడేటా మాత్రమే భద్రపరచబడింది.]</p>";
              const metadataOnlyJson = JSON.stringify(parsed);
              localStorage.setItem(key, metadataOnlyJson);
              console.warn(`[Storage Save Recovery] Safely persisted draft metadata and truncated body for draft draft_id: ${parsed.editId || 'unknown'}`);
              return;
            }
          }
          
          // If it is revisions list (JSON array), truncate arrays/values.
          if (value.startsWith("[") && value.endsWith("]")) {
            const parsedArray = JSON.parse(value);
            if (Array.isArray(parsedArray) && parsedArray.length > 0) {
              // Keep only the single latest item title/time, empty body
              const trimmedArray = parsedArray.slice(0, 1).map((item: any) => ({
                ...item,
                content: "[Revisions cleared to free storage space]"
              }));
              localStorage.setItem(key, JSON.stringify(trimmedArray));
              console.warn(`[Storage Save Recovery] Safely truncated revisions array for key: ${key}`);
              return;
            }
          }
        } catch (structuralErr) {
          console.warn("[Storage Failure] Structural fallback failed, clearing key to prevent looping:", structuralErr);
          try {
            localStorage.removeItem(key);
          } catch (delErr) {
            console.warn(delErr);
          }
        }
      } else {
        console.warn("[Storage Write Failure]", e);
      }
    }
  }, []);

  const handleAutoSave = useCallback(() => {
    const draft = {
      editId, editTitle, editSlug, editExcerpt, editBody, editCategory, imageUrl, timestamp: new Date().toISOString()
    };
    safeLocalStorageSetItem("admin_last_draft", JSON.stringify(draft));
    
    // Save to revisions if changed significantly (simplified logic)
    if (editId) {
       const revKey = `revisions_${editId}`;
       let existing = [];
       try {
         existing = JSON.parse(localStorage.getItem(revKey) || "[]");
       } catch (err) {
         existing = [];
       }
       // Strip massive inline base64 images from content of the historical revision to save precious local storage size
       const tinyRevBody = editBody ? editBody.replace(/data:image\/[^;]+;base64,[^"'\s\)]+/gi, "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=") : "";
       const newRev = { content: tinyRevBody, title: editTitle, timestamp: new Date().toISOString() };
       const updated = [newRev, ...existing].slice(0, 10); // Keep only 10 historical items
       safeLocalStorageSetItem(revKey, JSON.stringify(updated));
       setRevisions(updated);
    }
    
    setLastSaved(new Date().toLocaleTimeString());
  }, [editId, editTitle, editSlug, editExcerpt, editBody, editCategory, imageUrl, safeLocalStorageSetItem]);

  // The wrapping <div> below (search "scale-95 pointer-events-none") has a
  // 500ms opacity/scale transition meant to play when the dashboard closes
  // — but that only works if the component is still in the DOM while the
  // "closing" (opacity-0) class variant renders. Previously this returned
  // null the instant `isOpen` flipped to false, unmounting immediately and
  // skipping the transition entirely (an abrupt cut, not a smooth close).
  // `shouldRender` stays true for one extra 500ms after isOpen goes false,
  // giving the CSS transition time to actually play before removal.
  const [shouldRender, setShouldRender] = useState(isOpen);
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      return;
    }
    const timer = setTimeout(() => setShouldRender(false), 500);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    const { overflow, position, top, width } = document.body.style;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.position = position;
      document.body.style.top = top;
      document.body.style.width = width;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  if (!shouldRender) return null;

  // --- Actions ---
  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthErrorMessage("");
    setIsVerifyingPasscode(true);
    try {
      // Password check moved server-side (see backend /api/admin/verify-password).
      // The old version compared against a literal string baked into this
      // bundle, visible to anyone in browser devtools — this checks against
      // a real secret on the Worker instead, with server-side rate limiting.
      const data = await safeFetchJson("/api/admin/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });

      if (data.success) {
        setIsAuthenticated(true);
        try {
          sessionStorage.setItem("admin_session_expiry", String(Date.now() + ADMIN_SESSION_TTL_MS));
          // The token itself — every admin-only backend route now requires
          // this as a Bearer token (see worker/src/middleware/admin-auth.ts).
          // Previously the backend had no way to tell an authenticated
          // admin request apart from anyone who just found the API URL.
          if (data.token) {
            sessionStorage.setItem("admin_session_token", data.token);
          }
        } catch (e) {
          console.warn(e);
        }
      } else {
        setAuthErrorMessage(data.error || "Incorrect password.");
      }
    } catch (err: any) {
      console.error("Admin auth check failed:", err);
      // Surface the real reason (e.g. "Admin authentication is not
      // configured on the server." when ADMIN_PASSWORD was never set via
      // `wrangler secret put`, or "Too many attempts..." when rate-limited)
      // instead of a generic message that looks identical for every cause,
      // including a genuinely correct password hitting a server-side issue.
      setAuthErrorMessage(err?.message || "Verification failed. Please try again.");
    } finally {
      setIsVerifyingPasscode(false);
    }
  };

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!genKeyword) return alert("Please enter a keyword.");
    setIsGenerating(true);
    try {
      const data = await safeFetchJson("/api/articles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: genKeyword, prompt: genPrompt, category: genCategory, isExpertEngine, isComparisonEngine, ebookUrl: genEbookUrl || undefined })
      });
      if (data.success) {
        const draft = {
          ...data.data,
          id: `draft-${Date.now()}`
        };
        let drafts = [];
        try {
          drafts = JSON.parse(localStorage.getItem('local_ai_drafts') || '[]');
        } catch {
          drafts = [];
        }
        drafts.push(draft);
        try {
          localStorage.setItem('local_ai_drafts', JSON.stringify(drafts));
        } catch (e) {
          console.warn(e);
        }

        setGeneratedResult({
          ...data.data,
          provider: data.provider
        });
      } else {
        const errorMsg = data.details ? `${data.error}\n\nDetails: ${data.details}` : data.error || "Generation failed.";
        alert(errorMsg);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error calling generator.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendToEditor = () => {
    if (!generatedResult) return;
    setEditId(null);
    setEditTitle(generatedResult.title);
    setEditSlug(generatedResult.slug);
    setEditExcerpt(generatedResult.excerpt);
    
    // Ignore the AI generated URLs because they are hallucinations.
    // Use a random placeholder from picsum based on the article's keyword length just for variety.
    const randomId = Math.floor(Math.random() * 1000);
    setImageUrl(`https://picsum.photos/seed/${randomId}/800/500`);
    
    // The API generators now return purely HTML text, so we can just use the body text.
    let html = (generatedResult.bodyText || "").trim();
    // Strip markdown codeblock backticks if the AI accidentally added them
    html = html.replace(/^```html\s*/i, '').replace(/\s*```$/i, '').trim();
    
    // Parse Markdown Tables to HTML Tables if present
    html = html.replace(/((?:\|.+?\|(?:\n|\r\n?))+)/g, (match) => {
       const lines = match.trim().split('\n');
       const numCols = lines[0].split('|').length - 2;
       // Is second line a separator?
       const secondLine = lines[1] || '';
       if (secondLine.includes('---')) {
          const header = lines[0].split('|').slice(1, -1).map(c => `<th><p>${c.trim()}</p></th>`).join('');
          const body = lines.slice(2).map(line => {
             return `<tr>${line.split('|').slice(1, -1).map(c => `<td><p>${c.trim()}</p></td>`).join('')}</tr>`;
          }).join('');
          return `<table><tbody><tr>${header}</tr>${body}</tbody></table>`;
       }
       return match;
    });

    if (!html.startsWith('<')) {
       // Only fallback if the AI somehow still outputs some plain text
       html = `<p>${html.replace(/\n\n/g, '</p><p>')}</p>`;
    }
    
    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    
    setEditBody(html);
    setEditCategory(genCategory);
    setKeyword(genKeyword);
    if (generatedResult.metaTags) setEditMetaTags(generatedResult.metaTags);
    if (generatedResult.secondaryKeywords) setEditSecondaryKeywords(generatedResult.secondaryKeywords);
    setIsAiGenerated(true);
    setActiveView("EDITOR");
    setGeneratedResult(null);
  };

  const handleSaveToDrafts = () => {
    if (!generatedResult) return;
    const draft = {
      ...generatedResult,
      id: `draft-${Date.now()}`
    };
    let drafts = [];
    try {
      drafts = JSON.parse(localStorage.getItem('local_ai_drafts') || '[]');
    } catch {
      drafts = [];
    }
    drafts.push(draft);
    try {
      localStorage.setItem('local_ai_drafts', JSON.stringify(drafts));
    } catch (e) {
      console.warn(e);
    }
    setGeneratedResult(null);
    alert("Draft saved!");
  };

  const handleAnalyze = async () => {
    if (!editBody) return;
    setIsAnalyzing(true);
    try {
      const data = await safeFetchJson("/api/articles/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editBody, title: editTitle, keyword })
      });
      if (data.success) setAnalysis(data.analysis);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error analyzing content.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Asks the AI backend for a set of relevant SEO tags/keywords based on the
  // current title, excerpt, and body, then merges them into editSecondaryKeywords
  // (deduping against tags already present).
  const handleGenerateTags = async () => {
    if (!editTitle && !editBody) {
      alert("Tags generate చేయాలంటే ముందు title లేదా content రాయండి.");
      return;
    }
    setIsGeneratingTags(true);
    try {
      const data = await safeFetchJson("/api/articles/generate-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          excerpt: editExcerpt,
          content: editBody,
          category: editCategory,
          keyword
        })
      });
      if (data.success && Array.isArray(data.tags)) {
        setEditSecondaryKeywords(prev => {
          const existingLower = new Set(prev.map(t => t.toLowerCase().trim()));
          const merged = [...prev];
          data.tags.forEach((t: string) => {
            const clean = String(t || "").trim();
            if (clean && !existingLower.has(clean.toLowerCase())) {
              merged.push(clean);
              existingLower.add(clean.toLowerCase());
            }
          });
          return merged.slice(0, 12);
        });
      } else {
        alert(data.error || "Tags generate చేయడంలో సమస్య వచ్చింది.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error generating tags.");
    } finally {
      setIsGeneratingTags(false);
    }
  };

  const handleAddManualTag = () => {
    const clean = tagInput.trim();
    if (!clean) return;
    setEditSecondaryKeywords(prev => {
      if (prev.some(t => t.toLowerCase() === clean.toLowerCase())) return prev;
      return [...prev, clean];
    });
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditSecondaryKeywords(prev => prev.filter(t => t !== tagToRemove));
  };

  // Generates both alt text and caption for the CURRENT featured image (by
  // URL) in one go — used by the GENERATE button next to the featured image
  // fields, for images that were set via URL paste or came from before this
  // auto-fill existed.
  const handleGenerateFeaturedImageMeta = async () => {
    if (!imageUrl) {
      alert("ముందు ఒక featured image select చేయండి.");
      return;
    }
    setIsGeneratingFeaturedImageMeta(true);
    try {
      const data = await safeFetchJson("/api/articles/generate-alt-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: imageUrl, keyword: keyword || "" })
      });
      if (data.success) {
        if (data.altText) setImageAlt(data.altText);
        if (data.caption) setImageCaption(data.caption);
      } else {
        alert(data.error || "Alt text / caption generate చేయడంలో సమస్య వచ్చింది.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error generating alt text / caption.");
    } finally {
      setIsGeneratingFeaturedImageMeta(false);
    }
  };

  // Asks the AI backend to suggest the single best SEO focus keyword for the
  // current article (title/excerpt/body/category), and fills it into the
  // Focus Keyword field. No real search-volume/competition data is used —
  // this is a content-based suggestion only (see chat notes).
  const handleSuggestViralTitle = async () => {
    if (!editTitle && !editBody) {
      alert("Viral title generate చేయాలంటే ముందు title లేదా content రాయండి.");
      return;
    }
    setIsSuggestingViralTitle(true);
    try {
      const data = await safeFetchJson("/api/articles/suggest-viral-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          excerpt: editExcerpt,
          content: editBody,
          category: editCategory
        })
      });
      if (data.success && data.title) {
        setEditTitle(data.title);
      } else {
        alert(data.error || "Viral title generate చేయడంలో సమస్య వచ్చింది.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error generating viral title.");
    } finally {
      setIsSuggestingViralTitle(false);
    }
  };

  const handleSuggestKeyword = async () => {
    if (!editTitle && !editBody) {
      alert("Keyword suggest చేయాలంటే ముందు title లేదా content రాయండి.");
      return;
    }
    setIsSuggestingKeyword(true);
    try {
      const data = await safeFetchJson("/api/articles/suggest-keyword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          excerpt: editExcerpt,
          content: editBody,
          category: editCategory
        })
      });
      if (data.success && data.keyword) {
        setKeyword(data.keyword);
        if (data.slug && !editSlug.trim()) {
          setEditSlug(data.slug);
        }
      } else {
        alert(data.error || "Keyword suggest చేయడంలో సమస్య వచ్చింది.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error suggesting keyword.");
    } finally {
      setIsSuggestingKeyword(false);
    }
  };

  // --- Auto Focus-Keyword & Slug Suggestion (new drafts only) ---
  // Only fires when this is a fresh, unpublished draft (editId is null) and
  // BOTH the focus keyword and slug are still empty — the moment the admin
  // types their own keyword or slug (or a previous auto-suggestion already
  // filled them in), this condition stops being true and auto-suggestion
  // naturally never overwrites anything again.
  useEffect(() => {
    if (editId || isSuggestingKeyword) return;
    if (keyword.trim() || editSlug.trim()) return;
    const cleanBodyLen = editBody.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().length;
    const hasEnoughContent = editTitle.trim().length >= 8 || cleanBodyLen >= 40;
    if (!hasEnoughContent) return;

    const timer = setTimeout(() => {
      handleSuggestKeyword();
    }, 2000); // wait for typing to pause
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTitle, editBody, editId, keyword, editSlug, isSuggestingKeyword]);

  const handleImageUpload = async (file: File): Promise<{ url: string; altText: string; caption: string } | null> => {
    setIsUploading(true);
    try {
      // 1. Convert file to WebP and compress
      const webpResult = await convertToWebP(file);
      
      // 2. Save WebP compressed image to local IndexedDB library
      const localAssetId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      await saveLocalAsset({
        id: localAssetId,
        name: file.name.replace(/\.[^/.]+$/, "") + ".webp",
        originalSize: file.size,
        compressedSize: webpResult.compressedSize,
        compressionRatio: webpResult.ratio,
        mimeType: "image/webp",
        dataUrl: webpResult.base64
      });

      // 3. Always attempt to sync to Sanity CDN via the backend. The
      //    backend uses its own server-side saved config (Settings tab ->
      //    Save to Server) when this browser has no localStorage values,
      //    so this should no longer be gated on local credentials being
      //    present — only on the upload itself succeeding or failing.
      {
        const compressedFile = new File([webpResult.blob], `${file.name.replace(/\.[^/.]+$/, "")}.webp`, { type: "image/webp" });
        const formData = new FormData();
        formData.append("file", compressedFile);
        if (sanityProjectId) formData.append("projectId", sanityProjectId);
        if (sanityDataset) formData.append("dataset", sanityDataset);
        if (sanityWriteToken) formData.append("token", sanityWriteToken);
        // Pass the article's current focus keyword so alt-text generation can
        // work it in naturally when it genuinely matches what's in the image.
        if (keyword) formData.append("keyword", keyword);

        const data = await safeFetchJson("/api/articles/upload-asset", {
          method: "POST",
          body: formData
        });
        
        if (data.success) {
          return { url: data.url, altText: data.altText || "", caption: data.caption || "" };
        } else {
          console.warn("Cloud publish failed, using local browser cache fallback:", data.error);
          // Fallback to local base64 so editors don't break!
          return { url: webpResult.base64, altText: "", caption: "" };
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error uploading image.");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleToolAction = async (action: string) => {
    if (isAiLabBusy) return;
    setIsEnhancing(true);
    try {
      // 1. Get raw selection from editor and clean it
      const rawSelection = editorRef.current?.getSelection();
      const selectedText = (typeof rawSelection === 'string') ? rawSelection.trim() : "";
      console.log(`Tool Action: ${action}, Selection length: ${selectedText.length}`);
      
      // 2. Perform optimistic client-side payload validation
      if (!editBody && !selectedText) {
        alert("Cannot process action: The article body is empty and there is no text selected in the editor. Please write or select some content first.");
        setIsEnhancing(false);
        return;
      }

      const data = await safeFetchJson("/api/articles/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action, 
          content: editBody || "", 
          targetText: selectedText 
        })
      });
      
      if (!data || typeof data !== 'object') {
        throw new Error("The backend returned an unexpected empty payload format.");
      }

      if (data.success) {
        let resultString = typeof data.result === 'string' ? data.result : '';
        if (!resultString) {
          throw new Error("The AI successfully processed the task, but returned no content output.");
        }

        resultString = resultString.replace(/^```html\s*/i, '').replace(/\s*```$/i, '').trim();
        resultString = resultString.replace(/((?:\|.+?\|(?:\n|\r\n?))+)/g, (match: string) => {
           const lines = match.trim().split('\n');
           const secondLine = lines[1] || '';
           if (secondLine.includes('---')) {
              const header = lines[0].split('|').slice(1, -1).map((c: string) => `<th><p>${c.trim()}</p></th>`).join('');
              const body = lines.slice(2).map((line: string) => {
                 return `<tr>${line.split('|').slice(1, -1).map((c: string) => `<td><p>${c.trim()}</p></td>`).join('')}</tr>`;
              }).join('');
              return `<table><tbody><tr>${header}</tr>${body}</tbody></table>`;
           }
           return match;
        });

        if (action === 'FAQ' || action === 'SUMMARY' || action === 'COMPARISON') {
           // Append or insert
           const title = action === 'FAQ' ? 'Frequently Asked Questions' : (action === 'SUMMARY' ? 'Social Snippet' : '');
           const trimmedResult = resultString.trim();
           const contentToAppend = trimmedResult.startsWith('<') ? trimmedResult : `<p>${trimmedResult}</p>`;
           
           if (action === 'COMPARISON') {
              if (selectedText) {
                 try {
                   editorRef.current?.replaceSelection(trimmedResult);
                 } catch (editorErr) {
                   console.error("Editor replace error:", editorErr);
                   setEditBody(prev => `${prev}\n\n${trimmedResult}`);
                 }
              } else {
                 setEditBody(prev => `${prev}\n\n${trimmedResult}`);
              }
           } else if (action === 'FAQ') {
              // Wrapped in a marker div so the public-facing SEO layer
              // (src/lib/seo-meta.ts) can reliably find and extract this
              // exact FAQ section for the FAQPage rich-result schema,
              // without mistaking any of the article's other <h3>
              // subheadings for FAQ questions. If a FAQ section already
              // exists in this article, replace it instead of stacking a
              // second one.
              setEditBody(prev => {
                 const faqBlock = `<div id="mw-faq-section"><h2>${title}</h2>${contentToAppend}</div>`;
                 const existingFaqRegex = /<div id="mw-faq-section"[\s\S]*?<\/div>\s*$/i;
                 if (existingFaqRegex.test(prev.trim())) {
                    return prev.replace(existingFaqRegex, faqBlock);
                 }
                 return `${prev}\n${faqBlock}`;
              });
           } else {
              setEditBody(prev => `${prev}\n<h2>${title}</h2>${contentToAppend}`);
           }
        } else if (selectedText) {
           // Replace selection
           try {
             editorRef.current?.replaceSelection(resultString);
           } catch (editorErr) {
             console.error("Failed to replace selected text in the editor container:", editorErr);
             alert("Could not insert the enhanced content into your selected block. Appending to the body instead.");
             setEditBody(prev => `${prev}\n\n${resultString}`);
           }
        } else {
           // Replace whole body if no selection — except for Summarize,
           // which must never blow away the original article. Instead it
           // adds its summary + conclusion at the end, same as FAQ/Social
           // Snippet above.
           if (action === 'SHORTEN') {
             const trimmedResult = resultString.trim();
             const contentToAppend = trimmedResult.startsWith('<') ? trimmedResult : `<p>${trimmedResult}</p>`;
             setEditBody(prev => `${prev}\n${contentToAppend}`);
           } else {
             setEditBody(resultString);
           }
        }
      } else {
        alert(data.error || "Enhancement task failed.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Network error calling AI tools.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSmartInternalLinking = async () => {
    if (isAiLabBusy) return;
    if (!editBody || editBody.trim() === "<p></p>" || editBody.trim() === "") {
      alert("దయచేసి ఆర్టికల్ బాడీలో కొంత సమాచారాన్ని రాయండి. (Please write some content in the article body first.)");
      return;
    }
    // Excludes localOnly drafts (KV auto-articles / not-yet-published edits)
    // — linking to one of those would produce an href to a slug that
    // doesn't actually resolve on the live site yet, since it only exists
    // in this browser/KV, not in Sanity.
    const publishedCandidates = (existingPosts || []).filter((p: any) => !p.localOnly);
    if (publishedCandidates.length === 0) {
      alert("రిలేటెడ్ ఆర్టికల్స్ ఏవీ కనుగొనబడలేదు. దయచేసి ముందే ప్రచురించిన మరికొన్ని ఆర్టికల్స్ ఉండాలి. (No published articles found for internal linking. Please publish some articles first.)");
      return;
    }

    setIsLinking(true);
    try {
      console.log(`[Smart Inter-Linking] Generating linking for active draft: "${editTitle}"`);
      const response = await safeFetchJson("/api/articles/internal-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentTitle: editTitle,
          currentContent: editBody,
          existingPosts: publishedCandidates
        })
      });

      if (!response) {
        throw new Error("The linking service returned an empty response. Let's try again.");
      }

      if (response.success && response.updatedContent) {
        setEditBody(response.updatedContent);
        if (response.matchedPosts && response.matchedPosts.length > 0) {
          const titleList = response.matchedPosts.map((p: any) => `"${p.title}"`).join(", ");
          alert(`✨ విజయవంతంగా ${response.matchedPosts.length} ఇంటర్నల్ లింక్‌లు జోడించబడ్డాయి! (${response.matchedPosts.length} internal links successfully added!)\n\n🔗 లింక్ చేయబడిన ఆర్టికల్స్: ${titleList}\n📝 వివరణ: ${response.explanation || "సహజమైన కంటెంట్ పరివర్తనతో జోడించబడింది."}`);
        } else {
          alert("కంటెంట్‌లో సహజమైన లింక్ విజయవంతంగా జోడించబడింది.");
        }
      } else {
        alert(response.error || "ఇంటర్నల్ లింటింగ్ నిలిపివేయబడింది. మళ్లీ ప్రయత్నించండి.");
      }
    } catch (err: any) {
      console.error("Internal linking call failed:", err);
      alert(`ఇంటర్నల్ లింకింగ్ ఫెయిల్ అయింది (Internal linking failed): ${err.message || String(err)}`);
    } finally {
      setIsLinking(false);
    }
  };

  // Shared helper: given a FINAL image URL (Sanity CDN link, or a local
  // data: URL if Sanity isn't configured), asks the backend to look at the
  // actual image and auto-fills alt text + caption. Used right after any
  // featured image is generated/set, so captions no longer require a manual
  // "Generate" click — same endpoint the manual button already used.
  const autoFillImageMeta = async (finalUrl: string) => {
    if (!finalUrl) return;
    try {
      const data = await safeFetchJson("/api/articles/generate-alt-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: finalUrl, keyword: keyword || "" })
      });
      if (data?.success) {
        if (data.altText) setImageAlt(data.altText);
        if (data.caption) setImageCaption(data.caption);
      }
    } catch (err) {
      console.warn("Auto caption generation skipped:", err);
    }
  };

  const handleManualShare = async (platform: "reddit" | "twitter" | "facebook" | "pinterest" | "linkedin" | "telegram") => {
    if (!editSlug) {
      alert("Article ki slug ledu — publish chesaka లేదా slug set chesaka share cheyandi.");
      return;
    }
    if (platform === "reddit" && !shareSubreddit.trim()) {
      alert("Subreddit పేరు (e.g. AndhraPradesh) enter cheyandi.");
      return;
    }
    setSharingPlatform(platform);
    try {
      const link = `https://mindwriter.in/${editSlug}`;
      const text = editExcerpt || editTitle;
      const data = await safeFetchJson("/api/articles/social-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          title: editTitle,
          text,
          link,
          imageUrl: imageUrl || undefined,
          subreddit: platform === "reddit" ? shareSubreddit.trim() : undefined,
        }),
      });
      setShareResults((prev) => ({ ...prev, [platform]: { success: !!data.success, error: data.error, postUrl: data.postUrl } }));
      if (!data.success) {
        alert(`${platform} share fail అయింది: ${data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setShareResults((prev) => ({ ...prev, [platform]: { success: false, error: err.message } }));
      alert(`${platform} share error: ${err.message || err}`);
    } finally {
      setSharingPlatform(null);
    }
  };

  const runImageFieldMigration = async () => {
    setImageMigrationStatus({ running: true, migrated: 0, remaining: null });
    let totalMigrated = 0;
    try {
      let hasMore = true;
      while (hasMore) {
        const data = await safeFetchJson("/api/admin/migrate-image-fields", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchSize: 40 }),
        });
        if (!data.success) {
          setImageMigrationStatus({ running: false, migrated: totalMigrated, remaining: null, error: data.error || "Migration batch failed." });
          return;
        }
        totalMigrated += data.migrated || 0;
        hasMore = !!data.hasMore;
        setImageMigrationStatus({ running: hasMore, migrated: totalMigrated, remaining: data.remaining ?? 0 });
        // processedInThisBatch === 0 would loop forever if something's
        // wrong server-side — bail out rather than spin.
        if ((data.processedInThisBatch || 0) === 0) break;
      }
      setImageMigrationStatus({ running: false, migrated: totalMigrated, remaining: 0, done: true });
    } catch (err: any) {
      setImageMigrationStatus({ running: false, migrated: totalMigrated, remaining: null, error: err.message || "Migration failed." });
    }
  };

  const handleGenerateMetaAIImage = async () => {
    if (isAiLabBusy) return;
    setIsGeneratingMetaImage(true);
    try {
      const contentPrompt = editTitle + " " + editExcerpt.substring(0, 100);
      let englishPrompt = contentPrompt;
      const hasTelugu = /[^\x00-\x7F]/.test(contentPrompt);
      if (hasTelugu) {
        console.log("Detecting Telugu layout on client side. Translating with MyMemory free proxy...");
        try {
          const cleanText = contentPrompt.replace(/<[^>]*>/g, " ").substring(0, 200).trim();
          const targetUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=te|en`;
          const tRes = await fetch(targetUrl);
          if (tRes.ok) {
            const tJson = await tRes.json();
            const mTrans = tJson?.matches?.[0]?.translation || tJson?.responseData?.translatedText;
            if (mTrans && mTrans.trim() && !mTrans.includes("IS AN INVALID") && !mTrans.includes("MYMEMORY WARNING")) {
              englishPrompt = mTrans.trim();
              console.log("Client-side translation succeeded:", englishPrompt);
            }
          }
        } catch (transErr) {
          console.warn("Client-side translation fallback error:", transErr);
        }
      }

      if (/[^\x00-\x7F]/.test(englishPrompt)) {
        const englishOnly = englishPrompt.replace(/[^\x00-\x7F]/g, " ").replace(/\s+/g, " ").trim();
        if (englishOnly.length > 8) {
          englishPrompt = englishOnly;
        } else {
          englishPrompt = getRelevantFallbackPrompt(editCategory, editTitle);
        }
      }

      const enhancedPrompt = `Award-winning realistic high-quality photography, highly polished: ${englishPrompt}`;
      
      console.log("Generating AI realistic image directly from browser for:", enhancedPrompt);
      let step1ImageUrl = "";
      
      try {
        const randomSeed = Math.floor(Math.random() * 1000000);
        const pollinationUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=576&nologo=true&seed=${randomSeed}`;
        const browserFetch = await fetch(pollinationUrl);
        if (!browserFetch.ok) throw new Error("Browser fetch error");
        const blob = await browserFetch.blob();
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(blob);
        step1ImageUrl = await base64Promise;
      } catch (clientErr) {
         console.warn("Direct browser generator attempt failed, trying browser hercai...", clientErr);
         try {
           const hercaiUrl = `https://hercai.onrender.com/v3/text2image?prompt=${encodeURIComponent(enhancedPrompt)}`;
           const hFetch = await fetch(hercaiUrl);
           if (!hFetch.ok) throw new Error("Browser Hercai raw fetch failed");
           const hJson = await hFetch.json();
           if (hJson && hJson.url) {
             const imgFetch = await fetch(hJson.url);
             if (!imgFetch.ok) throw new Error("Browser Hercai image download failed");
             const blob = await imgFetch.blob();
             const reader = new FileReader();
             const base64Promise = new Promise<string>((resolve, reject) => {
               reader.onloadend = () => resolve(reader.result as string);
               reader.onerror = reject;
             });
             reader.readAsDataURL(blob);
             step1ImageUrl = await base64Promise;
             console.log("Successfully generated image directly in browser using Hercai!");
           } else {
             throw new Error("No URL returned from Hercai API in browser");
           }
         } catch (hercClientErr) {
            console.warn("Client Hercai failed too, falling back to server...", hercClientErr);
            const step1Response = await safeFetchJson("/api/articles/generate-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: enhancedPrompt }) // removed togetherApiKey entirely
            });
            if (!step1Response || !step1Response.success || !step1Response.imageUrl) {
              throw new Error(step1Response?.message || "Failed to generate visual from AI server.");
            }
            step1ImageUrl = step1Response.imageUrl;
         }
      }

      console.log("Compressing generated image...");
      const compressed = await compressImageToUnder100kb(step1ImageUrl).catch(e => null);

      if (!compressed) {
         setImageUrl(step1ImageUrl);
         autoFillImageMeta(step1ImageUrl);
      } else {
        // Upload via our own backend instead of calling sanity.io directly
        // from the browser. The backend resolves the Sanity project/dataset/
        // token from its own server-saved KV config (see resolveSanityContext),
        // so this works from any device without needing the write token to
        // ever live in this browser's local state.
        console.log("Uploading generated Meta AI image via backend...");
        try {
          const customFileName = `meta-ai-${Date.now()}.webp`;
          const formData = new FormData();
          formData.append("file", compressed.blob, customFileName);
          if (sanityProjectId) formData.append("projectId", sanityProjectId);
          if (sanityDataset) formData.append("dataset", sanityDataset);
          if (sanityWriteToken) formData.append("token", sanityWriteToken);

          const uploadData = await safeFetchJson("/api/articles/upload-asset", {
            method: "POST",
            body: formData,
          });

          if (uploadData?.success && uploadData.url) {
            console.log("Successfully stored in Sanity:", uploadData.url);
            setImageUrl(uploadData.url);
            autoFillImageMeta(uploadData.url);
          } else {
            throw new Error(uploadData?.error || "Upload to Sanity resulted in an invalid response.");
          }
        } catch (uploadErr) {
          console.error("Upload to Sanity failed. Displaying locally.", uploadErr);
          const localUrl = `data:image/webp;base64,${compressed.base64}`;
          setImageUrl(localUrl);
          autoFillImageMeta(localUrl);
        }
      }
    } catch(err: any) {
      console.error(err);
      alert("Error generating AI image: " + (err.message || err));
    } finally {
       setIsGeneratingMetaImage(false);
    }
  };

  const handleGenerateArticleImagePrompts = async () => {
    if (isAiLabBusy) return;
    if (!editBody) {
      alert("Please write/generate some content first before asking for relevant image prompts.");
      return;
    }
    setIsGeneratingImagePrompts(true);
    try {
      // Analyze core content by removing any FAQ/Frequently Asked Questions section to satisfy:
      // "faq section lo images rakudadu only content madhyalo ravali content ni analyse chesi fprompt gehenrate kavali"
      let contentForAnalysis = editBody;
      const lowercaseBody = contentForAnalysis.toLowerCase();
      
      const faqKeywords = [
        "frequently asked questions", 
        "తరచుగా అడిగే ప్రశ్నలు",
        "తరచుగా అడిగే",
        "ప్రశ్నలు",
        "faq",
        "faqs"
      ];
      
      let earliestIndex = -1;
      for (const keyword of faqKeywords) {
        const idx = lowercaseBody.indexOf(keyword.toLowerCase());
        if (idx !== -1) {
          if (earliestIndex === -1 || idx < earliestIndex) {
            earliestIndex = idx;
          }
        }
      }

      if (earliestIndex !== -1) {
        const upToFaq = contentForAnalysis.substring(0, earliestIndex);
        const lastHeadingTag = Math.max(
          upToFaq.lastIndexOf("<h2"),
          upToFaq.lastIndexOf("<h3"),
          upToFaq.lastIndexOf("<h4"),
          upToFaq.lastIndexOf("<p")
        );
        if (lastHeadingTag !== -1 && (earliestIndex - lastHeadingTag) < 150) {
          contentForAnalysis = upToFaq.substring(0, lastHeadingTag);
        } else {
          contentForAnalysis = upToFaq;
        }
      }

      const cleanText = contentForAnalysis.replace(/<[^>]*>/g, " ").trim();

      const response = await safeFetchJson("/api/articles/generate-image-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: editTitle || "Untitled", 
          content: cleanText
        })
      });
      if (response && response.success && response.prompts) {
        setGeneratedImagePrompts(response.prompts);
        setShowImagePromptsModal(true);
      } else {
        alert(response?.error || "Failed to generate story image prompts. Please check your system context.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error generating matching image prompts: " + (err.message || err));
    } finally {
      setIsGeneratingImagePrompts(false);
    }
  };

  const handleGenerateAndEmbedImage = async (key: string) => {
    if (!generatedImagePrompts || !generatedImagePrompts[key]) return;
    
    const info = getPromptInfo(generatedImagePrompts[key]);
    if (!info.prompt) {
      alert("No prompt exists for this image role.");
      return;
    }

    setGeneratingSpecialKeys(prev => ({ ...prev, [key]: true }));

    try {
      console.log(`Generating matching image for key: ${key}, prompt: ${info.prompt}`);
      let step1ImageUrl = "";
      
      // Clean and summarize prompt to be super concise (<180 chars) for maximum reliability and generation speed on Pollinations
      let optimizedPrompt = info.prompt || "";
      const sentenceMarker = optimizedPrompt.split(/[.!?\n]/)[0].trim();
      if (sentenceMarker && sentenceMarker.length > 10) {
        optimizedPrompt = sentenceMarker;
      }
      if (optimizedPrompt.length > 180) {
        optimizedPrompt = optimizedPrompt.substring(0, 180).trim();
      }
      
      const enhancedPrompt = `${optimizedPrompt}, clean realistic photography style`;
      
      let finalPrompt = enhancedPrompt;
      const hasTeluguSub = /[^\x00-\x7F]/.test(enhancedPrompt);
      if (hasTeluguSub) {
        console.log("Detecting Telugu layout on client side sub-image. Translating...");
        try {
          const cleanText = enhancedPrompt.replace(/<[^>]*>/g, " ").substring(0, 200).trim();
          const targetUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=te|en`;
          const tRes = await fetch(targetUrl);
          if (tRes.ok) {
            const tJson = await tRes.json();
            const mTrans = tJson?.matches?.[0]?.translation || tJson?.responseData?.translatedText;
            if (mTrans && mTrans.trim() && !mTrans.includes("IS AN INVALID") && !mTrans.includes("MYMEMORY WARNING")) {
              finalPrompt = mTrans.trim();
              console.log("Client-side sub-image translation succeeded:", finalPrompt);
            }
          }
        } catch (transErr) {
          console.warn("Client-side sub-image translation error:", transErr);
        }
      }

      if (/[^\x00-\x7F]/.test(finalPrompt)) {
        const englishOnly = finalPrompt.replace(/[^\x00-\x7F]/g, " ").replace(/\s+/g, " ").trim();
        if (englishOnly.length > 8) {
          finalPrompt = englishOnly;
        } else {
          finalPrompt = getRelevantFallbackPrompt(editCategory, editTitle);
        }
      }
      
      try {
        const randomSeed = Math.floor(Math.random() * 1000000);
        const pollinationUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=1024&height=576&nologo=true&seed=${randomSeed}`;
        const browserFetch = await fetch(pollinationUrl);
        if (!browserFetch.ok) throw new Error("Browser image generation failed.");
        const blob = await browserFetch.blob();
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(blob);
        step1ImageUrl = await base64Promise;
      } catch (clientGenErr) {
         console.warn("Direct browser generator failed, attempting client-side hercai...", clientGenErr);
         try {
           const hercaiUrl = `https://hercai.onrender.com/v3/text2image?prompt=${encodeURIComponent(finalPrompt)}`;
           const hFetch = await fetch(hercaiUrl);
           if (!hFetch.ok) throw new Error("Browser Hercai raw fetch failed in sub-generator");
           const hJson = await hFetch.json();
           if (hJson && hJson.url) {
             const imgFetch = await fetch(hJson.url);
             if (!imgFetch.ok) throw new Error("Browser Hercai image download failed in sub-generator");
             const blob = await imgFetch.blob();
             const reader = new FileReader();
             const base64Promise = new Promise<string>((resolve, reject) => {
               reader.onloadend = () => resolve(reader.result as string);
               reader.onerror = reject;
             });
             reader.readAsDataURL(blob);
             step1ImageUrl = await base64Promise;
             console.log("Successfully generated sub-image directly in browser using Hercai!");
           } else {
             throw new Error("No URL returned from Hercai API in browser sub-generator");
           }
         } catch (hercClientErr) {
            console.warn("Client Hercai sub-generator failed too, fallback to server...", hercClientErr);
            const step1Response = await safeFetchJson("/api/articles/generate-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: finalPrompt }) // no API keys needed
            });
            if (!step1Response || !step1Response.success || !step1Response.imageUrl) {
              throw new Error(step1Response?.message || "Failed to generate visual from model.");
            }
            step1ImageUrl = step1Response.imageUrl;
         }
      }

      console.log(`Initial image generated. Launching auto-compression...`);
      const compressed = await compressImageToUnder100kb(step1ImageUrl);
      console.log(`Successfully compressed image to ${Math.round(compressed.sizeKb)} KB (.webp format)`);

      // Generate clean, descriptive filename based on the post's slug
      const cleanSlug = editSlug
        ? editSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
        : `article-${Date.now()}`;
      const customFileName = `${cleanSlug}-${key}.webp`;

      // Save to local IndexedDB library so it lists in their media pool
      const localAssetId = `local-ai-img-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      await saveLocalAsset({
        id: localAssetId,
        name: customFileName,
        originalSize: step1ImageUrl.length,
        compressedSize: Math.round(compressed.blob.size),
        compressionRatio: Math.round(((step1ImageUrl.length - compressed.blob.size) / step1ImageUrl.length) * 100),
        mimeType: "image/webp",
        dataUrl: compressed.base64,
        altText: info.teluguDescription || info.englishDescription
      });

      // Synchronize the generated metadata to MediaLibrary localStorage caches
      try {
        const altCache = JSON.parse(localStorage.getItem("SANITY_ALT_TEXT_CACHE") || "{}");
        const captionCache = JSON.parse(localStorage.getItem("SANITY_CAPTION_CACHE") || "{}");
        const descCache = JSON.parse(localStorage.getItem("SANITY_DESCRIPTION_CACHE") || "{}");

        const teluguCaption = info.teluguDescription || "";
        const englishDesc = info.englishDescription || "";

        // Map to both the unique asset ID and the base64 URL so the Media Library detects either correctly
        altCache[localAssetId] = teluguCaption;
        altCache[compressed.base64] = teluguCaption;

        captionCache[localAssetId] = teluguCaption;
        captionCache[compressed.base64] = teluguCaption;

        descCache[localAssetId] = englishDesc;
        descCache[compressed.base64] = englishDesc;

        localStorage.setItem("SANITY_ALT_TEXT_CACHE", JSON.stringify(altCache));
        localStorage.setItem("SANITY_CAPTION_CACHE", JSON.stringify(captionCache));
        localStorage.setItem("SANITY_DESCRIPTION_CACHE", JSON.stringify(descCache));
      } catch (cacheErr) {
        console.warn("Could not save metadata to Media Library Cache Maps:", cacheErr);
      }

      // Embed or Set Featured
      if (key === "featured") {
        setImageUrl(compressed.base64);
        setImageAlt(info.teluguDescription || info.englishDescription);
        setEmbeddedImages(prev => ({
          ...prev,
          [key]: { url: compressed.base64, sizeKb: compressed.sizeKb }
        }));
      } else {
        const percentageMap: Record<string, number> = { content1: 0.25, content2: 0.50, content3: 0.75 };
        const percent = percentageMap[key] || 0.5;
        const captionText = info.teluguDescription || info.englishDescription;
        const captionAttrSafe = String(captionText || "").replace(/"/g, "&quot;");
        // data-caption on the <img> itself (in addition to the visible
        // <span> below it) is what the publish-time HTML→Sanity-blocks
        // converter (extractImageFields in worker/src/services/sanity.ts)
        // actually reads — without it, the caption only ever existed as
        // plain text in this preview HTML and was silently dropped when the
        // article was published, even though alt text survived fine.
        const imageHtml = `
<div style="margin: 28px 0; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
  <img src="${compressed.base64}" alt="${captionAttrSafe}" data-caption="${captionAttrSafe}" style="border-radius: 16px; max-width: 100%; height: auto; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid rgba(0,0,0,0.05); display: inline-block;" />
  <span style="font-size: 11px; opacity: 0.75; font-style: italic; color: #71717a;">${captionText}</span>
</div>\n`;

        setEditBody(prev => insertImageIntoHtmlBody(prev, imageHtml, percent));
        setEmbeddedImages(prev => ({
          ...prev,
          [key]: { url: compressed.base64, sizeKb: compressed.sizeKb }
        }));
      }

    } catch (err: any) {
      console.error(err);
      alert(`Error generating/compressing the image: ${err.message || err}`);
    } finally {
      setGeneratingSpecialKeys(prev => ({ ...prev, [key]: false }));
    }
  };

  // Best-effort ASCII sanitizer — mirrors the backend's fallback in
  // publish.ts. Telugu titles produce an empty string here (Telugu script
  // isn't in [a-z0-9]), which is exactly the case ensureValidSlug() below
  // exists to catch before publishing.
  const naiveAsciiSlug = (title: string) => (title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const ensureValidSlug = async (): Promise<string> => {
    const current = editSlug.trim();
    if (current && naiveAsciiSlug(current)) return current; // already a usable ASCII slug
    const fallback = naiveAsciiSlug(editTitle);
    if (fallback) return fallback; // title was already ASCII-safe (e.g. English title)
    // Telugu (or otherwise non-ASCII) title with no slug set yet — ask the
    // AI to transliterate/translate a real slug rather than publishing
    // with a blank one.
    try {
      const data = await safeFetchJson("/api/articles/suggest-keyword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, excerpt: editExcerpt, content: editBody, category: editCategory }),
      });
      if (data?.success && data?.slug) {
        setEditSlug(data.slug);
        return data.slug;
      }
    } catch (e) {
      console.warn("Slug auto-generation failed:", e);
    }
    // Last resort — better than an empty/dash-only slug: a readable,
    // guaranteed-unique-enough fallback instead of leaving it blank for
    // Sanity to assign a meaningless random _id.
    return `article-${Date.now()}`;
  };

  const publishArticle = async () => {
     const status = "published";
     const resolvedSlug = await ensureValidSlug();
     // Only fall back to local-only publishing if NEITHER this browser NOR
     // the backend (server-saved KV config, set once via Settings -> Save to
     // Server) has Sanity configured. Previously this checked only the local
     // sanityWriteToken/sanityProjectId state, so publishing from any new
     // browser/device silently created local-only posts (never reaching
     // Sanity) even when the server already had valid credentials saved —
     // which is why articles published from a different browser never
     // showed up anywhere else.
     if (!sanityWriteToken && !sanityProjectId && !serverSanityConfigured) {
        const existing = existingPosts.find(p => (p._id || p.id) === editId);
        const localPost = {
          id: editId || `local-${Date.now()}`,
          _id: editId || `local-${Date.now()}`,
          title: editTitle,
          slug: resolvedSlug,
          excerpt: editExcerpt,
          content: editBody,
          bodyText: editBody,
          category: editCategory,
          image: imageUrl || "",
          imageAlt: imageAlt,
          imageCaption: imageCaption,
          authorName: authorName || undefined,
          authorBio: authorBio || undefined,
          keyword: keyword || undefined,
          metaTags: editMetaTags.length > 0 ? editMetaTags : undefined,
          secondaryKeywords: editSecondaryKeywords.length > 0 ? editSecondaryKeywords : undefined,
          localOnly: true,
          isAiGenerated: isAiGenerated,
          status: status,
          publishedAt: editPublishedAt ? new Date(editPublishedAt).toISOString() : new Date().toISOString(),
          approved: existing && existing.approved !== undefined ? existing.approved : true
        };
        onPostPublished(localPost);
        setEditId(localPost.id);
        setIsAiGenerated(false); // Reset after publish
        alert("Published locally (Sanity not configured). It will appear on the homepage!");
        return;
     }
     
     setIsPublishing(true);
     try {
       const resObj = await safeFetchJson("/api/articles/publish-sanity", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           // Credentials are now optional here: if the admin has saved
           // Sanity config server-side (Settings tab -> Save to Server),
           // the backend uses that automatically for any device. These are
           // only sent as an override if this specific browser still has
           // legacy localStorage values set.
           projectId: sanityProjectId || undefined,
           dataset: sanityDataset || undefined,
           token: sanityWriteToken || undefined,
           post: {
             _id: editId || undefined,
             title: editTitle,
             slug: resolvedSlug,
             excerpt: editExcerpt,
             bodyText: editBody,
             category: editCategory,
             keyword: keyword || undefined,
             metaTitle: editMetaTitle.trim() || (seoMetadata[String(editId)]?.metaTitle) || undefined,
             metaDescription: editMetaDescription.trim() || (seoMetadata[String(editId)]?.metaDescription) || undefined,
             isAiGenerated: isAiGenerated,
             image: imageUrl,
             imageAlt: imageAlt,
             imageCaption: imageCaption,
             authorName: authorName || undefined,
             authorBio: authorBio || undefined,
             metaTags: editMetaTags.length > 0 ? editMetaTags : undefined,
             secondaryKeywords: editSecondaryKeywords.length > 0 ? editSecondaryKeywords : undefined
           }
         })
       });
       const data = resObj;
       if (data.success) {
         alert("Successfully published to Sanity!");
         onPostPublished({ ...data.post, id: data.documentId, image: imageUrl, isAiGenerated: isAiGenerated });
         setIsAiGenerated(false); // Reset
         // If this article came from the Drafts tab (KV auto-articles
         // cache), it's now a real Sanity post — remove it from the KV
         // cache so it stops showing up as "pending" alongside the article
         // that now actually exists in Sanity.
         const consumedSlug = resolvedSlug || data?.post?.slug?.current || editId;
         if (consumedSlug && draftArticles.some(d => (d.slug?.current || d.slug) === consumedSlug || (d._id || d.id) === consumedSlug)) {
           safeFetchJson(`/api/articles/auto/${encodeURIComponent(consumedSlug)}`, { method: "DELETE" }).catch(() => {});
           setDraftArticles(prev => prev.filter(d => (d.slug?.current || d.slug) !== consumedSlug && (d._id || d.id) !== consumedSlug));
         }
         // Keep editor open so user can see they are still there
         setEditId(data.documentId);
       }
     } catch (err) {
       console.error(err);
       alert("Publishing failed.");
     } finally {
       setIsPublishing(false);
     }
  };

  const handleBatchPublish = async () => {
    if (selectedPostIds.length === 0) {
      alert("Please select at least one article draft to publish.");
      return;
    }

    setIsBatchPublishing(true);
    setBatchPublishProgress(`Preparing to batch-publish ${selectedPostIds.length} articles...`);

    let successCount = 0;
    let failCount = 0;

    try {
      for (let i = 0; i < selectedPostIds.length; i++) {
        const id = selectedPostIds[i];
        const post = existingPosts.find(p => (p._id || p.id) === id);
        if (!post) continue;

        setBatchPublishProgress(`Publishing ${i + 1}/${selectedPostIds.length}: "${post.title?.slice(0, 30)}..."`);

        if (!sanityWriteToken && !sanityProjectId && !serverSanityConfigured) {
          // Local offline fallback publishing
          const localPost = {
            ...post,
            id: post.id || post._id || `local-${Date.now()}-${i}`,
            _id: post._id || post.id || `local-${Date.now()}-${i}`,
            localOnly: true,
            status: "published",
            publishedAt: new Date().toISOString()
          };
          onPostPublished(localPost);
          successCount++;
        } else {
          // Remote sanity publishing
          try {
            const responseObj = await safeFetchJson("/api/articles/publish-sanity", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                // See comment at the first publish-sanity call above —
                // these are optional overrides now that the backend can use
                // its own server-side saved config.
                projectId: sanityProjectId || undefined,
                dataset: sanityDataset || undefined,
                token: sanityWriteToken || undefined,
                post: {
                  _id: post._id || post.id || undefined,
                  title: post.title,
                  slug: post.slug?.current || post.slug || (post.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                  excerpt: post.excerpt,
                  bodyText: post.bodyText || post.content || post.body || "",
                  category: post.category,
                  image: post.image,
                  imageAlt: post.imageAlt,
                  imageCaption: post.imageCaption,
                  authorName: post.authorName,
                  authorBio: post.authorBio,
                  keyword: post.keyword,
                  metaTitle: post.metaTitle,
                  metaDescription: post.metaDescription,
                  metaTags: post.metaTags,
                  secondaryKeywords: post.secondaryKeywords
                }
              })
            });

            const data = responseObj;
            if (data.success) {
               onPostPublished({ ...data.post, id: data.documentId, image: data.post?.image || post.image });
               successCount++;
            } else {
               console.error(`Dynamic batch execution failure for standard ID ${id}:`, data.error);
               failCount++;
            }
          } catch (err) {
            console.error(`Dynamic batch network exception on target ID ${id}:`, err);
            failCount++;
          }
        }
      }

      alert(`Batch publishing task complete!\nSuccessfully published: ${successCount}\nFailed: ${failCount}`);
      setSelectedPostIds([]);
    } catch (err) {
      console.error(err);
      alert("Critical error during batch publishing.");
    } finally {
      setIsBatchPublishing(false);
      setBatchPublishProgress("");
    }
  };

  const handleBatchDelete = async () => {
    if (selectedPostIds.length === 0) {
      alert("దయచేసి డిలీట్ చేయడానికి కనీసం ఒక ఆర్టికల్ ని ఎంచుకోండి. (Please select at least one article to delete.)");
      return;
    }

    if (!window.confirm(`మీరు ఎంచుకున్న ${selectedPostIds.length} ఆర్టికల్స్ ని డిలీట్ చేయాలని అనుకుంటున్నారా? ఇది శాశ్వతంగా తొలగించబడుతుంది. (Are you sure you want to delete the ${selectedPostIds.length} selected articles? This is permanent.)`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const data = await safeFetchJson("/api/articles/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postIds: selectedPostIds,
          projectId: sanityProjectId || undefined,
          dataset: sanityDataset || undefined,
          token: sanityWriteToken || undefined,
        }),
      });

      if (!data || data.success === false) {
        throw new Error(data?.error || "Delete request failed on the server.");
      }

      if (onPostDeleted) {
        onPostDeleted(selectedPostIds);
      }
      setSelectedPostIds([]);
    } catch (err: any) {
      console.error("Batch delete error:", err);
      alert(err.message || "ఆర్టికల్స్ డిలీట్ చేయడంలో లోపం జరిగింది. (Failed to delete articles from the server.)");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSingleDelete = async (postId: string) => {
    setIsDeleting(true);
    try {
      const data = await safeFetchJson("/api/articles/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postIds: [postId],
          projectId: sanityProjectId || undefined,
          dataset: sanityDataset || undefined,
          token: sanityWriteToken || undefined,
        }),
      });

      if (!data || data.success === false) {
        throw new Error(data?.error || "Delete request failed on the server.");
      }

      if (onPostDeleted) {
        onPostDeleted(postId);
      }
      // Remove from selected list if it's there
      setSelectedPostIds(prev => prev.filter(id => id !== postId));
      // Remove confirm ID if it's there
      if (confirmDeleteId === postId) {
        setConfirmDeleteId(null);
      }
    } catch (err: any) {
      console.error("Single delete error:", err);
      alert(err.message || "ఆర్టికల్ డిలీట్ చేయడంలో లోపం జరిగింది. (Failed to delete the article from the server.)");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditExisting = async (post: any) => {
    if (!post) return;

    const hasBodyAlready = !!(post.body || post.content);
    if (!hasBodyAlready && !post.localOnly) {
      const slugForFetch = post.slug?.current || post.slug || post._id || post.id;
      if (slugForFetch) {
        setIsFetchingEditContent(true);
        try {
          const data = await safeFetchJson(`/api/articles/get-full/${encodeURIComponent(slugForFetch)}`);
          if (data?.success && data?.article) {
            // Reassigning the parameter itself — every `post.xxx` reference
            // below (there are many) now sees the full, enriched article
            // with no further changes needed.
            post = { ...post, ...data.article };
          } else {
            alert(`Full article content ని fetch చేయలేకపోయాము: ${data?.error || "Unknown error"}. Editor ఖాళీగా open అవ్వొచ్చు.`);
          }
        } catch (e: any) {
          alert(`Full article content fetch error: ${e.message || e}. Editor ఖాళీగా open అవ్వొచ్చు.`);
        } finally {
          setIsFetchingEditContent(false);
        }
      }
    }
    
    setEditId(post._id || post.id);
    setEditTitle(post.title || "");
    setEditSlug(typeof post.slug === 'object' && post.slug !== null ? post.slug.current || "" : (typeof post.slug === 'string' ? post.slug : ""));
    setEditExcerpt(post.excerpt || "");
    
    // Convert body to string if it's an array (Portable Text)
    let bodyString = "";
    const bodyRaw = post.body || post.content;
    
    if (Array.isArray(bodyRaw)) {
      try {
        bodyString = portableTextToHtml(bodyRaw);
      } catch (e) {
        console.error("Failed to parse portable text:", e);
        bodyString = "";
      }
    } else if (typeof bodyRaw === 'string') {
      bodyString = bodyRaw;
    } else if (bodyRaw && typeof bodyRaw === 'object') {
      // Fallback for weird data structures
      try {
        bodyString = JSON.stringify(bodyRaw);
      } catch (e) {
        bodyString = "";
      }
    } else {
      bodyString = "";
    }
    
    setEditBody(bodyString);
    setEditCategory(post.category || "AI NEWS");
    setImageUrl(post.image || "");
    setImageAlt(post.imageAlt || "");
    setImageCaption(post.imageCaption || "");
    setAuthorName(post.authorName || "");
    setAuthorBio(post.authorBio || "");
    setEditMetaTitle(post.metaTitle || "");
    setEditMetaDescription(post.metaDescription || "");
    // SEO fields — previously never restored here at all, so every re-edit
    // of a published article started from a blank keyword/tags state even
    // though (after the publish.ts fix) they're now actually saved.
    setKeyword(post.keyword || "");
    setEditMetaTags(Array.isArray(post.metaTags) ? post.metaTags : []);
    setEditSecondaryKeywords(Array.isArray(post.secondaryKeywords) ? post.secondaryKeywords : []);
    if ((post.metaTitle || post.metaDescription) && onUpdateSeoMetadata) {
      const pid = String(post._id || post.id);
      onUpdateSeoMetadata({
        ...seoMetadata,
        [pid]: { ...seoMetadata[pid], metaTitle: post.metaTitle || seoMetadata[pid]?.metaTitle, metaDescription: post.metaDescription || seoMetadata[pid]?.metaDescription },
      });
    }

    // Parse initial publication date and convert to datetime-local format (YYYY-MM-DDTHH:MM)
    const initialDate = post.publishedAt || post._createdAt || post.date || new Date().toISOString();
    let formattedDate = "";
    try {
      const d = new Date(initialDate);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
      }
    } catch (e) {
      console.error("Error formatting date for datetime-local:", e);
    }
    setEditPublishedAt(formattedDate || new Date().toISOString().substring(0, 16));

    setActiveView("EDITOR");
  };

  return (
    <div className={`fixed inset-0 z-[60] flex flex-col font-sans transition-all duration-500 ${isLightMode ? 'bg-slate-50 text-slate-900' : 'bg-zinc-950 text-zinc-200'} ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
      {isFetchingEditContent && (
         <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-black/60 backdrop-blur-sm">
            <Loader2 size={32} className="animate-spin text-brand-purple" />
            <p className="text-sm text-white font-medium">Loading article content...</p>
         </div>
      )}
      
      {!isAuthenticated ? (
         <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-10 max-w-sm mx-auto animate-in fade-in zoom-in duration-500">
            <div className={`h-24 w-24 rounded-3xl border flex items-center justify-center text-brand-purple shadow-2xl relative overflow-hidden group transition-colors ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-white/5'}`}>
               <div className="absolute inset-0 bg-brand-purple/5 group-hover:bg-brand-purple/10 transition-colors" />
               <Lock className="h-10 w-10 relative z-10" />
            </div>
            <div className="text-center space-y-2">
               <h1 className={`text-3xl font-bold tracking-tight ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Studio Access</h1>
               <p className={`text-sm leading-relaxed font-medium ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>Verify credentials to manage your digital ecosystem.</p>
            </div>
            <form onSubmit={handleAuthSubmit} className="w-full space-y-4">
               <input 
                  type="password" 
                  value={passcode} 
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Security Code"
                  className={`w-full border rounded-2xl px-6 py-4 text-center text-lg focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple/50 focus:outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] ${isLightMode ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-450' : 'bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600'}`}
               />
               <button
                  type="submit"
                  disabled={isVerifyingPasscode}
                  className="w-full bg-brand-purple py-4 rounded-2xl font-bold tracking-wider hover:bg-brand-purple/90 transition-all shadow-[0_4px_20px_-8px_rgba(124,58,237,0.5)] active:scale-[0.98] text-sm uppercase text-white disabled:opacity-60"
               >
                  {isVerifyingPasscode ? "VERIFYING..." : "INITIALIZE SESSION"}
               </button>
            </form>
            {authErrorMessage && (
              <div className="flex items-center gap-2 text-rose-500 text-[11px] font-semibold animate-shake">
                <AlertCircle size={14} />
                <span>{authErrorMessage}</span>
              </div>
            )}
         </div>
      ) : (
        <>
          {/* Pro Top Header */}
          <header className={`h-16 border-b flex items-center justify-between px-6 shrink-0 z-20 backdrop-blur-xl transition-all ${isLightMode ? 'bg-white/80 border-slate-200 shadow-sm' : 'bg-zinc-950/80 border-white/[0.04]'}`}>
            <div className="flex items-center gap-4">
               <button className="sm:hidden p-2" onClick={() => setSidebarOpen(!sidebarOpen)}>
                 <Menu className={isLightMode ? 'text-slate-800' : 'text-zinc-200'} size={20} />
               </button>
               <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${isLightMode ? 'bg-brand-purple/10 text-brand-purple' : 'bg-white/5 border border-white/10 text-brand-purple hover:bg-brand-purple hover:text-white group'}`}>
                  <Layout className={`h-5 w-5 ${isLightMode ? '' : 'group-hover:scale-110 transition-transform'}`} />
               </div>
               <div className="hidden md:flex flex-col">
                  <div className="flex items-center gap-2">
                     <h2 className={`text-xs font-black tracking-widest uppercase ${isLightMode ? 'text-slate-800' : 'text-zinc-200'}`}>Workspace</h2>
                     <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Active</span>
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex-1 flex justify-center px-4 overflow-hidden">
               <nav className={`flex items-center gap-1 p-1 rounded-2xl border transition-colors overflow-x-auto no-scrollbar max-w-full ${isLightMode ? 'bg-slate-100 border-slate-200 ring-4 ring-slate-100/50' : 'bg-zinc-900/40 border-white/[0.06] shadow-inner'}`}>
                  <button 
                     onClick={() => setActiveView("DASHBOARD")} 
                     className={`px-2.5 sm:px-4 py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${activeView === "DASHBOARD" ? (isLightMode ? 'bg-white text-brand-purple shadow-sm ring-1 ring-slate-200/50' : 'bg-zinc-800/80 text-white shadow-md ring-1 ring-white/10') : (isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-zinc-400 hover:text-zinc-200')}`}
                  >
                     <BarChart size={14} /><span className="hidden sm:inline">DASHBOARD</span>
                  </button>
                  <button 
                     onClick={() => setActiveView("EDITOR")} 
                     className={`px-2.5 sm:px-4 py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${activeView === "EDITOR" ? (isLightMode ? 'bg-white text-brand-purple shadow-sm ring-1 ring-slate-200/50' : 'bg-zinc-800/80 text-white shadow-md ring-1 ring-white/10') : (isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-zinc-400 hover:text-zinc-200')}`}
                  >
                     <Edit3 size={14} /><span className="hidden sm:inline">EDITOR</span>
                  </button>
                  <button 
                     onClick={() => setActiveView("GENERATOR")} 
                     className={`px-2.5 sm:px-4 py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${activeView === "GENERATOR" ? (isLightMode ? 'bg-white text-brand-purple shadow-sm ring-1 ring-slate-200/50' : 'bg-zinc-800/80 text-white shadow-md ring-1 ring-white/10') : (isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-zinc-400 hover:text-zinc-200')}`}
                  >
                     <Cpu size={14} /><span className="hidden sm:inline">ENGINE</span>
                  </button>
                  <button 
                     onClick={() => setActiveView("MANAGE")} 
                     className={`px-2.5 sm:px-4 py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${activeView === "MANAGE" ? (isLightMode ? 'bg-white text-brand-purple shadow-sm ring-1 ring-slate-200/50' : 'bg-zinc-800/80 text-white shadow-md ring-1 ring-white/10') : (isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-zinc-400 hover:text-zinc-200')}`}
                  >
                     <History size={14} /><span className="hidden sm:inline">LIBRARY</span>
                  </button>
                  <button 
                     onClick={() => setActiveView("SEO")} 
                     className={`px-2.5 sm:px-4 py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${activeView === "SEO" ? (isLightMode ? 'bg-emerald-50 text-emerald-600 shadow-sm ring-1 ring-emerald-200/50' : 'bg-emerald-500/20 text-emerald-400 shadow-md ring-1 ring-emerald-500/30') : (isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-zinc-400 hover:text-zinc-200')}`}
                  >
                     <Globe size={14} /><span className="hidden sm:inline">SEO</span>
                  </button>
                  <button 
                     onClick={() => setActiveView("TOOLS")} 
                     className={`px-2.5 sm:px-4 py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${activeView === "TOOLS" ? (isLightMode ? 'bg-white text-brand-purple shadow-sm ring-1 ring-slate-200/50' : 'bg-zinc-800/80 text-white shadow-md ring-1 ring-white/10') : (isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-zinc-400 hover:text-zinc-200')}`}
                  >
                     <Cpu size={14} /><span className="hidden sm:inline">TOOLS</span>
                  </button>
                  <button 
                     onClick={() => setActiveView("MEDIA")} 
                     className={`px-2.5 sm:px-4 py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${activeView === "MEDIA" ? (isLightMode ? 'bg-white text-brand-purple shadow-sm ring-1 ring-slate-200/50' : 'bg-zinc-800/80 text-white shadow-md ring-1 ring-white/10') : (isLightMode ? 'text-slate-500 hover:text-slate-900' : 'text-zinc-400 hover:text-zinc-200')}`}
                  >
                     <ImageIcon size={14} /><span className="hidden sm:inline">MEDIA</span>
                  </button>
                  <button 
                     onClick={() => setActiveView("STUDIO")} 
                     className={`px-2.5 sm:px-4 py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${activeView === "STUDIO" ? (isLightMode ? 'bg-brand-purple/10 text-brand-purple shadow-sm ring-1 ring-brand-purple/30' : 'bg-brand-purple/20 text-brand-purple shadow-md ring-1 ring-brand-purple/30') : (isLightMode ? 'text-slate-500 hover:text-brand-purple' : 'text-zinc-400 hover:text-brand-purple')}`}
                  >
                     <Sparkles size={14} /><span className="hidden sm:inline">STUDIO</span>
                  </button>
                  <button 
                     onClick={() => setActiveView("DRAFTS")} 
                     className={`px-2.5 sm:px-4 py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${activeView === "DRAFTS" ? (isLightMode ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-200/50' : 'bg-indigo-500/20 text-indigo-400 shadow-md ring-1 ring-indigo-500/30') : (isLightMode ? 'text-slate-500 hover:text-indigo-600' : 'text-zinc-400 hover:text-indigo-400')}`}
                  >
                     <FileText size={14} /><span className="hidden sm:inline">DRAFTS</span>
                     {draftArticles.length > 0 && (
                        <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-indigo-500 text-white text-[9px] font-black flex items-center justify-center">{draftArticles.length}</span>
                     )}
                  </button>
                  <button 
                     onClick={() => setActiveView("COMMENTS")} 
                     className={`px-2.5 sm:px-4 py-2 rounded-xl text-[10px] font-bold tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${activeView === "COMMENTS" ? (isLightMode ? 'bg-amber-50 text-amber-600 shadow-sm ring-1 ring-amber-200/50' : 'bg-amber-500/20 text-amber-400 shadow-md ring-1 ring-amber-500/30') : (isLightMode ? 'text-slate-500 hover:text-amber-600' : 'text-zinc-400 hover:text-amber-400')}`}
                  >
                     <MessageCircle size={14} /><span className="hidden sm:inline">COMMENTS</span>
                     {pendingComments.length > 0 && (
                        <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">{pendingComments.length}</span>
                     )}
                  </button>
               </nav>
            </div>

            <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-6 text-[10px] font-medium mr-4">
                   <div className="flex flex-col items-end">
                      <span className={`tabular-nums font-black ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{totalPublishedCount ?? existingPosts.length}</span>
                      <span className={`uppercase tracking-widest text-[8px] opacity-50`}>Index</span>
                   </div>
                   <div className="flex flex-col items-end">
                      <span className={`tabular-nums font-black text-brand-purple`}>{getWordCount(editBody)}</span>
                      <span className={`uppercase tracking-widest text-[8px] opacity-50`}>Words</span>
                   </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button 
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className={`p-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 border shadow-sm active:scale-95 ${isFullScreen ? (isLightMode ? 'bg-brand-purple/10 border-brand-purple/20 text-brand-purple' : 'bg-brand-purple/20 border-brand-purple/40 text-brand-purple') : (isLightMode ? 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300' : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800')}`}
                    title={isFullScreen ? "Exit Workspace" : "Zen Mode"}
                  >
                    {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                  <button
                    onClick={handleLogout}
                    className={`px-2.5 sm:px-3 py-2.5 rounded-xl transition-all border shadow-sm active:scale-95 flex items-center gap-2 ${isLightMode ? 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300' : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                    title="Log out and require password again"
                  >
                    <Lock size={16} />
                    <span className="hidden sm:inline text-[10px] font-bold tracking-tight">LOCK</span>
                  </button>
                  <button onClick={onClose} className={`px-2.5 sm:px-3 py-2.5 rounded-xl transition-all border shadow-sm active:scale-95 flex items-center gap-2 ${isLightMode ? 'bg-white border-rose-100 text-rose-500 hover:bg-rose-50' : 'bg-zinc-900 border-rose-500/20 text-rose-400 hover:bg-rose-500/10'}`}>
                    <X size={16} />
                    <span className="hidden sm:inline text-[10px] font-bold tracking-tight">EXIT STUDIO</span>
                  </button>
                </div>
            </div>
          </header>

          <main className="flex-1 flex overflow-hidden">
            {/* Left Sidebar - Backdrop overlay for mobile */}
            {(sidebarOpen && !isFullScreen) && (
              <div 
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 sm:hidden transition-all duration-300 pointer-events-auto"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Left Sidebar - Article Settings */}
            {(sidebarOpen && !isFullScreen) && (
               <aside className={`fixed inset-y-0 left-0 z-40 sm:relative sm:z-auto w-72 border-r font-sans overflow-y-auto p-6 space-y-10 animate-slide-in custom-scrollbar transition-colors ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-950 border-white/[0.04]'}`}>
                  <div className="space-y-6">
                     <div className="flex items-center justify-between px-1">
                        <h3 className={`text-[10px] font-bold tracking-[0.2em] uppercase ${isLightMode ? 'text-slate-400' : 'text-zinc-400'}`}>Editor Settings</h3>
                        <button className="sm:hidden p-1.5 rounded-lg border border-red-500/10 hover:bg-red-500/10 hover:text-red-500 transition-all" onClick={() => setSidebarOpen(false)}>
                           <X size={14} />
                        </button>
                        <div className={`hidden sm:flex h-5 w-5 rounded-md border items-center justify-center ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                           <Settings size={12} className={isLightMode ? 'text-slate-400' : 'text-zinc-500'} />
                        </div>
                     </div>
                     <div className="space-y-6">
                        <div className="space-y-2.5">
                           <div className="flex items-center justify-between ml-1">
                              <label className={`block text-xs font-semibold ${isLightMode ? 'text-slate-700' : 'text-zinc-300'}`}>Focus Keyword</label>
                              <button
                                 type="button"
                                 onClick={handleSuggestKeyword}
                                 disabled={isSuggestingKeyword || (!editTitle && !editBody)}
                                 className="text-[10px] font-bold text-brand-purple border border-brand-purple/30 px-2.5 py-1 rounded-full hover:bg-brand-purple/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                 {isSuggestingKeyword ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                 SUGGEST
                              </button>
                           </div>
                           <input 
                              type="text" 
                              value={keyword}
                              onChange={(e) => setKeyword(e.target.value)}
                              className={`w-full border rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-brand-purple/30 focus:border-brand-purple/40 focus:outline-none transition-all shadow-sm ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-zinc-900 border-white/5 text-white placeholder:text-zinc-700'}`}
                              placeholder="e.g. meta llama-3 review"
                           />
                           {!editId && !keyword && !editSlug && (
                              <p className={`text-[10px] ml-1 flex items-center gap-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-600'}`}>
                                 <Sparkles size={10} />
                                 {isSuggestingKeyword ? "Auto-suggesting keyword & slug from your title/content..." : "Keyword & slug will auto-fill shortly after you write a title."}
                              </p>
                           )}
                        </div>
                        <div className="space-y-2.5">
                           <div className="flex items-center justify-between ml-1">
                              <label className={`block text-xs font-semibold ${isLightMode ? 'text-slate-700' : 'text-zinc-300'}`}>Tags</label>
                              <button
                                 type="button"
                                 onClick={handleGenerateTags}
                                 disabled={isGeneratingTags || (!editTitle && !editBody)}
                                 className="text-[10px] font-bold text-brand-purple border border-brand-purple/30 px-2.5 py-1 rounded-full hover:bg-brand-purple/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                              >
                                 {isGeneratingTags ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                 GENERATE
                              </button>
                           </div>
                           {editSecondaryKeywords.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                 {editSecondaryKeywords.map((tag, idx) => (
                                    <span
                                       key={`${tag}-${idx}`}
                                       className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-zinc-200'}`}
                                    >
                                       <Tag size={10} className="text-brand-purple" />
                                       {tag}
                                       <button
                                          type="button"
                                          onClick={() => handleRemoveTag(tag)}
                                          className="hover:text-rose-400 transition-colors"
                                          title="Remove tag"
                                       >
                                          <X size={10} />
                                       </button>
                                    </span>
                                 ))}
                              </div>
                           )}
                           <div className="flex gap-2">
                              <input
                                 type="text"
                                 value={tagInput}
                                 onChange={(e) => setTagInput(e.target.value)}
                                 onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                       e.preventDefault();
                                       handleAddManualTag();
                                    }
                                 }}
                                 className={`flex-1 min-w-0 border rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-brand-purple/30 focus:border-brand-purple/40 focus:outline-none transition-all shadow-sm ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-zinc-900 border-white/5 text-white placeholder:text-zinc-700'}`}
                                 placeholder="Tag add చేయండి..."
                              />
                              <button
                                 type="button"
                                 onClick={handleAddManualTag}
                                 disabled={!tagInput.trim()}
                                 className={`px-3 rounded-xl border text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${isLightMode ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'}`}
                              >
                                 ADD
                              </button>
                           </div>
                        </div>
                        <div className="space-y-2.5">
                           <label className={`block text-xs font-semibold ml-1 ${isLightMode ? 'text-slate-700' : 'text-zinc-300'}`}>Relative Path</label>
                           <div className="relative group">
                              <input 
                                 type="text" 
                                 value={editSlug}
                                 onChange={(e) => setEditSlug(e.target.value)}
                                 className={`w-full border rounded-xl pl-4 pr-10 py-3 text-sm font-mono focus:border-brand-purple/50 focus:outline-none transition-all shadow-sm ${isLightMode ? 'bg-slate-50 border-slate-200 text-brand-purple' : 'bg-zinc-900 border-white/5 text-brand-purple'}`}
                                 placeholder="url-friendly-slug"
                              />
                              <Globe size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-brand-purple transition-colors" />
                           </div>
                        </div>
                        <div className="space-y-2.5">
                           <label className={`block text-xs font-semibold ml-1 ${isLightMode ? 'text-slate-700' : 'text-zinc-300'}`}>Taxonomy</label>
                           <div className="relative">
                              <select 
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value)}
                                className={`w-full border rounded-xl px-4 py-3 text-sm focus:border-brand-purple/50 focus:outline-none appearance-none cursor-pointer shadow-sm pr-10 ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-zinc-900 border-white/5 text-white'}`}
                              >
                                <option value="AI NEWS">AI NEWS</option>
                                <option value="TECH">TECH</option>
                                <option value="TUTORIAL">TUTORIAL</option>
                                <option value="UPDATE">UPDATE</option>
                                <option value="BUSINESS">BUSINESS</option>
                                <option value="BLOGGING">BLOGGING</option>
                                <option value="EBOOKS">EBOOKS</option>
                              </select>
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
                                <ChevronRight className="rotate-90" size={14} />
                              </div>
                           </div>
                        </div>
                        <div className="space-y-2.5">
                           <label className={`block text-xs font-semibold ml-1 ${isLightMode ? 'text-slate-700' : 'text-zinc-300'}`}>Date Published</label>
                           <input 
                              type="datetime-local" 
                              value={editPublishedAt}
                              onChange={(e) => setEditPublishedAt(e.target.value)}
                              className={`w-full border rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-brand-purple/30 focus:border-brand-purple/40 focus:outline-none transition-all shadow-sm ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-zinc-900 border-white/5 text-white'}`}
                           />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <h3 className={`text-[10px] font-bold tracking-[0.2em] uppercase px-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-400'}`}>Visual Asset</h3>
                     <div className="space-y-5">
                        <div 
                          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-brand-purple/30'); }}
                          onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('ring-2', 'ring-brand-purple/30'); }}
                          onDrop={async (e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('ring-2', 'ring-brand-purple/30');
                            const file = e.dataTransfer.files[0];
                            if (file) {
                              const result = await handleImageUpload(file);
                              if (result) {
                                setImageUrl(result.url);
                                if (result.altText) setImageAlt(result.altText);
                                if (result.caption) setImageCaption(result.caption);
                              }
                            }
                          }}
                          className={`aspect-video w-full rounded-2xl overflow-hidden group relative flex items-center justify-center transition-all hover:border-white/20 shadow-lg ${isLightMode ? 'bg-slate-100 border border-slate-200' : 'bg-zinc-900 border border-white/[0.08]'}`}
                        >
                           {imageUrl ? (
                              <>
                                <img src={imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" alt="Preview" />
                                <div className="absolute inset-0 bg-zinc-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                                   <button 
                                      onClick={() => {
                                         setMediaSelectMode("featured");
                                         setActiveView("MEDIA");
                                      }}
                                      className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white cursor-pointer shadow-xl active:scale-95 transition-all border border-white/10"
                                   >
                                      <RefreshCw size={14} />
                                   </button>
                                   <button onClick={() => setImageUrl("")} className="p-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl shadow-xl active:scale-95 transition-all border border-rose-500/20">
                                      <Trash2 size={14} />
                                   </button>
                                </div>
                              </>
                           ) : (
                              <button 
                                 onClick={() => {
                                    setMediaSelectMode("featured");
                                    setActiveView("MEDIA");
                                 }}
                                 className={`w-full h-full flex flex-col items-center justify-center cursor-pointer transition-colors px-6 text-center focus:outline-none ${isLightMode ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-500 hover:text-zinc-400'}`}
                              >
                                 {isUploading ? <Loader2 className="h-6 w-6 animate-spin text-brand-purple" /> : <ImageIcon size={24} className="opacity-10 mb-2" />}
                                 <span className="text-[9px] uppercase font-bold tracking-widest">{isUploading ? "Uploading..." : "Select from Media Library"}</span>
                                 <p className="text-[8px] mt-1 opacity-40 font-medium">Standard 16:9 recommended</p>
                              </button>
                           )}
                        </div>
                        <div className="space-y-3">
                           <div className="relative">
                              <input 
                                 type="text" 
                                 value={imageUrl}
                                 onChange={(e) => setImageUrl(e.target.value)}
                                 className={`w-full border rounded-xl px-4 py-2.5 text-[9px] focus:outline-none transition-all font-mono shadow-sm ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-400' : 'bg-zinc-900 border-white/10 text-zinc-500 focus:border-zinc-700'}`}
                                 placeholder="Featured image URL..."
                              />
                              <LinkIcon size={10} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isLightMode ? 'text-slate-400' : 'text-zinc-700'}`} />
                           </div>
                           <div className="relative">
                              <input 
                                 type="text" 
                                 value={imageAlt}
                                 onChange={(e) => setImageAlt(e.target.value)}
                                 className={`w-full border rounded-xl px-4 py-2.5 text-[9px] focus:outline-none transition-all font-sans shadow-sm ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-400' : 'bg-zinc-900 border-white/10 text-zinc-400 focus:border-zinc-700'}`}
                                 placeholder="Image alt text (accessibility)..."
                              />
                              <FileText size={10} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isLightMode ? 'text-slate-400' : 'text-zinc-700'}`} />
                           </div>
                           <div className="relative">
                              <input 
                                 type="text" 
                                 value={imageCaption}
                                 onChange={(e) => setImageCaption(e.target.value)}
                                 className={`w-full border rounded-xl px-4 py-2.5 text-[9px] focus:outline-none transition-all font-sans shadow-sm ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-400' : 'bg-zinc-900 border-white/10 text-zinc-400 focus:border-zinc-700'}`}
                                 placeholder="Image caption (shown under the photo)..."
                              />
                              <Tag size={10} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isLightMode ? 'text-slate-400' : 'text-zinc-700'}`} />
                           </div>
                           <button
                              type="button"
                              onClick={handleGenerateFeaturedImageMeta}
                              disabled={isGeneratingFeaturedImageMeta || !imageUrl}
                              className="w-full flex items-center justify-center gap-1.5 text-[10px] font-bold text-brand-purple border border-brand-purple/30 px-2.5 py-2 rounded-xl hover:bg-brand-purple/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                           >
                              {isGeneratingFeaturedImageMeta ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                              GENERATE ALT TEXT &amp; CAPTION
                           </button>
                        </div>
                     </div>
                  </div>

                  {/* Meta Title/Description now live here directly — see the
                      editMetaTitle/editMetaDescription state comment above
                      for why. Optional: leave blank to fall back to the
                      article title/excerpt exactly as before. */}
                  <div className={`space-y-4 pt-8 border-t ${isLightMode ? 'border-slate-100' : 'border-white/[0.04]'}`}>
                     <h3 className={`text-[10px] font-bold tracking-[0.2em] uppercase px-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-400'}`}>SEO Meta</h3>
                     <div className="space-y-3">
                        <input
                           type="text"
                           value={editMetaTitle}
                           onChange={(e) => setEditMetaTitle(e.target.value)}
                           className={`w-full border rounded-xl px-4 py-2.5 text-[9px] focus:outline-none transition-all font-sans shadow-sm ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-400' : 'bg-zinc-900 border-white/10 text-zinc-400 focus:border-zinc-700'}`}
                           placeholder="Meta title (leave blank to use the article title)..."
                           maxLength={70}
                        />
                        <textarea
                           value={editMetaDescription}
                           onChange={(e) => setEditMetaDescription(e.target.value)}
                           rows={2}
                           className={`w-full border rounded-xl px-4 py-2.5 text-[9px] focus:outline-none transition-all font-sans shadow-sm resize-none ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-400' : 'bg-zinc-900 border-white/10 text-zinc-400 focus:border-zinc-700'}`}
                           placeholder="Meta description (leave blank to use the article excerpt)..."
                           maxLength={160}
                        />
                        <p className={`text-[9px] leading-relaxed px-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>
                           {editMetaTitle.length}/70 · {editMetaDescription.length}/160 — saved to Sanity directly with this article on publish.
                        </p>
                     </div>
                  </div>

                  {/* Author E-E-A-T: a named author with a short bio is a real
                      trust signal for Google (Experience/Expertise/
                      Authoritativeness/Trustworthiness). Optional — leave
                      blank to keep publishing under "MindWriter Editorial
                      Team" exactly as before. */}
                  <div className={`space-y-4 pt-8 border-t ${isLightMode ? 'border-slate-100' : 'border-white/[0.04]'}`}>
                     <h3 className={`text-[10px] font-bold tracking-[0.2em] uppercase px-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-400'}`}>Author (E-E-A-T)</h3>
                     <div className="space-y-3">
                        <div className="relative">
                           <input
                              type="text"
                              value={authorName}
                              onChange={(e) => setAuthorName(e.target.value)}
                              className={`w-full border rounded-xl px-4 py-2.5 text-[9px] focus:outline-none transition-all font-sans shadow-sm ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-400' : 'bg-zinc-900 border-white/10 text-zinc-400 focus:border-zinc-700'}`}
                              placeholder="Author name (leave blank for MindWriter Editorial Team)..."
                           />
                           <User size={10} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isLightMode ? 'text-slate-400' : 'text-zinc-700'}`} />
                        </div>
                        <div className="relative">
                           <textarea
                              value={authorBio}
                              onChange={(e) => setAuthorBio(e.target.value)}
                              rows={2}
                              className={`w-full border rounded-xl px-4 py-2.5 text-[9px] focus:outline-none transition-all font-sans shadow-sm resize-none ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-400' : 'bg-zinc-900 border-white/10 text-zinc-400 focus:border-zinc-700'}`}
                              placeholder="Short author bio / credentials (e.g. 'Senior tech journalist covering AI for 8 years')..."
                           />
                        </div>
                        <p className={`text-[9px] leading-relaxed px-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>
                           A real byline + bio strengthens Google's E-E-A-T trust signal for this article. Shown on the article page and included in its Article schema.
                        </p>
                     </div>
                  </div>

                  <div className={`space-y-6 pt-10 border-t ${isLightMode ? 'border-slate-100' : 'border-white/[0.04]'}`}>
                     <h3 className={`text-[10px] font-bold tracking-[0.2em] uppercase px-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-400'}`}>Engine Settings</h3>
                     <div className="space-y-6">
                        <div className="space-y-2.5">
                           <label className={`block text-xs font-semibold ml-1 ${isLightMode ? 'text-slate-700' : 'text-zinc-300'}`}>Sanity Project ID</label>
                           <input 
                              type="text" 
                              value={sanityProjectId}
                              onChange={(e) => setSanityProjectId(e.target.value)}
                              className={`w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-brand-purple/50 font-mono shadow-sm ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-zinc-900 border-white/10 text-white'}`}
                              placeholder="projectId"
                           />
                        </div>
                        <div className="space-y-2.5">
                           <label className={`block text-xs font-semibold ml-1 ${isLightMode ? 'text-slate-700' : 'text-zinc-300'}`}>Secret Auth Token</label>
                           <input 
                              type="password" 
                              value={sanityWriteToken}
                              onChange={(e) => setSanityWriteToken(e.target.value)}
                              className={`w-full border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-brand-purple/50 font-mono shadow-sm ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-zinc-900 border-white/10 text-white'}`}
                              placeholder="sk...."
                           />
                        </div>

                        <div className={`space-y-2 pt-2 ${isLightMode ? '' : ''}`}>
                           <button
                              onClick={saveSanityConfigToServer}
                              disabled={isSavingSanityConfig}
                              className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all shadow-sm disabled:opacity-50 ${isLightMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-brand-purple text-white hover:bg-brand-purple/90'}`}
                           >
                              {isSavingSanityConfig ? (
                                 <><Loader2 size={12} className="animate-spin" /> సేవ్ చేస్తోంది...</>
                              ) : (
                                 <><Save size={12} /> సర్వర్‌లో సేవ్ చేయండి (అన్ని డివైజ్‌ల కోసం)</>
                              )}
                           </button>
                           {sanityConfigSaveStatus && (
                              <p className={`text-[10px] leading-relaxed ${sanityConfigSaveStatus.type === "success" ? "text-emerald-500" : "text-red-500"}`}>
                                 {sanityConfigSaveStatus.text}
                              </p>
                           )}
                           {serverSanityConfigured !== null && !sanityConfigSaveStatus && (
                              <p className={`text-[10px] leading-relaxed ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>
                                 {serverSanityConfigured
                                    ? "✓ సర్వర్‌లో ఇప్పటికే కాన్ఫిగర్ చేయబడింది — ఈ బ్రౌజర్‌లో ఏమీ enter చేయకుండానే పనిచేస్తుంది."
                                    : "ⓘ సర్వర్‌లో ఇంకా ఏమీ సేవ్ చేయలేదు — పై ఫీల్డ్‌లు పూరించి సేవ్ చేయండి."}
                              </p>
                           )}
                        </div>
                     </div>
                  </div>

                  <div className={`rounded-2xl border p-6 ${isLightMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-zinc-900/50'}`}>
                     <h3 className={`text-sm font-black uppercase tracking-widest mb-2 ${isLightMode ? 'text-slate-700' : 'text-zinc-300'}`}>Maintenance — Image Field Migration</h3>
                     <p className={`text-xs leading-relaxed mb-4 ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>
                        Normalizes older posts' images (scattered across ~27 different WordPress-era field names) onto one consistent field, so loading the article list stops needing to guess the image field for each post — this is what fixes the intermittent "Workers CPU limit" loading errors. Safe to run multiple times; already-migrated posts are skipped automatically.
                     </p>
                     <button
                        onClick={runImageFieldMigration}
                        disabled={imageMigrationStatus.running}
                        className={`px-5 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 border cursor-pointer disabled:opacity-50 ${isLightMode ? 'border-sky-200 text-sky-700 hover:bg-sky-50 bg-white' : 'border-sky-500/30 text-sky-400 hover:bg-sky-900/40 bg-zinc-900/50'}`}
                     >
                        {imageMigrationStatus.running ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                        {imageMigrationStatus.running ? `Migrating... (${imageMigrationStatus.migrated} done, ${imageMigrationStatus.remaining ?? "?"} left)` : "Run Migration"}
                     </button>
                     {imageMigrationStatus.done && (
                        <p className="text-[10px] leading-relaxed text-emerald-500 mt-3">✓ Done — {imageMigrationStatus.migrated} posts migrated.</p>
                     )}
                     {imageMigrationStatus.error && (
                        <p className="text-[10px] leading-relaxed text-red-500 mt-3">{imageMigrationStatus.error}</p>
                     )}
                  </div>

                  <div className="pt-6">
                     <button 
                        onClick={publishArticle}
                        disabled={isPublishing}
                        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98] disabled:opacity-50 group bg-brand-purple text-white hover:bg-brand-purple/90`}
                     >
                        {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} className="group-hover:rotate-12 transition-transform" />}
                        <span className="text-[12px] font-black tracking-widest uppercase">Publish Article</span>
                     </button>
                  </div>
               </aside>
            )}

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-w-0 relative transition-colors ${isLightMode ? 'bg-slate-50' : 'bg-zinc-950/40'}`}>
               {isEnhancing && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center transition-all duration-300">
                     <div className={`p-6 rounded-3xl border shadow-2xl flex flex-col items-center max-w-sm text-center ${isLightMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-zinc-900 border-white/5 text-zinc-100'}`}>
                        <div className="h-14 w-14 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-brand-purple mb-4 shadow-[0_0_20px_rgba(124,58,237,0.35)] animate-pulse">
                           <Wand2 className="h-7 w-7 animate-spin duration-[3500ms]" />
                        </div>
                        <h4 className="font-extrabold uppercase tracking-widest text-[11px] text-brand-purple mb-1">AI Content Lab Action Active</h4>
                        <p className="text-xs font-semibold leading-relaxed opacity-85">Polishing selected segment or whole draft with AI model...</p>
                        <div className="flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full bg-brand-purple/10 border border-brand-purple/25 text-[9px] uppercase tracking-widest font-black text-brand-purple animate-pulse">
                           <Loader2 className="animate-spin h-3.5 w-3.5" />
                           Processing Content
                        </div>
                     </div>
                  </div>
               )}
               {/* Status Bar */}
               <div className={`h-10 border-b px-6 flex items-center justify-between z-10 shrink-0 transition-colors ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900/40 border-white/5 backdrop-blur-md'}`}>
                  <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)] ${isLightMode ? 'bg-emerald-500' : 'bg-emerald-400'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-zinc-300'}`}>System Operational</span>
                     </div>
                     <div className={`h-3 w-px ${isLightMode ? 'bg-slate-200' : 'bg-white/10'}`} />
                     <div className={`flex items-center gap-1.5 text-[10px] font-mono ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>
                        <span className="opacity-40">Draft v4.2.0</span>
                     </div>
                  </div>
                  <div className={`flex items-center gap-3 text-[10px] ${isLightMode ? 'text-slate-400' : 'text-zinc-400'}`}>
                     <span className="font-mono">Last saved {lastSaved || "recently"}</span>
                  </div>
               </div>

                {activeView === "DASHBOARD" && (
                     <div className={`flex-1 overflow-y-auto p-4 sm:p-12 custom-scrollbar transition-colors ${isLightMode ? 'bg-white' : 'bg-zinc-950/20'}`}>
                        <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700">
                           <div className="flex flex-col md:flex-row md:items-end md:justify-between border-b border-white/[0.04] pb-8 gap-4">
                              <div className="space-y-1 flex-1">
                                 <h2 className={`text-3xl font-bold tracking-tight font-display ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Studio Overview</h2>
                                 <p className={`text-sm font-medium ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>Real-time performance and collection analytics.</p>
                              </div>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                              {/* Total Card */}
                              <div className={`p-8 rounded-[2rem] border transition-all hover:scale-[1.02] duration-500 ${isLightMode ? 'bg-white border-slate-100 shadow-sm' : 'bg-zinc-900/40 border-white/[0.04]'}`}>
                                 <div className="flex flex-col gap-6">
                                    <div className="flex items-center justify-between">
                                       <div className="p-3 bg-brand-purple/10 rounded-2xl text-brand-purple">
                                          <FileText size={24} />
                                       </div>
                                       <div className="flex flex-col items-end">
                                          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Status</span>
                                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Active</span>
                                       </div>
                                    </div>
                                    <div className="space-y-1">
                                       <div className={`text-4xl font-black tabular-nums transition-all ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                                          {totalPublishedCount ?? existingPosts.length}
                                       </div>
                                       <p className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-50">Total Library Items</p>
                                    </div>
                                 </div>
                              </div>

                              {/* AI Generated Card */}
                              <div className={`p-8 rounded-[2rem] border transition-all hover:scale-[1.02] duration-500 ${isLightMode ? 'bg-white border-slate-100 shadow-sm' : 'bg-zinc-900/40 border-white/[0.04]'}`}>
                                 <div className="flex flex-col gap-6">
                                    <div className="flex items-center justify-between">
                                       <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                                          <Cpu size={24} />
                                       </div>
                                       <div className="flex flex-col items-end">
                                          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Engine</span>
                                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Optimized</span>
                                       </div>
                                    </div>
                                    <div className="space-y-1">
                                       <div className={`text-4xl font-black tabular-nums transition-all ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                                          {existingPosts.filter((p: any) => p.isAiGenerated === true || p.category === "AI NEWS").length}
                                       </div>
                                       <p className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-50">AI Generated Assets</p>
                                    </div>
                                 </div>
                              </div>

                              {/* Approved Card */}
                              <div className={`p-8 rounded-[2rem] border transition-all hover:scale-[1.02] duration-500 ${isLightMode ? 'bg-white border-slate-100 shadow-sm' : 'bg-zinc-900/40 border-white/[0.04]'}`}>
                                 <div className="flex flex-col gap-6">
                                    <div className="flex items-center justify-between">
                                       <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                                          <CheckCircle size={24} />
                                       </div>
                                       <div className="flex flex-col items-end">
                                          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Quality</span>
                                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Verified</span>
                                       </div>
                                    </div>
                                    <div className="space-y-1">
                                       <div className={`text-4xl font-black tabular-nums transition-all ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                                          {existingPosts.filter((p: any) => p.approved !== false).length}
                                       </div>
                                       <p className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-50">Approved Articles</p>
                                    </div>
                                 </div>
                              </div>

                              {/* Pending Card */}
                              <div className={`p-8 rounded-[2rem] border transition-all hover:scale-[1.02] duration-500 ${isLightMode ? 'bg-white border-slate-100 shadow-sm' : 'bg-zinc-900/40 border-white/[0.04]'}`}>
                                 <div className="flex flex-col gap-6">
                                    <div className="flex items-center justify-between">
                                       <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                                          <Clock size={24} />
                                       </div>
                                       <div className="flex flex-col items-end">
                                          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Queue</span>
                                          <span className={`text-[10px] font-bold uppercase tracking-widest ${existingPosts.filter((p: any) => p.approved === false).length > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                             {existingPosts.filter((p: any) => p.approved === false).length > 0 ? 'Required' : 'Clear'}
                                          </span>
                                       </div>
                                    </div>
                                    <div className="space-y-1">
                                       <div className={`text-4xl font-black tabular-nums transition-all ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                                          {existingPosts.filter((p: any) => p.approved === false).length}
                                       </div>
                                       <p className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-50">Pending Approval</p>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           {/* Quick Actions / Recent Activity Placeholder */}
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-32">
                              <div className={`p-8 rounded-[2rem] border ${isLightMode ? 'bg-white border-slate-100' : 'bg-zinc-900/40 border-white/[0.04]'}`}>
                                 <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-6 opacity-40">Quick Initialization</h3>
                                 <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => setActiveView("EDITOR")} className={`p-4 rounded-2xl border text-left transition-all hover:bg-brand-purple/5 group ${isLightMode ? 'bg-slate-50 border-slate-100' : 'bg-zinc-950 border-white/5'}`}>
                                       <Edit3 size={18} className="text-brand-purple mb-3" />
                                       <p className="text-[10px] font-black uppercase tracking-wider mb-1">Create Article</p>
                                       <p className="text-[9px] opacity-50">Open Studio Editor</p>
                                    </button>
                                    <button onClick={() => setActiveView("GENERATOR")} className={`p-4 rounded-2xl border text-left transition-all hover:bg-brand-purple/5 group ${isLightMode ? 'bg-slate-50 border-slate-100' : 'bg-zinc-950 border-white/5'}`}>
                                       <Cpu size={18} className="text-brand-purple mb-3" />
                                       <p className="text-[10px] font-black uppercase tracking-wider mb-1">AI Engine</p>
                                       <p className="text-[9px] opacity-50">Generate New Concepts</p>
                                    </button>
                                 </div>
                              </div>
                              <div className={`p-8 rounded-[2rem] border ${isLightMode ? 'bg-white border-slate-100' : 'bg-zinc-900/40 border-white/[0.04]'}`}>
                                 <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-6 opacity-40">System Status</h3>
                                 <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                       <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Content Engine</span>
                                       <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Nominal</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                       <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Cloud Database</span>
                                       <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Connected</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                       <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Media Storage</span>
                                       <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Optimal</span>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <AutomationPanel isLightMode={isLightMode} />

                           <HeroImagesManager isLightMode={isLightMode} handleImageUpload={handleImageUpload} />

                           <div className={`p-8 rounded-[2rem] border flex items-center justify-between flex-wrap gap-4 ${isLightMode ? 'bg-white border-slate-100' : 'bg-zinc-900/40 border-white/[0.04]'}`}>
                              <div>
                                 <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-40 mb-2">Newsletter Subscribers</h3>
                                 <div className={`text-3xl font-black tabular-nums ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{subscriberCount ?? "—"}</div>
                              </div>
                              <button
                                 onClick={exportSubscribersCsv}
                                 disabled={exportingSubscribers || !subscriberCount}
                                 className="px-5 py-2.5 rounded-full bg-brand-purple text-white text-xs font-bold hover:bg-brand-purple-hover transition-colors disabled:opacity-50"
                              >
                                 {exportingSubscribers ? "Exporting..." : "Export CSV"}
                              </button>
                           </div>
                        </div>
                     </div>
                  )}

               <div className={`flex-1 overflow-y-auto custom-scrollbar transition-all duration-700 ${isLightMode ? 'bg-white' : 'bg-zinc-950/20'} ${isFullScreen ? 'px-12 py-12 md:px-32 md:py-16' : 'px-6 py-16 md:px-24 md:py-24 flex justify-center'} ${activeView === "EDITOR" ? '' : 'hidden'}`}>
                     <div className={`w-full ${isFullScreen ? 'max-w-6xl mx-auto' : 'max-w-3xl'} space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000`}>
                        {/* Real-time SEO and Meta Tag Quality Indicator */}
                        <RealtimeSEOMonitor 
                           title={editTitle}
                           excerpt={editExcerpt}
                           body={editBody}
                           keyword={keyword}
                           slug={editSlug}
                           isLightMode={isLightMode}
                           featuredImageUrl={imageUrl}
                           featuredImageAlt={imageAlt}
                        />

                        <div className="space-y-8">
                           <div className="relative">
                              <input 
                                 type="text" 
                                 value={editTitle}
                                 onChange={(e) => setEditTitle(e.target.value)}
                                 className={`w-full bg-transparent border-none text-3xl sm:text-4xl md:text-6xl font-bold focus:outline-none leading-[1.15] tracking-tight mb-2 break-words ${isLightMode ? 'text-slate-900 placeholder:text-slate-200' : 'text-white placeholder:text-zinc-800'}`}
                                 placeholder="Untitled Article"
                              />
                              <button
                                 onClick={handleSuggestViralTitle}
                                 disabled={isSuggestingViralTitle}
                                 title="Generate a more click-worthy Telugu headline with AI, based on this title/content"
                                 className={`inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${isLightMode ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
                              >
                                 {isSuggestingViralTitle ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                                 Viral Title
                              </button>
                           </div>
                           <textarea 
                              value={editExcerpt}
                              onChange={(e) => setEditExcerpt(e.target.value)}
                              className={`w-full bg-transparent border-none text-base sm:text-lg md:text-xl font-medium leading-relaxed focus:outline-none transition-colors resize-none min-h-[60px] tracking-tight ${isLightMode ? 'text-slate-500 placeholder:text-slate-300' : 'text-zinc-400 placeholder:text-zinc-800'}`}
                              placeholder="Add a brief summary or hook..."
                           />
                        </div>
                        <div className={`h-px w-full ${isLightMode ? 'bg-slate-100' : 'bg-white/[0.04]'}`} />

                        {/* Permanent AI Image Studio Widget in the Editor Workspace */}
                        <div className={`p-6 rounded-3xl border transition-all ${
                          isLightMode 
                            ? 'bg-gradient-to-r from-indigo-50/60 to-purple-50/60 border-indigo-100/80 shadow-sm' 
                            : 'bg-gradient-to-r from-indigo-950/20 to-purple-950/20 border-indigo-500/10 shadow-[0_4px_24px_rgba(124,58,237,0.03)]'
                        }`}>
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1.5 text-left flex-1">
                              <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-indigo-500/10 text-brand-purple">
                                  <Sparkles size={12} className="animate-pulse" />
                                </span>
                                <h4 className={`text-xs font-black tracking-widest uppercase ${isLightMode ? 'text-indigo-950 font-extrabold' : 'text-indigo-200'}`}>
                                  ✨ AI చిత్రాల ప్రయోగశాల (Magic AI Image Studio & Compressor)
                                </h4>
                              </div>
                              <p className={`text-xs leading-relaxed max-w-xl ${isLightMode ? 'text-slate-600' : 'text-zinc-400'}`}>
                                కథనానికి సరిపోయే విశిష్ట చిత్రాలను (క్యాప్షన్, అల్ట్ టెక్స్ట్, కస్టమ్ ఫైల్ నేమ్‌లతో సహా) సృష్టించి, మీ స్థానిక మీడియా లైబ్రరీలో భద్రపరుస్తూ నేరుగా ఆర్టికల్‌లో చేర్చండి. (కంపల్సరీ 100KB లోపలి కుదింపుతో).
                              </p>
                            </div>
                            
                            <button
                              onClick={handleGenerateArticleImagePrompts}
                              disabled={isGeneratingImagePrompts}
                              className={`px-5 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap text-xs font-black uppercase tracking-widest ${
                                isGeneratingImagePrompts
                                  ? 'bg-brand-purple/20 border border-brand-purple/35 text-brand-purple text-zinc-300'
                                  : 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20 hover:bg-brand-purple/90 border border-transparent'
                              }`}
                            >
                              {isGeneratingImagePrompts ? (
                                <>
                                  <Loader2 size={13} className="animate-spin" />
                                  <span>ప్రాంప్ట్‌లు రూపొందుతున్నాయి...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles size={13} />
                                  <span>చిత్రాలను సృష్టించండి (Start Image Studio)</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                          <div className="prose-container pb-10" key={editId || 'new-post'}>
                          <TiptapEditor 
                             ref={editorRef}
                             onOpenMediaLibrary={() => {
                                setMediaSelectMode("content");
                                setActiveView("MEDIA");
                             }}
                             onOpenArticleLibrary={() => {
                                setShowLinkPicker(true);
                             }}
                             content={editBody} 
                             onChange={setEditBody} 
                             onImageUpload={handleImageUpload} 
                             isLightMode={isLightMode}
                             focusKeyword={keyword}
                          />
                          </div>

                          {/* SEO / AI Tools / History — inline accordion sections.
                              Previously a separate right-hand sidebar tab strip;
                              moved into the main vertical flow so editing and
                              reviewing happens on one continuous page instead of
                              a split-panel layout. */}
                          <div className="mt-10 space-y-4">
                             {([
                               { key: "SEO" as const, icon: BarChart, label: "SEO Analysis" },
                               { key: "TOOLS" as const, icon: Wand2, label: "AI Lab" },
                               { key: "HISTORY" as const, icon: History, label: "Revision History" },
                             ]).map(({ key, icon: Icon, label }) => {
                                const isOpen = expandedSection === key;
                                return (
                                   <div
                                      key={key}
                                      className={`rounded-3xl border overflow-hidden transition-colors ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900/40 border-white/[0.04]'}`}
                                   >
                                      <button
                                         onClick={() => setExpandedSection(isOpen ? null : key)}
                                         className={`w-full flex items-center justify-between gap-3 px-6 py-4 text-left transition-colors ${isLightMode ? 'hover:bg-slate-50' : 'hover:bg-white/[0.03]'}`}
                                      >
                                         <span className={`flex items-center gap-2.5 text-xs font-black uppercase tracking-widest ${isOpen ? 'text-brand-purple' : (isLightMode ? 'text-slate-600' : 'text-zinc-300')}`}>
                                            <Icon size={15} />
                                            {label}
                                            {key === "TOOLS" && (
                                               <span className="h-1.5 w-1.5 rounded-full bg-brand-purple inline-block animate-ping" />
                                            )}
                                         </span>
                                         {isOpen ? (
                                            <ChevronUp size={16} className={isLightMode ? 'text-slate-400' : 'text-zinc-500'} />
                                         ) : (
                                            <ChevronDown size={16} className={isLightMode ? 'text-slate-400' : 'text-zinc-500'} />
                                         )}
                                      </button>

                                      {isOpen && (
                                         <div className={`px-6 pb-6 pt-2 border-t animate-in slide-in-from-top-2 duration-300 ${isLightMode ? 'border-slate-100' : 'border-white/[0.04]'}`}>
                                            {key === "SEO" && (
                                               <SEOPanel
                                                  analysis={analysis}
                                                  isAnalyzing={isAnalyzing}
                                                  onAnalyze={handleAnalyze}
                                                  onApplyMeta={() => {
                                                     if (analysis?.metaTitle) setEditMetaTitle(analysis.metaTitle);
                                                     if (analysis?.metaDescription) setEditMetaDescription(analysis.metaDescription);
                                                  }}
                                                  content={editBody}
                                                  title={editTitle}
                                                  keyword={keyword}
                                                  excerpt={editExcerpt}
                                                  slug={editSlug}
                                                  isLightMode={isLightMode}
                                               />
                                            )}
                                            {key === "TOOLS" && (
                                               <ToolboxPanel
                                                  isEnhancing={isEnhancing}
                                                  onAction={handleToolAction}
                                                  isGeneratingImage={isGeneratingImagePrompts}
                                                  onGenerateImagePrompt={handleGenerateArticleImagePrompts}
                                                  isLightMode={isLightMode}
                                                  disabled={isAiLabBusy}
                                               />
                                            )}
                                            {key === "HISTORY" && (
                                               <div className="space-y-3">
                                                  {revisions.length === 0 ? (
                                                     <div className="flex flex-col items-center justify-center py-12 text-center opacity-20">
                                                        <History size={32} className="mb-2" />
                                                        <p className="text-[10px] font-bold uppercase tracking-tight">No snapshots found</p>
                                                     </div>
                                                  ) : revisions.map((rev, idx) => (
                                                     <button
                                                        key={idx}
                                                        onClick={() => {
                                                           if (confirm("Restore this version? current unsaved changes will be lost.")) setEditBody(rev.content);
                                                        }}
                                                        className={`w-full p-4 border rounded-2xl text-left hover:border-brand-purple/30 group transition-all ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100' : 'bg-zinc-900/50 border-white/[0.04]'}`}
                                                     >
                                                        <div className="flex justify-between items-start mb-2">
                                                           <div className="flex items-center gap-2">
                                                              <div className="h-1.5 w-1.5 rounded-full bg-brand-purple/50" />
                                                              <span className={`text-[10px] font-black ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>V{revisions.length - idx}</span>
                                                           </div>
                                                           <span className={`text-[9px] font-mono font-medium ${isLightMode ? 'text-slate-400' : 'text-zinc-700'}`}>{new Date(rev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                        <div className="space-y-1">
                                                           <p className={`text-[11px] line-clamp-1 group-hover:text-brand-purple transition-colors font-medium ${isLightMode ? 'text-slate-700' : 'text-zinc-500'}`}>{rev.title || 'Untitled Snapshot'}</p>
                                                           <p className={`text-[9px] font-medium ${isLightMode ? 'text-slate-400' : 'text-zinc-700'}`}>{new Date(rev.timestamp).toDateString()}</p>
                                                        </div>
                                                     </button>
                                                  ))}
                                               </div>
                                            )}
                                         </div>
                                      )}
                                   </div>
                                );
                             })}
                          </div>

                          {/* Quick Actions at the bottom of the article context */}
                          <div className={`mt-8 p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 border transition-all ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/40 border-white/[0.04]'}`}>
                             <div className="flex flex-col gap-1 text-left">
                                <span className={`text-[11px] font-black tracking-widest uppercase ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>Workspace Storage</span>
                                <span className={`text-xs font-semibold ${isLightMode ? 'text-slate-600' : 'text-zinc-400'}`}>
                                   Auto-save active. Restores draft on accidental quit.
                                </span>
                             </div>
                             <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button
                                   onClick={handleGenerateMetaAIImage}
                                   disabled={isAiLabBusy}
                                   className={`flex-1 sm:flex-initial px-5 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 border cursor-pointer ${isLightMode ? 'border-sky-200 text-sky-700 hover:bg-sky-50 bg-white' : 'border-sky-500/30 text-sky-400 hover:bg-sky-900/40 bg-zinc-900/50'}`}
                                >
                                   {isGeneratingMetaImage ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                                   Generate Title AI Image
                                </button>
                                <button
                                   onClick={handleSmartInternalLinking}
                                   disabled={isAiLabBusy}
                                   title="పూర్వ కథనాలకు సంబంధించిన ఇంటర్నల్ లింక్‌ని ఆటోమేటిక్‌గా, సహజంగా జోడించండి"
                                   className={`flex-1 sm:flex-initial px-5 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 border cursor-pointer ${isLightMode ? 'border-purple-200 text-purple-700 hover:bg-purple-100 bg-white shadow-sm' : 'border-purple-500/30 text-purple-400 hover:bg-purple-900/40 bg-purple-950/20'}`}
                                >
                                   {isLinking ? <Loader2 size={13} className="animate-spin" /> : <LinkIcon size={13} />}
                                   {isLinking ? "Linking..." : "Smart Link (AI)"}
                                </button>
                                <button
                                   onClick={() => {
                                      handleAutoSave();
                                      alert("Draft saved successfully to local storage!");
                                   }}
                                   className={`flex-1 sm:flex-initial px-5 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 border cursor-pointer ${isLightMode ? 'border-slate-200 text-slate-700 hover:bg-slate-100 bg-white' : 'border-white/10 text-zinc-300 hover:bg-zinc-800 hover:text-white bg-zinc-900/50'}`}
                                >
                                   <Save size={14} />
                                   Save Draft
                                </button>
                                <button
                                   onClick={publishArticle}
                                   disabled={isPublishing}
                                   className="flex-1 sm:flex-initial px-6 py-3 rounded-xl text-xs font-black tracking-widest uppercase transition-all bg-brand-purple hover:bg-brand-purple/90 text-white flex items-center justify-center gap-2 shadow-lg shadow-brand-purple/20 cursor-pointer"
                                >
                                   {isPublishing ? (
                                      <Loader2 size={14} className="animate-spin" />
                                   ) : (
                                      <Globe size={14} />
                                   )}
                                   {isPublishing ? "Publishing..." : "Publish & Save"}
                                </button>
                             </div>
                             {editSlug && (
                                <div className={`flex flex-wrap items-center gap-2 pt-3 mt-1 border-t ${isLightMode ? 'border-slate-200' : 'border-white/10'}`}>
                                   <span className={`text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>
                                      <Share2 size={12} /> Manual Share
                                   </span>
                                   <input
                                      type="text"
                                      value={shareSubreddit}
                                      onChange={(e) => setShareSubreddit(e.target.value)}
                                      placeholder="subreddit (e.g. AndhraPradesh)"
                                      className={`px-3 py-1.5 rounded-lg text-xs w-48 border ${isLightMode ? 'border-slate-200 bg-white text-slate-800' : 'border-white/10 bg-zinc-900 text-zinc-200'}`}
                                   />
                                   <button
                                      onClick={() => handleManualShare("reddit")}
                                      disabled={sharingPlatform === "reddit"}
                                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer flex items-center gap-1.5 ${isLightMode ? 'border-orange-200 text-orange-700 hover:bg-orange-50 bg-white' : 'border-orange-500/30 text-orange-400 hover:bg-orange-900/40 bg-zinc-900/50'}`}
                                   >
                                      {sharingPlatform === "reddit" ? <Loader2 size={12} className="animate-spin" /> : null}
                                      Reddit {shareResults.reddit && (shareResults.reddit.success ? "✓" : "✗")}
                                   </button>
                                   <button
                                      onClick={() => handleManualShare("pinterest")}
                                      disabled={sharingPlatform === "pinterest"}
                                      title="Pinterest: manual-only — crops the feature image to a vertical 2:3 pin automatically before posting."
                                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer flex items-center gap-1.5 ${isLightMode ? 'border-red-200 text-red-700 hover:bg-red-50 bg-white' : 'border-red-500/30 text-red-400 hover:bg-red-900/40 bg-zinc-900/50'}`}
                                   >
                                      {sharingPlatform === "pinterest" ? <Loader2 size={12} className="animate-spin" /> : null}
                                      Pinterest {shareResults.pinterest && (shareResults.pinterest.success ? "✓" : "✗")}
                                   </button>
                                   {(["twitter", "facebook", "linkedin", "telegram"] as const).map((p) => (
                                      <button
                                         key={p}
                                         onClick={() => handleManualShare(p)}
                                         disabled={sharingPlatform === p}
                                         title={`Re-share to ${p} (retry if auto-share failed)`}
                                         className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer flex items-center gap-1.5 capitalize ${isLightMode ? 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white' : 'border-white/10 text-zinc-400 hover:bg-zinc-800 bg-zinc-900/50'}`}
                                      >
                                         {sharingPlatform === p ? <Loader2 size={12} className="animate-spin" /> : null}
                                         {p} {shareResults[p] && (shareResults[p].success ? "✓" : "✗")}

                                      </button>
                                   ))}
                                </div>
                             )}
                          </div>
                        </div>
                     </div>

                  <div className={`flex-1 overflow-y-auto p-4 sm:p-12 custom-scrollbar transition-colors ${isLightMode ? 'bg-slate-50' : 'bg-zinc-950/20'} ${activeView === "GENERATOR" ? '' : 'hidden'}`}>
                     <div className="max-w-5xl mx-auto space-y-16">
                        <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
                           <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-purple/10 border border-brand-purple/20 text-brand-purple shadow-[0_0_40px_-12px_rgba(124,58,237,0.4)]">
                              <Sparkles className="h-10 w-10 animate-pulse text-brand-purple" />
                           </div>
                           <div className="space-y-2">
                              <h2 className={`text-5xl font-black tracking-tight font-display ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Intelligence Forge</h2>
                              <p className={`text-base font-medium max-w-lg mx-auto ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>Synthetic content architecture powered by multi-model validation. Build authoritative, rank-ready articles instantly.</p>
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-stretch">
                           <div className={`rounded-[2rem] p-8 md:p-10 flex flex-col space-y-8 shadow-2xl backdrop-blur-xl transition-all border ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900/40 border-white/[0.04]'}`}>
                              <div className="space-y-6 flex-1">
                                 <div className="space-y-3">
                                    <label className={`block text-[11px] font-black uppercase tracking-widest pl-1 ${isLightMode ? 'text-slate-600' : 'text-zinc-400'}`}>Core Subject / Query</label>
                                    <div className="relative group">
                                       <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isLightMode ? 'text-slate-300 group-focus-within:text-brand-purple' : 'text-zinc-600 group-focus-within:text-brand-purple'}`} size={16} />
                                       <input 
                                          type="text" 
                                          value={genKeyword}
                                          onChange={(e) => setGenKeyword(e.target.value)}
                                          className={`w-full border rounded-2xl pl-12 pr-5 py-4 text-sm font-medium focus:ring-4 focus:ring-brand-purple/10 focus:border-brand-purple/50 focus:outline-none transition-all shadow-sm ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-zinc-950/50 border-white/[0.06] text-white placeholder:text-zinc-600'}`}
                                          placeholder={genCategory === "EBOOKS" ? "మీ ఈ-బుక్ పేరు రాయండి (ఉదా: ధనవంతుడు కావడం ఎలా)" : "e.g. The impact of quantum computing on modern cryptography"}
                                       />
                                    </div>
                                 </div>
                                 {genCategory === "EBOOKS" && (
                                    <div className="space-y-3">
                                       <div className="flex flex-col gap-1">
                                         <label className={`block text-[11px] font-black uppercase tracking-widest pl-1 ${isLightMode ? 'text-slate-600' : 'text-zinc-400'}`}>Ebook URL (Optional)</label>
                                         <p className={`text-[9px] pl-1 font-medium ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>ebooks.mindwriter.in లింక్ పేస్ట్ చేస్తే, ఆ పేజీ content చదివి, దాని ఆధారంగా టీజర్ ఆర్టికల్ రాస్తుంది — కేవలం టైటిల్ మీద గెస్ చేయకుండా.</p>
                                       </div>
                                       <div className="relative group">
                                          <LinkIcon className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isLightMode ? 'text-slate-300 group-focus-within:text-brand-purple' : 'text-zinc-600 group-focus-within:text-brand-purple'}`} size={16} />
                                          <input
                                             type="url"
                                             value={genEbookUrl}
                                             onChange={(e) => setGenEbookUrl(e.target.value)}
                                             className={`w-full border rounded-2xl pl-12 pr-5 py-4 text-sm font-medium focus:ring-4 focus:ring-brand-purple/10 focus:border-brand-purple/50 focus:outline-none transition-all shadow-sm ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-zinc-950/50 border-white/[0.06] text-white placeholder:text-zinc-600'}`}
                                             placeholder="https://ebooks.mindwriter.in/..."
                                          />
                                       </div>
                                    </div>
                                 )}
                                 <div className="space-y-3">
                                    <div className="flex flex-col gap-1">
                                      <label className={`block text-[11px] font-black uppercase tracking-widest pl-1 ${isLightMode ? 'text-slate-600' : 'text-zinc-400'}`}>Target Sub-Context (Optional)</label>
                                      <p className={`text-[9px] pl-1 font-medium ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>ఆర్టికల్ ఎలా ఉండాలో / ఏ పాయింట్స్ కవర్ చేయాలో ఇక్కడ రాయండి (లేదా ఖాళీగా వదిలేయండి).</p>
                                    </div>
                                    <textarea 
                                       value={genPrompt}
                                       onChange={(e) => setGenPrompt(e.target.value)}
                                       className={`w-full border rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-brand-purple/10 focus:border-brand-purple/50 focus:outline-none transition-all resize-none min-h-[120px] placeholder:text-zinc-400 font-medium shadow-sm ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400' : 'bg-zinc-950/50 border-white/[0.06] text-zinc-200 placeholder:text-zinc-600'}`}
                                       placeholder="Example: Keep the tone formal but very easy to understand. Discuss its applications in agriculture..."
                                    />
                                    
                                    <div className={`p-3 rounded-xl border flex gap-3 items-start mt-1 ${isLightMode ? 'bg-indigo-50 border-indigo-100' : 'bg-indigo-500/5 border-indigo-500/10'}`}>
                                      <Sparkles size={14} className={`shrink-0 mt-0.5 ${isLightMode ? 'text-indigo-600' : 'text-indigo-400'}`} />
                                      <p className={`text-[10px] leading-relaxed font-medium ${isLightMode ? 'text-slate-600' : 'text-zinc-400'}`}>
                                        <b className={isLightMode ? 'text-slate-800' : 'text-white'}>గమనిక (Important):</b> Prompt ఎలా రాయాలో తెలియకపోతే ఈ భాగాన్ని పూర్తిగా <b>ఖాళీగా వదిలేయండి</b>. AI ఇక్కడి ఖాళీని గమనించి, ఆటోమేటిక్ గా మీ Keyword ని బట్టి అద్భుతమైన ఆర్టికల్ ని అదే స్వయంగా ఉత్పత్తి (Generate) చేస్తుంది!
                                      </p>
                                    </div>
                                 </div>
                                 
                                 <div className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${isExpertEngine ? 'bg-brand-purple/5 border-brand-purple/20' : (isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5')}`}>
                                    <div className="space-y-1">
                                       <div className="flex items-center gap-2">
                                          <Sparkles size={14} className={isExpertEngine ? 'text-brand-purple animate-pulse' : 'text-zinc-500'} />
                                          <span className={`text-[11px] font-black tracking-widest uppercase ${isLightMode ? 'text-slate-700' : 'text-white'}`}>Expert SEO Engine</span>
                                       </div>
                                       <p className={`text-[10px] font-medium leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>Injects semantic tags, structured LSI keywords & meta assets.</p>
                                    </div>
                                    <button 
                                       type="button"
                                       onClick={() => setIsExpertEngine(!isExpertEngine)}
                                       className={`w-14 h-8 rounded-full p-1 transition-all shrink-0 shadow-inner ${isExpertEngine ? "bg-brand-purple" : (isLightMode ? "bg-slate-200" : "bg-zinc-700")}`}
                                    >
                                       <div className={`w-6 h-6 rounded-full bg-white transition-all shadow-md flex items-center justify-center ${isExpertEngine ? "translate-x-6" : "translate-x-0"}`}>
                                           {isExpertEngine && <Check size={12} className="text-brand-purple" />}
                                       </div>
                                    </button>
                                 </div>

                                 <div className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${isComparisonEngine ? 'bg-brand-purple/5 border-brand-purple/20' : (isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5')}`}>
                                    <div className="space-y-1">
                                       <div className="flex items-center gap-2">
                                          <Database size={14} className={isComparisonEngine ? 'text-brand-purple animate-pulse' : 'text-zinc-500'} />
                                          <span className={`text-[11px] font-black tracking-widest uppercase ${isLightMode ? 'text-slate-700' : 'text-white'}`}>SEO Comparison Engine</span>
                                       </div>
                                       <p className={`text-[10px] font-medium leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>తులనాత్మక పట్టికను (2-3 Comparison items) కథనంలో చేర్చి క్రాలర్స్ నమ్మకాన్ని పెంచుతుంది.</p>
                                    </div>
                                    <button 
                                       type="button"
                                       onClick={() => setIsComparisonEngine(!isComparisonEngine)}
                                       className={`w-14 h-8 rounded-full p-1 transition-all shrink-0 shadow-inner ${isComparisonEngine ? "bg-brand-purple" : (isLightMode ? "bg-slate-200" : "bg-zinc-700")}`}
                                    >
                                       <div className={`w-6 h-6 rounded-full bg-white transition-all shadow-md flex items-center justify-center ${isComparisonEngine ? "translate-x-6" : "translate-x-0"}`}>
                                           {isComparisonEngine && <Check size={12} className="text-brand-purple" />}
                                       </div>
                                    </button>
                                 </div>
                                 
                                 <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-3">
                                       <label className={`block text-[11px] font-black uppercase tracking-widest pl-1 ${isLightMode ? 'text-slate-600' : 'text-zinc-400'}`}>Classification</label>
                                       <select 
                                          value={genCategory}
                                          onChange={(e) => setGenCategory(e.target.value)}
                                          className={`w-full border rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-brand-purple/10 focus:border-brand-purple/50 focus:outline-none appearance-none font-bold shadow-sm ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-zinc-950/50 border-white/[0.06] text-zinc-300'}`}
                                       >
                                         {categories && categories.map((cat, idx) => (
                                   <option key={idx} value={cat.name || cat}>{cat.name || cat}</option>
                                 ))}
                                          <option value="GADGETS">GADGETS</option>
                                          <option value="TECH">TECH</option>
                                          <option value="TUTORIAL">TUTORIAL</option>
                                          <option value="EBOOKS">EBOOKS (ebooks.mindwriter.in ప్రమోషన్)</option>
                                       </select>
                                    </div>
                                    <div className="flex items-end">
                                       <button 
                                          onClick={handleGenerate}
                                          disabled={isGenerating}
                                          className="w-full py-4 bg-brand-purple text-white rounded-2xl font-black text-[11px] tracking-[0.2em] hover:bg-brand-purple/90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center gap-3 shadow-[0_8px_30px_-8px_rgba(124,58,237,0.4)]"
                                       >
                                          {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Cpu className="h-5 w-5" />}
                                          {isGenerating ? "FORGING..." : "EXECUTE"}
                                       </button>
                                    </div>
                                 </div>
                              </div>
                              <div className={`pt-6 border-t flex items-center justify-center gap-8 ${isLightMode ? 'border-slate-200' : 'border-white/[0.04]'}`}>
                                 <div className="flex flex-col items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className={`text-[8px] font-black tracking-widest uppercase ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>Gemini Validated</span>
                                 </div>
                                 <div className="flex flex-col items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity">
                                    <div className="h-2 w-2 rounded-full bg-brand-purple shadow-[0_0_8px_rgba(124,58,237,0.5)]" />
                                    <span className={`text-[8px] font-black tracking-widest uppercase ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>SEO Ready</span>
                                 </div>
                              </div>
                           </div>
                           
                           <div className={`border border-dashed rounded-[2rem] p-8 md:p-10 min-h-[500px] flex flex-col relative overflow-hidden transition-colors ${isLightMode ? 'bg-slate-50 border-slate-300' : 'bg-zinc-900/20 border-white/[0.08]'}`}>
                              {!generatedResult ? (
                                 <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-500">
                                    <div className={`h-20 w-20 rounded-full border flex items-center justify-center ${isLightMode ? 'border-slate-200 bg-white text-slate-300' : 'border-white/[0.04] bg-white/[0.02] text-zinc-800'}`}>
                                       <Wand2 size={32} />
                                    </div>
                                    <div className="space-y-2">
                                       <p className={`text-[12px] font-black uppercase tracking-[0.2em] ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>Preview Chamber</p>
                                       <p className={`text-xs max-w-[260px] font-medium leading-relaxed ${isLightMode ? 'text-slate-400' : 'text-zinc-600'}`}>Generated architecture will manifest here for structural validation before committing.</p>
                                    </div>
                                 </div>
                              ) : (
                                 <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-500">
                                    <div className={`flex items-center justify-between mb-8 pb-4 border-b ${isLightMode ? 'border-slate-200' : 'border-white/5'}`}>
                                       <div className="flex items-center gap-3">
                                          <div className="h-2 w-2 rounded-full animate-pulse bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                          <span className={`text-[10px] font-black uppercase tracking-widest ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>Materialization config: <span className="text-emerald-500">{generatedResult.provider}</span></span>
                                       </div>
                                       <button onClick={() => setGeneratedResult(null)} className={`p-2 rounded-lg transition-colors ${isLightMode ? 'bg-slate-100 text-slate-500 hover:text-rose-500 hover:bg-rose-50' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}><X size={16} /></button>
                                    </div>
                                    <div className="space-y-6 flex-1">
                                       <h3 className={`text-2xl font-bold leading-tight tracking-tight ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{generatedResult.title}</h3>
                                       <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-1.5 bg-brand-purple/10 border border-brand-purple/20 px-3 py-1 rounded-md text-brand-purple">
                                             <Globe size={12} />
                                             <p className="text-[10px] font-mono tracking-widest truncate max-w-[200px]">{generatedResult.slug}</p>
                                          </div>
                                       </div>
                                       <p className={`text-sm leading-relaxed italic border-l-2 pl-5 ${isLightMode ? 'text-slate-500 border-slate-300' : 'text-zinc-400 border-zinc-700'}`}>{generatedResult.excerpt}</p>
                                       <div className={`relative overflow-hidden`}>
                                          <div className={`text-xs line-clamp-[8] leading-relaxed font-mono p-6 rounded-2xl border transition-colors shadow-inner ${isLightMode ? 'bg-white border-slate-200 text-slate-600' : 'bg-zinc-950/50 border-white/[0.04] text-zinc-500'}`}>
                                             {generatedResult.bodyText}
                                          </div>
                                          <div className={`absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t pointer-events-none ${isLightMode ? 'from-slate-50 to-transparent' : 'from-zinc-900/20 to-transparent'}`} />
                                       </div>
                                    </div>
                                    <button 
                                       onClick={handleSendToEditor}
                                       className={`mt-4 w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all group shadow-xl active:scale-95 ${isLightMode ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-zinc-950 hover:bg-zinc-100'}`}
                                    >
                                       <Edit3 size={16} />
                                       <span className="font-black text-[11px] tracking-[0.2em] uppercase">Transfer to Editor</span>
                                       <ArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform" />
                                    </button>
                                    <button 
                                       onClick={handleSaveToDrafts}
                                       className={`mt-4 w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all group shadow-xl active:scale-95 ${isLightMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-500 text-white hover:bg-indigo-400'}`}
                                    >
                                       <FileText size={16} />
                                       <span className="font-black text-[11px] tracking-[0.2em] uppercase">Save to Drafts</span>
                                    </button>
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>
                  {activeView === "TOOLS" && (
  <div className={`flex-1 overflow-y-auto p-4 sm:p-12 custom-scrollbar transition-colors ${isLightMode ? 'bg-slate-50' : 'bg-zinc-950/20'}`}>
      <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-800/10 pb-8">
            <h2 className={`text-3xl font-bold tracking-tight font-display ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Tools Manager</h2>
         </div>
         <ToolManager />
      </div>
  </div>
)}
{activeView === "SEO" && (
                     <div className={`flex-1 overflow-y-auto p-4 sm:p-12 custom-scrollbar transition-colors ${isLightMode ? 'bg-slate-50' : 'bg-zinc-950/20'}`}>
                        <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
                           
                           {/* Header Panel */}
                           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-800/10 pb-8">
                              <div className="space-y-1">
                                 <h2 className={`text-3xl font-bold tracking-tight font-display ${isLightMode ? 'text-slate-900' : 'text-white'}`}>SEO Engine Manager</h2>
                                 <p className="text-zinc-500 text-sm font-medium">Audit, generate, and bulk-optimize metadata fields to gain search visibility.</p>
                              </div>
                              <div className="flex flex-wrap gap-3">
                                 <button 
                                    onClick={handleBulkAutoGenerate} 
                                    disabled={isBulkProcessing || existingPosts.length === 0}
                                    className={`px-5 py-3 rounded-xl font-bold text-[10px] tracking-wider transition-all uppercase flex items-center gap-2 border shadow-sm active:scale-[0.98] ${isLightMode ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-zinc-900 border-white/5 text-zinc-300 hover:bg-zinc-800'}`}
                                 >
                                    <Sparkles size={12} className="text-brand-purple animate-pulse" />
                                    Auto-Generate All
                                 </button>
                                 <button 
                                    onClick={handleBulkSave} 
                                    disabled={isBulkProcessing || existingPosts.length === 0}
                                    className={`px-5 py-3 rounded-xl font-bold text-[10px] tracking-wider transition-all uppercase flex items-center gap-2 shadow-xl active:scale-[0.98] ${isLightMode ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-zinc-950 hover:bg-white'}`}
                                 >
                                    <Save size={12} />
                                    Bulk Save Changes
                                 </button>
                              </div>
                           </div>

                           {/* Metrics Summary Dashboard */}
                           {existingPosts.length > 0 && (() => {
                              const avgScore = Math.round(existingPosts.reduce((acc, p) => acc + (p.seoScore || 35), 0) / existingPosts.length) || 0;
                              const perfectCount = existingPosts.filter(p => (p.seoScore || 35) >= 80).length;
                              const attentionCount = existingPosts.filter(p => (p.seoScore || 35) >= 50 && (p.seoScore || 35) < 80).length;
                              const criticalCount = existingPosts.filter(p => (p.seoScore || 35) < 50).length;

                              return (
                                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    {/* Radial Gauge Card */}
                                    <div className={`p-6 rounded-3xl border flex items-center gap-5 ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900/30 border-white/5'}`}>
                                       <div className="relative flex items-center justify-center">
                                          <svg className="w-20 h-20 transform -rotate-90">
                                             <circle cx="40" cy="40" r="34" className={`${isLightMode ? 'stroke-slate-100' : 'stroke-white/5'}`} strokeWidth="6" fill="transparent" />
                                             <circle 
                                                cx="40" cy="40" r="34" 
                                                stroke={avgScore >= 80 ? '#10b981' : avgScore >= 50 ? '#f59e0b' : '#ef4444'} 
                                                strokeWidth="6" fill="transparent" 
                                                strokeDasharray={2 * Math.PI * 34} 
                                                strokeDashoffset={2 * Math.PI * 34 * (1 - avgScore / 100)} 
                                                strokeLinecap="round"
                                             />
                                          </svg>
                                          <span className={`absolute text-xl font-black font-mono ${isLightMode ? 'text-slate-800' : 'text-white'}`}>{avgScore}</span>
                                       </div>
                                       <div>
                                          <h4 className={`text-[9px] font-black tracking-widest uppercase mb-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-550'}`}>Average SEO Score</h4>
                                          <p className={`text-xs font-bold leading-relaxed ${isLightMode ? 'text-slate-700' : 'text-zinc-300'}`}>
                                             {avgScore >= 80 ? "Perfect - Solid Standing" : avgScore >= 50 ? "Moderate Optimization" : "Requires Urgent Auditing"}
                                          </p>
                                       </div>
                                    </div>

                                    {/* Status breakdown lists */}
                                    <div className={`p-6 rounded-3xl border flex items-center gap-4 ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900/30 border-white/5'}`}>
                                       <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
                                          <CheckCircle size={18} />
                                       </div>
                                       <div>
                                          <h4 className={`text-[9px] font-black tracking-widest uppercase mb-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-550'}`}>Optimized Pages</h4>
                                          <p className={`text-xl font-black font-mono leading-none ${isLightMode ? 'text-slate-800' : 'text-white'}`}>{perfectCount}</p>
                                          <span className={`text-[9px] font-medium ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>Scores between 80-100</span>
                                       </div>
                                    </div>

                                    <div className={`p-6 rounded-3xl border flex items-center gap-4 ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900/30 border-white/5'}`}>
                                       <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/10">
                                          <AlertCircle size={18} />
                                       </div>
                                       <div>
                                          <h4 className={`text-[9px] font-black tracking-widest uppercase mb-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-550'}`}>Needs Improvement</h4>
                                          <p className={`text-xl font-black font-mono leading-none ${isLightMode ? 'text-slate-800' : 'text-white'}`}>{attentionCount}</p>
                                          <span className={`text-[9px] font-medium ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>Scores between 50-79</span>
                                       </div>
                                    </div>

                                    <div className={`p-6 rounded-3xl border flex items-center gap-4 ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900/30 border-white/5'}`}>
                                       <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-red-500/10 text-red-500 border border-red-500/10">
                                          <AlertCircle size={18} />
                                       </div>
                                       <div>
                                          <h4 className={`text-[9px] font-black tracking-widest uppercase mb-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-550'}`}>Critical Warnings</h4>
                                          <p className={`text-xl font-black font-mono leading-none ${isLightMode ? 'text-slate-800' : 'text-white'}`}>{criticalCount}</p>
                                          <span className={`text-[9px] font-medium ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>Missing/Short metadata</span>
                                       </div>
                                    </div>
                                 </div>
                              );
                           })()}

                           {/* Filters Panel */}
                           <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center gap-4 ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900/20 border-white/5 backdrop-blur-md'}`}>
                              <div className="relative flex-1 w-full">
                                 <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`} size={14} />
                                 <input 
                                    type="text" 
                                    value={seoSearch}
                                    onChange={(e) => setSeoSearch(e.target.value)}
                                    className={`w-full border rounded-xl pl-11 pr-4 py-2.5 text-xs focus:outline-none transition-all ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500' : 'bg-zinc-900 border-white/10 text-white focus:border-brand-purple/50'}`}
                                    placeholder="Filter articles by title or keyword..."
                                 />
                              </div>
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                 <span className={`text-[10px] font-black tracking-wider uppercase whitespace-nowrap ${isLightMode ? 'text-slate-400 font-bold' : 'text-zinc-500'}`}>Category:</span>
                                 <select 
                                    value={seoCategoryFilter}
                                    onChange={(e) => setSeoCategoryFilter(e.target.value)}
                                    className={`border rounded-xl px-4 py-2.5 text-xs focus:outline-none w-full sm:w-44 transition-all ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-zinc-900 border-white/10 text-white'}`}
                                 >
                                    <option value="ALL">All Categories</option>
                                    {categories.map((cat: any, i) => (
                                       <option key={i} value={cat.name || cat}>{cat.name || cat}</option>
                                    ))}
                                 </select>
                              </div>
                           </div>

                           {/* Meta Data Management Table */}
                           {(() => {
                              const filteredPosts = existingPosts.filter(post => {
                                 const matchesSearch = (post.title || "").toLowerCase().includes(seoSearch.toLowerCase()) || 
                                                       (post.category || "").toLowerCase().includes(seoSearch.toLowerCase());
                                 const matchesCategory = seoCategoryFilter === "ALL" || post.category === seoCategoryFilter;
                                 return matchesSearch && matchesCategory;
                              });

                              if (filteredPosts.length === 0) {
                                 return (
                                    <div className="flex flex-col items-center justify-center p-20 border border-dashed rounded-3xl text-center opacity-40">
                                       <Globe size={48} className="mb-4 text-zinc-400 animate-pulse" />
                                       <h4 className={`text-xs font-black uppercase tracking-wider ${isLightMode ? 'text-slate-550' : 'text-zinc-500'}`}>No matching articles found</h4>
                                       <p className="text-zinc-600 text-[11px] max-w-sm mt-1 leading-relaxed">Relax the filters above or create new posts to start auditing SEO metadata.</p>
                                    </div>
                                 );
                              }

                              return (
                                 <div className={`border rounded-3xl overflow-x-auto shadow-sm ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900/10 border-white/5 backdrop-blur-md'}`}>
                                    <table className="w-full text-left border-collapse min-w-[900px]">
                                       <thead>
                                          <tr className={`border-b text-[9px] font-black tracking-widest uppercase ${isLightMode ? 'bg-slate-50/50 border-slate-200 text-slate-500' : 'bg-zinc-900/30 border-white/5 text-zinc-500'}`}>
                                             <th className="p-5 w-[250px]">Article Details</th>
                                             <th className="p-5 w-[140px]">Focus Keyword</th>
                                             <th className="p-5 w-[240px]">Custom Meta Title</th>
                                             <th className="p-5 w-[320px]">Custom Meta Description</th>
                                             <th className="p-5 text-center w-[100px]">Score</th>
                                             <th className="p-5 text-center w-[120px]">Action</th>
                                          </tr>
                                       </thead>
                                       <tbody className="divide-y divide-white/[0.03]">
                                          {filteredPosts.map((post: any, idx: number) => {
                                             const id = String(post._id || post.id || `post-seo-${idx}`);
                                             
                                             // Local edit values
                                             const currentMetaTitle = getLocalEdits(id, 'title', post.seoTitle || post.title || "");
                                             const currentMetaDesc = getLocalEdits(id, 'description', post.seoDescription || post.excerpt || "");
                                             
                                             // Calculate real-time algorithmic SEO score
                                             const runtimeScore = calculateSeoScore(currentMetaTitle, currentMetaDesc, post);

                                             // Compute length criteria
                                             const titleLen = currentMetaTitle.length;
                                             const isTitlePerfect = titleLen >= 45 && titleLen <= 65;
                                             const isTitleGood = titleLen > 30 && titleLen < 80;

                                             const descLen = currentMetaDesc.length;
                                             const isDescPerfect = descLen >= 120 && descLen <= 165;
                                             const isDescGood = descLen > 80 && descLen < 200;

                                             const postSlug = typeof post.slug === 'object' && post.slug !== null ? post.slug.current : post.slug;

                                             return (
                                                <tr key={id} className={`transition-all hover:bg-black/[0.01] ${isLightMode ? 'hover:bg-slate-50/40 text-slate-900' : 'text-zinc-200'}`}>
                                                   {/* Details */}
                                                   <td className="p-5">
                                                      <div className="flex gap-4">
                                                         {post.image ? (
                                                            <img src={post.image} className="w-12 h-12 rounded-xl object-cover border border-white/[0.04]" alt="" />
                                                         ) : (
                                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-zinc-800/40 border-white/5'}`}>
                                                               <FileText size={18} className="opacity-30" />
                                                            </div>
                                                         )}
                                                         <div className="space-y-1 min-w-0">
                                                            <div className={`font-bold text-xs truncate max-w-[200px] ${isLightMode ? 'text-slate-800' : 'text-zinc-100'}`} title={post.title}>
                                                               {post.title}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                               <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded bg-brand-purple/10 text-brand-purple uppercase">{post.category}</span>
                                                               <span className={`text-[9px] font-mono truncate max-w-[120px] ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`} title={postSlug}>{postSlug}</span>
                                                            </div>
                                                         </div>
                                                      </div>
                                                   </td>

                                                   {/* Keyword */}
                                                   <td className="p-5">
                                                      <span className={`inline-block px-2 py-1 rounded-lg text-[9px] font-bold font-mono ${isLightMode ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-zinc-900 text-zinc-400 border border-white/5'}`}>
                                                         {post.keyword || "ai articles"}
                                                      </span>
                                                   </td>

                                                   {/* Custom Meta Title input */}
                                                   <td className="p-5">
                                                      <div className="space-y-1.5">
                                                         <input 
                                                            type="text"
                                                            value={currentMetaTitle}
                                                            onChange={(e) => updateLocalEdit(id, 'title', e.target.value)}
                                                            className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 transition-all ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-indigo-500 focus:bg-white' : 'bg-zinc-950 border-white/5 text-white focus:ring-brand-purple/50 focus:bg-zinc-900'}`}
                                                            placeholder="Customize SEO Title..."
                                                         />
                                                         <div className="flex justify-between items-center px-1 font-sans">
                                                            <span className={`text-[9px] font-semibold ${isTitlePerfect ? 'text-emerald-500' : isTitleGood ? 'text-amber-500' : 'text-red-500'}`}>
                                                               {isTitlePerfect ? 'Perfect Length' : isTitleGood ? 'Decent Length' : titleLen === 0 ? 'Empty Title' : 'Too Short/Long'}
                                                            </span>
                                                            <span className={`text-[9px] font-mono ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>{titleLen} / 60</span>
                                                         </div>
                                                      </div>
                                                   </td>

                                                   {/* Custom Meta Description input */}
                                                   <td className="p-5">
                                                      <div className="space-y-1.5">
                                                         <textarea 
                                                            value={currentMetaDesc}
                                                            rows={2}
                                                            onChange={(e) => updateLocalEdit(id, 'description', e.target.value)}
                                                            className={`w-full border rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 transition-all ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-indigo-500 focus:bg-white' : 'bg-zinc-950 border-white/5 text-white focus:ring-brand-purple/50 focus:bg-zinc-900'}`}
                                                            placeholder="Customize SEO description snippet..."
                                                         />
                                                         <div className="flex justify-between items-center px-1 font-sans">
                                                            <span className={`text-[9px] font-semibold ${isDescPerfect ? 'text-emerald-500' : isDescGood ? 'text-amber-500' : 'text-red-500'}`}>
                                                               {isDescPerfect ? 'Perfect length' : isDescGood ? 'Decent length' : descLen === 0 ? 'Empty snippet' : 'Too Short/Long'}
                                                            </span>
                                                            <span className={`text-[9px] font-mono ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>{descLen} / 150</span>
                                                         </div>
                                                      </div>
                                                   </td>

                                                   {/* Score Badge */}
                                                   <td className="p-5 text-center">
                                                      <div className="flex justify-center">
                                                         <div className={`h-11 w-11 rounded-2xl flex flex-col items-center justify-center border font-mono tracking-tight shadow-sm ${
                                                            runtimeScore >= 80 
                                                               ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10' 
                                                               : runtimeScore >= 50 
                                                                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/10' 
                                                                  : 'bg-red-500/10 text-red-500 border-red-500/10'
                                                         }`}>
                                                            <span className="text-sm font-black leading-none">{runtimeScore}</span>
                                                            <span className="text-[7px] font-semibold uppercase opacity-60 tracking-wider">SEO</span>
                                                         </div>
                                                      </div>
                                                   </td>

                                                   {/* Row Actions */}
                                                   <td className="p-5 text-center">
                                                      <div className="flex justify-center">
                                                         <button 
                                                            onClick={() => handleSavePostSEO(post)}
                                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm active:scale-95 duration-200 ${
                                                               savedStatus[id]
                                                                  ? 'bg-emerald-500 text-white'
                                                                  : (isLightMode ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-gray-200')
                                                            }`}
                                                         >
                                                            {savedStatus[id] ? <Check size={12} /> : <Save size={12} />}
                                                            {savedStatus[id] ? "Saved" : "Save"}
                                                         </button>
                                                      </div>
                                                   </td>
                                                </tr>
                                             );
                                          })}
                                       </tbody>
                                    </table>
                                 </div>
                              );
                           })()}
                        </div>
                     </div>
                  )}
                  
                  <div className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden ${activeView === "MEDIA" ? "" : "hidden"}`}>
                      <MediaLibrary 
                        sanityProjectId={sanityProjectId}
                        sanityWriteToken={sanityWriteToken}
                        sanityDataset={sanityDataset}
                        isLightMode={isLightMode}
                        selectMode={mediaSelectMode}
                        focusKeyword={keyword}
                        onSelectImage={(url, altText, caption) => {
                          if (mediaSelectMode === "content") {
                            // 1. Switch back to EDITOR first so the containing element is visible
                            setActiveView("EDITOR");
                            // 2. Wait for the DOM to clear 'hidden' state so Tiptap can regain focus
                            setTimeout(() => {
                              editorRef.current?.insertImage(url, altText, caption || altText || "");
                            }, 100);
                          } else {
                            setImageUrl(url);
                            if (altText) setImageAlt(altText);
                            if (caption) setImageCaption(caption);
                            setActiveView("EDITOR");
                          }
                        }}
                        setActiveView={setActiveView}
                      />
                  </div>
                  
                  <div className={activeView === "STUDIO" ? "" : "hidden"}>
                      <ImageStudio 
                        sanityProjectId={sanityProjectId}
                        sanityWriteToken={sanityWriteToken}
                        sanityDataset={sanityDataset}
                        isLightMode={isLightMode}
                      />
                  </div>

                  <div className={activeView === "NEWS_ENGINE" ? "" : "hidden"}>
                      <NewsEnginePanel 
                        isLightMode={isLightMode}
                        onPostGenerated={(post: any) => {
                          onPostPublished(post);
                          // Also refresh the Drafts tab so a just-generated
                          // article shows up there immediately, in addition
                          // to the existing combinedPosts flow.
                          loadDraftArticles();
                        }}
                      />
                  </div>

                  {activeView === "DRAFTS" && (
                     <div className={`flex-1 overflow-y-auto p-4 sm:p-12 custom-scrollbar transition-colors ${isLightMode ? 'bg-white' : 'bg-zinc-950/20'}`}>
                        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
                           <div className="flex flex-col md:flex-row md:items-end md:justify-between border-b border-white/[0.04] pb-8 gap-4">
                              <div className="space-y-1 flex-1">
                                 <h2 className={`text-3xl font-bold tracking-tight font-display ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Drafts</h2>
                                 <p className={`text-sm font-medium ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>
                                    Articles the News Engine has fetched/generated — from this browser or the scheduled cron — not yet published to Sanity.
                                 </p>
                              </div>
                              <button
                                 onClick={loadDraftArticles}
                                 disabled={draftsLoading}
                                 className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${isLightMode ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'}`}
                              >
                                 {draftsLoading ? "Refreshing..." : "Refresh"}
                              </button>
                           </div>

                           {draftsLoading && draftArticles.length === 0 ? (
                              <p className={`text-sm ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>Loading drafts...</p>
                           ) : draftArticles.length === 0 ? (
                              <p className={`text-sm ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>No pending drafts right now. Generate news from the News Engine tab, or wait for the next scheduled cycle.</p>
                           ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                 {draftArticles.map((post: any) => (
                                    <div key={post._id || post.id} className={`rounded-2xl overflow-hidden border transition-all ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900/60 border-white/[0.06]'}`}>
                                       {post.image && (
                                          <img src={post.image} alt={post.title} className="w-full h-36 object-cover" />
                                       )}
                                       <div className="p-4 space-y-2">
                                          <h3 className={`text-sm font-bold line-clamp-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{post.title}</h3>
                                          <p className={`text-xs line-clamp-2 ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>{post.excerpt}</p>
                                          <div className="flex gap-2 pt-2">
                                             <button
                                                onClick={() => handleEditExisting(post)}
                                                className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-bold ${isLightMode ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'}`}
                                             >
                                                Edit
                                             </button>
                                             <button
                                                onClick={async () => {
                                                   handleEditExisting(post);
                                                   // handleEditExisting switches to the Editor view and populates
                                                   // edit* state; publishArticle() reads from that state, so we
                                                   // wait a tick for React to commit before publishing.
                                                   setTimeout(() => publishArticle(), 50);
                                                }}
                                                className="flex-1 px-3 py-2 rounded-lg text-[11px] font-bold bg-emerald-500/90 text-white hover:bg-emerald-500"
                                             >
                                                Publish
                                             </button>
                                          </div>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>
                     </div>
                  )}

                  {activeView === "COMMENTS" && (
                     <div className={`flex-1 overflow-y-auto p-4 sm:p-12 custom-scrollbar transition-colors ${isLightMode ? 'bg-white' : 'bg-zinc-950/20'}`}>
                        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
                           <div className="flex flex-col md:flex-row md:items-end md:justify-between border-b border-white/[0.04] pb-8 gap-4">
                              <div className="space-y-1 flex-1">
                                 <h2 className={`text-3xl font-bold tracking-tight font-display ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Comment Moderation</h2>
                                 <p className={`text-sm font-medium ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>
                                    Comments awaiting approval, across every article. Nothing shows publicly until approved here.
                                 </p>
                              </div>
                              <button
                                 onClick={loadPendingComments}
                                 disabled={commentsLoading}
                                 className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${isLightMode ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'}`}
                              >
                                 {commentsLoading ? "Refreshing..." : "Refresh"}
                              </button>
                           </div>

                           {commentsLoading && pendingComments.length === 0 ? (
                              <p className={`text-sm ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>Loading...</p>
                           ) : pendingComments.length === 0 ? (
                              <p className={`text-sm ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>No pending comments. All caught up.</p>
                           ) : (
                              <div className="space-y-4">
                                 {pendingComments.map((comment: any) => (
                                    <div key={comment.id} className={`rounded-2xl border p-5 ${isLightMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900/60 border-white/[0.06]'}`}>
                                       <div className="flex items-center justify-between mb-2">
                                          <span className={`font-bold text-sm ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{comment.author_name}</span>
                                          <a
                                             href={`https://mindwriter.in/${comment.article_slug}`}
                                             target="_blank"
                                             rel="noreferrer"
                                             className="text-[11px] font-semibold text-brand-purple hover:underline"
                                          >
                                             on: {comment.article_slug}
                                          </a>
                                       </div>
                                       <p className={`text-sm mb-4 whitespace-pre-wrap ${isLightMode ? 'text-slate-700' : 'text-zinc-300'}`}>{comment.body}</p>
                                       <div className="flex gap-2">
                                          <button
                                             onClick={() => moderateComment(comment.id, "approve")}
                                             className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/90 text-white hover:bg-emerald-500"
                                          >
                                             <CheckCircle size={13} /> Approve
                                          </button>
                                          <button
                                             onClick={() => moderateComment(comment.id, "spam")}
                                             className={`px-3 py-1.5 rounded-lg text-xs font-bold ${isLightMode ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'}`}
                                          >
                                             Mark as Spam
                                          </button>
                                          <button
                                             onClick={() => moderateComment(comment.id, "delete")}
                                             className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/90 text-white hover:bg-red-500"
                                          >
                                             <Trash2 size={13} /> Delete
                                          </button>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>
                     </div>
                  )}

                  {activeView === "MANAGE" && (
                     <div className={`flex-1 overflow-y-auto p-4 sm:p-12 custom-scrollbar transition-colors ${isLightMode ? 'bg-white' : 'bg-zinc-950/20'}`}>
                        <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700">
                        <div className="flex flex-col md:flex-row md:items-end md:justify-between border-b border-white/[0.04] pb-8 gap-4">
                           <div className="space-y-1 flex-1">
                              <h2 className={`text-3xl font-bold tracking-tight font-display ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Content Library</h2>
                              <p className={`text-sm font-medium ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>Archive of generated and processed digital assets.</p>
                           </div>
                           <div className="flex flex-wrap items-center gap-3">
                              {existingPosts.length > 0 && (
                                 <button
                                    onClick={() => {
                                       if (selectedPostIds.length === existingPosts.length) {
                                          setSelectedPostIds([]);
                                       } else {
                                          setSelectedPostIds(existingPosts.map(p => p._id || p.id));
                                       }
                                    }}
                                    className={`px-4 py-2.5 rounded-xl font-bold text-[10px] tracking-wider border transition-all uppercase ${
                                       isLightMode 
                                          ? 'border-slate-200 text-slate-700 hover:bg-slate-50' 
                                          : 'border-white/10 text-zinc-300 hover:bg-white/5'
                                    }`}
                                 >
                                    {selectedPostIds.length === existingPosts.length ? 'Deselect All' : 'Select All'}
                                 </button>
                              )}

                              {selectedPostIds.length > 0 && (
                                 <button
                                    onClick={handleBatchPublish}
                                    disabled={isBatchPublishing}
                                    className="px-5 py-2.5 bg-brand-purple text-white rounded-xl font-bold text-[10px] tracking-wider hover:bg-brand-purple/90 shadow-lg hover:shadow-brand-purple/20 transition-all uppercase flex items-center gap-2 disabled:opacity-50"
                                 >
                                    {isBatchPublishing ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
                                    Batch Publish ({selectedPostIds.length})
                                 </button>
                              )}

                               {selectedPostIds.length > 0 && (
                                  <button
                                     onClick={handleBatchDelete}
                                     disabled={isDeleting}
                                     className="on-dark-overlay px-5 py-2.5 bg-rose-600 text-white rounded-xl font-bold text-[10px] tracking-wider hover:bg-rose-700 shadow-lg hover:shadow-rose-600/10 transition-all uppercase flex items-center gap-2 disabled:opacity-50"
                                  >
                                     {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                     Batch Delete ({selectedPostIds.length})
                                  </button>
                               )}

                              <button onClick={() => setActiveView("EDITOR")} className={`on-dark-overlay px-5 py-2.5 rounded-xl font-bold text-[10px] tracking-wider hover:scale-[1.01] shadow-md active:scale-[0.99] transition-all uppercase ${isLightMode ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-zinc-950 hover:bg-zinc-100'}`}>
                                 + NEW RESOURCE
                              </button>
                           </div>
                        </div>

                        {/* Search + status filter — narrows the grid below without
                            touching existingPosts itself, so batch-select/stat
                            counts elsewhere stay accurate. */}
                        <div className={`p-4 rounded-2xl border flex flex-col lg:flex-row lg:items-center gap-4 ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900/20 border-white/5 backdrop-blur-md'}`}>
                           <div className="relative flex-1 w-full">
                              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`} size={14} />
                              <input
                                 type="text"
                                 value={librarySearch}
                                 onChange={(e) => setLibrarySearch(e.target.value)}
                                 className={`w-full border rounded-xl pl-11 pr-4 py-2.5 text-xs focus:outline-none transition-all ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500' : 'bg-zinc-900 border-white/10 text-white focus:border-brand-purple/50'}`}
                                 placeholder="Search library by title or category..."
                              />
                           </div>
                           <div className="flex items-center gap-2">
                              {([
                                 ["not_edited", "Not Edited"],
                                 ["edited", "Edited"],
                                 ["published", "Published"],
                              ] as const).map(([value, label]) => (
                                 <button
                                    key={value}
                                    onClick={() => setLibraryTab(value)}
                                    className={`on-dark-overlay px-4 py-2.5 rounded-xl font-bold text-[11px] tracking-wider transition-all uppercase whitespace-nowrap border ${
                                       libraryTab === value
                                          ? 'bg-brand-purple text-white border-brand-purple'
                                          : (isLightMode ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-white/10 text-zinc-400 hover:bg-white/5')
                                    }`}
                                 >
                                    {label}
                                 </button>
                              ))}
                           </div>
                        </div>

                        {localOnlyPosts.length > 0 && (
                           <div className={`p-6 rounded-3xl border mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                              isLightMode 
                                 ? 'bg-amber-50/50 border-amber-200/60 shadow-sm' 
                                 : 'bg-amber-950/20 border-amber-500/25'
                           }`}>
                              <div className="space-y-1">
                                 <div className="flex items-center gap-2 text-amber-500">
                                    <Database size={16} className="animate-bounce" />
                                    <span className="text-xs font-black uppercase tracking-widest">Local Offline Storage Active</span>
                                 </div>
                                 <h4 className={`text-md font-bold tracking-tight ${isLightMode ? 'text-slate-800' : 'text-zinc-100'}`}>
                                    మీ బ్రౌజర్ లో {localOnlyPosts.length} ఆర్టికల్స్ కేవలం లోకల్ గా మాత్రమే ఉన్నాయి!
                                 </h4>
                                 <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>
                                    ఇవి Sanity క్లౌడ్ లో సేవ్ కాలేదు. Quota నిండుకోకుండా ఉండటానికి మరియు క్లౌడ్ లో భద్రపరచడానికి వీటిని Sanity కి తరలించండి.
                                 </p>
                              </div>
                              <button
                                 onClick={async () => {
                                    if (!sanityWriteToken && !sanityProjectId && !serverSanityConfigured) {
                                       alert("దయచేసి మొదట మీ Sanity ప్రాజెక్ట్ వివరాలను సెటింగ్స్ లో కాన్ఫిగర్ చేయండి. (Please configure your Sanity credentials in Settings first.)");
                                       return;
                                    }

                                    if (!window.confirm(`మీరు ఈ ${localOnlyPosts.length} లోకల్ ఆర్టికల్స్ ని Sanity క్లౌడ్ కి తరలించాలనుకుంటున్నారా?`)) {
                                       return;
                                    }

                                    setIsBatchPublishing(true);
                                    setBatchPublishProgress(`లోకల్ ఆర్టికల్స్ ని Sanity కి తరలిస్తున్నాము...`);
                                    
                                    let migratedCount = 0;
                                    let failedCount = 0;

                                    for (let i = 0; i < localOnlyPosts.length; i++) {
                                       const post = localOnlyPosts[i];
                                       setBatchPublishProgress(`Migrating ${i+1}/${localOnlyPosts.length}: "${post.title?.slice(0, 30)}..."`);
                                       
                                       try {
                                          const responseObj = await safeFetchJson("/api/articles/publish-sanity", {
                                             method: "POST",
                                             headers: { "Content-Type": "application/json" },
                                             body: JSON.stringify({
                                                // See comment at the first publish-sanity call —
                                                // optional overrides now that backend has server-side config.
                                                projectId: sanityProjectId || undefined,
                                                dataset: sanityDataset || undefined,
                                                token: sanityWriteToken || undefined,
                                                post: {
                                                   _id: undefined, // Create as new item in Sanity
                                                   title: post.title,
                                                   slug: post.slug?.current || post.slug || (post.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                                                   excerpt: post.excerpt,
                                                   bodyText: post.bodyText || post.content || post.body || "",
                                                   category: post.category,
                                                   image: post.image,
                                                   imageAlt: post.imageAlt,
                                                   imageCaption: post.imageCaption,
                                                   authorName: post.authorName,
                                                   authorBio: post.authorBio,
                                                   keyword: post.keyword,
                                                   metaTitle: post.metaTitle,
                                                   metaDescription: post.metaDescription,
                                                   metaTags: post.metaTags,
                                                   secondaryKeywords: post.secondaryKeywords
                                                }
                                             })
                                          });

                                          if (responseObj && responseObj.success) {
                                             onPostPublished({
                                                ...responseObj.post,
                                                id: responseObj.documentId,
                                                image: responseObj.post?.image || post.image,
                                                localOnly: false // Explicitly mark as non-local to trigger deletion from localPosts
                                             });
                                             migratedCount++;
                                          } else {
                                             failedCount++;
                                          }
                                       } catch (err) {
                                          console.error("Migration error for", post.title, err);
                                          failedCount++;
                                       }
                                    }

                                    setIsBatchPublishing(false);
                                    setBatchPublishProgress("");
                                    alert(`మొత్తం ఆర్టికల్స్ విజయవంతంగా తరలించబడ్డాయి!\nతరలించినవి: ${migratedCount}\nవిఫలమైనవి: ${failedCount}`);
                                 }}
                                 disabled={isBatchPublishing}
                                 className="px-6 py-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-zinc-950 rounded-2xl font-black text-xs tracking-wider shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all uppercase flex items-center gap-2 self-start md:self-auto disabled:opacity-50"
                              >
                                 {isBatchPublishing ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                                 Move all to Sanity ⚡
                              </button>
                           </div>
                        )}

                        {libraryLoading && (
                           <div className={`rounded-xl px-4 py-2.5 text-xs font-semibold ${isLightMode ? 'bg-blue-50 text-blue-700' : 'bg-blue-500/10 text-blue-300'}`}>
                              Loading...
                           </div>
                        )}
                        {libraryError && (
                           <div className={`rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-3 ${isLightMode ? 'bg-red-50 text-red-700' : 'bg-red-500/10 text-red-300'}`}>
                              <span>{libraryError}</span>
                              <button onClick={() => loadLibraryPage(libraryTab, 1, false)} className="underline font-bold whitespace-nowrap">Retry</button>
                           </div>
                        )}

                        {isBatchPublishing && (
                           <div className={`p-5 rounded-2xl border flex items-center gap-4 animate-pulse ${isLightMode ? 'bg-violet-50 border-violet-100 text-violet-700' : 'bg-brand-purple/10 border-brand-purple/15 text-brand-purple'}`}>
                              <Loader2 className="animate-spin h-5 w-5 text-brand-purple" />
                              <div className="flex-1 flex flex-col gap-1">
                                 <p className="text-xs font-black uppercase tracking-widest">Executing batch operations...</p>
                                 <p className="text-[10px] font-mono opacity-80">{batchPublishProgress}</p>
                              </div>
                           </div>
                        )}
                        
                        {filteredLibraryPosts.length === 0 ? (
                           <div className="flex flex-col items-center justify-center p-20 border border-dashed rounded-3xl text-center opacity-40">
                              <FileText size={48} className="mb-4 text-zinc-400" />
                              <h4 className={`text-xs font-black uppercase tracking-wider ${isLightMode ? 'text-slate-550' : 'text-zinc-500'}`}>No matching articles</h4>
                              <p className="text-zinc-600 text-[11px] max-w-sm mt-1 leading-relaxed">Try a different search term or switch back to "All".</p>
                           </div>
                        ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                           {filteredLibraryPosts.map((post: any, idx: number) => {
                              const postId = post._id || post.id || `post-library-${idx}`;
                              const isSelected = selectedPostIds.includes(postId);
                              return (
                                 <div key={postId} className={`border rounded-3xl overflow-hidden group hover:border-brand-purple/30 transition-all flex flex-col shadow-lg backdrop-blur-sm relative ${isSelected ? 'ring-2 ring-brand-purple' : ''} ${isLightMode ? 'bg-slate-50 border-slate-200 hover:bg-white' : 'bg-zinc-900/40 border-white/[0.04]'}`}>
                                    <div className="h-44 bg-zinc-800/20 relative overflow-hidden">
                                       {post.image ? (
                                         <img src={post.image} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-1000" alt={post.title} />
                                       ) : (
                                         <div className={`w-full h-full flex items-center justify-center ${isLightMode ? 'text-slate-300' : 'text-zinc-800'}`}>
                                            <FileText size={48} className="opacity-20 translate-y-2" />
                                         </div>
                                       )}
                                       
                                       {/* Checkbox overlay */}
                                       <div className="absolute top-4 right-4 z-10 flex items-center justify-center">
                                          <input
                                             type="checkbox"
                                             checked={isSelected}
                                             onChange={(e) => {
                                                const id = postId;
                                                setSelectedPostIds(prev =>
                                                   prev.includes(id)
                                                      ? prev.filter(x => x !== id)
                                                      : [...prev, id]
                                                );
                                             }}
                                             className="h-5 w-5 cursor-pointer rounded-md accent-brand-purple border border-white/20 shadow-xl"
                                          />
                                       </div>

                                       <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
                                          <div className="px-2.5 py-1 bg-zinc-950/80 backdrop-blur-md rounded-lg text-[8px] font-black uppercase text-brand-purple border border-brand-purple/20 tracking-widest shadow-xl">
                                             {post.category}
                                          </div>
                                          {post.generationFailed === true ? (
                                             <div className="px-2 py-0.5 bg-rose-500/20 backdrop-blur-md rounded text-[7px] font-black uppercase text-rose-400 border border-rose-500/30 tracking-wider shadow-lg" title={post.generationFailedReason || "Auto-generation pipeline failed partway through"}>
                                                ⚠️ FAILED — NEEDS FIX
                                             </div>
                                          ) : post.approved === false ? (
                                             <div className="px-2 py-0.5 bg-yellow-500/20 backdrop-blur-md rounded text-[7px] font-black uppercase text-yellow-400 border border-yellow-500/30 tracking-wider shadow-lg">
                                                PENDING APPROVAL
                                             </div>
                                          ) : post.finalized === true ? (
                                             <div className="px-2 py-0.5 bg-sky-500/20 backdrop-blur-md rounded text-[7px] font-black uppercase text-sky-400 border border-sky-500/30 tracking-wider shadow-lg">
                                                📦 PUBLISHED
                                             </div>
                                          ) : (
                                             <div className="px-2 py-0.5 bg-emerald-500/20 backdrop-blur-md rounded text-[7px] font-black uppercase text-emerald-400 border border-emerald-500/30 tracking-wider shadow-lg">
                                                APPROVED
                                             </div>
                                          )}
                                          {post.localOnly === true && (
                                             <div className="px-2 py-0.5 bg-amber-500/20 backdrop-blur-md rounded text-[7px] font-black uppercase text-amber-400 border border-amber-500/30 tracking-wider shadow-lg">
                                                LOCAL ONLY 💾
                                             </div>
                                          )}
                                       </div>
                                    </div>
                                 <div className={`p-7 space-y-4 flex-1 flex flex-col ${isLightMode ? 'text-slate-900' : ''}`}>
                                    <h3 className={`font-bold text-lg line-clamp-2 leading-snug transition-colors tracking-tight ${isLightMode ? 'text-slate-900 group-hover:text-brand-purple' : 'text-zinc-100 group-hover:text-white'}`}>{post.title}</h3>
                                    <p className={`text-sm line-clamp-2 flex-1 font-medium leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>{post.excerpt}</p>
                                    <div className="flex justify-between items-center pt-5 border-t border-white/[0.04] text-[10px] font-bold tracking-widest uppercase gap-2">
                                       <span className={`tabular-nums ${isLightMode ? 'text-slate-400' : 'text-zinc-600'}`}>{post.date || new Date(post.publishedAt || post._createdAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric'})}</span>
                                       <div className="flex items-center gap-3">
                                          <button 
                                             onClick={async (e) => {
                                                e.stopPropagation();
                                                if (togglingApprovedId === postId) return;
                                                const newApproved = post.approved !== false ? false : true;
                                                if (post.localOnly) {
                                                   // Local-only (not-yet-published-to-Sanity) drafts have nothing
                                                   // to persist server-side yet — just update local state.
                                                   onPostPublished({ ...post, approved: newApproved });
                                                   return;
                                                }
                                                setTogglingApprovedId(postId);
                                                try {
                                                   const data = await safeFetchJson("/api/articles/set-approved", {
                                                      method: "POST",
                                                      headers: { "Content-Type": "application/json" },
                                                      body: JSON.stringify({ id: postId, approved: newApproved }),
                                                   });
                                                   if (data.success) {
                                                      onPostPublished({ ...post, approved: newApproved });
                                                      setLibraryPosts((prev) => {
                                                         const newFinalized = post.finalized === true;
                                                         const stillBelongsInTab =
                                                            libraryTab === "not_edited" ? newApproved === false :
                                                            libraryTab === "published" ? (newApproved !== false && newFinalized) :
                                                            (newApproved !== false && !newFinalized);
                                                         if (!stillBelongsInTab) {
                                                            return prev.filter((p) => (p._id || p.id) !== postId);
                                                         }
                                                         return prev.map((p) => ((p._id || p.id) === postId ? { ...p, approved: newApproved } : p));
                                                      });
                                                   } else {
                                                      alert(`Status update fail అయింది: ${data.error || "Unknown error"}`);
                                                   }
                                                } catch (err: any) {
                                                   alert(`Status update error: ${err.message || err}`);
                                                } finally {
                                                   setTogglingApprovedId(null);
                                                }
                                             }} 
                                             disabled={togglingApprovedId === postId}
                                             className={`transition-colors px-2 py-1 rounded border text-[7px] font-black tracking-widest uppercase disabled:opacity-50 ${
                                                post.approved === false 
                                                   ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40' 
                                                   : 'bg-zinc-800/10 hover:bg-zinc-850 text-zinc-400 border-white/5 hover:border-white/10'
                                             }`}
                                          >
                                             {togglingApprovedId === postId ? "..." : post.approved === false ? "APPROVE ✅" : "DRAFT ⏳"}
                                          </button>
                                          {post.approved !== false && !post.localOnly && (
                                             <button
                                                onClick={async (e) => {
                                                   e.stopPropagation();
                                                   if (togglingApprovedId === postId) return;
                                                   const newFinalized = post.finalized === true ? false : true;
                                                   setTogglingApprovedId(postId);
                                                   try {
                                                      const data = await safeFetchJson("/api/articles/set-approved", {
                                                         method: "POST",
                                                         headers: { "Content-Type": "application/json" },
                                                         body: JSON.stringify({ id: postId, finalized: newFinalized }),
                                                      });
                                                      if (data.success) {
                                                         onPostPublished({ ...post, finalized: newFinalized });
                                                         setLibraryPosts((prev) => {
                                                            const stillBelongsInTab = libraryTab === "published" ? newFinalized : !newFinalized;
                                                            if (!stillBelongsInTab) {
                                                               return prev.filter((p) => (p._id || p.id) !== postId);
                                                            }
                                                            return prev.map((p) => ((p._id || p.id) === postId ? { ...p, finalized: newFinalized } : p));
                                                         });
                                                      } else {
                                                         alert(`Status update fail అయింది: ${data.error || "Unknown error"}`);
                                                      }
                                                   } catch (err: any) {
                                                      alert(`Status update error: ${err.message || err}`);
                                                   } finally {
                                                      setTogglingApprovedId(null);
                                                   }
                                                }}
                                                disabled={togglingApprovedId === postId}
                                                title={post.finalized === true ? "Move back to the Edited working tab" : "Archive — mark fully done, move to Published tab"}
                                                className={`transition-colors px-2 py-1 rounded border text-[7px] font-black tracking-widest uppercase disabled:opacity-50 ${
                                                   post.finalized === true
                                                      ? 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border-sky-500/20 hover:border-sky-500/40'
                                                      : 'bg-zinc-800/10 hover:bg-zinc-850 text-zinc-400 border-white/5 hover:border-white/10'
                                                }`}
                                             >
                                                {togglingApprovedId === postId ? "..." : post.finalized === true ? "↩ UNARCHIVE" : "📦 ARCHIVE"}
                                             </button>
                                          )}
                                          {confirmDeleteId === postId ? (
                                              <span className="flex items-center gap-1 bg-zinc-950/80 p-0.5 rounded border border-rose-500/20">
                                                 <button
                                                    onClick={(e) => {
                                                       e.stopPropagation();
                                                       handleSingleDelete(postId);
                                                    }}
                                                    disabled={isDeleting}
                                                    className="bg-rose-600 hover:bg-rose-700 text-white rounded px-1.5 py-0.5 text-[6.5px] font-black tracking-wider uppercase transition-colors disabled:opacity-50"
                                                 >
                                                    {isDeleting ? "..." : "YES 🗑️"}
                                                 </button>
                                                 <button
                                                    onClick={(e) => {
                                                       e.stopPropagation();
                                                       setConfirmDeleteId(null);
                                                    }}
                                                    className="bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded px-1.5 py-0.5 text-[6.5px] font-bold uppercase transition-colors"
                                                 >
                                                    NO
                                                 </button>
                                              </span>
                                           ) : (
                                              <button
                                                 onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmDeleteId(postId);
                                                 }}
                                                 className="px-1.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/35 rounded text-[7px] font-black tracking-widest uppercase transition-colors"
                                                 title="Delete Article"
                                              >
                                                 DELETE 🗑️
                                              </button>
                                           )}
                                           <button onClick={() => handleEditExisting(post)} className="text-brand-purple hover:text-white transition-colors flex items-center gap-1.5 group/btn">
                                             OPEN STUDIO
                                             <ArrowRight size={11} className="group-hover/btn:translate-x-1 transition-transform" />
                                          </button>
                                       </div>
                                    </div>
                                 </div>
                                 </div>
                              );
                           })}
                        </div>
                        )}

                        {libraryHasMore && !librarySearch && (
                           <div className="flex justify-center pb-10">
                              <button
                                 onClick={() => loadLibraryPage(libraryTab, libraryPage + 1, true)}
                                 disabled={libraryLoadingMore}
                                 className={`px-6 py-3 rounded-full border text-sm font-bold transition-colors disabled:opacity-50 ${isLightMode ? 'border-brand-purple/60 text-brand-purple hover:bg-brand-purple/5' : 'border-brand-purple/60 text-[var(--color-brand-purple-accessible)] hover:bg-brand-purple/10'}`}
                              >
                                 {libraryLoadingMore ? "లోడ్ అవుతోంది..." : "మరిన్ని చూడండి (Load More)"}
                              </button>
                           </div>
                        )}
                     </div>
                  </div>
               )}
            </div>
          </main>


      {showImagePromptsModal && generatedImagePrompts && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className={`relative w-full max-w-2xl rounded-3xl border shadow-2xl p-6 sm:p-8 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300 ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-white/5'}`}>
            
            {/* Header */}
            <div className={`flex items-center justify-between border-b pb-4 mb-6 ${isLightMode ? 'border-slate-100' : 'border-white/5'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-brand-purple/10 border border-brand-purple/25 text-brand-purple shrink-0">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-black tracking-[0.2em] text-[#a855f7] uppercase block">AI Generative Content</span>
                  <h3 className={`text-sm sm:text-base font-extrabold ${isLightMode ? 'text-slate-800' : 'text-white'}`}>కథనం ఇమేజ్ ప్రాంప్ట్స్ (Article Image Prompts)</h3>
                </div>
              </div>
              <button 
                onClick={() => setShowImagePromptsModal(false)}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${isLightMode ? 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700' : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-400 hover:text-white'}`}
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Contents */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-5 scrollbar-thin">
              <p className={`text-xs ${isLightMode ? 'text-slate-600' : 'text-zinc-400'} leading-relaxed`}>
                మీ కథన కథాంశాన్ని విశ్లేషించి దానికి సరిపోయే విధంగా ఒక <b>హీరో ఫీచర్ చిత్రం (Featured Image)</b> మరియు మూడు <b>కంటెంట్ సార్వత్రిక చిత్రాల (Content Images)</b> ప్రాంప్ట్‌లు సిద్ధం చేయడమైనది:
              </p>

              {[
                { key: 'featured', label: 'Featured Image (ప్రధాన చిత్రం - Hero Cover)', color: 'bg-brand-purple', textColor: 'text-[#a855f7]' },
                { key: 'content1', label: 'Content Image 1 (క్రియాశీల చిత్రం 1 - Upper Block)', color: 'bg-indigo-500', textColor: 'text-indigo-400' },
                { key: 'content2', label: 'Content Image 2 (క్రియాశీల చిత్రం 2 - Middle Block)', color: 'bg-sky-500', textColor: 'text-sky-400' },
                { key: 'content3', label: 'Content Image 3 (క్రియాశీల చిత్రం 3 - Late Block)', color: 'bg-pink-500', textColor: 'text-[#ec4899]' }
              ].map((card) => {
                const item = (generatedImagePrompts as any)[card.key];
                const info = getPromptInfo(item);
                if (!info.prompt) return null;

                return (
                  <div key={card.key} className={`p-4 sm:p-5 rounded-2xl border flex flex-col gap-4 relative overflow-hidden group ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.02] border-white/5'}`}>
                    
                    {/* Title & Copy */}
                    <div className="flex items-start sm:items-center justify-between gap-2 flex-col sm:flex-row">
                       <div className="flex items-center gap-2">
                         <span className={`h-2.5 w-2.5 rounded-full ${card.color} animate-pulse`} />
                         <span className={`text-[10px] font-black uppercase tracking-widest ${card.textColor}`}>{card.label}</span>
                       </div>
                       <CopyButton text={info.prompt} isLightMode={isLightMode} />
                    </div>

                    {/* Beautiful Explanations */}
                    <div className="flex flex-col gap-2 text-[11px] font-sans">
                      <div className={`p-3 rounded-xl border leading-relaxed ${isLightMode ? 'bg-indigo-100/30 border-indigo-100/50 text-slate-800' : 'bg-indigo-500/5 border-indigo-500/10 text-indigo-200'}`}>
                        <span className="font-extrabold text-brand-purple block mb-0.5">చిత్రం యొక్క వివరణ (Telugu):</span>
                        {info.teluguDescription}
                      </div>
                      <div className={`p-3 rounded-xl border leading-relaxed ${isLightMode ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white/[0.01] border-white/5 text-zinc-400'}`}>
                        <span className="font-semibold block mb-0.5">Image Explanation (English):</span>
                        {info.englishDescription}
                      </div>
                    </div>

                    {/* Raw Gen Prompt */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 block">AI Visual Generation Script</span>
                      <p className={`text-xs font-mono p-3 rounded-xl selection:bg-brand-purple/20 border leading-relaxed break-words ${isLightMode ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-black/30 border-white/[0.04] text-zinc-300'}`}>
                        {info.prompt}
                      </p>
                    </div>

                    {/* Embed & Generate Controls */}
                    <div className="flex flex-col gap-2.5 mt-2">
                      {embeddedImages[card.key] && (
                        <div className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${isLightMode ? 'bg-emerald-100/40 border-emerald-200/50 text-slate-800' : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-300'}`}>
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <img 
                              src={embeddedImages[card.key].url} 
                              alt="Compressed Generated View" 
                              referrerPolicy="no-referrer"
                              className="h-14 w-14 rounded-lg object-cover border border-emerald-500/20 bg-black shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500 truncate">కథనంలో చేర్చబడింది! (Embedded) ✅</p>
                              <p className="text-[9px] opacity-75 font-mono mt-0.5">Format: WebP • Size: {embeddedImages[card.key].sizeKb.toFixed(1)} KB</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const urlToClean = embeddedImages[card.key].url;
                              // Strip from state
                              setEmbeddedImages(prev => {
                                const next = { ...prev };
                                delete next[card.key];
                                return next;
                              });
                              // Also clean from body text HTML
                              setEditBody(prev => {
                                if (!prev) return "";
                                let cleaned = prev;
                                try {
                                  if (urlToClean.length > 500) {
                                    cleaned = cleaned.split(urlToClean).join('');
                                  } else {
                                    const escapedUrl = urlToClean.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                                    // Regex for div enclosing img
                                    const divRegex = new RegExp(`<div[^>]*>\\s*<img[^>]+src=["']${escapedUrl}["'][^>]*>[\\s\\S]*?<\\/div>`, 'gi');
                                    cleaned = cleaned.replace(divRegex, '');
                                    // Regex for raw standalone img
                                    const imgRegex = new RegExp(`<img[^>]+src=["']${escapedUrl}["'][^>]*>`, 'gi');
                                    cleaned = cleaned.replace(imgRegex, '');
                                  }
                                } catch (e) {
                                  console.error("Failed to clean inline HTML image:", e);
                                }
                                return cleaned;
                              });
                            }}
                            className="p-2 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 rounded-lg transition-all active:scale-95 border border-rose-500/20 shrink-0 cursor-pointer"
                            title="Delete sub-image"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                       )}

                      <button
                        onClick={() => handleGenerateAndEmbedImage(card.key)}
                        disabled={generatingSpecialKeys[card.key]}
                        className={`w-full py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                          generatingSpecialKeys[card.key]
                            ? "bg-brand-purple/15 border-brand-purple/30 text-brand-purple cursor-wait"
                            : embeddedImages[card.key]
                            ? isLightMode
                              ? "bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200"
                              : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                            : "bg-brand-purple text-white border-transparent hover:bg-brand-purple/90 shadow-md hover:shadow-lg active:scale-[0.98]"
                        }`}
                      >
                        {generatingSpecialKeys[card.key] ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-purple" />
                            <span>చిత్ర సృష్టి & కుదింపు (Processing & Compressing Under 100KB)...</span>
                          </>
                        ) : embeddedImages[card.key] ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>చిత్రాన్ని తిరిగి రూపొందించు (Regenerate & Re-embed)</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="h-3.5 w-3.5" />
                            <span>చిత్రాన్ని సృష్టించి కథనంలో చేర్చు (Generate & Embed Image)</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className={`border-t pt-5 mt-6 flex justify-end gap-3 ${isLightMode ? 'border-slate-100' : 'border-white/5'}`}>
              <button 
                onClick={() => setShowImagePromptsModal(false)}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${isLightMode ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10 text-white'}`}
              >
                Close (మూసివేయి)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Internal Article Link Picker Modal */}
      {showLinkPicker && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className={`relative w-full max-w-xl rounded-3xl border shadow-2xl p-6 flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-300 ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-white/5'}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-brand-purple/10 text-brand-purple border border-brand-purple/20">
                  <LinkIcon size={20} />
                </div>
                <h3 className={`text-lg font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Internal Linking (ఇంటర్నల్ లింక్)</h3>
              </div>
              <button 
                onClick={() => setShowLinkPicker(false)}
                className={`p-2 rounded-lg transition-colors ${isLightMode ? 'hover:bg-slate-100' : 'hover:bg-white/5'}`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative mb-6">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`} size={16} />
              <input 
                type="text"
                autoFocus
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                placeholder="Search articles by title..."
                className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${isLightMode ? 'bg-slate-50 border-slate-200 focus:ring-brand-purple/20' : 'bg-zinc-950 border-white/10 focus:ring-brand-purple/40 text-white'}`}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {existingPosts
                .filter(p => !linkSearch || (p.title || "").toLowerCase().includes(linkSearch.toLowerCase()))
                .length === 0 ? (
                  <div className="text-center py-10 opacity-50">
                    <p className="text-sm">No articles found matching search.</p>
                  </div>
                ) : (
                  existingPosts
                    .filter(p => !linkSearch || (p.title || "").toLowerCase().includes(linkSearch.toLowerCase()))
                    .map((post) => {
                      const slug = typeof post.slug === 'object' ? post.slug?.current : post.slug;
                      return (
                        <button
                          key={post._id || post.id}
                          onClick={() => {
                            const path = `/${slug}`;
                            editorRef.current?.insertLink(path);
                            setShowLinkPicker(false);
                            setLinkSearch("");
                          }}
                          className={`w-full text-left p-4 rounded-2xl border transition-all group flex items-center justify-between ${isLightMode ? 'bg-slate-50 border-slate-100 hover:border-brand-purple/50 hover:bg-white' : 'bg-white/5 border-transparent hover:border-brand-purple/50 hover:bg-white/[0.08]'}`}
                        >
                          <div className="min-w-0 pr-4">
                            <h4 className={`text-sm font-bold truncate group-hover:text-brand-purple ${isLightMode ? 'text-slate-800' : 'text-white'}`}>{post.title}</h4>
                            <p className="text-[10px] opacity-50 font-mono mt-0.5 truncate">/ {slug}</p>
                          </div>
                          <ChevronRight size={16} className="shrink-0 opacity-0 group-hover:opacity-100 transition-all text-brand-purple" />
                        </button>
                      );
                    })
                )
              }
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
