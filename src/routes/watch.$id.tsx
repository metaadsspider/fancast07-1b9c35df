import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchFeed, isLive, streamUrl, type FanCodeMatch } from "@/lib/fancode";
import { HlsPlayer } from "@/components/HlsPlayer";
import { MatchCard } from "@/components/MatchCard";

export const Route = createFileRoute("/watch/$id")({
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.match_name} — FANCAST` : "Watch Live — FANCAST" },
      {
        name: "description",
        content: loaderData
          ? `Stream ${loaderData.team_1} vs ${loaderData.team_2} live — ${loaderData.event_name}.`
          : "Stream live sports on FANCAST.",
      },
      {
        property: "og:title",
        content: loaderData ? `${loaderData.match_name} — FANCAST` : "Watch Live — FANCAST",
      },
      {
        property: "og:description",
        content: loaderData
          ? `Stream ${loaderData.team_1} vs ${loaderData.team_2} live — ${loaderData.event_name}.`
          : "Stream live sports on FANCAST.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(loaderData?.src?.startsWith("https://")
        ? [
            { property: "og:image", content: loaderData.src },
            { name: "twitter:image", content: loaderData.src },
          ]
        : []),
    ],
  }),
  loader: async ({ params, context }) => {
    const feed = await context.queryClient.ensureQueryData({
      queryKey: ["fancode-feed"],
      queryFn: fetchFeed,
    });
    const match = feed.matches.find((m) => m.match_id === params.id);
    if (!match) throw notFound();
    return match;
  },
  component: WatchPage,
});

function WatchPage() {
  const match = Route.useLoaderData();
  const { data } = useQuery({ queryKey: ["fancode-feed"], queryFn: fetchFeed });
  const src = streamUrl(match);
  const others = (data?.matches ?? []).filter((m) => m.match_id !== match.match_id && isLive(m)).slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground font-display antialiased relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-32 size-[420px] rounded-full bg-glow/10 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-6 sm:px-8 py-6 border-b border-border/60">
        <Link to="/" className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gradient-to-br from-glow/80 to-glow/10 grid place-items-center">
            <span className="text-ember text-xs font-bold">◉</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">FANCAST</span>
        </Link>
        <Link
          to="/"
          className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-glow transition-colors"
        >
          ← All Events
        </Link>
      </header>

      <main className="relative z-10 px-6 sm:px-8 pt-10 pb-16 max-w-[1200px] mx-auto">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-glow mb-3 flex items-center gap-2">
          {isLive(match) && <span className="text-ember">●</span>}
          {match.status} · {match.event_name}
        </div>

        {src ? (
          <HlsPlayer src={src} poster={match.src} title={match.match_name} />
        ) : (
          <div className="relative rounded-2xl overflow-hidden border border-border">
            <img src={match.src} alt={match.match_name} className="w-full aspect-video object-cover opacity-50" />
            <div className="absolute inset-0 grid place-items-center">
              <p className="font-mono text-sm text-muted-foreground">Stream not available yet — check back soon.</p>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-balance">
              {match.team_1} <span className="text-muted-foreground">vs</span> {match.team_2}
            </h1>
            <p className="text-sm text-muted-foreground font-mono mt-2">
              {match.title} · {match.startTime}
            </p>
          </div>
          <span className="rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            {match.event_category}
          </span>
        </div>

        {others.length > 0 && (
          <section className="mt-14">
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground/70 mb-5">
              Also Live
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {others.map((m) => (
                <MatchCard key={m.match_id} match={m} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
