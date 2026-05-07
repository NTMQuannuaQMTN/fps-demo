import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import * as THREE from "three"
import { useGameStore } from "./useGameStore"
import { useProgressionStore } from "./useProgressionStore"

export function ExpOrb({ position, onRemove }: any) {
    const ref = useRef<THREE.Mesh>(null!)
    const { camera } = useThree()
    const addExp = useProgressionStore((s) => s.addExp)
    const setOrbProgress = useGameStore((s) => s.setOrbProgress)
    const lastCombatTime = useGameStore((s) => s.lastCombatTime)
    const gameOver = useGameStore((s) => s.gameOver)

    const hold = useRef(0)
    const life = useRef(20)
    const dead = useRef(false)
    const orbId = useRef(crypto.randomUUID())
    const combatTimestampRef = useRef(lastCombatTime)

    useEffect(() => {
        return () => {
            if ((window as any).activeOrbId === orbId.current) {
                (window as any).activeOrbId = null
                setOrbProgress(0)
            }
        }
    }, [setOrbProgress])

    useFrame((_, delta) => {
        if (!ref.current || dead.current || gameOver) return

        if (combatTimestampRef.current !== lastCombatTime) {
            combatTimestampRef.current = lastCombatTime
            hold.current = 0
            setOrbProgress(0)
        }

        const inCombatWindow = Date.now() - lastCombatTime < 900
        if (inCombatWindow) {
            hold.current = 0
            setOrbProgress(0)
            return
        }

        life.current -= delta
        if (life.current <= 0) {
            dead.current = true
            setOrbProgress(0)
            onRemove?.()
            return
        }

        const dist = ref.current.position.distanceTo(camera.position)
        const activeOrbId = (window as any).activeOrbId as string | null
        const ownsInteraction = activeOrbId === orbId.current

        if (dist < 3 && (window as any).holdingE && (!activeOrbId || ownsInteraction)) {
            (window as any).activeOrbId = orbId.current
            hold.current += delta
            setOrbProgress(hold.current / 3)

            if (hold.current >= 3) {
                addExp(5)
                dead.current = true
                ;(window as any).activeOrbId = null
                setOrbProgress(0)
                onRemove?.()
            }
        } else {
            if (ownsInteraction) {
                ;(window as any).activeOrbId = null
            }
            hold.current = Math.max(0, hold.current - delta)
            if (ownsInteraction || hold.current <= 0) {
                setOrbProgress(hold.current > 0 ? hold.current / 3 : 0)
            }
        }
    })

    return (
        <mesh ref={ref} position={position}>
            <sphereGeometry args={[0.3]} />
            <meshStandardMaterial color="cyan" emissive="cyan" />
        </mesh>
    )
}