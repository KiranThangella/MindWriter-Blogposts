import { useEffect, useState } from "react";

// Simple, dependency-free cookie/analytics consent banner. Required for
// GDPR (EU visitors) and generally expected once a site runs analytics or
// ad scripts (e.g. Google AdSense). Stores the choice in localStorage so it
// only shows once per browser. This is a baseline notice-and-choice banner,
// not a full Consent Management Platform (CMP) — if/when Google AdSense is
// added, double-check whether your traffic mix requires IAB TCF-compliant
// consent (mostly relevant for EEA/UK traffic under Google's EU user
// consent policy).
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const choice = localStorage.getItem("cookie_consent");
      if (!choice) setVisible(true);
    } catch {
      // If localStorage is unavailable, just skip showing the banner rather
      // than risk breaking the page.
    }
  }, []);

  const setChoice = (value: "accepted" | "declined") => {
    try {
      localStorage.setItem("cookie_consent", value);
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-white/10 bg-[#0B0F19]/98 backdrop-blur-md px-4 py-4 sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-3xl">
          మేము cookies వాడతాము — సైట్ సరిగ్గా పనిచేయడానికి, ట్రాఫిక్ అర్థం చేసుకోవడానికి, భవిష్యత్తులో సంబంధిత ప్రకటనలు చూపించడానికి.{" "}
          <a href="/privacy-policy" className="underline hover:text-white">Privacy Policy</a> చదవండి.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setChoice("declined")}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs sm:text-sm font-semibold text-zinc-300 hover:bg-white/10 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={() => setChoice("accepted")}
            className="rounded-lg bg-brand-purple px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-brand-purple-hover transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
