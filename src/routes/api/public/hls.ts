import { createFileRoute } from "@tanstack/react-router";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

const ALLOWED_HOST_SUFFIX = ".fancode.com";

function proxied(target: string) {
  return `/api/public/hls?url=${encodeURIComponent(target)}`;
}

function rewritePlaylist(text: string, baseUrl: string) {
  const base = new URL(baseUrl);
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        // Rewrite URI="..." attributes (keys, media playlists, maps)
        return trimmed.replace(/URI="([^"]+)"/g, (_m, uri: string) => {
          return `URI="${proxied(new URL(uri, base).toString())}"`;
        });
      }
      return proxied(new URL(trimmed, base).toString());
    })
    .join("\n");
}

export const Route = createFileRoute("/api/public/hls")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const target = new URL(request.url).searchParams.get("url");
        if (!target) return new Response("Missing url", { status: 400 });

        let parsed: URL;
        try {
          parsed = new URL(target);
        } catch {
          return new Response("Invalid url", { status: 400 });
        }
        if (
          parsed.protocol !== "https:" ||
          !parsed.hostname.endsWith(ALLOWED_HOST_SUFFIX)
        ) {
          return new Response("Forbidden host", { status: 403 });
        }

        const upstream = await fetch(parsed.toString(), {
          headers: {
            "User-Agent": UA,
            Referer: "https://www.fancode.com/",
            Origin: "https://www.fancode.com",
            Accept: "*/*",
          },
        });

        if (!upstream.ok) {
          return new Response(`Upstream error ${upstream.status}`, {
            status: upstream.status === 403 ? 403 : 502,
            headers: { "access-control-allow-origin": "*" },
          });
        }

        const contentType =
          upstream.headers.get("content-type") ?? "application/octet-stream";
        const isPlaylist =
          parsed.pathname.endsWith(".m3u8") ||
          contentType.includes("mpegurl");

        if (isPlaylist) {
          const body = rewritePlaylist(await upstream.text(), parsed.toString());
          return new Response(body, {
            headers: {
              "content-type": "application/vnd.apple.mpegurl",
              "cache-control": "no-store",
              "access-control-allow-origin": "*",
            },
          });
        }

        return new Response(upstream.body, {
          headers: {
            "content-type": contentType,
            "cache-control": "no-store",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
