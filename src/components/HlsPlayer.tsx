import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Settings,
  Loader2,
} from "lucide-react";
import { relayUrl } from "@/lib/stream-token";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [levels, setLevels] = useState<{ height: number; bitrate: number }[]>([]);
  const [level, setLevel] = useState(-1); // -1 = auto
  const [reloadKey, setReloadKey] = useState(0);

  /* All playback goes through the opaque relay — the raw stream URL
     (and its .m3u8 extension) never reaches the browser. */
  const resolved = relayUrl(src);

  /* ---------- stream setup ---------- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setError(null);
    setBuffering(true);
    let destroyed = false;

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(resolved);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (destroyed) return;
        setLevels(
          hls.levels.map((l) => ({ height: l.height, bitrate: l.bitrate })),
        );
        video.play().catch(() => setPlaying(false));
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
        if (hls.autoLevelEnabled) setLevel(-1);
        else setLevel(data.level);
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal && !destroyed) {
          setError(
            "This stream can't be played right now — it may have expired or be unavailable in your region.",
          );
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = resolved;
      video.addEventListener("error", () =>
        setError("This stream can't be played right now."),
      );
      video.play().catch(() => undefined);
    } else {
      setError("Your browser doesn't support HLS playback.");
    }

    return () => {
      destroyed = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src, resolved, reloadKey]);

  /* ---------- media event wiring ---------- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
    };
  }, []);

  /* ---------- controls ---------- */
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const onVolume = useCallback((val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    v.muted = val === 0;
    setVolume(val);
    setMuted(val === 0);
  }, []);

  const pickLevel = useCallback((idx: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = idx; // -1 = auto
    setLevel(idx);
    setSettingsOpen(false);
  }, []);

  const pokeControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setControlsVisible(false);
      setSettingsOpen(false);
    }, 3000);
  }, []);

  useEffect(() => {
    pokeControls();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [pokeControls]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "m") toggleMute();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, toggleMute]);

  const ctrlBtn =
    "grid size-9 place-items-center rounded-lg text-foreground/80 transition-colors hover:bg-foreground/10 hover:text-foreground";

  return (
    <div
      ref={containerRef}
      onMouseMove={pokeControls}
      onMouseLeave={() => playing && setControlsVisible(false)}
      onContextMenu={(e) => e.preventDefault()}
      className="group relative overflow-hidden rounded-2xl border border-border bg-black shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        onClick={togglePlay}
        onContextMenu={(e) => e.preventDefault()}
        className="aspect-video w-full cursor-pointer bg-black"
        aria-label={title}
      />

      {/* top chrome */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4 transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="flex items-center gap-2 rounded-lg border border-border bg-black/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground backdrop-blur-sm">
          <span className="relative flex size-1.5">
            <span className="live-ring absolute size-1.5 rounded-full bg-ember" />
            <span className="relative size-1.5 rounded-full bg-ember" />
          </span>
          {playing ? "Streaming" : buffering ? "Buffering" : "Paused"}
        </span>
        <span className="rounded-md border border-glow/30 bg-black/50 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-glow backdrop-blur-sm">
          NS Player · HLS
        </span>
      </div>

      {/* center spinner */}
      {buffering && !error && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Loader2 className="size-10 animate-spin text-glow" />
        </div>
      )}

      {/* big center play when paused */}
      {!playing && !buffering && !error && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 grid place-items-center"
          aria-label="Play"
        >
          <span className="grid size-20 place-items-center rounded-full border border-glow/40 bg-black/60 text-glow backdrop-blur-md transition-transform hover:scale-110">
            <Play className="ml-1 size-8 fill-current" />
          </span>
        </button>
      )}

      {/* bottom control bar — play/pause, mute, quality only */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-3 pt-10 transition-all duration-300 ${
          controlsVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        <div className="flex items-center gap-1">
          <button className={ctrlBtn} onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
          </button>

          <div className="group/vol flex items-center">
            <button className={ctrlBtn} onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => onVolume(Number(e.target.value))}
              aria-label="Volume"
              className="h-1 w-0 cursor-pointer accent-glow opacity-0 transition-all duration-300 group-hover/vol:w-20 group-hover/vol:opacity-100"
            />
          </div>

          <div className="flex-1" />

          {levels.length > 1 && (
            <div className="relative">
              <button
                className={ctrlBtn}
                onClick={() => setSettingsOpen((o) => !o)}
                aria-label="Quality settings"
              >
                <Settings className="size-4" />
              </button>
              {settingsOpen && (
                <div className="absolute bottom-11 right-0 min-w-32 overflow-hidden rounded-xl border border-border bg-card/95 py-1 shadow-2xl backdrop-blur-md">
                  <p className="px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                    Quality
                  </p>
                  <button
                    onClick={() => pickLevel(-1)}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-left font-mono text-[11px] transition-colors hover:bg-foreground/10 ${
                      level === -1 ? "text-glow" : "text-foreground/80"
                    }`}
                  >
                    Auto {level === -1 && "✓"}
                  </button>
                  {levels.map((l, i) => (
                    <button
                      key={i}
                      onClick={() => pickLevel(i)}
                      className={`flex w-full items-center justify-between px-3 py-1.5 text-left font-mono text-[11px] transition-colors hover:bg-foreground/10 ${
                        level === i ? "text-glow" : "text-foreground/80"
                      }`}
                    >
                      {l.height}p {level === i && "✓"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="absolute inset-0 grid place-items-center bg-black/80 p-6">
          <div className="text-center">
            <p className="mx-auto max-w-sm font-mono text-sm text-ember">{error}</p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-4 rounded-lg border border-glow/40 bg-glow/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-glow transition-colors hover:bg-glow/20"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
