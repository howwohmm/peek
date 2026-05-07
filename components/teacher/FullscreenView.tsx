"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Track, type RemoteVideoTrack } from "livekit-client";
import {
  VideoTrack,
  useTracks,
} from "@livekit/components-react";
import type { Participant } from "livekit-client";
import { ArrowLeft, Circle, Square } from "lucide-react";
import { getDisplayName } from "@/lib/livekit-client";
import { cn } from "@/lib/utils";
import { SpotlightToggle } from "./SpotlightToggle";

type Props = {
  participant: Participant;
  spotlightIdentity: string | null;
  onBack: () => void;
  onSpotlight: (targetIdentity: string | null) => void;
};

export function FullscreenView({
  participant,
  spotlightIdentity,
  onBack,
  onSpotlight,
}: Props) {
  const allTracks = useTracks([Track.Source.ScreenShare], {
    onlySubscribed: true,
  });
  const trackRef = useMemo(
    () => allTracks.find((t) => t.participant.identity === participant.identity),
    [allTracks, participant.identity]
  );

  const name = getDisplayName(participant);
  const isSpotlit = spotlightIdentity === participant.identity;

  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // If track disappears (student stopped sharing) and we're recording, stop.
  useEffect(() => {
    if (!trackRef && recording) {
      stopRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackRef, recording]);

  // Cleanup on unmount: stop the recorder if running
  useEffect(() => {
    return () => {
      const r = recorderRef.current;
      if (r && r.state !== "inactive") {
        try {
          r.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  function getMediaStream(): MediaStream | null {
    if (!trackRef) return null;
    const pub = trackRef.publication;
    if (!pub || !("track" in pub) || !pub.track) return null;
    const lkTrack = pub.track as RemoteVideoTrack;
    const mst = lkTrack.mediaStreamTrack;
    if (!mst) return null;
    return new MediaStream([mst]);
  }

  function pickMimeType(): string | undefined {
    const candidates = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    for (const c of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
        return c;
      }
    }
    return undefined;
  }

  function startRecording() {
    setRecordError(null);
    const stream = getMediaStream();
    if (!stream) {
      setRecordError("no video to record");
      return;
    }
    try {
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        chunksRef.current = [];
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `peek-recording-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Defer revoke so the download has time to start.
        window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      };
      recorder.start(1000); // 1s timeslice for resilience
      recorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      setRecordError(err instanceof Error ? err.message : "couldn't start recording");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // ignore
      }
    }
    recorderRef.current = null;
    setRecording(false);
  }

  return (
    <div className="flex-1 flex flex-col bg-bg-sunk min-h-0">
      <div className="flex items-center justify-between px-6 py-3 border-b border-line">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded border border-line text-ink-dim hover:border-ink-mute hover:text-ink text-xs lowercase transition-colors"
        >
          <ArrowLeft size={14} />
          back to grid
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-dim lowercase tracking-tight">
            {name.toLowerCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <SpotlightToggle
            active={isSpotlit}
            onToggle={() =>
              onSpotlight(isSpotlit ? null : participant.identity)
            }
          />
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={!trackRef}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded border text-xs lowercase transition-colors",
              recording
                ? "border-accent text-accent"
                : "border-line text-ink-dim hover:border-ink-mute hover:text-ink",
              !trackRef && "opacity-40 cursor-not-allowed"
            )}
            aria-label={recording ? "stop recording" : "start recording"}
          >
            {recording ? (
              <>
                <Square size={12} fill="currentColor" />
                stop recording
              </>
            ) : (
              <>
                <Circle size={12} fill="currentColor" />
                record
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center bg-black">
        {trackRef ? (
          <VideoTrack
            trackRef={trackRef}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <p className="text-ink-mute text-xs lowercase">
            this student isn't sharing anymore
          </p>
        )}
      </div>

      {recordError && (
        <div className="px-6 py-2 text-xs text-ink-mute lowercase">
          {recordError}
        </div>
      )}
    </div>
  );
}
