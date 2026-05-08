"use client";

import { useCallback, useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { RoomEvent, ScreenSharePresets, Track, type RemoteParticipant } from "livekit-client";
import { decodeData, sendData } from "@/lib/livekit-client";
import type { DataMessage } from "@/lib/types";
import { RaiseHand } from "./RaiseHand";
import { ShareRequestModal } from "./ShareRequestModal";
import { SharingBanner } from "./SharingBanner";
import { SpotlightView } from "./SpotlightView";

type Props = {
  code: string;
  token: string;
  url: string;
  identity: string;
  name: string;
  onLeave: () => void;
};

export function StudentRoom({ code, token, url, identity, name, onLeave }: Props) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={url}
      connect
      audio={false}
      video={false}
      onDisconnected={onLeave}
      data-lk-theme="default"
      className="min-h-screen"
    >
      <RoomAudioRenderer />
      <StudentRoomShell code={code} identity={identity} name={name} onLeave={onLeave} />
    </LiveKitRoom>
  );
}

type ShellProps = {
  code: string;
  identity: string;
  name: string;
  onLeave: () => void;
};

function StudentRoomShell({ code, identity, name, onLeave }: ShellProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  const [shareRequested, setShareRequested] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isBeingViewed, setIsBeingViewed] = useState(false);
  const [spotlightTarget, setSpotlightTarget] = useState<string | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);

  // Subscribe to data channel via RoomEvent.DataReceived — robust across
  // @livekit/components-react versions.
  useEffect(() => {
    if (!room) return;
    const onData = (
      payload: Uint8Array,
      _participant?: RemoteParticipant,
      _kind?: unknown,
      _topic?: string
    ) => {
      const decoded = decodeData(payload);
      if (!decoded) return;
      handleIncoming(decoded);
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
    // handleIncoming closes over identity (stable for the session)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  // Track local screen-share publication state (so banner appears whenever sharing).
  useEffect(() => {
    if (!room) return;

    const updateSharing = () => {
      const pubs = Array.from(localParticipant?.trackPublications.values() ?? []);
      const sharing = pubs.some(
        (p) => p.source === Track.Source.ScreenShare && !p.isMuted
      );
      setIsSharing(sharing);
    };

    updateSharing();
    room.on(RoomEvent.LocalTrackPublished, updateSharing);
    room.on(RoomEvent.LocalTrackUnpublished, updateSharing);
    room.on(RoomEvent.TrackMuted, updateSharing);
    room.on(RoomEvent.TrackUnmuted, updateSharing);

    return () => {
      room.off(RoomEvent.LocalTrackPublished, updateSharing);
      room.off(RoomEvent.LocalTrackUnpublished, updateSharing);
      room.off(RoomEvent.TrackMuted, updateSharing);
      room.off(RoomEvent.TrackUnmuted, updateSharing);
    };
  }, [room, localParticipant]);

  function handleIncoming(msg: DataMessage) {
    switch (msg.type) {
      case "ask-share":
        if (msg.targetIdentity === identity) {
          setShareRequested(true);
          setPickerError(null);
        }
        return;
      case "fullscreen-view":
        if (msg.target === identity) setIsBeingViewed(true);
        else if (msg.target === null || msg.target !== identity) setIsBeingViewed(false);
        return;
      case "spotlight-set":
        setSpotlightTarget(msg.target);
        return;
      default:
        return;
    }
  }

  const handleAccept = useCallback(async () => {
    if (!localParticipant) return;
    setShareRequested(false);
    setPickerError(null);
    try {
      await sendData(localParticipant, { type: "share-accepted", identity });
      await localParticipant.setScreenShareEnabled(
        true,
        {
          resolution: ScreenSharePresets.h1080fps15.resolution,
          contentHint: "text",
        },
        {
          videoCodec: "vp9",
          screenShareEncoding: ScreenSharePresets.h1080fps15.encoding,
        }
      );
    } catch (err) {
      // User denied OS picker, or other failure.
      const message = err instanceof Error ? err.message.toLowerCase() : "";
      if (message.includes("permission") || message.includes("denied") || message.includes("notallowed")) {
        setPickerError("you can retry, or close to cancel.");
      } else {
        setPickerError("could not start screen share. you can retry, or close to cancel.");
      }
    }
  }, [localParticipant, identity]);

  const handleDecline = useCallback(async () => {
    setShareRequested(false);
    if (!localParticipant) return;
    try {
      await sendData(localParticipant, { type: "share-declined", identity });
    } catch {
      // ignore
    }
  }, [localParticipant, identity]);

  // Hide own spotlight (don't echo back to self).
  const showSpotlight =
    spotlightTarget !== null && spotlightTarget !== identity;

  return (
    <main className="relative min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-line">
        <div className="flex items-baseline gap-3">
          <span className="text-ink-dim text-sm">peek</span>
          <span className="text-ink-mute text-xs">/</span>
          <span className="text-ink text-sm tracking-[0.15em]">{code}</span>
        </div>
        <button
          type="button"
          onClick={onLeave}
          className="flex items-center gap-2 text-ink-dim hover:text-ink text-sm transition-colors"
        >
          <LogOut size={14} strokeWidth={1.5} />
          leave
        </button>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 gap-10">
        <div className="text-center space-y-2 max-w-md">
          <p className="text-ink text-lg">
            you're in <span className="tracking-[0.15em]">{code}</span>
          </p>
          <p className="text-ink-dim text-sm leading-relaxed">
            teacher will request your screen if needed. nothing is shared until you accept.
          </p>
        </div>

        <RaiseHand />

        <p className="text-ink-mute text-xs">joined as {name}</p>

        {pickerError && (
          <p className="text-sm text-accent text-center max-w-sm">
            {pickerError}{" "}
            <button
              type="button"
              onClick={handleAccept}
              className="underline hover:no-underline"
            >
              retry
            </button>
          </p>
        )}
      </section>

      {shareRequested && (
        <ShareRequestModal onAccept={handleAccept} onDecline={handleDecline} />
      )}

      {isSharing && <SharingBanner isBeingViewed={isBeingViewed} />}

      {showSpotlight && spotlightTarget && (
        <SpotlightView targetIdentity={spotlightTarget} />
      )}
    </main>
  );
}
