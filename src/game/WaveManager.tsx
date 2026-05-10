import { useEffect, useRef, useState } from "react"
import { Zombie } from "./Zombie"
import { useGameStore } from "./useGameStore"
import { ExpOrb } from "./ExpOrb"
import { useProgressionStore } from "./useProgressionStore"
import { Crate } from "./Crate"
import * as THREE from "three"

const BREAK_TIME = 10
const ZOMBIE_GROUND_Y = 0.9
const CRATE_LIFETIME = 120 // 2 minutes in seconds
const CRATE_SPAWN_MIN = 1
const CRATE_SPAWN_MAX = 2

type SpawnedCrate = {
  id: string
  position: [number, number, number]
  createdAt: number
}

export function WaveManager() {
  const [wave, setWave] = useState(1)
  const [zombies, setZombies] = useState<any[]>([])
  const [orbs, setOrbs] = useState<any[]>([])
  const [crates, setCrates] = useState<SpawnedCrate[]>([])
  const [spawning, setSpawning] = useState(true)

  const paused = useProgressionStore((s) => s.paused)
  const addExp = useProgressionStore((s) => s.addExp)
  const gameOver = useGameStore((s) => s.gameOver)
  const mobsLeft = useGameStore((s) => s.mobsLeft)
  const setMobsLeft = useGameStore((s) => s.setMobsLeft)

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

      const angle = Math.random() * Math.PI * 2
      const dist = 20 + Math.random() * 20

      const x = Math.cos(angle) * dist
      const z = Math.sin(angle) * dist

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
      setWave((w) => w + 1)
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