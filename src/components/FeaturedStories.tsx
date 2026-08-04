import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { featuredStories } from "../data";
import { getCategoryTheme } from "../lib/categoryTheme";

interface FeaturedStoriesProps {
  posts?: any[];
  onArticleClick?: (post: any) => void;
}

const AUTOPLAY_MS = 5500;
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=1200';

export function FeaturedStories({ posts, onArticleClick }: FeaturedStoriesProps) {
  const slides = useMemo(() => {
    const source = posts && posts.length > 0 ? posts : featuredStories;
    return source.slice(0, 5);
  }, [posts]);

  // A handful of extra recent titles (beyond the carousel slides) to flow
  // through the "LIVE" ticker strip, so it reads as a distinct feed rather
  // than repeating exactly what's already visible in the carousel below.
  const tickerItems = useMemo(() => {
    const source = posts && posts.length > 0 ? posts : featuredStories;
    return source.slice(0, 8);
  }, [posts]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setActiveIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    timerRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length, isPaused]);

  const goTo = (i: number) => setActiveIndex(((i % slides.length) + slides.length) % slides.length);
  const goPrev = () => goTo(activeIndex - 1);
  const goNext = () => goTo(activeIndex + 1);

  if (slides.length === 0) return null;

  const active = slides[activeIndex];
  const activeTheme = getCategoryTheme(Array.isArray(active.category) ? active.category[0] : active.category);

  return (
    <section className="mb-16">
      {/* Live ticker: latest published articles flowing continuously */}
      {tickerItems.length > 0 && (
        <div className="mb-8 flex items-center gap-4 overflow-hidden rounded-xl border border-white/5 bg-brand-card/60 px-4 py-3">
          <span className="flex-shrink-0 flex items-center gap-1.5 rounded-md bg-brand-purple px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Live
          </span>
          <div className="relative flex-1 overflow-hidden">
            <div
              className="flex w-max gap-12 whitespace-nowrap text-sm text-brand-text-muted"
              style={{ animation: `mw-ticker-scroll ${Math.max(18, tickerItems.length * 5)}s linear infinite` }}
            >
              {[...tickerItems, ...tickerItems].map((item, i) => (
                <button
                  key={`${item.id ?? item._id ?? item.title}-${i}`}
                  onClick={() => onArticleClick?.(item)}
                  className="hover:text-brand-purple transition-colors"
                >
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1.5 rounded-full bg-brand-purple" />
          <h2 className="text-2xl font-bold">Featured Stories</h2>
        </div>
        {slides.length > 1 && (
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={goPrev}
              aria-label="Previous story"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-brand-text-muted hover:text-white hover:border-brand-purple/50 hover:bg-brand-purple/10 transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goNext}
              aria-label="Next story"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-brand-text-muted hover:text-white hover:border-brand-purple/50 hover:bg-brand-purple/10 transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div
        className="group/carousel relative overflow-hidden rounded-2xl aspect-[16/9] bg-brand-card border border-white/5 shadow-lg cursor-pointer"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onClick={() => onArticleClick?.(active)}
      >
        {slides.map((story, i) => (
          <img
            key={story.id ?? story._id ?? i}
            src={story.image || FALLBACK_IMAGE}
            alt={story.imageAlt || story.title}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
            style={{ opacity: i === activeIndex ? 1 : 0 }}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
            }}
          />
        ))}

        <div
          className="pointer-events-none absolute inset-0 transition-[background] duration-500"
          style={{ background: `linear-gradient(to top, rgba(8,4,18,1) 0%, rgba(8,4,18,0.9) 25%, rgba(15,6,32,0.55) 48%, ${activeTheme.accent}29 68%, rgba(0,0,0,0) 90%)` }}
        />

        <div className="absolute top-4 left-4 z-10 sm:top-6 sm:left-6">
          <span className="on-dark-overlay rounded px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md" style={{ background: activeTheme.accent }}>
            {active.category}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 p-5 sm:p-8">
          <span className="mb-2 block h-0.5 w-10 rounded-full" style={{ background: activeTheme.accent }} />
          <h3
            className="on-dark-overlay max-w-2xl text-lg sm:text-2xl font-bold leading-tight text-white line-clamp-2"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
          >
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArticleClick?.(active); }}
              className="on-dark-overlay text-left font-bold leading-tight outline-none text-white"
            >
              {active.title}
            </button>
          </h3>
          <div className="on-dark-overlay mt-2 flex items-center gap-2 text-xs sm:text-sm text-gray-300">
            <span>{active.date && active.date !== 'Recent' ? active.date : 'June 9, 2026'}</span>
            <span>•</span>
            <span className="font-semibold text-[#c4b5fd]">Published by Kiran</span>
          </div>
        </div>

        {/* Dot indicators */}
        {slides.length > 1 && (
          <div className="absolute bottom-4 right-5 z-10 flex items-center gap-0.5 sm:bottom-6 sm:right-8">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(i); }}
                aria-label={`Go to story ${i + 1}`}
                className="flex items-center justify-center h-6 w-6"
              >
                <span
                  className="h-1.5 rounded-full transition-all block"
                  style={{
                    width: i === activeIndex ? '20px' : '7px',
                    backgroundColor: i === activeIndex ? activeTheme.accent : 'rgba(255,255,255,0.4)',
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
