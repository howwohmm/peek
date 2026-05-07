"use client";

import { useState } from "react";
import { Hand } from "lucide-react";
import { useLocalParticipant } from "@livekit/components-react";
import { sendData } from "@/lib/livekit-client";
import { cn } from "@/lib/utils";

export function RaiseHand() {
  const { localParticipant } = useLocalParticipant();
  const [raised, setRaised] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!localParticipant || busy) return;
    const next = !raised;
    setBusy(true);
    try {
      await sendData(localParticipant, { type: "raise-hand", raised: next });
      setRaised(next);
    } catch {
      // swallow — UI keeps prior state
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={cn(
        "group flex flex-col items-center justify-center gap-6",
        "w-48 h-48 rounded-full border transition-all",
        "disabled:opacity-50",
        raised
          ? "border-accent text-accent bg-accent/5"
          : "border-line text-ink-dim hover:border-ink-dim hover:text-ink"
      )}
      aria-pressed={raised}
    >
      <Hand
        className={cn(
          "transition-transform",
          raised ? "scale-110" : "group-hover:scale-105"
        )}
        size={56}
        strokeWidth={1.25}
      />
      <span className="text-sm tracking-tight">
        {raised ? "hand raised" : "raise hand"}
      </span>
    </button>
  );
}
