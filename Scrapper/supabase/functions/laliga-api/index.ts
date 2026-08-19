// Edge Function: laliga-api
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const FANTASY_API = "https://fantasy-api.llt-services.com";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "*" },
    });
  }

  try {
    const url = new URL(req.url);

    // Debug
    if (url.pathname.endsWith("/debug")) {
      return new Response(JSON.stringify({ pathname: url.pathname, search: url.search, fullUrl: req.url, method: req.method }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const marker = "/laliga-api";
    const idx = url.pathname.indexOf(marker);
    const apiPath = idx >= 0 ? url.pathname.slice(idx + marker.length) : url.pathname;
    const targetUrl = `${FANTASY_API}${apiPath}${url.search}`;

    // Replicate old proxy behavior: changeOrigin
    const targetHost = new URL(FANTASY_API).host;

    const headers: Record<string, string> = {
      "Host": targetHost,
      "x-app": "2",
      "x-lang": "es",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "Cache-Control": "no-cache",
    };

    const laligaToken = req.headers.get("x-laliga-token");
    if (laligaToken) headers["Authorization"] = `Bearer ${laligaToken}`;

    const contentType = req.headers.get("Content-Type");
    if (contentType) headers["Content-Type"] = contentType;

    console.log(`[laliga-api] ${req.method} ${targetUrl} token=${laligaToken ? "yes" : "no"}`);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined,
    });

    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") || "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Proxy error", message: String(err) }), {
      status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
