"use client";

import { Eye, MonitorUp } from "lucide-react";
import { useLocalParticipant } from "@livekit/components-react";
import { cn } from "@/lib/utils";

type Props = {
  isBeingViewed: boolean;
};

export function SharingBanner({ isBeingViewed }: Props) {
  const { localParticipant } = useLocalParticipant();

  async function stop() {
    if (!localParticipant) return;
    try {
      await localParticipant.setScreenShareEnabled(false);
    } catch {
      // ignore — track may already be torn down
    }
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-40",
        "flex items-center gap-4 px-5 py-3",
        "bg-bg-elevated border border-line rounded-full shadow-lg"
      )}
    >
      <div className="flex items-center gap-2 text-ink">
        <MonitorUp size={16} strokeWidth={1.5} className="text-accent" />
        <span className="text-sm">sharing with teacher</span>
      </div>

      {isBeingViewed && (
        <div className="flex items-center gap-1.5 text-ink-dim pulse-dot">
          <Eye size={14} strokeWidth={1.5} />
          <span className="text-xs">teacher viewing</span>
        </div>
      )}

      <button
        type="button"
        onClick={stop}
        className="text-sm text-ink-dim hover:text-ink transition-colors border-l border-line pl-4"
      >
        stop sharing
      </button>
    </div>
  );
}
