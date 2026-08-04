// src/lib/categoryTheme.ts
//
// Single source of truth for per-category accent colors. Each of the six
// real categories (see src/data.ts exploreCategories) gets its own hue so
// the site reads as "AI tech/tools/news blog" — a cohesive but
// distinguishable cool-tone tech palette, not a generic one-color-fits-all
// purple theme. Falls back to the AI News purple for any category name
// that isn't explicitly mapped (new/unexpected categories from Sanity).

export interface CategoryTheme {
  accent: string;   // solid accent, e.g. icon color, badge text
  soft: string;      // lighter variant, e.g. hover/glow states
  bg: string;         // low-opacity background wash for icons/badges
  gradient: string;   // subtle background gradient for hero/featured cards
}

const THEMES: Record<string, CategoryTheme> = {
  "ai news": {
    accent: "#7C3AED", soft: "#A78BFA", bg: "rgba(124,58,237,0.12)",
    gradient: "linear-gradient(160deg, rgba(124,58,237,0.32), rgba(10,10,15,0.15) 55%)",
  },
  "tech": {
    accent: "#3B82F6", soft: "#7DAAFB", bg: "rgba(59,130,246,0.12)",
    gradient: "linear-gradient(160deg, rgba(59,130,246,0.30), rgba(10,10,15,0.15) 55%)",
  },
  "ai tools": {
    accent: "#14B8A6", soft: "#5EDBCB", bg: "rgba(20,184,166,0.12)",
    gradient: "linear-gradient(160deg, rgba(20,184,166,0.30), rgba(10,10,15,0.15) 55%)",
  },
  "business": {
    accent: "#D4A017", soft: "#F0C64B", bg: "rgba(212,160,23,0.12)",
    gradient: "linear-gradient(160deg, rgba(212,160,23,0.28), rgba(10,10,15,0.15) 55%)",
  },
  "blogging": {
    accent: "#EC4899", soft: "#F472B6", bg: "rgba(236,72,153,0.12)",
    gradient: "linear-gradient(160deg, rgba(236,72,153,0.28), rgba(10,10,15,0.15) 55%)",
  },
  "automation": {
    accent: "#22C55E", soft: "#6ADB8C", bg: "rgba(34,197,94,0.12)",
    gradient: "linear-gradient(160deg, rgba(34,197,94,0.28), rgba(10,10,15,0.15) 55%)",
  },
};

const DEFAULT_THEME = THEMES["ai news"];

export function getCategoryTheme(categoryName: string | undefined | null): CategoryTheme {
  const key = (categoryName || "").toLowerCase().trim();
  return THEMES[key] || DEFAULT_THEME;
}
