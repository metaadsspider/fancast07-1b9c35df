export const FEED_URL =
  "https://raw.githubusercontent.com/drmlive/fancode-live-events/main/fancode.json";

export interface FanCodeMatch {
  event_category: string;
  match_id: string;
  title: string;
  match_name: string;
  event_name: string;
  src: string;
  team_1: string;
  team_2: string;
  status: string;
  startTime: string;
  "user-agent"?: string;
  dai_url?: string;
  adfree_url?: string;
}

export interface FanCodeFeed {
  name: string;
  telegram: string;
  "last update time": string;
  matches: FanCodeMatch[];
}

export function streamUrl(m: FanCodeMatch): string | undefined {
  return m.adfree_url || m.dai_url;
}

export function isLive(m: FanCodeMatch): boolean {
  return m.status?.toUpperCase() === "LIVE";
}

export async function fetchFeed(): Promise<FanCodeFeed> {
  const res = await fetch(FEED_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Feed request failed (${res.status})`);
  return res.json();
}
