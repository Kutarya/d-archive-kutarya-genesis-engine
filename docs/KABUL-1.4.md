# Genesis 1.4 · Yakından keşfet

16–17 Ekim 2026. Çalışma alanı: `D:/Kutarya-Genesis-Engine`.

## Bu turda değişenler

- Büyük karşılama görseli kısa ve doğrudan eylem içeren bir karşılama kartına dönüştürüldü. Canlı bahçe masaüstünde ilk ekranda görünür.
- Bahçe yeni/yüklenen dünyada %200 yakın kamera ile açılır. **Bir dosta yaklaş / Bir dost bul**, kamera yakınındaki yaşayan gerçek bir canlıyı seçip en az %260 yakın takip eder; tekrar basmak başka bir dost bulur.
- **Tüm bahçe**, takipten çıkıp dünyayı merkezler. Daha önce `fit()` çağrısından sonra takip bir sonraki çizimde kamerayı geri götürebiliyordu; bu düzeltildi.
- Gerçek DNA boyutu ve rengine bağlı, yüzleri ve yaprakları daha belirgin canlılar; bahçeye özel hafif çimen çizimi. WebGL ve Canvas 2D desteklenir. Laboratuvarın ızgaralı görünümü korunur. Çizim boyutu simülasyonun fiziksel boyutunu değiştirmez.
- **Küçük keşiflerin**, canlı seçimi ve Worker'ın gerçekten gerçekleştirdiği besin/canlı eklemeleriyle ilerler. Araç seçmek tek başına adım tamamlamaz. Dolu kapasitede ilerleme yoktur; dost eklemek doğum sayısını artırmaz.
- Dünya yükleme/yeni dünya ilerlemeyi, seçimi ve işlem bildirimini temizler. Bu keşif adımları oturuma aittir; kayıt şemasına eklenmez.
- Başarılı işlem miktarı bahçenin üzerinde görünür ve kısa süre sonra kapanır. Hız kontrolü mobilde de açıktır. Seçilen dostun kartı masaüstünde yan panelin başına alınır.
- Keşif kartlarından bahçeye dönüşte araç çubuğu görünür kalır; klavye odağı bahçeye geçer. Odak görünümü dış alanları `inert` yapar; Escape ve azaltılmış hareket desteklenir.

## Korunan sistemler

1.3 öncesi kaynak anlık görüntüsü: `releases/Genesis-1.3.0-before-1.4-20261016-104341.zip`.

SHA-256 karşılaştırmasında `src/engine`, `src/worker`, `src/storage`, `src/game` içindeki **23 TypeScript dosyası aynıdır**. Motor, DNA, RNG, enerji, üreme, Worker protokolü, görev bütçeleri ve 1.0 kayıt şeması değişmedi. Bağımlılık kilidi yalnız proje sürümü dışında önceki kilitle aynıdır; yeni bağımlılık eklenmedi. Önceki sürüm ZIP'leri korundu.

## Doğrulama

Strict TypeScript, üretim build ve lint geçti. Vitest: **42/42**.

Üretim çıktısı `http://127.0.0.1:5174/genesis/` altında Edge/Playwright ile kontrol edildi. Bahçe, kayıt/JSON, görev ve araştırma kontrolleri sırasıyla **10/10, 10/10, 13/13, 12/12** geçti. Yeni yakın keşif kabulü **12/12** geçti; toplam **57 adlandırılmış tarayıcı kontrolü** başarılıdır. Grafik arızası için iki ayrı koşu da geçti.

- Yeni keşif kabulü son üretim derlemesinde tekrarlandı. Seçim/takip/zoom DNA, RNG ve zamanı değiştirmedi; kapasite doluyken sahte ilerleme olmadı.
- 320, 360, 390, 600, 700, 768, 900, 1024, 1440 px genişliklerde taşma yok; dört ana araç en az 44×44 px. Seçili besin aracı ve açık fırça ayarıyla da denetlendi.
- Grafik arızası benzetimi: WebGL kapalıyken Canvas 2D açıldı; bütün grafik API'leri kapalıyken açıklayıcı durum göründü. Her iki koşuda gerçek Worker verisinden gelen simülasyon saati 00:00 → 00:01 ilerledi.
- Başarılı koşularda sayfa hatası yok; ağ isteklerinin izlendiği bahçe, kayıt, araştırma ve yeni keşif koşularında harici istek yok.
- Yaşamı koru pilotu 90 saniyede 117 yaşayan / 90 doğum, Kıtlık dengesi pilotu 120 saniyede 37 yaşayan / 57 doğum ile tamamlandı. Normal Worker komutları kullanıldı; başka oyuncu zamanlaması farklı sonuçlar üretebilir.

Kanıt: `reports/tests-1.4.json`, `garden-acceptance-1.4.json`, `browser-acceptance-1.4.json`, `play-acceptance-1.4.json`, `research-acceptance-1.4.json`, `discovery-acceptance-1.4.json`, `fallback-acceptance-1.4.json`, `source-changes-1.4.json`.

Görseller: `reports/discovery-desktop-1.4.png`, `discovery-mobile-1.4.png`, `discovery-touch-1.4.png`, `discovery-canvas-1.4.png`, `garden-birth-1.4.png`.

Yeni kaynak ve statik web paketlerinin tam yolları, SHA-256 değerleri ve arşiv kontrolleri `reports/release-1.4.json` içindedir.

## Kullanım ve sınırlar

Geliştirme: `npm ci`, `npm run dev`; `http://127.0.0.1:5173/`.

Üretim: `npm run build`, `npm run preview -- --base=/genesis/`. Modül Worker için HTTP origin gerekir. Web ZIP'i bir statik HTTP sunucusunda kullanılmalıdır.

Uzak yayın yapılmadı. Mobil kontroller tarayıcıdaki dokunma emülasyonudur; fiziksel telefon kabulü ve native arka plan sekmesi kabulü yapılmadı. Bu tur yeni biyolojik davranış veya bilimsel evrim başarısı iddiası içermez.

İlk üretim denemesi yerel 5174 önizleme sunucusunun kapanması nedeniyle kesildi. Sunucu yeniden başlatıldı ve ilgili kontroller baştan yürütüldü; yukarıdaki sonuçlar başarılı koşulardır.
