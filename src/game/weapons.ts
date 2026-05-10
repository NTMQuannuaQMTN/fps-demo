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

export const MERBON: Weapon = {
  name: "Merbon",
  damage: 32,
  rpm: 750,
  magSize: 30,
  reloadTime: 3,
  spread: 0.011,
  recoil: {
    vertical: 0.16,
    horizontal: 0.1,
    recovery: 5,
  },
}

export const ARKANGER: Weapon = {
  name: "Arkanger",
  damage: 30,
  rpm: 800,
  magSize: 30,
  reloadTime: 4,
  spread: 0.009,
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
  recoil: {
    vertical: 0.16,
    horizontal: 0.12,
    recovery: 5,
  },
}

// Weapon progression system: Pistol < incoming guns < AR guns
export const WEAPON_TIERS: Record<string, number> = {
  [PISTOL.name]: 1,
  // Tier 2 reserved for incoming guns
  [ARKA.name]: 3,
  [MERBON.name]: 3,
  [ARKANGER.name]: 4,
  [RIFLE.name]: 4, // Arcel (top-tier AR)
}

export const WEAPONS_BY_TIER: Record<number, Weapon[]> = {
  1: [PISTOL],
  2: [], // Reserved for incoming guns
  3: [ARKA, MERBON],
  4: [ARKANGER, RIFLE],
}

export const rollCrateWeapon = (currentWeapon: Weapon, luck: number): Weapon => {
  // Collect all available weapons
  const allWeapons = Object.values(WEAPONS_BY_TIER).flat()
  
  // Luck influences weighted selection towards higher tiers
  const tierWeights: Record<number, number> = {
    1: 0.1,
    2: 0.2,
    3: 0.4 + luck * 0.1,
    4: 0.3 + luck * 0.2,
  }
  
  // Normalize weights
  const totalWeight = Object.values(tierWeights).reduce((a, b) => a + b, 0)
  const normalizedWeights: Record<number, number> = {}
  for (const tier in tierWeights) {
    normalizedWeights[tier] = tierWeights[tier] / totalWeight
  }
  
  // Pick tier based on weights
  let rand = Math.random()
  let selectedTier = 1
  for (const tier of [1, 2, 3, 4]) {
    rand -= normalizedWeights[tier]
    if (rand <= 0) {
      selectedTier = tier
      break
    }
  }
  
  // Pick random weapon from selected tier
  const tierWeapons = WEAPONS_BY_TIER[selectedTier].filter(w => w.name !== currentWeapon.name)
  
  // If no other weapons in that tier, pick from all weapons except current
  if (tierWeapons.length === 0) {
    const otherWeapons = allWeapons.filter(w => w.name !== currentWeapon.name)
    return otherWeapons[Math.floor(Math.random() * otherWeapons.length)]
  }
  
  return tierWeapons[Math.floor(Math.random() * tierWeapons.length)]
}