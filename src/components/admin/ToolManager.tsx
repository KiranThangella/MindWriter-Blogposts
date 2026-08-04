import { useState, useEffect, useCallback } from "react";
import * as LucideIcons from "lucide-react";
import { Plus, Trash2, Cpu, Pencil, Check, X, ArrowUp, ArrowDown, Eye, EyeOff, Loader2 } from "lucide-react";
import { safeFetchJson } from "../../lib/api";

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  isInternal: boolean;
  internalId?: string;
  url?: string;
  enabled: boolean;
  order: number;
}

const ICON_OPTIONS = [
  "Cpu", "Globe", "FileText", "Edit3", "Table", "ImageIcon", "Calculator",
  "Wrench", "Sparkles", "Search", "BarChart3", "Zap", "Palette", "Type",
];

// Internal tools are the ones actually implemented as in-app pages/routes
// (see src/components/tools/*.tsx + activeTool state in App.tsx). Keeping
// this list here keeps the admin form honest — you can only pick an
// internalId that's actually wired up to something.
const INTERNAL_TOOL_OPTIONS = [
  { id: "calculator", label: "Calculator" },
  { id: "textAnalyzer", label: "Text Analyzer" },
  { id: "colorPalette", label: "Color Palette" },
];

const emptyDraft = {
  name: "",
  description: "",
  url: "",
  icon: "Cpu",
  category: "General",
  isInternal: false,
  internalId: INTERNAL_TOOL_OPTIONS[0].id,
};

