import { useEffect, useRef, useState } from "react";
import { Music2, Pause, Play, X } from "lucide-react";
const VIDEO_ID = "hghqd1eBTYQ";
type Player = { playVideo: () => void; pauseVideo: () => void; destroy: () => void };
type YouTube = { Player: new (element: HTMLElement, options: Record<string, unknown>) => Player };
declare global {
  interface Window { YT?: YouTube; onYouTubeIframeAPIReady?: () => void }
}
let apiPromise: Promise<YouTube> | undefined;
function loadYouTube() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) apiPromise = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("Music player could not load.")), 15000);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      window.clearTimeout(timeout);
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => { window.clearTimeout(timeout); reject(new Error("Music player could not load.")); };
    document.head.appendChild(script);
  });
  return apiPromise;
}
export function WeddingMusic() {
  const [open, setOpen] = useState(true);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState("Loading your soundtrack...");
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<Player | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let instance: Player | undefined;
    loadYouTube().then((YT) => {
      if (cancelled || !host.current) return;
      const target = document.createElement("div");
      host.current.replaceChildren(target);
      instance = new YT.Player(target, {
        width: "100%", height: "200", videoId: VIDEO_ID,
        host: "https://www.youtube-nocookie.com",
        playerVars: { autoplay: 1, playsinline: 1, controls: 1, origin: window.location.origin },
        events: {
          onReady: (event: { target: Player }) => {
            if (cancelled) return;
            player.current = event.target;
            setReady(true);
            setMessage("Tap play if music does not start automatically.");
            event.target.playVideo();
          },
          onStateChange: (event: { data: number }) => {
            if (cancelled) return;
            setPlaying(event.data === 1);
            if (event.data === 1) setMessage("Your wedding soundtrack is playing.");
            if (event.data === 2 || event.data === 0) setMessage("Music paused. Play whenever you like.");
          },
          onAutoplayBlocked: () => { if (!cancelled) setMessage("Tap Play music to start your soundtrack."); },
          onError: () => { if (!cancelled) { setReady(false); setPlaying(false); setMessage("This song is unavailable here. Open it on YouTube."); } },
        },
      });
      player.current = instance;
    }).catch(() => { if (!cancelled) setMessage("Music could not load. Open the song on YouTube."); });
    return () => { cancelled = true; instance?.destroy(); player.current = null; };
  }, [open]);
  if (!open) return <button className="music-launcher" onClick={() => { setReady(false); setPlaying(false); setMessage("Loading your soundtrack..."); setOpen(true); }}><Music2 size={18} /> Play music</button>;
  return <section className="wedding-music" aria-label="Wedding soundtrack">
    <div className="music-heading"><span><Music2 size={16} /> Wedding soundtrack</span><button aria-label="Close music player" onClick={() => setOpen(false)}><X size={18} /></button></div>
    <div className="music-video" ref={host} />
    <div className="music-actions"><button disabled={!ready} onClick={() => playing ? player.current?.pauseVideo() : player.current?.playVideo()}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? "Pause music" : "Play music"}</button><a href={`https://www.youtube.com/watch?v=${VIDEO_ID}`} target="_blank" rel="noreferrer">Open on YouTube</a></div>
    <small role="status">{message}</small>
  </section>;
}