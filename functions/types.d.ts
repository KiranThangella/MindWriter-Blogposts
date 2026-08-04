// functions/types.d.ts
//
// Minimal ambient declaration for Cloudflare Pages Functions' PagesFunction
// type, used across this folder (index.ts, [slug].ts, sitemap.xml.ts,
// news-sitemap.xml.ts). Deliberately not pulling in the full
// @cloudflare/workers-types package for this — it redefines several
// globals (fetch, Response, Headers, etc.) that can conflict with the DOM
// lib types the main Vite app already relies on, and this project only
// ever needs this one type from it.
interface PagesFunctionContext<Env = unknown, Params extends string = any> {
  request: Request;
  env: Env;
  params: Record<Params, string | string[]>;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  waitUntil: (promise: Promise<any>) => void;
}

type PagesFunction<Env = unknown, Params extends string = any> = (
  context: PagesFunctionContext<Env, Params>
) => Response | Promise<Response>;
