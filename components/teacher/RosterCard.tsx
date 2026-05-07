"use client";

import type { Participant } from "livekit-client";
import { Hand, MonitorUp, Circle } from "lucide-react";
import { getDisplayName } from "@/lib/livekit-client";
import { cn } from "@/lib/utils";

type Props = {
  participant: Participant;
  handRaised: boolean;
  isSharing: boolean;
  onAskShare: (targetIdentity: string) => void;
};

export function RosterCard({ participant, handRaised, isSharing, onAskShare }: Props) {
  const name = getDisplayName(participant);

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-5 py-3 group transition-colors",
        handRaised && "bg-bg-elevated"
      )}
    >
      <StatusDot handRaised={handRaised} isSharing={isSharing} />

      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink lowercase truncate tracking-tight">
          {name.toLowerCase()}
        </p>
        <p className="text-xs text-ink-mute lowercase">
          {handRaised ? "hand raised" : isSharing ? "sharing" : "idle"}
        </p>
      </div>

      {!isSharing && (
        <button
          onClick={() => onAskShare(participant.identity)}
          className={cn(
            "p-1.5 rounded border border-line text-ink-dim transition-colors",
            handRaised
              ? "border-accent text-accent hover:bg-accent hover:text-bg-sunk"
              : "opacity-0 group-hover:opacity-100 hover:border-ink-mute hover:text-ink"
          )}
          aria-label={`ask ${name} to share`}
          title="ask to share"
        >
          <MonitorUp size={14} />
        </button>
      )}
    </div>
  );
}

function StatusDot({ handRaised, isSharing }: { handRaised: boolean; isSharing: boolean }) {
  if (handRaised) {
    return (
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-accent">
        <Hand size={16} className="pulse-dot" />
      </div>
    );
  }
  if (isSharing) {
    return (
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-accent">
        <Circle size={8} fill="currentColor" />
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-ink-mute">
      <Circle size={8} />
    </div>
  );
}
