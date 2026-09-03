import { Link } from "@tanstack/react-router";
import { isLive, type FanCodeMatch } from "@/lib/fancode";

export function MatchCard({ match, featured = false }: { match: FanCodeMatch; featured?: boolean }) {
  const live = isLive(match);
  return (
    <Link
      to="/watch/$id"
      params={{ id: match.match_id }}
      className={`group block relative overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-1 ${
        featured
          ? "border-glow/40 bg-glow/[0.06]"
          : "border-border/60 bg-card hover:border-glow/30"
      }`}
    >
      {featured && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-glow/10 to-transparent" />
      )}
      <div className="relative overflow-hidden">
        <img
          src={match.src}
          alt={`${match.team_1} vs ${match.team_2} — ${match.event_name}`}
          loading="lazy"
          className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <span
          className={`absolute left-3 top-3 flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.15em] ${
            live
              ? "bg-ember/90 text-ember-foreground"
              : "bg-black/60 text-foreground/80 border border-border/50"
          }`}
        >
          {live && (
            <span className="relative flex size-1.5">
              <span className="live-ring absolute size-1.5 rounded-full bg-white" />
              <span className="relative size-1.5 rounded-full bg-white" />
            </span>
          )}
          {live ? "Live" : "Upcoming"}
        </span>
        <span className="absolute right-3 top-3 rounded-md bg-black/60 border border-border/50 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-foreground/70">
          {match.event_category}
        </span>
      </div>
      <div className="relative p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {match.event_name}
        </p>
        <h3 className="mt-1.5 font-semibold leading-snug tracking-tight text-foreground line-clamp-2">
          {match.match_name}
        </h3>
        <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
          <span>
            {match.team_1} <span className="text-foreground/30">vs</span> {match.team_2}
          </span>
          <span className="text-glow">{match.startTime}</span>
        </div>
      </div>
    </Link>
  );
}
