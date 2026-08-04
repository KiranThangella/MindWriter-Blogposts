import { BookOpen, ArrowRight, Crown } from "lucide-react";

interface EbookCTAProps {
  /** Optional specific book title this article is about — if omitted, shows generic copy. */
  bookTitle?: string;
  /** Match the reading theme so this doesn't look bolted-on. */
  theme?: "light" | "dark";
  className?: string;
}

/**
 * In-article CTA pointing to ebooks.mindwriter.in (the separate premium
 * ebook platform). Renders automatically in the reader for articles in the
 * "Ebooks" category (see App.tsx) — this is what turns an ebook-review/
 * promo article into an actual funnel toward the premium site, rather than
 * just a standalone piece of content.
 */
export function EbookCTA({ bookTitle, theme = "light", className = "" }: EbookCTAProps) {
  const isDark = theme === "dark";

  return (
    <div
      className={`not-prose my-8 rounded-2xl border overflow-hidden ${
        isDark ? "border-amber-400/20 bg-amber-400/5" : "border-amber-300/40 bg-amber-50/60"
      } ${className}`}
    >
      <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div
          className={`shrink-0 h-12 w-12 rounded-xl flex items-center justify-center ${
            isDark ? "bg-amber-400/10 text-amber-300" : "bg-amber-100 text-amber-700"
          }`}
        >
          <BookOpen className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isDark ? "bg-amber-400/15 text-amber-300" : "bg-amber-200/70 text-amber-800"
              }`}
            >
              <Crown className="h-3 w-3" /> Premium
            </span>
            <span className={`text-[11px] font-mono ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
              ebooks.mindwriter.in
            </span>
          </div>
          <h4 className={`font-bold text-base sm:text-lg leading-snug ${isDark ? "text-white" : "text-slate-900"}`}>
            {bookTitle ? `"${bookTitle}" పూర్తి పుస్తకం చదవండి` : "ఈ అంశంపై పూర్తి ఈ-బుక్ చదవండి"}
          </h4>
          <p className={`text-sm mt-1 ${isDark ? "text-zinc-400" : "text-slate-600"}`}>
            పూర్తి లోతైన కంటెంట్, ప్రీమియం ఈ-బుక్స్ లైబ్రరీలో — mindwriter.in కంటే విస్తృతంగా.
          </p>
        </div>
        <a
          href="https://ebooks.mindwriter.in"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-5 py-3 transition-colors shadow-sm"
        >
          ఈ-బుక్ సైట్ కి వెళ్ళండి
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
