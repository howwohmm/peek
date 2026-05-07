"use client";

import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  active: boolean;
  onToggle: () => void;
};

export function SpotlightToggle({ active, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded border text-xs lowercase transition-colors",
        active
          ? "border-accent text-accent"
          : "border-line text-ink-dim hover:border-ink-mute hover:text-ink"
      )}
      aria-pressed={active}
      aria-label={active ? "stop spotlight" : "spotlight to class"}
      title={
        active
          ? "stop broadcasting to other students"
          : "broadcast this screen to other students"
      }
    >
      {active ? <EyeOff size={14} /> : <Eye size={14} />}
      {active ? "spotlit" : "spotlight"}
    </button>
  );
}
