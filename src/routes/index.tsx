import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchFeed, isLive, type FanCodeMatch } from "@/lib/fancode";
import { MatchCard } from "@/components/MatchCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FANCAST — Live Sports Streams" },
      {
        name: "description",
        content:
          "Watch live FanCode sports events — cricket, football and more — streamed in the browser with an HLS network player.",
      },
      { property: "og:title", content: "FANCAST — Live Sports Streams" },
      {
        property: "og:description",
        content:
          "Watch live FanCode sports events in the browser with a built-in HLS network player.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["fancode-feed"],
      queryFn: fetchFeed,
    }),
  component: Home,
});

function Home() {
  const { data } = useQuery({ queryKey: ["fancode-feed"], queryFn: fetchFeed, refetchInterval: 60_000 });
  const [category, setCategory] = useState("All");
  const matches = data?.matches ?? [];
  const live = matches.filter(isLive);
  const categories = ["All", ...Array.from(new Set(matches.map((m) => m.event_category)))];
  const filtered = category === "All" ? matches : matches.filter((m) => m.event_category === category);
  const hero = live[0] ?? matches[0];

  return (
    <div className="min-h-screen bg-background text-foreground font-display antialiased selection:bg-glow/30 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-32 size-[420px] rounded-full bg-glow/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 size-[380px] rounded-full bg-ember/10 blur-3xl" />

      {/* NAV */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-8 py-6 border-b border-border/60">
        <Link to="/" className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gradient-to-br from-glow/80 to-glow/10 grid place-items-center">
            <span className="text-ember text-xs font-bold">◉</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">FANCAST</span>
          <span className="ml-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground hidden sm:inline">
            Live Events
          </span>
        </Link>
        <span className="flex items-center gap-2 rounded-full border border-ember/40 bg-ember/10 px-3 py-1.5">
          <span className="relative flex size-2">
            <span className="live-ring absolute inline-flex size-2 rounded-full bg-ember" />
            <span className="relative inline-flex size-2 rounded-full bg-ember" />
          </span>
          <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-ember">
            {live.length} On Air
          </span>
        </span>
      </header>

      <main className="relative z-10 px-6 sm:px-8 pt-10 pb-16 max-w-[1400px] mx-auto">
        {/* HERO */}
        {hero && (
          <section className="fadeup grid lg:grid-cols-[1.55fr_1fr] gap-8">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-glow mb-3 flex items-center gap-2">
                <span className="text-ember">●</span> Featured · {hero.event_name}
              </div>
              <Link
                to="/watch/$id"
                params={{ id: hero.match_id }}
                className="group block relative rounded-2xl overflow-hidden border border-border shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
              >
                <img
                  src={hero.src}
                  alt={`${hero.team_1} vs ${hero.team_2} — ${hero.event_name}`}
                  className="w-full aspect-video object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute inset-0 grid place-items-center">
                  <span className="flex size-16 items-center justify-center rounded-full bg-foreground/90 text-background text-2xl pl-1 transition-colors group-hover:bg-glow">
                    ▶
                  </span>
                </div>
                {isLive(hero) && (
                  <span className="absolute top-4 left-4 flex items-center gap-2 rounded-lg bg-ember px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-ember-foreground">
                    <span className="relative flex size-1.5">
                      <span className="live-ring absolute size-1.5 rounded-full bg-white" />
                      <span className="relative size-1.5 rounded-full bg-white" />
                    </span>
                    Live
                  </span>
                )}
                <div className="absolute bottom-0 inset-x-0 p-6">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-glow mb-2">
                    {hero.event_category} · {hero.event_name}
                  </p>
                  <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance text-white">
                    {hero.team_1} <span className="text-white/40">vs</span> {hero.team_2}
                  </h1>
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-white/60">
                    Starts {hero.startTime}
                  </p>
                </div>
              </Link>
            </div>

            {/* LIVE SIDEBAR */}
            <aside className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/70">
                  Live Now
                </h2>
                <span className="font-mono text-[10px] text-muted-foreground">fancode.json</span>
              </div>
              {live.slice(0, 5).map((m) => (
                <LiveRow key={m.match_id} match={m} active={m.match_id === hero.match_id} />
              ))}
              {live.length === 0 && (
                <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                  Nothing live right now — check the schedule below.
                </p>
              )}
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  Feed Pulse
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xl font-bold tabular-nums text-glow">{live.length}</p>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Live</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold tabular-nums">{categories.length - 1}</p>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Sports</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold tabular-nums">{matches.length}</p>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Events</p>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        )}

        {/* FILTER + GRID */}
        <section className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-balance">All Events</h2>
            <div className="flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-[0.15em]">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-4 py-2 transition-colors ${
                    category === c
                      ? "bg-glow text-glow-foreground"
                      : "border border-border text-muted-foreground hover:border-glow/50 hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((m, i) => (
              <div key={m.match_id} className="fadeup" style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}>
                <MatchCard match={m} />
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-muted-foreground text-sm">No events in this category right now.</p>
          )}
        </section>

        <footer className="mt-16 pt-8 border-t border-border flex flex-wrap items-center justify-between gap-4">
          <span className="font-semibold tracking-tight">FANCAST</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Feed updated {data?.["last update time"] ?? "—"} · HLS playback via hls.js
          </span>
        </footer>
      </main>
    </div>
  );
}

function LiveRow({ match, active }: { match: FanCodeMatch; active: boolean }) {
  return (
    <Link
      to="/watch/$id"
      params={{ id: match.match_id }}
      className={`block rounded-xl border p-4 relative overflow-hidden transition-colors ${
        active
          ? "border-glow/40 bg-glow/[0.06]"
          : "border-border bg-card hover:border-foreground/20"
      }`}
    >
      {active && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-glow/10 to-transparent" />
      )}
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-glow">
            <span className="relative flex size-1.5">
              <span className="live-ring absolute size-1.5 rounded-full bg-glow" />
              <span className="relative size-1.5 rounded-full bg-glow" />
            </span>
            Streaming
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">{match.event_category}</span>
        </div>
        <p className="mt-2 font-semibold">
          {match.team_1} vs {match.team_2}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{match.event_name}</p>
      </div>
    </Link>
  );
}
