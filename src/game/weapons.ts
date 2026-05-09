export type Weapon = {
  name: string
  damage: number
  rpm: number
  magSize: number
  reloadTime: number
  spread: number
  recoil: {
    vertical: number
    horizontal: number
    recovery: number
  }
}

export const ARKA: Weapon = {
  name: "Arka",
  damage: 45,
  rpm: 600,
  magSize: 30,
  reloadTime: 4,
  spread: 0.01,
  recoil: {
    vertical: 0.2,
    horizontal: 0.1,
    recovery: 5,
  },
}

export const PISTOL: Weapon = {
  name: "Pistol",
  damage: 20,
  rpm: 300,
  magSize: 7,
  reloadTime: 2,
  spread: 0.01,
  recoil: {
    vertical: 0.08,
    horizontal: 0.06,
    recovery: 5,
  },
}