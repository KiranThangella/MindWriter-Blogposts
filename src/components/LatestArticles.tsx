import { Fragment, useEffect, useRef, useState } from "react";
import { MoveRight } from "lucide-react";
import { latestArticles } from "../data";
import { getCategoryTheme } from "../lib/categoryTheme";
import { AdSlot } from "./AdSlot";

interface Article {
  id: string | number;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
}

interface LatestArticlesProps {
  posts?: any[];
  onArticleClick?: (post: any) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  /** True while the admin dashboard overlay is open — skips mounting the
   * in-feed ad slot entirely (not just visually hiding it) so no ad
   * script/request activity happens during an admin session. */
  hideAds?: boolean;
}

export function LatestArticles({ posts, onArticleClick, hasMore, loadingMore, onLoadMore, hideAds }: LatestArticlesProps) {
  const displayArticles = posts && posts.length > 0 ? posts : latestArticles;

  // Load More correctly appends new posts, but they land below the fold
  // (below the button, out of view) with no other indication anything
  // happened — from the user's seat it looks like the click did nothing.
  // This remembers the count right before a click and, once the new posts
  // actually arrive, scrolls the first of them into view.
  const prevCountRef = useRef(displayArticles.length);
  const pendingScrollRef = useRef(false);
  const firstNewItemRef = useRef<HTMLElement | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (pendingScrollRef.current && displayArticles.length > prevCountRef.current) {
      pendingScrollRef.current = false;
      // Scroll to the article right after the previous last one, so the
      // person lands exactly where new content begins.
      firstNewItemRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    prevCountRef.current = displayArticles.length;
  }, [displayArticles.length]);

  const handleLoadMore = async () => {
    setLoadError(false);
    pendingScrollRef.current = true;
    const countBefore = displayArticles.length;
    try {
      await onLoadMore?.();
    } finally {
      // If the count never changed, nothing new actually arrived (a
      // silent failure otherwise invisible to the user) — surface it
      // instead of leaving them wondering why the button "did nothing".
      setTimeout(() => {
        if (prevCountRef.current === countBefore) {
          pendingScrollRef.current = false;
          setLoadError(true);
        }
      }, 100);
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1.5 rounded-full bg-brand-purple" />
          <h2 className="text-2xl font-bold">Latest Articles</h2>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {displayArticles.map((article, index) => {
          const categoryLabel = Array.isArray(article.category) ? article.category.join(', ') : article.category;
          const theme = getCategoryTheme(categoryLabel);
          return (
          <Fragment key={article.id || article._id || index}>
          {index > 0 && index % 6 === 0 && !hideAds && (
            <AdSlot slot="in-feed" adSlotId={import.meta.env.VITE_ADSENSE_IN_FEED_SLOT} />
          )}
          <article 
            ref={index === prevCountRef.current ? (firstNewItemRef as React.RefObject<HTMLElement>) : undefined}
            className="group relative flex flex-col gap-6 sm:flex-row pb-8 border-b border-white/5 last:border-0 last:pb-0 cursor-pointer rounded-2xl p-3 -m-3"
            onClick={() => onArticleClick?.(article)}
          >
            {/* Rotating colorful glow border, revealed on hover only */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                padding: '1.5px',
                background: 'conic-gradient(from var(--mw-glow-angle, 0deg), #a855f7, #ec4899, #3b82f6, #a855f7)',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
                animation: 'mw-glow-spin 3s linear infinite',
              }}
            />
            <div className="relative overflow-hidden rounded-2xl w-full sm:w-72 shrink-0 aspect-[16/9] sm:aspect-auto sm:h-48 bg-brand-card border border-white/5 shadow-md">
              <img 
                src={article.image || 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800'} 
                alt={article.imageAlt || article.title} 
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800';
                }}
              />
              <span
                className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                style={{ background: theme.accent, color: '#fff' }}
              >
                {categoryLabel}
              </span>
            </div>
            <div className="flex flex-col justify-center">
              <div className="mb-3">
                <span
                  className="rounded border px-2 py-1 text-xs font-bold uppercase tracking-wider"
                  style={{ borderColor: `${theme.accent}99`, color: theme.soft }}
                >
                  {categoryLabel}
                </span>
              </div>
              <h3 className="mb-3 text-xl sm:text-2xl font-bold leading-tight transition-colors line-clamp-2">
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArticleClick?.(article); }}
                  className="text-left font-bold text-xl sm:text-2xl leading-tight transition-colors cursor-pointer outline-none"
                  style={{ color: `color-mix(in srgb, ${theme.soft} 45%, currentColor)` }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = theme.soft; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = `color-mix(in srgb, ${theme.soft} 45%, currentColor)`; }}
                >
                  {article.title}
                </button>
              </h3>
              <p className="mb-4 text-brand-text-muted line-clamp-2 leading-relaxed text-sm">
                {article.excerpt}
              </p>
              <div className="flex items-center gap-2 text-sm text-brand-text-muted mt-auto">
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  {article.date && article.date !== 'Recent' ? article.date : 'June 9, 2026'}
                </div>
                <span>•</span>
                <span className="font-semibold text-white">Published by Kiran</span>
              </div>
            </div>
          </article>
          </Fragment>
          );
        })}
      </div>

      {onLoadMore && hasMore && (
        <div className="flex flex-col items-center gap-3 mt-10">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6 py-3 rounded-full border border-brand-purple/60 text-sm font-bold text-[var(--color-brand-purple-accessible)] hover:bg-brand-purple/10 transition-colors disabled:opacity-50"
          >
            {loadingMore ? "లోడ్ అవుతోంది..." : "మరిన్ని చూడండి"}
          </button>
          {loadError && (
            <p className="text-xs text-red-400">
              కొత్త ఆర్టికల్స్ లోడ్ కాలేదు — దయచేసి మళ్ళీ ప్రయత్నించండి. (Failed to load more — please try again.)
            </p>
          )}
        </div>
      )}
    </section>
  );
}

