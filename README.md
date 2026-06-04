Hippo Football Plugin

> Hippo mobil uygulaması içine gömülü maç tahmin mini-app'i — fixture listesi, skor tahmini ve kullanıcı sıralaması.
## Mimari

Bu proje iki ayrı parçadan oluşuyor: **Plugin** (bu repo) ve **Hippo-Football-API**. Plugin bağımsız bir web uygulaması değil — Hippo'nun React Native uygulaması içine WebView/SDK ile gömülü bir mini-app.

```
[Hippo Mobile App]
      │
      │  SDK / PostMessage / WebView
      ▼
[Plugin — React/Vite]  ←── HTTP ──→  [API — Hono/Node]
    (bu repo)                               │
                                    [PostgreSQL DB]
                                            │
                               [football-data.org API]
```

---

## Nasıl çalışır?

### Bridge sistemi — Host'a bağlanmak

Plugin açıldığında ilk iş içinde çalıştığı ortamı anlamak:

1. **Hippo Web SDK** varsa ona bağlanır.
2. Yoksa **React Native WebView** üzerinden PostMessage kullanır.
3. İkisi de yoksa **MockBridge** devreye girer (sadece geliştirme için; production'da hata fırlatır).

Bridge üzerinden 4 şey alınır: kullanıcı bilgisi, JWT auth token, tema (dark/light + CSS değişkenleri), locale (dil).

### Tema sistemi

`useHippoTheme()` hook'u bridge'den gelen renk token'larını alıp `document.documentElement`'e CSS custom property olarak yazar. Tailwind sınıfları (`bg-hippo-primary` gibi) bu değişkenleri okur. Hippo'daki tema değişikliği anında plugin'e yansır.

### Çoklu dil (i18n)

Bridge'den gelen locale bilgisine (`tr`, `en-US` vb.) göre `locales/tr.json` veya `locales/en.json` yüklenir. Kullanım: `t('anahtar', { parametre: değer })`. Tarih/saat formatlaması da aynı locale'i takip eder.

### Routing

Hash-based router kullanılıyor (`createHashRouter`) — host uygulamanın URL yapısıyla çakışmamak için.

| Route | Sayfa |
|---|---|
| `/` | → `/fixtures`'a yönlendirir |
| `/fixtures` | Maç listesi |
| `/leaderboard` | Sıralama tablosu |
| `/predict/:matchId` | Tahmin ekranı |

---

## Ekranlar

### 🗓 Maç listesi (`/fixtures`)
- Zaman filtresi: Tümü / Bugün / Bu Hafta
- Lig dropdown'u (dinamik, maçlardan çıkarılıyor)
- Her kartta skor, dakika, durum ve kullanıcının tahmini
- Canlı maçta potansiyel puan gösterimi (+1 veya +3)
- Biten maçlarda ilk yarı skoru

### ✏️ Tahmin ekranı (`/predict/:matchId`)
- +/- butonlarıyla skor girişi (0–15 arası)
- Mevcut tahmin varsa form pre-fill edilir
- H2H geçmişi bölümü (veri varsa)
- Puan sistemi hatırlatıcısı
- "Kaydet" veya "Güncelle" (tahmin durumuna göre)

### 🏆 Sıralama (`/leaderboard`)
- Tüm zamanlar / Haftalık / Aylık filtreleri
- Kullanıcı araması (client-side)
- "Senin sıran" kartı en üstte vurgulanır

---

## Veri çekimi

TanStack Query ile cache'li sorgular. Her istekte bridge'den alınan JWT token `Authorization: Bearer <token>` olarak eklenir.

| Hook | Endpoint | Cache süresi |
|---|---|---|
| `useFixtures()` | `GET /fixtures` | 30 saniye |
| `useFixture(id)` | `GET /fixtures/:id` | 30 saniye |
| `useHeadToHead(id)` | `GET /fixtures/:id/head2head` | 5 dakika |
| `usePredictions()` | `GET /predictions` | 60 saniye |
| `useLeaderboard()` | `GET /leaderboard` | 30 saniye |

---

## API endpoint'leri

### Fikstür
```
GET  /fixtures                   → Tüm maçlar
GET  /fixtures/:id               → Tek maç detayı
GET  /fixtures/:id/head2head     → H2H geçmişi (DB cache → football-data.org, 7 gün TTL)
```

### Tahminler
```
GET  /predictions                → Kullanıcının tahminleri
POST /predictions                → Tahmin kaydet / güncelle (upsert)
```

### Sıralama
```
GET  /leaderboard                → Sıralama (page / limit / period destekli)
```

### Sync (cron ile tetiklenir)
```
POST /sync/fixtures              → Fikstürü football-data.org'dan çek
POST /sync/live                  → Bugünkü maçları güncelle (1-2 dk'da bir)
POST /sync/settle                → Biten maçların puanlarını hesapla
POST /sync/settle/:matchId       → Tek maç puanlaması
```

---

## Veritabanı şeması

| Tablo | Açıklama |
|---|---|
| `users` | Hippo JWT'den gelen kullanıcılar (`id = JWT sub`) |
| `fixtures` | Maçlar — status, skor, dakika, ilk yarı skoru |
| `head_to_head` | H2H cache — matchId PK, 7 gün TTL, JSONB |
| `predictions` | Tahminler — `matchId + userId` unique, outcome + puan |

Fixture status değerleri: `scheduled` · `live` · `finished` · `postponed`

---

## Puan sistemi

Puanlama mantığı `scoring.ts` içinde:

```ts
// Tam skor → 3 puan
if (pred.homeScore === result.homeScore && pred.awayScore === result.awayScore) return 3;

// Doğru kazanan / beraberlik → 1 puan
if (pred.outcome === actualOutcome(result)) return 1;

return 0;
```

| Durum | Puan |
|---|---|
| Skor tam tuttu | **3** |
| Kazanan / beraberlik doğru | **1** |
| İkisi de tutmadı | **0** |

---

## Güvenlik

Her API isteği Hippo'nun JWT token'ını doğruluyor (`jose` kütüphanesi, HS256). Token'daki `sub` alanı kullanıcı ID'si olarak kullanılıyor. Ayrı bir kayıt akışı yok — kullanıcı ilk tahminini kaydettiğinde otomatik olarak `users` tablosuna ekleniyor.

---

## Ortamlar

| Ortam | Bridge | Veri |
|---|---|---|
| `VITE_MOCK_MODE=true` | MockBridge | Hard-coded mock fixture/prediction/H2H |
| Dev (API çalışıyor) | MockBridge | Gerçek DB + gerçek football-data.org |
| Production | HippoSDKBridge veya PostMessageBridge | Her şey gerçek |

---

## Tipik kullanıcı akışı

```
1. Uygulama açılır
   → Bridge handshake (SDK / PostMessage / Mock)
   → JWT token alınır
   → Tema CSS'e yazılır

2. FixturesPage yüklenir
   → GET /fixtures + GET /predictions (paralel)
   → Tahmin durumları maç kartlarına işlenir

3. Kullanıcı bir maça tıklar → PredictPage
   → GET /fixtures/:id + GET /fixtures/:id/head2head
   → Predictions cache'den gelir, tekrar istek atılmaz
   → Mevcut tahmin varsa form pre-fill

4. Kullanıcı skoru girer → "Kaydet"
   → POST /predictions (upsert)
   → Toast gösterilir → /fixtures'a yönlendirme

5. Maç biter (sunucu tarafı, cron ile)
   → POST /sync/live her 1-2 dakikada tetiklenir
   → Skor DB'ye yazılır
   → settleMatches() tahminlere puan verir

6. Kullanıcı sıralamaya bakar
   → GET /leaderboard
   → Kendi sırası vurgulanır
```

---

## Teknoloji

**Frontend:** React · Vite · TanStack Query · React Router (hash) · Tailwind CSS

**Backend:** Hono · Node.js · PostgreSQL · jose (JWT) · football-data.org API
