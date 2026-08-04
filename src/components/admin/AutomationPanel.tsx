import { useEffect, useState } from "react";
import { Zap, Loader2, CheckCircle2, XCircle, Trash2, ExternalLink } from "lucide-react";
import { safeFetchJson } from "../../lib/api";

interface AutomationStatus {
  lastRunAt?: string;
  lastRunStatus?: "success" | "failed" | "idle";
  lastRunTitle?: string;
  lastRunError?: string;
  lastRunPublishedUrl?: string;
  lastCleanupAt?: string;
  lastCleanupDeletedCount?: number;
  lastCleanupDeletedTitles?: string[];
}

interface AutomationPanelProps {
  isLightMode?: boolean;
}

function timeAgo(iso?: string): string {
  if (!iso) return "Never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Auto-published articles + auto-deleted empty-body cleanup — see
// src/lib/automation-pipeline.ts and src/lib/cleanup-empty-posts.ts in the
// worker. This panel is read/trigger-only; the actual work always runs on
// the backend (hourly cron, or the manual-trigger buttons below), never in
// the browser — so this is safe to leave open without anything running
// client-side in the background.
export function AutomationPanel({ isLightMode }: AutomationPanelProps) {
  const [status, setStatus] = useState<AutomationStatus>({});
  const [queueCount, setQueueCount] = useState<number | null>(null);
  const [failedCount, setFailedCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningAutomation, setRunningAutomation] = useState(false);
  const [runningCleanup, setRunningCleanup] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = async () => {
    try {
      const data = await safeFetchJson("/api/articles/automation-status");
      if (data?.success) {
        setStatus(data.status || {});
        setQueueCount(typeof data.queueCount === "number" ? data.queueCount : null);
        setFailedCount(typeof data.failedCount === "number" ? data.failedCount : null);
      }
    } catch (e) {
      console.warn("Failed to load automation status:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Light polling so the panel updates itself if the admin leaves it open
    // while a manually-triggered run (or the hourly cron) is in progress.
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const runAutomation = async () => {
    setRunningAutomation(true);
    setMessage(null);
    try {
      const data = await safeFetchJson("/api/articles/run-automation", { method: "POST" });
      setMessage({ type: "success", text: data?.message || "Automation pipeline started in the background." });
      // The pipeline runs in the background (waitUntil) and can take a
      // couple of minutes — poll a few times to pick up the result without
      // the admin needing to manually refresh.
      setTimeout(load, 15000);
      setTimeout(load, 45000);
      setTimeout(load, 90000);
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Failed to start automation pipeline." });
    } finally {
      setRunningAutomation(false);
    }
  };

  const runCleanup = async () => {
    setRunningCleanup(true);
    setMessage(null);
    try {
      const data = await safeFetchJson("/api/articles/cleanup-empty-body", { method: "POST" });
      setMessage({
        type: "success",
        text: data?.deleted > 0 ? `Deleted ${data.deleted} empty-body post(s).` : "No empty-body posts found — nothing to delete.",
      });
      await load();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Failed to run cleanup." });
    } finally {
      setRunningCleanup(false);
    }
  };

  const cardClass = `p-8 rounded-[2rem] border ${isLightMode ? "bg-white border-slate-100" : "bg-zinc-900/40 border-white/[0.04]"}`;

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-brand-purple" />
          <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-60">Automation Agent</h3>
        </div>
        {loading ? (
          <Loader2 size={14} className="animate-spin opacity-40" />
        ) : (
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Runs hourly</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`p-4 rounded-2xl ${isLightMode ? "bg-slate-50" : "bg-zinc-950"}`}>
          <div className={`text-2xl font-black tabular-nums ${isLightMode ? "text-slate-900" : "text-white"}`}>
            {queueCount ?? "—"}
          </div>
          <p className="text-[9px] font-bold uppercase tracking-wider opacity-50 mt-1">Drafts Queued</p>
        </div>
        <div className={`p-4 rounded-2xl ${isLightMode ? "bg-slate-50" : "bg-zinc-950"}`}>
          <div className={`text-2xl font-black tabular-nums ${failedCount ? "text-red-500" : (isLightMode ? "text-slate-900" : "text-white")}`}>
            {failedCount ?? "—"}
          </div>
          <p className="text-[9px] font-bold uppercase tracking-wider opacity-50 mt-1">Failed (will retry)</p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-start gap-2">
          {status.lastRunStatus === "success" ? (
            <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
          ) : status.lastRunStatus === "failed" ? (
            <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
          ) : (
            <div className="w-3.5 h-3.5 rounded-full bg-zinc-400/30 mt-0.5 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-50">
              Last run &middot; {timeAgo(status.lastRunAt)}
            </p>
            {status.lastRunTitle && (
              <p className={`text-xs font-medium truncate ${isLightMode ? "text-slate-700" : "text-zinc-300"}`}>
                {status.lastRunTitle}
              </p>
            )}
            {status.lastRunStatus === "failed" && status.lastRunError && (
              <p className="text-[10px] text-red-500 mt-0.5 line-clamp-2">{status.lastRunError}</p>
            )}
            {status.lastRunStatus === "success" && status.lastRunPublishedUrl && (
              <a
                href={status.lastRunPublishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-brand-purple hover:underline inline-flex items-center gap-1 mt-0.5"
              >
                View published article <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Trash2 size={14} className="opacity-40 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-50">
              Last cleanup &middot; {timeAgo(status.lastCleanupAt)}
            </p>
            <p className={`text-xs font-medium ${isLightMode ? "text-slate-700" : "text-zinc-300"}`}>
              {status.lastCleanupDeletedCount ? `${status.lastCleanupDeletedCount} empty-body post(s) deleted` : "No deletions yet"}
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`text-[11px] font-medium mb-4 px-3 py-2 rounded-xl ${message.type === "success" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"}`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={runAutomation}
          disabled={runningAutomation}
          className="flex-1 px-4 py-2.5 rounded-full bg-brand-purple text-white text-[11px] font-bold hover:bg-brand-purple-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {runningAutomation ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
          Run Now
        </button>
        <button
          onClick={runCleanup}
          disabled={runningCleanup}
          className={`flex-1 px-4 py-2.5 rounded-full text-[11px] font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 border ${isLightMode ? "border-slate-200 text-slate-600 hover:bg-slate-50" : "border-white/10 text-zinc-300 hover:bg-zinc-800"}`}
        >
          {runningCleanup ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          Cleanup Empty Posts
        </button>
      </div>
    </div>
  );
}
