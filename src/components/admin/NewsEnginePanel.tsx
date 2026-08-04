import { useState } from "react";
import { Loader2, Globe, Sparkles, CheckCircle, AlertCircle } from "lucide-react";
import { safeFetchJson } from "../../lib/api";

export function NewsEnginePanel({ isLightMode, onPostGenerated }: { isLightMode?: boolean, onPostGenerated: (post: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const runEngine = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const data = await safeFetchJson("/api/articles/generate-news-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 3 })
      });
      if (data.success) {
        data.articles.forEach((art: any) => {
          let parsedBody = art.bodyText || "";
          parsedBody = parsedBody.replace(/^```html\s*/i, '').replace(/\s*```$/i, '').trim();
          parsedBody = parsedBody.replace(/((?:\|.+?\|(?:\n|\r\n?))+)/g, (match: string) => {
             const lines = match.trim().split('\n');
             // Is second line a separator?
             const secondLine = lines[1] || '';
             if (secondLine.includes('---')) {
                const header = lines[0].split('|').slice(1, -1).map((c: string) => `<th><p>${c.trim()}</p></th>`).join('');
                const body = lines.slice(2).map((line: string) => {
                   return `<tr>${line.split('|').slice(1, -1).map((c: string) => `<td><p>${c.trim()}</p></td>`).join('')}</tr>`;
                }).join('');
                return `<table><tbody><tr>${header}</tr>${body}</tbody></table>`;
             }
             return match;
          });
          
          if (!parsedBody.startsWith('<')) parsedBody = `<p>${parsedBody.replace(/\n\n/g, '</p><p>')}</p>`;
          
          onPostGenerated({
            ...art, 
            title: art.title,
            category: "AI NEWS",
            isAiGenerated: true,
            body: parsedBody,
            content: parsedBody,
            image: art.image || "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800"
          });
        });
        setStatusMsg({ type: 'success', text: "Generated 3 AI news articles successfully in Telugu!" });
      } else {
        setStatusMsg({ type: 'error', text: data.error || "Failed to generate news articles." });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <h2 className="text-xl font-bold">AI News Auto-Engine</h2>
      <p className="text-sm text-zinc-400">Automatically fetches top worldwide AI news and translates to Telugu.</p>
      
      <button onClick={runEngine} disabled={loading} className="px-4 py-2 bg-brand-purple hover:bg-brand-purple/90 text-white rounded flex items-center gap-2 transition-colors duration-200 cursor-pointer disabled:opacity-55">
        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Globe className="h-5 w-5" />}
        Generate & Translate Latest AI News
      </button>

      {statusMsg && (
        <div className={`p-4 rounded-xl flex items-start gap-2.5 border text-sm ${statusMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
          {statusMsg.type === 'success' ? <CheckCircle className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}
    </div>
  );
}
