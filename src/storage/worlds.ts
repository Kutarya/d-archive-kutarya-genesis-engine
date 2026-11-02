import type { WorldState } from '../engine/types.ts'
import { validateState } from '../engine/validation.ts'
export interface SavedWorld { id: string; name: string; savedAt: number; state: WorldState }
const DB = 'kutarya-genesis-engine', STORE = 'worlds'
let database: Promise<IDBDatabase> | null = null
function openDatabase(): Promise<IDBDatabase> {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => { request.result.createObjectStore(STORE, { keyPath: 'id' }) }
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => { db.close(); database = null }
      resolve(db)
    }
    request.onerror = () => { database = null; reject(new Error('Yerel kayıt veritabanı açılamadı.')) }
    request.onblocked = () => { database = null; reject(new Error('Başka bir sekme kayıt veritabanını tutuyor.')) }
  })
  return database
}
async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode), request = operation(tx.objectStore(STORE))
    let value: T
    request.onsuccess = () => { value = request.result }
    tx.oncomplete = () => resolve(value)
    tx.onabort = () => reject(new Error('Kayıt işlemi tamamlanamadı; depolama kotasını kontrol edin.'))
    tx.onerror = () => reject(new Error('Yerel kayıt işlemi başarısız.'))
  })
}
export async function saveWorld(name: string, state: WorldState): Promise<SavedWorld> {
  validateState(state)
  const cleanName = name.trim().slice(0, 80)
  if (!cleanName) throw new Error('Kayıt adı boş olamaz.')
  const saved: SavedWorld = { id: crypto.randomUUID(), name: cleanName, savedAt: Date.now(), state: structuredClone(state) }
  await transaction('readwrite', store => store.put(saved))
  return saved
}
export async function listWorlds(): Promise<Omit<SavedWorld, 'state'>[]> {
  // Cursor, büyük dünyaları listelemek için React'a bütün DNA dizilerini taşımaz.
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const rows: Omit<SavedWorld, 'state'>[] = [], tx = db.transaction(STORE, 'readonly'), request = tx.objectStore(STORE).openCursor()
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) return
      const item = cursor.value as SavedWorld
      if (typeof item.id === 'string' && typeof item.name === 'string' && Number.isFinite(item.savedAt)) rows.push({ id: item.id, name: item.name, savedAt: item.savedAt })
      cursor.continue()
    }
    tx.oncomplete = () => resolve(rows.sort((a, b) => b.savedAt - a.savedAt))
    tx.onerror = () => reject(new Error('Kayıt listesi okunamadı.'))
  })
}
export async function loadWorld(id: string): Promise<WorldState> {
  const row = await transaction<SavedWorld | undefined>('readonly', store => store.get(id))
  if (!row) throw new Error('Kayıt bulunamadı.')
  validateState(row.state)
  return row.state
}
export async function deleteWorld(id: string) { await transaction('readwrite', store => store.delete(id)) }
