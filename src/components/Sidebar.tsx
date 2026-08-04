import { useState } from "react";
import { MoveRight } from "lucide-react";
import { trendingNow } from "../data";
import { AdSlot } from "./AdSlot";
import { safeFetchJson } from "../lib/api";

interface Category {
  name: string;
  count: number;
  icon: string;
}

interface TrendingArticle {
  slug: string;
  title: string;
  image?: string;
  views: number;
}

interface SidebarProps {
  categories?: Category[];
  posts?: any[];
  onArticleClick?: (post: any) => void;
  trendingArticles?: TrendingArticle[];
  onTrendingArticleClick?: (slug: string) => void;
  /** True while the admin dashboard overlay is open — skips mounting the
   * ad slot entirely (not just visually hiding it) so no ad script/request
   * activity happens during an admin session. */
  hideAds?: boolean;
}

export function Sidebar({ posts, onArticleClick, trendingArticles, onTrendingArticleClick, hideAds }: SidebarProps) {
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [subscribeError, setSubscribeError] = useState("");

  const handleSubscribe = async () => {
    const email = subscribeEmail.trim();
    if (!email) return;
    setSubscribeStatus("loading");
    setSubscribeError("");
    try {
      const data = await safeFetchJson("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (data?.success) {
        setSubscribeStatus("success");
      } else {
        setSubscribeStatus("error");
        setSubscribeError(data?.error || "Something went wrong. Please try again.");
      }
    } catch (e: any) {
      setSubscribeStatus("error");
      setSubscribeError(e?.message || "Something went wrong. Please try again.");
    }
  };

  // Real view-based trending data takes priority. Falls back to the first
  // 4 currently-loaded posts (previous behavior) if trending data hasn't
  // loaded yet or a brand-new site has no tracked views yet, and finally
  // to static placeholder data as a last resort so the section is never
  // completely empty.
  const displayTrending = trendingArticles && trendingArticles.length > 0
    ? trendingArticles.map((t) => ({ id: t.slug, title: t.title, date: undefined, image: t.image, __isTrendingSlug: t.slug }))
    : posts && posts.length > 0
    ? posts.slice(0, 4).map((p, idx) => ({
        id: p.id || idx,
        title: p.title,
        date: p.date,
        image: p.image,
        category: p.category,
        readTime: p.readTime,
        body: p.body,
        excerpt: p.excerpt,
      }))
    : trendingNow;

  return (
    <aside className="space-y-12">
      {/* Trending Now */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-6 w-1 rounded-full bg-brand-purple" />
          <h2 className="text-xl font-bold">Trending Now</h2>
        </div>
        <div className="flex flex-col gap-5">
          {displayTrending.map((post: any) => (
            <div 
              key={post.id} 
              onClick={() => (post.__isTrendingSlug ? onTrendingArticleClick?.(post.__isTrendingSlug) : onArticleClick?.(post))}
              className="group flex items-center gap-4 cursor-pointer"
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-card border border-white/5 shadow-sm">
                <img 
                  src={post.image} 
                  alt={post.title} 
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <h3 className="font-semibold leading-snug group-hover:text-brand-purple transition-colors line-clamp-2 text-sm text-gray-200">
                  {post.title}
                </h3>
                <span className="text-xs text-brand-text-muted">{post.date && post.date !== 'Recent' ? post.date : 'June 9, 2026'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stay Updated Widget */}
      <div className="rounded-2xl border border-white/5 bg-brand-card p-6">
        <h3 className="text-xl font-bold mb-3">Stay Updated</h3>
        {subscribeStatus === "success" ? (
          <p className="text-sm text-emerald-400 leading-relaxed">You're subscribed! Thanks for joining us.</p>
        ) : (
          <>
            <p className="text-sm text-brand-text-muted mb-6 leading-relaxed">
              Get the latest AI news, tools and tutorials straight to your inbox.
            </p>
            <div className="flex flex-col gap-3">
              <input 
                type="email" 
                value={subscribeEmail}
                onChange={(e) => setSubscribeEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubscribe(); }}
                placeholder="Enter your email" 
                disabled={subscribeStatus === "loading"}
                className="w-full rounded-lg bg-white px-4 py-3 text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-brand-purple disabled:opacity-60"
              />
              {subscribeStatus === "error" && <p className="text-xs text-rose-400">{subscribeError}</p>}
              <button 
                type="button"
                onClick={handleSubscribe}
                disabled={subscribeStatus === "loading" || !subscribeEmail.trim()}
                className="on-dark-overlay w-full rounded-lg bg-brand-purple px-4 py-3 font-medium text-white hover:bg-brand-purple-hover transition-colors disabled:opacity-60"
              >
                {subscribeStatus === "loading" ? "Subscribing..." : "Subscribe Now"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Sidebar ad — renders nothing until VITE_ADSENSE_CLIENT_ID and a
          real ad unit slot ID are configured. See src/components/AdSlot.tsx.
          Also skipped entirely while hideAds is set (admin dashboard open). */}
      {!hideAds && (
        <AdSlot slot="sidebar" adSlotId={import.meta.env.VITE_ADSENSE_SIDEBAR_SLOT} />
      )}

      {/* Follow Us */}
      <div>
        <h3 className="text-lg font-bold mb-4">Follow Us</h3>
        <div className="flex gap-3">
          {['facebook', 'twitter', 'linkedin', 'instagram', 'youtube'].map((social) => (
            <a 
              key={social} 
              href="#" 
              aria-label={`Follow us on ${social.charAt(0).toUpperCase() + social.slice(1)}`}
              className="flex h-10 w-10 flex-col items-center justify-center rounded-xl bg-brand-card border border-white/5 hover:bg-brand-purple hover:border-brand-purple text-gray-300 hover:text-white transition-all shadow-sm shadow-black/20"
            >
              {/* Fallback to simple CSS icons since I don't import them all explicitly to keep clean */}
              <div className="h-4 w-4 bg-current" style={{maskImage: `url('https://cdn-icons-png.flaticon.com/512/104/10462.png')`, WebkitMaskImage: `url('https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/${social}.svg')`, maskSize: 'cover', WebkitMaskSize: 'cover'}} />
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
}
