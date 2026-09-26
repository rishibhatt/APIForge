"use client";

import { useEffect, useRef, useState } from "react";
import MaterialIcon from "@/components/atomic/atoms/Icon/MaterialIcon";
import { selectRoastMeme, type SelectedMemeResult } from "@/lib/roast/memeSelector";
import type { RoastSummary } from "@/lib/roast/types";
import styles from "./RoastMemeVideo.module.css";

export interface RoastMemeVideoProps {
  summary: RoastSummary;
  initialMeme?: SelectedMemeResult;
  onMemeChange?: (result: SelectedMemeResult) => void;
}

export default function RoastMemeVideo({
  summary,
  initialMeme,
  onMemeChange,
}: RoastMemeVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [currentResult, setCurrentResult] = useState<SelectedMemeResult>(() => {
    return initialMeme || selectRoastMeme(summary);
  });

  const [isMuted, setIsMuted] = useState<boolean>(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("apiForgeMemeMuted");
      if (saved === "false") {
        setIsMuted(false);
      }
    } catch {
      // ignore storage error
    }
  }, []);

  useEffect(() => {
    if (initialMeme) {
      setCurrentResult(initialMeme);
    }
  }, [initialMeme]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted, currentResult.meme.src]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      if (!nextMuted) {
        videoRef.current.play().catch(() => {
          setIsMuted(true);
          if (videoRef.current) videoRef.current.muted = true;
        });
      }
    }

    try {
      localStorage.setItem("apiForgeMemeMuted", String(nextMuted));
    } catch {
      // ignore storage error
    }
  };

  const handleCycleMeme = () => {
    const next = selectRoastMeme(summary, undefined, currentResult.meme.id);
    setCurrentResult(next);
    if (onMemeChange) {
      onMemeChange(next);
    }
  };

  return (
    <div className={styles.container}>
      {/* CAPTION BAR POSITIONED ABOVE THE VIDEO */}
      <div className={styles.captionBar}>
        <p className={styles.captionText}>&quot;{currentResult.caption}&quot;</p>
      </div>

      <div className={styles.videoFrame}>
        <div className={styles.moodTag}>
          <MaterialIcon name="videocam" size="sm" />
          <span>{currentResult.meme.mood}</span>
        </div>

        <video
          ref={videoRef}
          key={currentResult.meme.src}
          src={currentResult.meme.src}
          autoPlay
          muted={isMuted}
          playsInline
          loop
          preload="metadata"
          className={styles.video}
          aria-label={`API review meme: ${currentResult.caption}`}
        />

        <button
          type="button"
          className={styles.muteBtn}
          onClick={toggleMute}
          aria-label={isMuted ? "Unmute meme audio" : "Mute meme audio"}
        >
          <MaterialIcon name={isMuted ? "volume_off" : "volume_up"} size="sm" />
          <span>{isMuted ? "Unmute" : "Mute"}</span>
        </button>
      </div>

      <div className={styles.cycleRow}>
        <button
          type="button"
          className={styles.cycleBtn}
          onClick={handleCycleMeme}
          aria-label="Try another meme video"
        >
          <MaterialIcon name="sync" size="sm" />
          <span>Try Another Meme</span>
        </button>
      </div>
    </div>
  );
}
