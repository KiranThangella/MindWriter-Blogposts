import { apiUrl } from '../lib/api';
import imageUrlBuilder from '@sanity/image-url';

// Environment variables configuration (as suggested)
const meta = import.meta as any;
export const envProjectId = (meta.env && meta.env.VITE_SANITY_PROJECT_ID) || '';
export const envDataset = (meta.env && meta.env.VITE_SANITY_DATASET) || 'production';
// The default Sanity CDN image base URL is built automatically
export const defaultSanityAssetBaseUrl = envProjectId ? `https://cdn.sanity.io/images/${envProjectId}/${envDataset}/` : '';

function getSafeItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(key);
    }
  } catch (e) {
    console.warn("Storage access denied for key:", key, e);
  }
  return null;
}

function setSafeItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  } catch (e) {
    console.warn("Storage item write failed for key:", key, e);
  }
}

function removeSafeItem(key: string): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  } catch (e) {
    console.warn("Storage item removal failed for key:", key, e);
  }
}

export function getSanityConfig() {
  const localId = getSafeItem('SANITY_PROJECT_ID');
  const localDataset = getSafeItem('SANITY_DATASET');
  const localAssetBaseUrl = getSafeItem('SANITY_ASSET_BASE_URL');
  
  const projectId = localId || envProjectId;
  const dataset = localDataset || envDataset;
  const assetBaseUrl = localAssetBaseUrl || (meta.env && meta.env.VITE_SANITY_ASSET_BASE_URL) || '';
  
  return {
    projectId,
    dataset,
    assetBaseUrl: assetBaseUrl ? assetBaseUrl.trim() : '',
    isConfigured: !!projectId
  };
}

export function setSanityConfig(projectId: string, dataset: string, assetBaseUrl: string = '') {
  if (typeof window !== 'undefined') {
    if (projectId) {
      setSafeItem('SANITY_PROJECT_ID', projectId);
    } else {
      removeSafeItem('SANITY_PROJECT_ID');
    }
    if (dataset) {
      setSafeItem('SANITY_DATASET', dataset);
    } else {
      removeSafeItem('SANITY_DATASET');
    }
    if (assetBaseUrl) {
      setSafeItem('SANITY_ASSET_BASE_URL', assetBaseUrl);
    } else {
      removeSafeItem('SANITY_ASSET_BASE_URL');
    }
  }
}

export const isSanityConfigured = !!(typeof window !== 'undefined' && (getSafeItem('SANITY_PROJECT_ID') || (import.meta as any).env?.VITE_SANITY_PROJECT_ID));

export function getImageUrlBuilder() {
  const { projectId, dataset } = getSanityConfig();
  if (!projectId) return null;
  return imageUrlBuilder({
    projectId,
    dataset
  });
}

/**
 * Robustly resolves any image path, prepending WordPress or other asset domains
 * for relative paths like /uploads/ or /wp-content/ if configured.
 */
export function resolveAssetUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  
  if (trimmed.startsWith('/') || trimmed.startsWith('wp-content') || trimmed.startsWith('uploads')) {
    const { assetBaseUrl } = getSanityConfig();
    if (assetBaseUrl) {
      const cleanBase = assetBaseUrl.endsWith('/') ? assetBaseUrl.slice(0, -1) : assetBaseUrl;
      const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      return `${cleanBase}${cleanPath}`;
    }
  }
  return trimmed;
}

/**
 * Clean helper to build image URLs from Sanity's image assets using official builder and fallback parses
 */
export function urlForAsset(source: any) {
  if (!source) return '';
  
  // If source is a string URL, use it directly
  if (typeof source === 'string') {
    if (source.startsWith('http') || source.startsWith('/') || source.startsWith('wp-content') || source.startsWith('uploads')) {
      return resolveAssetUrl(source);
    }
    // If it looks like an asset reference ID directly passed
    if (source.includes('-') && !source.includes('/')) {
      const { projectId, dataset } = getSanityConfig();
      if (projectId) {
        return parseAssetRef(source, projectId, dataset);
      }
    }
  }
  
  // If source has custom url property
  if (source.url) return source.url;

  // Try using the official Sanity Image URL builder
  const builder = getImageUrlBuilder();
  if (builder) {
    try {
      // builder.image() gracefully handles complete document, asset objects, string refs, etc.
      const url = builder.image(source).url();
      if (url) return url;
    } catch (e) {
      console.warn("Failed resolving image with imageUrlBuilder, trying fallback:", e);
    }
  }

  // Standard fallback asset extraction
  const assetRef = source.asset?._ref || source._ref || source.asset?._id || source._id;
  if (!assetRef) return '';
  
  const { projectId, dataset } = getSanityConfig();
  return parseAssetRef(assetRef, projectId, dataset);
}

