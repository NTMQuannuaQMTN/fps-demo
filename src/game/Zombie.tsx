import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import * as THREE from "three"
import { useGameStore } from "./useGameStore"
import { useEntityStore } from "./useEntityStore"
import { useProgressionStore } from "./useProgressionStore"

export function Zombie({ position, onDeath }: any) {
    const ref = useRef<THREE.Mesh>(null!)
    const { camera } = useThree()

    const setHp = useGameStore((s) => s.setHp)
    const addKill = useGameStore((s) => s.addKill)
    const recordCombatAction = useGameStore((s) => s.recordCombatAction)
    const addEntity = useEntityStore((s) => s.add)
    const removeEntity = useEntityStore((s) => s.remove)
    const addExp = useProgressionStore((s) => s.addExp)
    const luck = useProgressionStore((s) => s.stats.luck)
    const paused = useProgressionStore((s) => s.paused)
    const gameOver = useGameStore((s) => s.gameOver)

    const id = useRef(crypto.randomUUID())
    const hp = useRef(100)
    const dead = useRef(false)

    // register entity
    useEffect(() => {
        if (!ref.current) return

        addEntity({
            id: id.current,
            mesh: ref.current,
            hit: (damage) => {
                if (dead.current) return

                hp.current -= damage

                if (hp.current <= 0) {
                    dead.current = true
                    ref.current.visible = false

                    removeEntity(id.current)
                    onDeath?.()

                    // ✅ EXP & KILL
                    addExp(2)
                    addKill()

                    // ✅ Orb drop
                    const dropChance = 0.2 * (1 + luck)

                    if (Math.random() < dropChance) {
                        ; (window as any).spawnOrb?.(
                            ref.current.position.clone()
                        )
                    }
                }
            },
        })

        return () => {
            removeEntity(id.current)
        }
    }, [])

    useFrame((_, delta) => {
        if (paused || gameOver) return

        if (!ref.current || dead.current) return

        const pos = ref.current.position
        const playerPos = camera.position

        const dir = new THREE.Vector3()
            .subVectors(playerPos, pos)
            .normalize()

        const dist = pos.distanceTo(playerPos)

        if (dist > 2) {
            pos.addScaledVector(dir, delta * 2)
        } else {
            setHp((h) => h - 5 * delta)
            recordCombatAction()
        }
    })

    return (
        <>
            <mesh ref={ref} position={position} castShadow>
                <boxGeometry args={[1, 2, 1]} />
                <meshStandardMaterial color="#ff0033" emissive="#ff0033" emissiveIntensity={0.8} />
            </mesh>
            {/* Glow effect light */}
            <pointLight position={position} intensity={1.5} color="#ff0033" distance={8} />
        </>
    )
}