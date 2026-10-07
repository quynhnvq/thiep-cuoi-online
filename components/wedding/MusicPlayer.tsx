"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const AUDIO_SRC = "/wedding/audio/all-about-us.mp3";
const ICON_SRC = "/wedding/img/52688a59d574.webp";

export type MusicPlayerHandle = {
  play: () => Promise<void>;
};

type Props = {
  visible?: boolean;
};

export const MusicPlayer = forwardRef<MusicPlayerHandle, Props>(function MusicPlayer(
  { visible = true },
  ref,
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useImperativeHandle(ref, () => ({
    play: async () => {
      const audio = audioRef.current;
      if (!audio) return;
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    },
  }));

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="wedding-music" style={{ display: visible ? undefined : "none" }}>
      <audio ref={audioRef} src={AUDIO_SRC} loop preload="auto" />
      <button
        type="button"
        className={`wedding-music-btn${playing ? " is-playing" : ""}`}
        onClick={toggle}
        aria-label={playing ? "Tắt nhạc" : "Bật nhạc"}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ICON_SRC} alt="" />
        <span className="wedding-music-slash" />
      </button>
    </div>
  );
});
