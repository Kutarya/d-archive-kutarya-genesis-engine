# Genesis 1.0 kabul kaydı

12 Ekim 2026. Proje `D:/Kutarya-Genesis-Engine`; yeni klasör oluşturuldu, diğer projeler değiştirilmedi. D: başlangıçta yaklaşık 84 GiB boş. Node24.15.0/npm11.12.1 uygun; global kurulum değişmedi. Uzak push/yayın yapılmadı.

## Sonuç

- Strict TypeScript ve `npm run build` geçti. Üretim `dist/` statiktir.
- Oxlint son koşu:0 hata/uyarı. Render sırasında ref okuması state'e, efekt araç/algılama bağımlılıkları stabil ref'lere taşındı.
- Vitest **23/23**, başarısız/hatalı/atlanan test yok. `reports/tests.json`.
- Gerçek Edge geliştirme ve üretim `/genesis/` kontrolü **10/10**; sayfa hatası ve uygulamanın dış servise isteği0. `reports/browser-acceptance.json` son üretim alt yol koşusudur.
- Canvas2D alternatifi, 390px paneller, kamera zoom/takip, dünya müdahaleleri, gerçek DNA/aktivasyon beyni, JSON ve yenileme sonrası IndexedDB bütünlüğü geçti.
- Gerçek browser API'leri test için engellenerek WebGL yokluğunda otomatik Canvas geçişi ve bütün grafik API'leri yokluğunda anlaşılır mesaj/0FPS/çalışan motor sınandı. `reports/fallback-acceptance.json`; bu iki donanım arızasının simülasyonudur, gerçek bozuk GPU deneyi değildir.
- Beyin SVG'sindeki 27 düğüm/180 bağlantı seçilen organizmanın dışa aktarılmış gerçek ağırlık ve aktivasyonlarıyla karşılaştırıldı.
- Gerçek Worker'a arka plan mesajı gönderildiğinde bütün durum sabit kaldı; görünürlük dönüşünde15 adım/250ms ilerledi, geçmiş duvar zamanı hızlandırılmadı. `reports/worker-acceptance.json`.
- Bir test, dönüşte500ms zamanlayıcının beklenmesi nedeniyle250ms içinde ilerleme görmedi. Görünürlük dönüşünde zamanlayıcı uyandırılarak düzeltildi; son protokol testi geçti.
- Headless Edge diğer sekme önde olsa da `document.visibilityState=visible` kaldı. Native sekme görünürlüğü otomatik kabulü tamamlanmış sayılmadı. Fiziksel telefon/diğer GPU ve tarayıcı testleri yapılmadı.

## Performans

Intel i5-12450H, Node24.15.0, 300 ölçülen sabit adım:

| Canlı | Ort. ms | p95 ms | Motor-only adım/sn |
|---|---:|---:|---:|
| 500 | 1,223 | 1,644 | 817,56 |
| 1.000 | 2,382 | 2,847 | 419,76 |

Edge headless,1440×1000,DPR1, WebGL, gerçek UI sayaçlarından altışar1s örnek:

| Başlangıç / gerçek nüfus | Ort. FPS | Min. FPS | Ort. motor adımı/sn |
|---|---:|---:|---:|
| 500 / 500 | 127 | 126 | 60,33 |
| 1.000 / 1.000 | 125,67 | 120 | 60 |

`reports/benchmark.json`, `reports/browser-performance.json`. Bu koşuların değerleri bütün orta seviye cihazlara genellenmez; Node motor-only hızı browser FPS değildir.

## Seçilim

3 eğitim seed'i / 6 eşlenmiş test. Kurucu sağkalımı58,6729 sn; seçilmiş59,6940 sn; ortalama fark+1,0210 sn. Başlangıç canlı başına besin farkı+6,1417. `genesis-a/assay-01` sağkalım farkı−0,195 sn; gizlenmedi. Eğitimlerde186/208/201 doğum, yaşayan maksimum nesil5.

Metodoloji ve bütün sayılar `reports/evolution.json`, `reports/EVRIM-SONUCU.md` içinde. İstatistiksel anlamlılık iddiası yoktur. Sağkalım60 sn tavanına yakın; tek negatif koşunun nedenleri için ayrı enerji/tehlike/gen ablation deneyi yapılmadı. Daha uzun ve farklı kıtlık koşulları sonraki araştırmalardır.

## Kapsam

1.0 sistemleri uygulanmıştır. Eşeyli üreme, gerçek tür sistemi, avcı-av, DNA editörü, evrim ağacı, çoklu ekosistem karşılaştırması ve3D bu sürümde yoktur;2.0/3.0 kapsamıdır. Kullanıcı verisi istemci tarafındadır. Dev server `http://127.0.0.1:5173/`, yeniden başlatma `npm run dev`.
