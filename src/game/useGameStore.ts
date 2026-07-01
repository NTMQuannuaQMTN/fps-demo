import { create } from "zustand"
import { PISTOL, type Weapon } from "./weapons"

type PelletHit = {
  id: string
  x: number
  y: number
  timestamp: number
}

type GameState = {
  hp: number
  weapon: Weapon
  ammo: number
  isReloading: boolean
  reloadEndAt: number
  reloadSpeedMultiplier: number
  mobsLeft: number
  kills: number
  wave: number
  wavePhase: "fighting" | "break"
  breakEndsAt: number
  lastCombatTime: number
  hitMarkerVisible: boolean
  orbProgress: number
  gameOver: boolean
  gameWon: boolean
  startTime: number
  survivedSeconds: number
  sessionId: number
  pelletHits: PelletHit[]

  setHp: (fn: (hp: number) => number) => void
  setMobsLeft: (value: number | ((m: number) => number)) => void
  addKill: () => void
  setWeapon: (weapon: Weapon) => void
  setReloadSpeedMultiplier: (value: number) => void
  setWave: (wave: number) => void
  setWavePhase: (phase: "fighting" | "break", breakEndsAt?: number) => void
  shoot: () => boolean
  reload: () => void
  recordCombatAction: () => void
  flashHitMarker: () => void
  setGameWon: () => void
  setOrbProgress: (value: number) => void
  addPelletHit: (x: number, y: number) => void
  removePelletHit: (id: string) => void
  resetGame: () => void
}

let hitMarkerTimeout: ReturnType<typeof setTimeout> | undefined
let reloadTimeout: ReturnType<typeof setTimeout> | undefined

export const useGameStore = create<GameState>((set, get) => ({
  hp: 100,
  weapon: PISTOL,
  ammo: PISTOL.magSize,
  isReloading: false,
  reloadEndAt: 0,
  reloadSpeedMultiplier: 1,
  mobsLeft: 5,
  kills: 0,
  wave: 1,
  wavePhase: "fighting" as const,
  breakEndsAt: 0,
  lastCombatTime: Date.now(),
  hitMarkerVisible: false,
  orbProgress: 0,
  gameOver: false,
  gameWon: false,
  startTime: Date.now(),
  survivedSeconds: 0,
  sessionId: 0,
  pelletHits: [],

  setHp: (fn) => set((s) => {
    if (s.gameOver) return { hp: 0 }

    const nextHp = Math.max(0, fn(s.hp))
    if (nextHp <= 0) {
      return {
        hp: 0,
        gameOver: true,
        survivedSeconds: (Date.now() - s.startTime) / 1000,
      }
    }

    return { hp: nextHp }
  }),
  setMobsLeft: (value) => set((s) => ({ mobsLeft: typeof value === "function" ? value(s.mobsLeft) : value })),
  addKill: () => set((s) => ({ kills: s.kills + 1 })),
  setWave: (wave) => set({ wave }),
  setWavePhase: (phase, breakEndsAt = 0) => set({ wavePhase: phase, breakEndsAt }),
  setWeapon: (weapon) => {
    if (reloadTimeout) {
      clearTimeout(reloadTimeout)
      reloadTimeout = undefined
    }
    set({ weapon, ammo: weapon.magSize, isReloading: false, reloadEndAt: 0 })
  },
  setReloadSpeedMultiplier: (value) => set({ reloadSpeedMultiplier: Math.max(0.5, value) }),
  recordCombatAction: () => set((s) => (s.gameOver ? {} : { lastCombatTime: Date.now() })),
  flashHitMarker: () => {
    if (hitMarkerTimeout) clearTimeout(hitMarkerTimeout)
    set({ hitMarkerVisible: true })
    hitMarkerTimeout = setTimeout(() => set({ hitMarkerVisible: false }), 120)
  },
  setGameWon: () => set((s) => ({ gameWon: true, survivedSeconds: (Date.now() - s.startTime) / 1000 })),
  setOrbProgress: (value) => set({ orbProgress: Math.max(0, Math.min(1, value)) }),

  addPelletHit: (x: number, y: number) => {
    const id = crypto.randomUUID()
    set((s) => ({ pelletHits: [...s.pelletHits, { id, x, y, timestamp: Date.now() }] }))
    
    // Auto-remove after 300ms
    setTimeout(() => {
      get().removePelletHit(id)
    }, 300)
  },

  removePelletHit: (id: string) => {
    set((s) => ({ pelletHits: s.pelletHits.filter((h) => h.id !== id) }))
  },

  shoot: () => {
    const { ammo, isReloading, gameOver } = get()
    if (gameOver) return false
    if (ammo <= 0) return false  // empty mag — can't interrupt a reload that started on empty

    // Cancel in-progress reload: player has rounds, wants to shoot now
    if (isReloading) {
      if (reloadTimeout) {
        clearTimeout(reloadTimeout)
        reloadTimeout = undefined
      }
      set({ isReloading: false, reloadEndAt: 0 })
    }

    const newAmmo = ammo - 1
    set({ ammo: newAmmo, lastCombatTime: Date.now() })

    if (newAmmo <= 0) {
      get().reload()
    }

    return true
  },

  reload: () => {
    const { weapon, isReloading, gameOver, reloadSpeedMultiplier } = get()
    if (isReloading || gameOver) return

    const reloadTime = weapon.reloadTime / Math.max(0.5, reloadSpeedMultiplier)

    if (reloadTimeout) clearTimeout(reloadTimeout)

    set({
      isReloading: true,
      reloadEndAt: Date.now() + reloadTime * 1000,
    })

    reloadTimeout = setTimeout(() => {
      set({
        ammo: weapon.magSize,
        isReloading: false,
        reloadEndAt: 0,
      })
      reloadTimeout = undefined
    }, reloadTime * 1000)
  },

  resetGame: () => set((s) => {
    if (reloadTimeout) {
      clearTimeout(reloadTimeout)
      reloadTimeout = undefined
    }

    return {
      hp: 100,
      weapon: PISTOL,
      ammo: PISTOL.magSize,
      isReloading: false,
      reloadEndAt: 0,
      reloadSpeedMultiplier: 1,
      mobsLeft: 0,
      kills: 0,
      wave: 1,
      wavePhase: "fighting" as const,
      breakEndsAt: 0,
      lastCombatTime: Date.now(),
      hitMarkerVisible: false,
      orbProgress: 0,
      gameOver: false,
      gameWon: false,
      startTime: Date.now(),
      survivedSeconds: 0,
      sessionId: s.sessionId + 1,
      pelletHits: [],
    }
  }),
}))