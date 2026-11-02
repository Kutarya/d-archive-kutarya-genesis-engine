# Genesis 1.0 mimarisi

`src/engine` React, PixiJS veya DOM kullanmaz. `World` sabit adımlarla ilerler; Node/Vitest içinde doğrudan kullanılabilir. `src/worker` motorun tek yazıcısıdır. `src/render` yalnız snapshot'ları çizip kamera/seçim olaylarını üretir. `GenesisApp.tsx` parametre, analiz, kayıt ve yerleşimi yönetir; simülasyonu React render döngüsünde çalıştırmaz.

## Bir adım

1. Besin ve adım başlangıcındaki organizma konumları uzamsal indekse alınır.
2. Her canlı en yakın görünür besini, enerji/hız oranını, yakın yoğunluğu, tehlike vektörünü, sıcaklık stresini ve sınır vektörünü algılar.
3. Kalıtsal 12→12→3 tanh ağı gerçek aktivasyonları hesaplar. Ağ itki/dönüş/üreme isteği üretir; kodda besine yönelme davranış politikası yoktur.
4. Konum/yön/hız güncellenir. Fiziksel sınırda yansıma yapılır. Metabolizma, hareket ve tehlike enerjiyi azaltır.
5. Temas edilen besin bir kez tüketilir. Enerji kapasitesinin fazlası depolanmaz. Ölümler kaldırılır.
6. En az 10 sn yaş, enerji eşiği, 8 sn cooldown, düşük tehlike/ısı stresi, ağ isteği ve boş kapasite varsa eşeysiz yavru oluşur. Ebeveyn enerjisinin en fazla %36'sı aktarılır ve ayrı doğum maliyeti düşülür. Yeni yavru aynı adımda yeniden işlenmez.
7. Gen/weight mutasyonları sınırlar içinde kalır. Yavruların DNA dizileri ebeveynle paylaşılmaz. Besin yenilenir; zaman ve geçmiş ilerler.

Enerji maliyeti: gövde², azami hız², algılama² ve ömür maliyetleri / metabolik verim + hareket maliyeti × gerçek hız². Sıcaklık stresi bazal maliyeti artırır; tehlike ayrıca enerji kaybına neden olur. Böylece hızlı ve büyük olmanın bedeli vardır. Besin dış ortamdan gelir; toplam evren enerjisi kapalı bir fizik sistemi olarak korunuyor iddiası yoktur.

Kaynak rekabeti deterministik canlı sırasıyla çözülür. Bu sıra çatışmalarda avantaj oluşturabilir; kontrollü deney bunu tam biyolojik ekosistem doğruluğu olarak sunmaz. Bir canlı ömrü içinde ağırlıkları öğrenmez; kalıtsal mutasyon ve doğal enerji/üreme döngüsü gen havuzunu değiştirir.

## Zaman ve veri

- Varsayılan dt=1/60 sn; config 1/120–1/20 aralığı destekler. Dünya zamanı `tick × dt`dir, FPS değildir.
- Worker'a gerçek duvar zamanı gelir; hız katsayısı birikimi oluşturur. Her işçi turunda 7 ms işlem bütçesi ve 120 adım sınırı vardır. Birikim en fazla 1 sn; yetişilemeyen istenen süre raporlanır.
- Görünür çalışmada en çok 20 Hz snapshot; duraklama/arka planda 1 Hz. Kullanıcı komutları acil snapshot üretir. UI yaklaşık 5 Hz, geçmiş 1 Hz; render ayrı RAF ile çalışır.
- ID'ler Uint32Array; görsel özellikler Float32Array ile transferable gönderilir. Bu görsel hassasiyet, DNA ve gerçek dünya kaydını yuvarlamaz; kayıtta Number dizileri kullanılır.
- Geçmiş son 720 simülasyon örneğini içerir. Genetik çeşitlilik 8 özellik + ilk katmandan 12 ağırlığın normalize standart sapmalarının ortalamasıdır. Tür veya bütün genom uzaklığı değildir.
- PixiJS WebGL tercih edilir ve renderer türü kontrol edilir. WebGL başarısızsa / kaybolursa Canvas 2D kullanılır. Düşük güç DPR=1 ve olay efektlerini azaltır. Mobil ilk açılış düşük güçtür.

## Kayıt

`WorldState.schemaVersion=1`. RNG uint32 durumu, tick, kimlik sayaçları, besin birikimi ve örnekleme adımı dahil bütün gelecek belirleyen durum saklanır. Gaussian cache yoktur. Aynı kayıt, aynı motor ve aynı sonraki komut/adımlar aynı geleceği verir; farklı JS motorlarında sonsuz süre bit eşitliği garantisi yoktur.

IndexedDB transaction tamamlanmadan başarı bildirilmez. Yükleme önce bütün şemayı doğrular, sonra yeni World oluşturulur ve tek atamada değiştirilir. JSON dosyası önce 16 MiB sınırından geçer. Finite sayılar, DNA sınırları/195 ağırlık, dizi boyutları, benzersiz kimlikler, konum/enerji ve sürüm kontrol edilir. Hatalı yükleme var olan dünyaya yazmaz.

## Deney

`selectionExperiment`: üç ayrı seed, 80 kurucu, 120 sn ekosistem. Yaşayan gen havuzu ile başlangıç havuzundan eşit 40 genom örneklenir. Her çift aynı iki test seed'inde 60 sn, aynı başlangıç noktaları ve kaynak koşullarıyla değerlendirilir. Değerlendirmede üreme kapalı; yaş/enerji yeniden başlatılır. Sağkalım integrali ve besin/başlangıç canlı sayısı ayrı ölçülür; ölülerin final enerjisi sıfırdır. Otomatik başarı sıralaması veya olumlu sonuç zorlaması yoktur.

Bu deney sağ kalan ve üreyen gen havuzunun kısa kontrollü performansını ölçer. Üç eğitim seed'i genel evrim başarısı kanıtı değildir. 60 sn tavanı sağkalım farkını küçültür; negatif çiftler raporda tutulur.
# 1.1 araştırma katmanı

`SelectionRun` aynı deterministik hesap yolunu CLI ve ayrı `experiment.worker.ts` içinde sınırlı adım parçalarıyla yürütür. Deney Worker'ı açık evren Worker'ına erişmez; her koşu bağımsız World/DNA/RNG taşır. 5 ms hesap bütçesi ve 8 ms zamanlayıcı aralığı, gerçek adım sayısından ilerleme, anında Worker sonlandırma ile iptal ve yalnız tam koşuların özetlenmesi kullanılır.

`analysis.ts` canlı genomları ve sabit kurucu havuzunu okuyarak histogram/soy/nesil/ölüm analizi üretir. Ana simülasyon Worker'ı bu analizi geçmişle birlikte 1 Hz gönderir; React en son analizi saklar. Ölçüm RNG'ye veya canlı DNA'sına yazmaz. Kayıt şeması1 aynıdır. Sayısal tekrar aynı runtime için sınanır; farklı matematik uygulamalarında uzun koşuların dalları değişebilir.

