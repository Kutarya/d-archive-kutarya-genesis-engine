# Kutarya Genesis Engine 1.4 · Yaşam Bahçesi

Tarayıcıda çalışan, Türkçe yapay yaşam bahçesi ve genetik seçilim laboratuvarı. İlk açılışta canlıların yüzlerini ve hareketlerini görebileceğin yakın bir oyun bahçesi açılır. Simülasyon Web Worker'da, görüntüleme PixiJS 8 WebGL'de çalışır. WebGL yoksa Canvas 2D kullanılır. Hesap, Firebase, Python veya ücretli backend yoktur.

1.4: kısa karşılama ve öne alınmış bahçe; 200% yakın başlangıç kamerası; gerçek yaşayan bir dostu bulup 260% yakın takip; tüm bahçeye tek düğmeyle dönüş. WebGL ve Canvas 2D’de daha belirgin yüzlü canlılar ve hafif çimen dokusu bulunur. **Küçük keşiflerin** kartları gerçek canlı seçimi, başarıyla bırakılan besin ve eklenen dost ile ilerler; araç seçmek tek başına yetmez. Besin kapasitesi doluyken adım tamamlanmaz. Yükleme/yeni dünya bu oturumluk keşifleri temizler. Büyük yeşil seçili araç, görünür hız düğmesi ve geçici işlem bildirimi dokunmayı anlaşılır kılar.

Krem, kayısı, mercan, yeşil ve leylak tema, maskotlar, gerçek doğum/nesil kutlamaları ve laboratuvar korunur. Üstteki dalga düğmesi hareketi azaltır; tercih bu tarayıcıda saklanır ve sistemin hareket azaltma ayarı da uygulanır.

**Oyun bahçesi / Laboratuvar** geçişi açık dünyayı, DNA'yı, RNG'yi ve zamanı değiştirmez. Laboratuvar görünümünde eski kontrol, DNA/beyin, görev, araştırma, kayıt, JSON ve CSV özellikleri kullanılabilir. 1.0 kayıt şeması ve temel simülasyon kuralları korunmuştur. Önceki sürümlerin kaynakları `releases/Genesis-1.*-source-*.zip` içinde saklanır.

## Küçük kaşifler için

- **Hadi besleyelim** veya **Besle**: bahçeye dokunarak ve sürükleyerek gerçek besin bırak.
- **Bir dosta yaklaş / Bir dost bul**: kamera yakınındaki yaşayan bir canlıyı seçip takip eder. Tekrar basmak başka bir dost bulur. **Tüm bahçe** takipten çıkar ve dünyayı ekrana sığdırır.
- **Dost seç**: bir canlıya dokun; gerçek enerji ve nesil bilgisi dost kartında görünür. **Yakından izle** kamerayı ona götürür. Mobilde kart bahçenin üzerinde de görünür.
- **Dost ekle**: bahçeye yeni bir canlı ekle. Bu eylem doğum sayısını artırmaz; doğumlar motorun gerçek üremesinden gelir.
- **Mola ver / Devam et**: simülasyonu ve süs maskotlarının hareketini durdur/sürdür.
- **Yaşam yolculuğu** yaşayan canlılar arasındaki en yüksek nesli gösterir. Yükleme veya yeni dünya eski kutlamayı temizler. Yaşayan nesiller azaldığında yol da bunu yansıtır; bu bir başarı ya da gelişmişlik puanı değildir.
- Zor çevre ayarları ve tehlike ekleme Laboratuvar görünümündedir. Görevlerde araç bütçeleri her iki görünümde de geçerlidir.

## Başlatma

Bu teslim Node.js 24.15.0 / npm 11.12.1 ile geliştirildi. Node 24+ önerilir; sistem kurulumunu değiştirmeyen yerel npm bağımlılıkları kullanılır.

```powershell
cd D:\Kutarya-Genesis-Engine
npm ci
npm run dev
```

Adres: **http://127.0.0.1:5173/**. Başlangıçta çalışan bir evren açılır. Duraklat, hız değiştir, araç seçip dünyaya tıklayarak besin/canlı/tehlike ekle. Tıklama canlı seçer; sürükleme kamerayı taşır; tekerlek veya düğmeler yakınlaştırır. Mobilde kontrol/analiz panelleri açılır; iki parmakla yakınlaştırma desteklenir.

Boşluk duraklatır/devam ettirir; sağ ok duraklatmada bir adım ilerletir. Metin alanında bu kısayollar uygulanmaz. `≈1 sn ilerlet` sabit adım sayısına yuvarlanır. Çevre senaryosu seçmek mevcut dünyayı değiştirmez; **Yeni evren oluştur** ile uygulanır.

## Oyna ve keşfet

**Bir hedef seç** ile İlk temas, Yaşamı koru veya Kıtlık dengesi görevini aç. Görev başlatmak yeni bir görev evreni oluşturur; mevcut evrenini önce kaydedebilirsin. Hedefler gerçek seçim/beyin açma, fiilen bırakılan besin, canlı sayısı ve doğum verilerini kullanır. Zamanlı hedefler simülasyon süresi sonunda değerlendirilir; duraklatabilir veya hızlandırabilirsin. Bütçe Worker'da denetlenir, çevre koşulları görevde sabittir; bitişte motor durur. Yalnız beklemek besin müdahalesi hedeflerini tamamlamaz.

