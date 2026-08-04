import { ArrowRight, Lock } from "lucide-react";

interface MembershipCTAProps {
  /** Short headline. e.g. "ఈ పుస్తకం యొక్క పూర్తి సమ్మరీ చదవండి" */
  title: string;
  /** One or two sentences on what they get with membership. */
  description: string;
  /** Button label. e.g. "Membership తీసుకోండి" */
  buttonText: string;
  /** URL of your separate ebook/membership website (signup/pricing page). */
  buttonUrl: string;
  /** Small eyebrow label above the title. Defaults to "Members Only". */
  eyebrow?: string;
  theme?: "light" | "dark";
  className?: string;
}

/**
 * A "locked content" style callout that pushes the reader to the separate
 * ebook/membership website — no auth or payment logic lives here, this
 * site only ever links out. Styled like AffiliateCTA.tsx for visual
 * consistency, but with a lock icon and members-only framing instead of
 * a sponsored-tool framing.
 *
 * Usage (drop inside article content, typically right after 3-4 free
 * takeaways, as the "teaser wall"):
 *
 *   <MembershipCTA
 *     eyebrow="పూర్తి సమ్మరీ — Members Only"
 *     title="ఇంకా 6 కీలక పాఠాలు మిగిలి ఉన్నాయి"
 *     description="పూర్తి chapter-by-chapter బ్రేక్‌డౌన్ + నోట్స్ కోసం Membership తీసుకోండి."
 *     buttonText="Membership చూడండి"
 *     buttonUrl="https://your-ebook-site.com/membership"
 *     theme={readerTheme}
 *   />
 */
export function MembershipCTA({
  title,
  description,
  buttonText,
  buttonUrl,
  eyebrow = "Members Only",
  theme = "light",
  className = "",
}: MembershipCTAProps) {
  const isDark = theme === "dark";

  return (
    <div
      className={`not-prose my-8 rounded-2xl border-2 border-dashed ${
        isDark
          ? "border-amber-400/25 bg-amber-400/5"
          : "border-amber-500/25 bg-amber-50"
      } p-5 sm:p-6 text-center ${className}`}
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        <Lock className="h-3.5 w-3.5 text-amber-500" />
        <span
          className={`text-xs font-semibold uppercase tracking-wide ${
            isDark ? "text-amber-400" : "text-amber-600"
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
        className={`text-sm mb-4 leading-relaxed max-w-md mx-auto ${
          isDark ? "text-gray-300" : "text-slate-600"
        }`}
      >
        {description}
      </p>

      <a
        href={buttonUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
      >
        {buttonText}
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
