import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import * as THREE from "three"
import { useGameStore } from "./useGameStore"
import { useEntityStore } from "./useEntityStore"
import { useProgressionStore } from "./useProgressionStore"

const GROUND_Y = 0.9
const ZOMBIE_RADIUS = 0.4
const ZOMBIE_LENGTH = 1
const ZOMBIE_SPEED = 2

const colliderBoxCache = new WeakMap<THREE.Object3D, THREE.Box3>()

const getColliderBox = (collider: THREE.Object3D) => {
    let box = colliderBoxCache.get(collider)

    if (!box) {
        box = new THREE.Box3().setFromObject(collider)
        colliderBoxCache.set(collider, box)
    }

    return box
}

export function Zombie({ position, onDeath }: any) {
    const ref = useRef<THREE.Mesh>(null!)
    const { camera } = useThree()

    const setHp = useGameStore((s) => s.setHp)
    const addKill = useGameStore((s) => s.addKill)
    const recordCombatAction = useGameStore((s) => s.recordCombatAction)
    const addEntity = useEntityStore((s) => s.add)
    const removeEntity = useEntityStore((s) => s.remove)
    const addExp = useProgressionStore((s) => s.addExp)
    const speed = useProgressionStore((s) => s.stats.speed)
    const luck = useProgressionStore((s) => s.stats.luck)
    const defense = useProgressionStore((s) => s.stats.defense)
    const paused = useProgressionStore((s) => s.paused)
    const gameOver = useGameStore((s) => s.gameOver)

    const id = useRef(crypto.randomUUID())
    const hp = useRef(100)
    const dead = useRef(false)
    const nextPos = useRef(new THREE.Vector3())
    const moveDirection = useRef(new THREE.Vector3())

    const removeFromColliders = () => {
        const colliders = (window as any).colliders as THREE.Object3D[] | undefined

        if (!colliders || !ref.current) return

        const index = colliders.indexOf(ref.current)

        if (index !== -1) {
            colliders.splice(index, 1)
        }
    }

    // register entity
    useEffect(() => {
        if (!ref.current) return

        ref.current.userData.dynamicCollider = true
        ref.current.userData.colliderRadius = 0.5

        if (!(window as any).colliders) (window as any).colliders = []

        const colliders = (window as any).colliders as THREE.Object3D[]

        if (!colliders.includes(ref.current)) {
            colliders.push(ref.current)
        }

        addEntity({
            id: id.current,
            mesh: ref.current,
            hit: (damage) => {
                if (dead.current) return

                hp.current -= damage

                if (hp.current <= 0) {
                    dead.current = true
                    ref.current.visible = false
                    removeFromColliders()

                    removeEntity(id.current)
                    onDeath?.()

                    // ✅ EXP & KILL
                    addExp(2 * speed)
                    addKill()

                    // ✅ Orb drop
                    const dropChance = Math.min(0.85, 0.2 + luck * 1.5)

                    if (Math.random() < dropChance) {
                        ; (window as any).spawnOrb?.(
                            ref.current.position.clone()
                        )
                    }
                }
            },
        })

        return () => {
            removeFromColliders()
            removeEntity(id.current)
        }
    }, [])

    useFrame((_, delta) => {
        if (paused || gameOver) return

        if (!ref.current || dead.current) return

        const pos = ref.current.position
        const playerPos = camera.position

        pos.y = GROUND_Y

        const dir = moveDirection.current
        dir.set(playerPos.x - pos.x, 0, playerPos.z - pos.z)

        const dist = dir.length()

        if (dist > 0) {
            dir.normalize()
        }

        const colliders = (window as any).colliders as THREE.Object3D[] | undefined
        const zombieRadius = ref.current.userData.colliderRadius ?? 0.5

        const canMoveTo = (nextPos: THREE.Vector3) => {
            if (!colliders) return true

            for (const collider of colliders) {
                if (!collider || collider === ref.current) continue

                if (collider.userData?.dynamicCollider) {
                    const otherRadius = collider.userData.colliderRadius ?? 0.5

                    if (collider.position.distanceTo(nextPos) < zombieRadius + otherRadius) {
                        return false
                    }

                    continue
                }

                const box = getColliderBox(collider)

                if (box.distanceToPoint(nextPos) < zombieRadius) {
                    return false
                }
            }

            return true
        }

        if (dist > 2) {
            const moveStep = delta * ZOMBIE_SPEED

            nextPos.current.set(pos.x + dir.x * moveStep, GROUND_Y, pos.z)

            if (canMoveTo(nextPos.current)) {
                pos.x = nextPos.current.x
            }

            nextPos.current.set(pos.x, GROUND_Y, pos.z + dir.z * moveStep)

            if (canMoveTo(nextPos.current)) {
                pos.z = nextPos.current.z
            }

            pos.y = GROUND_Y
            return
        }

        const damagePerSecond = Math.max(0.8, 5 - defense * 0.2)

        setHp((h) => h - damagePerSecond * delta)
        recordCombatAction()
    })

    return (
        <mesh ref={ref} position={position} castShadow>
            <capsuleGeometry args={[ZOMBIE_RADIUS, ZOMBIE_LENGTH, 6, 10]} />
            <meshStandardMaterial color="#ff0033" emissive="#ff0033" emissiveIntensity={0.8} />
        </mesh>
    )
}