- **1–5** araç seçer. Besle aracında tek parmak/sol tuşla sürüklemek besin bırakır; kapasite kadar gerçek besin eklenir. Fırça daireseldir, yarıçap ayarlanır.
- Seç aracında sürükleme, besin aracında sağ/orta tuş kamerayı taşır. Mobilde iki parmak zoom yapar ve besin yerleştirmez.
- **Temizle** en yakın erişilebilir tek tehlikeyi kaldırır; canlı veya DNA silmez.
- Mini haritaya dokunmak kamerayı taşır. Haritadaki noktalar gerçek popülasyonun sınırlı örneğidir; çerçeve gerçek görüş alanıdır. Klavyede Enter/Boşluk haritayı merkezler.
- **Yakından incele** seçili canlıyı büyütüp takip eder. Hareket izi alınan gerçek konum örneklerinden oluşur. Odak görünümü büyük dünya alanı açar; Escape ile dönülür.
- **Kullanım kılavuzu** kontrolleri açıklar. Görev sonunda Yeniden dene aynı görev tohumunu kullanır; Serbest keşif mevcut biyolojik dünyayı sürdürür.

Görev hedef/bütçe ilerlemesi bu sürümde oturumla sınırlıdır. Evren JSON/IndexedDB kaydı bütün DNA/RNG/dünya durumunu korur; yükleme serbest keşif açar. Görevler yalnız yerel keşif hedefleridir, bilimsel evrim başarısı kanıtı olarak kullanılmaz.

Sayfanın altındaki **Seçilim laboratuvarı** yeni, bağımsız ekosistemlerde deney çalıştırır. 1–3 farklı seed, 1–240 sn seçilim ve 1–120 sn test süresi seçilebilir. Varsayılan 120/60 sn ile başlayın; kısa eğitimlerde henüz doğum oluşmayabilir. Gerçek adım ilerlemesi, iptal, pozitif/negatif farklar ve JSON raporu vardır. Açık dünya durumu değişmez; ek CPU kullanılır. Sonuçlar otomatik kaydedilmez; **Deney raporunu indir** ile saklayın.

Analiz panelindeki **Genetik iz** seçilen özelliğin 12 aralıklı gerçek dağılımını ve başlangıç kurucu ortalamasını gösterir. Yeni eklenen rastgele canlılar yaşayan dağılıma katılır; başlangıç kurucuları değiştirilmez. **CSV indir** en çok 720 geçmiş örneğini aktarır; ondalık ayracı nokta, sütun ayracı virgüldür.

## Sistemler

- Seed tabanlı Mulberry32 RNG, sabit zaman adımı, sınırlı popülasyon ve uzamsal hücre indeksi.
- Gerçek enerji/metabolizma/movement maliyeti, sınırlı besin, sıcaklık stresi, tehlike, yaşlanma ve ölüm.
- Eşeysiz üreme: ebeveyn enerji aktarır, ayrıca doğum maliyeti öder. DNA ve 195 sinir ağı parametresi miras alınır; gen başına sınırlı mutasyon vardır.
- 12 giriş / 12 gizli / 3 çıkışlı tanh ağı: itki, dönüş ve üreme isteği. Besine yönelme elle kodlanmaz; davranış ağırlıklardan çıkar. Geri yayılım yoktur; gen havuzu ekosistemde seçilir.
- DNA boyut/renk/algılama/verim/ömür/hız/maliyet/eşik özelliklerini belirler. Yüksek hız, büyük gövde ve geniş algılama bedelsiz avantaj değildir.
- Gerçek seçili canlının DNA, ebeveyn, enerji, beslenme, yavru ve nöron aktivasyonları. Kamera takip/zoom/sürükleme.
- Altı gerçek geçmiş grafiği. Motor en çok 20 Hz snapshot, arayüz yaklaşık 5 Hz, geçmiş en çok 1 Hz ile gönderilir; geçmiş 720 örnekle sınırlıdır.
- Sürümlü IndexedDB kayıtları; DNA, aktivasyon, RNG, zaman, kimlik sayaçları, çevre ve istatistikler korunur. JSON içe/dışa aktarma; 16 MiB ve şema/sayı/kapasite doğrulaması. Bozuk kayıt mevcut evreni değiştirmez.

Kayıtlar tarayıcı ve web adresine (origin) bağlıdır; farklı port/adres veya tarayıcı için JSON aktarımı kullanın. Dünya kaydını yüklemek simülasyonu duraklatır; Devam et ile sürdürün. Boyut, başlangıç nüfusu ve kapasite Yeni evren ile uygulanır; sıcaklık/besin yenilenmesi/mutasyon canlı ayarlardır. Kalite değişimi motoru sıfırlamaz.

## Test / derleme

```powershell
npm test
npm run typecheck
npm run build
npm run benchmark
npm run experiment
npm run test:garden
npm run test:discovery
```

