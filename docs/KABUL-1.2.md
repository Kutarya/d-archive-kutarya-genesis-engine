# Genesis 1.2 - oynanabilirlik ve tasarım kabulü

12 Ekim 2026. Proje `D:/Kutarya-Genesis-Engine`. 1.1 kaynakları `releases/Genesis-1.1.0-source-20261012-221149.zip` içinde korundu. Yeni bağımlılık veya global kurulum yok; başka projeler değişmedi, yayın/push yapılmadı.

## Kullanılabilir özellikler

- Dünya araç çubuğu: seç, besle, canlı, tehlike, temizle; hız ve duraklatma. Klavye1–5 ve Boşluk, erişilebilir kullanım rehberi.
- Ayarlanabilir dairesel besin fırçası. Sürükleme gerçek kaynak ekler; sağ/orta tuş kamerayı taşır. Fiilen eklenen miktar bildirilir; kapasite aşılmaz. Temizle yalnız en yakın erişilebilir tehlikeyi kaldırır.
- Gerçek kamera çerçeveli, örneklenmiş mini harita. Büyük odak görünümü, seçili canlıya yaklaş/takip, gerçek konum örneklerinden hareket izi, canlı hover bilgisi. Hücre dokusu ve okunaklı tipografi yenilendi.
- İlk temas, Yaşamı koru ve Kıtlık dengesi görevleri. Hedefler gerçek gözlem, besin yerleştirme, nüfus ve doğumdan gelir. Bütçe ve sabit koşullar Worker'da denetlenir; bitişte simülasyon durur. Yeniden dene ve aynı dünyada serbest keşif çalışır.
- Yeni/yüklenen evrenin görüntü kimliği ayrı tutulur: eski canlının interpolasyonu, hareket izi ve olayları yeni dünyaya taşınmaz. Enerji halkasının yanlış başlangıç noktasından çizgi üretmesi görsel QA sırasında düzeltildi.

## Test kanıtı

- Vitest **42/42**. Strict TypeScript ve üretim build başarılı; lint hata/uyarı yok.
- Eski kayıt/brain/IndexedDB/JSON/Canvas/mobil akışları **10/10**, araştırma akışları **12/12**; `/genesis/` üretim yolunda geçti. 1.0 kaydı tam dünya/DNA/RNG durumuyla yüklendi.
- Yeni oynama kontrolleri **13/13** üretim browser koşusunda geçti. Boyama, sağ tuş pan, gerçek tehlike temizleme, harita, klavye harita kontrolü, odak ve Escape/inert geri dönüşü, kılavuz, gerçek beyin, görev bitişi, yeniden dene, serbest mod ve mobil dokunma/pinch sınandı.
- Zamanlı görevlerde Worker üzerinden oyuncunun kullanabildiği besin/elle adım komutları ile pilot yürütüldü; DNA, enerji veya toplamlar değiştirilerek başarı uydurulmadı. Bütçe tükendikten sonraki ek müdahale bütün dünya durumunu değiştirmeden reddedildi.
- 390px mobil arayüzde yatay taşma yok; tek dokunma besin ekliyor, iki parmak zoom kaynak eklemiyor. Bu fiziksel telefon testi değildir.
- Node'da üç eski evrim seed'inin bütün sonuçları 1.0 referansı ile tam eşleşti; çekirdek ağ/genetik/enerji/seçilim kuralları değiştirilmedi. Araştırma algoritması raporları yöntem sürümü1.1'i kullanmaya devam eder.

## Görev ve performans ölçümü

Node pilotunda müdahalesiz dünyalar besin eylemi hedefini karşılamadı. Oyuncu komutları kullanan pilot iki zamanlı görevi tamamladı. Besin yardımının etkisi tek yönlü değildir: kıtlık dünyasında yardım doğumu44→52 artırırken son nüfusu32→28 azalttı. Bu sonuç araştırma başarısı gibi sunulmaz.

Browser pilotu kendi runtime ve başlangıç duraklatma zamanlamasıyla çalışır; rapordaki gerçek nüfus/doğum değerleri `reports/play-acceptance-1.2.json` içinde. Node/browser veya farklı oyuncu eylem zamanlamaları aynı sayıyı garanti etmez. Hedeflerin tamamlanabilmesi sınandı; her oyun kazanılacak diye kodlanmadı.

Headless Edge / gerçek WebGL, 1440×1000, DPR1, altışar1s örnek:

| Gerçek nüfus | Ort. FPS | Min. FPS | Motor adımı/sn |
|---|---:|---:|---:|
| 500 | 144 | 144 | 60 |
| 1.000 | 143 | 139 | 60 |

Bu bilgisayar i5-12450H. Kısa, serbest keşif koşusudur; bütün cihaz veya aktif yoğun boyama için performans garantisi değildir.

## Dosyalar ve sınırlar

`reports/tests-1.2.json`, `play-acceptance-1.2.json`, `challenge-pilot-1.2.json`, `browser-acceptance.json`, `research-acceptance-1.1.json`, `algorithm-regression-1.1.json`, `browser-performance.json`. Görüntüler: `laboratory-1.2.png`, `microscope-1.2.png`, `play-mobile-1.2.png`.

Görev hedef/bütçe ilerlemesi oturumla sınırlıdır. Evrenin biyolojik durumu JSON/IndexedDB ile korunur; yüklemek serbest keşif açar ve kayıt penceresi bunu açıklar. 2.0/3.0 tür, avcı-av, DNA editörü, evrim ağacı ve3D eklenmedi. 1.1'in native arka plan sekmesi/gerçek cihaz doğrulama sınırları sürer. Geliştirme sunucusu `http://127.0.0.1:5173/`; başlatma `npm run dev`.
