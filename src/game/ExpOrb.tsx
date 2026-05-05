import { useFrame, useThree } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"
import { useProgressionStore } from "./useProgressionStore"

export function ExpOrb({ position, onRemove }: any) {
    const ref = useRef<THREE.Mesh>(null!)
    const { camera } = useThree()
    const addExp = useProgressionStore((s) => s.addExp)

    const hold = useRef(0)
    const life = useRef(20)
    const dead = useRef(false)

    useFrame((_, delta) => {
        if (!ref.current || dead.current) return

        life.current -= delta
        if (life.current <= 0) {
            dead.current = true
            onRemove?.()
            return
        }

        const dist = ref.current.position.distanceTo(camera.position)

        if (dist < 3 && (window as any).holdingE) {
            hold.current += delta

            if (hold.current >= 3) {
                addExp(5)
                dead.current = true
                onRemove?.()
            }
        } else {
            hold.current = Math.max(0, hold.current - delta)
        }
    })

    return (
        <mesh ref={ref} position={position}>
            <sphereGeometry args={[0.3]} />
            <meshStandardMaterial color="cyan" emissive="cyan" />
        </mesh>
    )
}