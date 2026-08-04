import { useEffect, useState } from "react";
import { MessageCircle, Send, CornerDownRight } from "lucide-react";
import { safeFetchJson } from "../lib/api";

interface CommentNode {
  id: number;
  parent_id: number | null;
  author_name: string;
  body: string;
  created_at: string;
  replies: CommentNode[];
}

interface CommentsProps {
  articleSlug: string;
  isLightMode?: boolean;
}

function timeAgo(iso: string): string {
  const then = new Date(iso.includes("T") ? iso : `${iso}Z`).getTime();
  const diffSec = Math.max(0, (Date.now() - then) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export function Comments({ articleSlug, isLightMode }: CommentsProps) {
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — always left empty by real users
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await safeFetchJson(`/api/comments/${encodeURIComponent(articleSlug)}`);
      setComments(Array.isArray(data?.comments) ? data.comments : []);
    } catch (e) {
      console.warn("Failed to load comments:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (articleSlug) load();
  }, [articleSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    setSubmitting(true);
    setStatus(null);
    try {
      const data = await safeFetchJson("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleSlug,
          authorName: name.trim(),
          body: body.trim(),
          parentId: replyTo,
          website, // honeypot field
        }),
      });
      if (data?.success) {
        setStatus({ type: "success", text: "మీ కామెంట్ సమర్పించబడింది — ఆమోదించిన తర్వాత కనిపిస్తుంది. (Submitted — will appear once approved.)" });
        setBody("");
        setReplyTo(null);
      } else {
        setStatus({ type: "error", text: data?.error || "కామెంట్ సమర్పించడంలో విఫలమైంది." });
      }
    } catch (e) {
      setStatus({ type: "error", text: "కామెంట్ సమర్పించడంలో విఫలమైంది." });
    } finally {
      setSubmitting(false);
    }
  };

  const cardBg = isLightMode ? "bg-white border-slate-200" : "bg-brand-card border-white/5";
  const textMuted = isLightMode ? "text-slate-500" : "text-brand-text-muted";
  const inputCls = isLightMode
    ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
    : "bg-black/20 border-white/10 text-white placeholder:text-zinc-500";

  const renderComment = (c: CommentNode, depth = 0) => (
    <div key={c.id} className={depth > 0 ? "ml-8 mt-4" : "mt-6"}>
      <div className={`rounded-xl border p-4 ${cardBg}`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-bold text-sm">{c.author_name}</span>
          <span className={`text-xs ${textMuted}`}>{timeAgo(c.created_at)}</span>
        </div>
        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isLightMode ? "text-slate-700" : "text-gray-300"}`}>{c.body}</p>
        {depth === 0 && (
          <button
            onClick={() => setReplyTo(c.id)}
            className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-purple hover:underline"
          >
            <CornerDownRight size={12} /> Reply
          </button>
        )}
      </div>
      {c.replies?.map((r) => renderComment(r, depth + 1))}
    </div>
  );

  return (
    <div className="mt-12">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="h-5 w-5 text-brand-purple" />
        <h3 className="text-xl font-bold">Comments {comments.length > 0 ? `(${comments.length})` : ""}</h3>
      </div>

      <form onSubmit={handleSubmit} className={`rounded-2xl border p-5 ${cardBg}`}>
        {replyTo && (
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className={textMuted}>Replying to a comment</span>
            <button type="button" onClick={() => setReplyTo(null)} className="text-brand-purple font-semibold">Cancel</button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3 mb-3">
          <input
            type="text"
            placeholder="మీ పేరు (Your name)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
            className={`rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-purple ${inputCls}`}
          />
          {/* Honeypot — hidden from real users via CSS, bots that fill every field will trip it */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="hidden"
            aria-hidden="true"
          />
        </div>
        <textarea
          placeholder="మీ అభిప్రాయం రాయండి... (Write your comment...)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          required
          rows={3}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-purple resize-none ${inputCls}`}
        />
        <div className="flex items-center justify-between mt-3">
          {status ? (
            <p className={`text-xs ${status.type === "success" ? "text-emerald-500" : "text-red-400"}`}>{status.text}</p>
          ) : <span />}
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-full bg-brand-purple px-5 py-2 text-sm font-bold text-white hover:bg-brand-purple-hover transition-colors disabled:opacity-50"
          >
            <Send size={14} /> {submitting ? "పంపుతోంది..." : "పోస్ట్ చేయి"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className={`text-sm mt-6 ${textMuted}`}>Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className={`text-sm mt-6 ${textMuted}`}>మొదటిగా మీరే కామెంట్ చేయండి! (Be the first to comment!)</p>
      ) : (
        comments.map((c) => renderComment(c))
      )}
    </div>
  );
}
