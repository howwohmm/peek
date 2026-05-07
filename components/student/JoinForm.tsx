"use client";

import { useState, type FormEvent } from "react";
import type { ApiError, JoinClassResponse } from "@/lib/types";

type JoinPayload = JoinClassResponse & { name: string };

type Props = {
  onJoin: (payload: JoinPayload) => void;
};

export function JoinForm({ onJoin }: Props) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    if (trimmedCode.length !== 6) {
      setError("code must be 6 characters");
      return;
    }
    if (trimmedName.length < 1 || trimmedName.length > 40) {
      setError("name must be 1-40 characters");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/class/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmedCode, name: trimmedName }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as ApiError | null;
        setError(data?.error || "could not join class");
        setSubmitting(false);
        return;
      }

      const data = (await res.json()) as JoinClassResponse;
      onJoin({ ...data, name: trimmedName });
    } catch {
      setError("network error — try again");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="max-w-sm w-full space-y-10">
        <div className="space-y-2">
          <h1 className="text-3xl tracking-tight">join a class</h1>
          <p className="text-ink-dim text-sm leading-relaxed">
            enter the code your teacher shared.
          </p>
        </div>

        <div className="space-y-6">
          <label className="block space-y-2">
            <span className="text-ink-dim text-sm">class code</span>
            <input
              type="text"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))
              }
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="K7FQ2X"
              className="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 text-2xl tracking-[0.2em] placeholder:text-ink-mute"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-ink-dim text-sm">your name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 40))}
              maxLength={40}
              autoComplete="off"
              placeholder="alex"
              className="w-full bg-transparent border-b border-line focus:border-accent outline-none py-2 text-lg placeholder:text-ink-mute"
            />
          </label>
        </div>

        {error && <p className="text-sm text-accent">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full text-center py-3 px-4 bg-accent text-bg-sunk hover:opacity-90 disabled:opacity-50 transition-opacity rounded"
        >
          {submitting ? "joining..." : "join class"}
        </button>
      </form>
    </main>
  );
}
