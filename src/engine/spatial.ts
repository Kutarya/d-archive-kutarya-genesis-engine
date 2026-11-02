interface Point { x: number; y: number }
// Hücre indeksi yakınlık sorgusunu yerel hücrelerle sınırlar. Uzak canlılar taranmaz.
export class SpatialIndex<T extends Point> {
  private cells = new Map<number, T[]>()
  private columns: number
  cellSize: number
  constructor(width: number, cellSize = 100) { this.columns = Math.ceil(width / cellSize) + 2; this.cellSize = cellSize }
  rebuild(items: readonly T[]) {
    for (const cell of this.cells.values()) cell.length = 0
    for (const item of items) {
      const key = Math.floor(item.x / this.cellSize) + Math.floor(item.y / this.cellSize) * this.columns
      let cell = this.cells.get(key)
      if (!cell) { cell = []; this.cells.set(key, cell) }
      cell.push(item)
    }
  }
  nearest(x: number, y: number, radius: number, accept?: (item: T) => boolean): T | null {
    let found: T | null = null, best = radius * radius
    const x0 = Math.max(0, Math.floor((x - radius) / this.cellSize)), x1 = Math.floor((x + radius) / this.cellSize)
    const y0 = Math.max(0, Math.floor((y - radius) / this.cellSize)), y1 = Math.floor((y + radius) / this.cellSize)
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const cell = this.cells.get(xx + yy * this.columns)
      if (!cell) continue
      for (const item of cell) {
        const distance = (x - item.x) ** 2 + (y - item.y) ** 2
        if (distance <= best && (!accept || accept(item))) { best = distance; found = item }
      }
    }
    return found
  }
  count(x: number, y: number, radius: number): number {
    let count = 0
    const r2 = radius * radius
    const x0 = Math.max(0, Math.floor((x - radius) / this.cellSize)), x1 = Math.floor((x + radius) / this.cellSize)
    const y0 = Math.max(0, Math.floor((y - radius) / this.cellSize)), y1 = Math.floor((y + radius) / this.cellSize)
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const cell = this.cells.get(xx + yy * this.columns)
      if (cell) for (const item of cell) if ((x - item.x) ** 2 + (y - item.y) ** 2 <= r2) count++
    }
    return count
  }
}
