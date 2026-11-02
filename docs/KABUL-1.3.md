# Genesis 1.3 · Yaşam Bahçesi — kabul

16 Ekim 2026. Yalnız `D:/Kutarya-Genesis-Engine` içinde yerel geliştirme yapıldı. Uzak yayın/push yapılmadı. Önceki 1.2 kaynakları `releases/Genesis-1.2.0-source-20261016-100328.zip` içinde korunuyor.

## Tamamlanan arayüz

- Varsayılan sade oyun bahçesi; krem, kayısı, mercan, yeşil ve leylak renkler. WebGL ve Canvas 2D dünyası, mini harita, kayıt/görev pencereleri ve laboratuvar açık temada.
- Dört büyük resimli araç; dokunarak besleme/canlı ekleme/seçim ve üç resimli başlangıç adımı. Teknik ayarlar Laboratuvar görünümünde.
- CSS ile çizilen hareketli, göz kırpan maskotlar; yumuşak düğme ve kart tepkileri. Gerçek canlılarda açılma, nefes hareketi; doğumda yayılan halkalar ve noktalar; beslenme parıltısı. Canvas 2D'de de renkli canlılar, gözler ve olay halkaları.
- Yaşayan canlıların en yüksek gerçek nesline bağlı dört aşamalı yaşam yolu. Gerçek doğum ve yeni nesil değişimleri kart/konfeti kutlaması üretir. Yeni dünya/yükleme önceki dünyanın kutlamasını temizler. Bu yol bir bilimsel gelişmişlik puanı değildir.
- Gerçek enerji, nesil ve yavru bilgili dost kartı; yakından takip. Mobilde seçilen dost ayrıca dünyanın üzerinde görünür. Boş bahçeden yeniden canlı eklenebilir.
- Mola, maskot hareketlerini durdurur. Dalga düğmesi süs hareketlerini azaltır, tercih yerelde saklanır; sistemin azaltılmış hareket tercihi canlı olarak uygulanır. Gerçek simülasyon hareketi bu tercihle değiştirilmez.
- Görev bütçeleri sade araçlar ve başlangıç kartlarında da uygulanır. Yeni/yüklenen dünya eski seçili araç ve müdahale bildirimini temizler.

## Korunan sistemler

1.2 kaynak ZIP'iyle SHA-256 karşılaştırmasında motor, Worker, kayıt ve görev kapsamındaki **23 dosya aynı**. DNA, genetik, enerji, sinir ağı, RNG, üreme ve kayıt şeması değiştirilmedi. Yeni bağımlılık eklenmedi. Ayrıntılı laboratuvar, araştırma, görevler, JSON/CSV ve IndexedDB korunuyor.

## Güncel doğrulama

Üretim çıktısı `http://127.0.0.1:5174/genesis/` altında sınandı. Son üretim build/strict TypeScript ve lint başarılı.

| Kontrol | Sonuç |
|---|---|
| Vitest | 42/42 |
| Yeni bahçe kabulü | 10/10 |
| Eski kayıt/JSON/IndexedDB/beyin/Canvas/mobil akışları | 10/10 |
| Dünya araçları ve üç görev | 13/13 |
| Araştırma, eski 1.0 kayıt, CSV, iptal ve tekrarlanabilirlik | 12/12 |
| Çoklu tohum deneyi | 3 koşu, 6 eşlenmiş test; yinelenen tohum reddedildi |
| Grafik API arızası benzetimi | WebGL kapalı: Canvas; bütün API'ler kapalı: açıklayıcı durum; motor devam ediyor |
| Responsive bahçe | 320, 360, 390, 600, 768, 1024, 1440 px; yatay taşma yok |
| Ana bahçe araçları | Bütün ölçülen genişliklerde en az 44×44 px |

Tarayıcı akışlarında toplam 45 kontrol başarılı. Çoklu tohum ve grafik arızası kontrolleri ayrıca geçti. Başarılı koşularda sayfa hatası yok. İsteklerin izlendiği bahçe/kayıt/araştırma koşularında harici ağ isteği yok.

Görev pilotu: Yaşamı koru 90 simülasyon saniyesinde 109 yaşayan / 85 doğum; Kıtlık dengesi 120 saniyede 37 yaşayan / 48 doğum ile tamamlandı. Oyuncunun normal Worker komutları kullanıldı; DNA/enerji/sonuçlar değiştirilmedi. Farklı başlatma/oyuncu zamanlaması farklı sayılar üretebilir.

Headless Edge, WebGL, 1440×1000, her nüfus için altı adet 1 saniyelik örnek:

| Gerçek nüfus | Ortalama FPS | En düşük FPS | Motor adımı/sn |
|---|---:|---:|---:|
| 500 | 143,5 | 143 | 60,17 |
| 1.000 | 143 | 141 | 60 |

Bu kısa yerel ölçümdür; fiziksel telefon veya tüm cihazlar için performans kanıtı değildir. Fiziksel telefon ve native arka plan sekmesi kabulü yapılmadı. Test geliştirmesi sırasında iki eşzamanlı koşu bellek hatasıyla kesildi; son kabul sabit üretim çıktısında sırayla yeniden yürütülüp geçti.

## Kanıt dosyaları

`reports/tests-1.3.json`, `garden-acceptance-1.3.json`, `browser-acceptance-1.3.json`, `play-acceptance-1.3.json`, `research-acceptance-1.3.json`, `multiseed-acceptance-1.3.json`, `fallback-acceptance-1.3.json`, `browser-performance-1.3.json`, `source-changes-1.3.json`.

Görüntüler: `reports/garden-1440-1.3.png`, `garden-390-1.3.png`, `garden-birth-1.3.png`, `garden-friend-mobile-1.3.png`, `research-desktop-1.3.png`, `research-mobile-1.3.png`, `canvas-1.3.png`.

Başlatma: `npm ci`, ardından `npm run dev`; `http://127.0.0.1:5173/`. Üretim: `npm run build`, `npm run preview -- --base=/genesis/`. Görev ilerlemesi oturuma bağlıdır; kayıtlar biyolojik dünya/DNA/RNG durumunu korur. Tür sınıflaması, avcı-av sistemi, DNA editörü ve 3D gibi ayrı sürüm özellikleri bu arayüz yenilemesinin kapsamında değildir.
