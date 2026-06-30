import { useEffect, useRef, useState } from "react"
import { Zombie } from "./Zombie"
import { useGameStore } from "./useGameStore"
import { ExpOrb } from "./ExpOrb"
import { useProgressionStore } from "./useProgressionStore"
import { Crate } from "./Crate"
import * as THREE from "three"

const BREAK_TIME = 10
const ZOMBIE_GROUND_Y = 0.9
const CRATE_LIFETIME = 180
const CRATE_SPAWN_MIN = 2
const CRATE_SPAWN_MAX = 4

// Returns true when the XZ position is clear of all static colliders.
const isSpawnClear = (x: number, z: number): boolean => {
    const colliders = (window as any).colliders as THREE.Object3D[] | undefined
    if (!colliders) return true
    const pt = new THREE.Vector3(x, ZOMBIE_GROUND_Y, z)
    for (const c of colliders) {
        if (!c || c.userData?.dynamicCollider) continue
        const box = new THREE.Box3().setFromObject(c)
        if (box.distanceToPoint(pt) < 0.9) return false
    }
    return true
}

type SpawnedCrate = {
  id: string
  position: [number, number, number]
  createdAt: number
}

export function WaveManager() {
  const [wave, setWaveLocal] = useState(1)
  const [zombies, setZombies] = useState<any[]>([])
  const [orbs, setOrbs] = useState<any[]>([])
  const [crates, setCrates] = useState<SpawnedCrate[]>([])
  const [spawning, setSpawning] = useState(true)

  const paused = useProgressionStore((s) => s.paused)
  const addExp = useProgressionStore((s) => s.addExp)
  const gameOver = useGameStore((s) => s.gameOver)
  const mobsLeft = useGameStore((s) => s.mobsLeft)
  const setMobsLeft = useGameStore((s) => s.setMobsLeft)

  const setWave = useGameStore((s) => s.setWave)
  const setWavePhase = useGameStore((s) => s.setWavePhase)

  const aliveCount = useRef(0)
  const waveTransitionInProgress = useRef(false)

  // ✅ GLOBAL ORB SPAWNER (used by Zombie)
  useEffect(() => {
    ;(window as any).spawnOrb = (pos: THREE.Vector3) => {
      setOrbs((o) => [
        ...o,
        { id: Math.random(), position: pos.toArray() },
      ])
    }
  }, [])

  // 🧟 SPAWN LOGIC
  useEffect(() => {
    if (!spawning || paused || gameOver) return

    const total = wave * 5
    let spawned = 0

    const interval = setInterval(() => {
      if (paused || gameOver) return

      if (spawned >= total) {
        setSpawning(false)
        clearInterval(interval)
        return
      }

      if (aliveCount.current >= 50) return

      // Find a position not inside a static obstacle (up to 12 attempts)
      let x = 0, z = 0
      for (let attempt = 0; attempt < 12; attempt++) {
        const angle = Math.random() * Math.PI * 2
        const dist = 20 + Math.random() * 20
        x = Math.cos(angle) * dist
        z = Math.sin(angle) * dist
        if (isSpawnClear(x, z)) break
      }

      setZombies((prev) => [
        ...prev,
        { id: Math.random(), position: [x, ZOMBIE_GROUND_Y, z] },
      ])

      spawned++
      aliveCount.current++
    }, 700)

    return () => clearInterval(interval)
  }, [wave, spawning, paused, gameOver])

  // Keep mobsLeft equal to enemies currently alive on battlefield.
  useEffect(() => {
    setMobsLeft(zombies.length)
  }, [zombies.length, setMobsLeft])

  // ⏰ CRATE LIFETIME MANAGEMENT - Remove expired crates
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setCrates((prev) =>
        prev.filter((crate) => (now - crate.createdAt) / 1000 < CRATE_LIFETIME)
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // 🧠 WAVE TRANSITION (SINGLE SOURCE OF TRUTH)
  useEffect(() => {
    if (waveTransitionInProgress.current || gameOver) return

    const waveFinished = !spawning && mobsLeft === 0

    if (!waveFinished) return

    waveTransitionInProgress.current = true
    setWavePhase("break", Date.now() + BREAK_TIME * 1000)

    addExp(wave * 5)

    // 📦 SPAWN CRATES (1-2 random crates)
    const cratesToSpawn = Math.floor(Math.random() * (CRATE_SPAWN_MAX - CRATE_SPAWN_MIN + 1)) + CRATE_SPAWN_MIN
    const newCrates: SpawnedCrate[] = []
    
    for (let i = 0; i < cratesToSpawn; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = 15 + Math.random() * 20
      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist
      
      newCrates.push({
        id: crypto.randomUUID(),
        position: [x, 0.6, z],
        createdAt: Date.now(),
      })
    }
    
    setCrates((prev) => [...prev, ...newCrates])

    const timeout = setTimeout(() => {
      const nextWave = wave + 1
      setWave(nextWave)
      setWavePhase("fighting")
      setWaveLocal((w) => w + 1)
      setSpawning(true)
      aliveCount.current = 0
      waveTransitionInProgress.current = false
    }, BREAK_TIME * 1000)

    return () => {
      clearTimeout(timeout)
      waveTransitionInProgress.current = false
    }
  }, [spawning, mobsLeft, gameOver, wave, addExp])

  return (
    <>
      {/* Zombies */}
      {zombies.map((z) => (
        <Zombie
          key={z.id}
          position={z.position}
          onDeath={() => {
            setZombies((prev) =>
              prev.filter((p) => p.id !== z.id)
            )
            aliveCount.current--
          }}
        />
      ))}

      {/* EXP ORBS */}
      {orbs.map((o) => (
        <ExpOrb
          key={o.id}
          position={o.position}
          onRemove={() =>
            setOrbs((prev) =>
              prev.filter((x) => x.id !== o.id)
            )
          }
        />
      ))}

      {/* WAVE-SPAWNED CRATES */}
      {crates.map((crate) => (
        <group
          key={crate.id}
          ref={(g) => {
            if (!g) return
            if (!(window as any).colliders) (window as any).colliders = []
            if (!(window as any).colliders.includes(g)) (window as any).colliders.push(g)
          }}
        >
          <Crate position={crate.position} />
        </group>
      ))}
    </>
  )
}