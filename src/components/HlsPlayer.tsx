import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  Settings,
  RotateCcw,
  RotateCw,
  Loader2,
} from "lucide-react";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

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
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [levels, setLevels] = useState<{ height: number; bitrate: number }[]>([]);
  const [level, setLevel] = useState(-1); // -1 = auto
  const [live, setLive] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekableStart, setSeekableStart] = useState(0);
  // 0 = direct stream, 1 = server proxy fallback
  const [attempt, setAttempt] = useState(0);

  useEffect(() => setAttempt(0), [src]);

  const resolved =
    attempt === 0 ? src : `/api/public/hls?url=${encodeURIComponent(src)}`;

  /* ---------- stream setup ---------- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setError(null);
    setBuffering(true);
    let failed = false;

    const fail = (msg: string) => {
      if (failed) return;
      failed = true;
      if (attempt === 0) setAttempt(1);
      else setError(msg);
    };

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(resolved);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
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
        if (data.fatal) {
          fail(
            "This stream can't be played right now — it may have expired or be unavailable in your region.",
          );
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = resolved;
      video.addEventListener("error", () =>
        fail("This stream can't be played right now."),
      );
      video.play().catch(() => undefined);
    } else {
      setError("Your browser doesn't support HLS playback.");
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src, resolved, attempt]);

  /* ---------- media event wiring ---------- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onTime = () => {
      setPosition(video.currentTime);
      const seekable = video.seekable;
      if (seekable.length > 0) {
        const start = seekable.start(0);
        const end = seekable.end(seekable.length - 1);
        setSeekableStart(start);
        setDuration(end - start);
        setLive(end - video.currentTime < 12);
      }
    };
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("timeupdate", onTime);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("timeupdate", onTime);
    };
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /* ---------- controls ---------- */
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
  }, []);

  const skip = useCallback((delta: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.max(0, v.currentTime + delta);
  }, []);

  const goLive = useCallback(() => {
    const v = videoRef.current;
    if (v && v.seekable.length > 0)
      v.currentTime = v.seekable.end(v.seekable.length - 1);
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

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else containerRef.current?.requestFullscreen().catch(() => undefined);
  }, []);

  const togglePip = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (document.pictureInPictureElement)
      document.exitPictureInPicture().catch(() => undefined);
    else v.requestPictureInPicture().catch(() => undefined);
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
      } else if (e.key === "f") toggleFullscreen();
      else if (e.key === "m") toggleMute();
      else if (e.key === "ArrowRight") skip(10);
      else if (e.key === "ArrowLeft") skip(-10);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, toggleFullscreen, toggleMute, skip]);

  const progress = duration > 0 ? ((position - seekableStart) / duration) * 100 : 0;

  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    v.currentTime = seekableStart + ratio * duration;
  };

  const ctrlBtn =
    "grid size-9 place-items-center rounded-lg text-foreground/80 transition-colors hover:bg-foreground/10 hover:text-foreground";

  return (
    <div
      ref={containerRef}
      onMouseMove={pokeControls}
      onMouseLeave={() => playing && setControlsVisible(false)}
      className="group relative overflow-hidden rounded-2xl border border-border bg-black shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
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

      {/* bottom control bar */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-3 pt-10 transition-all duration-300 ${
          controlsVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        }`}
      >
        {/* seek bar */}
        <div
          onClick={onSeek}
          className="group/bar relative mb-3 h-1.5 w-full cursor-pointer rounded-full bg-foreground/15"
        >
          <div
            className="relative h-full rounded-full bg-gradient-to-r from-glow to-glow/60"
            style={{ width: `${progress}%` }}
          >
            <span className="absolute -right-1.5 top-1/2 size-3 -translate-y-1/2 rounded-full bg-glow opacity-0 shadow-[0_0_10px_var(--glow)] transition-opacity group-hover/bar:opacity-100" />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className={ctrlBtn} onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
          </button>
          <button className={ctrlBtn} onClick={() => skip(-10)} aria-label="Back 10 seconds">
            <RotateCcw className="size-4" />
          </button>
          <button className={ctrlBtn} onClick={() => skip(10)} aria-label="Forward 10 seconds">
            <RotateCw className="size-4" />
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

          <span className="ml-2 font-mono text-[11px] tabular-nums text-foreground/70">
            {formatTime(position - seekableStart)} / {formatTime(duration)}
          </span>

          <button
            onClick={goLive}
            className={`ml-3 flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors ${
              live
                ? "bg-ember text-ember-foreground"
                : "border border-border text-muted-foreground hover:border-ember/50 hover:text-foreground"
            }`}
          >
            <span className={`size-1.5 rounded-full ${live ? "bg-ember-foreground" : "bg-ember"}`} />
            Live
          </button>

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

          <button className={ctrlBtn} onClick={togglePip} aria-label="Picture in picture">
            <PictureInPicture2 className="size-4" />
          </button>
          <button className={ctrlBtn} onClick={toggleFullscreen} aria-label="Fullscreen">
            {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="absolute inset-0 grid place-items-center bg-black/80 p-6">
          <div className="text-center">
            <p className="mx-auto max-w-sm font-mono text-sm text-ember">{error}</p>
            <button
              onClick={() => setAttempt(1)}
              className="mt-4 rounded-lg border border-glow/40 bg-glow/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-glow transition-colors hover:bg-glow/20"
            >
              Retry via relay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
