"use client";

import { useMemo } from "react";
import { Track } from "livekit-client";
import { useTracks } from "@livekit/components-react";
import { GridTile } from "./GridTile";

type Props = {
  onFullscreen: (identity: string) => void;
};

export function Grid({ onFullscreen }: Props) {
  const trackRefs = useTracks([Track.Source.ScreenShare], {
    onlySubscribed: true,
  });

  // Filter to remote tracks only — teacher shouldn't see their own (they don't share)
  const remoteTracks = useMemo(() => {
    return trackRefs.filter((t) => t.participant && !t.participant.isLocal);
  }, [trackRefs]);

  if (remoteTracks.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center px-12">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-ink-dim text-sm lowercase tracking-tight">
            no one's sharing yet
          </p>
          <p className="text-ink-mute text-xs lowercase leading-relaxed">
            when a student raises a hand, ask them to share. their screen will appear here.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
        {remoteTracks.map((tr) => (
          <GridTile
            key={`${tr.participant.identity}-${tr.publication?.trackSid ?? "screen"}`}
            trackRef={tr}
            onClick={() => onFullscreen(tr.participant.identity)}
          />
        ))}
      </div>
    </main>
  );
}
