# Hippo Football Prediction Plugin — Architecture

> **Plugin tipi:** Hippo Frontend Extension (WebView tabanlı SPA)  
> **Hippo Docs:** https://docs.gethippo.ai  
> **Son güncelleme:** Haziran 2026

---

## İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Sistem Diyagramı](#sistem-diyagramı)
3. [Bridge Katmanı](#bridge-katmanı)
4. [Ortam Yönetimi](#ortam-yönetimi)
5. [Veri Akışı](#veri-akışı)
6. [State Yönetimi](#state-yönetimi)
7. [Routing](#routing)
8. [Tema ve Stil](#tema-ve-stil)
9. [Hata Yönetimi](#hata-yönetimi)
10. [Güvenlik](#güvenlik)
11. [Performance](#performance)
12. [Backend Kontratı](#backend-kontratı)
13. [Geliştirici Rehberi](#geliştirici-rehberi)

---

## Genel Bakış

Bu plugin, Hippo super-app'in WebView container'ında çalışan bağımsız bir React SPA'dır. Kullanıcılar:

- Yaklaşan futbol maçlarını görür
- Skor veya kazanan tahmini yapar
- Global leaderboard'da diğer kullanıcılarla yarışır

Plugin, Hippo uygulamasından kullanıcı kimliği ve tema bilgisini alır; kendi backend'ine tahmin ve leaderboard verileri için istek atar.

---

## Sistem Diyagramı

```
┌─────────────────────────────────────────────────────────┐
│                    Hippo Mobile App                     │
│                   (React Native)                        │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              WebView Container                   │   │
│  │                                                  │   │
│  │   ┌──────────────────────────────────────────┐   │   │
│  │   │     Football Prediction Plugin (SPA)     │   │   │
│  │   │                                          │   │   │
│  │   │  ┌──────────┐  ┌─────────┐  ┌────────┐  │   │   │
│  │   │  │ Fixtures │  │ Predict │  │ Leader │  │   │   │
│  │   │  │  Screen  │  │ Screen  │  │ Board  │  │   │   │
│  │   │  └──────────┘  └─────────┘  └────────┘  │   │   │
│  │   │                                          │   │   │
│  │   │  ┌────────────────────────────────────┐  │   │   │
│  │   │  │         Bridge Layer               │  │   │   │
│  │   │  │  (HippoSDK / PostMessage / Mock)   │  │   │   │
│  │   │  └────────────────┬───────────────────┘  │   │   │
│  │   └───────────────────│──────────────────────┘   │   │
│  └───────────────────────│──────────────────────────┘   │
│                          │ postMessage / SDK call        │
│              ┌───────────┴──────────────┐               │
│              │    Hippo Native Layer    │               │
│              │  (auth, theme, toast...) │               │
│              └──────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
                           │
                    REST API calls
                           │
┌──────────────────────────▼──────────────────────────────┐
│              Football Plugin Backend                     │
│                                                         │
│   GET /fixtures        POST /predictions                │
│   GET /leaderboard     GET /leaderboard/me              │
└──────────────────────────┬──────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          │                                 │
┌─────────▼──────────┐          ┌──────────▼──────────┐
│   PostgreSQL DB     │          │  External Football  │
│  (predictions,      │          │  API (fixtures,     │
│   leaderboard,      │          │   live scores)      │
│   users)            │          │                     │
└────────────────────┘          └─────────────────────┘
```

---

## Bridge Katmanı

Plugin'in en kritik katmanıdır. Hippo ile tüm iletişim burada gerçekleşir.

### Interface

```typescript
// src/bridge/types.ts
interface HippoBridge {
  isReady(): Promise<void>
  getUser(): Promise<HippoUser>
  getToken(): Promise<string>
  getTheme(): Promise<HippoTheme>
  showToast(message: string, type?: ToastType): void
  haptic(type: HapticType): void
  close(): void
  on<T>(event: HippoEvent, handler: (payload: T) => () => void): void
}
```

### Implementasyonlar

#### HippoSDKBridge
`@gethippoai/host-sdk` paketi mevcut olduğunda ve Hippo host environment tespit edildiğinde devreye girer. Resmi SDK'yı sarmalar.

```
Durum: Paketin public release'i bekleniyor.
Hippo takımıyla koordine edilmeli.
```

#### PostMessageBridge
`window.ReactNativeWebView` mevcut olduğunda kullanılır. Mesajlar JSON string olarak iletilir.

**Request/Response protokolü:**

```
Plugin                          Hippo Native
  │                                  │
  │──── postMessage({id, type}) ────▶│
  │                                  │ işler
  │◀─── message event({id, ...}) ────│
  │                                  │
  │  (10s timeout sonrası reject)    │
```

iOS ve Android'in `message` event'ini farklı yayımlamasına dikkat:
```typescript
// Her iki event'i de dinle
window.addEventListener('message', handler)
document.addEventListener('message', handler)  // Android için
```

#### MockBridge
Sadece geliştirme ortamında aktiftir. Sabit test kullanıcısı ve token döner. Production build'de MockBridge aktifse uygulama hata fırlatır.

### Ortam Tespiti

```
BridgeProvider başlar
        │
        ▼
@gethippoai/host-sdk var mı
ve hippo.isHippoHost() === true?
        │
    Evet ──▶ HippoSDKBridge
        │
    Hayır
        │
        ▼
window.ReactNativeWebView var mı?
        │
    Evet ──▶ PostMessageBridge
        │
    Hayır
        │
        ▼
NODE_ENV === 'development'?
        │
    Evet ──▶ MockBridge (console.warn yazar)
        │
    Hayır ──▶ Error fırlatır (production'da bridge olmalı)
```

---

## Ortam Yönetimi

| Değişken | Açıklama | Örnek |
|---|---|---|
| `VITE_API_BASE_URL` | Plugin backend URL'si | `https://api.football.hippo.app` |
| `VITE_MOCK_MODE` | Bridge'i mock'a zorla | `true` / `false` |
| `VITE_MOCK_USER_ID` | Mock kullanıcı ID | `dev-user-1` |
| `VITE_SENTRY_DSN` | Hata takibi | `https://...@sentry.io/...` |

Tüm variable'lar `src/lib/env.ts` içinde Zod ile validate edilir. Eksik variable başlangıçta hata fırlatır.

```typescript
// src/lib/env.ts
const EnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_MOCK_MODE: z.coerce.boolean().default(false),
  VITE_SENTRY_DSN: z.string().optional(),
})
export const env = EnvSchema.parse(import.meta.env)
```

---

## Veri Akışı

### Uygulama Başlangıcı

```
App mount
    │
    ▼
BridgeProvider: bridge seç, isReady() bekle
    │
    ▼
AuthGate: getUser() + getToken()
    │
    ├── Token → Axios interceptor'a yerleştir
    └── User → Zustand userStore'a yaz
    │
    ▼
useHippoTheme: getTheme() → CSS variable'larını yaz
    │
    ▼
App render (routes aktif)
```

### Tahmin Akışı

```
Kullanıcı maça tıklar
    │
    ▼
/predict/:matchId route'una git
    │
    ▼
useMatch(matchId) → GET /fixtures/:matchId (cache'den veya fetch)
    │
    ▼
Kullanıcı formu doldurur
    │
    ▼
usePredictionMutation.mutate(data)
    │
    ▼
POST /predictions
Authorization: Bearer <token>
    │
    ├── Başarılı: bridge.haptic('success') + bridge.showToast('Tahmin kaydedildi!')
    │             leaderboard cache'ini invalidate et
    └── Hatalı:  bridge.haptic('error') + bridge.showToast('Hata oluştu', 'error')
```

### Token Yenileme

```
API isteği
    │
    ▼
401 Unauthorized
    │
    ▼
Axios response interceptor
    │
    ▼
bridge.getToken() (Hippo'dan taze token ister)
    │
    ▼
İsteği yeni token ile tekrarla
    │
    ├── Başarılı: devam
    └── Yine 401: kullanıcıyı login'e yönlendir (bridge.close())
```

---

## State Yönetimi

### TanStack Query (Server State)
Uzak veri için her zaman TanStack Query kullan.

```typescript
// Query key konvansiyonu
['fixtures']                    // tüm maçlar
['fixtures', matchId]           // tek maç
['predictions', { matchId }]    // maça ait tahminler
['leaderboard']                 // global sıralama
['leaderboard', 'me']           // kullanıcının kendi sırası
```

Polling ayarları:
- Fixtures: 60s refetch (maç statüsü için)
- Live fixtures: 15s refetch
- Leaderboard: 30s refetch

### Zustand (Client State)

```typescript
// src/store/userStore.ts
type UserStore = {
  user: HippoUser | null
  token: string | null
  setUser: (user: HippoUser) => void
  setToken: (token: string) => void
}

// src/store/uiStore.ts
type UIStore = {
  theme: HippoTheme
  isOnline: boolean
  setTheme: (theme: HippoTheme) => void
  setOnline: (online: boolean) => void
}
```

---

## Routing

```
/                   → redirect /fixtures
/fixtures           → FixturesPage (maç listesi)
/predict/:matchId   → PredictPage (tahmin formu)
/leaderboard        → LeaderboardPage (global sıralama)
```

Bottom navigation: Fixtures ↔ Leaderboard  
PredictPage: FixturesPage'den açılır, header'da geri butonu

---

## Tema ve Stil

### CSS Variable Sistemi

Hippo bridge'den gelen tema token'ları `<html>` elementine CSS variable olarak yazılır:

```css
:root {
  --hippo-bg: #ffffff;
  --hippo-fg: #1a1a2e;
  --hippo-primary: #6c63ff;
  --hippo-secondary: #f0f0f0;
  --hippo-border: #e2e8f0;
  --hippo-error: #ef4444;
  --hippo-success: #22c55e;
  --hippo-radius: 12px;
  --hippo-font: 'Inter', sans-serif;
}
```

### Tailwind Mapping

```javascript
// tailwind.config.ts
colors: {
  'hippo-bg': 'var(--hippo-bg)',
  'hippo-fg': 'var(--hippo-fg)',
  'hippo-primary': 'var(--hippo-primary)',
  // ...
}
```

Dark mode, Hippo'dan gelen `theme.mode` değerine göre `<html class="dark">` toggle'ı ile yönetilir.

---

## Hata Yönetimi

### Katmanlar

```
ErrorBoundary (App root)          ← React render hataları
    └── BridgeErrorHandler        ← Bridge bağlantı hataları
        └── QueryErrorBoundary    ← API hataları (TanStack Query)
            └── Page components
```

### Hata Tipleri

```typescript
class BridgeError extends Error {
  constructor(message: string, public code: BridgeErrorCode) { ... }
}

class BridgeTimeoutError extends BridgeError { ... }
class BridgeNotAvailableError extends BridgeError { ... }

// API hataları: Axios + TanStack Query ErrorBoundary ile handle edilir
```

### Fallback UI Stratejisi

| Hata | Kullanıcıya Gösterilen |
|---|---|
| Bridge timeout | "Bağlantı kurulamadı, tekrar deneyin" + Yenile butonu |
| API 5xx | "Sunucu hatası, birazdan tekrar deneyin" |
| API 4xx (401) | Otomatik token yenileme, başarısız olursa login |
| API 4xx (404) | "Maç bulunamadı" |
| Render crash | "Bir şeyler ters gitti" + Sayfayı yenile butonu |
| Offline | Üstte sarı banner: "İnternet bağlantısı yok" |

---

## Güvenlik

### Token Yönetimi
- Token **asla** `localStorage` veya `sessionStorage`'a yazılmaz
- Memory'de tutulur (Zustand store), uygulama kapanınca sıfırlanır
- Her API isteğinde Axios interceptor bridge'den taze token alabilir

### Bridge Mesaj Güvenliği
- Tüm incoming mesajlar Zod ile parse edilir
- Bilinmeyen mesaj tipleri `warn` log'uyla drop edilir
- `postMessage` target origin Hippo domain'iyle sınırlanır (mümkünse)

### XSS
- Kullanıcı içeriği (takım adı, kullanıcı adı) her zaman React'in güvenli render'ından geçer
- `dangerouslySetInnerHTML` kullanılmaz
- Dış linkler `rel="noopener noreferrer"` ile açılır

---

## Performance

### Bundle Optimizasyonu
- Route-based code splitting (`React.lazy`)
- Her feature kendi chunk'ı (fixtures, predictions, leaderboard ayrı)
- Takım logoları `loading="lazy"` ile yüklenir

### WebView Özel Optimizasyonlar
- İlk render'da beyaz ekranı önlemek için splash screen bridge hazır olmadan kapanmaz
- Kritik CSS inline'dır (tema variable'ları)
- `vite build` çıktısı: tek HTML, minified JS/CSS, `base: './'`

### Caching Stratejisi
- Fixtures: `staleTime: 60_000` (1 dakika)
- Live maçlar: `staleTime: 15_000` (15 saniye), `refetchInterval: 15_000`
- Leaderboard: `staleTime: 30_000` (30 saniye)
- Kullanıcının tahminleri: `staleTime: Infinity` (değişmez, mutation sonrası invalidate)

---

## Backend Kontratı

### Endpoint'ler

```
GET    /fixtures
       ?status=scheduled|live|finished
       &limit=20
       &offset=0
       → FixtureListResponse

GET    /fixtures/:matchId
       → Match

POST   /predictions
       body: CreatePredictionRequest
       → Prediction

GET    /predictions
       ?matchId=...&userId=...
       → PredictionListResponse

GET    /leaderboard
       ?limit=50&offset=0&period=all|weekly|monthly
       → LeaderboardResponse

GET    /leaderboard/me
       → LeaderboardEntry
```

### Auth
Tüm endpoint'ler `Authorization: Bearer <hippo-token>` gerektirir.
Backend, token'ı Hippo'nun auth servisiyle doğrular.

### Puan Hesabı
Puan hesabı **backend'de yapılır**, maç tamamlandıktan sonra bir job ile güncellenir.

```
Kesin skor doğru → 3 puan
Sadece kazanan doğru → 1 puan
Yanlış → 0 puan
```

---

## Geliştirici Rehberi

### Kurulum

```bash
git clone <repo>
cd hippo-football-plugin
npm install
cp .env.example .env.local
# .env.local içinde VITE_API_BASE_URL'yi doldur
npm run dev
```

### Geliştirme Modları

```bash
npm run dev           # Browser'da MockBridge ile (Hippo gerekmez)
npm run dev:webview   # WebView simülasyonu (PostMessageBridge)
npm run build         # Production build
npm run preview       # Build'i local'de önizle
npm run test          # Testleri çalıştır
npm run test:coverage # Coverage raporu
npm run lint          # Lint kontrol
npm run format        # Prettier format
```

### Yeni Bir Bridge Mesajı Ekleme

1. `src/bridge/types.ts`'de `OutgoingMessageType` enum'una ekle
2. `HippoBridge` interface'ine metodu ekle
3. Tüm implementasyonlarda metodu implement et:
   - `HippoSDKBridge.ts`
   - `PostMessageBridge.ts`
   - `MockBridge.ts`
4. `src/bridge/__tests__/` altına test yaz

### Yeni Bir Feature Ekleme

```bash
mkdir -p src/features/<name>/{components,hooks}
touch src/features/<name>/<Name>Page.tsx
touch src/features/<name>/hooks/use<Name>.ts
touch src/features/<name>/index.ts
```

Route'u `src/routes/router.tsx`'e ekle.
`index.ts`'den sadece public API'yi export et.

### Commit Konvansiyonu

```
feat(fixtures): maç listesi pagination eklendi
fix(bridge): iOS'ta double message event düzeltildi
chore(deps): TanStack Query v5.1.0'a güncellendi
test(leaderboard): polling testi eklendi
docs(arch): bridge timeout davranışı belgelendi
```

---

## Açık Sorular (Hippo Takımıyla Netleştirilecek)

- [ ] `@gethippoai/host-sdk` paketi ne zaman public olacak?
- [ ] Manifest schema'nın kesin formatı nedir?
- [ ] Plugin'in Hippo sidebar'ında mı yoksa tam ekranda mı açılacağı?
- [ ] Push notification (maç başladı / bitti) için bridge mesajı var mı?
- [ ] Token süresi ne kadar? Yenileme mekanizması nasıl?
- [ ] Hippo'nun design token listesi paylaşılabilir mi?
