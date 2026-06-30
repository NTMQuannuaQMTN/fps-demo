export type Weapon = {
  name: string
  damage: number
  rpm: number
  magSize: number
  reloadTime: number
  spread: number
  pellets: number
  autoShoot: boolean
  pierceWalls?: number  // bullets pass through this many obstacles before stopping
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
  pellets: 1,
  autoShoot: true,
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
  pellets: 1,
  autoShoot: false,
  recoil: {
    vertical: 0.08,
    horizontal: 0.06,
    recovery: 5,
  },
}

export const MERBON: Weapon = {
  name: "Merbon",
  damage: 32,
  rpm: 750,
  magSize: 30,
  reloadTime: 3,
  spread: 0.011,
  pellets: 1,
  autoShoot: true,
  recoil: {
    vertical: 0.16,
    horizontal: 0.1,
    recovery: 5,
  },
}

export const EASY_SMG: Weapon = {
  name: "Easy",
  damage: 20,
  rpm: 1000,
  magSize: 25,
  reloadTime: 2,
  spread: 0.02,
  pellets: 1,
  autoShoot: true,
  recoil: {
    vertical: 0.12,
    horizontal: 0.08,
    recovery: 4,
  },
}

export const BEEZONE_SMG: Weapon = {
  name: "Beezone",
  damage: 18,
  rpm: 900,
  magSize: 53,
  reloadTime: 5,
  spread: 0.03,
  pellets: 1,
  autoShoot: true,
  recoil: {
    vertical: 0.18,
    horizontal: 0.12,
    recovery: 6,
  },
}

export const SOULEIGHT: Weapon = {
  name: "SoulEight",
  damage: 100,
  rpm: 120,
  magSize: 2,
  reloadTime: 4,
  spread: 0.1,
  pellets: 10,
  autoShoot: false,
  recoil: {
    vertical: 0.5,
    horizontal: 0.3,
    recovery: 3,
  },
}

export const TWELVEKARAT: Weapon = {
  name: "12Karat",
  damage: 120,
  rpm: 180,
  magSize: 5,
  reloadTime: 3,
  spread: 0.16,
  pellets: 12,
  autoShoot: false,
  recoil: {
    vertical: 0.4,
    horizontal: 0.25,
    recovery: 4,
  },
}

export const ARKANGER: Weapon = {
  name: "Arkanger",
  damage: 30,
  rpm: 800,
  magSize: 30,
  reloadTime: 4,
  spread: 0.009,
  pellets: 1,
  autoShoot: true,
  recoil: {
    vertical: 0.08,
    horizontal: 0.08,
    recovery: 5,
  },
}

export const RIFLE: Weapon = {
  name: "Arcel",
  damage: 65,
  rpm: 720,
  magSize: 24,
  reloadTime: 3.2,
  spread: 0.012,
  pellets: 1,
  autoShoot: true,
  recoil: {
    vertical: 0.16,
    horizontal: 0.12,
    recovery: 5,
  },
}

export const HEIGHT_FOR_NIGHT: Weapon = {
  name: "HeightForNight",
  damage: 20,
  rpm: 800,
  magSize: 75,
  reloadTime: 7,
  spread: 0.015,
  pellets: 1,
  autoShoot: true,
  recoil: {
    vertical: 0.14,
    horizontal: 0.08,
    recovery: 6,
  },
}

export const OPE: Weapon = {
  name: "Ope",
  damage: 100,
  rpm: 100,
  magSize: 5,
  reloadTime: 3,
  spread: 0.003,
  pellets: 1,
  autoShoot: false,
  pierceWalls: 1,
  recoil: {
    vertical: 0.5,
    horizontal: 0.04,
    recovery: 4,
  },
}

// Weapon progression system: Pistol < incoming guns < AR guns < LMG/sniper
export const WEAPON_TIERS: Record<string, number> = {
  [PISTOL.name]: 1,
  [EASY_SMG.name]: 2,
  [BEEZONE_SMG.name]: 2,
  [SOULEIGHT.name]: 2,
  [TWELVEKARAT.name]: 2,
  [ARKA.name]: 3,
  [MERBON.name]: 3,
  [ARKANGER.name]: 4,
  [RIFLE.name]: 4,
  [HEIGHT_FOR_NIGHT.name]: 5,
  [OPE.name]: 5,
}

export const WEAPONS_BY_TIER: Record<number, Weapon[]> = {
  1: [PISTOL],
  2: [EASY_SMG, BEEZONE_SMG, SOULEIGHT, TWELVEKARAT],
  3: [ARKA, MERBON],
  4: [ARKANGER, RIFLE],
  5: [HEIGHT_FOR_NIGHT, OPE],
}

export const rollCrateWeapon = (currentWeapon: Weapon, luck: number): Weapon => {
  const tierWeights: Record<number, number> = {
    1: 0.8 * Math.pow(0.8, luck),
    2: 0.5,
    3: Math.pow(1.2, luck) - 1,
    4: Math.pow(1.1, luck) - 1,
    5: Math.max(0, Math.pow(1.08, luck) - 1),  // requires luck investment to appear
  }

  const totalWeight = Object.values(tierWeights).reduce((a, b) => a + b, 0)
  const normalizedWeights: Record<number, number> = {}
  for (const tier in tierWeights) {
    normalizedWeights[tier] = tierWeights[tier] / totalWeight
  }

  let rand = Math.random()
  let selectedTier = 1
  for (const tier of [1, 2, 3, 4, 5]) {
    rand -= normalizedWeights[tier]
    if (rand <= 0) {
      selectedTier = tier
      break
    }
  }

  const tierWeapons = WEAPONS_BY_TIER[selectedTier].filter(w => w.name !== currentWeapon.name)

  if (tierWeapons.length === 0) {
    return rollCrateWeapon(currentWeapon, luck)
  }

  return tierWeapons[Math.floor(Math.random() * tierWeapons.length)]
}