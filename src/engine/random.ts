// Mulberry32: yalnız uint32 durum; kayıt sonrası ek gizli rastgelelik durumu yok.
export class Random {
  state: number
  constructor(seed: string | number) {
    if (typeof seed === 'number') this.state = seed >>> 0
    else {
      let hash = 2166136261
      for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619)
      this.state = hash >>> 0
    }
  }
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  range(min: number, max: number) { return min + this.next() * (max - min) }
  normal(): number {
    // Sınırlı, merkezlenmiş altı üniform toplamı. Gaussian iddiası yok.
    let value = -3
    for (let i = 0; i < 6; i++) value += this.next()
    return value / Math.sqrt(0.5)
  }
}
