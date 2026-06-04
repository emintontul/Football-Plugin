
  İki ayrı proje birlikte çalışıyor:

  [Hippo Mobil App]
        │
        │  SDK / PostMessage / WebView
        ▼
  [Plugin — React/Vite]  ←──── HTTP ────→  [API — Hono/Node]
    (bu repo)                                (Hippo-Football-API)
                                                    │
                                            [PostgreSQL DB]
                                                    │
                                       [football-data.org API]

  Plugin, Hippo'nun mobil uygulaması içinde bir mini-app olarak çalışıyor. Bağımsız bir web uygulaması değil — host uygulamanın içine gömülü.

  ---
  Plugin Tarafı (Frontend)

  Bridge Sistemi — Host'a Bağlanma

  Plugin açıldığında ilk iş host'u tanımak:

  tryLoadSDKBridge()        → Hippo web SDK varsa bağlan
    ↓ başarısız
  window.ReactNativeWebView → React Native WebView'daysa PostMessage kullan
    ↓ yok
  MockBridge                → Geliştirme ortamı (production'da hata fırlatır)

  Bridge üzerinden 4 şey alınır: kullanıcı bilgisi, auth token, tema (dark/light + CSS değişkenleri), locale (dil).

  Tema Sistemi

  useHippoTheme() hook'u bridge'den CSS token'larını alır ve document.documentElement'e CSS custom property olarak yazar. Tüm renkler --hippo-primary, --hippo-bg gibi değişkenlerden gelir —
  Tailwind'deki bg-hippo-primary bunları okur. Bu sayede Hippo'nun tema değişikliği anında plugine yansır.

  i18n

  Bridge'den locale ('tr', 'en-US' vb.) alınır. locales/tr.json ve locales/en.json'dan string'ler yüklenir. t('key', { param: value }) şeklinde kullanılır. Intl.DateTimeFormat çağrıları da locale'e göre
   çalışır.

  Routing

  / → /fixtures (otomatik yönlendirme)
  /fixtures         → FixturesPage
  /leaderboard      → LeaderboardPage
  /predict/:matchId → PredictPage

  createHashRouter kullanılıyor — host uygulamanın URL sistemiyle çakışmamak için hash-based (#/fixtures gibi).

  Veri Akışı

  TanStack Query ile cache'li veri çekimi:

  useFixtures()        → GET /fixtures          (staleTime: 30s)
  useFixture(id)       → GET /fixtures/:id      (staleTime: 30s)
  useHeadToHead(id)    → GET /fixtures/:id/head2head  (staleTime: 5dk)
  usePredictions()     → GET /predictions       (staleTime: 60s)
  useLeaderboard()     → GET /leaderboard       (staleTime: 30s)

  API isteklerinde bridge'den alınan JWT token Authorization: Bearer <token> header'ına ekleniyor.

  Ekranlar

  FixturesPage — Maç listesi:
  - Filtreler: Tümü / Bugün / Bu Hafta
  - Liga dropdown'u (dinamik, maçlardan çıkarılıyor)
  - Her maç kartında: skor/dakika/durum + kullanıcının tahmini (varsa)
  - live maçta anlık puan beklentisi gösteriyor (potansiyel +1 veya +3)
  - finished maçta ilk yarı skoru gösteriyor

  PredictPage — Tahmin ekranı:
  - Mevcut tahmin varsa state'e yükleniyor (0-0 default yerine)
  - Skor girişi: +/- butonlarıyla 0–15 arası
  - H2H bölümü: geçmiş karşılaşmalar (veri varsa)
  - Puan sistemi hatırlatıcısı: 3 / 1 / 0
  - "Kaydet" veya "Güncelle" (tahmin durumuna göre)

  LeaderboardPage — Sıralama:
  - Tüm zamanlar / Haftalık / Aylık
  - Kullanıcı araması (istemci tarafında filtre)
  - "Senin sıran" kartı en üstte

  ---
  API Tarafı (Backend)

  Endpoint'ler

  GET  /fixtures               → Tüm maçlar
  GET  /fixtures/:id           → Tek maç detayı
  GET  /fixtures/:id/head2head → H2H (DB cache → football-data.org)

  GET  /predictions            → Kullanıcının tahminleri
  POST /predictions            → Tahmin kaydet/güncelle (upsert)

  GET  /leaderboard            → Sıralama (page/limit/period)

  POST /sync/fixtures          → Tüm fikstürü football-data.org'dan çek
  POST /sync/live              → Bugünkü maçları güncelle (1-2 dk'da bir)
  POST /sync/settle            → Bitmiş maçların puanlarını hesapla
  POST /sync/settle/:matchId   → Tek maç settle

  Veritabanı Şeması

  users          → Hippo JWT'den gelen kullanıcılar (id = JWT sub)
  fixtures       → Maçlar (football-data.org'dan sync)
    ├─ status: scheduled | live | finished | postponed
    ├─ homeScore, awayScore, minute, injuryTime
    └─ halfTimeHome, halfTimeAway
  head_to_head   → H2H cache (matchId PK, 7 gün TTL, JSONB)
  predictions    → Tahminler (matchId + userId = unique)
    └─ outcome: home | draw | away
       homeScore?, awayScore?, points?

  Puan Sistemi (scoring.ts)

  // Tam skor → 3 puan
  if (pred.homeScore === result.homeScore && pred.awayScore === result.awayScore) return 3;

  // Doğru kazanan/beraberlik → 1 puan
  if (pred.outcome === actualOutcome(result)) return 1;

  return 0;

  Settle Mantığı

  POST /sync/live çağrıldığında:
  1. football-data.org'dan bugünkü maçlar çekilir
  2. DB'ye upsert edilir (skor, dakika, durum güncellenir)
  3. settleMatches() çağrılır

  settleMatches():
  - status = 'finished' ve points = null olan tahminleri bulur
  - Her tahmin için calculatePoints() çalıştırır
  - DB'ye yazar

  ---
  Güvenlik

  Her API isteği Hippo'nun JWT token'ını doğrular (jose kütüphanesi, HS256). Token'da sub (userId) ve display_name var. Kullanıcı ilk tahmininde otomatik users tablosuna insert edilir — kayıt akışı yok.

  ---
  Geliştirme vs Production

  ┌─────────────────────┬───────────────────────────────────────┬──────────────────────────────────────────┐
  │        Ortam        │                Bridge                 │                   Veri                   │
  ├─────────────────────┼───────────────────────────────────────┼──────────────────────────────────────────┤
  │ VITE_MOCK_MODE=true │ MockBridge                            │ Hard-coded mock fixtures/predictions/H2H │
  ├─────────────────────┼───────────────────────────────────────┼──────────────────────────────────────────┤
  │ Dev (API çalışıyor) │ MockBridge                            │ Gerçek DB, gerçek football-data.org      │
  ├─────────────────────┼───────────────────────────────────────┼──────────────────────────────────────────┤
  │ Production          │ HippoSDKBridge veya PostMessageBridge │ Gerçek her şey                           │
  └─────────────────────┴───────────────────────────────────────┴──────────────────────────────────────────┘

  ---
  Veri Akışı — Tipik Kullanıcı Yolculuğu

  1. Hippo app plugini açar
     → Bridge handshake (SDK/PostMessage/Mock)
     → JWT token alınır
     → Tema CSS'e yazılır

  2. FixturesPage yüklenir
     → GET /fixtures (token ile)
     → GET /predictions (kullanıcının tahminleri)
     → Maçlar + tahmin durumları birleştirilerek gösterilir

  3. Kullanıcı bir maça tıklar → PredictPage
     → GET /fixtures/:id (maç detayı)
     → GET /fixtures/:id/head2head (H2H, DB cache miss ise football-data.org'a gider)
     → GET /predictions (cache'de, tekrar istek atmaz)
     → Mevcut tahmin varsa form pre-fill edilir

  4. Kullanıcı skoru girir, "Kaydet"
     → POST /predictions (upsert)
     → Toast gösterilir
     → /fixtures'a yönlendirme

  5. Maç biter (sunucu tarafı, cron ile)
     → POST /sync/live her 1-2 dakikada çalışır
     → Skor DB'ye yazılır
     → settleMatches() tahminlere puan verir

  6. Kullanıcı sıralamaya bakar
     → GET /leaderboard
     → Kendi sırası vurgulanır