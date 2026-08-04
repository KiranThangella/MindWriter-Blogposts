// Simple utility using browser IndexedDB for durable local media storage of original and WebP compressed images.
// This allows storage capacity beyond the 5MB browser localStorage limit and maintains session-durable data URLs.

export interface LocalAsset {
  id: string;
  name: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // percentage saved, e.g., 65.5
  mimeType: string;
  dataUrl: string; // base64 encoded string
  altText?: string;
  createdAt: string;
}

const DB_NAME = "LocalMediaDB";
const STORE_NAME = "mediaAssets";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open local browser IndexedDB"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

// Convert a File to Base64 String
export function fileToBase64(file: Blob | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert file to base64 string."));
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Convert Image File to WebP and compress
export interface CompressionResult {
  blob: Blob;
  base64: string;
  originalSize: number;
  compressedSize: number;
  ratio: number; // savings percentage
}

export function convertToWebP(file: File, quality = 0.82): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not initialize canvas context for WebP conversion"));
        return;
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            reject(new Error("WebP conversion failed"));
            return;
          }

          try {
            const base64 = await fileToBase64(blob);
            const originalSize = file.size;
            const compressedSize = blob.size;
            const ratio = originalSize > 0 
              ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
              : 0;

            resolve({
              blob,
              base64,
              originalSize,
              compressedSize,
              ratio
            });
          } catch (err) {
            reject(err);
          }
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to read image for WebP compression. Make sure the file is a valid image."));
    };

    img.src = objectUrl;
  });
}

// Save local asset
export async function saveLocalAsset(asset: Omit<LocalAsset, "createdAt">): Promise<LocalAsset> {
  const db = await openDB();
  const fullAsset: LocalAsset = {
    ...asset,
    createdAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(fullAsset);

    request.onsuccess = () => {
      resolve(fullAsset);
    };

    request.onerror = () => {
      reject(new Error("Failed to save asset to browser IndexedDB storage."));
    };
  });
}

// Retrieve all local assets
export async function getLocalAssets(): Promise<LocalAsset[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort newest first
      const assets = request.result as LocalAsset[];
      assets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(assets);
    };

    request.onerror = () => {
      reject(new Error("Failed to load local assets from browser storage."));
    };
  });
}

// Delete local asset
export async function deleteLocalAsset(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error("Failed to delete local asset."));
    };
  });
}
