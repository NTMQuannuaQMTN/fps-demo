@AUTOPILOT.md

# Zombie Apocalypse FPS — Architecture

## Overview

Browser-based 3D first-person zombie shooter. Player loots crates for better guns, survives escalating zombie waves, and levels up with stat upgrades.

**Stack:** React 19 · React Three Fiber v9 · Three.js · Zustand v5 · Vite · TypeScript

---

## Directory Structure

```
src/
  game/
    Scene.tsx              — Canvas, lights, static props, map walls, initial crates
    Player.tsx             — Camera/movement/shooting/collision/healing per-frame logic
    Zombie.tsx             — Zombie AI: chase player, deal damage, die → drop exp orb
    WaveManager.tsx        — Spawn waves, track alive count, trigger break + crate drop
    Crate.tsx              — Interactable loot box: hold E to open, rolls weapon
    ExpOrb.tsx             — Hold E to collect, grants EXP, 20s lifetime
    HUD.tsx                — Fixed overlay: HP/EXP bars, ammo, stats, wave, game over
    MobileControls.tsx     — Touch joystick, shoot/reload/get buttons, gyro, swipe look
    UpgradeUI.tsx          — Paused overlay: pick 1 of 3 stat upgrades on level-up
    weapons.ts             — Weapon definitions + tier system + crate roll logic
    useGameStore.ts        — Zustand: HP, weapon, ammo, reload, kills, wave, game over
    useProgressionStore.ts — Zustand: EXP, level, stat upgrades, paused flag
    useEntityStore.ts      — Zustand: live zombie entities (for raycasting hit detection)
```

---

## Stores

### useGameStore
| Field | Type | Purpose |
|---|---|---|
| `hp` | number | Current player HP |
| `weapon` | Weapon | Equipped weapon |
| `ammo` | number | Rounds in mag |
| `isReloading` | boolean | Reload in progress |
| `reloadEndAt` | number | Timestamp reload completes |
| `reloadSpeedMultiplier` | number | From speed stat |
| `mobsLeft` | number | Alive zombies on map |
| `kills` | number | Total kills this run |
| `wave` | number | Current wave number |
| `wavePhase` | `'fighting'\|'break'` | Phase between waves |
| `breakEndsAt` | number | Timestamp break ends (0 when fighting) |
| `lastCombatTime` | number | Used for heal delay + crate/orb lockout |
| `hitMarkerVisible` | boolean | Red X crosshair on hit |
| `orbProgress` | number | 0–1 fill for E-hold ring (crate + orb) |
| `gameOver` | boolean | Triggers game over overlay |
| `survivedSeconds` | number | Set on death |
| `sessionId` | number | Incremented on Play Again → re-keys Canvas |
| `pelletHits` | PelletHit[] | Shotgun spread visualizer dots |

### useProgressionStore
| Field | Type | Purpose |
|---|---|---|
| `exp / nextExp` | number | EXP progress to next level |
| `level` | number | Player level |
| `stats.speed` | number | Movement multiplier, default 1 |
| `stats.attack` | number | Flat damage bonus per pellet |
| `stats.defense` | number | Reduces zombie damage/sec |
| `stats.luck` | number | Boosts crate tier weights + orb drop chance |
| `stats.hp` | number | Base HP pool (100 + 10 per upgrade) |
| `paused` | boolean | Pauses game loop, shows UpgradeUI |
| `choices` | Stat[] | 3 random upgrade options shown on level-up |

### useEntityStore
Map of live zombies keyed by UUID. Each entity has `mesh` (Three.js object for raycasting) and `hit(damage)` callback. Populated by Zombie on mount, cleared on death.

---

## Mobile Input Architecture

Two separate channels to avoid React state lag on per-frame delta inputs:

### window.mobileInput (React state, polled at 16ms)
For **instantaneous/continuous** inputs:
- `joystickX / joystickY` — normalized −1 to 1
- `isShooting` — bool, held
- `isReloading` — momentary pulse (100ms)
- `isGetting` — momentary pulse (100ms, same as E key)