`npm test`: **42/42**. Motor, genetik, enerji, sinir ağı, ölüm/üreme, aynı seed, kayıt devamı, bozuk değerler ve IndexedDB; parçalı deney tekrarı, histogram/soy/senaryo/CSV; ayrıca fırça sınırları, tehlike temizleme, gerçek işlem miktarı, görev bütçesi ve bitiş koşulları sınanır. `npm run experiment -- yeni-seed-a yeni-seed-b` ile farklı tohumlar kullanılabilir.

Üretim `dist/` tamamen statiktir. Varsayılan `base: './'` alt dizinleri destekler. Alt yol kabulü bu komutla yapıldı:

```powershell
npm run preview -- --base=/genesis/
# http://127.0.0.1:5174/genesis/
```

Sabit yayın yolu istenirse `$env:GENESIS_BASE='/genesis/'` ile build çalıştırılabilir. Yerel dosyaya çift tıklamak yerine HTTP/static hosting kullanın; modül Worker'ı web origin gerektirir. Uzak yayın yapılmadı.

Edge kurulu makinada geliştirme/üretim tarayıcı kontrolleri:

```powershell
npm run test:browser
npm run test:research
npm run test:multiseed
npm run test:play
# Üretim alt yolunda:
$env:GENESIS_TEST_URL='http://127.0.0.1:5174/genesis/'
npm run test:browser
```

Playwright yalnız yerel test bağımlılığıdır; ayrıca tarayıcı veya global araç kurulmadı. Simülasyon için gerekmez.

## Ölçülen sonuç

Bu bilgisayar: Intel i5-12450H. Sonuçlar başka cihaz için garanti değildir.

| Başlangıç canlı | Node motor ort. adım | Edge WebGL ort. FPS | Tarayıcı motor adımı/sn |
|---|---:|---:|---:|
| 500 | 1,12 ms | 144 | 60 |
| 1.000 | 2,14 ms | 143 | 60 |

Node motor ölçümü 1.1'den, değişmeyen çekirdek için 300 adımlık koşudur. Browser ölçümü 1.2 arayüzünde 1440×1000, DPR1, headless Edge'de altışar1s örnektir. Ölçüm boyunca nüfus tam500/1000 idi. FPS gerçek render frame sayacıdır; motor hızı ayrı ölçülür. Kısa koşu bütün cihazlara genellenmez. Yüksek hız hedefi yetişmezse Worker zaman birikimini sınırlar; atlanan hedef süre görünür.

Üç tohum / altı eşlenmiş seçilim deneyinde kurucu ortalama sağkalımı **58,673 sn**, seçilmiş gen havuzu **59,694 sn**; fark **+1,021 sn**. Canlı başına besin farkı **+6,142**. Bir çiftte sağkalım **−0,195 sn** oldu. Bu küçük deney optimal davranış veya istatistiksel anlamlılık kanıtı değildir; 60 sn sağkalım tavanına yakın olması ayırıcılığı azaltır. Sonuçlar ve yöntem `reports/evolution.json`, `reports/EVRIM-SONUCU.md` içinde.

Bu sayılar Node koşusudur. 1.1 Node regresyonunda üç seed'in bütün sonuçları 1.0 ile tam eşleşti (`reports/algorithm-regression-1.1.json`). Node ve Edge'in `tanh/sin/cos` hesaplarındaki çok küçük farklar uzun, dallanan simülasyonlarda doğum/beslenme sonuçlarını değiştirebilir. Bit düzeyinde tekrar aynı çalışma ortamında sınanır; farklı tarayıcı/Node sürümleri arasında garanti verilmez. Browser deney raporu runtime bilgisini içerir. Browser ölçümleri `reports/research-browser-experiment-1.1.json` içindedir; olumsuz sağkalım farkları da raporlanır.

## Sınırlar / sonraki sürümler

1.0 eşeysiz üreme, tek tip besin, uniform sıcaklık ve dairesel tehlikeler kullanır. Genetik çeşitlilik, normalize özellik ve örneklenen ağ ağırlığı dağılımı göstergesidir; biyolojik tür sınıflaması değildir. Başlangıçta veya duraklatmada nöronlar son karar aktivasyonlarını gösterir.

2.0: türler, avcı-av, DNA editörü, evrim ağacı, çoklu ekosistem araştırması. 3.0: 3D, gelişmiş çevre/fizik, büyük ölçekli optimizasyon. Bunlar bu sürümde uygulanmadı.

390 px mobil görünüm ve kontroller gerçek tarayıcıda sınandı; fiziksel telefon testi yoktur. Arka plan **Worker protokolü** gerçek Worker ile doğrulandı; headless Edge sekme geçişinde `visible` kaldığından gerçek native sekme görünürlük geçişi doğrulanmış sayılmaz. Normal uygulama visibilitychange dinler, arka planda motoru bekletir ve dönüşte birikmiş zamanı çalıştırmaz.

Mimari: `docs/MIMARI.md`. Önceki kabuller: `docs/KABUL.md`, `docs/KABUL-1.1.md`. Güncel kabul: `docs/KABUL-1.4.md`. Bütün kaynak ve test/ölçüm dosyaları bu proje klasöründedir.
