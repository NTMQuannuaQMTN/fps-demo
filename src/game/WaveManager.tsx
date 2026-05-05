import { useEffect, useRef, useState } from "react"
import { Zombie } from "./Zombie"
import { useGameStore } from "./useGameStore"
import { ExpOrb } from "./ExpOrb"
import { useProgressionStore } from "./useProgressionStore"
import * as THREE from "three"

const WAVE_DURATION = 120
const BREAK_TIME = 10

export function WaveManager() {
  const [wave, setWave] = useState(1)
  const [time, setTime] = useState(WAVE_DURATION)
  const [zombies, setZombies] = useState<any[]>([])
  const [orbs, setOrbs] = useState<any[]>([])
  const [spawning, setSpawning] = useState(true)

  const paused = useProgressionStore((s) => s.paused)
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
    if (!spawning || paused) return

    const total = wave * 5
    setMobsLeft(total)
    let spawned = 0

    const interval = setInterval(() => {
      if (paused) return

      if (spawned >= total) {
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
        { id: Math.random(), position: [x, 1, z] },
      ])

      spawned++
      aliveCount.current++
    }, 700)

    return () => clearInterval(interval)
  }, [wave, spawning, paused])

  // ⏱ TIMER
  useEffect(() => {
    const timer = setInterval(() => {
      if (paused) return

      setTime((t) => {
        if (t <= 1) {
          setSpawning(false)
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [paused])

  // 🧠 WAVE TRANSITION (SINGLE SOURCE OF TRUTH)
  useEffect(() => {
    if (waveTransitionInProgress.current) return

    const waveFinished =
      (!spawning && zombies.length === 0) || time === 0

    if (!waveFinished) return

    waveTransitionInProgress.current = true

    const timeout = setTimeout(() => {
      setWave((w) => w + 1)
      setTime(WAVE_DURATION)
      setSpawning(true)
      waveTransitionInProgress.current = false
    }, BREAK_TIME * 1000)

    return () => {
      clearTimeout(timeout)
      waveTransitionInProgress.current = false
    }
  }, [spawning, zombies.length, time])

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
            setMobsLeft((m) => Math.max(0, m - 1))
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