### window.mobileDeltas (mutable accumulator, consumed each frame)
For **per-frame delta** inputs that must be consumed-and-reset by Player.tsx useFrame:
- `gyroYaw` — accumulated yaw delta since last frame (radians)
- `gyroPitch` — accumulated pitch delta since last frame (radians)
- `fingerLookX` — accumulated X delta since last frame (radians)
- `fingerLookY` — accumulated Y delta since last frame (radians)

Player.tsx `useFrame` reads these, applies them to yaw/pitch, then **zeroes them out**.
MobileControls writes to `window.mobileDeltas` directly (bypasses React state) to avoid frame-skipping or double-application.

---

## Interaction System (window globals)

| Global | Type | Set by | Read by |
|---|---|---|---|
| `window.colliders` | `THREE.Object3D[]` | Scene props + Zombie + Crate groups | Player collision + Zombie nav |
| `window.holdingE` | boolean | Player.tsx (keyboard + mobile) | Crate.tsx, ExpOrb.tsx |
| `window.activeCrateId` | string\|null | Crate.tsx | Crate.tsx (mutex) |
| `window.activeOrbId` | string\|null | ExpOrb.tsx | ExpOrb.tsx (mutex) |
| `window.spawnOrb` | function | WaveManager.tsx | Zombie.tsx on death |
| `window.mobileInput` | MobileInputState | MobileControls.tsx | Player.tsx (via syncInterval) |
| `window.mobileDeltas` | object | MobileControls.tsx | Player.tsx (useFrame) |

---

## Weapon System (`weapons.ts`)

```
Weapon fields: name, damage, rpm, magSize, reloadTime, spread, pellets, autoShoot, recoil{vertical,horizontal,recovery}
```

### Weapon Roster

| Name | Tier | Type | Damage | RPM | Pellets | Notes |
|---|---|---|---|---|---|---|
| Pistol | 1 | Semi | 20 | 300 | 1 | Starting weapon |
| Easy | 2 | SMG | 20 | 1000 | 1 | Fast fire, high spread |
| Beezone | 2 | SMG | 18 | 900 | 1 | Large mag (53) |
| SoulEight | 2 | Shotgun | 100 | 120 | 10 | 2-round mag |
| 12Karat | 2 | Shotgun | 120 | 180 | 12 | 5-round mag |
| Arka | 3 | AR | 45 | 600 | 1 | Balanced AR |
| Merbon | 3 | AR | 32 | 750 | 1 | Faster, less damage |
| Arkanger | 4 | AR | 30 | 800 | 1 | High precision |
| Arcel | 4 | AR | 65 | 720 | 1 | High damage AR |

### Crate Roll (`rollCrateWeapon`)
Luck stat biases tier weights toward higher tiers. Tier 1 weight decays exponentially with luck; tier 3/4 grow. Never rolls same weapon as currently held.

---

## Wave & Crate System

- Wave `n` spawns `n × 5` zombies, max 50 alive at once, 1 per 700ms
- On wave clear: 10s break, bonus EXP (`wave × 5`), 1–2 crates spawn at random map positions
- Static crates always at `[-10,0.6,12]`, `[8,0.6,-14]`, `[22,0.6,6]`
- Dynamic crates (wave-spawned) expire after 120s
- Opening a crate requires: not in combat (last hit >900ms ago), hold E for `3/speed` seconds

---

## Damage & Healing

```
Shooting: damagePerPellet = weapon.damage / weapon.pellets + attackStat / weapon.pellets
Zombie melee: damagePerSecond = max(0.8, 5 − defense × 0.2)   (when dist < 2)
Healing: +3 HP/sec after 5s no combat, capped at maxHp
maxHp = 100 × 1.05^((hpStat − 100) / 10)
```

---

## Collision System

AABB-based in Player.tsx `resolveCollisions()`, iterated 4 times per frame. Separates along minimum overlap axis. Zombies use radius-vs-AABB for static colliders, radius-vs-radius for other zombies. Zombie colliders are cached in `WeakMap` for perf.

---

## Commit Message Format

`[category] short english description`

Categories: `fix`, `feature`, `balance`, `mobile`, `ui`, `perf`, `docs`

Examples:
- `[fix] Gyro deltas no longer accumulate across frames`
- `[mobile] Add iOS gyro permission button`
- `[feature] Add wave counter and break countdown to HUD`
- `[balance] Reduce SoulEight mag from 2 to 1 — too dominant at tier 2`
