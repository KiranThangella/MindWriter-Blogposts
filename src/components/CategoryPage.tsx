import { LatestArticles } from "./LatestArticles";

export function CategoryPage({ category, posts, onArticleClick, onBack }: { category: string, posts: any[], onArticleClick: (a: any) => void, onBack: () => void }) {
  const filtered = Array.isArray(posts) ? posts.filter(p => {
    if (!category) return true;
    const pCat = Array.isArray(p.category) ? p.category.join(', ') : (p.category || "");
    const cats = pCat.split(',').map((c: string) => c.trim().toLowerCase());
    return cats.includes(category.toLowerCase());
  }) : [];

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 animate-fade-in" id="category-page-container">
        <button onClick={onBack} className="text-sm font-medium text-brand-purple mb-6 flex items-center gap-2 hover:opacity-80 transition-all cursor-pointer" id="back-to-home-btn">
           &larr; Back to Home
        </button>
        <div className="border-b border-white/5 pb-6 mb-10">
          <span className="text-xs font-bold tracking-widest text-[var(--color-brand-purple-accessible)] uppercase" id="category-tag-header">Category View</span>
          <h1 className="text-4xl font-bold tracking-tight text-white mt-1 capitalize" id="category-title">{category}</h1>
          <p className="text-xs text-brand-text-muted font-mono mt-2" id="category-meta">
            Showing {filtered.length} {filtered.length === 1 ? 'article' : 'articles'} in this category.
          </p>
        </div>
        {filtered.length > 0 ? (
          <LatestArticles posts={filtered} onArticleClick={onArticleClick} />
        ) : (
          <div className="py-20 text-center border border-dashed border-white/5 rounded-2xl bg-brand-card/20" id="no-articles-view">
            <span className="text-4xl mb-4 block">📰</span>
            <p className="text-sm text-brand-text-muted font-medium">ఈ కేటగిరీలో ఇంకా ఎటువంటి సేకరించబడిన ఆర్టికల్స్ లేవు.</p>
          </div>
        )}
    </div>
  );
}
