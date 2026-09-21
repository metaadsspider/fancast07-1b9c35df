/**
 * Stream URL tokenization — keeps real stream URLs (and their extensions)
 * out of the browser. URLs are XOR-obfuscated and base64url-encoded so the
 * player only ever exposes opaque tokens like /api/public/hls?s=8fQ2cA...
 */

const KEY = "fancast-ns-player-2026";

function xorBytes(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(bytes.length);
  let i = 0;
  for (const b of bytes) {
    out[i] = b ^ KEY.charCodeAt(i % KEY.length);
    i++;
  }
  return out;
}

export function encodeStreamUrl(url: string): string {
  const xored = xorBytes(new TextEncoder().encode(url));
  let bin = "";
  for (const b of xored) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeStreamUrl(token: string): string | null {
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(xorBytes(bytes));
  } catch {
    return null;
  }
}

/** Relay URL with an opaque token — no extension, no readable link. */
export function relayUrl(url: string): string {
  return `/api/public/hls?s=${encodeStreamUrl(url)}`;
}
