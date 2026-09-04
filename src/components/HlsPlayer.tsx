import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export function HlsPlayer({
  src,
  poster,
  title,
}: {
  src: string;
  poster?: string;
  title: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  // 0 = direct stream, 1 = server proxy fallback
  const [attempt, setAttempt] = useState(0);

  useEffect(() => setAttempt(0), [src]);

  const resolved =
    attempt === 0 ? src : `/api/public/hls?url=${encodeURIComponent(src)}`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setError(null);
    let hls: Hls | null = null;
    let failed = false;

    const fail = (msg: string) => {
      if (failed) return;
      failed = true;
      if (attempt === 0) setAttempt(1);
      else setError(msg);
    };

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(resolved);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => setPlaying(false));
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          fail(
            "This stream can't be played right now — it may have expired or be unavailable in your region.",
          );
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = resolved;
      video.addEventListener("error", () => fail("This stream can't be played right now."));
      video.play().catch(() => undefined);
    } else {
      setError("Your browser doesn't support HLS playback.");
    }

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      hls?.destroy();
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [src, resolved, attempt]);


  return (
    <div className="relative rounded-2xl overflow-hidden border border-border bg-gradient-to-b from-card to-background shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]">
      <video
        ref={videoRef}
        poster={poster}
        controls
        playsInline
        className="w-full aspect-video bg-black"
        aria-label={title}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
        <span className="flex items-center gap-2 rounded-lg bg-black/50 backdrop-blur-sm px-3 py-1.5 border border-border font-mono text-[10px] uppercase tracking-[0.15em] text-foreground">
          <span className="relative flex size-1.5">
            <span className="live-ring absolute size-1.5 rounded-full bg-ember" />
            <span className="relative size-1.5 rounded-full bg-ember" />
          </span>
          {playing ? "Streaming" : "Ready"}
        </span>
        <span className="rounded-md bg-black/50 backdrop-blur-sm border border-glow/30 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-glow">
          HLS · Network Stream
        </span>
      </div>
      {error && (
        <div className="absolute inset-0 grid place-items-center bg-black/80 p-6">
          <p className="font-mono text-sm text-ember text-center max-w-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
