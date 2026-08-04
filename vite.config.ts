import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // Explicit even though esbuild minification is Vite's default — this
      // guards against the deployed build silently skipping minification if
      // Cloudflare Pages' build command or environment ever differs from a
      // plain local `vite build` (Lighthouse: "Minify JavaScript" flagged
      // ~65 KiB of savings on the deployed bundle that a normal `vite build`
      // would already remove).
      minify: 'esbuild',
      // Ship source maps so production errors are debuggable and Lighthouse
      // can map minified code back to source (Lighthouse: "Missing source
      // maps for large first-party JavaScript"). These are separate .map
      // files fetched only by devtools, not by regular visitors, so they
      // don't add to the payload real users download.
      sourcemap: true,
      rollupOptions: {
        output: {
          // Manual vendor chunking, on top of the React.lazy() route-level
          // splitting already done in App.tsx (admin dashboard, tools
          // pages). Without this, heavy libraries used by only a handful of
          // admin-only components (Tiptap's editor core + extensions,
          // Firebase) still get bundled together with common vendor code,
          // and the browser has to re-download the whole vendor blob on
          // every deploy even when only app code changed. Splitting them
          // out means: (1) they're only fetched at all when the
          // admin-dashboard chunk that imports them is fetched, and (2)
          // each vendor chunk's own browser cache survives independent
          // app-code or other-vendor updates.
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@tiptap')) return 'vendor-tiptap';
              if (id.includes('firebase')) return 'vendor-firebase';
              if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
            }
          },
        },
      },
      // Default is 500kb; raised only so the (now much smaller, post
      // code-splitting) remaining chunks don't spam build warnings for
      // borderline cases. This does not undo the actual splitting above.
      chunkSizeWarningLimit: 700,
    },
  };
});
