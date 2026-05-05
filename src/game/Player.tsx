import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { useGameStore } from "./useGameStore"
import { useEntityStore } from "./useEntityStore"
import { useProgressionStore } from "./useProgressionStore"

export function Player() {
    const { camera } = useThree()

    const velocity = useRef(new THREE.Vector3())
    const onGround = useRef(true)

    const [keys, setKeys] = useState<Record<string, boolean>>({})

    const shoot = useGameStore((s) => s.shoot)
    const reload = useGameStore((s) => s.reload)
    const weapon = useGameStore((s) => s.weapon)
    const getMeshes = useEntityStore((s) => s.getMeshes)
    const getEntityByMesh = useEntityStore((s) => s.getEntityByMesh)
    const paused = useProgressionStore((s) => s.paused)
    const recoilRef = useRef(new THREE.Vector2(0, 0))
    const raycasterRef = useRef(new THREE.Raycaster())

    // INPUT
    useEffect(() => {
        const down = (e: KeyboardEvent) =>
            setKeys((k) => ({ ...k, [e.code]: true }))
        const up = (e: KeyboardEvent) =>
            setKeys((k) => ({ ...k, [e.code]: false }))

        window.addEventListener("keydown", down)
        window.addEventListener("keyup", up)

        return () => {
            window.removeEventListener("keydown", down)
            window.removeEventListener("keyup", up)
        }
    }, [])

    // SHOOT
    useEffect(() => {
        let lastShot = 0

        const handleMouseDown = () => {
            const now = performance.now()
            const delay = 60000 / weapon.rpm

            if (now - lastShot < delay) return
            if (!shoot()) return

            lastShot = now

            const raycaster = raycasterRef.current

            // spread + recoil
            const spreadX = (Math.random() - 0.5) * weapon.spread
            const spreadY = (Math.random() - 0.5) * weapon.spread

            const aimX = spreadX + recoilRef.current.x
            const aimY = spreadY + recoilRef.current.y

            raycaster.setFromCamera(
                new THREE.Vector2(aimX, aimY),
                camera
            )

            // ✅ USE ENTITY STORE
            const meshes = getMeshes()
            const hits = raycaster.intersectObjects(meshes, false)

            if (hits.length > 0) {
                let obj: THREE.Object3D | null = hits[0].object

                let entity = getEntityByMesh(obj)

                while (!entity && obj?.parent) {
                    obj = obj.parent
                    entity = getEntityByMesh(obj)
                }

                entity?.hit(weapon.damage)

                // hit feedback
                document.body.style.background = "#300"
                setTimeout(() => (document.body.style.background = ""), 50)
            }

            // recoil (aim-based)
            recoilRef.current.y += weapon.recoil.vertical
            recoilRef.current.x +=
                (Math.random() - 0.5) * weapon.recoil.horizontal
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === "KeyR") reload()
        }

        window.addEventListener("mousedown", handleMouseDown)
        window.addEventListener("keydown", handleKeyDown)

        return () => {
            window.removeEventListener("mousedown", handleMouseDown)
            window.removeEventListener("keydown", handleKeyDown)
        }
    }, [weapon, shoot, reload, getMeshes, getEntityByMesh])

    // PHYSICS
    useFrame((_, delta) => {
        if (paused) return

        const speed = keys["ShiftLeft"] ? 8 : 5

        const dir = new THREE.Vector3()
        if (keys["KeyW"]) dir.z += 1
        if (keys["KeyS"]) dir.z -= 1
        if (keys["KeyA"]) dir.x -= 1
        if (keys["KeyD"]) dir.x += 1
        dir.normalize()

        const forward = new THREE.Vector3()
        camera.getWorldDirection(forward)
        forward.y = 0
        forward.normalize()

        const right = new THREE.Vector3()
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0))

        velocity.current.x =
            (right.x * dir.x + forward.x * dir.z) * speed
        velocity.current.z =
            (right.z * dir.x + forward.z * dir.z) * speed

        // decay recoil over time towards zero
        recoilRef.current.lerp(new THREE.Vector2(0, 0), 1 - Math.exp(-weapon.recoil.recovery * delta))

        // gravity
        velocity.current.y -= 9.8 * delta

        // jump
        if (keys["Space"] && onGround.current) {
            velocity.current.y = 5
            onGround.current = false
        }

        // axis-aligned collision check against registered colliders
        const colliders: THREE.Object3D[] = (window as any).colliders || []
        const playerRadius = 0.6

        // check X movement separately
        const moveX = new THREE.Vector3(velocity.current.x * delta, 0, 0)
        const proposedX = camera.position.clone().add(moveX)
        let blockedX = false
        for (const c of colliders) {
            if (!c) continue
            const box = new THREE.Box3().setFromObject(c)
            if (box.distanceToPoint(proposedX) < playerRadius) {
                blockedX = true
                break
            }
        }

        if (!blockedX) camera.position.x += moveX.x

        // check Z movement separately
        const moveZ = new THREE.Vector3(0, 0, velocity.current.z * delta)
        const proposedZ = camera.position.clone().add(moveZ)
        let blockedZ = false
        for (const c of colliders) {
            if (!c) continue
            const box = new THREE.Box3().setFromObject(c)
            if (box.distanceToPoint(proposedZ) < playerRadius) {
                blockedZ = true
                break
            }
        }

        if (!blockedZ) camera.position.z += moveZ.z

        // apply vertical movement and ground collision
        camera.position.y += velocity.current.y * delta

        if (camera.position.y < 1.6) {
            camera.position.y = 1.6
            velocity.current.y = 0
            onGround.current = true
        }
    })

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.code === "KeyE") (window as any).holdingE = true
        }
        const up = (e: KeyboardEvent) => {
            if (e.code === "KeyE") (window as any).holdingE = false
        }

        window.addEventListener("keydown", down)
        window.addEventListener("keyup", up)

        return () => {
            window.removeEventListener("keydown", down)
            window.removeEventListener("keyup", up)
        }
    }, [])

    return null
}