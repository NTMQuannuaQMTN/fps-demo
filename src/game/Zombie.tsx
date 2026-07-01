import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import * as THREE from "three"
import { useGameStore } from "./useGameStore"
import { useEntityStore } from "./useEntityStore"
import { useProgressionStore } from "./useProgressionStore"
import { playZombieGrowl, playZombieFootstep } from "./audio"

// Module-level temp vector to avoid per-frame allocation
const _camFwd = new THREE.Vector3()

const GROUND_Y = 0.9
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

export function Zombie({ position, onDeath, wave = 1 }: any) {
    const ref = useRef<THREE.Group>(null!)

    // Scale difficulty per wave
    const zombieSpeed  = ZOMBIE_SPEED * (1 + (wave - 1) * 0.1)  // +10% each wave
    const zombieMaxHp  = 100 + (wave - 1) * 20                   // +20 HP each wave
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
    const hp = useRef(zombieMaxHp)
    const dead = useRef(false)
    const nextPos = useRef(new THREE.Vector3())
    const moveDirection = useRef(new THREE.Vector3())
    const losRaycaster = useRef(new THREE.Raycaster())
    const lastKnownPlayerPos = useRef(new THREE.Vector3())
    const hasLastKnown = useRef(false)
    const hasAlerted = useRef(false)
    const footstepTimer = useRef(Math.random() * 0.5)  // stagger initial footsteps

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

        const colliders = (window as any).colliders as THREE.Object3D[] | undefined
        const zombieRadius = ref.current.userData.colliderRadius ?? 0.5

        // ── Direction / distance to real player ──────────────────
        const dx = playerPos.x - pos.x
        const dz = playerPos.z - pos.z
        const distToPlayer = Math.sqrt(dx * dx + dz * dz)

        // ── Line-of-sight check (static colliders only) ───────────
        let canSeePlayer = false
        if (distToPlayer > 0.5) {
            moveDirection.current.set(dx / distToPlayer, 0, dz / distToPlayer)
            const staticColliders = (colliders ?? []).filter(
                (c) => c && !c.userData?.dynamicCollider && c !== ref.current
            )
            losRaycaster.current.set(pos, moveDirection.current)
            losRaycaster.current.far = distToPlayer - 0.3
            canSeePlayer = losRaycaster.current.intersectObjects(staticColliders, true).length === 0
        }

        if (canSeePlayer) {
            lastKnownPlayerPos.current.set(playerPos.x, GROUND_Y, playerPos.z)
            hasLastKnown.current = true

            // Play growl once when zombie first spots the player within 14 units
            if (!hasAlerted.current && distToPlayer < 14) {
                playZombieGrowl()
                hasAlerted.current = true
            }
        }

        // ── Movement target (last-known pos when LOS blocked) ─────
        const targetX = hasLastKnown.current ? lastKnownPlayerPos.current.x : pos.x
        const targetZ = hasLastKnown.current ? lastKnownPlayerPos.current.z : pos.z
        const moveDx = targetX - pos.x
        const moveDz = targetZ - pos.z
        const moveDist = Math.sqrt(moveDx * moveDx + moveDz * moveDz)

        // ── Rotate group to face movement target (eyes track it) ──
        if (moveDist > 0.05) {
            ref.current.rotation.y = Math.atan2(moveDx, moveDz)
        }

        // ── Collision helper ─────────────────────────────────────
        const canMoveTo = (candidate: THREE.Vector3) => {
            if (!colliders) return true
            for (const collider of colliders) {
                if (!collider || collider === ref.current) continue
                if (collider.userData?.dynamicCollider) {
                    const r = collider.userData.colliderRadius ?? 0.5
                    if (collider.position.distanceTo(candidate) < zombieRadius + r) return false
                    continue
                }
                const box = getColliderBox(collider)
                if (box.distanceToPoint(candidate) < zombieRadius) return false
            }
            return true
        }

        // ── Move toward target ────────────────────────────────────
        if (moveDist > 2) {
            const moveStep = delta * zombieSpeed
            const normX = moveDx / moveDist
            const normZ = moveDz / moveDist

            nextPos.current.set(pos.x + normX * moveStep, GROUND_Y, pos.z)
            if (canMoveTo(nextPos.current)) pos.x = nextPos.current.x

            nextPos.current.set(pos.x, GROUND_Y, pos.z + normZ * moveStep)
            if (canMoveTo(nextPos.current)) pos.z = nextPos.current.z

            pos.y = GROUND_Y

            // ── Directional footstep sound ────────────────────────
            if (distToPlayer < 22) {
                footstepTimer.current -= delta
                if (footstepTimer.current <= 0) {
                    footstepTimer.current = 0.45 + Math.random() * 0.25

                    // Compute stereo pan: positive = zombie is to the right of camera
                    camera.getWorldDirection(_camFwd)
                    _camFwd.y = 0
                    _camFwd.normalize()
                    const rightX = -_camFwd.z
                    const rightZ = _camFwd.x
                    // direction from player to zombie
                    const toPx = -dx / distToPlayer
                    const toPz = -dz / distToPlayer
                    const pan = rightX * toPx + rightZ * toPz

                    // Volume falls off quadratically with distance
                    const vol = Math.max(0, (1 - distToPlayer / 22) ** 2)
                    playZombieFootstep(pan, vol)
                }
            }
        }

        // ── Melee (only when actually adjacent to player) ─────────
        if (distToPlayer < 2) {
            const damagePerSecond = Math.max(0.8, 5 - defense * 0.2)
            setHp((h) => h - damagePerSecond * delta)
            recordCombatAction()
        }
    })

    // Group center at GROUND_Y=0.9. Body sphere r=0.55 → center local y=-0.35 (bottom touches ground).
    // Head sphere r=0.3 sits on top of body: local y = -0.35 + 0.55 + 0.3 = 0.5
    return (
        <group ref={ref} position={position}>
            {/* Round red body */}
            <mesh position={[0, -0.35, 0]} castShadow>
                <sphereGeometry args={[0.55, 14, 12]} />
                <meshStandardMaterial color="#ff2020" emissive="#cc0000" emissiveIntensity={0.35} roughness={0.7} />
            </mesh>
            {/* Round red head */}
            <mesh position={[0, 0.5, 0]} castShadow>
                <sphereGeometry args={[0.3, 12, 10]} />
                <meshStandardMaterial color="#ff3322" emissive="#cc0000" emissiveIntensity={0.3} roughness={0.7} />
            </mesh>
            {/* Left eye */}
            <mesh position={[-0.11, 0.6, 0.26]}>
                <sphereGeometry args={[0.06, 7, 6]} />
                <meshStandardMaterial color="#ffee44" emissive="#ffee44" emissiveIntensity={3.0} />
            </mesh>
            {/* Right eye */}
            <mesh position={[0.11, 0.6, 0.26]}>
                <sphereGeometry args={[0.06, 7, 6]} />
                <meshStandardMaterial color="#ffee44" emissive="#ffee44" emissiveIntensity={3.0} />
            </mesh>
        </group>
    )
}