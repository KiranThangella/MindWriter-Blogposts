import { useState } from "react";
import { 
  Sparkles, AlertCircle, CheckCircle, Info, HelpCircle, 
  HelpCircle as QuestionIcon, Plus, ChevronDown, ChevronUp, BarChart
} from "lucide-react";

interface RealtimeSEOMonitorProps {
  title: string;
  excerpt: string;
  body: string;
  keyword: string;
  slug: string;
  isLightMode?: boolean;
  /** Featured/thumbnail image URL and its alt text — kept as separate props
   * from `body` because the featured image lives outside the article HTML
   * (it's a dedicated field in the editor), so it was previously invisible
   * to this monitor's image alt-text check entirely. */
  featuredImageUrl?: string;
  featuredImageAlt?: string;
}

export function RealtimeSEOMonitor({
  title = "",
  excerpt = "",
  body = "",
  keyword = "",
  slug = "",
  isLightMode = false,
  featuredImageUrl = "",
  featuredImageAlt = ""
}: RealtimeSEOMonitorProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Helper: Strip HTML tags to get pure text word count & contents
  const getCleanText = (htmlStr: string) => {
    if (!htmlStr) return "";
    return htmlStr.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  };

  const cleanBody = getCleanText(body);
  const words = cleanBody.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  // Calculators
  const titleLen = title ? title.trim().length : 0;
  const excerptLen = excerpt ? excerpt.trim().length : 0;

  // Keyword counts
  const kwLower = keyword ? keyword.toLowerCase().trim() : "";
  const titleLower = title ? title.toLowerCase() : "";
  const excerptLower = excerpt ? excerpt.toLowerCase() : "";
  const slugLower = slug ? String((slug as any).current || slug).toLowerCase().replace(/-/g, " ") : "";
  const bodyLower = cleanBody.toLowerCase();

  const titleHasKw = kwLower ? titleLower.includes(kwLower) : false;
  const excerptHasKw = kwLower ? excerptLower.includes(kwLower) : false;
  const slugHasKw = kwLower ? slugLower.includes(kwLower) : false;

  // Calculate density
  let density = 0;
  let kwCount = 0;
  if (kwLower && wordCount > 0) {
    const rx = new RegExp(kwLower.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
    kwCount = (bodyLower.match(rx) || []).length;
    density = parseFloat(((kwCount / wordCount) * 100).toFixed(1));
  }

  // Scoring weights (redistributed to 100 total across 9 checks now,
  // including the two new ones: image alt-text and internal/external links)
  // 1. Title Length: 15 pts
  let titleScore = 0;
  if (titleLen >= 40 && titleLen <= 60) titleScore = 15;
  else if (titleLen >= 30 && titleLen <= 75) titleScore = 10;
  else if (titleLen > 0) titleScore = 6;

  // 2. Meta desc / Excerpt Length: 15 pts
  let excerptScore = 0;
  if (excerptLen >= 120 && excerptLen <= 160) excerptScore = 15;
  else if (excerptLen >= 80 && excerptLen <= 180) excerptScore = 10;
  else if (excerptLen > 0) excerptScore = 6;

  // 3. Keyword in Title: 10 pts
  const keywordInTitleScore = titleHasKw ? 10 : 0;

  // 4. Keyword in Excerpt: 10 pts
  const keywordInExcerptScore = excerptHasKw ? 10 : 0;

  // 5. Keyword in Slug: 8 pts
  const keywordInSlugScore = slugHasKw ? 8 : 0;

  // 6. Keyword Density: 7 pts
  let densityScore = 0;
  if (keyword) {
    if (density >= 0.5 && density <= 2.5) densityScore = 7;
    else if (density > 0 && density < 4.0) densityScore = 4;
  }

  // 7. Word count length: 7 pts
  let wordCountScore = 0;
  if (wordCount >= 600) wordCountScore = 7;
  else if (wordCount >= 300) wordCountScore = 4;
  else if (wordCount >= 100) wordCountScore = 2;

  // 8. Image alt-text: 10 pts (new — RankMath/Yoast parity check)
  // Finds every <img> tag in the body and verifies it has a non-empty alt
  // attribute. Articles with zero images are treated as N/A for this check
  // (full points) rather than penalized, since not every article needs an
  // inline image — the featured/thumbnail image is handled separately.
  const imgTags = [...body.matchAll(/<img\b[^>]*>/gi)];
  const imagesWithoutAlt = imgTags.filter((m) => {
    const altMatch = m[0].match(/\balt\s*=\s*["']([^"']*)["']/i);
    return !altMatch || !altMatch[1] || altMatch[1].trim().length === 0;
  });
  const hasImages = imgTags.length > 0;
  const allImagesHaveAlt = !hasImages || imagesWithoutAlt.length === 0;
  const imageAltScore = allImagesHaveAlt ? 10 : 0;

  // 9. Internal/external links: 8 pts (new — RankMath/Yoast parity check)
  // Checks for at least one <a href="..."> in the body. A single link
  // (internal or external) is enough to earn full points here — RankMath
  // itself just checks presence, not a minimum count.
  const linkTags = [...body.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi)];
  const hasLinks = linkTags.length > 0;
  const linksScore = hasLinks ? 8 : 0;

  // 10. Featured/thumbnail image alt-text: 10 pts (new). Previously only
  // in-article <img> tags were checked (#8 above) — the featured/thumbnail
  // image is a separate editor field entirely and was invisible to this
  // monitor, so an article could score perfectly here while its actual
  // search-result/social-share thumbnail had no alt text at all. An
  // article with no featured image set is treated as N/A (full points),
  // consistent with the inline-image check.
  const hasFeaturedImage = !!featuredImageUrl.trim();
  const featuredImageHasAlt = featuredImageAlt.trim().length > 0;
  const featuredImageAltScore = !hasFeaturedImage || featuredImageHasAlt ? 10 : 0;

  const finalScore =
    titleScore +
    excerptScore +
    keywordInTitleScore +
    keywordInExcerptScore +
    keywordInSlugScore +
    densityScore +
    wordCountScore +
    imageAltScore +
    linksScore +
    featuredImageAltScore;

  // Status and color
  let scoreColor = "text-rose-500 stroke-rose-500 bg-rose-500/10";
  let ringColor = "stroke-rose-500";
  let statusText = "Needs Content Optimization";
  let level = "POOR";

  if (finalScore >= 80) {
    scoreColor = "text-emerald-500 stroke-emerald-500 bg-emerald-500/10";
    ringColor = "stroke-emerald-500";
    statusText = "Excellent SEO Formatting!";
    level = "GREAT";
  } else if (finalScore >= 50) {
    scoreColor = "text-amber-500 stroke-emerald-500 bg-amber-500/10";
    ringColor = "stroke-amber-500";
    statusText = "Moderate SEO - Needs refinement";
    level = "FAIR";
  }

  // Circular progress params
  const radius = 24;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (finalScore / 100) * circumference;

  return (
    <div className={`p-4 rounded-2xl border transition-all ${
      isLightMode 
        ? 'bg-slate-50/80 border-slate-200' 
        : 'bg-zinc-900/30 border-white/5 backdrop-blur-md'
    }`}>
      <div className="flex items-center justify-between gap-4">
        {/* Ring Indicator & Title block */}
        <div className="flex items-center gap-3.5">
          <div className="relative h-[56px] w-[56px] flex items-center justify-center shrink-0">
            {/* SVG circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r={radius}
                className={`fill-none ${isLightMode ? 'stroke-slate-200' : 'stroke-zinc-800'}`}
                strokeWidth={strokeWidth}
              />
              <circle
                cx="28"
                cy="28"
                r={radius}
                className="fill-none transition-all duration-500 stroke-brand-purple"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{
                  stroke: finalScore >= 80 ? '#10b981' : finalScore >= 50 ? '#f59e0b' : '#ef4444'
                }}
              />
            </svg>
            <span className={`absolute text-xs font-black font-mono leading-none ${
              finalScore >= 80 ? 'text-emerald-500' : finalScore >= 50 ? 'text-amber-500' : 'text-rose-500'
            }`}>
              {finalScore}%
            </span>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-black uppercase tracking-wider ${
                finalScore >= 80 ? 'text-emerald-500' : finalScore >= 50 ? 'text-amber-500' : 'text-rose-500'
              }`}>
                Real-time SEO Score: {level}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold font-mono uppercase ${
                finalScore >= 80 ? 'bg-emerald-500/10 text-emerald-500' : finalScore >= 50 ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
              }`}>
                Score {finalScore}/100
              </span>
            </div>
            <p className={`text-[11px] leading-relaxed font-semibold ${isLightMode ? 'text-slate-600' : 'text-zinc-400'}`}>
              {statusText}
            </p>
          </div>
        </div>

        {/* Action button to expand */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`p-2 rounded-xl border flex items-center gap-1.5 text-[9px] font-bold tracking-wider uppercase transition-colors ${
            isLightMode 
              ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100' 
              : 'bg-zinc-800 border-white/5 text-zinc-300 hover:bg-zinc-700/60'
          }`}
        >
          {showDetails ? (
            <>
              Hide Details
              <ChevronUp size={11} />
            </>
          ) : (
            <>
              Analyze Meta
              <ChevronDown size={11} />
            </>
          )}
        </button>
      </div>

      {/* Checklist Breakdown */}
      {showDetails && (
        <div className={`mt-4 pt-4 border-t space-y-3.5 animate-in slide-in-from-top-2 duration-300 ${
          isLightMode ? 'border-slate-250/60' : 'border-white/5'
        }`}>
          {/* Target Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            {/* Title Length checklist */}
            <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
              isLightMode ? 'bg-slate-100/50 border-slate-150' : 'bg-black/20 border-white/5'
            }`}>
              {titleScore === 15 ? (
                <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                  <span className={isLightMode ? 'text-slate-700' : 'text-zinc-300'}>Title Length</span>
                  <span className={titleScore === 15 ? 'text-emerald-500' : 'text-amber-500'}>{titleLen} chars (15 PTS)</span>
                </div>
                <p className={`text-[10px] leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>
                  {titleScore === 15 
                    ? "Optimal size for Google listings!" 
                    : titleLen === 0 
                      ? "Title stands completely empty." 
                      : `Improve readability. Target 40-60 characters (currently ${titleLen}).`
                  }
                </p>
              </div>
            </div>

            {/* Description Length checklist */}
            <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
              isLightMode ? 'bg-slate-100/50 border-slate-150' : 'bg-black/20 border-white/5'
            }`}>
              {excerptScore === 15 ? (
                <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                  <span className={isLightMode ? 'text-slate-700' : 'text-zinc-300'}>Meta Description</span>
                  <span className={excerptScore === 15 ? 'text-emerald-500' : 'text-amber-500'}>{excerptLen} chars (15 PTS)</span>
                </div>
                <p className={`text-[10px] leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>
                  {excerptScore === 15 
                    ? "Meta description size is ideal." 
                    : excerptLen === 0 
                      ? "Excerpt stands completely empty." 
                      : `Recommend 120-160 characters (currently ${excerptLen}).`
                  }
                </p>
              </div>
            </div>

            {/* Title keyword match */}
            <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
              isLightMode ? 'bg-slate-100/50 border-slate-150' : 'bg-black/20 border-white/5'
            }`}>
              {titleHasKw ? (
                <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                  <span className={isLightMode ? 'text-slate-700' : 'text-zinc-300'}>Keyword in Title</span>
                  <span className={titleHasKw ? 'text-emerald-500' : 'text-amber-500'}>{titleHasKw ? "MATCHED" : "MISSING"} (10 PTS)</span>
                </div>
                <p className={`text-[10px] leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>
                  {!keyword 
                    ? "Define your focus keyword in properties below." 
                    : titleHasKw 
                      ? `Found focus keyword: "${keyword}"` 
                      : `Place the focus keyword "${keyword}" in your page title.`
                  }
                </p>
              </div>
            </div>

            {/* Description keyword match */}
            <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
              isLightMode ? 'bg-slate-100/50 border-slate-150' : 'bg-black/20 border-white/5'
            }`}>
              {excerptHasKw ? (
                <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                  <span className={isLightMode ? 'text-slate-700' : 'text-zinc-300'}>Keyword in Excerpt</span>
                  <span className={excerptHasKw ? 'text-emerald-500' : 'text-amber-500'}>{excerptHasKw ? "MATCHED" : "MISSING"} (10 PTS)</span>
                </div>
                <p className={`text-[10px] leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>
                  {!keyword 
                    ? "Requires focus keyword." 
                    : excerptHasKw 
                      ? "Found keyword in meta description!" 
                      : `Incorporate focus keyword "${keyword}" into the summary.`
                  }
                </p>
              </div>
            </div>

            {/* Slug keyword match */}
            <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
              isLightMode ? 'bg-slate-100/50 border-slate-150' : 'bg-black/20 border-white/5'
            }`}>
              {slugHasKw ? (
                <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                  <span className={isLightMode ? 'text-slate-700' : 'text-zinc-300'}>Keyword in Slug</span>
                  <span className={slugHasKw ? 'text-emerald-500' : 'text-amber-500'}>{slugHasKw ? "MATCHED" : "MISSING"} (8 PTS)</span>
                </div>
                <p className={`text-[10px] leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>
                  {!keyword 
                    ? "Requires focus keyword." 
                    : slugHasKw 
                      ? "Slug aligned with search key." 
                      : `Add "${keyword}" or a version of it into the absolute path / slug.`
                  }
                </p>
              </div>
            </div>

            {/* Keyword density match */}
            <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
              isLightMode ? 'bg-slate-100/50 border-slate-150' : 'bg-black/20 border-white/5'
            }`}>
              {densityScore === 7 ? (
                <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                  <span className={isLightMode ? 'text-slate-700' : 'text-zinc-300'}>Keyword Density</span>
                  <span className={densityScore === 7 ? 'text-emerald-500' : 'text-amber-500'}>{density}% (7 PTS)</span>
                </div>
                <p className={`text-[10px] leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>
                  {!keyword 
                    ? "Requires focus keyword." 
                    : densityScore === 7 
                      ? `Found ${kwCount} occurrences of focus keyword (ideal!).` 
                      : density === 0 
                        ? `Focus keyword "${keyword}" is missing inside article body.` 
                        : `Current density is ${density}%. Perfect density spans 0.5% - 2.5%.`
                  }
                </p>
              </div>
            </div>

            {/* Word count checklist */}
            <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 col-span-1 md:col-span-2 ${
              isLightMode ? 'bg-slate-100/50 border-slate-150' : 'bg-black/20 border-white/5'
            }`}>
              {wordCountScore === 7 ? (
                <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                  <span className={isLightMode ? 'text-slate-700' : 'text-zinc-300'}>Content Word Count</span>
                  <span className={wordCountScore === 7 ? 'text-emerald-500' : 'text-amber-500'}>{wordCount} words (7 PTS)</span>
                </div>
                <p className={`text-[10px] leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>
                  {wordCountScore === 7 
                    ? `Great job! Multi-point in-depth coverage (${wordCount} words) is optimal.` 
                    : `Current count is ${wordCount} words. Standard technical content should be >600 words for rich ranks.`
                  }
                </p>
              </div>
            </div>

            {/* Image alt-text checklist (new) */}
            <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
              isLightMode ? 'bg-slate-100/50 border-slate-150' : 'bg-black/20 border-white/5'
            }`}>
              {allImagesHaveAlt ? (
                <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                  <span className={isLightMode ? 'text-slate-700' : 'text-zinc-300'}>Image Alt-Text</span>
                  <span className={allImagesHaveAlt ? 'text-emerald-500' : 'text-amber-500'}>
                    {hasImages ? `${imgTags.length - imagesWithoutAlt.length}/${imgTags.length} TAGGED` : "N/A"} (10 PTS)
                  </span>
                </div>
                <p className={`text-[10px] leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>
                  {!hasImages
                    ? "No inline images in this article — featured image is checked separately."
                    : allImagesHaveAlt
                      ? "All inline images have descriptive alt text. Good for accessibility & image search."
                      : `${imagesWithoutAlt.length} image(s) are missing alt text. Add descriptive alt attributes for SEO & accessibility.`
                  }
                </p>
              </div>
            </div>

            {/* Internal/external links checklist (new) */}
            <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
              isLightMode ? 'bg-slate-100/50 border-slate-150' : 'bg-black/20 border-white/5'
            }`}>
              {hasLinks ? (
                <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                  <span className={isLightMode ? 'text-slate-700' : 'text-zinc-300'}>Internal/External Links</span>
                  <span className={hasLinks ? 'text-emerald-500' : 'text-amber-500'}>
                    {hasLinks ? `${linkTags.length} FOUND` : "MISSING"} (8 PTS)
                  </span>
                </div>
                <p className={`text-[10px] leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>
                  {hasLinks
                    ? "Article links to other content — good for SEO and reader engagement."
                    : "Add at least one internal link (to another article) or external reference link."
                  }
                </p>
              </div>
            </div>

            {/* Featured image alt-text checklist (new) */}
            <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
              isLightMode ? 'bg-slate-100/50 border-slate-150' : 'bg-black/20 border-white/5'
            }`}>
              {featuredImageAltScore === 10 ? (
                <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                  <span className={isLightMode ? 'text-slate-700' : 'text-zinc-300'}>Featured Image Alt-Text</span>
                  <span className={featuredImageAltScore === 10 ? 'text-emerald-500' : 'text-amber-500'}>
                    {!hasFeaturedImage ? "N/A" : featuredImageHasAlt ? "TAGGED" : "MISSING"} (10 PTS)
                  </span>
                </div>
                <p className={`text-[10px] leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>
                  {!hasFeaturedImage
                    ? "No featured image set for this article yet."
                    : featuredImageHasAlt
                      ? "Featured/thumbnail image has descriptive alt text."
                      : "Your featured image is missing alt text — this is the thumbnail shown in search & social shares."
                  }
                </p>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
