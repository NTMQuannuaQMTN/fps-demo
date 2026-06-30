import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { useGameStore } from "./useGameStore"
import { rollCrateWeapon } from "./weapons"
import { useProgressionStore } from "./useProgressionStore"

export function Crate({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const crateId = useRef(crypto.randomUUID())
  const hold = useRef(0)
  const ownsInfo = useRef(false)
  const [opened, setOpened] = useState(false)

  const { camera } = useThree()
  const setWeapon = useGameStore((s) => s.setWeapon)
  const setOrbProgress = useGameStore((s) => s.setOrbProgress)
  const weapon = useGameStore((s) => s.weapon)
  const lastCombatTime = useGameStore((s) => s.lastCombatTime)
  const gameOver = useGameStore((s) => s.gameOver)
  const speed = useProgressionStore((s) => s.stats.speed)
  const luck = useProgressionStore((s) => s.stats.luck)

  useEffect(() => {
    return () => {
      if ((window as any).activeCrateId === crateId.current) {
        (window as any).activeCrateId = null
      }
    }
  }, [])

  useFrame((_, delta) => {
    if (!meshRef.current || opened || gameOver) return

    const dist = meshRef.current.position.distanceTo(camera.position)
    const activeCrateId = (window as any).activeCrateId as string | null
    const ownsInteraction = activeCrateId === crateId.current
    const inCombatWindow = Date.now() - lastCombatTime < 900
    const holdTime = 3 / Math.max(0.5, speed)

    if (dist < 3 && !opened) {
      ;(window as any).nearInteractableInfo = { type: 'crate', holding: hold.current > 0, blocked: inCombatWindow }
      ownsInfo.current = true
    } else if (ownsInfo.current) {
      ;(window as any).nearInteractableInfo = null
      ownsInfo.current = false
    }

    if (inCombatWindow) {
      if (ownsInteraction) {
        (window as any).activeCrateId = null
      }
      hold.current = 0
      return
    }

    if (dist < 3 && (window as any).holdingE && (!activeCrateId || ownsInteraction)) {
      (window as any).activeCrateId = crateId.current
      hold.current += delta
      setOrbProgress(Math.min(1, hold.current / holdTime))

      if (hold.current >= holdTime) {
        setOpened(true)
        ;(window as any).activeCrateId = null
        setWeapon(rollCrateWeapon(weapon, luck))
        setOrbProgress(0)
      }
    } else {
      if (ownsInteraction) {
        (window as any).activeCrateId = null
      }
      hold.current = Math.max(0, hold.current - delta)
      if (ownsInteraction || hold.current <= 0) {
        setOrbProgress(hold.current > 0 ? hold.current / holdTime : 0)
      }
    }
  })

  return (
    <mesh ref={meshRef} position={position} castShadow receiveShadow>
      <boxGeometry args={[1.2, 1, 1.2]} />
      <meshStandardMaterial
        color={opened ? "#786d40" : "#ffcf33"}
        emissive={opened ? "#332a14" : "#ffcc00"}
        emissiveIntensity={opened ? 0.25 : 0.95}
        metalness={0.25}
        roughness={0.6}
      />
    </mesh>
  )
}
