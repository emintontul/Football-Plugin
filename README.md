# Hippo Football Predictions Plugin

A football match prediction game with a global leaderboard, built as a Hippo super-app plugin.

---

## Running in Each Mode

### 1. Browser dev (MockBridge)

```bash
cp .env.example .env.local
# Edit .env.local — set VITE_API_BASE_URL to your local API or a staging URL
npm install
npm run dev
```

Opens at `http://localhost:5173`. The app detects no Hippo host and falls back to **MockBridge**, which returns a fake user and token. A warning is printed to the console.

To suppress the warning and explicitly opt into mocks:

```
VITE_MOCK_MODE=true
```

### 2. Simulated WebView (PostMessageBridge)

```bash
npm run dev:webview   # runs: vite --mode webview
```

Uses `vite.config.ts` mode overrides (add `mode: 'webview'` env vars as needed). The app still uses MockBridge unless you inject `window.ReactNativeWebView` — e.g. via a browser extension or a local wrapper HTML that emulates the RN WebView interface.

### 3. Inside Hippo (production)

Build and deploy to the Hippo plugin store:

```bash
npm run build         # outputs to dist/
```

Load `dist/index.html` in a Hippo WebView. The bridge auto-selects:
- `HippoSDKBridge` if `@gethippoai/host-sdk` is installed and detects a Hippo host
- `PostMessageBridge` if `window.ReactNativeWebView` is present

---

## Bridge Auto-Detection

`BridgeProvider.tsx` runs this detection sequence on mount:

```
1. VITE_MOCK_MODE=true?  ──► MockBridge (always, skips detection)
2. @gethippoai/host-sdk installed AND reports isAvailable()?
                         ──► HippoSDKBridge
3. window.ReactNativeWebView exists?
                         ──► PostMessageBridge
4. Otherwise             ──► MockBridge (+ console.warn)
```

The selected bridge is exposed via `useBridge()`:

```tsx
import { useBridge } from '@/bridge';

function MyComponent() {
  const { bridge, bridgeType } = useBridge();
  // bridgeType: 'sdk' | 'postmessage' | 'mock'
}
```

---

## Extending With New Bridge Messages

### Step 1 — Add the Zod schema to `src/bridge/types.ts`

```ts
export const ScoreUpdatePayloadSchema = z.object({
  matchId: z.string(),
  homeScore: z.number(),
  awayScore: z.number(),
});
```

### Step 2 — Add the method to the `HippoBridge` interface

```ts
interface HippoBridge {
  // ... existing methods
  onScoreUpdate(handler: (payload: z.infer<typeof ScoreUpdatePayloadSchema>) => void): () => void;
}
```

### Step 3 — Implement in all three bridges

- **MockBridge**: store handler, call it with fake data if needed
- **PostMessageBridge**: send `SCORE_UPDATE` message, validate response with the schema
- **HippoSDKBridge**: delegate to SDK method, normalise return type

### Step 4 — Use via the hook pattern

```ts
useEffect(() => {
  return bridge.on<ScoreUpdatePayload>('SCORE_UPDATE', (payload) => {
    // validated payload
  });
}, [bridge]);
```

---

## Project Structure

```
src/
├── bridge/        — Bridge interface, three implementations, React provider
├── api/           — Axios client + Zod-validated endpoint functions
├── features/      — Page-level components (fixtures, predictions, leaderboard)
├── components/    — Shared UI primitives and layout shell
├── hooks/         — Bridge-aware React hooks
├── lib/           — env validation, utils
├── routes/        — React Router config
└── types/         — Domain types and env.d.ts
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | Yes | Base URL of the backend API |
| `VITE_MOCK_MODE` | No | `true` to force MockBridge in all environments |

Validated at startup by `src/lib/env.ts` — the app throws immediately if `VITE_API_BASE_URL` is missing or not a valid URL.
