import { useEffect, useRef, useState } from 'react'
import { ArrowDownToLine, FlaskConical, Play, Square } from 'lucide-react'
import { validateExperimentOptions } from '../engine/evaluation.ts'
import type { ExperimentReport } from '../engine/evaluation.ts'
import type { ExperimentCommand, ExperimentResponse, ExperimentStatus } from '../worker/experiment.protocol.ts'

const number = (value: number, decimals = 2) => value.toLocaleString('tr-TR', { maximumFractionDigits: decimals })
const delta = (value: number) => `${value > 0 ? '+' : ''}${number(value, 3)}`
const phases = { training: 'Ekosistemde seçilim', baseline: 'Kurucu gen havuzu testi', selected: 'Seçilmiş gen havuzu testi', complete: 'Tamamlandı' }
export function ResearchLab() {
  const [seeds, setSeeds] = useState('genesis-a\ngenesis-b\ngenesis-c')
  const [trainingSeconds, setTrainingSeconds] = useState(120), [assaySeconds, setAssaySeconds] = useState(60)
  const [active, setActive] = useState(false), [status, setStatus] = useState<ExperimentStatus | null>(null)
  const [report, setReport] = useState<ExperimentReport | null>(null), [message, setMessage] = useState('')
  const worker = useRef<Worker | null>(null)
  useEffect(() => () => { worker.current?.terminate() }, [])
  function start() {
    if (worker.current) return
    try {
      const options = validateExperimentOptions({ seeds: seeds.split(/[,\n]/).map(s => s.trim()).filter(Boolean), trainingSeconds, assaySeconds })
      const w = new Worker(new URL('../worker/experiment.worker.ts', import.meta.url), { type: 'module' })
      worker.current = w; setActive(true); setStatus(null); setReport(null); setMessage('Deney hazırlanıyor…')
      const finish = () => { w.terminate(); if (worker.current === w) worker.current = null; setActive(false) }
      w.onmessage = (event: MessageEvent<ExperimentResponse>) => {
        if (worker.current !== w) return
        const response = event.data
        if (response.kind === 'progress') { setStatus(response.status); setMessage('') }
        else if (response.kind === 'complete') { setReport(response.report); setMessage('Deney tamamlandı.'); finish() }
        else { setMessage(response.kind === 'error' ? response.message : 'Deney iptal edildi. Kısmi koşular sonuç olarak raporlanmadı.'); finish() }
      }
      w.onerror = () => { if (worker.current !== w) return; setMessage('Deney işçisi çalıştırılamadı.'); finish() }
      w.postMessage({ kind: 'start', options } satisfies ExperimentCommand)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Deney başlatılamadı.') }
  }
  function cancel() {
    // Worker'i sonlandirmak tum hesaplamayi hemen keser; geciken mesajlar kabul edilmez.
    worker.current?.terminate(); worker.current = null; setActive(false)
    setMessage('Deney iptal edildi. Kısmi koşular sonuç olarak raporlanmadı.')
  }
  function downloadReport() {
    if (!report) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = 'Genesis-secilim-deneyi.json'; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  const ratio = active && status ? status.completedSteps / status.totalSteps : report ? 1 : 0
  const pairs = report?.experiments.flatMap(e => e.comparisons.map(pair => ({ ...pair, selectionPossible: e.selectionPossible }))) ?? []
  return <section className="research-lab" aria-label="Kontrollü seçilim laboratuvarı">
    <div className="research-heading"><div><span className="section-kicker">ÖLÇ · KARŞILAŞTIR · TEKRARLA</span><h2><FlaskConical size={21} />Seçilim laboratuvarı</h2><p>Yeni, bağımsız ekosistemlerde kurucu ve seçilmiş gen havuzlarını eşit koşullarda sınar.</p></div><span className="research-badge">KONTROLLÜ DENEY</span></div>
    <div className="research-layout"><div className="experiment-controls">
      <label>Deney tohumları<textarea aria-label="Deney tohumları" rows={3} maxLength={300} value={seeds} disabled={active} onChange={e => setSeeds(e.target.value)} spellCheck={false} /><small>Her satır ayrı koşu · en fazla 3 farklı tohum</small></label>
      <div className="experiment-durations"><label>Seçilim süresi<input aria-label="Seçilim süresi" type="number" min={1} max={240} step={1} value={trainingSeconds} disabled={active} onChange={e => setTrainingSeconds(Number(e.target.value))} /><small>Simülasyon saniyesi</small></label><label>Test süresi<input aria-label="Test süresi" type="number" min={1} max={120} step={1} value={assaySeconds} disabled={active} onChange={e => setAssaySeconds(Number(e.target.value))} /><small>Her havuz ve test için</small></label></div>
      <div className="experiment-actions">{active ? <button className="cancel-experiment" onClick={cancel}><Square size={13} />Deneyi iptal et</button> : <button onClick={start} className="primary-action"><Play size={14} />Deneyi başlat</button>}{report && <button aria-label="Deney raporunu indir" onClick={downloadReport}><ArrowDownToLine size={16} /></button>}</div>
      <p className="experiment-method">80 kurucu, 240 kapasite. Her tohumda 2 eşlenmiş test, havuz başına 40 canlı. Yaş ve enerji oranı sıfırlanır; testlerde üreme kapalıdır. Aynı çift aynı çevre, başlangıç konumları ve kaynak akışını kullanır.</p>
    </div><div className="experiment-results" aria-live="polite">
      {active && <div className="experiment-progress"><div><strong>{status ? `${status.index}/${status.count} · ${status.seed}` : 'Başlatılıyor'}</strong><span>{number(ratio * 100, 1)}%</span></div><progress aria-label="Deney ilerlemesi" value={ratio} max={1} data-testid="experiment-progress" /><p>{status && `${phases[status.progress.phase]} · test ${status.progress.pair}/2 · ${number(status.progress.simulationSeconds, 1)} sn`}</p><small>{status && `${number(status.completedSteps, 0)} / ${number(status.totalSteps, 0)} gerçek hesap adımı`}</small></div>}
      {message && <p className="experiment-message" role="status">{message}</p>}
      {report ? <><div className="experiment-summary"><div><span>ORT. SAĞKALIM FARKI</span><strong className={report.meanSurvivalDelta >= 0 ? 'positive' : 'negative'} data-testid="survival-delta">{delta(report.meanSurvivalDelta)}<small>sn</small></strong><p>{number(report.meanBaselineSurvival, 3)} → {number(report.meanSelectedSurvival, 3)} sn</p></div><div><span>CANLI BAŞINA BESİN FARKI</span><strong className={report.meanFoodDelta >= 0 ? 'positive' : 'negative'}>{delta(report.meanFoodDelta)}</strong><p>{pairs.length} eşlenmiş test · {number(report.elapsedSeconds, 1)} sn gerçek süre</p></div></div>
        <div className="experiment-table-wrap"><table className="experiment-table"><caption>Kurucu ve seçilmiş havuz karşılaştırması</caption><thead><tr><th>Test tohumu</th><th>Kurucu<br />sağkalım</th><th>Seçilmiş<br />sağkalım</th><th>Fark<br />sn</th><th>Besin<br />farkı</th></tr></thead><tbody>{pairs.map(pair => <tr key={pair.seed}><td>{pair.seed}{!pair.selectionPossible && <small>Üreme / yaşayan seçilmiş havuz yok</small>}</td><td>{number(pair.baseline.survivalSeconds, 3)}</td><td>{number(pair.selected.survivalSeconds, 3)}</td><td className={pair.survivalDelta >= 0 ? 'positive' : 'negative'}>{delta(pair.survivalDelta)}</td><td className={pair.foodDelta >= 0 ? 'positive' : 'negative'}>{delta(pair.foodDelta)}</td></tr>)}</tbody></table></div>
        <div className="experiment-cohorts">{report.experiments.map(e => <span key={e.seed}>{e.seed}: {e.births} doğum · {e.finalPopulation} yaşayan · en yüksek nesil {e.maxGeneration}</span>)}</div>
        <p className="experiment-caveat">Bu sonuç istatistiksel anlamlılık veya bütün ortamlara genelleme kanıtı değildir. Sağkalım {report.options.assaySeconds} sn ile sınırlı; üst sınıra yakın sonuçlar farkları gizleyebilir. Yaşayan havuz yoksa kurucu havuzu kontrol olarak tekrar kullanılır; bu koşu başarılı seçilim sayılmaz.</p>
      </> : !active && <div className="experiment-empty"><FlaskConical size={36} strokeWidth={1} /><h3>Evrimi varsayma. Ölç.</h3><p>Gerçek hesaplamalar ayrı Worker’da yürür. Açık evrenin DNA’sı, RNG’si ve kayıtları değişmez. Sonuç tablosu yalnız tamamlanan deneylerden oluşur.</p></div>}
    </div></div>
  </section>
}
