import { useState, useEffect, DragEvent, useMemo } from "react";
import { 
  UploadCloud, Search, Image as ImageIcon, Copy, Check, Loader2, Sparkles, 
  Settings, CheckCircle, ExternalLink, FileText, ArrowLeft, RefreshCw, X, AlertCircle, Trash2
} from "lucide-react";
import { 
  LocalAsset, convertToWebP, saveLocalAsset, getLocalAssets, deleteLocalAsset 
} from "../../lib/localMediaStorage";
import { safeFetchJson } from "../../lib/api";

interface MediaAsset {
  _id: string;
  url: string;
  originalFilename?: string;
  size?: number;
  mimeType?: string;
  _createdAt?: string;
  metadata?: {
    dimensions?: {
      width: number;
      height: number;
    }
  }
}

interface MediaLibraryProps {
  sanityProjectId: string;
  sanityWriteToken: string;
  sanityDataset: string;
  isLightMode?: boolean;
  onSelectImage: (url: string, altText?: string, caption?: string) => void;
  setActiveView: (view: "EDITOR" | "MANAGE" | "GENERATOR" | "SEO" | "MEDIA") => void;
  selectMode?: "featured" | "content";
  // Current article's SEO focus keyword, passed through to the alt-text
  // generator so it can be worked into the description when it genuinely fits.
  focusKeyword?: string;
}

