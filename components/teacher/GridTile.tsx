"use client";

import { VideoTrack, type TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Maximize2 } from "lucide-react";
import { getDisplayName } from "@/lib/livekit-client";

type Props = {
  trackRef: TrackReferenceOrPlaceholder;
  onClick: () => void;
};

export function GridTile({ trackRef, onClick }: Props) {
  const name = getDisplayName(trackRef.participant);

  const hasTrack =
    "publication" in trackRef &&
    trackRef.publication &&
    "track" in trackRef.publication &&
    trackRef.publication.track;

  return (
    <button
      onClick={onClick}
      className="group relative aspect-video bg-bg-sunk border border-line hover:border-ink-mute rounded overflow-hidden transition-colors text-left"
      aria-label={`fullscreen ${name}`}
    >
      {hasTrack ? (
        <VideoTrack
          trackRef={trackRef}
          className="w-full h-full object-contain bg-black"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-ink-mute text-xs lowercase">
          connecting…
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 px-3 py-2 bg-gradient-to-t from-bg-sunk/95 to-transparent flex items-center justify-between">
        <span className="text-sm text-ink lowercase tracking-tight truncate">
          {name.toLowerCase()}
        </span>
        <Maximize2
          size={14}
          className="text-ink-dim opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
        />
      </div>
    </button>
  );
}
