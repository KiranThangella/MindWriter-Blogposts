import { useState, useRef, useEffect, ChangeEvent, MouseEvent } from "react";
import { 
  UploadCloud, Save, Type, Image as ImageIcon, Sparkles, Sliders, Type as TypeIcon,
  Sun, Contrast, RefreshCw, X, Check, Loader2, Maximize, Scissors, Monitor, Youtube, Instagram
} from "lucide-react";

function formatBytes(bytes?: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

interface ImageStudioProps {
  sanityProjectId: string;
  sanityWriteToken: string;
  sanityDataset: string;
  isLightMode?: boolean;
}

interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: string;
  fontStyle?: string;
  backgroundColor?: string;
  isDragging: boolean;
}

export function ImageStudio({
  sanityProjectId,
  sanityWriteToken,
  sanityDataset,
  isLightMode
}: ImageStudioProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Adjustments
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  
  // Dimensions and cropping
  const [targetWidth, setTargetWidth] = useState<number | null>(null);
  const [targetHeight, setTargetHeight] = useState<number | null>(null);

  // Text layers
  const [texts, setTexts] = useState<TextLayer[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  // Upload/Save state
  const [quality, setQuality] = useState(0.8);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [estimatedSize, setEstimatedSize] = useState<number>(0);

  // Render canvas whenever inputs change
  useEffect(() => {
    renderCanvas();
  }, [image, brightness, contrast, rotation, flipX, flipY, targetWidth, targetHeight, texts]);

  // Recalculate estimated size
  useEffect(() => {
    if (canvasRef.current && image) {
      const dataUrl = canvasRef.current.toDataURL("image/webp", quality);
      // Rough estimation of base64 size to bytes
      const bytes = Math.round((dataUrl.length * 3) / 4);
      setEstimatedSize(bytes);
    }
  }, [quality, image, brightness, contrast, rotation, flipX, flipY, targetWidth, targetHeight, texts]);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalFile(file);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setTargetWidth(img.width);
        setTargetHeight(img.height);
      };
      img.src = url;
    }
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use target dimensions or original
    const w = targetWidth || image.width;
    const h = targetHeight || image.height;
    
    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);

    // Filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    // Transformations
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);

    // Draw Image - simple centered/cover
    // If dimensions changed, we draw it covered
    const scale = Math.max(w / image.width, h / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Render Texts
    ctx.filter = "none"; // clear filter for text
    texts.forEach(t => {
      const fontStyle = t.fontStyle || "normal";
      ctx.font = `${fontStyle} ${t.fontWeight} ${t.fontSize}px ${t.fontFamily}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      
      const metrics = ctx.measureText(t.text);
      const textWidth = metrics.width;
      const textHeight = t.fontSize; 
      
      if (t.backgroundColor && t.backgroundColor !== "transparent") {
         ctx.fillStyle = t.backgroundColor;
         const padding = 10;
         ctx.fillRect(t.x - padding, t.y - padding, textWidth + padding * 2, textHeight + padding * 2);
      }
      
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    });
  };

  // Text Selection / Dragging (Simple implementation)
  const isDraggingAny = useRef(false);

  const handlePointerDown = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Find clicked text (reverse to pick top-most)
    const clickedTextIndex = [...texts].reverse().findIndex(t => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;
      const fontStyle = t.fontStyle || "normal";
      ctx.font = `${fontStyle} ${t.fontWeight} ${t.fontSize}px ${t.fontFamily}`;
      const metrics = ctx.measureText(t.text);
      const textWidth = metrics.width;
      const textHeight = t.fontSize; // Approx

      return (
        x >= t.x && x <= t.x + textWidth &&
        y >= t.y && y <= t.y + textHeight
      );
    });

    if (clickedTextIndex !== -1) {
      const actualIndex = texts.length - 1 - clickedTextIndex;
      setSelectedTextId(texts[actualIndex].id);
      
      const newTexts = [...texts];
      newTexts[actualIndex].isDragging = true;
      setTexts(newTexts);
      isDraggingAny.current = true;
    } else {
      setSelectedTextId(null);
    }
  };

  const handlePointerMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingAny.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // For simplicity, skip precise drag offset handling, just snap center to mouse
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setTexts(prev => prev.map(t => t.isDragging ? { ...t, x, y } : t));
  };

  const handlePointerUp = () => {
    isDraggingAny.current = false;
    setTexts(prev => prev.map(t => ({ ...t, isDragging: false })));
  };

  const addText = () => {
    setTexts(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text: "New Text",
        x: targetWidth ? targetWidth / 2 : 50,
        y: targetHeight ? targetHeight / 2 : 50,
        fontSize: 48,
        fontFamily: "Inter, sans-serif",
        color: "#ffffff",
        fontWeight: "bold",
        fontStyle: "normal",
        backgroundColor: "transparent",
        isDragging: false
      }
    ]);
  };

  const updateSelectedText = (updates: Partial<TextLayer>) => {
    if (!selectedTextId) return;
    setTexts(prev => prev.map(t => t.id === selectedTextId ? { ...t, ...updates } : t));
  };

  const deleteSelectedText = () => {
    if (!selectedTextId) return;
    setTexts(prev => prev.filter(t => t.id !== selectedTextId));
    setSelectedTextId(null);
  };

  const handleSaveToSanity = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !originalFile) return;

    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      // Get base64 WebP
      const dataUrl = canvas.toDataURL("image/webp", quality);
      // Convert to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      
      const filename = originalFile.name.replace(/\.[^/.]+$/, "") + "-optimized.webp";
      const file = new File([blob], filename, { type: "image/webp" });

      // Build Sanity upload endpoint
      const uploadUrl = `https://${sanityProjectId}.api.sanity.io/v2023-08-01/assets/images/${sanityDataset}?filename=${encodeURIComponent(filename)}`;
      
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sanityWriteToken}`,
          "Content-Type": "image/webp"
        },
        body: file
      });
      
      const data = await uploadRes.json();
      if (data.document && data.document._id) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert("Upload failed. Check console.");
        console.error(data);
      }
    } catch (err) {
      console.error("Save error: ", err);
      alert("Error saving image.");
    } finally {
      setIsSaving(false);
    }
  };

  const applyPreset = (w: number, h: number) => {
    setTargetWidth(w);
    setTargetHeight(h);
  };

  return (
    <div className={`h-full flex flex-col md:flex-row ${isLightMode ? 'bg-white text-slate-800' : 'bg-zinc-950 text-zinc-100'} overflow-hidden`}>
      
      {/* 1. Sidebar Controls */}
      <aside className={`w-full md:w-80 flex flex-col shrink-0 border-r overflow-y-auto custom-scrollbar ${isLightMode ? 'border-slate-200 bg-slate-50' : 'border-white/5 bg-zinc-950/50'}`}>
        <div className={`p-4 border-b ${isLightMode ? 'border-slate-200' : 'border-white/5'}`}>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-brand-purple flex items-center gap-2 mb-4">
            <Sparkles size={14} /> Output Presets
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => applyPreset(1200, 630)} className="p-2 border rounded-xl text-[9px] font-bold tracking-wider hover:bg-brand-purple hover:text-white transition-colors border-white/10 flex flex-col items-center gap-1"><Monitor size={14}/> Blog (1200x630)</button>
            <button onClick={() => applyPreset(1280, 720)} className="p-2 border rounded-xl text-[9px] font-bold tracking-wider hover:bg-brand-purple hover:text-white transition-colors border-white/10 flex flex-col items-center gap-1"><Youtube size={14}/> YouTube (1280x720)</button>
            <button onClick={() => applyPreset(1080, 1080)} className="p-2 border rounded-xl text-[9px] font-bold tracking-wider hover:bg-brand-purple hover:text-white transition-colors border-white/10 flex flex-col items-center gap-1"><Instagram size={14}/> Insta Post</button>
            <button onClick={() => applyPreset(1080, 1920)} className="p-2 border rounded-xl text-[9px] font-bold tracking-wider hover:bg-brand-purple hover:text-white transition-colors border-white/10 flex flex-col items-center gap-1"><Maximize size={14}/> Insta Story</button>
          </div>
        </div>

        <div className={`p-4 border-b ${isLightMode ? 'border-slate-200' : 'border-white/5'}`}>
          <h2 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 mb-4">
            <Sliders size={14} /> Adjustments
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wide flex justify-between">
                <span className="flex items-center gap-1"><Sun size={10}/> Brightness</span>
                <span>{brightness}%</span>
              </label>
              <input type="range" min="0" max="200" value={brightness} onChange={e => setBrightness(Number(e.target.value))} className="w-full accent-brand-purple mt-2" />
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wide flex justify-between">
                <span className="flex items-center gap-1"><Contrast size={10}/> Contrast</span>
                <span>{contrast}%</span>
              </label>
              <input type="range" min="0" max="200" value={contrast} onChange={e => setContrast(Number(e.target.value))} className="w-full accent-brand-purple mt-2" />
            </div>
            <div className="flex gap-2">
               <button onClick={() => setRotation(r => (r + 90) % 360)} className="flex-1 p-2 rounded-lg border border-white/10 text-[9px] font-bold uppercase hover:bg-white/5">Rotate 90</button>
               <button onClick={() => setFlipX(!flipX)} className="flex-1 p-2 rounded-lg border border-white/10 text-[9px] font-bold uppercase hover:bg-white/5">Flip X</button>
               <button onClick={() => setFlipY(!flipY)} className="flex-1 p-2 rounded-lg border border-white/10 text-[9px] font-bold uppercase hover:bg-white/5">Flip Y</button>
            </div>
          </div>
        </div>

        <div className={`p-4 border-b ${isLightMode ? 'border-slate-200' : 'border-white/5'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
              <TypeIcon size={14} /> Text Layers
            </h2>
            <button onClick={addText} className="text-[9px] px-2 py-1 bg-brand-purple text-white rounded font-bold uppercase tracking-wider">Add Text</button>
          </div>
          
          {selectedTextId ? (
            <div className="space-y-3 p-3 rounded-xl bg-white/5 border border-white/10">
               <div>
                 <input 
                   type="text" 
                   value={texts.find(t => t.id === selectedTextId)?.text || ""} 
                   onChange={e => updateSelectedText({ text: e.target.value })} 
                   className="w-full bg-transparent border-b border-white/20 p-1 text-sm focus:outline-none"
                 />
               </div>
               <div className="flex flex-wrap gap-2">
                 <div className="flex flex-col gap-1 w-16">
                   <span className="text-[8px] font-bold uppercase text-zinc-500">Size</span>
                   <input 
                     type="number" 
                     value={texts.find(t => t.id === selectedTextId)?.fontSize || 48} 
                     onChange={e => updateSelectedText({ fontSize: Number(e.target.value) })} 
                     className="w-full bg-black/20 rounded p-1.5 text-xs text-center" 
                     title="Font Size"
                   />
                 </div>
                 <div className="flex flex-col gap-1 w-14">
                   <span className="text-[8px] font-bold uppercase text-zinc-500">Color</span>
                   <input 
                     type="color" 
                     value={texts.find(t => t.id === selectedTextId)?.color || "#ffffff"} 
                     onChange={e => updateSelectedText({ color: e.target.value })} 
                     className="w-full h-[28px] rounded p-0 border-0 cursor-pointer" 
                     title="Text Color"
                   />
                 </div>
                 <div className="flex flex-col gap-1 w-14">
                   <span className="text-[8px] font-bold uppercase text-zinc-500">BG</span>
                   <input 
                     type="color" 
                     value={texts.find(t => t.id === selectedTextId)?.backgroundColor === "transparent" ? "#000000" : (texts.find(t => t.id === selectedTextId)?.backgroundColor || "#000000")} 
                     onChange={e => updateSelectedText({ backgroundColor: e.target.value })} 
                     className="w-full h-[28px] rounded p-0 border-0 cursor-pointer" 
                     title="Background Color"
                   />
                 </div>
                 <div className="flex flex-col gap-1 flex-1">
                   <span className="text-[8px] font-bold uppercase text-zinc-500">Action</span>
                   <button onClick={deleteSelectedText} className="w-full h-[28px] bg-rose-500/20 text-rose-500 rounded text-[9px] font-bold uppercase hover:bg-rose-500/30 transition-colors">Delete</button>
                 </div>
               </div>
               <div className="flex gap-2">
                 <select 
                   value={texts.find(t => t.id === selectedTextId)?.fontFamily || "Inter, sans-serif"}
                   onChange={e => updateSelectedText({ fontFamily: e.target.value })}
                   className="flex-1 bg-black/20 rounded-md p-1.5 text-[10px]"
                 >
                   <option value="Inter, sans-serif">Inter</option>
                   <option value="'Space Grotesk', sans-serif">Space Grotesk</option>
                   <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                   <option value="serif">Serif</option>
                 </select>
                 <select 
                   value={texts.find(t => t.id === selectedTextId)?.fontWeight || "bold"}
                   onChange={e => updateSelectedText({ fontWeight: e.target.value })}
                   className="w-20 bg-black/20 rounded-md p-1.5 text-[10px]"
                 >
                   <option value="normal">Normal</option>
                   <option value="bold">Bold</option>
                   <option value="900">Black</option>
                 </select>
                 <button 
                   onClick={() => updateSelectedText({ fontStyle: texts.find(t => t.id === selectedTextId)?.fontStyle === "italic" ? "normal" : "italic" })}
                   className={`p-1.5 rounded-md text-[10px] uppercase font-bold border transition-colors ${texts.find(t => t.id === selectedTextId)?.fontStyle === "italic" ? "bg-white/20 border-white/30" : "bg-black/20 border-white/10"}`}
                 >
                   Italic
                 </button>
               </div>
            </div>
          ) : (
            <p className="text-[10px] text-zinc-500 italic">Click "Add Text" or select a layer on canvas.</p>
          )}
        </div>

        <div className="p-4 mt-auto">
          {originalFile && (
            <div className="mb-4 flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/10 text-[9px] font-mono leading-tight">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Original File</span>
                <span className="font-bold">{formatBytes(originalFile.size)}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-400">
                <span>Est. WebP Output</span>
                <span className="font-bold tracking-wider">{formatBytes(estimatedSize)}</span>
              </div>
            </div>
          )}

          <label className="text-[9px] font-bold uppercase tracking-wide flex justify-between mb-2">
            <span>WebP Quality (Compresion)</span>
            <span>{Math.round(quality * 100)}%</span>
          </label>
          <input type="range" min="0.1" max="1" step="0.1" value={quality} onChange={e => setQuality(Number(e.target.value))} className="w-full accent-emerald-500" />
          
          <button 
            onClick={handleSaveToSanity}
            disabled={!image || isSaving}
            className="w-full mt-4 py-3 bg-brand-purple hover:bg-brand-purple/90 focus:ring-4 focus:ring-brand-purple/30 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : saveSuccess ? <Check size={16} /> : <Save size={16} />}
            {saveSuccess ? 'Saved to CDN!' : 'Save & Compress to WebP'}
          </button>
        </div>
      </aside>

      {/* 2. Canvas Area */}
      <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-zinc-950/20 relative items-center justify-center">
        {!image ? (
          <div className="text-center w-full max-w-sm">
             <div className="border-2 border-dashed border-zinc-700/50 rounded-3xl p-12 hover:bg-white/5 hover:border-brand-purple/50 transition-all cursor-pointer relative group flex flex-col items-center">
                <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center text-zinc-400 group-hover:text-brand-purple group-hover:scale-110 transition-all mb-4">
                  <UploadCloud size={30} />
                </div>
                <h3 className="font-bold text-sm mb-1 uppercase tracking-wider text-white">Import Image source</h3>
                <p className="text-[10px] text-zinc-500 max-w-[200px] leading-relaxed mx-auto">Drop PNG or JPG files here to begin editing and auto-compress to optimal WebP formats.</p>
             </div>
          </div>
        ) : (
          <div className="relative shadow-2xl ring-1 ring-white/10 rounded-lg overflow-hidden max-w-full overflow-x-auto">
             <canvas 
               ref={canvasRef}
               onPointerDown={handlePointerDown}
               onPointerMove={handlePointerMove}
               onPointerUp={handlePointerUp}
               onPointerLeave={handlePointerUp}
               className="cursor-crosshair max-h-[70vh] object-contain block mx-auto bg-checkered"
             />
             <style>{`
               .bg-checkered {
                 background-image: 
                   linear-gradient(45deg, #222 25%, transparent 25%), 
                   linear-gradient(135deg, #222 25%, transparent 25%),
                   linear-gradient(45deg, transparent 75%, #222 75%),
                   linear-gradient(135deg, transparent 75%, #222 75%);
                 background-size: 20px 20px;
                 background-position: 0 0, 10px 0, 10px -10px, 0px 10px;
                 background-color: #111;
               }
             `}</style>
          </div>
        )}

        {image && (
          <button onClick={() => { setImage(null); setOriginalFile(null); }} className="absolute top-6 right-6 p-2 bg-black/40 text-white hover:bg-rose-500 rounded-full transition-colors backdrop-blur-md">
            <X size={16} />
          </button>
        )}
      </div>

    </div>
  );
}
