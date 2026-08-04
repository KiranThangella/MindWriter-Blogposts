import { useEffect, useRef } from "react";

// Set VITE_ADSENSE_CLIENT_ID (e.g. "ca-pub-1234567890123456") in your .env /
// Cloudflare Pages env vars once you have a real AdSense account, then
// redeploy. Until then, this is empty and AdSlot renders nothing anywhere
// — no placeholder boxes, no "Ad" labels, nothing visible to visitors. The
// AdSense script itself is also never loaded onto the page unless this is
// set, so there's zero cost/impact until it's actually configured.
const ADSENSE_CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined;

let scriptInjected = false;
function ensureAdSenseScript(clientId: string) {
  if (scriptInjected || typeof document === "undefined") return;
  if (document.querySelector('script[data-adsbygoogle]')) {
    scriptInjected = true;
    return;
  }
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
  script.crossOrigin = "anonymous";
  script.setAttribute("data-adsbygoogle", "true");
  document.head.appendChild(script);
  scriptInjected = true;
}

// Each slot reserves a fixed min-height matching its typical rendered ad
// size, so the layout doesn't jump once a real ad fills in (Core Web
// Vitals CLS). Sizes follow common IAB/AdSense presets.
const SLOT_DIMENSIONS: Record<string, { minHeight: string; format: string }> = {
  sidebar: { minHeight: "250px", format: "rectangle" },      // 300x250 medium rectangle
  "in-article": { minHeight: "280px", format: "fluid" },     // in-article native, fluid width
  "in-feed": { minHeight: "300px", format: "fluid" },        // native card between article list items
  "sticky-mobile": { minHeight: "50px", format: "horizontal" }, // 320x50 mobile banner
};

interface AdSlotProps {
  slot: "sidebar" | "in-article" | "in-feed" | "sticky-mobile";
  /** AdSense ad unit slot ID (from your AdSense dashboard). Required once
   * ADSENSE_CLIENT_ID is set — without it, nothing renders even if the
   * client ID is configured, since an ad unit must exist per placement. */
  adSlotId?: string;
  className?: string;
}

export function AdSlot({ slot, adSlotId, className = "" }: AdSlotProps) {
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!ADSENSE_CLIENT_ID || !adSlotId) return;
    ensureAdSenseScript(ADSENSE_CLIENT_ID);
    if (pushedRef.current) return;
    try {
      // @ts-ignore — adsbygoogle is injected globally by the script above
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch (e) {
      console.warn("[AdSlot] adsbygoogle push failed:", e);
    }
  }, [adSlotId]);

  // Nothing configured yet — render nothing. No placeholder box, no "Ad"
  // label, no reserved space. Once ADSENSE_CLIENT_ID + a real adSlotId are
  // both set, this starts rendering real ads automatically, no other code
  // changes needed at the call sites below.
  if (!ADSENSE_CLIENT_ID || !adSlotId) return null;

  const dims = SLOT_DIMENSIONS[slot];

  return (
    <div className={`w-full flex justify-center ${className}`} style={{ minHeight: dims.minHeight }}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", width: "100%" }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={adSlotId}
        data-ad-format={dims.format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