export function ToolManager() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Tool>>({});

  const loadTools = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await safeFetchJson("/api/tools?all=true");
      if (data?.success) {
        setTools(data.tools || []);
      } else {
        setError(data?.error || "Tools load చేయడంలో సమస్య వచ్చింది.");
      }
    } catch (err: any) {
      setError(err.message || "Tools load చేయడంలో సమస్య వచ్చింది.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  const handleAdd = async () => {
    if (!draft.name.trim()) return;
    if (!draft.isInternal && !draft.url.trim()) {
      setError("External tool కి URL అవసరం.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data = await safeFetchJson("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (data?.success) {
        setTools(data.tools || []);
        setDraft(emptyDraft);
      } else {
        setError(data?.error || "Tool add చేయడంలో సమస్య వచ్చింది.");
      }
    } catch (err: any) {
      setError(err.message || "Tool add చేయడంలో సమస్య వచ్చింది.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      const data = await safeFetchJson(`/api/tools/${id}`, { method: "DELETE" });
      if (data?.success) {
        setTools(data.tools || []);
      }
    } catch (err: any) {
      setError(err.message || "Tool delete చేయడంలో సమస్య వచ్చింది.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (tool: Tool) => {
    setEditingId(tool.id);
    setEditDraft({ ...tool });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const data = await safeFetchJson(`/api/tools/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDraft),
      });
      if (data?.success) {
        setTools(data.tools || []);
        cancelEdit();
      } else {
        setError(data?.error || "Tool update చేయడంలో సమస్య వచ్చింది.");
      }
    } catch (err: any) {
      setError(err.message || "Tool update చేయడంలో సమస్య వచ్చింది.");
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (tool: Tool) => {
    setSaving(true);
    try {
      const data = await safeFetchJson(`/api/tools/${tool.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !tool.enabled }),
      });
      if (data?.success) {
        setTools(data.tools || []);
      }
    } catch (err: any) {
      setError(err.message || "Tool toggle చేయడంలో సమస్య వచ్చింది.");
    } finally {
      setSaving(false);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= tools.length) return;
    const reordered = [...tools];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setTools(reordered); // optimistic
    setSaving(true);
    try {
      const data = await safeFetchJson("/api/tools/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: reordered.map((t) => t.id) }),
      });
      if (data?.success) {
        setTools(data.tools || []);
      } else {
        loadTools(); // revert on failure
      }
    } catch (err: any) {
      setError(err.message || "Reorder చేయడంలో సమస్య వచ్చింది.");
      loadTools();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 bg-black/20 rounded-2xl border border-white/10 text-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Manage Tools</h2>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-brand-purple" />}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Add new tool */}
      <div className="flex flex-col gap-2 mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, isInternal: false }))}
            className={`flex-1 p-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${!draft.isInternal ? "bg-brand-purple text-white" : "bg-white/5 text-gray-400"}`}
          >
            External (URL)
          </button>
          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, isInternal: true }))}
            className={`flex-1 p-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${draft.isInternal ? "bg-brand-purple text-white" : "bg-white/5 text-gray-400"}`}
          >
            Internal (In-app)
          </button>
        </div>

        <input
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="Name (e.g. Prism Image Compressor)"
          className="bg-white/5 p-2 rounded border border-white/10"
        />
        <input
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          placeholder="Description"
          className="bg-white/5 p-2 rounded border border-white/10"
        />

        {draft.isInternal ? (
          <select
            value={draft.internalId}
            onChange={(e) => setDraft((d) => ({ ...d, internalId: e.target.value }))}
            className="bg-white/5 p-2 rounded border border-white/10"
          >
            {INTERNAL_TOOL_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <input
            value={draft.url}
            onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
            placeholder="URL (https://...)"
            className="bg-white/5 p-2 rounded border border-white/10"
          />
        )}

        <div className="flex gap-2">
          <input
            value={draft.category}
            onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
            placeholder="Category (e.g. Writing, Design)"
            className="flex-1 bg-white/5 p-2 rounded border border-white/10"
          />
          <select
            value={draft.icon}
            onChange={(e) => setDraft((d) => ({ ...d, icon: e.target.value }))}
            className="bg-white/5 p-2 rounded border border-white/10"
          >
            {ICON_OPTIONS.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleAdd}
          disabled={saving}
          className="bg-brand-purple p-2 rounded flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add Tool
        </button>
      </div>

      {/* Existing tools list */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm p-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading tools...
        </div>
      ) : tools.length === 0 ? (
        <div className="text-gray-500 text-sm p-4 text-center">ఇంకా ఏ tools add చేయలేదు.</div>
      ) : (
        <div className="grid gap-2">
          {tools.map((t, index) => {
            const Icon = (LucideIcons as any)[t.icon] || Cpu;
            const isEditing = editingId === t.id;

            if (isEditing) {
              return (
                <div key={t.id} className="flex flex-col gap-2 bg-white/5 p-3 rounded-xl border border-brand-purple/30">
                  <input
                    value={editDraft.name || ""}
                    onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                    className="bg-black/20 p-2 rounded border border-white/10 text-sm"
                    placeholder="Name"
                  />
                  <input
                    value={editDraft.description || ""}
                    onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
                    className="bg-black/20 p-2 rounded border border-white/10 text-sm"
                    placeholder="Description"
                  />
                  {!editDraft.isInternal && (
                    <input
                      value={editDraft.url || ""}
                      onChange={(e) => setEditDraft((d) => ({ ...d, url: e.target.value }))}
                      className="bg-black/20 p-2 rounded border border-white/10 text-sm"
                      placeholder="URL"
                    />
                  )}
                  <div className="flex gap-2">
                    <input
                      value={editDraft.category || ""}
                      onChange={(e) => setEditDraft((d) => ({ ...d, category: e.target.value }))}
                      className="flex-1 bg-black/20 p-2 rounded border border-white/10 text-sm"
                      placeholder="Category"
                    />
                    <select
                      value={editDraft.icon || "Cpu"}
                      onChange={(e) => setEditDraft((d) => ({ ...d, icon: e.target.value }))}
                      className="bg-black/20 p-2 rounded border border-white/10 text-sm"
                    >
                      {ICON_OPTIONS.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 justify-end mt-1">
                    <button onClick={cancelEdit} className="p-2 rounded bg-white/5 hover:bg-white/10"><X className="h-4 w-4" /></button>
                    <button onClick={saveEdit} className="p-2 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"><Check className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            }

            return (
              <div key={t.id} className={`flex items-center justify-between gap-3 bg-white/5 p-3 rounded-xl ${!t.enabled ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="h-5 w-5 text-brand-purple shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">{t.name}</span>
                      <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/10 text-gray-400 shrink-0">
                        {t.isInternal ? "Internal" : "External"}
                      </span>
                      {t.category && (
                        <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-brand-purple/20 text-brand-purple shrink-0">
                          {t.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{t.description || t.url || t.internalId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => move(index, -1)} disabled={index === 0} className="p-1.5 rounded hover:bg-white/10 disabled:opacity-20"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button onClick={() => move(index, 1)} disabled={index === tools.length - 1} className="p-1.5 rounded hover:bg-white/10 disabled:opacity-20"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button onClick={() => toggleEnabled(t)} className="p-1.5 rounded hover:bg-white/10" title={t.enabled ? "Disable" : "Enable"}>
                    {t.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-gray-500" />}
                  </button>
                  <button onClick={() => startEdit(t)} className="p-1.5 rounded hover:bg-white/10"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded hover:bg-red-500/20"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
