import { create } from "zustand"
import { PISTOL, type Weapon } from "./weapons"

type GameState = {
  hp: number
  weapon: Weapon
  ammo: number
  isReloading: boolean
  mobsLeft: number
  kills: number

  setHp: (fn: (hp: number) => number) => void
  setMobsLeft: (value: number | ((m: number) => number)) => void
  addKill: () => void
  shoot: () => boolean
  reload: () => void
}

export const useGameStore = create<GameState>((set, get) => ({
  hp: 100,
  weapon: PISTOL,
  ammo: PISTOL.magSize,
  isReloading: false,
  mobsLeft: 5,
  kills: 0,

  setHp: (fn) => set((s) => ({ hp: fn(s.hp) })),
  setMobsLeft: (value) => set((s) => ({ mobsLeft: typeof value === "function" ? value(s.mobsLeft) : value })),
  addKill: () => set((s) => ({ kills: s.kills + 1 })),

  shoot: () => {
    const { ammo, isReloading } = get()
    if (ammo <= 0 || isReloading) return false

    const newAmmo = ammo - 1
    set({ ammo: newAmmo })

    // auto-reload when ammo runs out
    if (newAmmo <= 0) {
      // call reload from the store (will noop if already reloading)
      get().reload()
    }

    return true
  },

  reload: () => {
    const { weapon, isReloading } = get()
    if (isReloading) return

    set({ isReloading: true })

    setTimeout(() => {
      set({
        ammo: weapon.magSize,
        isReloading: false,
      })
    }, weapon.reloadTime * 1000)
  },
}))