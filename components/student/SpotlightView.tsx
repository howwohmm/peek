"use client";

import { useEffect, useRef } from "react";
import { Track } from "livekit-client";
import { useTracks } from "@livekit/components-react";

type Props = {
  targetIdentity: string;
};

export function SpotlightView({ targetIdentity }: Props) {
  const tracks = useTracks([Track.Source.ScreenShare], { onlySubscribed: false });
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const target = tracks.find(
    (t) => t.participant.identity === targetIdentity && t.publication?.kind === Track.Kind.Video
  );

  useEffect(() => {
    const el = videoRef.current;
    const pub = target?.publication;
    if (!el || !pub) return;

    // Force-subscribe if not already.
    if ("setSubscribed" in pub && !pub.isSubscribed) {
      try {
        (pub as { setSubscribed: (v: boolean) => void }).setSubscribed(true);
      } catch {
        // best-effort
      }
    }

    const track = pub.track;
    if (track) {
      track.attach(el);
    }
    return () => {
      if (track) {
        track.detach(el);
      }
    };
  }, [target?.publication, target?.publication?.track]);

  return (
    <div className="fixed inset-0 z-30 bg-bg-sunk flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-line">
        <span className="text-ink-dim text-sm">spotlight</span>
        <span className="text-ink-mute text-xs">teacher is showing the class this screen</span>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        {target ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <p className="text-ink-mute text-sm">waiting for spotlight stream...</p>
        )}
      </div>
    </div>
  );
}
