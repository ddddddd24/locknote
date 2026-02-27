// ─── Domain Types ────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'drawing';

export interface Message {
  id: string;
  pairId: string;
  authorId: string;
  authorName: string;
  content: string;         // plain text, or base64-encoded SVG path data for drawings
  type: MessageType;
  timestamp: number;
  read: boolean;
}

/**
 * Minimal snapshot stored at /messages/{pairId}/latest.
 * The Android widget and iOS widget extension read from this path.
 */
export interface LatestMessage {
  content: string;
  type: MessageType;
  authorId: string;
  authorName: string;
  timestamp: number;
}

export interface Pair {
  id: string;
  user1: string;           // userId
  user2: string;           // userId
  createdAt: number;
}

export interface UserProfile {
  id: string;
  name: string;
  pairId: string | null;
  fcmToken: string | null;
  avatarBase64: string | null;
}

/** Temporary record stored at /pairCodes/{code} until the partner joins. */
export interface PairCode {
  userId: string;
  userName: string;
  createdAt: number;
}

// ─── Widget Types ─────────────────────────────────────────────────────────────

export interface WidgetData {
  message: string;
  fromName: string;
  type: MessageType;
  timestamp: number;
}

// ─── Navigation Types ─────────────────────────────────────────────────────────

export type RootStackParamList = {
  Pairing: undefined;
  Home: undefined;
  Compose: { mode: 'text' | 'draw' };
  History: undefined;
  Profile: undefined;
  SayangHome: undefined;
};
