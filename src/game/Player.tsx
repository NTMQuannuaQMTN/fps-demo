import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

import { useGameStore } from "./useGameStore"
import { useEntityStore } from "./useEntityStore"
import { useProgressionStore } from "./useProgressionStore"

export function Player() {
    const { camera } = useThree()

    // =========================
    // MOVEMENT
    // =========================

    const velocity = useRef(new THREE.Vector3())
    const onGround = useRef(true)

    // =========================
    // FPS CAMERA ROTATION
    // =========================

    const yaw = useRef(0)
    const pitch = useRef(0)

    // =========================
    // SHOOTING
    // =========================

    const isMouseDown = useRef(false)
    const lastShotAt = useRef(0)

    const fireRef = useRef<() => void>(() => {})

    // =========================
    // RECOIL
    // =========================

    const recoilRef = useRef(new THREE.Vector2(0, 0))

    // =========================
    // EFFECTS
    // =========================

    const cameraShake = useRef(
        new THREE.Vector3()
    )

    const raycasterRef = useRef(
        new THREE.Raycaster()
    )

    // =========================
    // INPUT
    // =========================

    const [keys, setKeys] = useState<
        Record<string, boolean>
    >({})

    // =========================
    // STORES
    // =========================

    const shoot = useGameStore(
        (s) => s.shoot
    )

    const reload = useGameStore(
        (s) => s.reload
    )

    const setReloadSpeedMultiplier = useGameStore(
        (s) => s.setReloadSpeedMultiplier
    )

    const weapon = useGameStore(
        (s) => s.weapon
    )

    const setHp = useGameStore(
        (s) => s.setHp
    )

    const lastCombatTime = useGameStore(
        (s) => s.lastCombatTime
    )

    const flashHitMarker = useGameStore(
        (s) => s.flashHitMarker
    )

    const gameOver = useGameStore(
        (s) => s.gameOver
    )

    const getMeshes = useEntityStore(
        (s) => s.getMeshes
    )

    const getEntityByMesh = useEntityStore(
        (s) => s.getEntityByMesh
    )

    const paused = useProgressionStore(
        (s) => s.paused
    )

    const hpStat = useProgressionStore(
        (s) => s.stats.hp
    )

    const speedStat = useProgressionStore(
        (s) => s.stats.speed
    )

    const attackStat = useProgressionStore(
        (s) => s.stats.attack
    )

    // =========================
    // KEYBOARD INPUT
    // =========================

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            setKeys((k) => ({
                ...k,
                [e.code]: true,
            }))
        }

        const up = (e: KeyboardEvent) => {
            setKeys((k) => ({
                ...k,
                [e.code]: false,
            }))
        }

        window.addEventListener(
            "keydown",
            down
        )

        window.addEventListener(
            "keyup",
            up
        )

        return () => {
            window.removeEventListener(
                "keydown",
                down
            )

            window.removeEventListener(
                "keyup",
                up
            )
        }
    }, [])

    // =========================
    // MOUSE LOOK
    // =========================

    useEffect(() => {
        const onMouseMove = (
            e: MouseEvent
        ) => {
            const sensitivity = 0.002

            yaw.current -=
                e.movementX *
                sensitivity

            pitch.current -=
                e.movementY *
                sensitivity

            pitch.current =
                THREE.MathUtils.clamp(
                    pitch.current,
                    -Math.PI / 2,
                    Math.PI / 2
                )
        }

        window.addEventListener(
            "mousemove",
            onMouseMove
        )

        return () => {
            window.removeEventListener(
                "mousemove",
                onMouseMove
            )
        }
    }, [])

    // =========================
    // INITIALIZE HP
    // =========================

    useEffect(() => {
        const numberOfUpgrades =
            Math.max(
                0,
                (hpStat - 100) / 10
            )

        const maxHp =
            100 *
            Math.pow(
                1.05,
                numberOfUpgrades
            )

        setHp(() => maxHp)
    }, [hpStat, setHp])

    useEffect(() => {
        setReloadSpeedMultiplier(speedStat)
    }, [speedStat, setReloadSpeedMultiplier])

    // =========================
    // SHOOTING
    // =========================

    useEffect(() => {
        fireRef.current = () => {
            if (gameOver) return

            const now =
                performance.now()

            const delay =
                60000 / weapon.rpm

            if (
                now -
                    lastShotAt.current <
                delay
            )
                return

            if (!shoot()) return

            lastShotAt.current = now

            const raycaster =
                raycasterRef.current

            // =========================
            // SPREAD
            // =========================

            const spreadX =
                (Math.random() - 0.5) *
                weapon.spread

            const spreadY =
                (Math.random() - 0.5) *
                weapon.spread

            const aimX =
                spreadX +
                recoilRef.current.x

            const aimY =
                spreadY

            raycaster.setFromCamera(
                new THREE.Vector2(
                    aimX,
                    aimY
                ),
                camera
            )

            // =========================
            // HIT DETECTION
            // =========================

            const meshes =
                getMeshes()

            const hits =
                raycaster.intersectObjects(
                    meshes,
                    false
                )

            if (hits.length > 0) {
                let obj:
                    | THREE.Object3D
                    | null =
                    hits[0].object

                let entity =
                    getEntityByMesh(
                        obj
                    )

                while (
                    !entity &&
                    obj?.parent
                ) {
                    obj = obj.parent

                    entity =
                        getEntityByMesh(
                            obj
                        )
                }

                entity?.hit(
                    weapon.damage + attackStat
                )

                flashHitMarker()

                document.body.style.background =
                    "#300"

                setTimeout(() => {
                    document.body.style.background =
                        ""
                }, 50)
            }

            // =========================
            // RECOIL
            // =========================

            recoilRef.current.y -=
                weapon.recoil.vertical *
                10

            recoilRef.current.x +=
                (Math.random() - 0.5) *
                weapon.recoil.horizontal

            // =========================
            // CAMERA RECOIL
            // =========================

            pitch.current +=
                weapon.recoil.vertical *
                0.3

            yaw.current +=
                (Math.random() - 0.5) *
                weapon.recoil.horizontal *
                0.1

            // =========================
            // CAMERA SHAKE
            // =========================

            cameraShake.current.set(
                (Math.random() - 0.5) *
                    0.5,
                (Math.random() - 0.5) *
                    0.5,
                (Math.random() - 0.5) *
                    0.5
            )
        }

        const handleMouseDown =
            () => {
                isMouseDown.current =
                    true

                fireRef.current()
            }

        const handleMouseUp =
            () => {
                isMouseDown.current =
                    false
            }

        const handleKeyDown = (
            e: KeyboardEvent
        ) => {
            if (e.code === "KeyR") {
                reload()
            }
        }

        window.addEventListener(
            "mousedown",
            handleMouseDown
        )

        window.addEventListener(
            "mouseup",
            handleMouseUp
        )

        window.addEventListener(
            "keydown",
            handleKeyDown
        )

        return () => {
            window.removeEventListener(
                "mousedown",
                handleMouseDown
            )

            window.removeEventListener(
                "mouseup",
                handleMouseUp
            )

            window.removeEventListener(
                "keydown",
                handleKeyDown
            )
        }
    }, [
        weapon,
        shoot,
        reload,
        getMeshes,
        getEntityByMesh,
        flashHitMarker,
        gameOver,
        camera,
    ])

    // =========================
    // GAME LOOP
    // =========================

    useFrame((_, delta) => {
        if (paused || gameOver)
            return

        // =========================
        // APPLY CAMERA ROTATION
        // =========================

        camera.rotation.order =
            "YXZ"

        camera.rotation.y =
            yaw.current

        camera.rotation.x =
            pitch.current

        // =========================
        // AUTO FIRE
        // =========================

        if (isMouseDown.current) {
            const delay =
                60000 / weapon.rpm

            if (
                performance.now() -
                    lastShotAt.current >=
                delay
            ) {
                fireRef.current()
            }
        }

        // =========================
        // MOVEMENT
        // =========================

        const movementSpeed =
            (keys["ShiftLeft"]
                ? 8
                : 5) * speedStat

        const dir =
            new THREE.Vector3()

        if (keys["KeyW"])
            dir.z += 1

        if (keys["KeyS"])
            dir.z -= 1

        if (keys["KeyA"])
            dir.x -= 1

        if (keys["KeyD"])
            dir.x += 1

        dir.normalize()

        const forward =
            new THREE.Vector3()

        camera.getWorldDirection(
            forward
        )

        forward.y = 0
        forward.normalize()

        const right =
            new THREE.Vector3()

        right.crossVectors(
            forward,
            new THREE.Vector3(
                0,
                1,
                0
            )
        )

        velocity.current.x =
            (right.x * dir.x +
                forward.x *
                    dir.z) *
            movementSpeed

        velocity.current.z =
            (right.z * dir.x +
                forward.z *
                    dir.z) *
            movementSpeed

        // =========================
        // RECOIL RECOVERY
        // =========================

        recoilRef.current.lerp(
            new THREE.Vector2(0, 0),
            1 -
                Math.exp(
                    -weapon.recoil
                        .recovery *
                        delta
                )
        )

        // =========================
        // CAMERA SHAKE DECAY
        // =========================

        cameraShake.current.lerp(
            new THREE.Vector3(),
            1 -
                Math.exp(
                    -10 * delta
                )
        )

        camera.position.add(
            cameraShake.current
                .clone()
                .multiplyScalar(
                    0.01
                )
        )

        // =========================
        // HEALING
        // =========================

        const timeSinceCombat =
            Date.now() -
            lastCombatTime

        if (
            timeSinceCombat >
            5000
        ) {
            const numberOfUpgrades =
                Math.max(
                    0,
                    (hpStat - 100) /
                        10
                )

            const maxHp =
                100 *
                Math.pow(
                    1.05,
                    numberOfUpgrades
                )

            const healRate = 3

            setHp(
                (
                    currentHp
                ) =>
                    Math.min(
                        maxHp,
                        currentHp +
                            healRate *
                                delta
                    )
            )
        }

        // =========================
        // GRAVITY
        // =========================

        velocity.current.y -=
            9.8 * delta

        // =========================
        // JUMP
        // =========================

        if (
            keys["Space"] &&
            onGround.current
        ) {
            velocity.current.y = 5

            onGround.current =
                false
        }

        // =========================
        // COLLISION
        // =========================

        const colliders:
            THREE.Object3D[] =
            (window as any)
                .colliders || []

        const playerHeight = 1.6
        const playerRadius = 0.6
        const epsilon = 0.001

        const getPlayerBox = (
            position: THREE.Vector3
        ) =>
            new THREE.Box3(
                new THREE.Vector3(
                    position.x -
                        playerRadius,
                    position.y -
                        playerHeight,
                    position.z -
                        playerRadius
                ),
                new THREE.Vector3(
                    position.x +
                        playerRadius,
                    position.y,
                    position.z +
                        playerRadius
                )
            )

        const resolveCollisions = (
            start: THREE.Vector3
        ) => {
            const resolved =
                start.clone()
            let grounded = false

            for (
                let i = 0;
                i < 4;
                i += 1
            ) {
                const playerBox =
                    getPlayerBox(
                        resolved
                    )

                let collided = false

                for (const c of colliders) {
                    if (!c) continue

                    const box =
                        new THREE.Box3().setFromObject(
                            c
                        )

                    if (
                        !playerBox.intersectsBox(
                            box
                        )
                    ) {
                        continue
                    }

                    const overlapX =
                        Math.min(
                            playerBox.max.x,
                            box.max.x
                        ) -
                        Math.max(
                            playerBox.min.x,
                            box.min.x
                        )

                    const overlapY =
                        Math.min(
                            playerBox.max.y,
                            box.max.y
                        ) -
                        Math.max(
                            playerBox.min.y,
                            box.min.y
                        )

                    const overlapZ =
                        Math.min(
                            playerBox.max.z,
                            box.max.z
                        ) -
                        Math.max(
                            playerBox.min.z,
                            box.min.z
                        )

                    if (
                        overlapX <= 0 ||
                        overlapY <= 0 ||
                        overlapZ <= 0
                    ) {
                        continue
                    }

                    const playerCenter =
                        playerBox.getCenter(
                            new THREE.Vector3()
                        )
                    const boxCenter =
                        box.getCenter(
                            new THREE.Vector3()
                        )

                    const minOverlap =
                        Math.min(
                            overlapX,
                            overlapY,
                            overlapZ
                        )

                    if (
                        minOverlap ===
                        overlapY
                    ) {
                        if (
                            playerCenter.y >=
                            boxCenter.y
                        ) {
                            resolved.y +=
                                overlapY +
                                epsilon
                            grounded = true
                        } else {
                            resolved.y -=
                                overlapY +
                                epsilon
                        }
                    } else if (
                        minOverlap ===
                        overlapX
                    ) {
                        resolved.x +=
                            playerCenter.x >=
                            boxCenter.x
                                ? overlapX +
                                  epsilon
                                : -(
                                      overlapX +
                                      epsilon
                                  )
                    } else {
                        resolved.z +=
                            playerCenter.z >=
                            boxCenter.z
                                ? overlapZ +
                                  epsilon
                                : -(
                                      overlapZ +
                                      epsilon
                                  )
                    }

                    collided = true
                    break
                }

                if (!collided) {
                    break
                }
            }

            return {
                position: resolved,
                grounded,
            }
        }

        const nextPosition =
            camera.position.clone()

        nextPosition.x +=
            velocity.current.x * delta
        nextPosition.y +=
            velocity.current.y * delta
        nextPosition.z +=
            velocity.current.z * delta

        const resolved =
            resolveCollisions(
                nextPosition
            )

        camera.position.copy(
            resolved.position
        )

        if (
            camera.position.y <
            playerHeight
        ) {
            camera.position.y =
                playerHeight
        }

        if (
            resolved.grounded ||
            camera.position.y <=
                playerHeight + epsilon
        ) {
            velocity.current.y = 0
            onGround.current = true
        } else {
            onGround.current = false
        }
    })

    // =========================
    // INTERACT KEY
    // =========================

    useEffect(() => {
        const down = (
            e: KeyboardEvent
        ) => {
            if (
                e.code === "KeyE"
            ) {
                ;(
                    window as any
                ).holdingE = true
            }
        }

        const up = (
            e: KeyboardEvent
        ) => {
            if (
                e.code === "KeyE"
            ) {
                ;(
                    window as any
                ).holdingE = false
            }
        }

        window.addEventListener(
            "keydown",
            down
        )

        window.addEventListener(
            "keyup",
            up
        )

        return () => {
            window.removeEventListener(
                "keydown",
                down
            )

            window.removeEventListener(
                "keyup",
                up
            )
        }
    }, [])

    return null
}