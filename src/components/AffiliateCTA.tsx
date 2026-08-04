import { ArrowRight, Sparkles } from "lucide-react";

interface AffiliateCTAProps {
  /** Short, benefit-led headline. e.g. "Write better in half the time" */
  title: string;
  /** One or two sentences on why it's relevant here. Keep it short —
   * this reads as a recommendation, not an ad block. */
  description: string;
  /** Button label. e.g. "Try Jasper free" */
  buttonText: string;
  /** Your affiliate tracking URL. */
  buttonUrl: string;
  /** Small eyebrow label above the title. Defaults to "Recommended tool". */
  eyebrow?: string;
  /** Match the reading theme so this doesn't look bolted-on. */
  theme?: "light" | "dark";
  className?: string;
}

/**
 * A natural-looking, in-article recommendation card with a CTA button —
 * for affiliate links. Deliberately styled like an editorial callout
 * (icon + eyebrow + short copy + button) rather than a banner ad, so it
 * reads as part of the article rather than an interruption.
 *
 * Usage (drop anywhere inside article content, e.g. alongside the
 * existing <AdSlot slot="in-article" /> placements in App.tsx):
 *
 *   <AffiliateCTA
 *     eyebrow="Tool we use"
 *     title="Write better in half the time"
 *     description="Jasper helps draft, edit, and polish content in Telugu and English."
 *     buttonText="Try Jasper free"
 *     buttonUrl="https://jasper.ai/?fpr=youraffiliateid"
 *     theme={readerTheme}
 *   />
 *
 * Per FTC / Google disclosure requirements, this always renders a small
 * "Affiliate link" label — do not remove it when reusing this component.
 */
export function AffiliateCTA({
  title,
  description,
  buttonText,
  buttonUrl,
  eyebrow = "Recommended tool",
  theme = "light",
  className = "",
}: AffiliateCTAProps) {
  const isDark = theme === "dark";

  return (
    <div
      className={`not-prose my-8 rounded-2xl border ${
        isDark
          ? "border-white/10 bg-white/5"
          : "border-brand-purple/15 bg-brand-purple/5"
      } p-5 sm:p-6 ${className}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-brand-purple" />
        <span
          className={`text-xs font-semibold uppercase tracking-wide ${
            isDark ? "text-gray-400" : "text-slate-500"
          }`}
        >
          {eyebrow}
        </span>
      </div>

      <h4
        className={`text-base sm:text-lg font-bold mb-1.5 ${
          isDark ? "text-white" : "text-slate-900"
        }`}
      >
        {title}
      </h4>

      <p
        className={`text-sm mb-4 leading-relaxed ${
          isDark ? "text-gray-300" : "text-slate-600"
        }`}
      >
        {description}
      </p>

      <a
        href={buttonUrl}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full bg-brand-purple px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
      >
        {buttonText}
        <ArrowRight className="h-3.5 w-3.5" />
      </a>

      {/* Required disclosure — do not remove. */}
      <div className={`mt-2 text-[11px] ${isDark ? "text-gray-500" : "text-slate-400"}`}>
        Affiliate link — we may earn a commission at no extra cost to you.
      </div>
    </div>
  );
}
