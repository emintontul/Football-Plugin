import { z } from 'zod';

export interface HippoBridge {
  isReady(): Promise<void>;
  getUser(): Promise<{ id: string; displayName: string; avatarUrl?: string }>;
  getToken(): Promise<string>;
  getTheme(): Promise<{ mode: 'light' | 'dark'; tokens: Record<string, string> }>;
  showToast(message: string, type?: 'success' | 'error' | 'info'): void;
  haptic(type: 'light' | 'medium' | 'success' | 'error'): void;
  close(): void;
  on<T>(event: string, handler: (payload: T) => void): () => void;
}

// ── PostMessage wire schemas ──────────────────────────────────────────────────

export const OutgoingMessageSchema = z.object({
  id: z.string(),
  type: z.string(),
  payload: z.unknown().optional(),
});
export type OutgoingMessage = z.infer<typeof OutgoingMessageSchema>;

export const IncomingMessageSchema = z.object({
  id: z.string(),
  type: z.string(),
  payload: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});
export type IncomingMessage = z.infer<typeof IncomingMessageSchema>;

export const UserPayloadSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().url().optional(),
});
export type UserPayload = z.infer<typeof UserPayloadSchema>;

export const TokenPayloadSchema = z.object({
  token: z.string(),
});

export const ThemePayloadSchema = z.object({
  mode: z.enum(['light', 'dark']),
  tokens: z.record(z.string()),
});
export type ThemePayload = z.infer<typeof ThemePayloadSchema>;

export const KNOWN_MESSAGE_TYPES = [
  'GET_USER',
  'GET_TOKEN',
  'GET_THEME',
  'SHOW_TOAST',
  'HAPTIC',
  'CLOSE',
  'READY',
  'EVENT',
] as const;
export type KnownMessageType = (typeof KNOWN_MESSAGE_TYPES)[number];
