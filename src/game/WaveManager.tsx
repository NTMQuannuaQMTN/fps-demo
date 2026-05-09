import { useEffect, useRef, useState } from "react"
import { Zombie } from "./Zombie"
import { useGameStore } from "./useGameStore"
import { ExpOrb } from "./ExpOrb"
import { useProgressionStore } from "./useProgressionStore"
import * as THREE from "three"

const BREAK_TIME = 10
const ZOMBIE_GROUND_Y = 0.9

export function WaveManager() {
  const [wave, setWave] = useState(1)
  const [zombies, setZombies] = useState<any[]>([])
  const [orbs, setOrbs] = useState<any[]>([])
  const [spawning, setSpawning] = useState(true)

  const paused = useProgressionStore((s) => s.paused)
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
      const dist = 30 + Math.random() * 30

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

  // 🧠 WAVE TRANSITION (SINGLE SOURCE OF TRUTH)
  useEffect(() => {
    if (waveTransitionInProgress.current || gameOver) return

    const waveFinished = !spawning && mobsLeft === 0

    if (!waveFinished) return

    waveTransitionInProgress.current = true

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
  }, [spawning, mobsLeft, gameOver])

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
    </>
  )
}