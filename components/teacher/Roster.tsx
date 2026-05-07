"use client";

import { useMemo } from "react";
import { Track } from "livekit-client";
import { useTracks } from "@livekit/components-react";
import type { Participant } from "livekit-client";
import { RosterCard } from "./RosterCard";

type StudentFlags = {
  handRaised: boolean;
};

type Props = {
  students: Participant[];
  flags: Record<string, StudentFlags>;
  onAskShare: (targetIdentity: string) => void;
};

export function Roster({ students, flags, onAskShare }: Props) {
  const screenShareTracks = useTracks([Track.Source.ScreenShare], {
    onlySubscribed: false,
  });

  const sharingIdentities = useMemo(() => {
    const ids = new Set<string>();
    for (const t of screenShareTracks) {
      if (t.participant?.identity) ids.add(t.participant.identity);
    }
    return ids;
  }, [screenShareTracks]);

  const sorted = useMemo(() => {
    return [...students].sort((a, b) => {
      const aRaised = flags[a.identity]?.handRaised ? 1 : 0;
      const bRaised = flags[b.identity]?.handRaised ? 1 : 0;
      if (aRaised !== bRaised) return bRaised - aRaised;
      // then sharing students above idle
      const aShare = sharingIdentities.has(a.identity) ? 1 : 0;
      const bShare = sharingIdentities.has(b.identity) ? 1 : 0;
      if (aShare !== bShare) return bShare - aShare;
      // then alphabetical by display name
      return (a.name || a.identity).localeCompare(b.name || b.identity);
    });
  }, [students, flags, sharingIdentities]);

  return (
    <aside className="w-[280px] shrink-0 border-r border-line flex flex-col">
      <div className="px-5 py-4 border-b border-line">
        <p className="text-xs lowercase text-ink-mute tracking-tight">
          {students.length === 0
            ? "no one's joined yet"
            : `${students.length} ${students.length === 1 ? "student" : "students"}`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="px-5 py-8 text-ink-mute text-xs lowercase leading-relaxed">
            share the code with your class. students will appear here as they join.
          </div>
        ) : (
          <ul className="py-2">
            {sorted.map((p) => (
              <li key={p.identity}>
                <RosterCard
                  participant={p}
                  handRaised={!!flags[p.identity]?.handRaised}
                  isSharing={sharingIdentities.has(p.identity)}
                  onAskShare={onAskShare}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
