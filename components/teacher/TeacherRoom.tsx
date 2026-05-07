"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useDataChannel,
  useLocalParticipant,
  useParticipants,
} from "@livekit/components-react";
import "@livekit/components-styles";
import type { CreateClassResponse, DataMessage } from "@/lib/types";
import { decodeData, getDisplayName, isStudent, sendData } from "@/lib/livekit-client";
import { TopBar } from "./TopBar";
import { Roster } from "./Roster";
import { Grid } from "./Grid";
import { FullscreenView } from "./FullscreenView";

type Props = CreateClassResponse;

export function TeacherRoom({ code, token, url, identity }: Props) {
  const router = useRouter();

  const handleDisconnected = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <LiveKitRoom
      token={token}
      serverUrl={url}
      connect
      audio={false}
      video={false}
      onDisconnected={handleDisconnected}
      className="min-h-screen bg-bg text-ink"
      data-lk-theme="default"
    >
      <RoomAudioRenderer />
      <TeacherShell code={code} identity={identity} token={token} />
    </LiveKitRoom>
  );
}

type ShellProps = {
  code: string;
  identity: string;
  token: string;
};

type StudentFlags = {
  handRaised: boolean;
};

function TeacherShell({ code, identity, token }: ShellProps) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  // Map of student identity -> flags maintained from data channel
  const [flags, setFlags] = useState<Record<string, StudentFlags>>({});
  const [fullscreenIdentity, setFullscreenIdentity] = useState<string | null>(null);
  const [spotlightIdentity, setSpotlightIdentity] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Listen to incoming data messages
  useDataChannel((payload) => {
    const msg = decodeData(payload.payload);
    if (!msg) return;
    const fromIdentity = payload.from?.identity;

    if (msg.type === "raise-hand" && fromIdentity) {
      setFlags((prev) => ({
        ...prev,
        [fromIdentity]: { ...prev[fromIdentity], handRaised: msg.raised },
      }));
    } else if (msg.type === "share-accepted") {
      // student is about to publish — track will appear via useTracks
      // eslint-disable-next-line no-console
      console.log("[peek] share accepted by", msg.identity);
    } else if (msg.type === "share-declined") {
      const target = participants.find((p) => p.identity === msg.identity);
      const name = target ? getDisplayName(target) : msg.identity;
      setToast(`${name.toLowerCase()} declined to share`);
      window.setTimeout(() => setToast(null), 4000);
    }
  });

  // Clear flags for participants who've left
  useEffect(() => {
    setFlags((prev) => {
      const next: Record<string, StudentFlags> = {};
      for (const p of participants) {
        if (prev[p.identity]) next[p.identity] = prev[p.identity];
      }
      return next;
    });
  }, [participants]);

  const students = useMemo(() => {
    return participants
      .filter((p) => p.identity !== identity)
      .filter((p) => isStudent(p));
  }, [participants, identity]);

  const handleAskShare = useCallback(
    async (targetIdentity: string) => {
      if (!localParticipant) return;
      const msg: DataMessage = { type: "ask-share", targetIdentity };
      await sendData(localParticipant, msg, [targetIdentity]);
    },
    [localParticipant]
  );

  const handleEndClass = useCallback(async () => {
    if (!confirm("end class for everyone?")) return;
    try {
      await fetch("/api/class/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, token }),
      });
    } catch {
      // best-effort — navigate home regardless
    }
    window.location.href = "/";
  }, [code, token]);

  const handleFullscreen = useCallback(
    async (targetIdentity: string | null) => {
      setFullscreenIdentity(targetIdentity);
      if (localParticipant) {
        const msg: DataMessage = {
          type: "fullscreen-view",
          viewer: identity,
          target: targetIdentity,
        };
        await sendData(localParticipant, msg);
      }
    },
    [localParticipant, identity]
  );

  const handleSpotlight = useCallback(
    async (targetIdentity: string | null) => {
      setSpotlightIdentity(targetIdentity);
      if (localParticipant) {
        const msg: DataMessage = { type: "spotlight-set", target: targetIdentity };
        await sendData(localParticipant, msg);
      }
    },
    [localParticipant]
  );

  const fullscreenParticipant = useMemo(() => {
    if (!fullscreenIdentity) return null;
    return participants.find((p) => p.identity === fullscreenIdentity) ?? null;
  }, [fullscreenIdentity, participants]);

  // If the spotlighted student leaves, clear spotlight
  useEffect(() => {
    if (
      spotlightIdentity &&
      !participants.some((p) => p.identity === spotlightIdentity)
    ) {
      setSpotlightIdentity(null);
    }
    if (
      fullscreenIdentity &&
      !participants.some((p) => p.identity === fullscreenIdentity)
    ) {
      setFullscreenIdentity(null);
    }
  }, [participants, spotlightIdentity, fullscreenIdentity]);

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar code={code} onEndClass={handleEndClass} />

      {fullscreenParticipant ? (
        <FullscreenView
          participant={fullscreenParticipant}
          spotlightIdentity={spotlightIdentity}
          onBack={() => handleFullscreen(null)}
          onSpotlight={handleSpotlight}
        />
      ) : (
        <div className="flex flex-1 min-h-0">
          <Roster
            students={students}
            flags={flags}
            onAskShare={handleAskShare}
          />
          <Grid onFullscreen={(id) => handleFullscreen(id)} />
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-bg-elevated border border-line rounded text-sm text-ink-dim lowercase">
          {toast}
        </div>
      )}
    </div>
  );
}
