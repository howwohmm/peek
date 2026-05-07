"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CreateClassResponse } from "@/lib/types";
import { TeacherRoom } from "@/components/teacher/TeacherRoom";

type Status =
  | { kind: "creating" }
  | { kind: "ready"; data: CreateClassResponse }
  | { kind: "error"; message: string };

export default function TeachPage() {
  const [status, setStatus] = useState<Status>({ kind: "creating" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/class/create", { method: "POST" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `failed to create class (${res.status})`);
        }
        const data = (await res.json()) as CreateClassResponse;
        if (!cancelled) setStatus({ kind: "ready", data });
      } catch (err) {
        if (!cancelled) {
          setStatus({
            kind: "error",
            message: err instanceof Error ? err.message : "unknown error",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status.kind === "creating") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-ink-dim text-sm tracking-tight">creating class…</p>
      </main>
    );
  }

  if (status.kind === "error") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full space-y-6 text-center">
          <h1 className="text-2xl tracking-tight">couldn't start class</h1>
          <p className="text-ink-dim text-sm">{status.message}</p>
          <Link
            href="/"
            className="inline-block py-2 px-4 border border-line text-ink hover:border-ink-mute transition-colors rounded text-sm"
          >
            back home
          </Link>
        </div>
      </main>
    );
  }

  return <TeacherRoom {...status.data} />;
}
