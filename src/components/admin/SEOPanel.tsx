import { useState } from 'react';
import { 
  BarChart, Zap, Search, ShieldCheck, UserCheck, 
  FileCheck, Link as LinkIcon, AlertTriangle, CheckCircle,
  Loader2, Sparkles, BrainCircuit, Globe
} from 'lucide-react';

interface SEOAnalysis {
  seoScore: number;
  humanizerScore: number;
  aiProbability: number;
  readability: string;
  eeatScore: number;
  suggestions: string[];
  densityAnalysis: string;
  metaTitle?: string;
  metaDescription?: string;
}

interface SEOPanelProps {
  content: string;
  title: string;
  keyword: string;
  excerpt?: string;
  slug?: string;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  analysis: SEOAnalysis | null;
  isLightMode?: boolean;
  /** Copies analysis.metaTitle/metaDescription into the actual
   * editMetaTitle/editMetaDescription fields (the ones that get saved to
   * Sanity on publish). Without this, "Analyze" only ever populated this
   * panel's own preview — the generated title/description looked correct
   * here but never reached the real Meta Title/Description inputs further
   * down the sidebar, so nothing was actually saved. Optional so this
   * component still renders fine wherever a caller hasn't wired it up. */
  onApplyMeta?: () => void;
}

export function SEOPanel({ content, title, keyword, excerpt = "", slug = "", onAnalyze, isAnalyzing, analysis, isLightMode, onApplyMeta }: SEOPanelProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getBgColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-400/10 border-emerald-400/20';
    if (score >= 50) return 'bg-amber-400/10 border-amber-400/20';
    return 'bg-rose-400/10 border-rose-400/20';
  };

  // Real-time calculation
  const getCleanText = (htmlStr: string) => {
    if (!htmlStr) return "";
    return htmlStr.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  };

  const cleanBody = getCleanText(content);
  const words = cleanBody.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  const titleLen = title ? title.trim().length : 0;
  const excerptLen = excerpt ? excerpt.trim().length : 0;

  const kwLower = keyword ? keyword.toLowerCase().trim() : "";
  const titleLower = title ? title.toLowerCase() : "";
  const excerptLower = excerpt ? excerpt.toLowerCase() : "";
  const slugLower = slug ? String((slug as any).current || slug).toLowerCase().replace(/-/g, " ") : "";
  const bodyLower = cleanBody.toLowerCase();

  const titleHasKw = kwLower ? titleLower.includes(kwLower) : false;
  const excerptHasKw = kwLower ? excerptLower.includes(kwLower) : false;
  const slugHasKw = kwLower ? slugLower.includes(kwLower) : false;

  let density = 0;
  let kwCount = 0;
  if (kwLower && wordCount > 0) {
    const rx = new RegExp(kwLower.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
    kwCount = (bodyLower.match(rx) || []).length;
    density = parseFloat(((kwCount / wordCount) * 100).toFixed(2));
  }

  // Scoring
  let titleScore = 0;
  if (titleLen >= 40 && titleLen <= 60) titleScore = 20;
  else if (titleLen >= 30 && titleLen <= 75) titleScore = 14;
  else if (titleLen > 0) titleScore = 8;

  let excerptScore = 0;
  if (excerptLen >= 120 && excerptLen <= 160) excerptScore = 20;
  else if (excerptLen >= 80 && excerptLen <= 180) excerptScore = 14;
  else if (excerptLen > 0) excerptScore = 8;

  const keywordInTitleScore = titleHasKw ? 15 : 0;
  const keywordInExcerptScore = excerptHasKw ? 15 : 0;
  const keywordInSlugScore = slugHasKw ? 10 : 0;

  let densityScore = 0;
  if (keyword) {
    if (density >= 0.5 && density <= 2.5) densityScore = 10;
    else if (density > 0 && density < 4.0) densityScore = 5;
  }

  let wordCountScore = 0;
  if (wordCount >= 600) wordCountScore = 10;
  else if (wordCount >= 300) wordCountScore = 6;
  else if (wordCount >= 100) wordCountScore = 3;

  const liveScore = titleScore + excerptScore + keywordInTitleScore + keywordInExcerptScore + keywordInSlugScore + densityScore + wordCountScore;

  // Circular SVG variables
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (liveScore / 100) * circumference;

  return (
    <div className="space-y-6 animate-fade-in custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={`text-xs font-bold tracking-widest uppercase flex items-center gap-2 ${isLightMode ? 'text-slate-400' : 'text-gray-400'}`}>
          <BarChart className="h-4 w-4" />
          Analytics & SEO
        </h3>
        <button 
          onClick={onAnalyze}
          disabled={isAnalyzing || !content}
          className="text-[10px] font-bold text-brand-purple border border-brand-purple/30 px-3 py-1 rounded-full hover:bg-brand-purple/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
        >
          {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
          ANALYZE
        </button>
      </div>

      <div className="space-y-4">
        {/* Real-time Score Ring Card */}
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
          isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="relative h-11 w-11 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="22"
                  cy="22"
                  r={radius}
                  className={`fill-none ${isLightMode ? 'stroke-slate-200' : 'stroke-white/10'}`}
                  strokeWidth="3.5"
                />
                <circle
                  cx="22"
                  cy="22"
                  r={radius}
                  className="fill-none transition-all duration-500"
                  strokeWidth="3.5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{
                    stroke: liveScore >= 80 ? '#10b981' : liveScore >= 50 ? '#f59e0b' : '#ef4444'
                  }}
                />
              </svg>
              <span className={`absolute text-[10px] font-black font-mono leading-none ${
                liveScore >= 80 ? 'text-emerald-500' : liveScore >= 50 ? 'text-amber-500' : 'text-rose-500'
              }`}>
                {liveScore}%
              </span>
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Live Quality Check</div>
              <p className="text-[10px] font-bold leading-tight">
                {liveScore >= 80 ? "SEO Optimized" : liveScore >= 50 ? "Partially Aligned" : "Needs Attention"}
              </p>
            </div>
          </div>
          <div className="text-[8px] font-mono font-bold bg-brand-purple/10 text-brand-purple px-1.5 py-0.5 rounded uppercase tracking-wider">
            Live Feed
          </div>
        </div>

        {/* Meta Preview Section */}
        <div className={`border rounded-2xl overflow-hidden p-4 space-y-4 shadow-inner transition-colors ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-white/5'}`}>
          <h4 className={`text-[10px] font-mono uppercase tracking-[0.2em] mb-2 flex items-center gap-2 ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>
            <Globe size={12} className={isLightMode ? 'text-slate-300' : 'text-zinc-600'} />
            SERP Preview
          </h4>
          <div className={`space-y-3 p-4 rounded-xl border transition-colors ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-950/50 border-white/5'}`}>
            <div className="space-y-1">
              <span className="text-[10px] text-emerald-500 font-mono">https://ai-news.tech/blog/...</span>
              <h5 className={`text-sm font-semibold hover:underline cursor-pointer line-clamp-1 ${isLightMode ? 'text-blue-600' : 'text-sky-400'}`}>
                {analysis?.metaTitle || title || "Article Post Title"}
              </h5>
              <p className={`text-[11px] leading-snug line-clamp-2 ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>
                {analysis?.metaDescription || "Generated summary will appear here for high search engine visibility..."}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <div className={`p-3 rounded-xl border group transition-all ${isLightMode ? 'bg-white border-slate-200 hover:bg-slate-100' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
              <span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>SEO Title Tag</span>
              <p className={`text-[11px] font-medium leading-relaxed ${isLightMode ? 'text-slate-700' : 'text-zinc-300'}`}>{analysis?.metaTitle || "Waiting for analysis..."}</p>
            </div>
            <div className={`p-3 rounded-xl border group transition-all ${isLightMode ? 'bg-white border-slate-200 hover:bg-slate-100' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
              <span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>Meta Description</span>
              <p className={`text-[11px] font-medium leading-relaxed ${isLightMode ? 'text-slate-700' : 'text-zinc-300'}`}>{analysis?.metaDescription || "Waiting for analysis..."}</p>
            </div>
            {analysis?.metaTitle && onApplyMeta && (
              <button
                onClick={onApplyMeta}
                className="w-full mt-1 text-[10px] font-bold text-emerald-500 border border-emerald-500/30 px-3 py-2 rounded-xl hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Use this title &amp; description (saves with article)
              </button>
            )}
          </div>
        </div>

        {/* Core Stats */}
        {!analysis && !isAnalyzing ? (
          <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
            <BrainCircuit className="h-8 w-8 text-gray-600 mx-auto mb-3" />
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Click 'Analyze' to run AI scans for SEO, Humanizer, Readability and AI Detection scores.
            </p>
          </div>
        ) : isAnalyzing ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-white/5 rounded-xl border border-white/5" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-2xl border ${getBgColor(analysis?.seoScore || 0)} transition-all hover:scale-[1.02]`}>
                <div className="text-[10px] font-mono text-gray-400 uppercase mb-1">SEO Score</div>
                <div className={`text-2xl font-black ${getScoreColor(analysis?.seoScore || 0)}`}>{analysis?.seoScore}/100</div>
              </div>
              <div className={`p-4 rounded-2xl border ${getBgColor(analysis?.humanizerScore || 0)} transition-all hover:scale-[1.02]`}>
                <div className="text-[10px] font-mono text-gray-400 uppercase mb-1">Humanizer</div>
                <div className={`text-2xl font-black ${getScoreColor(analysis?.humanizerScore || 0)}`}>{analysis?.humanizerScore}%</div>
              </div>
            </div>

            <div className={`rounded-2xl p-4 border transition-colors ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-white/5'}`}>
              <div className="flex justify-between items-center mb-3">
                <h4 className={`text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5 ${isLightMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  <Search className="h-3 w-3" />
                  Keyword Density
                </h4>
                <div className={`text-xs font-bold ${Number(density) > 0.5 && Number(density) < 3.0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {density}%
                </div>
              </div>
              <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLightMode ? 'bg-slate-200' : 'bg-zinc-800'}`}>
                <div 
                  className={`h-full transition-all duration-500 ${Number(density) > 0.5 && Number(density) < 3.0 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                  style={{ width: `${Math.min(Number(density) * 33, 100)}%` }} 
                />
              </div>
              <p className={`text-[10px] mt-2 italic ${isLightMode ? 'text-slate-400' : 'text-zinc-600'}`}>
                {Number(density) < 0.5 ? "Increase usage of your primary keyword." : 
                 Number(density) > 3.0 ? "Too high! Avoid keyword stuffing." : 
                 "Usage looks optimal for search ranking."}
              </p>
            </div>

            <div className={`rounded-2xl border overflow-hidden p-4 space-y-4 transition-colors ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-white/5'}`}>
              <div className="flex justify-between items-center text-[11px]">
                  <div className={`flex items-center gap-2 font-medium ${isLightMode ? 'text-slate-600' : 'text-gray-400'}`}>
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    AI Probablity
                  </div>
                  <span className={`font-bold ${analysis?.aiProbability! > 50 ? 'text-rose-500' : 'text-emerald-500'}`}>{analysis?.aiProbability}%</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                  <div className={`flex items-center gap-2 font-medium ${isLightMode ? 'text-slate-600' : 'text-gray-400'}`}>
                    <UserCheck className="h-4 w-4 text-brand-purple" />
                    EEAT Compliance
                  </div>
                  <span className={`font-bold ${analysis?.eeatScore! > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{analysis?.eeatScore}/100</span>
              </div>
              {analysis?.readability && (
                <div className="flex justify-between items-center text-[11px]">
                    <div className={`flex items-center gap-2 font-medium ${isLightMode ? 'text-slate-600' : 'text-gray-400'}`}>
                      <FileCheck className="h-4 w-4 text-sky-500" />
                      Readability
                    </div>
                    <span className={`font-bold text-right max-w-[55%] ${isLightMode ? 'text-slate-700' : 'text-zinc-200'}`}>{analysis.readability}</span>
                </div>
              )}
            </div>

            {/* AI Suggestions */}
            <div className="space-y-3">
              <h4 className={`text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5 px-1 ${isLightMode ? 'text-slate-400' : 'text-gray-500'}`}>
                 <Sparkles className="h-3 w-3 text-brand-purple" />
                 Optimization Suggestions
              </h4>
              {(() => {
                const rawSugs: any = analysis?.suggestions;
                const suggestionsArray = Array.isArray(rawSugs)
                  ? rawSugs
                  : (typeof rawSugs === 'string' && rawSugs.trim().length > 0
                      ? [rawSugs]
                      : []);
                
                return suggestionsArray.map((s, i) => (
                  <div key={i} className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${isLightMode ? 'bg-white border-slate-200 hover:bg-slate-50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className={`text-[11px] leading-relaxed font-medium ${isLightMode ? 'text-slate-600' : 'text-zinc-300'}`}>{s}</p>
                  </div>
                ));
              })()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
