import { useEffect, useState } from "react";
import { safeFetchJson } from "../lib/api";
import { ConstellationCanvas } from "./ConstellationCanvas";

// The source image is a fixed 1536x1024 (3:2) asset, but it only ever
// displays at a fraction of that size (e.g. ~362x241 on mobile, up to
// ~600x450 on desktop). Downloading the full-resolution original wasted
// ~82 KiB per visit (Lighthouse: "Improve image delivery"). wsrv.nl is a
// free, public on-the-fly image resizing proxy — no image processing
// pipeline needed on our end — that serves a smaller, re-encoded webp from
// the same source.
//
// This is the FALLBACK image only now — shown until the admin uploads real
// carousel images via Settings (see fetchHeroImages below). Kept as-is so
// nothing breaks/looks empty before that's configured.
//
// IMPORTANT: use fit=inside, not fit=cover. `w`/`h` here are a *bounding
// box*, not a target aspect ratio — the source is 3:2 while the box below
// is 4:3, and fit=cover would crop the source to force that exact ratio,
// cutting off part of the image (this previously clipped the text in the
// image). fit=inside instead scales the whole image down to fit within the
// box with no cropping, and the parent's CSS `object-contain` letterboxes
// the rest — so the full image is always visible.
const HERO_IMAGE_SRC_ORIGIN =
  'plain-apac-prod-public.komododecks.com/202606/16/6KSdeBRET92luaJv8c0l/image.webp';
function heroImageUrl(width: number, height: number) {
  return `https://wsrv.nl/?url=${HERO_IMAGE_SRC_ORIGIN}&w=${width}&h=${height}&fit=inside&output=webp&q=80`;
}
// Must stay in sync with the <link rel="preload"> in index.html so the
// browser reuses the same cached request instead of double-fetching.
const HERO_IMAGE_PRELOAD_SRC = heroImageUrl(800, 600);

const FALLBACK_SLIDE = {
  url: HERO_IMAGE_PRELOAD_SRC,
  srcSet: `${heroImageUrl(480, 360)} 480w, ${heroImageUrl(800, 600)} 800w, ${heroImageUrl(1200, 900)} 1200w`,
  alt: "Mindwriter AI",
};

const ROTATE_INTERVAL_MS = 5000;

export function Hero({ searchQuery, onSearchQueryChange, isDarkMode }: { searchQuery: string, onSearchQueryChange: (q: string) => void, isDarkMode: boolean }) {
  // Admin-uploaded carousel images (Settings -> Hero Images). Empty until
  // fetched/configured, in which case the single hardcoded fallback above
  // is used instead — so this never renders broken/empty before the admin
  // sets anything up.
  const [heroImages, setHeroImages] = useState<{ url: string; alt: string }[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    safeFetchJson("/api/admin/hero-images")
      .then((data) => {
        if (Array.isArray(data?.images) && data.images.length > 0) {
          setHeroImages(data.images);
        }
      })
      .catch((e) => console.warn("Failed to load hero images:", e));
  }, []);

  // Auto-rotate only when there's actually more than one image — a single
  // configured image (or the fallback) just stays static, no pointless
  // re-render loop.
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const id = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroImages.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [heroImages.length]);

  const usingCarousel = heroImages.length > 0;
  const currentSlide = usingCarousel ? heroImages[activeIndex] : null;

  return (
    <section className="relative mx-auto max-w-7xl px-6 py-16 overflow-hidden">
      {/* Signature element: a live constellation network standing in for
          "connected knowledge" — the actual shape of an article graph. */}
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <ConstellationCanvas isDarkMode={isDarkMode} />
      </div>
      <span className="mw-hud-corner tl hidden sm:block" aria-hidden="true" />
      <span className="mw-hud-corner tr hidden sm:block" aria-hidden="true" />
      <span className="mw-coord absolute bottom-3 right-3 hidden lg:block" aria-hidden="true">
        SIGNAL ACTIVE · NODES 1,204
      </span>

      <div className="relative flex flex-col-reverse items-center gap-12 lg:flex-row lg:justify-between">
        {/* Left Content */}
        <div className="flex flex-1 flex-col justify-center space-y-8">
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-full bg-blue-900/40 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-blue-300 ring-1 ring-inset ring-blue-700/50"
              style={{ fontFamily: "var(--font-mono-ui)" }}
            >
              <span className="mw-signal-dot" aria-hidden="true" />
              Stay Ahead with AI
            </span>
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-white lg:text-7xl">
            AI News. Ideas.
            <br />
            Insights. <span className="bg-gradient-to-r from-brand-purple via-[var(--color-brand-teal)] to-blue-400 bg-clip-text text-transparent">Future Updates.</span>
          </h1>
          <p className="max-w-lg text-lg text-brand-text-muted">
            Your daily dose of AI updates, tools, tutorials and insights to grow in the digital future.
          </p>
          
          {/* Search Bar */}
          <div className="flex w-full max-w-md items-center overflow-hidden rounded-full bg-white pl-6 focus-within:ring-2 focus-within:ring-brand-purple">
            <input 
              type="text" 
              placeholder="Search articles..." 
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full bg-transparent text-gray-900 placeholder-gray-500 outline-none"
            />
            <button className="on-dark-overlay rounded-full bg-brand-purple px-8 py-4 font-medium text-white hover:bg-brand-purple-hover transition-colors">
              Search
            </button>
          </div>

          {/* Trending Tags */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-white">Trending:</span>
            {['# ChatGPT', '# Midjourney', '# AI Tools', '# Automation', '# OpenAI'].map(tag => (
              <a key={tag} href="#" className="rounded-full bg-brand-card px-4 py-1.5 text-gray-300 hover:bg-brand-card-hover hover:text-white transition-colors ring-1 ring-white/5">
                {tag}
              </a>
            ))}
          </div>
        </div>

        {/* Right Image */}
        <div className="flex-1 w-full relative">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-white/10 ring-1 ring-white/5 shadow-2xl shadow-brand-purple/20">
            <span className="mw-hud-corner tl" aria-hidden="true" />
            <span className="mw-hud-corner br" aria-hidden="true" />
            {usingCarousel ? (
              heroImages.map((slide, i) => (
                <img
                  key={slide.url + i}
                  src={slide.url}
                  alt={slide.alt || "MindWriter"}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === activeIndex ? "opacity-100" : "opacity-0"}`}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                />
              ))
            ) : (
              <img 
                src={FALLBACK_SLIDE.url}
                srcSet={FALLBACK_SLIDE.srcSet}
                sizes="(max-width: 768px) 90vw, 500px"
                alt={FALLBACK_SLIDE.alt} 
                className="absolute inset-0 h-full w-full object-contain"
                width={800}
                height={600}
                loading="eager"
                fetchPriority="high"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-bg/60 via-transparent to-brand-purple/20 mix-blend-overlay pointer-events-none"></div>

            {usingCarousel && heroImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {heroImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    aria-label={`Show image ${i + 1}`}
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: i === activeIndex ? "20px" : "6px", background: i === activeIndex ? "#7C3AED" : "rgba(255,255,255,0.4)" }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
