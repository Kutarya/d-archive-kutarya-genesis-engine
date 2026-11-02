# Genesis 1.1 kabul kaydı

12 Ekim 2026. Yalnız `D:/Kutarya-Genesis-Engine` değiştirildi. Yeni bağımlılık/global kurulum, uzak push veya yayın yok. Geliştirme adresi `http://127.0.0.1:5173/`.

## Teslim edilen değişiklikler

- Uygulama içi seçilim laboratuvarı: 1–3 bağımsız tohum, ayarlanabilir seçilim/test süresi, ayrı Worker, gerçek adım ilerlemesi, anında iptal, eşlenmiş sonuç tablosu ve runtime bilgili JSON raporu.
- Gerçek yaşayan DNA histogramları, başlangıç kurucu ortalaması, standart sapma, nesil dağılımı, baskın soylar ve motorun ölüm kategorileri. Analiz 1 Hz; soy yüzdelerinin paydası aynı analiz örneğidir.
- Dengeli, besince zengin, sıcak/kıt ve soğuk senaryolar. Seçim mevcut evreni değiştirmez; Yeni evren ile uygulanır.
- Duraklatmada bir tick / yaklaşık bir simülasyon saniyesi, güvenli klavye kısayolları ve gerçek geçmiş CSV aktarımı.
- 1.0 şema/DNA/RNG ve simülasyon kuralları korunur. Kaynak yedeği `releases/Genesis-1.0.0-source-20261012-213406.zip`. Eski kayıt ve ölçümler `reports/1.0/` içindedir.

## Doğrulama

- Vitest **32/32** başarılı. Strict TypeScript ve üretim build başarılı; lint 0 hata/uyarı.
- Mevcut Edge akışları **10/10**; yeni araştırma akışları **12/12**. Geliştirme ve üretim `/genesis/` yolunda çalıştı. Sayfa hatası/dış servis isteği yok.
- 1.0 kayıt dosyası tam durumla yüklendi. Aynı tarayıcıda kaydet/yükle ve deney boyunca açık evrenin durumu tam eşitlikle karşılaştırıldı.
- Tek tick, yaklaşık 1 sn ve klavye adımlaması; gerçek DNA/histogram ortalamaları, CSV geçmişi, iptal, doğru pozitif/negatif gösterimi ve 390 px arayüz doğrulandı.
- Aynı Edge ortamı, aynı tohum ve yeni deney Worker'ıyla tekrarlanan uzun deneyin bütün sonuçları tam eşleşti.
- Üç tohumlu kısa kuyruk altı eşlenmiş testi üretti. Henüz üreme olmayan koşular seçilim başarısı gibi sunulmadı; yinelenen tohumlar arayüzde reddedildi.
- Ayrı Node regresyonunda üç eski seed'in bütün sonuçları 1.0 ile tam eşleşti (`reports/algorithm-regression-1.1.json`).

İlk yeni browser testi Node/Edge arasında bit eşitliği beklediği için başarısız oldu. `tanh/sin/cos` gibi matematik hesaplarında yaklaşık 1e-16 farklar görüldü; uzun ekosistemde bu farklar dallanan kararları ve doğumları da etkiliyor. Test düzeltildi: kısa çapraz ortam fizik karşılaştırması 1e-9 mutlak toleransla, uzun deney tekrarı aynı runtime'da tam eşitlikle sınanır. Motoru değiştiren bir yuvarlama veya sonuç uydurma eklenmedi. Farklı runtime'larda uzun deney için eşit sonuç garantisi yoktur.

## Gerçek ölçümler

Intel i5-12450H, Node24.15.0, 300 motor adımı:

| Canlı | Ortalama adım | p95 |
|---|---:|---:|
| 500 | 1,119 ms | 1,522 ms |
| 1.000 | 2,135 ms | 2,525 ms |

Headless Edge / WebGL, 1440×1000, DPR1, altışar 1 sn örnek: **500 ve 1.000 canlıda 144 ortalama FPS, 60 motor adımı/sn**. Nüfus ölçüm boyunca tam hedef sayıydı. Kısa koşudur; her cihazda garanti değildir veya önceki ölçüme göre algoritmik hızlanmayı kanıtlamaz. Deney çalışırken FPS için ayrı bir performans kabulü yapılmadı; ölçüm boşta araştırma paneliyle yapıldı.

Browser `genesis-a`, 120 sn seçilim + 60 sn test: **188 doğum, 155 yaşayan, maksimum nesil4**. İki eşlenmiş testte ortalama sağkalım farkı **−0,280208 sn**, besin/canlı farkı **+5,2**. Bir testte sağkalım **−1,1425**, diğerinde **+0,582083 sn**. Sonuç olumlu evrim diye etiketlenmedi. Üst sınır60 sn ve az sayıda tohum nedeniyle istatistiksel anlamlılık iddiası yok.

## Kanıt dosyaları ve sınırlar

`reports/tests-1.1.json`, `browser-acceptance.json`, `research-acceptance-1.1.json`, `multiseed-acceptance-1.1.json`, `research-browser-experiment-1.1.json`, `research-browser-repeat-1.1.json`, `benchmark.json`, `browser-performance.json`; masaüstü/mobil görüntüleri `research-desktop-1.1.png`, `research-mobile-1.1.png`.

2.0/3.0 tür/avcı/DNA editörü/evrim ağacı/3D işleri eklenmedi. Deney raporları kullanıcı indirene kadar bellektedir; IndexedDB evren kayıtları korunur. Native sekme görünürlüğü ve fiziksel telefon kabulündeki 1.0 sınırlamaları devam eder.
