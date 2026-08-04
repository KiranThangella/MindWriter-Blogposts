import { useEffect, useState } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { safeFetchJson } from "../../lib/api";

interface HeroImage {
  url: string;
  alt: string;
}

interface HeroImagesManagerProps {
  isLightMode?: boolean;
  handleImageUpload: (file: File) => Promise<{ url: string; altText: string; caption: string } | null>;
}

export function HeroImagesManager({ isLightMode, handleImageUpload }: HeroImagesManagerProps) {
  const [images, setImages] = useState<HeroImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await safeFetchJson("/api/admin/hero-images");
      setImages(Array.isArray(data?.images) ? data.images : []);
    } catch (e) {
      console.warn("Failed to load hero images:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (images.length >= 5) {
      setStatus({ type: "error", text: "గరిష్టంగా 5 images మాత్రమే (Maximum 5 images allowed)." });
      return;
    }
    setUploading(true);
    setStatus(null);
    try {
      const result = await handleImageUpload(file);
      if (result?.url) {
        setImages((prev) => [...prev, { url: result.url, alt: result.altText || "" }]);
      } else {
        setStatus({ type: "error", text: "Upload failed." });
      }
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const data = await safeFetchJson("/api/admin/hero-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });
      if (data?.success) {
        setStatus({ type: "success", text: "సేవ్ చేయబడింది — homepage కి కొన్ని క్షణాల్లో వర్తిస్తుంది. (Saved — homepage picks it up shortly.)" });
      } else {
        setStatus({ type: "error", text: data?.error || "Save failed." });
      }
    } catch (e) {
      setStatus({ type: "error", text: "Save failed." });
    } finally {
      setSaving(false);
    }
  };

  const cardBg = isLightMode ? "bg-white border-slate-100" : "bg-zinc-900/40 border-white/[0.04]";

  return (
    <div className={`p-8 rounded-[2rem] border ${cardBg}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-40">Homepage Hero Images</h3>
        <span className="text-[10px] font-bold opacity-40">{images.length}/5</span>
      </div>
      <p className={`text-xs mb-6 ${isLightMode ? "text-slate-500" : "text-zinc-500"}`}>
        Upload 2–5 images to rotate as a carousel on the homepage hero. With just one, it displays as a static image. With none, a default placeholder shows.
      </p>

      {loading ? (
        <p className={`text-sm ${isLightMode ? "text-slate-500" : "text-zinc-500"}`}>Loading...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
          {images.map((img, i) => (
            <div key={img.url + i} className="relative group aspect-[4/3] rounded-xl overflow-hidden border border-white/10">
              <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {images.length < 5 && (
            <label className={`aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${isLightMode ? "border-slate-200 hover:border-brand-purple/50 text-slate-400" : "border-white/10 hover:border-brand-purple/50 text-zinc-500"}`}>
              {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
              <span className="text-[10px] font-bold uppercase tracking-wider">{uploading ? "Uploading..." : "Add Image"}</span>
              <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" disabled={uploading} />
            </label>
          )}
          {images.length === 0 && !uploading && (
            <div className={`col-span-2 sm:col-span-2 aspect-[4/3] rounded-xl border flex flex-col items-center justify-center gap-2 ${isLightMode ? "bg-slate-50 border-slate-100 text-slate-300" : "bg-zinc-950 border-white/5 text-zinc-700"}`}>
              <ImageIcon size={24} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Using default fallback image</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        {status ? (
          <p className={`text-xs ${status.type === "success" ? "text-emerald-500" : "text-red-400"}`}>{status.text}</p>
        ) : <span />}
        <button
          onClick={save}
          disabled={saving || loading}
          className="px-5 py-2 rounded-full bg-brand-purple text-white text-xs font-bold hover:bg-brand-purple-hover transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Hero Images"}
        </button>
      </div>
    </div>
  );
}
