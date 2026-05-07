"use client";

type Props = {
  onAccept: () => void;
  onDecline: () => void;
};

export function ShareRequestModal({ onAccept, onDecline }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-sunk/80 backdrop-blur-sm px-6">
      <div className="max-w-sm w-full bg-bg-elevated border border-line rounded-lg p-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl tracking-tight">teacher wants to view your screen</h2>
          <p className="text-ink-dim text-sm leading-relaxed">
            you'll pick which window or tab to share. teacher can see, but cannot click or type.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onAccept}
            className="w-full text-center py-3 px-4 bg-accent text-bg-sunk hover:opacity-90 transition-opacity rounded"
          >
            share screen
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="w-full text-center py-3 px-4 border border-line text-ink-dim hover:border-ink-mute hover:text-ink transition-colors rounded"
          >
            decline
          </button>
        </div>
      </div>
    </div>
  );
}
