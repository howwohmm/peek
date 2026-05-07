export type Role = "teacher" | "student";

export type RoomMetadata = {
  code: string;
  createdAt: number;
  spotlightIdentity: string | null;
};

export type ParticipantMetadata = {
  role: Role;
  displayName: string;
  handRaised?: boolean;
  shareGranted?: boolean;
  isFullscreenViewedBy?: string | null;
};

export type DataMessage =
  | { type: "raise-hand"; raised: boolean }
  | { type: "ask-share"; targetIdentity: string }
  | { type: "share-accepted"; identity: string }
  | { type: "share-declined"; identity: string }
  | { type: "fullscreen-view"; viewer: string; target: string | null }
  | { type: "spotlight-set"; target: string | null };

export type CreateClassResponse = {
  code: string;
  token: string;
  url: string;
  identity: string;
};

export type JoinClassResponse = {
  code: string;
  token: string;
  url: string;
  identity: string;
};

export type ApiError = { error: string };
