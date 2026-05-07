import { create } from "zustand"
import { PISTOL, type Weapon } from "./weapons"

type GameState = {
  hp: number
  weapon: Weapon
  ammo: number
  isReloading: boolean
  reloadEndAt: number
  mobsLeft: number
  kills: number
  lastCombatTime: number
  hitMarkerVisible: boolean
  orbProgress: number
  gameOver: boolean
  startTime: number
  survivedSeconds: number
  sessionId: number

  setHp: (fn: (hp: number) => number) => void
  setMobsLeft: (value: number | ((m: number) => number)) => void
  addKill: () => void
  setWeapon: (weapon: Weapon) => void
  shoot: () => boolean
  reload: () => void
  recordCombatAction: () => void
  flashHitMarker: () => void
  setOrbProgress: (value: number) => void
  resetGame: () => void
}

let hitMarkerTimeout: ReturnType<typeof setTimeout> | undefined

export const useGameStore = create<GameState>((set, get) => ({
  hp: 100,
  weapon: PISTOL,
  ammo: PISTOL.magSize,
  isReloading: false,
  reloadEndAt: 0,
  mobsLeft: 5,
  kills: 0,
  lastCombatTime: Date.now(),
  hitMarkerVisible: false,
  orbProgress: 0,
  gameOver: false,
  startTime: Date.now(),
  survivedSeconds: 0,
  sessionId: 0,

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
  setWeapon: (weapon) => set({ weapon, ammo: weapon.magSize, isReloading: false, reloadEndAt: 0 }),
  recordCombatAction: () => set((s) => (s.gameOver ? {} : { lastCombatTime: Date.now() })),
  flashHitMarker: () => {
    if (hitMarkerTimeout) clearTimeout(hitMarkerTimeout)
    set({ hitMarkerVisible: true })
    hitMarkerTimeout = setTimeout(() => set({ hitMarkerVisible: false }), 120)
  },
  setOrbProgress: (value) => set({ orbProgress: Math.max(0, Math.min(1, value)) }),

  shoot: () => {
    const { ammo, isReloading, gameOver } = get()
    if (ammo <= 0 || isReloading || gameOver) return false

    const newAmmo = ammo - 1
    set({ ammo: newAmmo, lastCombatTime: Date.now() })

    // auto-reload when ammo runs out
    if (newAmmo <= 0) {
      // call reload from the store (will noop if already reloading)
      get().reload()
    }

    return true
  },

  reload: () => {
    const { weapon, isReloading, gameOver } = get()
    if (isReloading || gameOver) return

    set({
      isReloading: true,
      reloadEndAt: Date.now() + weapon.reloadTime * 1000,
    })

    setTimeout(() => {
      set({
        ammo: weapon.magSize,
        isReloading: false,
        reloadEndAt: 0,
      })
    }, weapon.reloadTime * 1000)
  },

  resetGame: () => set((s) => ({
    hp: 100,
    weapon: PISTOL,
    ammo: PISTOL.magSize,
    isReloading: false,
    reloadEndAt: 0,
    mobsLeft: 0,
    kills: 0,
    lastCombatTime: Date.now(),
    hitMarkerVisible: false,
    orbProgress: 0,
    gameOver: false,
    startTime: Date.now(),
    survivedSeconds: 0,
    sessionId: s.sessionId + 1,
  })),
}))