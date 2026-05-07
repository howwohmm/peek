"use client";

import { useState } from "react";
import { Copy, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  code: string;
  onEndClass: () => void;
};

export function TopBar({ code, onEndClass }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-line">
      <div className="flex items-center gap-6">
        <span className="text-ink-dim text-xs lowercase tracking-tight">class code</span>
        <span
          className="text-4xl tracking-[0.2em] text-ink select-all"
          aria-label={`class code ${code}`}
        >
          {code.toLowerCase()}
        </span>
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded border text-xs lowercase transition-colors",
            copied
              ? "border-accent text-accent"
              : "border-line text-ink-dim hover:border-ink-mute hover:text-ink"
          )}
          aria-label="copy code"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "copied" : "copy"}
        </button>
      </div>

      <button
        onClick={onEndClass}
        className="flex items-center gap-2 px-3 py-1.5 rounded border border-line text-ink-dim hover:border-ink-mute hover:text-ink text-xs lowercase transition-colors"
      >
        <X size={14} />
        end class
      </button>
    </header>
  );
}