export function MediaLibrary({
  sanityProjectId,
  sanityWriteToken,
  sanityDataset,
  isLightMode,
  onSelectImage,
  setActiveView,
  selectMode = "featured",
  focusKeyword
}: MediaLibraryProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [localAssets, setLocalAssets] = useState<LocalAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);
  const [copiedHtmlId, setCopiedHtmlId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"ALL" | "WITH_ALT" | "MISSING_ALT" | "PNG" | "JPG_WEBP">("ALL");

  // Alt Text, Caption & Description Management
  const [altTextMap, setAltTextMap] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("SANITY_ALT_TEXT_CACHE");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [captionMap, setCaptionMap] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("SANITY_CAPTION_CACHE");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [descriptionMap, setDescriptionMap] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("SANITY_DESCRIPTION_CACHE");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeAltText, setActiveAltText] = useState("");
  const [activeCaption, setActiveCaption] = useState("");
  const [activeDescription, setActiveDescription] = useState("");
  const [isGeneratingAlt, setIsGeneratingAlt] = useState(false);

  // Dimension & Compression specifications State
  const [desiredDimensions, setDesiredDimensions] = useState("original"); // "original", "1920x1080", "1200x630", "800x600", "500x500", "600x800", "320x480", "custom"
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const [compressionQuality, setCompressionQuality] = useState(0.85); // 0.1 to 1.0
  const [isProcessingAndSaving, setIsProcessingAndSaving] = useState(false);

  // New features
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Custom dialogs/notifications to bypass iframe console/alert locks
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setNotification({ type, message });
    // Auto collapse after 10s
    setTimeout(() => {
      setNotification(prev => prev?.message === message ? null : prev);
    }, 10000);
  };


  const handleDeleteAsset = async (assetId: string, bypassConfirm = false) => {
    const isLocal = assetId?.startsWith("local-");

    if (!isLocal && (!sanityProjectId || !sanityWriteToken)) {
      showToast("error", "Sanity Configuration missing in local state.");
      return;
    }
    
    if (!bypassConfirm) {
      setDeleteConfirmId(assetId);
      return;
    }
    
    setIsDeleting(true);
    setDeleteConfirmId(null);
    try {
      if (isLocal) {
        await deleteLocalAsset(assetId);
        await fetchLocalAssets();
        if (selectedAsset?._id === assetId) setSelectedAsset(null);
        showToast("success", "Success: Image has been deleted permanently from local browser cache.");
      } else {
        const data = await safeFetchJson("/api/articles/delete-asset", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // Optional overrides — backend falls back to its server-side
            // saved Sanity config (Settings tab) when these are undefined.
            projectId: sanityProjectId || undefined,
            dataset: sanityDataset || undefined,
            token: sanityWriteToken || undefined,
            assetId: assetId
          })
        });
        
        if (data.success) {
          setAssets(prev => prev.filter(a => a._id !== assetId));
          if (selectedAsset?._id === assetId) setSelectedAsset(null);
          showToast("success", "Success: Image has been deleted permanently from Sanity CDN.");
        } else {
          showToast("error", data.error || "Failed to delete asset from Sanity. Note: If the image is currently referenced in an article, you must remove it from that article before deleting it to preserve system integrity.");
        }
      }
    } catch (err: any) {
      console.error("Delete error", err);
      showToast("error", err.message || "Error occurred while deleting asset.");
    } finally {
      setIsDeleting(false);
    }
  };

  const saveCaption = (idOrUrl: string, text: string) => {
    const updated = { ...captionMap, [idOrUrl]: text };
    setCaptionMap(updated);
    localStorage.setItem("SANITY_CAPTION_CACHE", JSON.stringify(updated));
  };

  const saveDescription = (idOrUrl: string, text: string) => {
    const updated = { ...descriptionMap, [idOrUrl]: text };
    setDescriptionMap(updated);
    localStorage.setItem("SANITY_DESCRIPTION_CACHE", JSON.stringify(updated));
  };

  const processAndSaveAsset = async (asset: MediaAsset, actionType: 'save' | 'download') => {
    setIsProcessingAndSaving(true);
    try {
      // 1. Load the image with crossOrigin
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = asset.url;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = (err) => reject(new Error("Failed to load image for processing (CORS or connection issue). Please verify Sanity URL."));
      });

      // 2. Determine target dimensions
      let targetWidth = img.naturalWidth;
      let targetHeight = img.naturalHeight;

      if (desiredDimensions !== "original") {
        if (desiredDimensions === "custom") {
          const w = parseInt(customWidth, 10);
          const h = parseInt(customHeight, 10);
          if (!isNaN(w) && w > 0) targetWidth = w;
          else {
            showToast("error", "Please enter a valid numeric Custom Width.");
            setIsProcessingAndSaving(false);
            return;
          }
          if (!isNaN(h) && h > 0) targetHeight = h;
          else {
            showToast("error", "Please enter a valid numeric Custom Height.");
            setIsProcessingAndSaving(false);
            return;
          }
        } else {
          const [wStr, hStr] = desiredDimensions.split("x");
          targetWidth = parseInt(wStr, 10);
          targetHeight = parseInt(hStr, 10);
        }
      }

      // 3. Setup canvas
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not get 2D context for canvas.");
      }

      // Draw image (handles resizing)
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // 4. Convert to WebP blob
      const mimeType = "image/webp";
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Failed to generate WebP compressed blob."));
        }, mimeType, compressionQuality);
      });

      if (actionType === 'download') {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const originalName = (asset.originalFilename || "image").replace(/\-[a-zA-Z0-9]+$/, "").replace(/\.[^/.]+$/, "");
        a.download = `${originalName}_${targetWidth}x${targetHeight}.webp`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        if (!sanityProjectId || !sanityWriteToken) {
          showToast("error", "To save this optimized asset to the Sanity Cloud CDN, please configure your Sanity Project ID and Write Token in Settings first.");
          setIsProcessingAndSaving(false);
          return;
        }
        const originalName = (asset.originalFilename || "image").replace(/\-[a-zA-Z0-9]+$/, "").replace(/\.[^/.]+$/, "");
        const fileName = `${originalName}_res_comp_${targetWidth}x${targetHeight}.webp`;
        const file = new File([blob], fileName, { type: mimeType });

        const formData = new FormData();
        formData.append("file", file);
        if (sanityProjectId) formData.append("projectId", sanityProjectId);
        if (sanityDataset) formData.append("dataset", sanityDataset);
        if (sanityWriteToken) formData.append("token", sanityWriteToken);

        const data = await safeFetchJson("/api/articles/upload-asset", {
          method: "POST",
          body: formData
        });
        if (data.success) {
          // Sync our metadata/maps for the new asset too!
          if (activeAltText) {
            saveAltText(data.assetId, activeAltText);
            saveAltText(data.url, activeAltText);
          }
          if (activeCaption) {
            saveCaption(data.assetId, activeCaption);
            saveCaption(data.url, activeCaption);
          }
          if (activeDescription) {
            saveDescription(data.assetId, activeDescription);
            saveDescription(data.url, activeDescription);
          }

          showToast("success", "Successfully resized, compressed, and saved the modified image directly to your Media Library CDN!");
          fetchAssets();
          
          if (data.url) {
            setSelectedAsset({
              _id: data.assetId,
              url: data.url,
              originalFilename: fileName,
              size: file.size,
              mimeType: mimeType,
              metadata: {
                dimensions: {
                  width: targetWidth,
                  height: targetHeight
                }
              }
            });
          }
        } else {
          showToast("error", data.error || "Failed to save the compressed image to Sanity CDN.");
        }
      }
    } catch (err: any) {
      console.error("Processing error:", err);
      showToast("error", `Could not process image: ${err.message}`);
    } finally {
      setIsProcessingAndSaving(false);
    }
  };

  // Bulk Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<Array<{
    id: string;
    name: string;
    size: number;
    progress: 'idle' | 'uploading' | 'generating' | 'success' | 'failed';
    error?: string;
    url?: string;
    altText?: string;
    compressedSize?: number;
    ratio?: number;
    statusText?: string;
  }>>([]);

  // Fetch local assets from browser IndexedDB
  const fetchLocalAssets = async () => {
    try {
      const locals = await getLocalAssets();
      setLocalAssets(locals);
    } catch (err) {
      console.error("Failed to load browser local media assets:", err);
    }
  };

  // Fetch assets from Sanity and Local Storage
  const fetchAssets = async () => {
    await fetchLocalAssets();

    if (!sanityProjectId || !sanityWriteToken) {
      setError("Sanity Project ID & Token must be configured in settings to access cloud files. Showing local browser cache images.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await safeFetchJson("/api/articles/list-assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          // Optional overrides — backend falls back to its server-side
          // saved Sanity config (Settings tab) when these are undefined.
          projectId: sanityProjectId || undefined,
          token: sanityWriteToken || undefined,
          dataset: sanityDataset || undefined
        })
      });
      if (data.success) {
        setAssets(data.assets || []);
      } else {
        setError(data.error || "Failed to load media assets.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching media.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [sanityProjectId, sanityWriteToken, sanityDataset]);

  // Sync Alt Texts to localStorage whenever changed
  const saveAltText = (idOrUrl: string, text: string) => {
    const updated = { ...altTextMap, [idOrUrl]: text };
    setAltTextMap(updated);
    localStorage.setItem("SANITY_ALT_TEXT_CACHE", JSON.stringify(updated));
  };

  // Sync selected asset's active properties (Alt Text, Caption, Description)
  useEffect(() => {
    if (selectedAsset) {
      const cachedAlt = altTextMap[selectedAsset._id] || altTextMap[selectedAsset.url] || "";
      setActiveAltText(cachedAlt);

      const cachedCap = captionMap[selectedAsset._id] || captionMap[selectedAsset.url] || "";
      setActiveCaption(cachedCap);

      const cachedDesc = descriptionMap[selectedAsset._id] || descriptionMap[selectedAsset.url] || "";
      setActiveDescription(cachedDesc);
    } else {
      setActiveAltText("");
      setActiveCaption("");
      setActiveDescription("");
    }
  }, [selectedAsset, altTextMap, captionMap, descriptionMap]);

  // Generate Alt Text (+ an accurate, image-specific caption) with Gemini
  const handleGenerateAltText = async (asset: MediaAsset) => {
    setIsGeneratingAlt(true);
    try {
      const data = await safeFetchJson("/api/articles/generate-alt-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: asset.url, keyword: focusKeyword || "" })
      });
      if (data.success && data.altText) {
        saveAltText(asset._id, data.altText);
        saveAltText(asset.url, data.altText);
        setActiveAltText(data.altText);
        // Only auto-fill the caption if the user hasn't already typed one,
        // so this never silently overwrites a manually-written caption.
        const existingCaption = (captionMap[asset._id] || captionMap[asset.url] || "").trim();
        if (!existingCaption && data.caption) {
          saveCaption(asset._id, data.caption);
          saveCaption(asset.url, data.caption);
          setActiveCaption(data.caption);
        }
      } else {
        showToast("error", data.error || "Could not generate alt-text for this image.");
      }
    } catch (err: any) {
      showToast("error", err.message || "Error generating alt-text.");
    } finally {
      setIsGeneratingAlt(false);
    }
  };

  // Upload single file handler for bulk uploads
  const uploadFile = async (idx: number, file: File) => {
    setUploadQueue(prev => prev.map((item, i) => i === idx ? { 
      ...item, 
      progress: 'uploading',
      statusText: 'Saving locally & compressing to WebP...' 
    } : item));

    try {
      // 1. Convert to WebP and Compress
      const webpResult = await convertToWebP(file);
      
      // 2. Save WebP compressed image to Local browser storage (IndexedDB)
      const localAssetId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      await saveLocalAsset({
        id: localAssetId,
        name: file.name.replace(/\.[^/.]+$/, "") + ".webp",
        originalSize: file.size,
        compressedSize: webpResult.compressedSize,
        compressionRatio: webpResult.ratio,
        mimeType: "image/webp",
        dataUrl: webpResult.base64
      });

      // Update progress item with compression ratio
      setUploadQueue(prev => prev.map((item, i) => i === idx ? { 
        ...item, 
        compressedSize: webpResult.compressedSize,
        ratio: webpResult.ratio,
        statusText: `Local Compress Saved: ${webpResult.ratio}% space saved!` 
      } : item));

      // Refresh local assets list immediately
      await fetchLocalAssets();

      // 3. Always attempt Sanity upload via the backend. The backend uses
      //    its own server-side saved config (Settings tab -> Save to
      //    Server) when this browser has no localStorage values, so this
      //    is no longer gated on local credentials being present.
      {
        setUploadQueue(prev => prev.map((item, i) => i === idx ? { 
          ...item, 
          statusText: 'Syncing to Sanity CDN cloud storage...' 
        } : item));

        const compressedFile = new File([webpResult.blob], `${file.name.replace(/\.[^/.]+$/, "")}.webp`, { type: "image/webp" });

        const formData = new FormData();
        formData.append("file", compressedFile);
        if (sanityProjectId) formData.append("projectId", sanityProjectId);
        if (sanityDataset) formData.append("dataset", sanityDataset);
        if (sanityWriteToken) formData.append("token", sanityWriteToken);
        if (focusKeyword) formData.append("keyword", focusKeyword);

        const data = await safeFetchJson("/api/articles/upload-asset", {
          method: "POST",
          body: formData
        });

        if (data.success) {
          if (data.altText) {
            saveAltText(data.assetId, data.altText);
            saveAltText(data.url, data.altText);
          }
          if (data.caption) {
            saveCaption(data.assetId, data.caption);
            saveCaption(data.url, data.caption);
          }

          setUploadQueue(prev => prev.map((item, i) => i === idx ? { 
            ...item, 
            progress: 'success', 
            url: data.url, 
            statusText: `Compressed by ${webpResult.ratio}% and synced to cloud!`,
            altText: data.altText || "Uploaded asset" 
          } : item));

          // Also pull sanity assets again
          await fetchAssets();
        } else {
          // Fallback to local image URL as success, and notice cloud failed
          setUploadQueue(prev => prev.map((item, i) => i === idx ? { 
            ...item, 
            progress: 'success', 
            url: webpResult.base64,
            statusText: `Saved to local browser cache! (Cloud failed: ${data.error})`,
            altText: "Local Cache Image" 
          } : item));
        }
      }
    } catch (err: any) {
      console.error(err);
      setUploadQueue(prev => prev.map((item, i) => i === idx ? { 
        ...item, 
        progress: 'failed', 
        error: err.message || "Compression fail" 
      } : item));
    }
  };

  // Handle Drag Events
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFiles = (files: FileList) => {
    const validImages = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (validImages.length === 0) {
      showToast("error", "Please upload valid image files only.");
      return;
    }

    const newItems = validImages.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      progress: 'idle' as const
    }));

    setUploadQueue(prev => [...prev, ...newItems]);

    // Triggers uploads asynchronously, keeping tracking of queue indexes
    const startIdx = uploadQueue.length;
    validImages.forEach((file, index) => {
      uploadFile(startIdx + index, file);
    });
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  // Helper formats
  const formatBytes = (bytes: number = 0) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Copy functionalities
  const copyToClipboard = (text: string, id: string, type: 'url' | 'html') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrlId(id);
      setTimeout(() => setCopiedUrlId(null), 2000);
    } else {
      setCopiedHtmlId(id);
      setTimeout(() => setCopiedHtmlId(null), 2000);
    }
  };

  // Merge browser local assets and Sanity CDN cloud assets
  const mergedAssets = useMemo(() => {
    const locals = localAssets.map((la) => ({
      _id: la.id,
      url: la.dataUrl,
      originalFilename: la.name,
      size: la.compressedSize,
      mimeType: la.mimeType,
      _createdAt: la.createdAt,
      isLocal: true,
      originalSize: la.originalSize,
      ratio: la.compressionRatio
    }));
    const cloud = assets.map((sa) => ({
      ...sa,
      isLocal: false
    }));
    return [...locals, ...cloud];
  }, [localAssets, assets]);

  // Filters
  const sortedAndFiltered = mergedAssets.filter(asset => {
    // Search criteria
    const nameMatch = asset.originalFilename?.toLowerCase().includes(searchTerm.toLowerCase());
    const urlMatch = asset.url.toLowerCase().includes(searchTerm.toLowerCase());
    const altText = (altTextMap[asset._id] || altTextMap[asset.url] || "").trim();
    const altMatch = altText.toLowerCase().includes(searchTerm.toLowerCase());
    const passesSearch = !searchTerm || nameMatch || urlMatch || altMatch;

    if (!passesSearch) return false;

    // Category Type criteria
    const fileExtension = asset.originalFilename?.toLowerCase().split('.').pop() || '';
    const hasAlt = altText.length > 0;

    if (filterType === "WITH_ALT") return hasAlt;
    if (filterType === "MISSING_ALT") return !hasAlt;
    if (filterType === "PNG") return fileExtension === 'png' || asset.mimeType?.includes('png');
    if (filterType === "JPG_WEBP") {
      return fileExtension === 'jpg' || fileExtension === 'jpeg' || fileExtension === 'webp' || 
             asset.mimeType?.includes('jpeg') || asset.mimeType?.includes('webp');
    }

    return true; // "ALL"
  });

  const hasConfig = sanityProjectId && sanityWriteToken;

  return (
    <div className={`flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar transition-colors ${isLightMode ? 'bg-slate-50' : 'bg-zinc-950/20'}`}>
      
      {/* Custom Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300">
          <div className={`w-full max-w-md rounded-[2.5rem] border p-8 shadow-2xl space-y-6 ${
            isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-white/5'
          }`}>
            <div className="text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-rose-500/10 text-rose-500 mb-2">
                <AlertCircle size={28} />
              </div>
              <h3 className={`text-lg font-bold font-display ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                Delete Asset Permanently?
              </h3>
              <p className={`text-xs leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>
                This action cannot be undone. Our system will automatically check for references and clear references from related blog posts to preserve integrity, then purge the image from the CDN.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className={`flex-1 py-3 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all ${
                  isLightMode ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10 text-zinc-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAsset(deleteConfirmId, true)}
                className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/10"
              >
                {isDeleting ? <Loader2 size={12} className="animate-spin" /> : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
        
        {/* State Toast Notification */}
        {notification && (
          <div className={`p-4 rounded-2xl flex items-center justify-between border shadow-sm transition-all animate-in fade-in duration-350 ${
            notification.type === "success" 
              ? (isLightMode ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400")
              : notification.type === "error"
              ? (isLightMode ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-rose-500/10 border-rose-500/20 text-rose-400")
              : (isLightMode ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-blue-500/10 border-blue-500/20 text-blue-400")
          }`}>
            <div className="flex items-center gap-3">
              <AlertCircle size={16} />
              <span className="text-xs font-semibold leading-relaxed">{notification.message}</span>
            </div>
            <button 
              onClick={() => setNotification(null)}
              className="p-1 hover:opacity-75 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>
        )}
        
        {/* Header Ribbon */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-800/10 pb-6">
          <div className="space-y-1">
            <h2 className={`text-3xl font-bold tracking-tight font-display ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Media Hub & Asset Library</h2>
            <p className={`text-sm font-medium ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>
              Browse and select previously uploaded CDN images, or bulk-upload new graphics with automatic Gemini-driven alt-text generation.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setActiveView("EDITOR")}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all flex items-center gap-2 shadow-sm ${
                isLightMode 
                  ? 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200' 
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/5'
              }`}
            >
              <ArrowLeft size={12} />
              Return to Editor
            </button>
            <button
              onClick={() => { if (hasConfig) fetchAssets(); }}
              disabled={isLoading || !hasConfig}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all flex items-center gap-2 shadow-sm ${
                isLightMode 
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' 
                  : 'bg-white/10 hover:bg-white/15 text-white'
              } disabled:opacity-40`}
            >
              <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
              Sync Grid
            </button>
          </div>
        </div>

        {!hasConfig ? (
          <div className={`p-8 border border-dashed rounded-3xl text-center space-y-4 ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900/30 border-white/5'}`}>
            <div className="h-12 w-12 rounded-full bg-brand-purple/10 flex items-center justify-center mx-auto text-brand-purple">
              <Settings size={22} className="animate-spin" />
            </div>
            <div className="space-y-1">
              <h4 className={`text-sm font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Sanity Config Required</h4>
              <p className={`text-[11px] max-w-sm mx-auto leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>
                To access storage, bulk upload files, and generate alt texts, please fill and save your **Sanity Project ID** and **Write Token** inside the Settings configuration panel.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Content Column - 8 grid-cells */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Drag and Drop Bulk Box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-[2rem] p-8 transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                  isDragging 
                    ? 'border-brand-purple bg-brand-purple/5 shadow-inner' 
                    : (isLightMode ? 'border-slate-300 bg-white hover:border-slate-400' : 'border-white/10 bg-zinc-900/20 hover:border-white/20')
                }`}
                onClick={() => document.getElementById("bulk-file-input")?.click()}
              >
                <input
                  id="bulk-file-input"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                
                <div className="h-14 w-14 rounded-full bg-brand-purple/10 flex items-center justify-center text-brand-purple mb-4 relative">
                  <UploadCloud size={24} className="relative z-10" />
                  <div className="absolute inset-0 bg-brand-purple/20 rounded-full animate-ping opacity-60" />
                </div>
                
                <h3 className={`text-xs font-bold uppercase tracking-widest ${isLightMode ? 'text-slate-800' : 'text-white'}`}>
                  Bulk Upload Image Pipeline
                </h3>
                <p className={`text-[10px] mt-1.5 max-w-xs leading-relaxed ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>
                  Drag and drop multiple files, click to browse. Images are uploaded to your Sanity.io CDN and automatically scanned by Gemini to generate accessible alt text representations.
                </p>
              </div>

              {/* Uploading Queue Monitor */}
              {uploadQueue.length > 0 && (
                <div className={`p-5 rounded-3xl border ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900/50 border-white/5'}`}>
                  <div className="flex items-center justify-between border-b pb-3 mb-4 border-zinc-800/10">
                    <h4 className={`text-[10px] font-black tracking-wider uppercase ${isLightMode ? 'text-slate-700' : 'text-zinc-400'}`}>Upload Queue Progress</h4>
                    <button 
                      onClick={() => { setUploadQueue([]); fetchAssets(); }}
                      className="text-[9px] font-bold text-brand-purple hover:underline"
                    >
                      Clear & Refresh Library
                    </button>
                  </div>
                  <div className="space-y-3.5 max-h-56 overflow-y-auto custom-scrollbar pr-2">
                    {uploadQueue.map((item, idx) => {
                      const hasSufficientInfo = item.compressedSize !== undefined && item.ratio !== undefined;
                      return (
                        <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-zinc-850 last:border-0">
                          <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                            <ImageIcon size={14} className="text-brand-purple shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className={`text-[10px] font-bold truncate max-w-xs ${isLightMode ? 'text-slate-800' : 'text-zinc-200'}`}>{item.name}</span>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className={`text-[8px] font-semibold opacity-60`}>{formatBytes(item.size)}</span>
                                {hasSufficientInfo && (
                                  <>
                                    <span className="text-[8px] opacity-40">→</span>
                                    <span className="text-[8.5px] font-bold text-emerald-500">{formatBytes(item.compressedSize)}</span>
                                    <span className="text-[7.5px] font-extrabold uppercase text-brand-purple bg-brand-purple/15 border border-brand-purple/20 px-1 py-0.2 rounded-sm tracking-wider">
                                      -{item.ratio}% WEBP
                                    </span>
                                  </>
                                )}
                              </div>
                              {item.statusText && (
                                <span className="text-[7.5px] font-mono text-zinc-500 truncate mt-1">
                                  {item.statusText}
                                </span>
                              )}
                              {item.error && (
                                <span className="text-[7.5px] font-mono text-rose-500 truncate mt-1 font-semibold">
                                  Error: {item.error}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                            {item.progress === 'idle' && (
                              <span className="text-[8px] uppercase tracking-wider font-bold bg-zinc-500/10 text-zinc-400 px-2 py-0.5 rounded">Queued</span>
                            )}
                            {item.progress === 'uploading' && (
                              <div className="flex items-center gap-1.5 text-brand-purple text-[8px] uppercase tracking-wider font-extrabold bg-brand-purple/5 px-2 py-0.5 rounded border border-brand-purple/10">
                                <Loader2 size={10} className="animate-spin" />
                                Processing
                              </div>
                            )}
                            {item.progress === 'success' && (
                              <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-black">
                                <CheckCircle size={10} />
                                Success
                              </div>
                            )}
                            {item.progress === 'failed' && (
                              <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-500 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-black">
                                <AlertCircle size={10} />
                                Failed
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Library Gallery Container */}
              <div className="space-y-4">
                
                {/* Search & Statistics */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:max-w-md">
                      <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isLightMode ? 'text-slate-400' : 'text-zinc-550'}`} size={14} />
                      <input 
                        type="text" 
                        placeholder="Search image filename, URL, or alt text..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full border rounded-2xl pl-10 pr-4 py-3 text-[11px] focus:outline-none transition-all ${
                          isLightMode 
                            ? 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-400' 
                            : 'bg-zinc-900 border-white/5 text-zinc-300 placeholder:text-zinc-600 focus:border-zinc-700'
                        }`}
                      />
                    </div>
                    
                    <div className={`text-[10px] font-semibold whitespace-nowrap ${isLightMode ? 'text-slate-500' : 'text-zinc-500'}`}>
                      Showing <span className={`font-bold ${isLightMode ? 'text-slate-800' : 'text-white'}`}>{sortedAndFiltered.length}</span> of <span className="font-bold">{assets.length}</span> images
                    </div>
                  </div>

                  {/* Filter Tabs / Segmented Control */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className={`text-[9px] font-black tracking-wider uppercase mr-2 ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>Filter Catalog:</span>
                    {[
                      { key: "ALL", label: "All Assets" },
                      { key: "WITH_ALT", label: "Has Alt Text" },
                      { key: "MISSING_ALT", label: "No Alt Text" },
                      { key: "PNG", label: "PNG Images" },
                      { key: "JPG_WEBP", label: "JPG / WebP" }
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setFilterType(tab.key as any)}
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-bold tracking-wide transition-all uppercase ${
                          filterType === tab.key 
                            ? 'bg-brand-purple text-white shadow-md shadow-brand-purple/20' 
                            : (isLightMode 
                                ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' 
                                : 'bg-white/5 hover:bg-white/10 text-zinc-300')
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-3 opacity-40">
                    <Loader2 size={36} className="text-brand-purple animate-spin" />
                    <span className="text-[10px] uppercase font-semibold tracking-widest text-zinc-500">Querying sanity CDN database...</span>
                  </div>
                ) : sortedAndFiltered.length === 0 ? (
                  <div className={`border border-dashed rounded-[2rem] p-16 text-center space-y-4 ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900/20 border-white/5'}`}>
                    <ImageIcon size={38} className={`mx-auto text-zinc-300 opacity-20`} />
                    <div className="space-y-1">
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? 'text-slate-600' : 'text-zinc-500'}`}>No assets discovered</h4>
                      <p className={`text-[10px] max-w-xs mx-auto leading-relaxed ${isLightMode ? 'text-slate-400' : 'text-zinc-550'}`}>
                        {searchTerm ? "No assets matched your search. Try broadening your keywords." : "Upload several files using the pipeline above to begin compiling your CDN asset catalog."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sortedAndFiltered.map((asset) => {
                      const isSelected = selectedAsset?._id === asset._id;
                      const hasAlt = (altTextMap[asset._id] || altTextMap[asset.url] || "").trim().length > 0;
                      
                      return (
                        <div
                          key={asset._id}
                          className={`group aspect-square rounded-2xl overflow-hidden border cursor-pointer relative flex flex-col shadow-sm transition-all duration-300 ${
                            isSelected 
                              ? 'ring-2 ring-brand-purple border-brand-purple scale-[0.98]' 
                              : (isLightMode ? 'bg-white border-slate-200 hover:border-slate-400' : 'bg-zinc-900/30 border-white/5 hover:border-white/20')
                          }`}
                          onClick={() => setSelectedAsset(asset)}
                        >
                          <div className="flex-1 bg-black/5 relative overflow-hidden flex items-center justify-center">
                            <img 
                              src={asset.url} 
                              alt={asset.originalFilename || "Asset"} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            
                            {/* Hover Overlay action for quick copy */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 p-3">
                              {/* Simple Copy URL Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(asset.url, asset._id, 'url');
                                }}
                                className="w-full py-2 px-2 bg-brand-purple hover:bg-brand-purple/95 text-white rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 z-20"
                                title="Copy Image URL"
                              >
                                {copiedUrlId === asset._id ? (
                                  <>
                                    <Check size={11} className="text-white" />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Copied URL!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={11} />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Copy URL</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAsset(asset);
                                }}
                                className="w-full py-1.5 px-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-sm transition-all active:scale-95 flex items-center justify-center gap-1 z-20"
                                title="Inspect Image Specifications"
                              >
                                <Search size={11} />
                                <span className="text-[8px] font-black uppercase tracking-wider">Inspect</span>
                              </button>
                            </div>

                            {/* Flags */}
                            <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                              {(asset as any).isLocal && (
                                <span className="bg-blue-600/95 backdrop-blur-sm px-1.5 py-0.5 rounded text-[7px] text-white font-mono uppercase tracking-widest font-bold">
                                  Local Cache
                                </span>
                              )}
                              {hasAlt ? (
                                <span className="bg-emerald-500/95 backdrop-blur-sm px-1.5 py-0.5 rounded text-[7px] text-white font-mono uppercase tracking-widest font-black flex items-center gap-0.5">
                                  <Sparkles size={7} /> Alt text
                                </span>
                              ) : (
                                <span className="bg-amber-500/95 backdrop-blur-sm px-1.5 py-0.5 rounded text-[7px] text-white font-mono uppercase tracking-widest font-black">
                                  Missing Alt
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className={`p-2.5 flex items-center justify-between gap-2 border-t ${
                            isLightMode ? 'bg-slate-50 border-slate-100 text-slate-700' : 'bg-zinc-900/60 border-white/5 text-zinc-400'
                          }`}>
                            <span className="truncate text-[9px] tracking-wide font-semibold flex-1" title={asset.originalFilename}>
                              {asset.originalFilename || "untitled-asset"}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(asset.url, asset._id, 'url');
                              }}
                              className={`p-1 rounded-lg shrink-0 transition-colors z-20 ${
                                isLightMode ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-white/10 text-zinc-400'
                              }`}
                              title="Quick Copy URL"
                            >
                              {copiedUrlId === asset._id ? (
                                <Check size={11} className="text-emerald-500" />
                              ) : (
                                <Copy size={11} />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Preview Drawer / Details Sidebar - 4 grid-cells */}
            <div className="lg:col-span-4 lg:sticky lg:top-4">
              {selectedAsset ? (
                <div className={`p-6 rounded-[2rem] border space-y-6 shadow-xl animate-in slide-in-from-right-4 duration-500 ${
                  isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900/60 border-white/5 backdrop-blur-md'
                }`}>
                  
                  {/* Title & Dismiss */}
                  <div className="flex items-center justify-between border-b border-zinc-800/10 pb-4">
                    <h3 className={`text-[10px] font-black tracking-widest uppercase ${isLightMode ? 'text-slate-800' : 'text-white'}`}>Asset Inspector</h3>
                    <button 
                      onClick={() => setSelectedAsset(null)}
                      className={`p-1.5 rounded-lg transition-colors ${isLightMode ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/5 text-zinc-400'}`}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Thumbnail Preview Area */}
                  <div className="aspect-video w-full rounded-2xl overflow-hidden border bg-black/10 relative flex items-center justify-center">
                    <img 
                      src={selectedAsset.url} 
                      alt="Inspector Target" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <a 
                      href={selectedAsset.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black text-white p-1.5 rounded-lg backdrop-blur-sm transition-colors"
                      title="Open external image location"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  {/* File Metadata Spec sheet */}
                  <div className="space-y-3.5">
                    <h4 className={`text-[8px] font-black tracking-[0.2em] uppercase ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>Specifications</h4>
                    <div className="grid grid-cols-2 gap-3 font-mono text-[9px]">
                      <div className={`p-2.5 rounded-xl ${isLightMode ? 'bg-slate-50' : 'bg-black/30'}`}>
                        <div className="text-zinc-500 uppercase text-[7px] tracking-widest mb-0.5">Size</div>
                        <span className={`font-bold ${isLightMode ? 'text-slate-800' : 'text-zinc-300'}`}>{formatBytes(selectedAsset.size)}</span>
                      </div>
                      <div className={`p-2.5 rounded-xl ${isLightMode ? 'bg-slate-50' : 'bg-black/30'}`}>
                        <div className="text-zinc-500 uppercase text-[7px] tracking-widest mb-0.5">Dimensions</div>
                        <span className={`font-bold ${isLightMode ? 'text-slate-800' : 'text-zinc-300'}`}>
                          {selectedAsset.metadata?.dimensions 
                            ? `${selectedAsset.metadata.dimensions.width} × ${selectedAsset.metadata.dimensions.height}` 
                            : 'Unspecified px'
                          }
                        </span>
                      </div>
                      <div className={`p-2.5 rounded-xl col-span-2 ${isLightMode ? 'bg-slate-50' : 'bg-black/30'}`}>
                        <div className="text-zinc-500 uppercase text-[7px] tracking-widest mb-0.5">Filename</div>
                        <span className={`font-bold truncate block ${isLightMode ? 'text-slate-800' : 'text-zinc-300'}`} title={selectedAsset.originalFilename}>
                          {selectedAsset.originalFilename || "untitled_artifact"}
                        </span>
                      </div>
                      {(selectedAsset as any).isLocal && (
                        <div className={`p-2.5 rounded-xl col-span-2 ${isLightMode ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                          <div className="uppercase text-[7.5px] tracking-widest font-bold mb-1 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Local WebP Optimization Cache 💾
                          </div>
                          <span className="font-semibold block leading-normal text-[8.5px]">
                            Original size: <span className="underline">{formatBytes((selectedAsset as any).originalSize)}</span>. 
                            Optimized to <span className="underline">{formatBytes(selectedAsset.size)}</span>. 
                            Saved <span className="font-bold text-emerald-500">{(selectedAsset as any).ratio}% of storage space</span>!
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Alt Text Box with Gemini trigger */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-[8px] font-black tracking-[0.2em] uppercase ${isLightMode ? 'text-slate-400' : 'text-zinc-550'}`}>Alternative Text</h4>
                      
                      <button
                        onClick={() => handleGenerateAltText(selectedAsset)}
                        disabled={isGeneratingAlt}
                        className="text-[8px] font-bold text-brand-purple flex items-center gap-1 hover:underline disabled:opacity-40"
                      >
                        {isGeneratingAlt ? (
                          <>
                            <Loader2 size={10} className="animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles size={10} className="text-brand-purple" />
                            Regenerate with AI
                          </>
                        )}
                      </button>
                    </div>

                    <textarea
                      value={activeAltText}
                      onChange={(e) => {
                        setActiveAltText(e.target.value);
                        saveAltText(selectedAsset._id, e.target.value);
                        saveAltText(selectedAsset.url, e.target.value);
                      }}
                      placeholder="Add an image description for visually impaired individuals..."
                      className={`w-full min-h-[50px] border rounded-xl p-3 text-[10px] leading-relaxed resize-none focus:outline-none focus:ring-1 ${
                        isLightMode 
                          ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-400 focus:ring-indigo-400' 
                          : 'bg-black/30 border-white/5 text-zinc-300 focus:border-zinc-700 focus:ring-zinc-700'
                      }`}
                    />
                  </div>

                  {/* Caption box */}
                  <div className="space-y-2 pt-1">
                    <h4 className={`text-[8px] font-black tracking-[0.2em] uppercase ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>Caption (శీర్షిక)</h4>
                    <input
                      type="text"
                      value={activeCaption}
                      onChange={(e) => {
                        setActiveCaption(e.target.value);
                        saveCaption(selectedAsset._id, e.target.value);
                        saveCaption(selectedAsset.url, e.target.value);
                      }}
                      placeholder="Add image caption..."
                      className={`w-full border rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:ring-1 ${
                        isLightMode 
                          ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-400 focus:ring-indigo-400' 
                          : 'bg-black/30 border-white/5 text-zinc-300 focus:border-zinc-700 focus:ring-zinc-700'
                      }`}
                    />
                  </div>

                  {/* Description box */}
                  <div className="space-y-2 pt-1">
                    <h4 className={`text-[8px] font-black tracking-[0.2em] uppercase ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>Description (వివరణ)</h4>
                    <textarea
                      value={activeDescription}
                      onChange={(e) => {
                        setActiveDescription(e.target.value);
                        saveDescription(selectedAsset._id, e.target.value);
                        saveDescription(selectedAsset.url, e.target.value);
                      }}
                      placeholder="Add a detailed description..."
                      className={`w-full min-h-[50px] border rounded-xl p-3 text-[10px] leading-relaxed resize-none focus:outline-none focus:ring-1 ${
                        isLightMode 
                          ? 'bg-slate-50 border-slate-200 text-slate-800' 
                          : 'bg-black/30 border-white/5 text-zinc-300 focus:border-zinc-700 focus:ring-zinc-700'
                      }`}
                    />
                  </div>

                  {/* Resizing and Compression Controls */}
                  <div className={`p-4 rounded-2xl border ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-black/30 border-white/5'} space-y-3`}>
                    <div className="flex items-center justify-between">
                       <h4 className={`text-[8px] font-black tracking-[0.2em] uppercase ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>Resize & Compress WebP</h4>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block font-mono">Output Dimensions</label>
                      <select
                        value={desiredDimensions}
                        onChange={(e) => setDesiredDimensions(e.target.value)}
                        className={`w-full border rounded-xl px-2 py-1.5 text-[10px] focus:outline-none focus:ring-1 ${
                          isLightMode 
                            ? 'bg-white border-slate-200 text-slate-800 focus:ring-indigo-500' 
                            : 'bg-zinc-900 border-white/5 text-zinc-300 focus:ring-zinc-700'
                        }`}
                      >
                        <option value="original">Original Size</option>
                        <option value="1920x1080">Desktop Large (1920 × 1080)</option>
                        <option value="1200x630">Blog Banner (1200 × 630)</option>
                        <option value="800x600">Landscape (800 × 600)</option>
                        <option value="600x800">Portrait (600 × 800)</option>
                        <option value="500x500">Square (500 × 500)</option>
                        <option value="320x480">Mobile Small (320 × 480)</option>
                        <option value="custom">Custom Size...</option>
                      </select>
                    </div>

                    {desiredDimensions === "custom" && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[7px] font-black text-zinc-500 uppercase block mb-0.5">Width (px)</label>
                          <input
                            type="number"
                            value={customWidth}
                            onChange={(e) => setCustomWidth(e.target.value)}
                            placeholder="e.g. 1000"
                            className={`w-full border rounded-xl px-2.5 py-1 text-[10px] ${
                              isLightMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-zinc-900 border-white/5 text-zinc-100'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="text-[7px] font-black text-zinc-500 uppercase block mb-0.5">Height (px)</label>
                          <input
                            type="number"
                            value={customHeight}
                            onChange={(e) => setCustomHeight(e.target.value)}
                            placeholder="e.g. 800"
                            className={`w-full border rounded-xl px-2.5 py-1 text-[10px] ${
                              isLightMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-zinc-900 border-white/5 text-zinc-100'
                            }`}
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                        <span>Quality</span>
                        <span>{Math.round(compressionQuality * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={compressionQuality}
                        onChange={(e) => setCompressionQuality(parseFloat(e.target.value))}
                        className="w-full accent-brand-purple cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Primary Selection and placement CTAs */}
                  <div className="space-y-2.5 pt-4">
                    <button
                      onClick={() => {
                        onSelectImage(selectedAsset.url, activeAltText, activeCaption);
                        setActiveView("EDITOR");
                      }}
                      className="w-full bg-brand-purple hover:bg-brand-purple/90 text-white font-bold py-3.5 rounded-xl text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
                    >
                      <CheckCircle size={13} />
                      {selectMode === "content" ? "Insert into Article" : "Set as Featured Image"}
                    </button>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => copyToClipboard(selectedAsset.url, selectedAsset._id, 'url')}
                        className={`py-2.5 rounded-xl text-[9px] font-bold tracking-wider uppercase transition-all border flex items-center justify-center gap-1.5 ${
                          isLightMode 
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                            : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/5'
                        }`}
                      >
                        {copiedUrlId === selectedAsset._id ? (
                          <>
                            <Check size={11} className="text-emerald-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            Copy URL
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          const htmlFormat = `<img src="${selectedAsset.url}" alt="${activeAltText || selectedAsset.originalFilename || 'Image asset'}" referrerPolicy="no-referrer" />`;
                          copyToClipboard(htmlFormat, selectedAsset._id, 'html');
                        }}
                        className={`py-2.5 rounded-xl text-[9px] font-bold tracking-wider uppercase transition-all border flex items-center justify-center gap-1.5 ${
                          isLightMode 
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
                            : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/5'
                        }`}
                      >
                        {copiedHtmlId === selectedAsset._id ? (
                          <>
                            <Check size={11} className="text-emerald-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <FileText size={11} />
                            Copy for Body
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 mt-2">
                       <button
                         onClick={() => processAndSaveAsset(selectedAsset, 'download')}
                         disabled={isProcessingAndSaving}
                         className={`py-2 rounded-xl text-[9px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
                           isLightMode ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500'
                         } disabled:opacity-50`}
                       >
                         {isProcessingAndSaving ? <Loader2 size={11} className="animate-spin" /> : "Download WebP"}
                       </button>

                       <button
                         onClick={() => processAndSaveAsset(selectedAsset, 'save')}
                         disabled={isProcessingAndSaving}
                         className={`py-2 rounded-xl text-[9px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
                           isLightMode ? 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700' : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500'
                         } disabled:opacity-50`}
                       >
                         {isProcessingAndSaving ? <Loader2 size={11} className="animate-spin" /> : "Save to CDN"}
                       </button>
                    </div>

                    <button
                      onClick={() => handleDeleteAsset(selectedAsset._id)}
                      disabled={isDeleting || isProcessingAndSaving}
                      className={`w-full py-2 rounded-xl text-[9px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
                        isLightMode ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-700' : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500'
                      } disabled:opacity-50`}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Image'}
                    </button>
                  </div>

                </div>
              ) : (
                <div className={`p-8 border rounded-[2rem] border-dashed text-center min-h-[300px] flex flex-col items-center justify-center opacity-40 ${
                  isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900/30 border-white/5'
                }`}>
                  <ImageIcon size={32} className="text-zinc-500 mb-3" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Inspection Node Empty</span>
                  <p className="text-[8px] max-w-[180px] mt-1 text-zinc-600 leading-relaxed font-medium">To inspect specifications, copy locations, and manage alt tags, select an image from the library grid.</p>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