/**
 * Handle different formats of asset references cleanly
 */
function parseAssetRef(ref: string, projectId: string, dataset: string): string {
  try {
    const parts = ref.split('-');
    if (parts.length >= 3) {
      const extension = parts[parts.length - 1];
      const dimensions = parts[parts.length - 2];
      
      const startIndex = parts[0] === 'image' ? 1 : 0;
      const idParts = parts.slice(startIndex, parts.length - 2);
      const id = idParts.join('-');

      if (id && dimensions && extension) {
        return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dimensions}.${extension}`;
      }
    }
  } catch (e) {
    console.warn("Could not parse image asset ref:", ref, e);
  }
  return '';
}

/**
 * Fetch all posts formatted for our UI.
 *
 * WAS: ran a `...` (all-fields) GROQ query directly against Sanity's CDN
 * from the browser, with a client-side timeout racing @sanity/client's own
 * internal retry/backoff. PageSpeed traces showed this chaining into 5
 * sequential requests taking up to ~19s, during which the homepage rendered
 * the hardcoded placeholder posts from src/data.ts instead of real content
 * (see FeaturedStories.tsx / LatestArticles.tsx: `posts.length > 0 ? posts
 * : featuredStories`) — that's what PageSpeed's "Improve image delivery"
 * finding was actually scoring.
 *
 * NOW: a plain fetch to the Cloudflare Worker's /api/posts/list, which does
 * the (much lighter, single coalesce() instead of ~20 dereferences) Sanity
 * query server-side and caches the result in KV with stale-while-revalidate.
 * The worker always has something to serve, so this resolves in low tens of
 * milliseconds on a warm cache instead of multiple seconds.
 */
export async function fetchLivePosts(page = 1, pageSize = 40) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(apiUrl(`/api/posts/list?page=${page}&pageSize=${pageSize}`), { signal: controller.signal });
    if (!res.ok) throw new Error(`posts/list returned ${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.posts)) return null;
    return {
      posts: data.posts.map((post: any) => ({
        ...post,
        image: resolveAssetUrl(post.image) || post.image,
      })),
      hasMore: !!data.hasMore,
      total: typeof data.total === "number" ? data.total : data.posts.length,
      page: data.page || page,
    };
  } catch (error) {
    console.error('Error fetching posts from worker cache:', error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch all categories with automatic count. See fetchLivePosts() above —
 * same move from a direct browser->Sanity call to the worker's cached
 * /api/posts/categories endpoint.
 */
export async function fetchLiveCategories() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(apiUrl('/api/posts/categories'), { signal: controller.signal });
    if (!res.ok) throw new Error(`posts/categories returned ${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.categories)) return null;
    return data.categories;
  } catch (error) {
    console.error('Error fetching categories from worker cache:', error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Robustly parses and extracts a human-readable clean string from any text,
 * localized objects, portable text arrays, or media properties.
 */
export function getCleanCaption(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  
  if (Array.isArray(val)) {
    return val
      .map((item: any) => {
        if (!item) return '';
        if (typeof item === 'string') return item;
        if (item.children && Array.isArray(item.children)) {
          return item.children.map((child: any) => child?.text || '').join('');
        }
        if (item.text && typeof item.text === 'string') return item.text;
        return '';
      })
      .join(' ')
      .trim();
  }
  
  if (typeof val === 'object') {
    if (val.children && Array.isArray(val.children)) {
      return val.children.map((child: any) => child?.text || '').join('').trim();
    }
    const possibleKeys = ['text', 'caption', 'alt', 'title', 'description', 'attribution', 'credit'];
    for (const key of possibleKeys) {
      if (val[key]) {
        const resolved = getCleanCaption(val[key]);
        if (resolved) return resolved;
      }
    }
    // Handle any localized elements or other direct string properties
    for (const key of Object.keys(val)) {
      if (key === '_type' || key === '_key') continue;
      if (val[key] && typeof val[key] === 'string' && val[key].trim()) {
        const strVal = val[key].trim();
        if (!strVal.startsWith('http') && !strVal.startsWith('image-') && strVal.length < 250) {
          return strVal;
        }
      }
    }
  }
  return '';
}
